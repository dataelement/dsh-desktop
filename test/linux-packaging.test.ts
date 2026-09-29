import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The Linux packages only work when three separate pieces stay aligned: the
 * electron-builder targets, the Debian dependencies that still exist after the
 * Ubuntu 24.04 `t64` rename, and the sandbox fixes in `build/`. These are
 * source contracts — the real install is exercised by `npm run package:linux`.
 */
const projectRoot = path.resolve(import.meta.dirname, '..')

interface DesktopPackageJson {
  desktopName?: string
  build: {
    extraResources?: Array<{ from: string; to: string }>
    linux?: {
      executableName?: string
      syncDesktopName?: boolean
      target?: string[]
    }
    deb?: {
      maintainer?: string
      depends?: string[]
      recommends?: string[]
      afterInstall?: string
      afterRemove?: string
    }
    appImage?: { executableArgs?: string[] }
  }
}

async function readPackageJson(): Promise<DesktopPackageJson> {
  return JSON.parse(
    await readFile(path.join(projectRoot, 'package.json'), 'utf8')
  ) as DesktopPackageJson
}

describe('Linux packaging', () => {
  it('builds both Linux targets from the named executable', async () => {
    const { build, desktopName } = await readPackageJson()
    expect(build.linux?.target).toEqual(['deb', 'AppImage'])
    expect(build.linux?.executableName).toBe('dsh-desktop')
    // Electron reads the top-level metadata field; electron-builder derives the
    // installed .desktop filename from it so window association keeps working.
    expect(desktopName).toBe('dsh-desktop.desktop')
    expect(build.linux?.syncDesktopName).toBe(true)
  })

  it('declares dependencies that resolve before and after the t64 rename', async () => {
    const { build } = await readPackageJson()
    const depends = build.deb?.depends ?? []

    // libgtk-3-0 and libatspi2.0-0 have no candidate on Ubuntu 24.04+; the old
    // names are still the only option on 22.04. Both must be offered.
    expect(depends).toContain('libgtk-3-0t64 | libgtk-3-0')
    expect(depends).toContain('libatspi2.0-0t64 | libatspi2.0-0')
    // The electron-builder default recommends package no longer exists either.
    expect(build.deb?.recommends).toEqual([])
  })

  it('ships the sandbox fixes as existing executable hooks', async () => {
    const { build } = await readPackageJson()
    expect(build.deb?.maintainer).toBeTruthy()
    // The AppImage cannot carry a root-owned SUID helper or install a profile.
    expect(build.appImage?.executableArgs).toEqual(['--no-sandbox'])

    for (const key of ['afterInstall', 'afterRemove'] as const) {
      const relative = build.deb?.[key]
      expect(relative, key).toBeTruthy()
      const info = await stat(path.join(projectRoot, relative!))
      expect(info.isFile(), relative).toBe(true)
      // dpkg executes the maintainer script directly.
      expect(info.mode & 0o111, `${relative} must be executable`).not.toBe(0)
    }

    expect(build.extraResources).toContainEqual({
      from: 'build/dsh-desktop.apparmor',
      to: 'dsh-desktop.apparmor'
    })
  })

  it('installs an AppArmor profile that only lifts the user-namespace restriction', async () => {
    const postinst = await readFile(
      path.join(projectRoot, 'build', 'linux-after-install.sh'),
      'utf8'
    )
    const profile = await readFile(
      path.join(projectRoot, 'build', 'dsh-desktop.apparmor'),
      'utf8'
    )

    // Ubuntu 23.10+ denies user namespaces to unconfined programs; the profile
    // must grant exactly that and stay unconfined otherwise.
    expect(profile).toMatch(/abi <abi\/4\.0>,/)
    expect(profile).toMatch(/flags=\(unconfined\)/)
    expect(profile).toMatch(/^\s+userns,$/m)
    expect(profile).toContain('@EXECUTABLE@')
    expect(postinst).toContain("s|@EXECUTABLE@|$executable|g")
    // The packaged helper arrives mode 0755 owned by the build user; Chromium
    // aborts on such a helper, so the postinst has to restore it.
    expect(postinst).toContain('chown root:root "$app_dir/chrome-sandbox"')
    expect(postinst).toContain('chmod 4755 "$app_dir/chrome-sandbox"')
    expect(postinst).toContain('apparmor_parser')
  })
})

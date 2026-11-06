import { execFile } from 'node:child_process'
import { lstat, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../../src/main/state/safe-mode-profile'
import { DesktopHostProcess } from '../../src/main/shell/backend/host-process'
import { writeDesktopProductPatch } from '../../src/main/shell/product-patch'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const root = resolve(import.meta.dirname, '../..')
const hostBundle = join(root, 'out-shell', 'main', 'host.js')
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('boots runProfile on a temporary home and redirects the authenticated document', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-profile-'))
  temporary.push(home)
  const profile = join(home, 'profiles', 'desktop')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]\n')
  await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: 'desktop',
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home) },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    const url = new URL(ready.url)
    expect(url.protocol).toBe('http:')
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.port).not.toBe('')
    const response = await fetch(ready.url, { redirect: 'manual' })
    expect(response.status).toBe(303)
    expect(response.headers.has('set-cookie')).toBe(true)
    const injections = JSON.stringify(ready.injections)
    expect(injections).toContain('dsh-desktop-office')
    expect(injections).toContain('dsh-ppt-composer')
  } finally {
    await host.stop()
  }
}, 120_000)

it('boots safe mode without creating the shared profile modules directory', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-safe-'))
  temporary.push(home)
  const profile = await ensureSafeModeProfile(home, 'desktop')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: SAFE_MODE_PROFILE,
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home, 'safe') },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    expect(new URL(ready.url).hostname).toBe('127.0.0.1')
    const manifest: unknown = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest).toMatchObject({ dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } })
    await expect(lstat(join(home, 'profiles', 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
    const injections = JSON.stringify(ready.injections)
    expect(injections).not.toContain('dsh-desktop-office')
    expect(injections).not.toContain('dsh-ppt-composer')
  } finally {
    await host.stop()
  }
}, 120_000)

async function ensureHostBundle(): Promise<void> {
  const sourceTime = (await stat(join(root, 'src/host/index.ts'))).mtimeMs
  let builtTime = 0
  try {
    builtTime = (await stat(hostBundle)).mtimeMs
  } catch {
    builtTime = 0
  }
  if (builtTime >= sourceTime) return
  await new Promise<void>((resolveBuild, reject) => {
    execFile('npm', ['run', 'build:shell'], { cwd: root, timeout: 120_000 }, error => {
      if (error === null) resolveBuild()
      else reject(error)
    })
  })
}

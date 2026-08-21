import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  INSTALL_PATH,
  MARKET_PACKAGE,
  RECOMMENDED_MARKET_VERSION,
  STATUS_PATH,
  UNINSTALL_PATH,
  buildInstallArguments,
  buildUninstallArguments,
  cleanStaleTemporaryDirectories,
  ensurePnpmShim,
  isTrustedRequest,
  readMarketInstallation,
  resolvePnpmEntry
} from '../packages/dsh-desktop-market-installer/index.js'

describe('desktop plugin market installer', () => {
  it('pins the only install target accepted by the host', () => {
    expect(buildInstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'add',
      '--save-exact',
      'dshmarket@1.9.0'
    ])
    expect(MARKET_PACKAGE).toBe('dshmarket')
    expect(RECOMMENDED_MARKET_VERSION).toBe('1.9.0')
    expect(STATUS_PATH).toBe('/dsh-desktop/market-installer/status')
    expect(INSTALL_PATH).toBe('/dsh-desktop/market-installer/install')
    expect(UNINSTALL_PATH).toBe('/dsh-desktop/market-installer/uninstall')
    expect(buildUninstallArguments('/app/dsh/bin.js')).toEqual([
      '/app/dsh/bin.js',
      'plugin',
      '--profile',
      'web',
      'remove',
      'dshmarket'
    ])
  })

  it('ships a resolvable pnpm binary instead of relying on the user PATH', () => {
    expect(resolvePnpmEntry()).toMatch(/node_modules[/\\]pnpm[/\\]bin[/\\]pnpm\.(c|m)js$/u)
  })

  it('generates packaged node and pnpm shims in desktop-bin', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-shim-'))
    const binDir = await ensurePnpmShim(home)
    expect(binDir).toBe(join(home, '.desktop-bin'))

    if (process.platform === 'win32') {
      const pnpmCmd = await readFile(join(binDir, 'pnpm.cmd'), 'utf8')
      const nodeCmd = await readFile(join(binDir, 'node.cmd'), 'utf8')
      expect(pnpmCmd).toContain(process.execPath)
      expect(pnpmCmd).toContain('pnpm')
      expect(nodeCmd).toContain(process.execPath)
    } else {
      const pnpmScript = await readFile(join(binDir, 'pnpm'), 'utf8')
      const nodeScript = await readFile(join(binDir, 'node'), 'utf8')
      expect(pnpmScript).toContain(process.execPath)
      expect(pnpmScript).toContain('pnpm')
      expect(nodeScript).toContain(process.execPath)
    }

    const npmrc = await readFile(join(home, 'profiles', 'web', '.npmrc'), 'utf8')
    expect(npmrc).toContain('package-import-method=clone-or-copy')
    expect(npmrc).toContain('child-concurrency=1')
  })

  it('cleans up stale _tmp_ directories left by interrupted installations', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-clean-'))
    const nodeModules = join(home, 'profiles', 'web', 'node_modules')
    const staleTmpDir = join(nodeModules, 'argparse_tmp_12345_1')
    const validDir = join(nodeModules, 'argparse')
    await mkdir(staleTmpDir, { recursive: true })
    await mkdir(validDir, { recursive: true })

    await cleanStaleTemporaryDirectories(home)

    const { existsSync } = await import('node:fs')
    expect(existsSync(staleTmpDir)).toBe(false)
    expect(existsSync(validDir)).toBe(true)
  })

  it('reports both the requested dependency and installed package version', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-market-status-'))
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(
      join(profile, 'package.json'),
      JSON.stringify({ dependencies: { dshmarket: '1.9.0' } }),
      'utf8'
    )
    await writeFile(
      join(profile, 'node_modules', 'dshmarket', 'package.json'),
      JSON.stringify({ name: 'dshmarket', version: '1.9.0' }),
      'utf8'
    )

    await expect(readMarketInstallation(home)).resolves.toEqual({
      dependency: '1.9.0',
      installedVersion: '1.9.0'
    })
  })

  it('allows loopback status reads but requires same-origin mutation requests', () => {
    const request = (headers = {}, remoteAddress = '127.0.0.1') => ({
      headers,
      socket: { remoteAddress }
    })

    expect(isTrustedRequest(request())).toBe(true)
    expect(
      isTrustedRequest(
        request({ origin: 'http://127.0.0.1:51923', host: '127.0.0.1:51923' }),
        true
      )
    ).toBe(true)
    expect(
      isTrustedRequest(
        request({ origin: 'https://attacker.example', host: '127.0.0.1:51923' }),
        true
      )
    ).toBe(false)
    expect(
      isTrustedRequest(request({ forwarded: 'for=127.0.0.1' }), false)
    ).toBe(false)
    expect(isTrustedRequest(request({}, '192.168.1.5'))).toBe(false)
  })

  it('registers a placeholder before install and a stable management tab afterward', async () => {
    const client = await readFile(
      join(process.cwd(), 'packages', 'dsh-desktop-market-installer', 'client.js'),
      'utf8'
    )
    const desktopPatch = await readFile(
      join(process.cwd(), 'build', 'dsh-desktop.patch.yml'),
      'utf8'
    )
    const preload = await readFile(join(process.cwd(), 'src', 'preload', 'index.ts'), 'utf8')

    expect(client).toContain("entry?.id === 'dshmarket'")
    expect(client).toContain("id: 'market'")
    expect(client).toContain('order: 40')
    expect(client).toContain("id: 'desktop-market-management'")
    expect(client).toContain("name: 'settings.plugins.tab'")
    expect(client).toContain(
      '只会移除 dsh-market。通过插件市场安装的其他插件将继续保留。'
    )
    expect(desktopPatch).toContain('name: dsh-desktop-market-installer')
    expect(desktopPatch).toContain('allowRestart: false')
    expect(preload).toContain("restartHarness: (): Promise<{ ok: boolean }>")
  })
})

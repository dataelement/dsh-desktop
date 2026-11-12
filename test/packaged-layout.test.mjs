import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { packagedLayout } = require('../scripts/verify/packaged-layout.cjs')
// Load the public entry first: builder's platform classes share circular imports.
require('app-builder-lib')
const { LinuxPackager } = require('app-builder-lib/out/linuxPackager.js')
const { createPackage } = require('@electron/asar')
const FpmTarget = require('app-builder-lib/out/targets/FpmTarget.js').default
const packageJson = require('../package.json')
const devConfig = require('../electron-builder.dev.cjs')
let root
let archive
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'dsh-packaged-layout-')) })
afterEach(async () => {
  // Electron's patched recursive rm sees ASAR as a directory; unlink the archive first.
  if (archive) { await unlink(archive); archive = undefined }
  await rm(root, { recursive: true, force: true })
})

function linuxContext(config, metadata = packageJson) {
  // Use the installed builder's resolved naming, including extraMetadata in dev builds.
  const packager = new LinuxPackager({ config, metadata: { ...metadata, ...config.extraMetadata },
    options: {}, buildResourcesDir: join(root, 'build') })
  return { appOutDir: root, electronPlatformName: 'linux', packager }
}

it.each([['production', packageJson.build, 'dsh-desktop'], ['development', devConfig, 'dsh-desktop-dev']])(
  'uses the actual %s Linux builder executableName', (_name, config, executableName) => {
    const context = linuxContext(config)
    expect(context.packager.executableName).toBe(executableName)
    expect(packagedLayout(context)).toEqual({ resources: join(root, 'resources'), executable: join(root, executableName) })
  }
)

it.each([['production', packageJson.build, 'dsh-desktop'], ['development', devConfig, 'dsh-desktop-dev']])(
  'computes real deb metadata for %s without requiring an invented author email', async (_name, config, packageName) => {
    const { packager } = linuxContext(config)
    let sequence = 0
    packager.info.tempDirManager = { getTempFile: async ({ suffix }) => join(root, `${sequence++}-${suffix}`) }
    const target = new FpmTarget('deb', packager, {}, root)
    // The constructor also writes install/remove/AppArmor templates; await them
    // so their failures cannot escape as unhandled background rejections.
    await target.scriptFiles
    expect(await target.computeFpmMetaInfoOptions()).toEqual({
      name: packageName, maintainer: 'DataElement', vendor: 'DataElement', url: packageJson.homepage
    })
    delete target.options.maintainer
    await expect(target.computeFpmMetaInfoOptions()).rejects.toThrow('email')
  }
)

it('honors builder naming precedence and the package-name fallback, not the display name', () => {
  for (const [config, name] of [
    [{ productName: 'Display Name', linux: { executableName: 'custom-linux' }, executableName: 'global' }, 'custom-linux'],
    [{ productName: 'Display Name', executableName: 'global' }, 'global'],
    [{ productName: 'Display Name' }, 'package-name']
  ]) {
    expect(packagedLayout(linuxContext(config, { name: 'Package-Name', version: '1.0.0' })).executable).toBe(join(root, name))
  }
})

it.each(['DSH Desktop', 'DSH Desktop Dev'])('preserves macOS Helper and Windows exe naming for %s', product => {
  const packager = { appInfo: { productFilename: product }, executableName: 'ignored-linux-name' }
  expect(packagedLayout({ appOutDir: root, electronPlatformName: 'darwin', packager })).toEqual({
    resources: join(root, `${product}.app`, 'Contents', 'Resources'),
    executable: join(root, `${product}.app`, 'Contents', 'Frameworks', `${product} Helper.app`, 'Contents', 'MacOS', `${product} Helper`)
  })
  expect(packagedLayout({ appOutDir: root, electronPlatformName: 'win32', packager })).toEqual({
    resources: join(root, 'resources'), executable: join(root, `${product}.exe`)
  })
})

it.each([undefined, '', '../outside'])('rejects invalid resolved Linux names rather than guessing: %s', executableName => {
  expect(() => packagedLayout({ appOutDir: root, electronPlatformName: 'linux',
    packager: { appInfo: { productFilename: 'Display Name' }, executableName } })).toThrow('packager.executableName')
})

// Intercept only the subprocess boundary: execute each hook's real resource lookup
// and assertions, then reject the probe so a failed gate must remain a rejection.
async function loadHook(file, calls, failure) {
  const filename = require.resolve(`../scripts/verify/${file}`)
  const localRequire = createRequire(filename)
  const execFile = () => { throw new Error('Expected the promisified subprocess boundary') }
  execFile[promisify.custom] = async (...args) => { calls.push(args); throw failure }
  const module = { exports: {} }
  const scopedRequire = id => id === 'node:child_process' ? { execFile } : localRequire(id)
  runInNewContext(await readFile(filename, 'utf8'), { require: scopedRequire, module,
    __filename: filename, __dirname: dirname(filename), process, console })
  return module.exports
}

describe.each(['linux', 'darwin', 'win32'])('%s verifier dispatch', platform => {
  it.each(['verify-packaged-harness.cjs', 'verify-packaged-ppt-runtime.cjs', 'verify-office-runtime.cjs'])(
    'runs the packaged executable and propagates failed gate in %s', async file => {
      const context = { appOutDir: root, electronPlatformName: platform,
        packager: { appInfo: { productFilename: 'DSH Desktop Dev' }, executableName: 'dsh-desktop' } }
      const { resources, executable } = packagedLayout(context)
      await mkdir(resources, { recursive: true })
      const source = join(root, 'asar-source')
      await mkdir(source)
      await writeFile(join(source, 'package.json'), '{}')
      archive = join(resources, 'app.asar')
      await createPackage(source, archive)
      await mkdir(dirname(executable), { recursive: true })
      await writeFile(executable, '')
      const payload = join(resources, 'office-runtime', 'primary-runtime')
      await mkdir(payload, { recursive: true })
      await writeFile(join(payload, 'runtime.json'), JSON.stringify({ platform: process.platform, arch: process.arch }))
      const calls = []
      const failure = new Error('probe failed')
      const exported = await loadHook(file, calls, failure)
      const hook = typeof exported === 'function' ? exported : exported.verifyPackagedHarness ?? exported.afterPack
      await expect(hook(context)).rejects.toBe(failure)
      expect(calls).toHaveLength(1)
      expect(calls[0][0]).toBe(executable)
      expect(calls[0][1]).toContain(join(resources, 'app.asar'))
      expect(calls[0][2].env.ELECTRON_RUN_AS_NODE).toBe('1')
      expect(calls[0][2].timeout).toBe(120_000)
    }
  )
})

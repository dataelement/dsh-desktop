import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it, vi } from 'vitest'
import { verifyMacOSMicrophonePermissions } from '../scripts/verify-macos-permissions.mjs'

const exec = promisify(execFile)
const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

async function signingOptions() {
  const { build } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  // Exercise the pinned builder's real main/helper entitlement selection.
  require('app-builder-lib')
  const { MacTargetHelper } = require('app-builder-lib/out/mac/MacTargetHelper.js')
  const helper = new MacTargetHelper({ resourceList: Promise.resolve([]), platformSpecificBuildOptions: build.mac })
  return { mac: build.mac, options: await helper.getOptionsForFile('/fixture/DSH Desktop.app', false, build.mac) }
}

const audio = '<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.security.device.audio-input</key><true/></dict></plist>'

describe('macOS microphone packaging', () => {
  it('configures the usage description and main/helper entitlements without broadening device access', async () => {
    const { mac, options } = await signingOptions()
    expect(mac.hardenedRuntime).toBe(true)
    expect(mac.extendInfo.NSMicrophoneUsageDescription).toMatch(/microphone.*transcribe/i)
    for (const target of ['/fixture/DSH Desktop.app', '/fixture/DSH Desktop.app/Contents/Frameworks/DSH Desktop Helper.app']) {
      const selected = options(target)
      expect(selected.hardenedRuntime).toBe(true)
      expect(selected.entitlements).toBe('build/entitlements.mac.plist')
      const plist = await readFile(path.join(root, selected.entitlements), 'utf8')
      for (const entitlement of ['cs.allow-jit', 'cs.allow-unsigned-executable-memory', 'cs.disable-library-validation', 'device.audio-input']) {
        expect(plist).toContain('<key>com.apple.security.' + entitlement + '</key>')
      }
      expect(plist).not.toMatch(/device\.(camera|bluetooth|usb)|app-sandbox|network\.server/)
    }
    const dev = require('../electron-builder.dev.cjs')
    expect(dev.mac).toEqual(mac)
  })

  it('checks signed main and helper bundles, rejecting missing audio capability or description', async () => {
    const list = vi.fn(async () => ['Electron Framework.framework', 'DSH Desktop Helper.app', 'DSH Desktop Helper (Renderer).app'])
    const run = vi.fn(async command => ({ stdout: command.endsWith('PlistBuddy') ? 'Microphone for speech input' : audio }))
    await verifyMacOSMicrophonePermissions('/fixture/DSH Desktop.app', { run, list })
    expect(run.mock.calls.filter(([command]) => command.endsWith('codesign'))).toHaveLength(3)
    run.mockImplementation(async (command, args) => ({ stdout: command.endsWith('PlistBuddy')
      ? 'Microphone for speech input'
      : args.at(-1).endsWith('Helper.app') ? audio.replace('<true/>', '<false/>') : audio }))
    await expect(verifyMacOSMicrophonePermissions('/fixture/DSH Desktop.app', { run, list })).rejects.toThrow('Helper.app')
    run.mockResolvedValue({ stdout: '' })
    await expect(verifyMacOSMicrophonePermissions('/fixture/DSH Desktop.app', { run, list })).rejects.toThrow('description is empty')
    run.mockRejectedValue(new Error('codesign failed'))
    await expect(verifyMacOSMicrophonePermissions('/fixture/DSH Desktop.app', { run, list })).rejects.toThrow('codesign failed')
    run.mockResolvedValue({ stdout: 'description' })
    await expect(verifyMacOSMicrophonePermissions('/fixture/DSH Desktop.app', { run, list: async () => [] })).rejects.toThrow('no Electron helpers')
  })

  it.runIf(process.platform === 'darwin')('verifies real Hardened Runtime signatures produced with the configured entitlement files', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'dsh-microphone-signing-'))
    try {
      const { mac, options } = await signingOptions()
      const source = path.join(directory, 'probe.c')
      const executable = path.join(directory, 'probe')
      await writeFile(source, 'int main(void) { return 0; }\n')
      await exec('/usr/bin/clang', [source, '-o', executable])
      const app = path.join(directory, 'DSH Desktop.app')
      const helpers = path.join(app, 'Contents', 'Frameworks')
      for (const [index, bundle] of [app, path.join(helpers, 'DSH Desktop Helper.app'), path.join(helpers, 'DSH Desktop Helper (Renderer).app')].entries()) {
        await mkdir(path.join(bundle, 'Contents', 'MacOS'), { recursive: true })
        await writeFile(path.join(bundle, 'Contents', 'Info.plist'),
          '<?xml version="1.0"?><plist version="1.0"><dict>'
          + '<key>CFBundleExecutable</key><string>probe</string><key>CFBundleIdentifier</key><string>io.dsh.permission-probe.' + index + '</string>'
          + '<key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string>'
          + '<key>NSMicrophoneUsageDescription</key><string>' + mac.extendInfo.NSMicrophoneUsageDescription + '</string></dict></plist>')
        await copyFile(executable, path.join(bundle, 'Contents', 'MacOS', 'probe'))
      }
      // Sign inside out, just as the actual application packaging does.
      for (const [bundle, target] of [
        [path.join(helpers, 'DSH Desktop Helper.app'), '/fixture/helper.app'],
        [path.join(helpers, 'DSH Desktop Helper (Renderer).app'), '/fixture/renderer.app'],
        [app, '/fixture/DSH Desktop.app']
      ]) {
        await exec('/usr/bin/codesign', ['--force', '--sign', '-', '--options', 'runtime', '--timestamp=none', '--entitlements', path.join(root, options(target).entitlements), bundle])
      }
      await verifyMacOSMicrophonePermissions(app)
      // The same gate must catch the regression in an actual signed helper.
      const noAudio = path.join(directory, 'no-audio.plist')
      await writeFile(noAudio, '<?xml version="1.0"?><plist version="1.0"><dict/></plist>')
      await exec('/usr/bin/codesign', ['--force', '--sign', '-', '--options', 'runtime', '--timestamp=none', '--entitlements', noAudio, path.join(helpers, 'DSH Desktop Helper.app')])
      await expect(verifyMacOSMicrophonePermissions(app)).rejects.toThrow('Helper.app')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

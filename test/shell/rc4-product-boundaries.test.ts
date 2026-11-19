import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SAFE_MODE_BUNDLES } from '../../src/main/recovery/safe-mode-profile'

const root = join(import.meta.dirname, '../..')
const require = createRequire(import.meta.url)

describe('rc.4 product boundaries', () => {
  it('offers Computer Use and chat import switched off, and keeps them out of Safe Mode', () => {
    const official = require('@deepseek-ai/dsh-official-bundles') as {
      OPTIONAL_BUNDLES: readonly string[]
      MORE_BUNDLES: readonly string[]
    }
    const cua = require('@deepseek-ai/dsh-cua-bundle/package.json') as {
      dsh?: { bundle?: { platforms?: string[] } }
    }
    for (const name of ['@deepseek-ai/dsh-cua-bundle', '@deepseek-ai/dsh-deepseek-chat-import']) {
      expect(official.OPTIONAL_BUNDLES).toContain(name)
      expect(official.MORE_BUNDLES).toContain(name)
      expect(SAFE_MODE_BUNDLES).not.toContain(name)
    }
    expect(cua.dsh?.bundle?.platforms).toEqual(['darwin'])
  })

  it('keeps application updates on the product feed and out of the official update modules', async () => {
    const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      build: { publish: { url: string }[]; asarUnpack: string[]; mac: { extendInfo: Record<string, string> } }
    }
    expect(packageJson.build.publish.map(item => item.url)).toEqual(['https://dshdesktop.com/updates/latest/'])
    expect(packageJson.build.asarUnpack).toContain('node_modules/@deepseek-ai/dsh-experimental-cua-macos/native/**/*')
    expect(packageJson.build.mac.extendInfo.NSScreenCaptureUsageDescription).toMatch(/Computer Use/)
    const sources = await Promise.all([
      'src/main/shell/app.ts',
      'src/main/shell/window/ipc.ts',
      'src/preload/app.ts',
      'src/host/index.ts',
      'src/main/update/update-manager.ts'
    ].map(file => readFile(join(root, file), 'utf8')))
    const combined = sources.join('\n')
    expect(combined).not.toMatch(/update-configuration|update-settings|updates\/electron-updater|desktop-stable|updatesChannel/)
    expect(combined).not.toMatch(/updates\.deepseek|electron-updater\.github/)
  })
})

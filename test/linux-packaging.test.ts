import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const manifest = require('../package.json')
const development = require('../electron-builder.linux-dev.cjs')
const production = require('../electron-builder.linux.cjs')

describe('Linux native packaging', () => {
  it('accepts both channels with the installed builder schema', async () => {
    const { validateConfiguration } = require('app-builder-lib/out/util/config/config.js')
    for (const config of [production, development]) {
      await expect(validateConfiguration(config, { isEnabled: false })).resolves.toBeUndefined()
    }
  })

  it('requires the matching native runtime before building either channel', () => {
    for (const name of ['package:linux:x64', 'package:dev:linux:x64']) {
      expect(manifest.scripts[name]).toMatch(new RegExp('^node scripts/verify/verify-target[.]mjs linux x64 && npm run build && electron-builder --linux deb --x64 --publish never'))
    }
    expect(manifest.scripts['package:dev:linux:x64']).toContain('--config electron-builder.linux-dev.cjs')
    expect(manifest.scripts['package:linux:x64']).toContain('--config electron-builder.linux.cjs')
  })

  it('ships a deb with a stable executable and retains every runtime gate', () => {
    expect(manifest.build.linux).toMatchObject({
      executableName: 'dsh-desktop',
      maintainer: 'DataElement',
      category: 'Utility',
      target: [{ target: 'deb', arch: ['x64'] }]
    })
    expect(manifest.build.linux.artifactName).toBe('dsh-desktop-linux-${arch}-${version}.${ext}')
    expect(manifest.build.afterPack).toBe('scripts/release/after-pack.cjs')
    expect(manifest.build.asarUnpack).toContain('node_modules/@deepseek-ai/libreoffice-kit-*/**/*')
  })

  it('keeps development executable and desktop identity separate', () => {
    expect(development.appId).not.toBe(manifest.build.appId)
    expect(development.linux.executableName).toBe('dsh-desktop-dev')
    expect(development.extraMetadata.dshDesktopChannel).toBe('development')
    expect(development.linux.target).toEqual(manifest.build.linux.target)
    expect(development.afterPack).toBe(manifest.build.afterPack)
  })
})

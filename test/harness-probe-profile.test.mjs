import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, expect, it } from 'vitest'
import { composeEntries, loadOverlayPatches, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { prepareProbeProfile } from '../scripts/verify/probe-electron-node-runtime.mjs'
import { DESKTOP_SAFE_PRODUCT_PATCH } from '../src/main/shell/product-patch'
import { parse } from 'yaml'

const require = createRequire(import.meta.url)
const { prepareHarnessProbeProfile } = require('../scripts/verify/verify-packaged-harness.cjs')
const temporary = []
const telemetryIds = ['desktop-product-telemetry', 'product-analytics']
const installAnchor = resolve('node_modules/@deepseek-ai/dsh/package.json')

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(home => rm(home, { recursive: true, force: true })))
})

function flatten(entries) {
  return entries.flatMap(entry => [entry, ...(Array.isArray(entry.config) ? flatten(entry.config) : [])])
}

it.each([
  ['Electron Node', prepareProbeProfile],
  ['packaged Harness', prepareHarnessProbeProfile]
])('%s probe disables the actual bundled telemetry rows through a product overlay', async (_label, prepare) => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-probe-profile-test-'))
  temporary.push(home)
  const { profile, patchFile } = await prepare(home)
  expect(patchFile).toBe(join(home, 'harness', 'desktop-product.patch.yml'))
  expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).toBe('[]\n')
  expect(await readFile(join(profile, 'cordis.yml'), 'utf8')).toBe('[]\n')
  const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  expect(manifest.dependencies).toEqual({})
  expect(manifest.dsh.profile.bundles).toEqual(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])

  const overlay = loadOverlayPatches('dsh', patchFile)
  const productTelemetry = parse(DESKTOP_SAFE_PRODUCT_PATCH).filter(row => telemetryIds.includes(row.id))
  expect(overlay).toEqual(productTelemetry)
  expect(overlay).toEqual(telemetryIds.map(id => ({ id, disabled: true })))

  // Exercise Harness' real bundle loading and patch composition rather than matching source text.
  const loaded = loadProfileDirectory('dsh', profile, installAnchor)
  expect(loaded.skippedBundles).toEqual([])
  const layers = [...loaded.layers.map(layer => layer.patches), loaded.patches]
  const before = flatten(composeEntries(layers))
  const after = flatten(composeEntries([...layers, overlay]))
  for (const id of telemetryIds) {
    expect(before.find(row => row.id === id)?.disabled).not.toBe(true)
    expect(before.some(row => row.id === id)).toBe(true)
    expect(after.find(row => row.id === id)).toMatchObject({ disabled: true })
  }
  // Required flags and all unrelated rows remain intact; no serviceVersion is fabricated.
  expect(after).toEqual(before.map(row => telemetryIds.includes(row.id) ? { ...row, disabled: true } : row))
})

it.each(['probe-electron-node-runtime.mjs', 'verify-packaged-harness.cjs'])(
  '%s passes its disposable product overlay to the Host after inherited environment', async script => {
    const source = await readFile(resolve('scripts/verify', script), 'utf8')
    expect(source).toMatch(/env: \{ \.\.\.process\.env,[\s\S]*?DSH_DESKTOP_PATCH_FILE: patchFile/u)
  }
)

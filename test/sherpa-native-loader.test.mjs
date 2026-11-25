import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const { parsePatchFile } = require('patch-package/dist/patch/parse.js')
const { executeEffects } = require('patch-package/dist/patch/apply.js')
const root = mkdtempSync(join(tmpdir(), 'dsh-sherpa-loader-'))
const relative = 'node_modules/sherpa-onnx-node/addon.js'
const patch = readFileSync(new URL('../patches/sherpa-onnx-node+1.13.8.patch', import.meta.url), 'utf8')
let source
try {
  mkdirSync(join(root, 'node_modules/sherpa-onnx-node'), { recursive: true })
  const original = readFileSync(require.resolve('sherpa-onnx-node/addon.js'), 'utf8')
  writeFileSync(join(root, relative), original)
  // Verify replay even in checkouts where postinstall already applied the patch.
  if (original.includes('let loadError;')) {
    const { reversePatch } = require('patch-package/dist/patch/reverse.js')
    executeEffects(reversePatch(parsePatchFile(patch)), { cwd: root, dryRun: false, bestEffort: false })
  }
  executeEffects(parsePatchFile(patch), { cwd: root, dryRun: false, bestEffort: false })
  source = readFileSync(join(root, relative), 'utf8')
} finally {
  rmSync(root, { recursive: true, force: true })
}

function load(resolveAddon, staticAddon = null) {
  const module = { exports: {} }
  runInNewContext(source, { module, process: { env: {} }, __dirname: '/installation/node_modules/sherpa-onnx-node',
    require: name => name === 'os' ? { platform: () => 'linux', arch: () => 'x64' }
      : name === 'path' ? require('node:path') : name === './addon-static-import' ? staticAddon : resolveAddon(name) })
  return module.exports
}
const missing = () => { throw Object.assign(new Error('missing addon'), { code: 'MODULE_NOT_FOUND' }) }

test('replayed loader retains actual dlopen cause instead of library path advice', () => {
  const cause = Object.assign(new Error('libc.so.6: version GLIBC_2.32 not found'), { code: 'ERR_DLOPEN_FAILED' })
  assert.throws(() => load(name => {
    if (name === '../sherpa-onnx-linux-x64/sherpa-onnx.node') throw cause
    return missing()
  }), error => error.cause === cause && error.message.includes('GLIBC_2.32') && !error.message.includes('LD_LIBRARY_PATH'))
})

test('missing addon retains path search diagnostic and original cause', () => {
  assert.throws(() => load(missing), error => error.cause.code === 'MODULE_NOT_FOUND' && error.message.includes('Tried'))
})

test('a later compatible candidate still loads after an incompatible candidate', () => {
  const addon = { readWave: true }
  assert.equal(load(name => {
    if (name === './sherpa-onnx.node') return addon
    throw Object.assign(new Error('ABI mismatch'), { code: 'ERR_DLOPEN_FAILED' })
  }), addon)
  assert.equal(load(() => { throw new Error('must not search') }, addon), addon)
})

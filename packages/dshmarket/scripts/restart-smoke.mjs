#!/usr/bin/env node
import assert from 'node:assert/strict'
import { dirname, join, resolve } from 'node:path'
import { restartAllowed, restartLaunch, trustedRestartRequest } from '../lib/restart.js'

function request(remoteAddress, origin = 'http://127.0.0.1:3080', host = '127.0.0.1:3080') {
  return { socket: { remoteAddress }, headers: { origin, host } }
}

assert.equal(trustedRestartRequest(request('127.0.0.1')), true)
assert.equal(trustedRestartRequest(request('::1', 'http://localhost:3080', 'localhost:3080')), true)
assert.equal(trustedRestartRequest(request('::ffff:127.0.0.1')), true)
assert.equal(trustedRestartRequest(request('192.168.1.2')), false)
assert.equal(trustedRestartRequest(request('127.0.0.1', 'http://evil.example', '127.0.0.1:3080')), false)
assert.equal(trustedRestartRequest(request('127.0.0.1', 'file://127.0.0.1:3080', '127.0.0.1:3080')), false)
assert.equal(trustedRestartRequest({
  ...request('127.0.0.1'),
  headers: { ...request('127.0.0.1').headers, 'x-forwarded-for': '127.0.0.1' },
}), false)

// Explicitly parameterised rather than reading the ambient environment:
// this script runs on CI runners, which ARE systemd units, so their jobs
// inherit INVOCATION_ID. An ambient `restartAllowed({})` therefore asserts
// something different on a runner than on a laptop — which is exactly how
// this caught the first, too-loose version of the detection (#229).
assert.equal(restartAllowed({}, {}, 4242), true)
assert.equal(restartAllowed({ allowRestart: true }, {}, 4242), true)
assert.equal(restartAllowed({ allowRestart: false }, {}, 4242), false)
// Supervised: marker AND being the unit's own main process (ppid 1).
assert.equal(restartAllowed({}, { INVOCATION_ID: 'x' }, 1), false)
// Inherited marker under an ordinary parent must NOT read as supervised.
assert.equal(restartAllowed({}, { INVOCATION_ID: 'x' }, 4242), true)

const originalArgv = [...process.argv]
try {
  const entry = join('apps', 'cli', 'src', 'bin.ts')
  process.argv.splice(0, process.argv.length, process.execPath, entry, 'web', '--port', '3081')
  const launch = restartLaunch()
  assert.equal(launch.file, process.execPath)
  assert.deepEqual(launch.args, [...process.execArgv, resolve(entry), 'web', '--port', '3081'])
  assert.equal(launch.cwd, dirname(resolve(entry)))
  assert.equal(launch.viaShell, false)
} finally {
  process.argv.splice(0, process.argv.length, ...originalArgv)
}

console.log('restart smoke ok: guarded route and resolved DSH launch')

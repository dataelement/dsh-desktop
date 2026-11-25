import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createPackageWithOptions } = require('@electron/asar')
const electron = require('electron')
const entry = require.resolve('@deepseek-ai/node-addon-system/landlock-run')
const roots = []
const archives = []
afterEach(async () => {
  // Electron's patched fs treats ASAR as a directory; unlink before recursive rm.
  for (const archive of archives.splice(0)) await unlink(archive)
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-landlock-')))
  roots.push(root)
  const stage = join(root, 'stage')
  const platformPackage = '@deepseek-ai/node-addon-system-linux-x64'
  const moduleRoot = join(stage, 'node_modules', platformPackage)
  await mkdir(join(moduleRoot, 'bin'), { recursive: true })
  await writeFile(join(stage, 'package.json'), '{}')
  await writeFile(join(moduleRoot, 'package.json'), JSON.stringify({ name: platformPackage, version: '0.1.2' }))
  // A real subprocess fixture, not an assertion about source text or mocked spawn.
  // It checks probe argv and then supports executing the caller's command.
  const binary = join(moduleRoot, 'bin', 'landlock-run')
  await writeFile(binary, ['#!/bin/sh', 'if [ "$1" = "--probe" ]; then echo "partially enforced"; exit 0; fi', 'if [ "$1" = "--" ]; then shift; exec "$@"; fi', 'exit 125', ''].join('\n'))
  await chmod(binary, 0o755)
  const archive = join(root, 'app.asar')
  await createPackageWithOptions(stage, archive, { unpack: '**/bin/landlock-run' })
  archives.push(archive)
  return { root, archive, platformPackage }
}

function run(script) {
  const result = spawnSync(electron, ['--input-type=module', '-e', script], {
    encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 15000
  })
  if (result.status !== 0) throw new Error(result.stderr || String(result.error))
  return JSON.parse(result.stdout)
}

it.skipIf(process.platform === 'win32')('executes the unpacked Linux launcher resolved through a real ASAR manifest and fails closed if removed', async () => {
  const { archive, platformPackage } = await fixture()
  const source = await readFile(entry, 'utf8')
  const script = [
    "import { createRequire } from 'node:module'",
    "import { spawnSync } from 'node:child_process'",
    "Object.defineProperty(process, 'platform', { value: 'linux' })",
    "const api = await import('data:text/javascript;base64,' + " + JSON.stringify(Buffer.from(source).toString('base64')) + ")",
    "const resolve = createRequire(" + JSON.stringify(join(archive, 'package.json')) + ").resolve",
    "const launcher = api.launcherPath(() => resolve(" + JSON.stringify(platformPackage + '/package.json') + "))",
    "console.log(JSON.stringify({ launcher, probe: api.probe(launcher), output: spawnSync(launcher, ['--', '/bin/echo', 'landlock-ok'], { encoding: 'utf8' }).stdout }))"
  ].join('\n')
  const physical = join(archive + '.unpacked', 'node_modules', platformPackage, 'bin', 'landlock-run')
  expect(run(script)).toEqual({ launcher: physical, probe: 'partial', output: 'landlock-ok\n' })
  await unlink(physical)
  expect(run(script)).toMatchObject({ launcher: physical, probe: 'unusable' })
})

it.skipIf(process.platform === 'win32')('preserves ordinary, already unpacked, substring paths and non-Linux resolution', async () => {
  const source = await readFile(entry, 'utf8')
  const cases = ['/tmp/dev', '/tmp/app.asar.unpacked', '/tmp/my-app.asar-copy']
  for (const platform of ['linux', 'darwin', 'win32']) {
    const script = [
      "Object.defineProperty(process, 'platform', { value: " + JSON.stringify(platform) + " })",
      "const api = await import('data:text/javascript;base64,' + " + JSON.stringify(Buffer.from(source).toString('base64')) + ")",
      "console.log(JSON.stringify(" + JSON.stringify([...cases, '/tmp/app.asar']) + ".map(base => api.launcherPath(() => base + '/package.json'))))"
    ].join('\n')
    expect(run(script)).toEqual([...cases, platform === 'linux' ? '/tmp/app.asar.unpacked' : '/tmp/app.asar'].map(base => join(base, 'bin', 'landlock-run')))
  }
})

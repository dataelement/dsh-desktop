import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'

it('classifies real child heap exhaustion, preserves the Profile and does not carry OOM into a fresh launch', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-memory-failure-'))
  const entry = join(home, 'entry.mjs')
  const profile = join(home, 'profiles', 'web')
  await mkdir(profile, { recursive: true })
  const manifest = JSON.stringify({ private: true, dependencies: {}, dsh: { profile: { bundles: [] } } })
  await writeFile(join(profile, 'package.json'), manifest)
  await writeFile(entry, 'export function runCli() { const retained = []; for (;;) retained.push(new Array(128 * 1024).fill(123)); }')
  const runtime = new HarnessRuntime({
    dshEntryPath: entry, nodeEntryPath: resolve('build/harness-node-entry.mjs'), nodeExecutablePath: process.execPath,
    dshPatchPath: entry, dshSafePatchPath: entry, dshHome: home, logPath: join(home, 'runtime.log'),
    startupTimeoutMs: 10000, onChanged() {},
    launchProcess: (executable, args, options) => spawn(executable,
      // Deliberately constrain this synthetic child only; production argv stays upstream-default.
      ['--max-old-space-size=64', ...args], options)
  })
  try {
    await runtime.start(home)
    expect(runtime.snapshot().failureReason, runtime.snapshot().logs.join('\n')).toBe('memory-exhausted')
    expect(runtime.snapshot().phase).toBe('failed')
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(manifest)
    await writeFile(entry, 'export function runCli() { throw Error("ordinary failure"); }')
    await runtime.start(home)
    expect(runtime.snapshot().failureReason).toBeUndefined()
    expect(runtime.snapshot().message).toContain('ordinary failure')
  } finally {
    await runtime.stop()
    await rm(home, { recursive: true, force: true, maxRetries: 6, retryDelay: 100 })
  }
}, 30000)

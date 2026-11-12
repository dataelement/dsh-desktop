import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { expect, it } from 'vitest'

it('runs the recovery page in Electron against a temporary profile', async () => {
  const electron: unknown = createRequire(import.meta.url)('electron')
  if (typeof electron !== 'string') throw new Error('Electron executable is required')
  const root = await mkdtemp(join(tmpdir(), 'dsh-startup-recovery-'))
  const entry = join(root, 'fixture.cjs')
  let cleanExit = false
  try {
    await build({
      entryPoints: [resolve('test/shell/startup-recovery-electron-fixture.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['electron'],
      outfile: entry,
      logLevel: 'silent'
    })
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DSH_HOME: join(root, 'home'),
      DSH_RECOVERY_FIXTURE_ROOT: root,
      DSH_RECOVERY_BUILD: resolve('build')
    }
    delete env.ELECTRON_RUN_AS_NODE
    const result = spawnSync(electron, [entry], {
      cwd: resolve('.'),
      env,
      encoding: 'utf8',
      timeout: 30_000,
      killSignal: 'SIGKILL',
      maxBuffer: 2_000_000
    })
    cleanExit = result.status === 0 && result.error === undefined && result.signal === null
    const evidence = `${result.stdout}\n${result.stderr}`
    expect(result.error, evidence).toBeUndefined()
    expect(result.status, evidence).toBe(0)
    for (const name of ['early-click', 'duplicate', 'load-failure', 'window-close', 'quit']) {
      expect(result.stdout, evidence).toContain(`PASS ${name}`)
    }
    expect(result.stdout, evidence).toContain('NATIVE-RECOVERY-ACCEPTANCE-COMPLETE')
  } finally {
    if (cleanExit) await rm(root, { recursive: true, force: true })
    else console.error('Startup recovery Electron evidence retained at', root)
  }
}, 40_000)

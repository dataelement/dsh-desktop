import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { expect, it } from 'vitest'

it('runs real mobile pairing windows with local tunnel providers and isolated userData', async () => {
  const electron: unknown = createRequire(import.meta.url)('electron')
  if (typeof electron !== 'string') throw new Error('Electron executable is required')
  const root = await mkdtemp(join(tmpdir(), 'dsh-mobile-window-'))
  let cleanExit = false
  try {
    const fixture = resolve('test/shell/mobile-window-electron-fixture.ts')
    const entry = join(root, 'fixture.cjs')
    // stdin keeps the fixture portable even when its bundled CJS lives outside the repository.
    await build({
      stdin: { contents: await readFile(fixture, 'utf8'), resolveDir: resolve('test/shell'), sourcefile: fixture, loader: 'ts' },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['electron'],
      outfile: entry,
      logLevel: 'silent'
    })
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DSH_HOME: join(root, 'harness'),
      DSH_MOBILE_FIXTURE_ROOT: root
    }
    delete env.ELECTRON_RUN_AS_NODE
    const result = spawnSync(electron, [entry], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 35_000,
      killSignal: 'SIGKILL',
      maxBuffer: 2_000_000
    })
    const evidence = `${result.stdout}\n${result.stderr}`
    cleanExit = result.status === 0 && result.error === undefined && result.signal === null
    expect(result.error, evidence).toBeUndefined()
    expect(result.signal, evidence).toBeNull()
    expect(result.status, evidence).toBe(0)
    for (const name of ['manual-loading', 'success', 'failure', 'reuse', 'lan-reconnect', 'cleanup']) {
      expect(result.stdout, evidence).toContain(`PASS ${name}`)
    }
    expect(result.stdout, evidence).toContain('MOBILE-WINDOW-ELECTRON-COMPLETE')
  } finally {
    if (cleanExit) await rm(root, { recursive: true, force: true })
    else console.error('Mobile window Electron evidence retained at', root)
  }
}, 45_000)

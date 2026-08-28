import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildPnpmShimCommand,
  diagnosticLine,
  removeProfilePluginWithDsh
} from '../src/main/runtime/profile-plugin-command'

const existingRunnerPath = join(
  __dirname,
  '..',
  'packages',
  'dsh-desktop-market-installer',
  'pnpm-runner.mjs'
)

describe('profile-plugin-command', () => {
  const testDir = join(__dirname, '.temp-profile-plugin-command-test')

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('runs the DSH remove command with the bundled pnpm shim on PATH', async () => {
    const profileDirectory = join(testDir, 'profiles', 'web')
    const reportPath = join(testDir, 'report.json')
    const dshEntryPath = join(testDir, 'fake-dsh.mjs')
    await mkdir(profileDirectory, { recursive: true })
    await writeFile(
      dshEntryPath,
      `
        import { spawnSync } from 'node:child_process'
        import { writeFileSync } from 'node:fs'
        const pnpm = spawnSync('pnpm', ['--version'], {
          encoding: 'utf8',
          shell: process.platform === 'win32'
        })
        writeFileSync(${JSON.stringify(reportPath)}, JSON.stringify({
          argv: process.argv.slice(2),
          dshHome: process.env.DSH_HOME,
          pnpmVersion: pnpm.stdout?.trim(),
          pnpmStatus: pnpm.status,
          pnpmError: pnpm.error?.message
        }))
        process.exit(pnpm.status ?? 1)
      `,
      'utf8'
    )

    const result = await removeProfilePluginWithDsh(
      {
        dshHome: testDir,
        dshEntryPath,
        nodeExecutablePath: process.execPath,
        pnpmEntryPath: join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
        environment: process.env
      },
      '@example/plugin'
    )

    expect(result).toEqual({ ok: true })
    expect(JSON.parse(await readFile(reportPath, 'utf8'))).toEqual({
      argv: ['plugin', '--profile', 'web', 'remove', '@example/plugin'],
      dshHome: testDir,
      pnpmVersion: '10.34.5',
      pnpmStatus: 0
    })
  })

  it('observes a fast command exit before sampling a large profile tree', async () => {
    const profileDirectory = join(testDir, 'profiles', 'web')
    const dshEntryPath = join(testDir, 'fast-dsh.mjs')
    await mkdir(join(profileDirectory, 'node_modules'), { recursive: true })
    await Promise.all(
      Array.from({ length: 1024 }, (_, index) =>
        mkdir(join(profileDirectory, 'node_modules', `package-${String(index)}`))
      )
    )
    await writeFile(dshEntryPath, 'process.exit(0)\n', 'utf8')

    await expect(removeProfilePluginWithDsh(
      {
        dshHome: testDir,
        dshEntryPath,
        nodeExecutablePath: process.execPath,
        pnpmEntryPath: join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
        environment: process.env
      },
      '@example/plugin'
    )).resolves.toEqual({ ok: true })
  }, 10_000)
})

describe('profile pnpm shim and failure reporting', () => {
  it('keeps the desktop shim on the same lock-recovery runner Harness uses', () => {
    // Both writers share <dshHome>/.desktop-bin, so a desktop-written shim
    // that called pnpm directly would silently drop the recovery until
    // Harness next rewrote them.
    const base = {
      dshHome: '/home/.dsh',
      dshEntryPath: '/app/dsh/bin.js',
      nodeExecutablePath: '/app/node',
      pnpmEntryPath: '/app/pnpm.cjs'
    }

    expect(buildPnpmShimCommand(base)).toEqual(['/app/pnpm.cjs'])
    expect(
      buildPnpmShimCommand({ ...base, pnpmRunnerPath: '/app/missing-runner.mjs' })
    ).toEqual(['/app/pnpm.cjs'])
    expect(
      buildPnpmShimCommand({ ...base, pnpmRunnerPath: existingRunnerPath })
    ).toEqual([existingRunnerPath, '/app/pnpm.cjs'])
  })

  it('reports the failure that names a cause, not dsh’s wrapper line', () => {
    // dsh always ends with "pnpm failed in profile directory …", which names
    // nothing — reporting that turns every failure into a dead end.
    expect(
      diagnosticLine(
        [
          'Progress: resolved 120, reused 118',
          "error: EPERM: operation not permitted, rename 'x_tmp_1_1' -> 'x'",
          'dsh: pnpm failed in profile directory C:\\profiles\\web'
        ].join('\n')
      )
    ).toContain('EPERM')
    expect(diagnosticLine('a\nb\nlast line')).toBe('last line')
    expect(diagnosticLine('   ')).toBeUndefined()
  })
})

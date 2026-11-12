import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  cacheDesktopSources,
  checkBaseline,
  diffReport,
  parseBaseline,
  resolvedDshVersion
} from '../../scripts/upstream-baseline.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const temporary: string[] = []

const mandatory = [
  'apps/desktop/src/mandatory-update-ipc.ts',
  'apps/desktop/src/mandatory-update-policy.ts',
  'apps/desktop/src/mandatory-update-window.ts',
  'apps/desktop/src/preload-mandatory-overlay.ts',
  'apps/desktop/src/preload-mandatory.ts'
]
const officialUpdate = [
  'apps/desktop-host/src/update-tasks.ts',
  'apps/desktop/src/preload-update-dialog.ts',
  'apps/desktop/src/update-attention.ts',
  'apps/desktop/src/update-channel.ts',
  'apps/desktop/src/update-coordinator.ts',
  'apps/desktop/src/update-dialog.ts',
  'apps/desktop/src/update-error.ts',
  'apps/desktop/src/update-http-executor.ts',
  'apps/desktop/src/update-journal.ts',
  'apps/desktop/src/update-overlay.ts',
  'apps/desktop/src/update-presentation.ts',
  'apps/desktop/src/update-schedule.ts',
  'apps/desktop/src/update-window.ts'
]
const feishuAuth = ['apps/desktop/src/policy-test-auth.ts']
const productDecision = [
  'apps/desktop-host/src/cli.ts',
  'apps/desktop/src/account-backend.ts',
  'apps/desktop/src/command-installation.ts',
  'apps/desktop/src/command-management.ts',
  'apps/desktop/src/command-manager-entry.ts',
  'apps/desktop/src/preload-platform-account.ts',
  'apps/desktop/src/preload-welcome.ts',
  'apps/desktop/src/welcome-api.ts',
  'apps/desktop/src/welcome-backend.ts',
  'apps/desktop/src/welcome-window.ts'
]

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('upstream baseline', () => {
  it('matches the locked @deepseek-ai/dsh version and keeps the three skipped groups', async () => {
    const baseline = parseBaseline(JSON.parse(await readFile(resolve(root, 'upstream-baseline.json'), 'utf8')))
    const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'))
    expect(baseline.dshVersion).toBe(resolvedDshVersion(lock))
    expect(baseline.commit).toBe('66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db')
    expect(baseline.skipped).toEqual([...mandatory, ...officialUpdate, ...feishuAuth, ...productDecision].sort())
    for (const absent of ['electron-updater', 'update-configuration.ts', 'update-settings.ts', 'update-cleanup-log.ts']) {
      expect(baseline.skipped.some(file => file.includes(absent))).toBe(false)
    }
    const errors = checkBaseline(baseline, { lockVersion: baseline.dshVersion, root })
    expect(errors).toEqual([])
  })

  it('fails when dshVersion does not match the lockfile', () => {
    const baseline = sampleBaseline({ dshVersion: '0.0.0' })
    const errors = checkBaseline(baseline, { lockVersion: '0.2.2-rc.1', root })
    expect(errors.map(error => error.code)).toContain('version-mismatch')
  })

  it('fails when a registered module path is missing', async () => {
    const fixture = await makeTemp()
    const baseline = sampleBaseline({ path: 'src/main/shell/missing.ts' })
    const errors = checkBaseline(baseline, { lockVersion: baseline.dshVersion, root: fixture })
    expect(errors).toEqual([
      expect.objectContaining({ code: 'missing-path', path: 'src/main/shell/missing.ts' })
    ])
  })

  it('fails when a new upstream desktop file is neither ported nor skipped', () => {
    const baseline = sampleBaseline()
    const before = new Map([['apps/desktop/src/main.ts', 'old']])
    const after = new Map([
      ['apps/desktop/src/main.ts', 'old'],
      ['apps/desktop/src/new-feature.ts', 'new']
    ])
    const report = diffReport(before, after, baseline)
    expect(report.unregistered).toEqual(['apps/desktop/src/new-feature.ts'])
    expect(report.changes).toEqual([])
  })

  it('reads two commits from a local repository and ignores the cache directory contents as source', async () => {
    const repository = await makeTemp()
    const cache = await makeTemp()
    await git(repository, ['init'])
    await git(repository, ['config', 'user.email', 'baseline@example.com'])
    await git(repository, ['config', 'user.name', 'baseline'])
    await git(repository, ['config', 'commit.gpgsign', 'false'])
    await git(repository, ['config', 'core.autocrlf', 'false'])
    await writeRepoFile(repository, 'apps/desktop/src/main.ts', 'first\n')
    await git(repository, ['add', '.'])
    await git(repository, ['commit', '-m', 'first'])
    const first = (await git(repository, ['rev-parse', 'HEAD'])).trim()
    await writeRepoFile(repository, 'apps/desktop/src/main.ts', 'second\n')
    await writeRepoFile(repository, 'apps/desktop/src/extra.ts', 'extra\n')
    await git(repository, ['add', '.'])
    await git(repository, ['commit', '-m', 'second'])
    const second = (await git(repository, ['rev-parse', 'HEAD'])).trim()

    const before = await cacheDesktopSources(repository, first, cache)
    const after = await cacheDesktopSources(repository, second, cache)
    const report = diffReport(before, after, sampleBaseline())
    expect(report.changes).toEqual([{ path: 'src/main/shell/app.ts', files: ['apps/desktop/src/main.ts'] }])
    expect(report.unregistered).toEqual(['apps/desktop/src/extra.ts'])
    expect(await readFile(join(cache, second, 'apps/desktop/src/extra.ts'), 'utf8')).toBe('extra\n')

    const baselineFile = join(repository, 'baseline.json')
    await writeFile(baselineFile, JSON.stringify(sampleBaseline()))
    const result = await runNode([
      'scripts/upstream-diff.mjs',
      '--from', first,
      '--to', second,
      '--repository', repository,
      '--cache', cache,
      '--baseline', baselineFile
    ])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain('apps/desktop/src/extra.ts')
  })
})

function sampleBaseline(overrides: { dshVersion?: string, path?: string } = {}) {
  return parseBaseline({
    repository: 'example/upstream',
    commit: '0123456789abcdef0123456789abcdef01234567',
    dshVersion: overrides.dshVersion ?? '0.2.2-rc.1',
    modules: [{
      path: overrides.path ?? 'src/main/shell/app.ts',
      upstream: ['apps/desktop/src/main.ts'],
      divergences: []
    }],
    skipped: ['apps/desktop/src/policy-test-auth.ts']
  })
}

async function makeTemp() {
  const path = await mkdtemp(join(tmpdir(), 'upstream-baseline-'))
  temporary.push(path)
  return path
}

async function writeRepoFile(repository: string, file: string, contents: string) {
  const target = join(repository, file)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents)
}

function git(cwd: string, args: string[]) {
  return new Promise<string>((resolvePromise, reject) => {
    execFile('git', args, { cwd, encoding: 'utf8' }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(stdout)
    })
  })
}

function runNode(args: string[]) {
  return new Promise<{ code: number, stdout: string, stderr: string }>((resolvePromise, reject) => {
    execFile(process.execPath, args, { cwd: root, encoding: 'utf8' }, (error, stdout, stderr) => {
      const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'number' ? error.code : 0
      if (error && code === 0) reject(error)
      else resolvePromise({ code, stdout, stderr })
    })
  })
}

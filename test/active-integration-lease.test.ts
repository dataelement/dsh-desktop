import fs, { chmodSync, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  acquireActiveBatchLease,
  archiveActiveBatchLease,
  markActiveBatchAccepted,
  readActiveBatchLease,
  recoverActiveBatchOwnership,
  updateActiveBatchTip
} from '../scripts/lib/sherlock-active-batch.mjs'
import { resolveRepositoryContext } from '../scripts/lib/sherlock-git-state.mjs'
import { createGitWorkflowFixture, type GitWorkflowFixture } from './helpers/git-workflow-fixture'

const fixtures: GitWorkflowFixture[] = []
const sha = (character: string) => character.repeat(40)
const digest = (character: string) => character.repeat(64)

function fixture(): GitWorkflowFixture {
  const value = createGitWorkflowFixture()
  fixtures.push(value)
  return value
}

function setup(batchId = '20260831-01') {
  const repository = fixture()
  const integration = repository.createWorktree(`integration-${batchId}`, `codex/integration/${batchId}`)
  const baseMainCommit = repository.git(repository.main, 'rev-parse', 'HEAD')
  const manifestPath = `config/sherlock-integration-batches/${batchId}.json`
  repository.write(integration, manifestPath, `{"batchId":"${batchId}"}\n`)
  const currentTip = repository.commit(integration, '创建集成批次清单')
  const ownerToken = `owner-${batchId}-secret`
  const lease = {
    batchId,
    branch: `codex/integration/${batchId}`,
    manifestPath,
    baseMainCommit,
    currentTip,
    createdAt: '2026-08-31T04:00:00.000Z',
    updatedAt: '2026-08-31T04:00:00.000Z'
  }
  return { repository, integration, ownerToken, lease, manifestPath, currentTip }
}

function manifestDigest(repository: string, manifestPath: string): string {
  return createHash('sha256').update(readFileSync(path.join(repository, manifestPath))).digest('hex')
}

function acquireInWorker(options: Parameters<typeof acquireActiveBatchLease>[0]) {
  const moduleUrl = pathToFileURL(path.join(import.meta.dirname, '..', 'scripts', 'lib', 'sherlock-active-batch.mjs')).href
  const program = [
    `import { acquireActiveBatchLease } from ${JSON.stringify(moduleUrl)}`,
    `const options = ${JSON.stringify(options)}`,
    'try { process.stdout.write(JSON.stringify({ created: acquireActiveBatchLease(options).created })) } catch (error) { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }'
  ].join('\n')
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', program], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

function archiveInWorker(options: Parameters<typeof archiveActiveBatchLease>[0]) {
  const moduleUrl = pathToFileURL(path.join(import.meta.dirname, '..', 'scripts', 'lib', 'sherlock-active-batch.mjs')).href
  const program = [
    `import { archiveActiveBatchLease } from ${JSON.stringify(moduleUrl)}`,
    `const options = ${JSON.stringify(options)}`,
    'try { archiveActiveBatchLease(options); process.stdout.write("archived") } catch (error) { process.stderr.write(error instanceof Error ? error.message : String(error)); process.exitCode = 1 }'
  ].join('\n')
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--eval', program], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose()
})

describe('durable active integration lease', () => {
  it('lets exactly one common-directory racer acquire a populated active lease', async () => {
    const first = setup('20260831-01')
    const second = first.repository.createWorktree('integration-racer', 'codex/integration/20260831-02')
    const competingLease = {
      ...first.lease,
      batchId: '20260831-02',
      branch: 'codex/integration/20260831-02',
      manifestPath: 'config/sherlock-integration-batches/20260831-02.json',
      currentTip: first.repository.git(second, 'rev-parse', 'HEAD')
    }

    const [firstResult, secondResult] = await Promise.all([
      acquireInWorker({ repository: first.integration, lease: first.lease, ownerToken: first.ownerToken }),
      acquireInWorker({ repository: second, lease: competingLease, ownerToken: 'other-secret' })
    ])

    expect([firstResult.status, secondResult.status].filter((status) => status === 0), `${firstResult.stderr}\n${secondResult.stderr}`).toHaveLength(1)
    expect([firstResult.stdout, secondResult.stdout].filter((stdout) => stdout === '{"created":true}')).toHaveLength(1)
    const active = path.join(first.repository.commonDirectory, 'sherlock-integration', 'active')
    expect(readFileSync(path.join(active, 'lease.json'), 'utf8')).toMatch(/20260831-0[12]/)
  })

  it('is idempotent only for the same owner and exact lease state', () => {
    const value = setup()
    const first = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const second = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })

    expect(first.created).toBe(true)
    expect(second).toEqual({ lease: first.lease, created: false })
    expect(() => acquireActiveBatchLease({ repository: value.integration, lease: { ...value.lease, updatedAt: '2026-08-31T04:00:01.000Z' }, ownerToken: value.ownerToken })).toThrow(/不一致|匹配|租约/)
    expect(() => acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: 'wrong-owner' })).toThrow(/不匹配|不一致|owner|所有者|令牌/)
  })

  it('stores only an owner digest in common storage and keeps the raw token mode 0600 in the integration git directory', () => {
    const value = setup()
    const result = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const context = resolveRepositoryContext(value.integration)
    const ownerPath = path.join(context.gitDirectory, 'sherlock-integration-owner.json')
    const commonLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')

    expect(result.lease.ownerTokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(readFileSync(commonLeasePath, 'utf8')).not.toContain(value.ownerToken)
    expect(readFileSync(ownerPath, 'utf8')).toContain(value.ownerToken)
    expect(statSync(ownerPath).mode & 0o777).toBe(0o600)
    expect(readActiveBatchLease(value.integration)).toEqual(result.lease)
  })

  it('requires owner, revision, and exact tip for CAS updates, then invalidates acceptance after a tip change', () => {
    const value = setup()
    const acquired = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken }).lease
    const accepted = markActiveBatchAccepted({
      repository: value.integration,
      ownerToken: value.ownerToken,
      expectedRevision: acquired.revision,
      acceptedTip: value.currentTip,
      acceptedManifestDigest: manifestDigest(value.integration, value.manifestPath),
      acceptedAt: '2026-08-31T04:01:00.000Z'
    })
    value.repository.write(value.integration, 'src/after-accept.ts', 'export const afterAccept = true\n')
    const nextTip = value.repository.commit(value.integration, '验收后继续修改')

    expect(() => updateActiveBatchTip({ repository: value.integration, ownerToken: 'wrong-owner', expectedRevision: accepted.revision, expectedTip: value.currentTip, nextTip, updatedAt: '2026-08-31T04:02:00.000Z' })).toThrow(/owner|所有者|令牌/)
    expect(() => updateActiveBatchTip({ repository: value.integration, ownerToken: value.ownerToken, expectedRevision: accepted.revision - 1, expectedTip: value.currentTip, nextTip, updatedAt: '2026-08-31T04:02:00.000Z' })).toThrow(/revision|版本|过期/)
    expect(() => updateActiveBatchTip({ repository: value.integration, ownerToken: value.ownerToken, expectedRevision: accepted.revision, expectedTip: sha('f'), nextTip, updatedAt: '2026-08-31T04:02:00.000Z' })).toThrow(/tip|提交|过期/)

    const updated = updateActiveBatchTip({ repository: value.integration, ownerToken: value.ownerToken, expectedRevision: accepted.revision, expectedTip: value.currentTip, nextTip, updatedAt: '2026-08-31T04:02:00.000Z' })
    expect(updated).toMatchObject({ revision: accepted.revision + 1, currentTip: nextTip })
    expect(updated.acceptedTip).toBeUndefined()
    expect(updated.acceptedManifestDigest).toBeUndefined()
    expect(updated.acceptedAt).toBeUndefined()
  })

  it('validates owner recovery without mutating the lease when every persisted identity matches', () => {
    const value = setup()
    const acquired = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken }).lease
    const beforeRefs = value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')
    const beforeWorktrees = value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')
    const beforeStatus = value.repository.git(value.integration, 'status', '--porcelain=v1')
    const result = recoverActiveBatchOwnership({
      repository: value.integration,
      expectedBatchId: value.lease.batchId,
      expectedTip: value.currentTip,
      expectedManifestDigest: manifestDigest(value.integration, value.manifestPath)
    })

    expect(result.lease).toEqual(acquired)
    expect(result.ownerTokenFile).toBe(path.join(resolveRepositoryContext(value.integration).gitDirectory, 'sherlock-integration-owner.json'))
    expect(value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')).toBe(beforeRefs)
    expect(value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')).toBe(beforeWorktrees)
    expect(value.repository.git(value.integration, 'status', '--porcelain=v1')).toBe(beforeStatus)
  })

  it('refuses owner recovery on missing token, batch, tip, or tracked manifest mismatch while preserving the lease', () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const original = readFileSync(activePath, 'utf8')
    const options = { repository: value.integration, expectedBatchId: value.lease.batchId, expectedTip: value.currentTip, expectedManifestDigest: manifestDigest(value.integration, value.manifestPath) }
    const ownerPath = path.join(resolveRepositoryContext(value.integration).gitDirectory, 'sherlock-integration-owner.json')

    unlinkSync(ownerPath)
    expect(() => recoverActiveBatchOwnership(options)).toThrow(/token|令牌/)
    writeFileSync(ownerPath, JSON.stringify({ schemaVersion: 1, batchId: '20260831-99', ownerToken: value.ownerToken }))
    chmodSync(ownerPath, 0o600)
    expect(() => recoverActiveBatchOwnership(options)).toThrow(/不匹配|batch|批次/)
    writeFileSync(ownerPath, JSON.stringify({ schemaVersion: 1, batchId: value.lease.batchId, ownerToken: value.ownerToken }))
    chmodSync(ownerPath, 0o600)
    expect(() => recoverActiveBatchOwnership({ ...options, expectedTip: sha('e') })).toThrow(/Tip|提交/)
    expect(() => recoverActiveBatchOwnership({ ...options, expectedManifestDigest: digest('d') })).toThrow(/ManifestDigest|摘要/)
    expect(readFileSync(activePath, 'utf8')).toBe(original)
  })

  it('archives only the lease atomically and requires explicit cancellation when no valid owner is supplied', () => {
    const value = setup()
    const acquired = acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken }).lease
    const beforeRefs = value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')
    const beforeWorktrees = value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')
    const beforeStatus = value.repository.git(value.integration, 'status', '--porcelain=v1')
    const manifestContents = readFileSync(path.join(value.integration, value.manifestPath), 'utf8')

    expect(() => archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:03:00.000Z' })).toThrow(/取消|cancellation|确认/)
    expect(() => archiveActiveBatchLease({ repository: value.integration, ownerToken: 'wrong-owner', expectedBatchId: value.lease.batchId, outcome: 'promoted', archivedAt: '2026-08-31T04:03:00.000Z' })).toThrow(/owner|所有者|令牌/)
    const archived = archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:03:00.000Z', explicitCancellation: true })

    expect(archived.lease).toEqual(acquired)
    expect(archived.archivePath).toBe(path.join(value.repository.commonDirectory, 'sherlock-integration', 'history', '20260831-01-cancelled-2026-08-31T04-03-00.000Z', 'lease.json'))
    expect(existsSync(archived.archivePath)).toBe(true)
    expect(readActiveBatchLease(value.integration)).toBeNull()
    expect(value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')).toBe(beforeRefs)
    expect(value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')).toBe(beforeWorktrees)
    expect(value.repository.git(value.integration, 'status', '--porcelain=v1')).toBe(beforeStatus)
    expect(readFileSync(path.join(value.integration, value.manifestPath), 'utf8')).toBe(manifestContents)
  })

  it('allows one same-destination archive contender and preserves its lease bytes without changing Git state', async () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activeLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const leaseBytes = readFileSync(activeLeasePath)
    const beforeRefs = value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')
    const beforeWorktrees = value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')
    const beforeStatus = value.repository.git(value.integration, 'status', '--porcelain=v1')
    const options = { repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled' as const, archivedAt: '2026-08-31T04:04:00.000Z', explicitCancellation: true }
    const [first, second] = await Promise.all([archiveInWorker(options), archiveInWorker(options)])
    const archivePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'history', '20260831-01-cancelled-2026-08-31T04-04-00.000Z', 'lease.json')

    expect([first.status, second.status].filter((status) => status === 0), `${first.stderr}\n${second.stderr}`).toHaveLength(1)
    expect([first.stdout, second.stdout].filter((stdout) => stdout === 'archived')).toHaveLength(1)
    expect(readFileSync(archivePath)).toEqual(leaseBytes)
    expect(value.repository.git(value.repository.main, 'for-each-ref', '--format=%(refname) %(objectname)')).toBe(beforeRefs)
    expect(value.repository.git(value.repository.main, 'worktree', 'list', '--porcelain')).toBe(beforeWorktrees)
    expect(value.repository.git(value.integration, 'status', '--porcelain=v1')).toBe(beforeStatus)
    expect(readFileSync(path.join(value.integration, value.manifestPath), 'utf8')).toBe(`{"batchId":"20260831-01"}\n`)
  })

  it('uses the final destination rather than an obsolete adjacent claim as the archive authority', () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activeLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const leaseBytes = readFileSync(activeLeasePath)
    const claim = 'sherlock-integration/history/20260831-01-cancelled-2026-08-31T04-05-00.000Z.claim'
    value.repository.writeCommonIntegrationFile(claim, 'interrupted archive claim\n')

    const archived = archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:05:00.000Z', explicitCancellation: true })
    expect(readFileSync(archived.archivePath)).toEqual(leaseBytes)
    expect(existsSync(activeLeasePath)).toBe(false)
    expect(readFileSync(path.join(value.repository.commonDirectory, claim), 'utf8')).toBe('interrupted archive claim\n')
  })

  it('fails closed when the final archive directory or its lease file already exists', () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activeLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const leaseBytes = readFileSync(activeLeasePath)
    const archiveDirectory = 'sherlock-integration/history/20260831-01-cancelled-2026-08-31T04-06-00.000Z'
    value.repository.writeCommonIntegrationFile(`${archiveDirectory}/lease.json`, 'preexisting final lease\n')

    expect(() => archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:06:00.000Z', explicitCancellation: true })).toThrow(/归档|存在|覆盖/)
    expect(readFileSync(activeLeasePath)).toEqual(leaseBytes)
    expect(readFileSync(path.join(value.repository.commonDirectory, archiveDirectory, 'lease.json'), 'utf8')).toBe('preexisting final lease\n')
  })

  it('does not replace a preexisting empty final archive directory', () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activeLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const leaseBytes = readFileSync(activeLeasePath)
    const archiveDirectory = path.join(value.repository.commonDirectory, 'sherlock-integration', 'history', '20260831-01-cancelled-2026-08-31T04-08-00.000Z')
    mkdirSync(archiveDirectory, { recursive: true })

    expect(() => archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:08:00.000Z', explicitCancellation: true })).toThrow(/归档|存在|覆盖/)
    expect(readFileSync(activeLeasePath)).toEqual(leaseBytes)
    expect(existsSync(archiveDirectory)).toBe(true)
    expect(existsSync(path.join(archiveDirectory, 'lease.json'))).toBe(false)
  })

  it('preserves active lease bytes and leaves a reserved final directory when publication fails', () => {
    const value = setup()
    acquireActiveBatchLease({ repository: value.integration, lease: value.lease, ownerToken: value.ownerToken })
    const activeLeasePath = path.join(value.repository.commonDirectory, 'sherlock-integration', 'active', 'lease.json')
    const leaseBytes = readFileSync(activeLeasePath)
    const archiveDirectory = path.join(value.repository.commonDirectory, 'sherlock-integration', 'history', '20260831-01-cancelled-2026-08-31T04-07-00.000Z')
    const originalLink = fs.linkSync
    fs.linkSync = () => { throw new Error('controlled link publication failure') }
    syncBuiltinESMExports()
    try {
      expect(() => archiveActiveBatchLease({ repository: value.integration, expectedBatchId: value.lease.batchId, outcome: 'cancelled', archivedAt: '2026-08-31T04:07:00.000Z', explicitCancellation: true })).toThrow(/发布失败|恢复/)
    } finally {
      fs.linkSync = originalLink
      syncBuiltinESMExports()
    }

    expect(readFileSync(activeLeasePath)).toEqual(leaseBytes)
    expect(existsSync(archiveDirectory)).toBe(true)
    expect(existsSync(path.join(archiveDirectory, 'lease.json'))).toBe(false)
  })
})

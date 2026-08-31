import { createHash, randomBytes } from 'node:crypto'
import {
  closeSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import { resolveRepositoryContext, runGit } from './sherlock-git-state.mjs'

const fullSha = /^[0-9a-f]{40}$/
const sha256 = /^[0-9a-f]{64}$/
const batchId = /^\d{8}-\d{2}$/

function fail(message) {
  throw new Error(`活动集成租约无效：${message}`)
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} 必须是对象。`)
  return value
}

function exactKeys(value, label, keys) {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail(`${label} 包含未知字段 ${key}。`)
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} 必须是非空字符串。`)
  return value
}

function commit(value, label) {
  if (typeof value !== 'string' || !fullSha.test(value)) fail(`${label} 必须是 40 位小写提交 SHA。`)
  return value
}

function digest(value, label) {
  if (typeof value !== 'string' || !sha256.test(value)) fail(`${label} 必须是 64 位小写 SHA-256 摘要。`)
  return value
}

function timestamp(value, label) {
  const text = nonEmptyString(value, label)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== text) fail(`${label} 必须是规范 ISO 时间。`)
  return text
}

function canonicalManifestPath(batch) {
  return `config/sherlock-integration-batches/${batch}.json`
}

function branchFor(batch) {
  return `codex/integration/${batch}`
}

function tokenHash(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function validateLease(value) {
  const lease = object(value, 'lease')
  exactKeys(lease, 'lease', [
    'schemaVersion', 'revision', 'batchId', 'branch', 'manifestPath', 'baseMainCommit', 'currentTip',
    'ownerTokenHash', 'createdAt', 'updatedAt', 'acceptedTip', 'acceptedManifestDigest', 'acceptedAt'
  ])
  if (lease.schemaVersion !== 1) fail('schemaVersion 必须为 1。')
  if (!Number.isSafeInteger(lease.revision) || lease.revision < 1) fail('revision 必须是正整数。')
  const parsedBatch = nonEmptyString(lease.batchId, 'batchId')
  if (!batchId.test(parsedBatch)) fail('batchId 必须匹配 YYYYMMDD-NN。')
  if (lease.branch !== branchFor(parsedBatch)) fail('branch 必须精确派生自 batchId。')
  if (lease.manifestPath !== canonicalManifestPath(parsedBatch)) fail('manifestPath 必须是批次的精确受跟踪路径。')
  const acceptedFields = [lease.acceptedTip, lease.acceptedManifestDigest, lease.acceptedAt]
  if (acceptedFields.some((field) => field !== undefined) && acceptedFields.some((field) => field === undefined)) {
    fail('验收字段必须全部存在或全部缺失。')
  }
  const parsed = {
    schemaVersion: 1,
    revision: lease.revision,
    batchId: parsedBatch,
    branch: lease.branch,
    manifestPath: lease.manifestPath,
    baseMainCommit: commit(lease.baseMainCommit, 'baseMainCommit'),
    currentTip: commit(lease.currentTip, 'currentTip'),
    ownerTokenHash: digest(lease.ownerTokenHash, 'ownerTokenHash'),
    createdAt: timestamp(lease.createdAt, 'createdAt'),
    updatedAt: timestamp(lease.updatedAt, 'updatedAt')
  }
  if (lease.acceptedTip !== undefined) {
    parsed.acceptedTip = commit(lease.acceptedTip, 'acceptedTip')
    parsed.acceptedManifestDigest = digest(lease.acceptedManifestDigest, 'acceptedManifestDigest')
    parsed.acceptedAt = timestamp(lease.acceptedAt, 'acceptedAt')
  }
  return parsed
}

function validateLeaseDraft(value, ownerToken) {
  const draft = object(value, 'lease')
  exactKeys(draft, 'lease', [
    'batchId', 'branch', 'manifestPath', 'baseMainCommit', 'currentTip', 'createdAt', 'updatedAt',
    'acceptedTip', 'acceptedManifestDigest', 'acceptedAt'
  ])
  return validateLease({ ...draft, schemaVersion: 1, revision: 1, ownerTokenHash: tokenHash(validateOwnerToken(ownerToken)) })
}

function validateOwnerToken(value) {
  const token = nonEmptyString(value, 'ownerToken')
  if (token.includes('\0')) fail('ownerToken 不能包含 NUL 字符。')
  return token
}

function leaseLocations(repository) {
  const context = resolveRepositoryContext(repository)
  const root = path.join(context.commonDirectory, 'sherlock-integration')
  return {
    context,
    root,
    active: path.join(root, 'active'),
    leaseFile: path.join(root, 'active', 'lease.json'),
    lockFile: path.join(root, '.active-mutation-lock'),
    ownerFile: path.join(context.gitDirectory, 'sherlock-integration-owner.json')
  }
}

function readLeaseFile(leaseFile) {
  if (!existsSync(leaseFile)) return null
  try {
    return validateLease(JSON.parse(readFileSync(leaseFile, 'utf8')))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('活动集成租约无效：')) throw error
    fail(`lease.json 不是有效 JSON。`)
  }
}

function assertRepositoryAtLease(repository, lease) {
  const context = resolveRepositoryContext(repository)
  if (!context.branch || context.branch !== lease.branch) fail('当前 worktree 必须保持连接到租约分支。')
  if (context.head !== lease.currentTip) fail('当前 HEAD 必须精确等于租约 currentTip。')
  return context
}

function assertCommitExists(repository, value, label) {
  const resolved = runGit(repository, ['rev-parse', '--verify', `${value}^{commit}`]).stdout.trim()
  if (resolved !== value) fail(`${label} 必须解析为精确提交。`)
}

function assertTrackedManifest(repository, lease) {
  runGit(repository, ['ls-files', '--error-unmatch', '--', lease.manifestPath])
  const manifestFile = path.join(resolveRepositoryContext(repository).worktreeRoot, lease.manifestPath)
  if (!existsSync(manifestFile) || !statSync(manifestFile).isFile()) fail('manifestPath 必须指向当前 worktree 的受跟踪普通文件。')
  return manifestFile
}

function currentManifestDigest(repository, lease) {
  return createHash('sha256').update(readFileSync(assertTrackedManifest(repository, lease))).digest('hex')
}

function ownerRecord(ownerFile) {
  if (!existsSync(ownerFile)) fail('owner token 文件不存在。')
  if ((statSync(ownerFile).mode & 0o777) !== 0o600) fail('owner token 文件权限必须为 0600。')
  let value
  try {
    value = JSON.parse(readFileSync(ownerFile, 'utf8'))
  } catch {
    fail('owner token 文件不是有效 JSON。')
  }
  const record = object(value, 'owner token 文件')
  exactKeys(record, 'owner token 文件', ['schemaVersion', 'batchId', 'ownerToken'])
  if (record.schemaVersion !== 1) fail('owner token 文件 schemaVersion 必须为 1。')
  if (!batchId.test(record.batchId)) fail('owner token 文件 batchId 无效。')
  return { batchId: record.batchId, ownerToken: validateOwnerToken(record.ownerToken) }
}

function assertOwner(ownerFile, lease, token) {
  const provided = validateOwnerToken(token)
  if (tokenHash(provided) !== lease.ownerTokenHash) fail('owner token 不匹配。')
  const persisted = ownerRecord(ownerFile)
  if (persisted.batchId !== lease.batchId || tokenHash(persisted.ownerToken) !== lease.ownerTokenHash) {
    fail('持久 owner token 与租约不匹配。')
  }
}

function createOwnerRecord(ownerFile, lease, token) {
  if (existsSync(ownerFile)) {
    assertOwner(ownerFile, lease, token)
    return
  }
  const descriptor = openSync(ownerFile, 'wx', 0o600)
  try {
    writeFileSync(descriptor, `${JSON.stringify({ schemaVersion: 1, batchId: lease.batchId, ownerToken: token })}\n`, 'utf8')
  } finally {
    closeSync(descriptor)
  }
  if ((statSync(ownerFile).mode & 0o777) !== 0o600) fail('owner token 文件权限必须为 0600。')
}

function withMutationLock(locations, operation) {
  mkdirSync(locations.root, { recursive: true })
  let descriptor
  try {
    descriptor = openSync(locations.lockFile, 'wx', 0o600)
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') fail('另一个租约操作正在进行。')
    throw error
  }
  closeSync(descriptor)
  try {
    return operation()
  } finally {
    if (existsSync(locations.lockFile)) unlinkSync(locations.lockFile)
  }
}

function atomicWrite(file, value) {
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`
  const descriptor = openSync(temporary, 'wx', 0o600)
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  } finally {
    closeSync(descriptor)
  }
  renameSync(temporary, file)
}

function sameLease(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function replaceLease(locations, current, next) {
  const live = readLeaseFile(locations.leaseFile)
  if (!live || !sameLease(live, current)) fail('租约在 compare-and-swap 前已变化。')
  atomicWrite(locations.leaseFile, next)
}

function reserveArchiveDestination(archiveDirectory) {
  try {
    mkdirSync(archiveDirectory, { mode: 0o700 })
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      fail('目标归档目录已存在，拒绝覆盖。')
    }
    throw error
  }
}

export function readActiveBatchLease(repository) {
  return readLeaseFile(leaseLocations(repository).leaseFile)
}

export function acquireActiveBatchLease({ repository, lease, ownerToken }) {
  const candidate = validateLeaseDraft(lease, ownerToken)
  assertCommitExists(repository, candidate.baseMainCommit, 'baseMainCommit')
  assertRepositoryAtLease(repository, candidate)
  const locations = leaseLocations(repository)
  return withMutationLock(locations, () => {
    const current = readLeaseFile(locations.leaseFile)
    if (current) {
      if (!sameLease(current, candidate)) fail('已有活动租约与请求状态不一致。')
      assertOwner(locations.ownerFile, current, ownerToken)
      return { lease: current, created: false }
    }
    if (existsSync(locations.active)) fail('活动租约目录已存在，拒绝覆盖。')
    createOwnerRecord(locations.ownerFile, candidate, validateOwnerToken(ownerToken))
    const staging = path.join(locations.root, `.active-staging-${process.pid}-${randomBytes(8).toString('hex')}`)
    mkdirSync(staging, { mode: 0o700 })
    atomicWrite(path.join(staging, 'lease.json'), candidate)
    try {
      if (existsSync(locations.active)) fail('活动租约目录已存在，拒绝覆盖。')
      renameSync(staging, locations.active)
    } catch (error) {
      if (existsSync(staging)) {
        try { unlinkSync(path.join(staging, 'lease.json')) } catch {}
        try { rmdirSync(staging) } catch {}
      }
      if (error instanceof Error && error.message.startsWith('活动集成租约无效：')) throw error
      fail('活动租约已被其他 worktree 创建。')
    }
    return { lease: candidate, created: true }
  })
}

export function updateActiveBatchTip({ repository, ownerToken, expectedRevision, expectedTip, nextTip, updatedAt }) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail('expectedRevision 必须是正整数。')
  commit(expectedTip, 'expectedTip')
  commit(nextTip, 'nextTip')
  timestamp(updatedAt, 'updatedAt')
  const locations = leaseLocations(repository)
  return withMutationLock(locations, () => {
    const current = readLeaseFile(locations.leaseFile)
    if (!current) fail('不存在活动租约。')
    assertOwner(locations.ownerFile, current, ownerToken)
    if (current.revision !== expectedRevision) fail('租约 revision 已过期。')
    if (current.currentTip !== expectedTip) fail('租约 currentTip 已过期。')
    const context = resolveRepositoryContext(repository)
    if (!context.branch || context.branch !== current.branch || context.head !== nextTip) fail('当前分支和 HEAD 必须精确等于 nextTip。')
    assertCommitExists(repository, nextTip, 'nextTip')
    const next = validateLease({
      ...current,
      revision: current.revision + 1,
      currentTip: nextTip,
      updatedAt,
      acceptedTip: undefined,
      acceptedManifestDigest: undefined,
      acceptedAt: undefined
    })
    replaceLease(locations, current, next)
    return next
  })
}

export function markActiveBatchAccepted({ repository, ownerToken, expectedRevision, acceptedTip, acceptedManifestDigest, acceptedAt }) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail('expectedRevision 必须是正整数。')
  commit(acceptedTip, 'acceptedTip')
  digest(acceptedManifestDigest, 'acceptedManifestDigest')
  timestamp(acceptedAt, 'acceptedAt')
  const locations = leaseLocations(repository)
  return withMutationLock(locations, () => {
    const current = readLeaseFile(locations.leaseFile)
    if (!current) fail('不存在活动租约。')
    assertOwner(locations.ownerFile, current, ownerToken)
    if (current.revision !== expectedRevision) fail('租约 revision 已过期。')
    assertRepositoryAtLease(repository, current)
    if (acceptedTip !== current.currentTip) fail('acceptedTip 必须精确等于 currentTip。')
    if (currentManifestDigest(repository, current) !== acceptedManifestDigest) fail('acceptedManifestDigest 与当前受跟踪清单不匹配。')
    const next = validateLease({
      ...current,
      revision: current.revision + 1,
      updatedAt: acceptedAt,
      acceptedTip,
      acceptedManifestDigest,
      acceptedAt
    })
    replaceLease(locations, current, next)
    return next
  })
}

export function recoverActiveBatchOwnership({ repository, expectedBatchId, expectedTip, expectedManifestDigest }) {
  if (typeof expectedBatchId !== 'string' || !batchId.test(expectedBatchId)) fail('expectedBatchId 必须匹配 YYYYMMDD-NN。')
  commit(expectedTip, 'expectedTip')
  digest(expectedManifestDigest, 'expectedManifestDigest')
  const locations = leaseLocations(repository)
  const lease = readLeaseFile(locations.leaseFile)
  if (!lease) fail('不存在活动租约。')
  if (lease.batchId !== expectedBatchId) fail('expectedBatchId 与租约不匹配。')
  if (lease.currentTip !== expectedTip) fail('expectedTip 与租约不匹配。')
  assertRepositoryAtLease(repository, lease)
  const persisted = ownerRecord(locations.ownerFile)
  if (persisted.batchId !== lease.batchId || tokenHash(persisted.ownerToken) !== lease.ownerTokenHash) fail('持久 owner token 与租约不匹配。')
  if (currentManifestDigest(repository, lease) !== expectedManifestDigest) fail('expectedManifestDigest 与当前受跟踪清单不匹配。')
  return { lease, ownerTokenFile: locations.ownerFile }
}

export function archiveActiveBatchLease({ repository, ownerToken, expectedBatchId, outcome, archivedAt, explicitCancellation = false }) {
  if (typeof expectedBatchId !== 'string' || !batchId.test(expectedBatchId)) fail('expectedBatchId 必须匹配 YYYYMMDD-NN。')
  if (outcome !== 'promoted' && outcome !== 'cancelled') fail('outcome 必须为 promoted 或 cancelled。')
  timestamp(archivedAt, 'archivedAt')
  if (outcome === 'cancelled' && ownerToken === undefined && explicitCancellation !== true) {
    fail('无 owner token 的取消必须明确确认。')
  }
  const locations = leaseLocations(repository)
  return withMutationLock(locations, () => {
    const lease = readLeaseFile(locations.leaseFile)
    if (!lease) fail('不存在活动租约。')
    if (lease.batchId !== expectedBatchId) fail('expectedBatchId 与租约不匹配。')
    assertRepositoryAtLease(repository, lease)
    if (outcome === 'promoted' && ownerToken === undefined) fail('promoted 必须提供有效 owner token。')
    if (ownerToken !== undefined) assertOwner(locations.ownerFile, lease, ownerToken)
    const directoryTimestamp = archivedAt.replaceAll(':', '-')
    const archiveDirectory = path.join(locations.root, 'history', `${lease.batchId}-${outcome}-${directoryTimestamp}`)
    const archivePath = path.join(archiveDirectory, 'lease.json')
    mkdirSync(path.dirname(archiveDirectory), { recursive: true })
    reserveArchiveDestination(archiveDirectory)
    try {
      linkSync(locations.leaseFile, archivePath)
    } catch {
      fail('归档 lease 发布失败；已保留活动租约和目标目录以便恢复。')
    }
    try {
      unlinkSync(locations.leaseFile)
      rmdirSync(locations.active)
    } catch {
      fail('归档 lease 已发布但 active 清理未完成；请显式恢复。')
    }
    return { lease, archivePath }
  })
}

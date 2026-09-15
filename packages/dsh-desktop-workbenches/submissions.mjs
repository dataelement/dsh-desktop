import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { StateError } from './state.mjs'

export const MAX_SUBMISSION_BYTES = 12 * 1024 * 1024
export const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
export const MAX_PACKAGE_BYTES = 8 * 1024 * 1024
const MAX_STORED_BYTES = 32 * 1024 * 1024
const LIMITS = { title: 100, description: 2000, author: 80 }
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const fail = message => { throw new StateError(message) }

function textField(payload, name) {
  const value = payload[name]
  if (typeof value !== 'string') fail(`${name} is required.`)
  const normalized = value.trim()
  if (!normalized) fail(`${name} is required.`)
  if (normalized.length > LIMITS[name]) fail(`${name} is too long.`)
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(normalized)) fail(`${name} contains invalid characters.`)
  return normalized
}

export function normalizeGitHubRepository(value) {
  if (typeof value !== 'string' || value.length > 500) fail('A GitHub HTTPS repository URL is required.')
  let url
  try { url = new URL(value.trim()) } catch { fail('A valid GitHub HTTPS repository URL is required.') }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.port || url.username || url.password
    || url.search || url.hash) fail('Repository must be a GitHub HTTPS URL.')
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2) fail('Repository must identify one GitHub repository.')
  let [owner, repository] = parts
  repository = repository.replace(/\.git$/i, '')
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner)
    || !/^[A-Za-z0-9._-]{1,100}$/.test(repository) || repository === '.' || repository === '..') {
    fail('Repository contains an invalid GitHub owner or repository name.')
  }
  return `https://github.com/${owner}/${repository}`
}

function validSignature(type, bytes) {
  if (type === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (type === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
  if (type === 'image/webp') return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  return false
}

export function validateScreenshot(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') fail('Screenshot must be a PNG, JPEG, or WebP data URL.')
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) fail('Screenshot must be a PNG, JPEG, or WebP data URL.')
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > MAX_SCREENSHOT_BYTES) throw new StateError('Screenshot is too large.', 413)
  if (bytes.toString('base64') !== match[2] || !validSignature(match[1], bytes)) fail('Screenshot content does not match its image type.')
  return value
}

function validatePackage(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') fail('Package must be a gzip tarball data URL.')
  const match = /^data:application\/(?:gzip|x-gzip);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[1].length % 4 !== 0) fail('Package must be a gzip tarball data URL.')
  const bytes = Buffer.from(match[1], 'base64')
  if (!bytes.length || bytes.length > MAX_PACKAGE_BYTES) throw new StateError('Workbench package is too large.', 413)
  if (bytes.toString('base64') !== match[1] || bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 0x08) fail('Invalid gzip package.')
  try {
    const tar = gunzipSync(bytes, { maxOutputLength: 64 * 1024 * 1024 })
    if (tar.length < 1024 || tar.toString('ascii', 257, 262) !== 'ustar') fail('Package must contain a tar archive.')
  } catch (error) { if (error instanceof StateError) throw error; fail('Invalid or oversized gzip tarball.') }
  return bytes
}

export function validateSubmission(value) {
  if (!isObject(value)) fail('A JSON submission is required.')
  const allowed = new Set(['title', 'description', 'author', 'repository', 'screenshot', 'package'])
  if (Object.keys(value).some(key => !allowed.has(key))) fail('Unknown submission field.')
  const repository = value.repository == null || value.repository === '' ? null : normalizeGitHubRepository(value.repository)
  const packageBytes = validatePackage(value.package)
  if (!repository && !packageBytes) fail('A workbench package or GitHub repository is required.')
  return {
    title: textField(value, 'title'),
    description: textField(value, 'description'),
    author: textField(value, 'author'),
    repository,
    screenshot: validateScreenshot(value.screenshot),
    packageBytes
  }
}

function validateStored(value) {
  if (!isObject(value) || value.version !== 1 || Object.keys(value).some(key => !['version', 'submissions'].includes(key))
    || !Array.isArray(value.submissions)) throw new Error('Invalid submissions')
  for (const entry of value.submissions) {
    if (!isObject(entry) || Object.keys(entry).some(key => !['id', 'title', 'description', 'author', 'repository', 'screenshot', 'packageSha256', 'packageBytes', 'status', 'createdAt'].includes(key))
      || typeof entry.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id)
      || typeof entry.createdAt !== 'string' || Number.isNaN(Date.parse(entry.createdAt))
      || new Date(entry.createdAt).toISOString() !== entry.createdAt || entry.status !== 'pending') throw new Error('Invalid submission')
    const checked = {
      title: textField(entry, 'title'), description: textField(entry, 'description'), author: textField(entry, 'author'),
      repository: entry.repository == null ? null : normalizeGitHubRepository(entry.repository), screenshot: validateScreenshot(entry.screenshot)
    }
    if (entry.packageSha256 != null && (!/^[a-f0-9]{64}$/.test(entry.packageSha256) || !Number.isInteger(entry.packageBytes) || entry.packageBytes < 1 || entry.packageBytes > MAX_PACKAGE_BYTES)) throw new Error('Invalid package metadata')
    if (!checked.repository && !entry.packageSha256) throw new Error('Missing submission source')
    if (checked.title !== entry.title || checked.description !== entry.description || checked.author !== entry.author
      || checked.repository !== entry.repository || checked.screenshot !== entry.screenshot) throw new Error('Invalid submission')
  }
  const repositories = value.submissions.filter(entry => entry.repository).map(entry => entry.repository.toLowerCase())
  if (new Set(repositories).size !== repositories.length) throw new Error('Duplicate submissions')
  return structuredClone(value)
}

export function createSubmissionStore(root) {
  const path = join(root, 'submissions.json')
  let pending = Promise.resolve()
  const queue = operation => {
    const result = pending.then(operation)
    pending = result.catch(() => {})
    return result
  }
  async function readFileState() {
    try {
      const raw = await readFile(path)
      if (raw.length > MAX_STORED_BYTES) throw new Error('Stored submissions exceed size limit')
      const state = validateStored(JSON.parse(raw.toString('utf8')))
      for (const entry of state.submissions) if (entry.packageSha256) {
        const bytes = await readFile(join(root, `${entry.id}.tgz`))
        if (bytes.length !== entry.packageBytes || createHash('sha256').update(bytes).digest('hex') !== entry.packageSha256) throw new Error('Invalid stored package')
      }
      return state
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, submissions: [] }
      if (error instanceof StateError) throw error
      throw new StateError('Stored workbench submissions are invalid. Restore or repair submissions.json.', 500)
    }
  }
  return {
    read: () => queue(async () => (await readFileState()).submissions),
    create: input => {
      const submission = validateSubmission(structuredClone(input))
      return queue(async () => {
        const current = await readFileState()
        if (submission.repository && current.submissions.some(item => item.repository?.toLowerCase() === submission.repository.toLowerCase())) {
          throw new StateError('This GitHub repository has already been submitted.', 409)
        }
        const { packageBytes, ...fields } = submission
        const saved = { id: randomUUID(), ...fields,
          ...(packageBytes ? { packageSha256: createHash('sha256').update(packageBytes).digest('hex'), packageBytes: packageBytes.length } : {}),
          status: 'pending', createdAt: new Date().toISOString() }
        const next = { version: 1, submissions: [...current.submissions, saved] }
        const encoded = JSON.stringify(next)
        if (Buffer.byteLength(encoded) > MAX_STORED_BYTES) throw new StateError('Workbench submission storage is full.', 507)
        await mkdir(root, { recursive: true })
        const temporary = join(root, `.submissions-${randomUUID()}.tmp`)
        const packageTemporary = packageBytes ? join(root, `.package-${randomUUID()}.tmp`) : null
        try {
          if (packageBytes) {
            await writeFile(packageTemporary, packageBytes, { flag: 'wx', mode: 0o600 })
            await rename(packageTemporary, join(root, `${saved.id}.tgz`))
          }
          await writeFile(temporary, encoded, { flag: 'wx', mode: 0o600 })
          await rename(temporary, path)
        } catch (error) {
          if (packageBytes) await rm(join(root, `${saved.id}.tgz`), { force: true })
          throw error
        } finally { await rm(temporary, { force: true }); if (packageTemporary) await rm(packageTemporary, { force: true }) }
        return structuredClone(saved)
      })
    }
  }
}

/**
 * GitHub Gist transport for profile backups — the third backup channel next
 * to the local download and WebDAV (issue #89).
 *
 * Security posture:
 * - The API host is hard-coded to api.github.com, so there is no SSRF surface
 *   (unlike WebDAV, which accepts arbitrary user URLs).
 * - The Gist id is validated against a strict character allowlist before it
 *   is interpolated into the request path.
 * - Tokens are never persisted: the client sends one per request (session
 *   memory only) or the operator sets DSH_GITHUB_TOKEN on the host; nothing
 *   is written to disk by this module.
 * - Downloaded content goes through `validatedBackup` before it is returned,
 *   mirroring downloadWebdav's strict restore-side validation.
 *
 * Timeouts and errors:
 * - Every request carries an AbortSignal: the caller's (route-level timeout,
 *   so a wedged gh CLI or slow network yields a definite answer) merged with
 *   a 30 s hard ceiling. Errors are classified into machine-readable codes
 *   (`GistError`) so the UI can show friendly localized messages instead of
 *   raw DOMException/network noise like "TimeoutError: signal timed out".
 */
import { spawn } from 'node:child_process'
import { request as httpsRequest } from 'node:https'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { MAX_BACKUP_BYTES, validatedBackup, type ProfileBackup } from './backup.ts'

/** The single file every dshmarket backup Gist carries. */
export const GIST_FILENAME = 'dsh-profile-backup.json'

/** GitHub hard limit for one Gist file (1 MB); enforced before upload. */
export const GIST_MAX_BYTES = 1024 * 1024

/** Environment variable for a host-configured token (never read from disk). */
export const GIST_TOKEN_ENV = 'DSH_GITHUB_TOKEN'

const GIST_API_HOST = 'api.github.com'
const GIST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const REQUEST_TIMEOUT_MS = 30_000

/** Node network error codes that mean "GitHub is unreachable". */
const NETWORK_ERROR_CODES = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
  'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH', 'ECONNABORTED',
])

/** Machine-readable error codes the client maps to localized messages. */
export type GistErrorCode = 'auth' | 'notfound' | 'rate-limit' | 'invalid' | 'timeout' | 'network' | 'other'

/** Error with a code for the UI; the message stays human-readable. */
export class GistError extends Error {
  readonly code: GistErrorCode
  constructor(message: string, code: GistErrorCode = 'other') {
    super(message)
    this.name = 'GistError'
    this.code = code
  }
}

/** Classify any thrown value into a stable GistErrorCode. */
export function gistErrorCode(error: unknown): GistErrorCode {
  if (error instanceof GistError) return error.code
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'timeout'
    const raw = (error as { code?: unknown }).code ?? (error as { cause?: { code?: unknown } }).cause?.code
    if (typeof raw === 'string' && NETWORK_ERROR_CODES.has(raw)) return 'network'
  }
  return 'other'
}

export interface GistRef {
  id: string
  htmlUrl: string
}

/** Where the token used for a request came from (shown in the UI). */
export type GistTokenSource = 'token' | 'env' | 'gh'

/**
 * Normalize a Gist id or a gist.github.com URL to a bare id.
 * Anything else (paths, embedded slashes, oversize input) is rejected.
 */
export function parseGistId(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new Error('gist id is required')
  let candidate = trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'https:' && (url.hostname === 'gist.github.com' || url.hostname.endsWith('.gist.github.com'))) {
      const parts = url.pathname.split('/').filter(Boolean)
      candidate = parts[parts.length - 1] ?? ''
    }
  } catch {
    // Not a URL — treat the raw input as the candidate; the allowlist decides.
  }
  if (!GIST_ID_RE.test(candidate)) throw new Error('invalid gist id')
  return candidate
}

/**
 * Resolve the token for one request, in order of preference:
 * 1. an explicitly supplied token (session memory only);
 * 2. the host-configured DSH_GITHUB_TOKEN environment variable;
 * 3. an already-logged-in GitHub CLI (`gh auth token`) — the token is used
 *    for this request only and never written to disk.
 */
export async function resolveGistTokenSource(bodyToken: unknown): Promise<{ token: string; source: GistTokenSource }> {
  if (typeof bodyToken === 'string' && bodyToken.trim() !== '') return { token: bodyToken.trim(), source: 'token' }
  const configured = process.env[GIST_TOKEN_ENV]
  if (typeof configured === 'string' && configured.trim() !== '') return { token: configured.trim(), source: 'env' }
  const ghToken = await ghAuthToken()
  if (ghToken !== null) return { token: ghToken, source: 'gh' }
  throw new GistError(
    'GitHub token is required (enter it in the Backup tab, set DSH_GITHUB_TOKEN, or log in with the gh CLI)',
    'auth',
  )
}

/** Resolve just the token (kept for callers that do not need the source). */
export async function resolveGistToken(bodyToken: unknown): Promise<string> {
  return (await resolveGistTokenSource(bodyToken)).token
}

/** Short-lived in-memory cache for the gh-derived token (no disk, no browser). */
let ghTokenCache: { token: string | null; expires: number } | null = null

/** Test hook: drop the gh token cache between tests. */
export function resetGhTokenCache(): void {
  ghTokenCache = null
}

/** Ask an already-authenticated GitHub CLI for its token, if available. */
async function ghAuthToken(): Promise<string | null> {
  if (ghTokenCache !== null && Date.now() < ghTokenCache.expires) return ghTokenCache.token
  const token = await fetchGhToken()
  // Positive cache 10 min; negative cache 30 s so a wedged gh cannot make
  // every click wait.
  ghTokenCache = { token, expires: Date.now() + (token !== null ? 10 * 60_000 : 30_000) }
  return token
}

/**
 * Run `gh auth token` in a DETACHED child and give up after 8 s no matter
 * what. The parent never waits on the child (unref), so even if gh.exe
 * wedges under WSL interop the host event loop stays free and the request
 * returns a definite answer. 8 s because a Windows gh.exe cold start through
 * WSL interop is routinely slower than a native binary.
 */
function fetchGhToken(): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const candidates = ['gh', join(homedir(), '.local', 'bin', 'gh')]
    let settled = false
    const finish = (value: string | null): void => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const tryNext = (index: number): void => {
      if (index >= candidates.length) {
        finish(null)
        return
      }
      const command = candidates[index]!
      let child: ReturnType<typeof spawn> | null = null
      try {
        child = spawn(command, ['auth', 'token'], {
          stdio: ['ignore', 'pipe', 'ignore'],
          detached: true,
          windowsHide: true,
        })
      } catch {
        tryNext(index + 1)
        return
      }
      // Defensive: a mocked/odd spawn can return nullish — never crash on it.
      if (child == null) {
        tryNext(index + 1)
        return
      }
      let out = ''
      child.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString() })
      const timer = setTimeout(() => {
        // Parent gives up; the detached child may keep running as an orphan
        // but cannot block this process or its event loop.
        try { child?.kill('SIGKILL') } catch { /* already gone */ }
        finish(out.trim() !== '' ? out.trim() : null)
      }, 8_000)
      // On spawn failure (e.g. ENOENT) Node emits 'error' AND THEN 'close'
      // (code -2). The 'close' handler must not resolve from an errored
      // child: when 'gh' is missing from PATH (typical for systemd services)
      // that premature finish(null) would race ahead of the next candidate's
      // successful token and lock the result to null.
      let errored = false
      child.on('error', () => {
        if (errored) return
        errored = true
        clearTimeout(timer)
        if (!settled) tryNext(index + 1)
      })
      child.on('close', () => {
        if (errored) return // companion of 'error' — the next candidate owns the result
        clearTimeout(timer)
        finish(out.trim() !== '' ? out.trim() : null)
      })
      child.unref()
    }
    tryNext(0)
  })
}

interface GistResponse {
  status: number
  body: string
}

/** Map a request-level failure (abort or network error) to a GistError. */
function classifyRequestError(error: unknown): Error {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new GistError('GitHub request timed out', 'timeout')
  }
  const raw = (error as { code?: unknown } | null)?.code ?? (error as { cause?: { code?: unknown } } | null)?.cause?.code
  if (typeof raw === 'string' && NETWORK_ERROR_CODES.has(raw)) {
    return new GistError(`GitHub is unreachable (${raw})`, 'network')
  }
  return error instanceof Error ? error : new GistError(String(error), 'other')
}

function gistRequest(token: string, method: 'GET' | 'POST' | 'PATCH', path: string, body?: string, signal?: AbortSignal): Promise<GistResponse> {
  return new Promise<GistResponse>((resolve, reject) => {
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      'user-agent': 'dshmarket',
      accept: 'application/vnd.github+json',
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json'
      headers['content-length'] = String(Buffer.byteLength(body))
    }
    // Route-level signal (when given) wins; the 30 s ceiling still applies
    // as a hard fallback so a forgotten signal can never hang the server.
    const hardCeiling = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const effectiveSignal = signal !== undefined ? AbortSignal.any([signal, hardCeiling]) : hardCeiling
    const request = httpsRequest({
      protocol: 'https:',
      hostname: GIST_API_HOST,
      path,
      method,
      headers,
      signal: effectiveSignal,
    }, (response) => {
      const chunks: Buffer[] = []
      let size = 0
      // GET returns the whole Gist including metadata; POST/PATCH return the
      // created/updated Gist object, which ECHOES the file content back — so
      // a large backup makes the response as large as the upload. Cap all
      // methods alike so a hostile Gist cannot OOM us.
      const maxBytes = MAX_BACKUP_BYTES + 16 * 1024
      response.once('error', reject)
      const declared = Number(response.headers['content-length'])
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy(new Error('GitHub response is too large'))
        return
      }
      response.on('data', (chunk: Buffer | string) => {
        const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += value.byteLength
        if (size > maxBytes) {
          response.destroy(new Error('GitHub response is too large'))
          return
        }
        chunks.push(value)
      })
      response.once('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    request.once('error', (error) => reject(classifyRequestError(error)))
    if (body !== undefined) request.end(body)
    else request.end()
  })
}

function parseGistError(status: number, body: string, action: string): Error {
  let message = body
  try {
    const parsed = JSON.parse(body) as { message?: unknown }
    if (typeof parsed.message === 'string' && parsed.message !== '') message = parsed.message
  } catch { /* keep the raw body */ }
  if (status === 401) return new GistError('GitHub token is invalid or revoked', 'auth')
  if (status === 403) return new GistError(`GitHub rejected the ${action} (rate limit or insufficient scope): ${message}`, 'rate-limit')
  if (status === 404) return new GistError('Gist not found (check the id/URL)', 'notfound')
  if (status === 422) return new GistError(`GitHub rejected the ${action}: ${message}`, 'invalid')
  return new GistError(`GitHub ${action} failed: HTTP ${status} ${message}`, 'other')
}

async function sendGistRequest(token: string, method: 'GET' | 'POST' | 'PATCH', path: string, body: string | undefined, action: string, signal?: AbortSignal): Promise<GistResponse> {
  const response = await gistRequest(token, method, path, body, signal)
  const ok = method === 'POST' ? response.status === 201 : response.status === 200
  if (!ok) throw parseGistError(response.status, response.body, action)
  return response
}

/** Create a new private Gist carrying one backup file. */
export async function createGist(token: string, content: string, signal?: AbortSignal): Promise<GistRef> {
  const body = JSON.stringify({
    description: 'dshmarket profile backup',
    public: false,
    files: { [GIST_FILENAME]: { content } },
  })
  const response = await sendGistRequest(token, 'POST', '/gists', body, 'Gist creation', signal)
  const data = JSON.parse(response.body) as { id?: unknown; html_url?: unknown }
  if (typeof data.id !== 'string' || data.id === '') throw new Error('GitHub returned an invalid Gist')
  return { id: data.id, htmlUrl: typeof data.html_url === 'string' ? data.html_url : `https://gist.github.com/${data.id}` }
}

/** Overwrite the backup file inside an existing Gist (other files kept). */
export async function updateGist(token: string, gistId: string, content: string, signal?: AbortSignal): Promise<GistRef> {
  const body = JSON.stringify({ files: { [GIST_FILENAME]: { content } } })
  const response = await sendGistRequest(token, 'PATCH', `/gists/${gistId}`, body, 'Gist update', signal)
  const data = JSON.parse(response.body) as { id?: unknown; html_url?: unknown }
  return { id: typeof data.id === 'string' ? data.id : gistId, htmlUrl: typeof data.html_url === 'string' ? data.html_url : `https://gist.github.com/${gistId}` }
}

/** Download and strictly validate the backup file inside a Gist. */
export async function readGist(token: string, gistId: string, signal?: AbortSignal): Promise<ProfileBackup> {
  const response = await sendGistRequest(token, 'GET', `/gists/${gistId}`, undefined, 'Gist read', signal)
  let data: { files?: Record<string, unknown> }
  try {
    data = JSON.parse(response.body) as { files?: Record<string, unknown> }
  } catch {
    throw new GistError('GitHub returned an unreadable Gist payload', 'invalid')
  }
  const file = data.files?.[GIST_FILENAME]
  const content = file !== null && typeof file === 'object' && !Array.isArray(file)
    ? (file as { content?: unknown }).content
    : undefined
  if (typeof content !== 'string') throw new GistError(`Gist has no ${GIST_FILENAME} file`, 'invalid')
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new GistError('Gist backup is not valid JSON', 'invalid')
  }
  // Strict validation server-side: restore only accepts real backups.
  try {
    return validatedBackup(parsed)
  } catch (error) {
    throw new GistError(error instanceof Error ? error.message : String(error), 'invalid')
  }
}

/** Confirm the token is usable (GET /user). */
export async function verifyGistToken(token: string, signal?: AbortSignal): Promise<void> {
  await sendGistRequest(token, 'GET', '/user', undefined, 'token verification', signal)
}

/** True when the serialized backup fits inside a Gist file. */
export function fitsGistLimit(content: string): boolean {
  return Buffer.byteLength(content) <= GIST_MAX_BYTES
}

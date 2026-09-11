import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const HOST = '127.0.0.1'
const DEFAULT_PORT = 17860
const CLIENT_ID = 'dsh-desktop'
const DEFAULT_CONTRACT_VERSION = '0.5.0'
const AUTH_TTL_MS = 5 * 60 * 1000
const TICKET_TTL_MS = 60 * 1000
const ACCESS_TTL_SECONDS = 300
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60
const MAX_BODY = 128 * 1024

const EMPLOYEE_MODELS = [
  'bisheng:42',
  'openai:gpt-4.1',
  'anthropic:claude-sonnet-4-5',
  'moonshot:kimi-k2'
]

const INITIAL_MODEL_USAGE = {
  'bisheng:42': 128,
  'openai:gpt-4.1': 8640,
  'anthropic:claude-sonnet-4-5': 4320,
  'moonshot:kimi-k2': 2160,
  'bisheng:reasoner': 640
}

const MODEL_LIMITS = {
  'bisheng:42': 100000,
  'openai:gpt-4.1': 50000,
  'anthropic:claude-sonnet-4-5': 50000,
  'moonshot:kimi-k2': 80000,
  'bisheng:reasoner': 30000
}

const MONTHLY_LIMIT = 300000

const USERS = [
  {
    id: 'user-alice', username: 'alice', displayName: 'Alice 演示员工',
    email: 'alice@demo.bisheng.local', password: 'WorkBuddy123!',
    tenant: { id: 'tenant-demo', name: '毕昇演示企业' },
    models: EMPLOYEE_MODELS
  },
  {
    id: 'user-admin', username: 'admin', displayName: 'Admin 演示管理员',
    email: 'admin@demo.bisheng.local', password: 'Admin123!',
    tenant: { id: 'tenant-demo', name: '毕昇演示企业' },
    models: [...EMPLOYEE_MODELS, 'bisheng:reasoner']
  }
]

const MODELS = {
  'bisheng:42': {
    id: 'bisheng:42', object: 'model', created: 1788883200, owned_by: 'bisheng',
    display_name: 'DeepSeek V3 · Mock', capabilities: { streaming: true, tools: true, reasoning_content: false }
  },
  'openai:gpt-4.1': {
    id: 'openai:gpt-4.1', object: 'model', created: 1788883200, owned_by: 'openai',
    display_name: 'GPT-4.1 · Mock', capabilities: { streaming: true, tools: true, reasoning_content: false }
  },
  'anthropic:claude-sonnet-4-5': {
    id: 'anthropic:claude-sonnet-4-5', object: 'model', created: 1788883200, owned_by: 'anthropic',
    display_name: 'Claude Sonnet 4.5 · Mock', capabilities: { streaming: true, tools: true, reasoning_content: true }
  },
  'moonshot:kimi-k2': {
    id: 'moonshot:kimi-k2', object: 'model', created: 1788883200, owned_by: 'moonshot',
    display_name: 'Kimi K2 · Mock', capabilities: { streaming: true, tools: true, reasoning_content: true }
  },
  'bisheng:reasoner': {
    id: 'bisheng:reasoner', object: 'model', created: 1788883200, owned_by: 'bisheng',
    display_name: '毕昇 Mock Reasoner', capabilities: { streaming: true, tools: true, reasoning_content: true }
  }
}

function opaque(prefix) {
  return `${prefix}${randomBytes(24).toString('base64url')}`
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function requestId(request) {
  const supplied = request.headers['x-request-id']
  return typeof supplied === 'string' && supplied.length <= 128 ? supplied : randomUUID()
}

function sendJson(response, status, body, id = randomUUID()) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-request-id': id,
    'content-length': Buffer.byteLength(payload)
  })
  response.end(payload)
}

function sendError(response, status, code, message, type = 'invalid_request_error', id = randomUUID()) {
  sendJson(response, status, { error: { message, type, code }, request_id: id }, id)
}

function sendHtml(response, status, html, headers = {}) {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  })
  response.end(html)
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char])
}

function layout(title, content) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f4f6f9;color:#172033;font:15px system-ui}.card{box-sizing:border-box;max-width:620px;margin:7vh auto;padding:30px;border:1px solid #dde2ea;border-radius:20px;background:white;box-shadow:0 20px 60px #14213d18}h1{margin:8px 0 12px;font-size:26px}p{color:#5d6676;line-height:1.65}.tag{display:inline-flex;padding:4px 8px;border-radius:999px;color:#1257c7;background:#eaf2ff;font-size:12px;font-weight:700}label{display:grid;gap:6px;margin:14px 0;font-weight:650}input{height:40px;padding:0 11px;border:1px solid #cbd2dc;border-radius:9px;font:inherit}button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 15px;border:0;border-radius:9px;color:#fff;background:#2468f2;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.secondary{color:#364152;background:#edf0f4}.actions{display:flex;gap:10px;margin-top:18px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.facts div{padding:12px;border-radius:10px;background:#f5f7fa}.facts span{display:block;color:#6d7480;font-size:12px}.facts strong{display:block;margin-top:4px;overflow-wrap:anywhere}code{overflow-wrap:anywhere}</style><body><main class="card">${content}</main></body></html>`
}

async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_BODY) throw Object.assign(new Error('request too large'), { status: 413 })
    chunks.push(bytes)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function readJson(request) {
  const body = JSON.parse(await readBody(request) || '{}')
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body must be an object')
  return body
}

async function readForm(request) {
  return new URLSearchParams(await readBody(request))
}

function sameSecret(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function validCallback(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.pathname === '/dsh/callback' && !url.search && !url.hash
  } catch {
    return false
  }
}

function exactFields(body, required, optional = []) {
  const keys = Object.keys(body)
  return required.every((key) => keys.includes(key)) && keys.every((key) => required.includes(key) || optional.includes(key))
}

function loginPage(origin, auth) {
  if (!auth) {
    const link = new URL('dsh-desktop://login')
    link.searchParams.set('server', origin)
    return layout('打开 DSH Desktop', `<span class="tag">固定入口</span><h1>在 DSH Desktop 中连接毕昇</h1><p>此链接只携带平台地址。客户端确认后会新建 PKCE 登录事务。</p><a class="button" href="${escapeHtml(link)}">打开 DSH Desktop</a>`)
  }
  return layout('登录毕昇企业账号', `<span class="tag">BiSheng Mock</span><h1>登录并授权 DSH Desktop</h1><p>Mock 会模拟已有的毕昇登录与授权确认页。</p><form method="post" action="/__mock/authorize"><input type="hidden" name="auth_id" value="${escapeHtml(auth.id)}"><label>邮箱<input name="email" type="email" value="alice@demo.bisheng.local" required></label><label>密码<input name="password" type="password" value="WorkBuddy123!" required></label><div class="actions"><button name="decision" value="allow">允许并返回 Desktop</button><button class="secondary" name="decision" value="deny">取消</button></div></form><p>员工：alice@demo.bisheng.local / WorkBuddy123!<br>管理员：admin@demo.bisheng.local / Admin123!</p>`)
}

function ticketPage(callback, ticket) {
  return layout('返回 DSH Desktop', `<span class="tag">授权成功</span><h1>正在返回 DSH Desktop</h1><p>若浏览器未自动返回，可在当前登录事务中粘贴下方一次性授权码。</p><p><code>${escapeHtml(ticket)}</code></p><a class="button" href="${escapeHtml(callback)}">返回 DSH Desktop</a><script>location.replace(${JSON.stringify(callback)})</script>`)
}

function publicIdentity(user) {
  return {
    user: { id: user.id, username: user.username, display_name: user.displayName },
    tenant: user.tenant
  }
}

function bearer(request) {
  const value = request.headers.authorization
  return typeof value === 'string' && value.startsWith('Bearer ') ? value.slice(7) : undefined
}

function tokenPayload(state, session, user) {
  const access = opaque('access_')
  const refresh = opaque('refresh_')
  const now = Date.now()
  session.accessHash = hash(access)
  session.accessExpiresAt = now + ACCESS_TTL_SECONDS * 1000
  session.refreshHash = hash(refresh)
  session.refreshExpiresAt = Math.min(session.expiresAt, now + REFRESH_TTL_SECONDS * 1000)
  state.access.set(session.accessHash, session.id)
  state.refresh.set(session.refreshHash, { sessionId: session.id, used: false })
  return {
    token_type: 'Bearer', access_token: access, expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refresh, refresh_expires_in: Math.floor((session.refreshExpiresAt - now) / 1000),
    session_id: session.id, session_expires_at: new Date(session.expiresAt).toISOString(),
    ...publicIdentity(user)
  }
}

function sessionFromAccess(state, request) {
  const token = bearer(request)
  const sessionId = token ? state.access.get(hash(token)) : undefined
  const session = sessionId ? state.sessions.get(sessionId) : undefined
  if (!session || session.revoked || session.accessHash !== hash(token) || session.accessExpiresAt <= Date.now()) return undefined
  return session
}

/**
 * @param {{ host?: string, port?: number, contractVersion?: '0.4.0' | '0.5.0' }} [options]
 */
export function createMockEnterpriseServer(options = {}) {
  const host = options.host ?? HOST
  if (host !== HOST) throw new Error('The BiSheng mock must bind to 127.0.0.1.')
  const contractVersion = options.contractVersion ?? DEFAULT_CONTRACT_VERSION
  const state = {
    origin: '', authorizations: new Map(), tickets: new Map(), sessions: new Map(),
    access: new Map(), refresh: new Map(), users: new Map(USERS.map((user) => [user.id, user])), usage: new Map()
  }

  const server = createServer(async (request, response) => {
    const id = requestId(request)
    try {
      const url = new URL(request.url ?? '/', state.origin)
      if (request.method === 'GET' && url.pathname === '/healthz') return sendJson(response, 200, { ok: true, origin: state.origin }, id)
      if (request.method === 'GET' && url.pathname === '/') return sendHtml(response, 200, layout('BiSheng DSH Mock', `<span class="tag">READY</span><h1>DSH 登录与模型 Mock</h1><div class="facts"><div><span>BASE</span><strong>${escapeHtml(state.origin)}</strong></div><div><span>合同版本</span><strong>${contractVersion}</strong></div></div><p>在 DSH Desktop Dev 的「设置 → 账号与企业」中填写此 BASE。</p>`))
      if (request.method === 'GET' && url.pathname === '/api/v1/dsh/config') return sendJson(response, 200, { enabled: true, client_id: CLIENT_ID, contract_version: contractVersion }, id)

      if (request.method === 'POST' && url.pathname === '/api/dsh/authorizations') {
        const body = await readJson(request)
        if (!exactFields(body, ['client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state'], ['device_name']) || body.client_id !== CLIENT_ID || body.code_challenge_method !== 'S256' || !validCallback(body.redirect_uri) || !/^[A-Za-z0-9_-]{43}$/u.test(body.code_challenge) || !/^[A-Za-z0-9_-]{43}$/u.test(body.state)) {
          return sendError(response, 400, 'invalid_authorization_request', 'Authorization request is invalid.', 'invalid_request_error', id)
        }
        const authId = opaque('auth_')
        state.authorizations.set(authId, {
          id: authId, redirectUri: body.redirect_uri, challenge: body.code_challenge,
          state: body.state, expiresAt: Date.now() + AUTH_TTL_MS, consumed: false
        })
        const authorize = new URL('/desktop-login', state.origin)
        authorize.searchParams.set('auth_id', authId)
        return sendJson(response, 200, { auth_id: authId, authorize_url: authorize.toString(), expires_in: 300 }, id)
      }

      if (request.method === 'GET' && url.pathname === '/desktop-login') {
        const auth = state.authorizations.get(url.searchParams.get('auth_id'))
        return sendHtml(response, auth ? 200 : 200, loginPage(state.origin, auth))
      }

      if (request.method === 'POST' && url.pathname === '/__mock/authorize') {
        const form = await readForm(request)
        const auth = state.authorizations.get(form.get('auth_id'))
        if (!auth || auth.consumed || auth.expiresAt <= Date.now()) return sendHtml(response, 400, layout('授权失效', '<h1>授权事务已失效</h1>'))
        const callback = new URL(auth.redirectUri)
        callback.searchParams.set('auth_id', auth.id)
        callback.searchParams.set('state', auth.state)
        if (form.get('decision') !== 'allow') {
          auth.consumed = true
          callback.searchParams.set('error', 'access_denied')
          return sendHtml(response, 200, layout('已取消', `<h1>已取消授权</h1><a class="button" href="${escapeHtml(callback)}">返回 DSH Desktop</a><script>location.replace(${JSON.stringify(callback.toString())})</script>`))
        }
        const user = USERS.find((candidate) => candidate.email === form.get('email'))
        if (!user || !sameSecret(form.get('password') ?? '', user.password)) return sendHtml(response, 401, layout('登录失败', '<h1>账号或密码错误</h1>'))
        auth.consumed = true
        const ticket = opaque('ticket_')
        state.tickets.set(hash(ticket), { authId: auth.id, userId: user.id, expiresAt: Date.now() + TICKET_TTL_MS, consumed: false })
        callback.searchParams.set('identity_ticket', ticket)
        return sendHtml(response, 200, ticketPage(callback.toString(), ticket))
      }

      if (request.method === 'POST' && url.pathname === '/api/dsh/token') {
        const body = await readJson(request)
        if (body.grant_type === 'identity_ticket') {
          if (!exactFields(body, ['grant_type', 'identity_ticket', 'auth_id', 'code_verifier'])) return sendError(response, 400, 'invalid_request', 'Token request fields are invalid.', 'invalid_request_error', id)
          const ticket = state.tickets.get(hash(body.identity_ticket ?? ''))
          const auth = state.authorizations.get(body.auth_id)
          if (!ticket || !auth || ticket.authId !== auth.id || ticket.consumed || ticket.expiresAt <= Date.now() || !/^[A-Za-z0-9._~-]{43,128}$/u.test(body.code_verifier ?? '') || createHash('sha256').update(body.code_verifier ?? '', 'ascii').digest('base64url') !== auth.challenge) {
            return sendError(response, 400, 'invalid_identity_ticket', 'Identity ticket is invalid, consumed, or expired.', 'authentication_error', id)
          }
          ticket.consumed = true
          const user = state.users.get(ticket.userId)
          const session = { id: opaque('session_'), userId: user.id, expiresAt: Date.now() + REFRESH_TTL_SECONDS * 1000, revoked: false }
          const models = new Map(user.models.map((model) => [model, INITIAL_MODEL_USAGE[model] ?? 0]))
          const total = [...models.values()].reduce((sum, value) => sum + value, 0)
          state.sessions.set(session.id, session)
          state.usage.set(session.id, { total, models })
          return sendJson(response, 200, tokenPayload(state, session, user), id)
        }
        if (body.grant_type === 'refresh_token') {
          if (!exactFields(body, ['grant_type', 'refresh_token'])) return sendError(response, 400, 'invalid_request', 'Refresh request fields are invalid.', 'invalid_request_error', id)
          const record = state.refresh.get(hash(body.refresh_token ?? ''))
          const session = record ? state.sessions.get(record.sessionId) : undefined
          if (record?.used && session) session.revoked = true
          if (!record || record.used || !session || session.revoked || session.refreshHash !== hash(body.refresh_token ?? '') || session.refreshExpiresAt <= Date.now()) {
            return sendError(response, 401, record?.used ? 'refresh_token_reused' : 'invalid_refresh_token', 'Refresh token is invalid.', 'authentication_error', id)
          }
          record.used = true
          return sendJson(response, 200, tokenPayload(state, session, state.users.get(session.userId)), id)
        }
        return sendError(response, 400, 'unsupported_grant_type', 'Grant type is unsupported.', 'invalid_request_error', id)
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/dsh/models') {
        const session = sessionFromAccess(state, request)
        if (!session) return sendError(response, 401, 'invalid_access_token', 'Access token is invalid.', 'authentication_error', id)
        const user = state.users.get(session.userId)
        return sendJson(response, 200, { object: 'list', data: user.models.map((model) => MODELS[model]) }, id)
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/dsh/usage') {
        const session = sessionFromAccess(state, request)
        if (!session) return sendError(response, 401, 'invalid_access_token', 'Access token is invalid.', 'authentication_error', id)
        const user = state.users.get(session.userId)
        const usage = state.usage.get(session.id) ?? { total: 0, models: new Map() }
        const model = url.searchParams.get('model')
        if (model && !user.models.includes(model)) {
          return sendError(response, 403, 'model_not_allowed', 'Model is not assigned to this user.', 'permission_error', id)
        }
        const used = model ? usage.models.get(model) ?? 0 : usage.total
        const limit = model ? MODEL_LIMITS[model] : MONTHLY_LIMIT
        const now = new Date()
        const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
        return sendJson(response, 200, {
          month: now.toISOString().slice(0, 7), billing_timezone: 'Asia/Shanghai',
          period_start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
          reset_at: reset.toISOString(), used, limit, remaining: limit - used,
          source: 'live', as_of: now.toISOString(), quota_state: used >= limit ? 'exhausted' : 'available'
        }, id)
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/dsh/chat/completions') {
        const session = sessionFromAccess(state, request)
        if (!session) return sendError(response, 401, 'invalid_access_token', 'Access token is invalid.', 'authentication_error', id)
        const body = await readJson(request)
        const user = state.users.get(session.userId)
        if (!user.models.includes(body.model)) return sendError(response, 403, 'model_not_allowed', 'Model is not assigned to this user.', 'permission_error', id)
        if (body.stream !== true || body.stream_options?.include_usage !== true) return sendError(response, 400, 'invalid_request', 'Streaming with usage is required.', 'invalid_request_error', id)
        const prompt = JSON.stringify(body.messages ?? []).length % 40 + 12
        const completion = 24
        const currentUsage = state.usage.get(session.id) ?? { total: 0, models: new Map() }
        const cached = Math.min(8, Math.max(0, prompt - 1))
        const tokens = prompt + completion
        currentUsage.total += tokens
        currentUsage.models.set(body.model, (currentUsage.models.get(body.model) ?? 0) + tokens)
        state.usage.set(session.id, currentUsage)
        response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-request-id': id, connection: 'keep-alive' })
        response.write(`data: ${JSON.stringify({ id: `chatcmpl-${randomUUID()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: body.model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`)
        const selectedModel = MODELS[body.model]
        if (selectedModel.capabilities.reasoning_content) response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { reasoning_content: '先验证登录、模型权限与用量。' }, finish_reason: null }] })}\n\n`)
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `Mock 联调成功：当前请求已通过 DSH access token 调用 ${selectedModel.display_name}。` }, finish_reason: null }] })}\n\n`)
        response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`)
        const usage = { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion }
        if (contractVersion !== '0.4.0') usage.prompt_tokens_details = { cached_tokens: cached, cache_creation_tokens: null }
        response.write(`data: ${JSON.stringify({ choices: [], usage })}\n\n`)
        response.end('data: [DONE]\n\n')
        return
      }

      if (request.method === 'POST' && url.pathname === '/api/dsh/logout') {
        let session = sessionFromAccess(state, request)
        if (!session) {
          const body = await readJson(request)
          const record = state.refresh.get(hash(body.refresh_token ?? ''))
          session = record ? state.sessions.get(record.sessionId) : undefined
        }
        if (!session) return sendError(response, 401, 'session_revoked', 'Session cannot be identified.', 'authentication_error', id)
        session.revoked = true
        response.writeHead(204, { 'cache-control': 'no-store', 'x-request-id': id }).end()
        return
      }

      sendError(response, 404, 'not_found', 'Route not found.', 'invalid_request_error', id)
    } catch (error) {
      sendError(response, error.status ?? 500, 'internal_error', error.message ?? 'Mock request failed.', 'server_error', id)
    }
  })

  return {
    state,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(options.port ?? DEFAULT_PORT, host, resolve)
      })
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Mock did not receive a TCP port.')
      state.origin = `http://${host}:${address.port}`
      return state.origin
    },
    async close() {
      if (!server.listening) return
      await new Promise((resolve) => server.close(() => resolve()))
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = createMockEnterpriseServer()
  const origin = await service.listen()
  process.stdout.write(`BiSheng DSH Mock listening at ${origin}\n`)
  process.stdout.write('DSH Desktop Dev: Settings -> Account & Enterprise -> enter this BASE\n')
  const stop = async () => { await service.close(); process.exit(0) }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

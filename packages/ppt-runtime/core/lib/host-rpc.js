import { clientRequestSchema } from '@deepseek-ai/dsh-client-connection'

const MAX_BODY_BYTES = 1024 * 1024
const ENDPOINT = /^[A-Za-z0-9_$.-]+(?:\/[A-Za-z0-9_$.-]+)*$/

function finish(res, status, body, headers = {}) {
  const bytes = body === undefined ? undefined : Buffer.from(body)
  res.writeHead(status, {
    ...headers,
    ...(bytes === undefined ? {} : { 'content-length': bytes.byteLength })
  })
  res.end(bytes)
}

async function body(req, res) {
  const declared = req.headers['content-length']
  if (declared !== undefined && Number(declared) > MAX_BODY_BYTES) {
    finish(res, 413)
    req.destroy()
    return
  }
  const chunks = []
  let received = 0
  for await (const chunk of req) {
    received += chunk.byteLength
    if (received > MAX_BODY_BYTES) {
      finish(res, 413)
      req.destroy()
      return
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function response(res, rpcId, result) {
  finish(res, 200, JSON.stringify({ type: 'server-response', rpcId, result }), {
    'content-type': 'application/json; charset=utf-8'
  })
}

function badRequest(res, rpcId, message, details = {}) {
  response(res, typeof rpcId === 'string' ? rpcId : 'invalid-request', {
    ok: false,
    error: { code: 'gateway/bad-request', message, details }
  })
}

/** Mount one authenticated Connection-compatible RPC channel on the owning plugin. */
export function registerHostRpcChannel(ctx, channel, handler) {
  return ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: channel,
    async handler(req, res) {
      const rejection = ctx.connection.requestRejection(req)
      if (rejection !== undefined) {
        finish(res, rejection, rejection === 401 ? 'unauthorized' : 'forbidden')
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      const endpoint = pathname.startsWith(`${channel}/`) ? pathname.slice(channel.length + 1) : ''
      if (req.method !== 'POST' || !ENDPOINT.test(endpoint)) {
        finish(res, 404, 'not found')
        return
      }
      if (req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
        finish(res, 415, 'content type must be application/json')
        return
      }
      const raw = await body(req, res)
      if (raw === undefined) return
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        finish(res, 400, 'body is not JSON')
        return
      }
      const envelope = clientRequestSchema.safeParse(parsed)
      if (!envelope.success) {
        badRequest(res, parsed?.rpcId, 'invalid client-request message', { issues: envelope.error.issues })
        return
      }
      if (envelope.data.method !== endpoint) {
        badRequest(res, envelope.data.rpcId, `method ${JSON.stringify(envelope.data.method)} does not match endpoint ${JSON.stringify(endpoint)}`, { issues: [] })
        return
      }
      try {
        response(res, envelope.data.rpcId, await handler(endpoint, envelope.data.payload))
      } catch (error) {
        finish(res, 500, `handler failure: ${String(error)}`)
      }
    }
  }), `dsh rpc channel: ${channel}`)
}

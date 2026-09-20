import { request as httpRequest } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ENTERPRISE_CALLBACK_PATH,
  escapeCallbackHtml,
  startLoginCallbackServer
} from '../src/main/enterprise/login-callback-server'

const servers: Array<{ close(): Promise<void> }> = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

describe('enterprise login callback server', () => {
  it('escapes dynamic HTML and rejects a bad state without consuming the flow', async () => {
    expect(escapeCallbackHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
    let accepted = 0
    const server = await startLoginCallbackServer({
      expectedState: 'state-good',
      expectedAuthId: () => 'auth-good',
      timeoutMs: 5_000,
      onAccepted: () => {
        accepted += 1
      }
    })
    servers.push(server)

    const rejected = await fetch(
      `${server.redirectUri}?auth_id=auth-good&state=state-evil&identity_ticket=<script>alert(1)</script>`
    )
    expect(rejected.status).toBe(400)
    const rejectedHtml = await rejected.text()
    expect(rejectedHtml).toContain('This login request is not valid.')
    expect(rejectedHtml).not.toContain('<script>')
    expect(rejected.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(rejected.headers.get('referrer-policy')).toBe('no-referrer')
    expect(rejected.headers.get('cache-control')).toBe('no-store')
    expect(accepted).toBe(0)

    const matched = await fetch(
      `${server.redirectUri}?auth_id=auth-good&state=state-good&identity_ticket=ticket_ok`
    )
    expect(matched.status).toBe(200)
    await expect(matched.text()).resolves.toContain('return to DSH Desktop')
    expect(accepted).toBe(1)
  })

  it('rejects a mismatched Host without closing the login flow', async () => {
    let accepted = 0
    const server = await startLoginCallbackServer({
      expectedState: 'state-good',
      expectedAuthId: () => 'auth-good',
      timeoutMs: 5_000,
      onAccepted: () => {
        accepted += 1
      }
    })
    servers.push(server)

    const mismatched = await new Promise<{ status: number, body: string }>((resolve, reject) => {
      const request = httpRequest({
        host: '127.0.0.1',
        port: server.port,
        path: `${ENTERPRISE_CALLBACK_PATH}?auth_id=auth-good&state=state-good&identity_ticket=ticket_ok`,
        setHost: false,
        headers: { host: `example.com:${server.port}` }
      }, (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () => resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8')
        }))
      })
      request.on('error', reject)
      request.end()
    })
    expect(mismatched.status).toBe(400)
    expect(accepted).toBe(0)

    const matched = await fetch(
      `${server.redirectUri}?auth_id=auth-good&state=state-good&identity_ticket=ticket_ok`
    )
    expect(matched.status).toBe(200)
    expect(accepted).toBe(1)
  })
})

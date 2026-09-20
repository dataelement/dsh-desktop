import { EventEmitter } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createEnterpriseFetch, type EnterpriseFetch } from '../src/main/enterprise/platform-fetch'
import { EnterpriseService } from '../src/main/enterprise/enterprise-service'
import {
  ENTERPRISE_VAULT_FILENAME,
  type SafeStorageCryptoAdapter,
  SecureEnterpriseCredentialVault
} from '../src/main/enterprise/secure-credential-vault'
import { createMockEnterpriseServer } from '../scripts/mock-bisheng-enterprise.mjs'

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

function memorySafeStorage(): SafeStorageCryptoAdapter {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (plainText) => Buffer.from(plainText, 'utf8'),
    decryptString: (encrypted) => Buffer.from(encrypted as Buffer).toString('utf8')
  }
}

function chatPayload(model = 'bisheng:42') {
  return {
    request: {
      model,
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
      stream_options: { include_usage: true },
      n: 1
    }
  }
}

class FakeResponse extends EventEmitter {
  statusCode = 0
  headersSent = false
  writableEnded = false
  writableFinished = false
  headers: Record<string, string> = {}
  chunks: Buffer[] = []

  writeHead(statusCode: number, headers: Record<string, string>) {
    this.statusCode = statusCode
    this.headers = headers
    this.headersSent = true
    return this
  }

  holdWrites = false
  waitingForDrain = false

  write(chunk: Buffer | string) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    if (this.holdWrites) {
      this.waitingForDrain = true
      return false
    }
    return true
  }

  end(chunk?: Buffer | string) {
    if (chunk) this.write(chunk)
    this.writableEnded = true
    this.writableFinished = true
    this.emit('finish')
  }

  destroy() {
    this.writableEnded = true
    this.emit('close')
  }

  text() {
    return Buffer.concat(this.chunks).toString('utf8')
  }
}

async function createService(fetchImpl: EnterpriseFetch = createEnterpriseFetch(globalThis.fetch)) {
  const directory = await mkdtemp(join(tmpdir(), 'enterprise-chat-'))
  const vault = new SecureEnterpriseCredentialVault(join(directory, ENTERPRISE_VAULT_FILENAME), memorySafeStorage())
  const service = new EnterpriseService({
    vault,
    fetchImpl,
    allowInsecureLoopback: true
  })
  await service.restore()
  cleanups.push(async () => service.stop())
  return service
}

async function completeBrowserLogin(origin: string, authorizationUrl: string) {
  const authId = new URL(authorizationUrl).searchParams.get('auth_id')
  const browserResponse = await fetch(`${origin}/__mock/authorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      auth_id: authId ?? '',
      email: 'alice@demo.bisheng.local',
      password: 'WorkBuddy123!',
      decision: 'allow'
    })
  })
  const html = await browserResponse.text()
  const callback = new URL(JSON.parse(/location\.replace\((".*?")\)/u.exec(html)![1]!))
  await fetch(callback)
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for enterprise chat.')
}

describe('enterprise chat SSE proxy', () => {
  it('forwards raw SSE frames without leaking tokens', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const service = await createService()
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })

    const response = new FakeResponse()
    await service.proxyChat(chatPayload(), response as never, new AbortController().signal)
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.text()).toContain('Mock 联调成功')
    expect(response.text()).toContain('data: [DONE]')
    expect(response.text()).not.toMatch(/access_token|refresh_token/u)
    expect(JSON.stringify(service.snapshot())).not.toMatch(/access_token|refresh_token/u)
  })

  it('refreshes once on 401 before any body is written', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let chatCalls = 0
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/chat/completions')) {
        chatCalls += 1
        if (chatCalls === 1) {
          return new Response(JSON.stringify({
            error: { message: 'Access token is invalid.', code: 'invalid_access_token' }
          }), {
            status: 401,
            headers: { 'content-type': 'application/json', 'x-request-id': 'req-401' }
          })
        }
      }
      return globalThis.fetch(input, init)
    }
    const service = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })

    const response = new FakeResponse()
    await service.proxyChat(chatPayload(), response as never, new AbortController().signal)
    expect(chatCalls).toBe(2)
    expect(response.statusCode).toBe(200)
    expect(response.headersSent).toBe(true)
    expect(response.text()).toContain('data: [DONE]')
  })

  it('aborts the upstream fetch when the client disconnects', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let aborted = false
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/chat/completions')) {
        return new Response(new ReadableStream({
          start(controller) {
            const timer = setInterval(() => {
              controller.enqueue(new TextEncoder().encode('data: {"choices":[{"index":0,"delta":{"content":"."},"finish_reason":null}]}\n\n'))
            }, 20)
            init?.signal?.addEventListener('abort', () => {
              aborted = true
              clearInterval(timer)
              try {
                controller.close()
              } catch {
                // The reader may already have cancelled the stream.
              }
            })
          }
        }), {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        })
      }
      return globalThis.fetch(input, init)
    }
    const service = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })

    const controller = new AbortController()
    const response = new FakeResponse()
    const pending = service.proxyChat(chatPayload(), response as never, controller.signal)
    await waitFor(() => response.chunks.length > 0)
    controller.abort()
    await pending.catch(() => undefined)
    await waitFor(() => aborted)
    expect(aborted).toBe(true)
  })

  it('forwards a second 401 without retrying again', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let chatCalls = 0
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/chat/completions')) {
        chatCalls += 1
        return new Response(JSON.stringify({
          error: { message: 'Access token is invalid.', code: 'invalid_access_token' }
        }), {
          status: 401,
          headers: { 'content-type': 'application/json', 'x-request-id': 'req-401' }
        })
      }
      return globalThis.fetch(input, init)
    }
    const service = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })

    const response = new FakeResponse()
    await service.proxyChat(chatPayload(), response as never, new AbortController().signal)
    expect(chatCalls).toBe(2)
    expect(response.statusCode).toBe(401)
    expect(response.text()).toContain('invalid_access_token')
  })

  it('rejects an unauthorized model without calling the platform chat endpoint', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let chatCalls = 0
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/chat/completions')) chatCalls += 1
      return globalThis.fetch(input, init)
    }
    const service = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })
    await expect(service.proxyChat(
      chatPayload('missing-model'),
      new FakeResponse() as never,
      new AbortController().signal
    )).rejects.toMatchObject({ status: 403 })
    expect(chatCalls).toBe(0)
  })

  it('pauses the upstream reader until the downstream drain event', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const service = await createService()
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })

    const response = new FakeResponse()
    response.holdWrites = true
    const pending = service.proxyChat(chatPayload(), response as never, new AbortController().signal)
    await waitFor(() => response.waitingForDrain)
    expect(response.writableEnded).toBe(false)
    response.holdWrites = false
    response.waitingForDrain = false
    response.emit('drain')
    await pending
    expect(response.writableEnded).toBe(true)
    expect(response.text()).toContain('data: [DONE]')
  })
})

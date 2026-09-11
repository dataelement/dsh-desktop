import { afterEach, describe, expect, it } from 'vitest'
import { createEnterpriseController } from '../packages/dsh-desktop-enterprise/index.js'
import { createMockEnterpriseServer } from '../scripts/mock-bisheng-enterprise.mjs'

let service
let controller

afterEach(async () => {
  await controller?.dispose()
  await service?.close()
  controller = undefined
  service = undefined
})

function memoryVault() {
  let generation = 0
  let session = null
  return {
    available: true,
    read: async () => ({ generation, session: structuredClone(session) }),
    replace: async (expected, next) => {
      if (expected !== generation) throw Object.assign(new Error('conflict'), { code: 'VAULT_CONFLICT' })
      generation += 1
      session = structuredClone(next)
      return { generation, session: structuredClone(session) }
    },
    clear: async () => {
      generation += 1
      session = null
      return { generation, session: null }
    }
  }
}

function callbackFrom(html) {
  const literal = /location\.replace\((".*?")\)/u.exec(html)?.[1]
  return literal ? JSON.parse(literal) : undefined
}

describe('enterprise controller', () => {
  it('reports unavailable secure storage as a disabled capability without a duplicate failure', async () => {
    controller = createEnterpriseController({ llm: {} }, {
      vault: {
        available: false,
        read: async () => { throw new Error('must not read') },
        replace: async () => { throw new Error('must not replace') },
        clear: async () => { throw new Error('must not clear') }
      }
    })

    await expect(controller.restore()).resolves.toMatchObject({
      connected: false,
      secureStorageAvailable: false,
      phase: 'disabled'
    })
    expect(controller.state()).not.toHaveProperty('error')
  })

  it('owns the complete browser login, provider registration, refresh state, and logout lifecycle', async () => {
    service = createMockEnterpriseServer({ port: 0 })
    const origin = await service.listen()
    let registered = false
    let registrationCount = 0
    let activationCount = 0
    let enterpriseAdapter
    const registration = () => { registered = false }
    registration.replace = (routes) => { registered = routes.length > 0 }
    const ctx = {
      llm: {
        registerAdapter(routes, adapter) {
          expect(routes).toEqual(['bisheng-enterprise'])
          registrationCount += 1
          registered = true
          enterpriseAdapter = adapter
          return registration
        }
      }
    }
    controller = createEnterpriseController(ctx, {
      vault: { ...memoryVault(), activateDesktop: async () => { activationCount += 1 } },
      allowInsecureLoopback: true
    })
    const login = await controller.startLogin({ base: origin })
    expect(login.authorizationUrl).toContain('/desktop-login?auth_id=')

    const authorize = new URL(login.authorizationUrl)
    const page = await fetch(`${origin}/__mock/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_id: authorize.searchParams.get('auth_id'),
        email: 'alice@demo.bisheng.local',
        password: 'WorkBuddy123!',
        decision: 'allow'
      })
    })
    const callback = callbackFrom(await page.text())
    expect(callback).toContain('/dsh/callback?')
    const callbackResponse = await fetch(callback)
    expect(callbackResponse.status).toBe(200)
    expect(callbackResponse.headers.get('referrer-policy')).toBe('no-referrer')
    expect(await callbackResponse.text()).toContain('正在返回 DSH Desktop')

    expect(controller.state()).toMatchObject({
      connected: true,
      phase: 'connected',
      base: origin,
      user: { id: 'user-alice' },
      tenant: { id: 'tenant-demo' },
      modelsAvailable: true,
      models: [
        { id: 'bisheng:42' },
        { id: 'openai:gpt-4.1' },
        { id: 'anthropic:claude-sonnet-4-5' },
        { id: 'moonshot:kimi-k2' }
      ],
      usage: { source: 'live', quota_state: 'available', used: 15248 },
      modelUsage: { 'bisheng:42': { source: 'live', quota_state: 'available', used: 128 } }
    })
    expect(registered).toBe(true)
    expect(registrationCount).toBe(1)
    expect(activationCount).toBe(1)

    const chunks = []
    for await (const chunk of enterpriseAdapter.stream({
      provider: 'bisheng-enterprise',
      model: 'bisheng:42',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello from Desktop' }] }]
    })) chunks.push(chunk)
    expect(chunks).toContainEqual(expect.objectContaining({
      type: 'text-delta',
      text: expect.stringContaining('Mock 联调成功')
    }))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
    await expect.poll(() => controller.state().modelUsage['bisheng:42']?.used).toBeGreaterThan(128)
    expect(controller.state().usage.used).toBe(15248)

    const loggedOut = await controller.logout()
    expect(loggedOut).toMatchObject({ connected: false, revokeConfirmed: true })
    expect(registered).toBe(false)

    const secondLogin = await controller.startLogin({ base: origin })
    const secondAuthorization = new URL(secondLogin.authorizationUrl)
    const secondPage = await fetch(`${origin}/__mock/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_id: secondAuthorization.searchParams.get('auth_id'),
        email: 'alice@demo.bisheng.local',
        password: 'WorkBuddy123!',
        decision: 'allow'
      })
    })
    const secondCallback = callbackFrom(await secondPage.text())
    expect((await fetch(secondCallback)).status).toBe(200)
    expect(controller.state()).toMatchObject({ connected: true, modelsAvailable: true })
    expect(registrationCount).toBe(1)
    expect(activationCount).toBe(2)
  })
})

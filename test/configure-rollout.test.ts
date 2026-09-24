import { describe, expect, it, vi } from 'vitest'
import {
  configureRollout,
  DEFAULT_BASE_URL,
  DEFAULT_PERCENTAGE,
  isValidVersion,
  SUPPORTED_PLATFORMS
} from '../scripts/configure-rollout.mjs'

describe('configureRollout', () => {
  it('validates canonical SemVer versions', () => {
    expect(isValidVersion('0.8.2')).toBe(true)
    expect(isValidVersion('1.0.0-rc.1')).toBe(true)
    expect(isValidVersion('1.0.0+build')).toBe(true)
    expect(isValidVersion('v0.8.2')).toBe(false)
    expect(isValidVersion('latest')).toBe(false)
    expect(isValidVersion('')).toBe(false)
    expect(isValidVersion(null)).toBe(false)
  })

  it('creates rollout rules for all 3 platforms when none exist', async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown; headers?: unknown }> = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, method, body, headers: init?.headers })

      if (url.endsWith('/admin/api/releases') && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 })
      }
      if (url.endsWith('/admin/api/releases') && method === 'POST') {
        return new Response(JSON.stringify({ ...body, id: `rel-${body.platform}`, revision: 1 }), {
          status: 201
        })
      }
      return new Response('Not Found', { status: 404 })
    })

    const logs: string[] = []
    const results = await configureRollout({
      version: '0.9.0',
      percentage: 5,
      token: 'test-admin-token-12345678901234567890',
      baseUrl: 'https://test-crash.example.com',
      fetchImpl,
      log: (msg: string) => logs.push(msg)
    })

    expect(results).toHaveLength(3)
    expect(results.map((r) => r.platform)).toEqual(SUPPORTED_PLATFORMS)
    expect(results.every((r) => r.action === 'created')).toBe(true)

    // 1 GET + 3 POSTs = 4 calls
    expect(calls).toHaveLength(4)
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.headers).toMatchObject({
      Authorization: 'Bearer test-admin-token-12345678901234567890'
    })

    const postCalls = calls.slice(1)
    expect(postCalls.every((c) => c.method === 'POST')).toBe(true)
    expect(postCalls.map((c) => (c.body as { platform: string }).platform)).toEqual(SUPPORTED_PLATFORMS)
    expect(postCalls.every((c) => (c.body as { percentage: number }).percentage === 5)).toBe(true)
    expect(postCalls.every((c) => (c.body as { enabled: boolean }).enabled === true)).toBe(true)
    expect(postCalls.every((c) => (c.body as { version: string }).version === '0.9.0')).toBe(true)
  })

  it('updates existing rollout rules via PUT preserving revision and seed', async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = []
    const existing = [
      {
        id: 'uuid-mac',
        version: '0.9.0',
        platform: 'mac',
        percentage: 0,
        revision: 2,
        algorithm: 'sha256-installation-v1',
        seed: 'desktop-v1',
        maxCurrentVersionExclusive: '0.8.2',
        enabled: false,
        notes: 'Pre-created disabled rule'
      },
      {
        id: 'uuid-win',
        version: '0.9.0',
        platform: 'windows',
        percentage: 1,
        revision: 5,
        algorithm: 'sha256-installation-v1',
        seed: 'desktop-v1',
        enabled: true,
        notes: 'Existing 1%'
      }
    ]

    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, method, body })

      if (url.endsWith('/admin/api/releases') && method === 'GET') {
        return new Response(JSON.stringify(existing), { status: 200 })
      }
      if (url.includes('/admin/api/releases/') && method === 'PUT') {
        return new Response(JSON.stringify({ ...body, revision: body.revision + 1 }), { status: 200 })
      }
      if (url.endsWith('/admin/api/releases') && method === 'POST') {
        return new Response(JSON.stringify({ ...body, id: 'new-id', revision: 1 }), { status: 201 })
      }
      return new Response('Not Found', { status: 404 })
    })

    const results = await configureRollout({
      version: '0.9.0',
      percentage: 5,
      token: 'test-token',
      baseUrl: 'https://test-crash.example.com',
      fetchImpl
    })

    expect(results).toHaveLength(3)
    const macResult = results.find((r) => r.platform === 'mac')
    const winResult = results.find((r) => r.platform === 'windows')
    const intelResult = results.find((r) => r.platform === 'mac-intel')

    expect(macResult?.action).toBe('updated')
    expect(winResult?.action).toBe('updated')
    expect(intelResult?.action).toBe('created')

    const macPut = calls.find((c) => c.url.endsWith('/admin/api/releases/uuid-mac'))
    expect(macPut?.method).toBe('PUT')
    expect((macPut?.body as { revision: number }).revision).toBe(2)
    expect((macPut?.body as { percentage: number }).percentage).toBe(5)
    expect((macPut?.body as { enabled: boolean }).enabled).toBe(true)
    expect((macPut?.body as { maxCurrentVersionExclusive: string }).maxCurrentVersionExclusive).toBe('0.8.2')
  })

  it('handles 409 conflict during POST by re-fetching and updating via PUT', async () => {
    let listCount = 0
    const calls: Array<{ url: string; method?: string; body?: unknown }> = []

    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, method, body })

      if (url.endsWith('/admin/api/releases') && method === 'GET') {
        listCount += 1
        if (listCount === 1) return new Response(JSON.stringify([]), { status: 200 })
        // On refresh after 409, return newly created items
        return new Response(
          JSON.stringify([
            { id: 'race-mac', version: '0.9.0', platform: 'mac', revision: 1, maxCurrentVersionExclusive: '0.8.2' },
            { id: 'race-intel', version: '0.9.0', platform: 'mac-intel', revision: 1 },
            { id: 'race-win', version: '0.9.0', platform: 'windows', revision: 1 }
          ]),
          { status: 200 }
        )
      }
      if (url.endsWith('/admin/api/releases') && method === 'POST') {
        return new Response(JSON.stringify({ error: 'Release target already exists' }), { status: 409 })
      }
      if (url.includes('/admin/api/releases/') && method === 'PUT') {
        return new Response(JSON.stringify({ ...body, revision: body.revision + 1 }), { status: 200 })
      }
      return new Response('Error', { status: 500 })
    })

    const warnings: string[] = []
    const results = await configureRollout({
      version: '0.9.0',
      percentage: 5,
      token: 'test-token',
      fetchImpl,
      warn: (msg: string) => warnings.push(msg)
    })

    expect(results).toHaveLength(3)
    expect(results.every((r) => r.action === 'updated-after-conflict')).toBe(true)
    expect(warnings.length).toBeGreaterThan(0)
    expect((calls.find(c => c.url.endsWith('/admin/api/releases/race-mac'))?.body as { maxCurrentVersionExclusive: string }).maxCurrentVersionExclusive).toBe('0.8.2')
  })

  it('sets a current-version cap when creating new rollout rules', async () => {
    const bodies: Array<{ maxCurrentVersionExclusive?: string }> = []
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init?.method) return new Response('[]', { status: 200 })
      const body = JSON.parse(String(init.body))
      bodies.push(body)
      return new Response(JSON.stringify({ ...body, id: 'new-id', revision: 1 }), { status: 201 })
    })
    await configureRollout({ version: '0.9.3', token: 'token', fetchImpl })
    expect(bodies).toHaveLength(3)
    expect(bodies.every(body => body.maxCurrentVersionExclusive === '0.9.2')).toBe(true)
  })

  it('retires active 0.9.2 rules before offering 0.9.3', async () => {
    const calls: Array<{ method: string; body?: Record<string, unknown> }> = []
    const oldRules = SUPPORTED_PLATFORMS.map(platform => ({
      id: `old-${platform}`, revision: 2, updatedAt: '2026-09-23T00:00:00Z',
      version: '0.9.2', platform, percentage: 30, algorithm: 'sha256-installation-v1',
      seed: 'desktop-v1', enabled: true, notes: ''
    }))
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method || 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ method, body })
      if (method === 'GET') return new Response(JSON.stringify(oldRules), { status: 200 })
      return new Response(JSON.stringify({ ...body, id: 'saved', revision: 3 }), { status: method === 'POST' ? 201 : 200 })
    })
    await configureRollout({ version: '0.9.3', token: 'token', fetchImpl })
    expect(calls.map(call => call.method)).toEqual(['GET', 'PUT', 'PUT', 'PUT', 'POST', 'POST', 'POST'])
    expect(calls.slice(1, 4).every(call => call.body?.version === '0.9.2' && call.body?.enabled === false && call.body?.percentage === 30)).toBe(true)
    expect(calls.slice(4).every(call => call.body?.version === '0.9.3' && call.body?.maxCurrentVersionExclusive === '0.9.2')).toBe(true)
  })

  it('does not enable 0.9.3 if retiring 0.9.2 conflicts', async () => {
    const calls: string[] = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method || 'GET'} ${url}`)
      if (!init?.method) return new Response(JSON.stringify([{
        id: 'old-mac', revision: 2, version: '0.9.2', platform: 'mac',
        percentage: 30, algorithm: 'sha256-installation-v1', seed: 'desktop-v1', enabled: true, notes: ''
      }]), { status: 200 })
      return new Response('{}', { status: 409 })
    })
    await expect(configureRollout({ version: '0.9.3', token: 'token', fetchImpl })).rejects.toThrow('Failed to disable replaced release')
    expect(calls).toHaveLength(2)
  })

  it('rejects invalid parameters and missing token', async () => {
    await expect(
      configureRollout({ version: 'invalid-version', token: 'token' })
    ).rejects.toThrow('Invalid version')

    await expect(
      configureRollout({ version: '0.9.0', percentage: -1, token: 'token' })
    ).rejects.toThrow('Invalid percentage')

    await expect(
      configureRollout({ version: '0.9.0', percentage: 105, token: 'token' })
    ).rejects.toThrow('Invalid percentage')

    await expect(
      configureRollout({ version: '0.9.0', percentage: 5, token: '' })
    ).rejects.toThrow('CRASH_ADMIN_TOKEN is required')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createEnterpriseFetch } from '../src/main/enterprise/platform-fetch'

describe('enterprise platform fetch', () => {
  it('forces redirect error and rejects caller override', async () => {
    const fetchImpl = vi.fn(async (_input: string, init?: RequestInit) => {
      expect(init?.redirect).toBe('error')
      return new Response('ok')
    })
    const fetchEnterprise = createEnterpriseFetch(fetchImpl)
    await fetchEnterprise('https://bisheng.example.com/api/v1/dsh/config')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await expect(fetchEnterprise('https://bisheng.example.com/api/v1/dsh/config', {
      redirect: 'follow'
    })).rejects.toThrow('cannot follow redirects')
  })
})

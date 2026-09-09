import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import type { ClientRequest, IncomingMessage } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

const httpsMocks = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('node:https', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:https')>()),
  get: httpsMocks.get
}))

import { downloadFileWithRedirects } from '../src/main/mobile/cloudflared-tunnel'

const tempDirs: string[] = []

afterEach(async () => {
  httpsMocks.get.mockReset()
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('cloudflared download lifecycle', () => {
  it('rejects when a response resets after its headers instead of hanging', async () => {
    const response = new PassThrough() as PassThrough & Partial<IncomingMessage>
    response.statusCode = 200
    response.headers = {}
    const request = fakeRequest()
    httpsMocks.get.mockImplementation((_url, callback) => {
      callback(response as IncomingMessage)
      return request as unknown as ClientRequest
    })
    const destination = await tempDestination()

    const download = downloadFileWithRedirects('https://example.test/cloudflared', destination)
    response.write('partial download')
    response.emit('aborted')

    await expect(download).rejects.toThrow()
  })

  it('aborts an idle request at the configured timeout', async () => {
    const request = fakeRequest()
    request.setTimeout = vi.fn((_timeout: number, callback: () => void) => {
      queueMicrotask(callback)
      return request
    })
    httpsMocks.get.mockReturnValue(request as unknown as ClientRequest)
    const destination = await tempDestination()

    await expect(
      downloadFileWithRedirects('https://example.test/cloudflared', destination, 5, 25)
    ).rejects.toThrow('cloudflared download timed out after 0.025s')
    expect(request.destroy).toHaveBeenCalledOnce()
  })
})

function fakeRequest(): EventEmitter & {
  setTimeout: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
} {
  const request = new EventEmitter() as EventEmitter & {
    setTimeout: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
  }
  request.setTimeout = vi.fn(() => request)
  request.destroy = vi.fn((error?: Error) => {
    if (error) request.emit('error', error)
    return request
  })
  return request
}

async function tempDestination(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-cloudflared-download-test-'))
  tempDirs.push(dir)
  return join(dir, 'cloudflared')
}

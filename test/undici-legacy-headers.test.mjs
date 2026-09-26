import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const Dispatcher1Wrapper = require('undici/lib/dispatcher/dispatcher1-wrapper.js')

it.each(['object', 'array'])('preserves %s response headers for legacy fetch and decompresses gzip', async (shape) => {
  const headers = { 'content-type': 'application/json', 'content-encoding': 'gzip' }
  const rawHeaders = shape === 'object' ? headers : Object.entries(headers).flat().map(value => Buffer.from(value))
  const controller = { rawHeaders, resume() {}, pause() {}, abort() {} }
  const dispatcher = new Dispatcher1Wrapper({ dispatch(_options, handler) {
    queueMicrotask(() => {
      handler.onRequestStart(controller)
      handler.onResponseStart(controller, 200, headers, 'OK')
      handler.onResponseData(controller, gzipSync(JSON.stringify({ ok: true })))
      handler.onResponseEnd(controller, {})
    })
    return true
  } })
  // Node's bundled fetch consumes the legacy Dispatcher API, as do older plugins.
  const response = await fetch('https://example.test/diagnostic', { dispatcher })
  expect(response.headers.get('content-type')).toBe('application/json')
  expect(response.headers.get('content-encoding')).toBe('gzip')
  expect(await response.json()).toEqual({ ok: true })
})

it('converts HTTP/2 trailer objects to the legacy flat array', () => {
  let trailers
  const handler = Dispatcher1Wrapper.wrapHandler({ onComplete(value) { trailers = value } })
  handler.onResponseEnd({ rawTrailers: { 'x-check': 'done' } }, {})
  expect(trailers.map(value => value.toString())).toEqual(['x-check', 'done'])
})

it('preserves duplicate headers, streaming chunks, and request options', async () => {
  const requestBody = 'unchanged request'
  const headers = { 'content-type': 'text/event-stream', 'set-cookie': ['one=1', 'two=2'] }
  const controller = { rawHeaders: headers, resume() {}, pause() {}, abort() {} }
  let request
  const dispatcher = new Dispatcher1Wrapper({ dispatch(options, handler) {
    request = options
    queueMicrotask(() => {
      handler.onRequestStart(controller)
      handler.onResponseStart(controller, 200, headers, 'OK')
      handler.onResponseData(controller, Buffer.from('data: first\n\n'))
      handler.onResponseData(controller, Buffer.from('data: second\n\n'))
      handler.onResponseEnd(controller, {})
    })
    return true
  } })
  const response = await fetch('https://example.test/stream', { method: 'POST', body: requestBody, dispatcher })
  expect(request.method).toBe('POST')
  expect(response.headers.getSetCookie()).toEqual(['one=1', 'two=2'])
  expect(await response.text()).toBe('data: first\n\ndata: second\n\n')
})

it('keeps HTTP/1.1 upgrade headers and trailers arrays unchanged', () => {
  const headers = [Buffer.from('upgrade'), Buffer.from('websocket')]
  let receivedHeaders, receivedTrailers
  const handler = Dispatcher1Wrapper.wrapHandler({
    onUpgrade(_status, value) { receivedHeaders = value },
    onComplete(value) { receivedTrailers = value }
  })
  handler.onRequestUpgrade({ rawHeaders: headers }, 101, {}, {})
  handler.onResponseEnd({ rawTrailers: headers }, {})
  expect(receivedHeaders).toBe(headers)
  expect(receivedTrailers).toBe(headers)
})

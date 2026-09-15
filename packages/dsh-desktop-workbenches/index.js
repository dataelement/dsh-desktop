import Schema from '@deepseek-ai/schemastery'
import { createStateStore, MAX_STATE_BYTES, StateError } from './state.mjs'
import { createSubmissionStore, MAX_SUBMISSION_BYTES } from './submissions.mjs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-desktop-workbenches'
export const inject = ['connection']
export const Config = Schema.object({ root: Schema.string().required() })

async function readPayload(request, maximum = MAX_STATE_BYTES, tooLarge = 'Workbench state is too large.') {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maximum) throw new StateError(tooLarge, 413)
  const reader = request.body?.getReader()
  if (!reader) throw new StateError('A JSON body is required.')
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > maximum) {
        await reader.cancel()
        throw new StateError(tooLarge, 413)
      }
      chunks.push(value)
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
    catch { throw new StateError('Invalid JSON body.') }
  } finally { reader.releaseLock() }
}

export function apply(ctx, config) {
  const store = createStateStore(config.root)
  const submissions = createSubmissionStore(config.root)
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/development-guide',
    methods: ['GET'],
    async fetch() {
      try {
        const guide = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'development-guide.zh.md'), 'utf8')
        return new Response(guide, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } })
      } catch {
        return Response.json({ error: 'Could not read the workbench development guide.' }, { status: 500, headers: { 'cache-control': 'no-store' } })
      }
    }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/state',
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const result = request.method === 'GET' ? await store.read() : await store.write(await readPayload(request))
        return Response.json(result, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof StateError ? error.message : 'Could not access workbench state.' }, {
          status: error instanceof StateError ? error.status : 500,
          headers: { 'cache-control': 'no-store' }
        })
      }
    }
  })
  ctx.connection.fetch.register({
    path: '/api/desktop-workbenches/submissions',
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const result = request.method === 'GET'
          ? { submissions: await submissions.read() }
          : { submission: await submissions.create(await readPayload(request, MAX_SUBMISSION_BYTES, 'Workbench submission is too large.')) }
        return Response.json(result, { status: request.method === 'POST' ? 201 : 200, headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof StateError ? error.message : 'Could not access workbench submissions.' }, {
          status: error instanceof StateError ? error.status : 500,
          headers: { 'cache-control': 'no-store' }
        })
      }
    }
  })
}

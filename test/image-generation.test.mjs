import { createServer } from 'node:http'
import { mkdtemp, readFile, realpath, rm, symlink, readdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalCredentialProvider } from '@deepseek-ai/dsh-credentials-local'
import { FileSettingsProvider } from '@deepseek-ai/dsh-settings-file'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { LocalSandboxProvider } from '@deepseek-ai/dsh-sandbox-local'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@deepseek-ai/dsh-session'
import sharp from 'sharp'
import { apply, imageTool } from '../packages/dsh-image-generation/index.js'
import { createSettings } from '../packages/dsh-image-generation/lib/settings.js'
import { DEFAULTS, MODEL_CATALOG, generate, generationBody, ImageError, profile, readBounded, validateConnection } from '../packages/dsh-image-generation/lib/provider.js'
import { normalizeImage } from '../packages/dsh-image-generation/lib/assets.js'
import { materialize } from '../packages/dsh-image-generation/lib/storage.js'
import { previewImage, imageResult } from '../packages/dsh-image-generation/lib/preview.js'
import { writerEnvironment } from '../packages/dsh-image-generation/lib/commit.js'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); vi.restoreAllMocks() })
async function temp() { const p = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-image-test-'))); cleanups.push(() => rm(p, { recursive: true, force: true })); return p }
async function server() {
  const calls = []
  const png = await sharp({ create: { width: 32, height: 24, channels: 4, background: '#11223380' } }).png().toBuffer()
  let status = 200; let malformed = false; let delay = 0; let redirect
  const http = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    calls.push({ url: req.url, method: req.method, auth: req.headers.authorization, body: body && JSON.parse(body) })
    if (redirect) { res.writeHead(307, { Location: redirect }); res.end(); return }
    if (delay) await new Promise(resolve => setTimeout(resolve, delay))
    const probe = status === 200 && !malformed && req.url.endsWith('/images/generations') && body && !Object.hasOwn(JSON.parse(body), 'prompt')
    const input = body && JSON.parse(body)
    // Provider-documented canvas ranges, independent of the production catalog.
    // Treat an opaque endpoint as 5.0 Pro too: its ID conveys no capabilities.
    const canvas = {
      'doubao-seedream-5-0-pro-260628': [921600, 4624220],
      'doubao-seedream-5-0-260128': [3686400, 16777216],
      'doubao-seedream-5-0-lite-260128': [3686400, 16777216],
      'doubao-seedream-4-5-251128': [3686400, 16777216],
      'doubao-seedream-4-0-250828': [921600, 16777216],
      'ep-custom': [921600, 4624220],
    }[input?.model]
    if (status === 200 && input?.prompt && canvas) {
      const singleOnly = ['doubao-seedream-5-0-pro-260628', 'ep-custom'].includes(input.model)
      const parameter = singleOnly && (['sequential_image_generation', 'sequential_image_generation_options'].find(field => Object.hasOwn(input, field)) || (input.stream === true ? 'stream' : undefined))
      const [width, height] = input.size.split('x').map(Number)
      const invalidSize = !(width * height >= canvas[0] && width * height <= canvas[1] && width / height >= 1 / 16 && width / height <= 16)
      if (parameter || invalidSize) {
        res.writeHead(400, { 'content-type': 'application/json', 'x-request-id': 'seedream-contract-request' })
        res.end(JSON.stringify({ error: { code: 'InvalidParameter', param: parameter || 'size', message: parameter ? `The parameter ${parameter} is not supported by this model.` : 'The size is outside the supported range.' } }))
        return
      }
    }
    res.writeHead(probe ? 400 : status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(probe ? { error: { code: 'MissingParameter', message: 'The request is missing a required parameter: prompt.' } } : status !== 200 ? { error: { message: 'secret-echo-key' } } : malformed ? {} : req.url.endsWith('/images/generations')
      ? { data: [{ b64_json: png.toString('base64') }] }
      : req.url.endsWith('/models') ? { data: [{ id: 'gpt-image-2.5-flare' }, { id: DEFAULTS.openai.model }, { id: 'gpt-image-2.5-flare' }, { id: 'gpt-5' }, { id: 'dall-e-3' }, { id: 'gpt-image-1', shutdown_date: '2020-01-01' }] } : { id: DEFAULTS.openai.model }))
  })
  await new Promise((resolve, reject) => { http.once('error', reject); http.listen(0, '127.0.0.1', resolve) })
  cleanups.push(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)) })
  return { calls, png, baseUrl: `http://127.0.0.1:${http.address().port}/v1`, setStatus: value => { status = value }, malformed: () => { malformed = true }, delay: value => { delay = value }, redirect: value => { redirect = value } }
}
async function fixture() {
  const home = await temp(); const workspace = await temp()
  const ctx = new Context()
  for (const [plugin, config] of [[SystemPrompt, {}], [ToolRuntime, {}], [SkillRegistry, {}], [LocalSandboxProvider, {}], [LocalSubprocessRuntime, {}], [FileSettingsProvider, { dshHome: home, watch: false }], [LocalCredentialProvider, { dshHome: home, watch: false }]]) {
    const fork = ctx.plugin(plugin, config); await fork; cleanups.push(() => fork.dispose())
  }
  const log = vi.fn(); let mode = 'workspace-write'
  const services = { credentials: ctx.credentials, sandbox: ctx.sandbox, subprocess: ctx.subprocess, logger: { info: log }, sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: workspace }) } }
  const settings = createSettings(services)
  const id = SessionId(randomUUID())
  const agent = { session: Session.create(id, undefined, { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), isSeeded: false, cwd: workspace }) }
  return { ctx, home, workspace, services, settings, log, agent, setMode: value => { mode = value } }
}
const saveInput = (provider, baseUrl, revision = 0) => ({ provider, baseUrl, model: DEFAULTS[provider].model, apiKey: 'test-image-key', revision })

describe('image settings save and provider requests', () => {
  it.each(['openai', 'bytedance'])('saves %s with exactly one non-generating request and redacts credentials', async provider => {
    const f = await fixture(); const s = await server()
    const result = await f.settings.save(saveInput(provider, s.baseUrl))
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0]).toMatchObject({ method: provider === 'openai' ? 'GET' : 'POST', auth: 'Bearer test-image-key' })
    if (provider === 'openai') expect(s.calls[0].url).toContain('/models')
    else expect(s.calls[0].body).toEqual({ model: DEFAULTS.bytedance.model })
    expect(result.profiles[provider]).toMatchObject({ configured: true, validation: provider === 'openai' ? 'model' : 'connection' })
    expect(JSON.stringify(result)).not.toContain('test-image-key')
    expect(JSON.stringify(f.log.mock.calls)).not.toContain('test-image-key')
    expect((await f.settings.active()).provider).toBe(provider)
    expect((await stat(path.join(f.home, '.credentials.yaml'))).mode & 0o777).toBe(0o600)
    expect(await readdir(f.workspace)).toEqual([])
  })
  it('preserves the whole saved profile after validation fails and keeps provider credentials separate', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    s.setStatus(401)
    await expect(f.settings.save({ ...saveInput('bytedance', s.baseUrl, 1), apiKey: 'secret-echo-key' })).rejects.toMatchObject({ code: 'AUTH' })
    expect(await f.settings.active()).toMatchObject({ provider: 'openai', key: 'test-image-key' })
    expect(await readFile(path.join(f.home, '.credentials.yaml'), 'utf8')).not.toContain('secret-echo-key')
    s.setStatus(200)
    await f.settings.save({ ...saveInput('bytedance', s.baseUrl, 1), apiKey: 'byte-key' })
    await f.settings.save({ ...saveInput('openai', s.baseUrl, 2), apiKey: '' })
    expect(s.calls.at(-1).auth).toBe('Bearer test-image-key')
  })
  it('prevents lost updates across two validated saves', async () => {
    const f = await fixture(); const s = await server()
    const result = await Promise.allSettled([f.settings.save(saveInput('openai', s.baseUrl)), f.settings.save(saveInput('bytedance', s.baseUrl))])
    expect(result.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(result.find(result => result.status === 'rejected').reason.code).toBe('CONFLICT')
    expect((await f.settings.describe()).revision).toBe(1)
  })
  it('requires a re-entered key for a different origin and rejects stale revisions before requests', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    await expect(f.settings.save(saveInput('openai', s.baseUrl))).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(f.settings.save({ ...saveInput('openai', 'https://example.com/v1', 1), apiKey: '' })).rejects.toMatchObject({ code: 'KEY_REQUIRED' })
    expect(s.calls).toHaveLength(1)
  })
  it('handles malformed metadata, cancellation, and custom Ark endpoint validation honestly', async () => {
    const s = await server()
    expect(await validateConnection('bytedance', { baseUrl: s.baseUrl, model: 'ep-custom' }, 'key')).toBe('connection')
    s.malformed()
    await expect(validateConnection('bytedance', { baseUrl: s.baseUrl, model: 'ep-custom' }, 'key')).rejects.toMatchObject({ code: 'RESPONSE' })
    const cancelled = new AbortController(); cancelled.abort()
    await expect(validateConnection('openai', { baseUrl: s.baseUrl, model: DEFAULTS.openai.model }, 'key', { signal: cancelled.signal })).rejects.toMatchObject({ code: 'CANCELLED' })
  })
  it('rejects redirects without forwarding a key to the redirect target', async () => {
    const source = await server(); const target = await server()
    source.redirect(target.baseUrl)
    await expect(validateConnection('openai', { ...profile('openai'), baseUrl: source.baseUrl }, 'key')).rejects.toMatchObject({ code: 'UNAVAILABLE' })
    expect(source.calls).toHaveLength(1); expect(target.calls).toHaveLength(0)
  })
  it('accepts only the specific Ark missing-prompt response and rejects unrelated 400 errors', async () => {
    const s = await server(); s.setStatus(400)
    await expect(validateConnection('bytedance', { ...profile('bytedance'), baseUrl: s.baseUrl }, 'key')).rejects.toMatchObject({ code: 'PARAMETERS' })
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0].body).toEqual({ model: DEFAULTS.bytedance.model })
  })
  it('leaves credentials untouched when an in-flight validation is cancelled', async () => {
    const f = await fixture(); const s = await server(); s.delay(50)
    const controller = new AbortController()
    const pending = f.settings.save(saveInput('openai', s.baseUrl), controller.signal)
    setTimeout(() => controller.abort(), 10)
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' })
    expect((await f.settings.describe()).revision).toBe(0)
  })
  it.each(['https://user:key@example.com/v1', 'http://example.com/v1', 'https://example.com/v1?key=x'])('rejects unsafe endpoint %s', baseUrl => {
    expect(() => profile('openai', { baseUrl })).toThrow(ImageError)
  })
  it('accepts the console REST endpoint and requests generation with exactly one path suffix', async () => {
    const s = await server()
    const spec = profile('bytedance', { baseUrl: `${s.baseUrl}/images/generations/`, model: 'doubao-seedream-5-0-pro-260628' })
    expect(spec.baseUrl).toBe(s.baseUrl)
    await generate('bytedance', spec, 'test-image-key', { prompt: 'A flower' })
    expect(s.calls[0].url).toBe('/v1/images/generations')
  })
  it('fetches only supported visible image models with one request and keeps stored configuration unchanged', async () => {
    const f = await fixture(); const s = await server()
    const before = await f.settings.describe()
    const result = await f.settings.models(saveInput('openai', s.baseUrl))
    expect(result).toEqual({ source: 'provider', canFetch: true, models: ['gpt-image-2.5-flare', DEFAULTS.openai.model] })
    expect(s.calls).toHaveLength(1); expect(s.calls[0]).toMatchObject({ method: 'GET', url: '/v1/models' })
    expect(await f.settings.describe()).toEqual(before)
    expect(JSON.stringify(result)).not.toContain('test-image-key')
    await f.settings.save(saveInput('openai', s.baseUrl))
    await f.settings.models({ ...saveInput('openai', s.baseUrl, 1), apiKey: '' })
    expect(s.calls.at(-1).auth).toBe('Bearer test-image-key')
    await expect(f.settings.models({ ...saveInput('openai', 'https://other.example/v1', 1), apiKey: '' })).rejects.toMatchObject({ code: 'KEY_REQUIRED' })
    await expect(f.settings.models(saveInput('bytedance', s.baseUrl, 1))).rejects.toMatchObject({ code: 'MODEL_DISCOVERY' })
    expect(s.calls).toHaveLength(3)
  })
  it('maps provider canvas parameters independently and bounds streamed responses', async () => {
    const args = { prompt: 'A mountain', aspect_ratio: '16:9' }
    expect(generationBody('openai', profile('openai'), args)).toMatchObject({ size: '1536x1024', output_format: 'png' })
    expect(generationBody('openai', profile('openai'), args)).not.toHaveProperty('response_format')
    expect(generationBody('bytedance', profile('bytedance'), args)).toMatchObject({ size: '2560x1440', response_format: 'b64_json' })
    expect(generationBody('bytedance', profile('bytedance'), args)).not.toHaveProperty('quality')
    await expect(readBounded(new Response('too much'), 2)).rejects.toMatchObject({ code: 'TOO_LARGE' })
  })
  it.each([...MODEL_CATALOG.bytedance.models, 'ep-custom'])('generates every supported aspect ratio with the single-image contract for %s', async model => {
    const s = await server()
    for (const aspect_ratio of ['1:1', '16:9', '9:16', '4:3', '3:4']) {
      expect(await generate('bytedance', { baseUrl: s.baseUrl, model }, 'test-image-key', { prompt: 'A flower', aspect_ratio })).toEqual(s.png)
    }
    expect(s.calls).toHaveLength(5)
  })
  it('reports the rejected parameter and request ID through ToolRuntime while keeping provider echoes private', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('bytedance', s.baseUrl))
    const original = globalThis.fetch
    const stub = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) => String(url).endsWith('/images/generations')
      ? Promise.resolve(Response.json({ error: { code: 'InvalidParameter', message: 'The parameter `sequential_image_generation` is not supported. Bearer test-image-key. PRIVATE-PROMPT' } }, { status: 400, headers: { 'x-request-id': 'req-123' } }))
      : original(url, options))
    f.ctx.tools.register(imageTool(f.services, f.settings))
    const result = await f.ctx.tools.execute({ callId: 'provider-error', name: 'image_generate', arguments: { prompt: 'PRIVATE-PROMPT' }, agent: f.agent, signal: new AbortController().signal })
    const text = JSON.stringify(result)
    expect(result.isError).toBe(true)
    for (const value of ['sequential_image_generation', 'unsupported', 'InvalidParameter', 'req-123', 'HTTP 400']) expect(text).toContain(value)
    for (const value of ['test-image-key', 'PRIVATE-PROMPT', 'Bearer']) {
      expect(text).not.toContain(value)
      expect(JSON.stringify(f.log.mock.calls)).not.toContain(value)
    }
    expect(JSON.stringify(f.log.mock.calls)).toContain('req-123')
    expect(stub).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 404, 429, 500])('preserves HTTP %s classification with private or malformed error bodies', async status => {
    const fetchImpl = vi.fn(async () => Response.json({ error: { code: 'private-key', param: 'private-key', message: 'private-key' }, request_id: 'private-key' }, { status }))
    try {
      await generate('openai', profile('openai'), 'private-key', { prompt: 'Flower' }, { fetchImpl })
      expect.unreachable()
    } catch (error) {
      expect(error.code).toBe(({ 401: 'AUTH', 403: 'PERMISSION', 404: 'MODEL', 429: 'QUOTA', 500: 'PROVIDER_ERROR' })[status])
      expect(error.message).toContain(`HTTP ${status}`)
      expect(error.message).not.toContain('private-key')
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it.each(['<html>Gateway error</html>', 'x'.repeat(65537)])('preserves provider status when the error response is invalid or oversized (%#)', async body => {
    await expect(generate('bytedance', profile('bytedance'), 'key', { prompt: 'Flower' }, { fetchImpl: async () => new Response(body, { status: 400 }) }))
      .rejects.toMatchObject({ code: 'PARAMETERS', providerStatus: 400 })
  })
})

describe('image tool and durable Office assets', () => {
  it('starts an Electron Host child in Node mode while keeping credentials and Node options outside the writer', () => {
    const env = { ELECTRON_RUN_AS_NODE: '0', NODE_OPTIONS: '--require secret.js', API_KEY: 'private-key', PATH: '/host/bin' }
    expect(writerEnvironment({ env, platform: 'darwin', versions: { electron: '43.4.0' } })).toEqual({
      ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: undefined, API_KEY: undefined, PATH: undefined,
    })
    expect(writerEnvironment({ env, platform: 'darwin', versions: { node: '24.9.0' } }).ELECTRON_RUN_AS_NODE).toBeUndefined()
  })
  it.each(['openai', 'bytedance'])('executes %s through ToolRuntime and writes a verifiable PNG', async provider => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput(provider, s.baseUrl))
    f.ctx.tools.register(imageTool(f.services, f.settings))
    const result = await f.ctx.tools.execute({ callId: 'test-call', name: 'image_generate', arguments: { prompt: 'A calm forest', purpose: 'presentation', aspect_ratio: '16:9' }, agent: f.agent, signal: new AbortController().signal })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    const value = JSON.parse(result.content[0].text)
    const data = await readFile(path.join(f.workspace, value.workspace_path))
    expect(createHash('sha256').update(data).digest('hex')).toBe(value.sha256)
    expect(await sharp(data).metadata()).toMatchObject({ format: 'png', width: value.width, height: value.height, hasAlpha: true })
    expect(s.calls.filter(call => call.body?.prompt)).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain('test-image-key')
  })
  it('blocks a read-only workspace and symlink escape before the paid request', async () => {
    const f = await fixture(); const s = await server()
    await f.settings.save(saveInput('openai', s.baseUrl))
    const tool = imageTool(f.services, f.settings)
    f.setMode('read-only')
    await expect(tool.execute({ prompt: 'Forest' }, { agent: f.agent })).rejects.toMatchObject({ code: 'POLICY' })
    f.setMode('workspace-write')
    const outside = await temp(); await symlink(outside, path.join(f.workspace, '.workbuddy'))
    await expect(tool.execute({ prompt: 'Forest' }, { agent: f.agent })).rejects.toMatchObject({ code: 'ASSET_PATH' })
    expect(s.calls).toHaveLength(1); expect(await readdir(outside)).toEqual([])
  })
  it('commits identical assets concurrently, rejects target symlinks, and rejects damaged images', async () => {
    const workspace = await temp(); const s = await server(); const image = await normalizeImage(s.png)
    const values = await Promise.all([materialize(workspace, image.data), materialize(workspace, image.data)])
    expect(values[0]).toEqual(values[1])
    expect(await readdir(path.dirname(path.join(workspace, values[0].workspace_path)))).toHaveLength(1)
    const target = path.join(workspace, values[0].workspace_path)
    await rm(target); await symlink(path.join(workspace, 'absent'), target)
    await expect(materialize(workspace, image.data)).rejects.toThrow()
    await expect(normalizeImage(Buffer.from('not a PNG'))).rejects.toMatchObject({ code: 'IMAGE' })
  })
  it('registers standard routes and executes with saved configuration while honoring deployment guards', async () => {
    const f = await fixture(); const routes = []
    const plugin = f.ctx.plugin({ inject: ['settings', 'skills', 'systemPrompt', 'tools'], apply: ctx => apply({
      ...f.services, settings: ctx.settings, skills: ctx.skills, systemPrompt: ctx.systemPrompt, tools: ctx.tools,
      on: ctx.on.bind(ctx), connection: { fetch: { register: route => routes.push(route) } },
    }) })
    await plugin; cleanups.push(() => plugin.dispose())
    expect(f.ctx.settings.describe().map(entry => entry.ns)).toContain('image-generation')
    expect(routes.map(route => route.path)).toEqual(['/api/image-generation.settings', '/api/image-generation.save', '/api/image-generation.models', '/api/image-generation.preview'])
    const response = await routes[0].fetch(new Request('http://localhost/api/image-generation.settings'))
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await response.json()).profiles.openai.configured).toBe(false)
    const provider = await server()
    await f.settings.save(saveInput('bytedance', provider.baseUrl))
    const result = await f.ctx.tools.execute({ callId: 'direct', name: 'image_generate', arguments: { prompt: 'Forest' }, agent: f.agent, signal: new AbortController().signal })
    expect(result.isError, JSON.stringify(result)).toBeFalsy()
    expect(provider.calls).toHaveLength(2)
    const dispose = f.ctx.tools.guard(exec => exec.name === 'image_generate' ? 'Deployment blocks image generation' : undefined)
    const denied = await f.ctx.tools.execute({ callId: 'denied', name: 'image_generate', arguments: { prompt: 'Forest' }, agent: f.agent, signal: new AbortController().signal })
    dispose()
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied)).toContain('Deployment blocks image generation')
    expect(provider.calls).toHaveLength(2)
  })
})


describe('session-authorized generated image previews', () => {
  async function previewFixture(id = `session-${randomUUID()}`) {
    const workspace = await temp()
    const png = await sharp({ create: { width: 16, height: 9, channels: 4, background: '#112233' } }).png().toBuffer()
    const asset = await materialize(workspace, png)
    const image = { ...asset, asset_id: `sha256:${asset.sha256}`, media_type: 'image/png', width: 16, height: 9, bytes: png.length, provider: 'bytedance', model: DEFAULTS.bytedance.model }
    const content = [{ type: 'text', text: JSON.stringify(image) }]
    const events = [{ type: 'tool/call', data: { callId: 'image-call', name: 'image_generate' } },
      { type: 'tool/result', surfaceOp: 'append', data: { message: { source: { callId: 'image-call' }, content: [{ type: 'tool-result', content }] } } }]
    const log = vi.fn()
    const ctx = { sessionController: { inspect: vi.fn(async session => ({ meta: { cwd: workspace }, events: session === id ? events : [] })) }, logger: { info: log } }
    const request = (session = id, sha = image.sha256) => new Request(`http://localhost/api/image-generation.preview?${new URLSearchParams({ session, asset: sha })}`)
    return { workspace, png, image, id, content, events, ctx, request, target: path.join(workspace, image.workspace_path) }
  }
  it('serves historical successful PNGs with integrity, cache, content-type and audit checks', async () => {
    const f = await previewFixture()
    const result = await previewImage(f.ctx, f.request())
    expect(result.status).toBe(200)
    expect(Buffer.from(await result.arrayBuffer())).toEqual(f.png)
    expect(result.headers.get('content-type')).toBe('image/png')
    expect(result.headers.get('cache-control')).toBe('no-store')
    expect(result.headers.get('x-content-type-options')).toBe('nosniff')
    expect(f.ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining('preview allowed'), f.id, f.image.sha256)
  })
  it.each([randomUUID(), 'session-1', 'imported:landscape'])('resolves the opaque Harness session ID %s', async id => {
    const f = await previewFixture(id)
    const result = await previewImage(f.ctx, f.request())
    expect(result.status).toBe(200)
    expect(Buffer.from(await result.arrayBuffer())).toEqual(f.png)
    expect(f.ctx.sessionController.inspect).toHaveBeenCalledWith(id, expect.any(AbortSignal))
  })
  it('requires a successful image tool result in the requested session', async () => {
    const f = await previewFixture()
    expect((await previewImage(f.ctx, f.request(randomUUID()))).status).toBe(404)
    expect((await previewImage(f.ctx, f.request(f.id, 'a'.repeat(64)))).status).toBe(404)
    f.events[0].data.name = 'other_tool'
    expect((await previewImage(f.ctx, f.request())).status).toBe(404)
    f.events[0].data.name = 'image_generate'
    f.events[1].data.message.content[0].isError = true
    expect((await previewImage(f.ctx, f.request())).status).toBe(404)
    f.events.splice(0, 2, { type: 'tool/code-dispatch', data: { name: 'image_generate', subCallId: 'ptc', content: f.content } })
    expect((await previewImage(f.ctx, f.request())).status).toBe(200)
  })
  it('validates query bounds and resolves session identity through the Host', async () => {
    const f = await previewFixture()
    for (const id of ['', 'a'.repeat(1025), 'session-\u0000']) {
      expect((await previewImage(f.ctx, f.request(id))).status).toBe(400)
    }
    expect((await previewImage(f.ctx, f.request(f.id, '../secret'))).status).toBe(400)
    expect(f.ctx.sessionController.inspect).not.toHaveBeenCalled()
    expect((await previewImage(f.ctx, f.request('../outside'))).status).toBe(404)
    expect(f.ctx.sessionController.inspect).toHaveBeenCalledWith('../outside', expect.any(AbortSignal))
    expect(imageResult([null, { type: 'text', text: 'broken' }])).toBeUndefined()
    for (const change of [{ bytes: -1 }, { bytes: 1000000000 }, { workspace_path: '/etc/passwd' }, { media_type: 'text/html' }, { asset_id: 'wrong' }]) {
      expect(imageResult([{ type: 'text', text: JSON.stringify({ ...f.image, ...change }) }])).toBeUndefined()
    }
  })
  it('refuses changed files, target symlinks and linked parent directories', async () => {
    const f = await previewFixture()
    await writeFile(f.target, Buffer.alloc(f.png.length))
    expect((await previewImage(f.ctx, f.request())).status).toBe(404)
    await rm(f.target)
    const outside = path.join(await temp(), 'image.png'); await writeFile(outside, f.png)
    await symlink(outside, f.target)
    expect((await previewImage(f.ctx, f.request())).status).toBe(404)
    await rm(path.dirname(f.target), { recursive: true })
    await symlink(path.dirname(outside), path.dirname(f.target))
    expect((await previewImage(f.ctx, f.request())).status).toBe(404)
  })
})

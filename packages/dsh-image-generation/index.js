import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { createSettings } from './lib/settings.js'
import { generate, readBounded, safeError } from './lib/provider.js'
import { assetDirectory, normalizeImage, workspaceFor } from './lib/assets.js'
import { commitImage, writerPlan } from './lib/commit.js'
import { previewImage } from './lib/preview.js'

export const name = 'dsh-image-generation'
export const inject = ['settings', 'credentials', 'connection', 'tools', 'skills', 'systemPrompt', 'sandboxPolicy', 'sandbox', 'subprocess', 'sessionController']
export const Config = z.object({})

export function imageTool(ctx, settings) {
  return defineTool({
    name: 'image_generate',
    description: 'Generate one photo, illustration or background through the configured image provider and save an Office-compatible PNG in the session workspace. Load the generate-image Skill first. Keep charts, tables and simple diagrams editable.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Visual subject, composition, palette, lighting, and space for document or slide text.' },
      style_context: { type: 'string', description: 'Shared brand, template and illustration style for consistency across the document.' },
      purpose: { type: 'string', enum: ['general', 'presentation', 'document', 'web', 'marketing'] },
      aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3', '3:4'], description: 'Target composition; actual dimensions are returned. OpenAI uses its closest supported canvas.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: {
        asset_id: { type: 'string', required: true }, workspace_path: { type: 'string', required: true },
        media_type: { type: 'string', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true },
        bytes: { type: 'integer', required: true }, sha256: { type: 'string', required: true },
        provider: { type: 'string', required: true }, model: { type: 'string', required: true },
      } },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    timeoutMs: 240_000,
    isConcurrencySafe: () => true,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Generate image', rawInput: args }),
    async execute(args, exec) {
      try {
        const root = await workspaceFor(ctx, exec)
        await assetDirectory(root)
        writerPlan(ctx, root, exec)
        const spec = await settings.active()
        ctx.logger.info('image-generation: generation started; provider=%s model=%s', spec.provider, spec.model)
        const raw = await generate(spec.provider, spec, spec.key, args, { signal: exec.signal })
        const image = await normalizeImage(raw)
        // Recheck live session permissions after a potentially long provider call.
        if (await workspaceFor(ctx, exec) !== root) throw new Error('workspace changed')
        const asset = await commitImage(ctx, root, image.data, exec)
        ctx.logger.info('image-generation: generation saved; provider=%s sha256=%s', spec.provider, asset.sha256)
        return { ...asset, asset_id: `sha256:${asset.sha256}`, media_type: 'image/png', width: image.width, height: image.height, bytes: image.data.length, provider: spec.provider, model: spec.model }
      } catch (error) {
        const safe = safeError(error)
        ctx.logger.info('image-generation: generation failed; code=%s http=%s provider_code=%s parameter=%s request_id=%s', safe.code, safe.providerStatus, safe.providerCode, safe.parameter, safe.requestId)
        throw safe
      }
    },
  })
}

export async function apply(ctx) {
  // The card is discovered through the standard settings namespace ledger.
  // Endpoint/model/key are committed together by the credential provider, so a
  // failed save cannot pair an old key with a newly persisted endpoint.
  ctx.settings.register('image-generation', Config, { applies: 'live' })
  const settings = createSettings(ctx)
  for (const [suffix, method] of [['settings', 'GET'], ['save', 'POST'], ['models', 'POST']]) {
    ctx.connection.fetch.register({ path: `/api/image-generation.${suffix}`, methods: [method], async fetch(request) {
      try {
        const value = method === 'GET' ? await settings.describe() : await settings[suffix](
          JSON.parse((await readBounded(request, 16_384, request.signal)).toString('utf8')), request.signal,
        )
        return Response.json(value, { headers: { 'Cache-Control': 'no-store' } })
      } catch (error) {
        const safe = safeError(error)
        return Response.json({ code: safe.code, error: safe.message }, { status: safe.status, headers: { 'Cache-Control': 'no-store' } })
      }
    } })
  }
  ctx.tools.register(imageTool(ctx, settings))
  ctx.connection.fetch.register({ path: '/api/image-generation.preview', methods: ['GET'], fetch: request => previewImage(ctx, request) })
  const locator = new URL('./skills/generate-image/SKILL.md', import.meta.url)
  const candidate = {
    name: 'generate-image', description: 'Create reusable photos, illustrations and backgrounds for presentations, documents and other image requests with the configured image_generate tool.',
    invocation: { modelInvocable: true, userInvocable: true }, provider: name, source: 'bundled', rank: BUNDLED_SKILL_RANK,
    locator, resourceBase: { kind: 'directory', path: fileURLToPath(new URL('.', locator)) },
  }
  ctx.skills.registerProvider(() => ({ name, list: async () => [candidate], get: async selected => selected.name === candidate.name
    ? { ...candidate, content: (await readFile(locator, 'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim() } : undefined }))
  ctx.systemPrompt.section({ name: 'tool:image-generation', order: 114, text: () => 'For image creation, load the generate-image Skill and call image_generate. Reuse its PNG workspace path in PPT and Word. The user configures this shared capability in Settings > Plugins > Image generation.' })
}

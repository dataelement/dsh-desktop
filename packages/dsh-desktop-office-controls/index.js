import { join, isAbsolute } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { OfficeController, OFFICE_PACKAGES, OFFICE_CONTEXTS, isOfficeTool } from './controller.js'

export const name = 'dsh-desktop-office-controls'
export const inject = ['loader', 'agents', 'tools', 'connection', 'appReady', 'clientModules']
export const Config = z.object({ root: z.string().required() })
export const API_PATH = '/dsh-desktop/office'

/** Compose the effective preference before a live Include recreates its entries. */
export function officeIncludeConfig(owner, config, enabled) {
  if (enabled || !owner?.subtree || !Array.isArray(config?.patches)) return config
  const patches = [...owner.subtree.entries()]
    .filter(entry => OFFICE_PACKAGES.has(entry.options.name))
    .map(entry => ({ id: entry.options.id, name: entry.options.name, disabled: true }))
  return patches.length ? { ...config, patches: [...config.patches, ...patches] } : config
}

/** Retire derived instructions while keeping the source transcript and artifacts. */
export function clearOfficeContext(agent) {
  for (const seq of [...agent.session.surface.nodes]) {
    const event = agent.session.eventAt(seq)
    const source = event?.data?.source
    if (event?.type !== 'user/message' || source?.kind !== 'plugin' || source.form !== 'snapshot' || !OFFICE_CONTEXTS.has(source.plugin)) continue
    agent.session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'Office 办公已停用，当前任务按普通对话继续。' }],
      source: { kind: 'plugin', plugin: 'dsh-desktop-office-controls' }
    }), { surfaceOp: { op: 'replace', startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq] })
  }
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

export function apply(ctx, config) {
  if (!isAbsolute(config.root)) throw new Error('Office controls require an absolute settings root')
  let removeStepListener
  const bindStepListener = () => {
    removeStepListener?.()
    // Register after feature imports so this outer listener settles their
    // captured callbacks before a pending transition disposes those fibers.
    removeStepListener = ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
      const decision = await next()
      await controller.beforeStep(agent, signal)
      if (controller.applied || decision.kind === 'reject') return decision
      clearOfficeContext(agent)
      return { ...decision, messages: decision.messages.filter(message =>
        message.source?.kind !== 'plugin' || !OFFICE_CONTEXTS.has(message.source.plugin)) }
    }, { prepend: true })
  }
  const controller = new OfficeController({
    file: join(config.root, 'settings.json'), entries: () => ctx.loader.entries(),
    agents: () => ctx.agents.list(), owns: (child, parent) => ctx.agents.isOwnedBy(child.id, parent),
    report: error => ctx.logger.warn(error), afterApply: bindStepListener
  })
  ctx.provide('desktopOfficeControls', controller)
  // Include resolves config on each update. Preserve the effective disabled
  // state before that update can recreate Office fibers from bundled rows.
  ctx.on('internal/config', function (_config, next) {
    return officeIncludeConfig(this.entry, next(), controller.applied)
  }, { global: true })
  // Readiness includes the initial user-patch watcher scan, which may compose
  // the root a second time after the first Loader await has already settled.
  ctx.effect(() => {
    let disposed = false
    const cancelReady = ctx.appReady.onReady(() => {
      controller.initializing = (async () => {
        try {
          await ctx.loader.await()
          if (!disposed) await controller.initialize()
        } catch (error) {
          controller.phase = 'error'
          controller.error = error.message
          ctx.logger.warn(error)
        }
      })()
    })
    return async () => {
      disposed = true
      cancelReady()
      await controller.initializing
      await controller.operation
    }
  }, 'Office settings: initial reconciliation and ordered teardown')
  ctx.tools.guard(exec => isOfficeTool(exec.name) && !controller.allows(exec.agent)
    ? 'Office 办公已停用；可在设置 → 插件中启用。' : undefined)
  ctx.on('tools/execute', async (exec, next) => {
    if (!isOfficeTool(exec.name)) return next()
    const finish = controller.trackCall()
    try { return await next() } finally { finish() }
  })
  ctx.inject(['webServer'], webCtx => webCtx.effect(() => webCtx.webServer.register({
    kind: 'exact', path: API_PATH,
    async handler(req, res) {
      const rejection = webCtx.connection.requestRejection(req)
      if (rejection !== undefined) return json(res, rejection, { error: 'Request rejected' })
      if (req.method === 'GET') {
        const clients = new URL(req.url, 'http://localhost').searchParams.get('clients') === '1'
        return json(res, 200, clients ? webCtx.clientModules.graph() : controller.state())
      }
      if (req.method !== 'POST') return json(res, 405, { error: 'Use GET or POST' })
      if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return json(res, 415, { error: 'Use application/json' })
      }
      const chunks = []
      let bytes = 0
      for await (const chunk of req) {
        bytes += chunk.length
        if (bytes > 1024) return json(res, 413, { error: 'Request exceeds 1024 bytes' })
        chunks.push(chunk)
      }
      let payload
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch {
        return json(res, 400, { error: 'Invalid JSON' })
      }
      if (!payload || Object.keys(payload).length !== 1 || typeof payload.enabled !== 'boolean') {
        return json(res, 400, { error: 'Provide one boolean enabled field' })
      }
      try { json(res, 200, await controller.setEnabled(payload.enabled)) } catch (error) {
        json(res, 409, { error: error.message })
      }
    }
  }), 'desktop Office controls: authenticated settings route'))
}

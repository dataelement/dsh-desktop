import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { listOfficeTemplates, officeTemplatePreview } from './templates.js'

const PLUGIN = 'dsh-office-composer'
const CONTEXT_SOURCES = new Set([PLUGIN, 'workbuddy-office-composer'])
export const selectedMode = state => state.documentMode ?? (state.presentationMode === 'ppt' ? 'ppt' : null)

const matches = (source, names) => source?.form === 'snapshot' && source.sections.length === names.length && source.sections.every((section, i) => section.name === names[i])

function clearPreviousContext(agent, names, sections) {
  const session = agent.session
  for (const seq of [...session.surface.nodes]) {
    const event = session.eventAt(seq)
    const source = event?.data?.source
    if (event?.type !== 'user/message' || source?.kind !== 'plugin' || !CONTEXT_SOURCES.has(source.plugin) || source.form !== 'snapshot') continue
    if (source.plugin === PLUGIN && matches(source, names) && (!sections || source.sections.every((section, i) => section.text === sections[i].text))) continue
    session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '输出格式已按当前会话选择更新。' }],
      source: { kind: 'plugin', plugin: 'dsh-office-context-updated' } }), { surfaceOp: { op: 'replace', startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq] })
  }
}

export function registerOfficeModes(ctx) {
  const modes = ctx.officeModes
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.connection.rpc.handle('/dsh-office', async (endpoint, payload) => {
      try {
        const sessionId = payload?.sessionId
        if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512) throw new Error('Choose an active session')
        if (endpoint === 'mode') {
          if (![null, 'word', 'excel'].includes(payload.mode)) throw new Error('Choose Word, Excel or ordinary conversation')
          await modes.select(sessionId, payload.mode)
        } else if (endpoint === 'template/preview') {
          return { ok: true, value: { status: 'ok', data: await officeTemplatePreview(payload.templateId, payload.page) } }
        } else if (endpoint !== 'state') throw new Error('Unknown Office mode operation')
        const state = await modes.state(sessionId)
        const templates = await listOfficeTemplates()
        return { ok: true, value: { status: 'ok', data: { sessionId, mode: selectedMode(state), templates } } }
      } catch (error) {
        return { ok: true, value: { status: 'error', error: { code: 'invalid-request', message: error.message } } }
      }
    }, { authority: 'trusted-host' })
  })
  ctx.on('agent/pre-step', async ({ agent, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    const state = await modes.state(agent.id), mode = selectedMode(state)
    const names = (mode === 'word' || mode === 'excel') ? [`dsh-${mode}`] : []
    if (step !== 1 || (mode !== 'word' && mode !== 'excel')) {
      clearPreviousContext(agent, names)
      return decision
    }
    const name = `dsh-${mode}`
    const skill = await ctx.skills.get(name, { cwd: agent.session.header.cwd, signal, scope: agent })
    if (!skill) throw new Error(`The selected output format requires ${name}`)
    signal.throwIfAborted()
    const sections = [{ name, text: `当前会话输出格式：${mode === 'word' ? 'Word (.docx)' : 'Excel (.xlsx)'}。该选择来自应用界面。按以下 Skill 使用受治理的 Office 工具完成创建、修改、检查和交付。\n\n${renderSkillContent(skill)}` }]
    clearPreviousContext(agent, names, sections)
    const active = agent.session.deriveMessages().some(message => message.role === 'user' && message.source?.kind === 'plugin'
      && message.source.plugin === PLUGIN && matches(message.source, names))
    if (active) return decision

    const text = sections.map(section => section.text).join('\n\n')
    return { kind: 'enter', messages: [...decision.messages, createUserMessage({ content: [{ type: 'text', text }],
      source: { kind: 'plugin', plugin: PLUGIN, form: 'snapshot', sections } })] }
  }, { prepend: true })
}

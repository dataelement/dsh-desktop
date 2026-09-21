import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { listOfficeTemplates, officeTemplate, officeTemplatePreview } from './templates.js'
import { registerHostRpcChannel } from './host-rpc.js'

const PLUGIN = 'dsh-office-composer'
const CONTEXT_SOURCES = new Set([PLUGIN, 'workbuddy-office-composer'])
export const selectedMode = state => state.documentMode ?? (state.presentationMode === 'ppt' ? 'ppt' : null)

function selectedOfficeTemplate(state) {
  const selection = state.selectedDocumentTemplate
  if (!selection || selection.mode !== selectedMode(state)) return null
  try {
    const template = officeTemplate(selection.id)
    return (template.mode ?? 'word') === selection.mode && template.revision === selection.revision ? template : null
  } catch {
    return null
  }
}

function selectedTemplateContext(template) {
  const mode = template.mode ?? 'word'
  const route = template.authoringFile
    ? `使用 office_template 返回的 ${template.authoringFile.endsWith('.py') ? 'Python/openpyxl' : 'JavaScript/docx'} authoring 源码和已校验输入作为同款基线。`
    : `使用 office_template 返回的原生 ${mode === 'word' ? 'DOCX' : 'XLSX'} 工作副本和设计说明，在现有编辑能力范围内保留版式与结构。`
  return [
    '权威 Office 案例选择。该状态来自应用界面的“做同款”，属于宿主状态，不是用户输入的提示词。',
    `selected_template_id: ${template.id}`,
    `selected_template_revision: ${template.revision}`,
    `selected_template_title: ${template.title}`,
    `selected_template_mode: ${mode}`,
    `selected_template_category: ${template.category}`,
    `selected_template_description: ${template.description}`,
    ...(template.businessSkill ? [`required_business_skill: ${template.businessSkill}`, `业务方法：调用 skill(name="${template.businessSkill}") 加载当前案例指定的业务 Skill。`] : []),
    `执行要求：开始制作前先调用 office_template(template_id="${template.id}")。${route}`,
    '参考范围：仅参考案例的版式、视觉语言、章节或工作表结构。使用当前用户材料填写全部内容，并执行对应检查与预览。'
  ].join('\n')
}

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
  const handle = async (endpoint, payload) => {
    try {
      const sessionId = payload?.sessionId
      if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512) throw new Error('Choose an active session')
      if (endpoint === 'mode') {
        if (![null, 'word', 'excel'].includes(payload.mode)) throw new Error('Choose Word, Excel or ordinary conversation')
        await modes.select(sessionId, payload.mode)
      } else if (endpoint === 'template/select') {
        const template = officeTemplate(payload.templateId)
        const state = await modes.state(sessionId)
        const mode = template.mode ?? 'word'
        if (selectedMode(state) !== mode) throw new Error('Choose the matching Word or Excel format before using this example')
        await modes.selectTemplate(sessionId, { id: template.id, mode, revision: template.revision })
      } else if (endpoint === 'template/deselect') {
        await modes.deselectTemplate(sessionId)
      } else if (endpoint === 'template/preview') {
        return { ok: true, value: { status: 'ok', data: await officeTemplatePreview(payload.templateId, payload.page) } }
      } else if (endpoint !== 'state') throw new Error('Unknown Office mode operation')
      const state = await modes.state(sessionId)
      const templates = await listOfficeTemplates()
      const selected = selectedOfficeTemplate(state)
      return { ok: true, value: { status: 'ok', data: { sessionId, mode: selectedMode(state), templates,
        ...(selected ? { selectedTemplateId: selected.id, selectedTemplateRevision: selected.revision } : {}) } } }
    } catch (error) {
      return { ok: true, value: { status: 'error', error: { code: 'invalid-request', message: error.message } } }
    }
  }
  registerHostRpcChannel(ctx, '/dsh-office', handle)
  ctx.on('agent/pre-step', async ({ agent, step, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    const state = await modes.state(agent.id), mode = selectedMode(state)
    const template = selectedOfficeTemplate(state)
    const names = (mode === 'word' || mode === 'excel') ? [`dsh-${mode}`, ...(template ? [`office-template:${template.id}@${template.revision}`] : [])] : []
    if (step !== 1 || (mode !== 'word' && mode !== 'excel')) {
      clearPreviousContext(agent, names)
      return decision
    }
    const name = `dsh-${mode}`
    const skill = await ctx.skills.get(name, { cwd: agent.session.header.cwd, signal, scope: agent })
    if (!skill) throw new Error(`The selected output format requires ${name}`)
    signal.throwIfAborted()
    const sections = [
      { name, text: `当前会话输出格式：${mode === 'word' ? 'Word (.docx)' : 'Excel (.xlsx)'}。该选择来自应用界面。按以下 Skill 使用受治理的 Office 工具完成创建、修改、检查和交付。\n\n${renderSkillContent(skill)}` },
      ...(template ? [{ name: `office-template:${template.id}@${template.revision}`, text: selectedTemplateContext(template) }] : [])
    ]
    clearPreviousContext(agent, names, sections)
    const active = agent.session.deriveMessages().some(message => message.role === 'user' && message.source?.kind === 'plugin'
      && message.source.plugin === PLUGIN && matches(message.source, names))
    if (active) return decision

    const text = sections.map(section => section.text).join('\n\n')
    return { kind: 'enter', messages: [...decision.messages, createUserMessage({ content: [{ type: 'text', text }],
      source: { kind: 'plugin', plugin: PLUGIN, form: 'snapshot', sections } })] }
  }, { prepend: true })
}

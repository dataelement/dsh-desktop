import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { clientRequestSchema } from '@deepseek-ai/dsh-client-connection'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'

const PLUGIN = 'dsh-desktop-office-composer'
const sourcePlugin = source => source?.plugin ?? source?.kind?.replace(/^plugin:/, '')
const businessNames = template => template?.businessSkills ?? (template?.businessSkill ? [template.businessSkill] : [])
export function selectedTemplate(library, state) {
  const selected = state.selectedDocumentTemplate
  if (!selected || selected.mode !== state.documentMode) return null
  try {
    const item = library.entry(selected.id)
    return item.mode === selected.mode && item.revision === selected.revision ? item : null
  } catch { return null }
}

/** Versioned Host state selects the workflow; source material stays in the task. */
export function templateContext(template) {
  return [
    `当前界面所选 Office 案例：${template.title}。`,
    `selected_template_id: ${template.id}`, `selected_template_revision: ${template.revision}`,
    `先调用 office_template(template_id="${template.id}")，再用 ${template.mode === 'word' ? 'office_template_write 按返回的 editable_paragraphs 编排并替换内容，生成新的 DOCX' : 'office-xlsx 处理返回的原生工作副本'}。`,
    ...(template.mode === 'word' ? ['Word 的原生页面、样式、嵌入字体、版头、分隔线和页脚由所选模板提供。使用 office_template_write 的 replacements / additions / removals 填写当前内容，发文机关版头使用当前机构名称；present 时宿主会核对模板版式。'] : []),
    '案例提供版式、章节、工作表与图表结构。当前用户材料提供全部事实、数值和结论；模板中的示例数据属于参考材料。',
    ...(businessNames(template).length ? [`业务方法使用 ${businessNames(template).join('、')}。`] : [])
  ].join('\n')
}

export function registerOfficeContext(ctx, library, modes) {
  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted) return decision
    const state = await modes.state(agent.id)
    const mode = state.documentMode
    const template = selectedTemplate(library, state)
    if (state.selectedDocumentTemplate && !template && ['word', 'excel'].includes(mode)) throw new Error('Selected Office template revision requires a new selection')
    const names = ['word', 'excel'].includes(mode)
      ? [mode, ...(template ? [`${template.id}@${template.revision}`] : [])] : []
    const fingerprint = names.join(':')
    let active = false
    for (const seq of [...agent.session.surface.nodes]) {
      const event = agent.session.eventAt(seq)
      if (event?.type !== 'user/message' || sourcePlugin(event.data?.source) !== PLUGIN) continue
      if (event.data.source.sections?.[0]?.name === fingerprint && fingerprint) { active = true; continue }
      agent.session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '输出格式已按当前会话选择更新。' }],
        source: { kind: 'plugin:dsh-desktop-office-updated', plugin: 'dsh-desktop-office-updated' } }),
      { surfaceOp: { op: 'replace', startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq] })
    }
    if (!fingerprint || active) return decision
    const foundation = await ctx.skills.get(mode === 'word' ? 'office-docx' : 'office-xlsx', { cwd: agent.session.header.cwd, scope: agent, signal })
    if (!foundation) throw new Error('The official Office skill is unavailable')
    const sections = [{ name: fingerprint, text: `当前输出格式：${mode === 'word' ? 'Word DOCX' : 'Excel XLSX'}。\n\n${renderSkillContent(foundation)}` }]
    if (template) sections.push({ name: 'office-template', text: templateContext(template) })
    for (const name of businessNames(template)) {
      const skill = await ctx.skills.get(name, { cwd: agent.session.header.cwd, scope: agent, signal })
      if (!skill) throw new Error('The selected business skill is unavailable')
      sections.push({ name: skill.name, text: renderSkillContent(skill) })
    }
    return { kind: 'enter', messages: [...decision.messages, createUserMessage({ content: [{ type: 'text', text: sections.map(x => x.text).join('\n\n') }],
      source: { kind: `plugin:${PLUGIN}`, plugin: PLUGIN, form: 'snapshot', sections } })] }
  }, { prepend: true })
}

/** The authenticated Connection owns request admission and cancellation. */
export function registerOfficeRoutes(ctx, library, modes) {
  const execute = async (endpoint, payload, signal) => {
      try {
        signal?.throwIfAborted()
        if (!payload || JSON.stringify(payload).length > 16384) throw new Error('Use a bounded Office request')
        const { sessionId } = payload
        const ok = value => ({ ok: true, value })
        if (endpoint === 'preview') {
          if (payload.revision !== library.entry(payload.templateId).revision) throw new Error('The example was updated; reload the catalogue')
          return ok(await library.preview(payload.templateId, payload.page))
        }
        if (endpoint === 'catalog' || (endpoint === 'state' && !sessionId)) return ok({ templates: await library.list(), mode: null })
        if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512) throw new Error('Choose an active session')
        if (!modes) throw new Error('The document composer service is unavailable')
        if (endpoint === 'mode') await modes.select(sessionId, payload.mode)
        else if (endpoint === 'select') {
          const template = library.entry(payload.templateId)
          if (payload.revision !== template.revision) throw new Error('The example was updated; reload the catalogue')
          await modes.selectTemplate(sessionId, { id: template.id, mode: template.mode, revision: template.revision })
        } else if (endpoint === 'deselect') await modes.deselectTemplate(sessionId)
        else if (endpoint !== 'state') throw new Error('Unknown Office operation')
        const state = await modes.state(sessionId)
        const selected = selectedTemplate(library, state)
        return ok({ sessionId, mode: state.documentMode ?? null, presentationMode: state.presentationMode ?? null, templates: await library.list(),
          selectedTemplateId: selected?.id ?? null, selectionExpired: !!state.selectedDocumentTemplate && !selected })
      } catch (error) {
        return { ok: false, error: { code: 'office-request', message: error instanceof Error ? error.message : 'Office request failed', details: {} } }
      }
  }
  ctx.connection.fetch.register({ path: '/api/office-templates', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      const raw = await request.text()
      if (raw.length > 16384) return new Response('Office request is too large', { status: 413 })
      let message
      try { message = clientRequestSchema.parse(JSON.parse(raw)) } catch { return new Response('Use a valid Office request', { status: 400 }) }
      const result = message.method === 'office-templates'
        ? await execute(message.payload?.endpoint, message.payload, request.signal)
        : { ok: false, error: { code: 'office-request', message: 'Choose an Office operation', details: {} } }
      return Response.json({ type: 'server-response', rpcId: message.rpcId, result }, { headers: { 'Cache-Control': 'no-store' } })
    }
  })
}

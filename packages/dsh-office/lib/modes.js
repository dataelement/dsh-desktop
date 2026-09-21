import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderSkillContent } from '@deepseek-ai/dsh-skill'
import { z } from 'zod'
import { listOfficeTemplates, officeTemplate, officeTemplatePreview } from './templates.js'

const EMPTY_OFFICE_STATE = Object.freeze({ mode: null, selectedTemplate: null })
const officeTemplateSelectionSchema = z.object({
  id: z.string(),
  mode: z.enum(['word', 'excel']),
  revision: z.string()
})
const officeStateSchema = z.object({
  mode: z.enum(['word', 'excel']).nullable(),
  selectedTemplate: officeTemplateSelectionSchema.nullable()
})

const stripFrontmatter = content => content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, '').trim()
const bundledSkills = Object.fromEntries(['word', 'excel'].map(mode => {
  const name = `dsh-${mode}`
  const resourceBase = new URL(`../skills/${name}/`, import.meta.url)
  return [mode, renderSkillContent({
    name,
    provider: 'dsh-office',
    resourceBase: { kind: 'directory', path: fileURLToPath(resourceBase) },
    content: stripFrontmatter(readFileSync(new URL('SKILL.md', resourceBase), 'utf8'))
  })]
}))

export function officeState(ctx, session) {
  return ctx.sessionProjections.stateOf(session, 'office') ?? EMPTY_OFFICE_STATE
}

function selectedOfficeTemplate(state) {
  const selection = state.selectedTemplate
  if (!selection || selection.mode !== state.mode) return null
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
    `执行要求：开始制作前先调用 office_template(template_id="${template.id}")。${route}`,
    '参考范围：仅参考案例的版式、视觉语言、章节或工作表结构。使用当前用户材料填写全部内容，并执行对应检查与预览。'
  ].join('\n')
}

function contextForState(state) {
  if (state.mode !== 'word' && state.mode !== 'excel') return ''
  const template = selectedOfficeTemplate(state)
  return [
    `当前会话输出格式：${state.mode === 'word' ? 'Word (.docx)' : 'Excel (.xlsx)'}。该选择来自应用界面。按以下 Skill 使用受治理的 Office 工具完成创建、修改、检查和交付。\n\n${bundledSkills[state.mode]}`,
    ...(template ? [selectedTemplateContext(template)] : [])
  ].join('\n\n')
}

function appendState(session, state) {
  session.append('office/mode', state)
}

export function registerOfficeModes(ctx) {
  ctx.sessionProjections.register({
    key: 'office',
    stateVersion: 1,
    stateSchema: officeStateSchema,
    init: () => EMPTY_OFFICE_STATE,
    apply: (state, event) => event.type === 'office/mode' ? event.data : state
  })

  ctx.systemPrompt.context({
    name: 'office:mode',
    order: 125,
    text: context => context.agent ? contextForState(officeState(ctx, context.agent.session)) : ''
  })

  const handle = async (endpoint, payload) => {
    try {
      const sessionId = payload?.sessionId
      if (typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 512) throw new Error('Choose an active session')
      const session = ctx.sessions.get(sessionId)
      if (!session) throw new Error('Choose an active session')
      const current = officeState(ctx, session)
      if (endpoint === 'mode') {
        if (![null, 'word', 'excel'].includes(payload.mode)) throw new Error('Choose Word, Excel or ordinary conversation')
        appendState(session, {
          mode: payload.mode,
          selectedTemplate: current.selectedTemplate?.mode === payload.mode ? current.selectedTemplate : null
        })
      } else if (endpoint === 'template/select') {
        const template = officeTemplate(payload.templateId)
        const mode = template.mode ?? 'word'
        if (current.mode !== mode) throw new Error('Choose the matching Word or Excel format before using this example')
        appendState(session, { mode, selectedTemplate: { id: template.id, mode, revision: template.revision } })
      } else if (endpoint === 'template/deselect') {
        appendState(session, { mode: current.mode, selectedTemplate: null })
      } else if (endpoint === 'template/preview') {
        return { ok: true, value: { status: 'ok', data: await officeTemplatePreview(payload.templateId, payload.page) } }
      } else if (endpoint !== 'state') throw new Error('Unknown Office mode operation')
      const state = officeState(ctx, session)
      const templates = await listOfficeTemplates()
      const selected = selectedOfficeTemplate(state)
      return { ok: true, value: { status: 'ok', data: { sessionId, mode: state.mode, templates,
        ...(selected ? { selectedTemplateId: selected.id, selectedTemplateRevision: selected.revision } : {}) } } }
    } catch (error) {
      return { ok: true, value: { status: 'error', error: { code: 'invalid-request', message: error instanceof Error ? error.message : String(error) } } }
    }
  }
  ctx.effect(() => ctx.connection.rpc.handle('/dsh-office', handle), 'dsh-office: rpc channel')
}

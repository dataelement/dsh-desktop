import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import z from '@deepseek-ai/schemastery'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { registerOfficeTools } from './lib/tools.js'
import { registerOfficeModes } from './lib/modes.js'
import { businessSkills, stripFrontmatter } from './lib/business-skills.js'

export const name = 'dsh-office'
export const inject = ['tools', 'skills', 'sandboxPolicy', 'connection', 'officeModes']
export const Config = z.object({ root: z.string().required(), node: z.string(), python: z.string(), libreOffice: z.string(), bwrap: z.string(), fontDirectories: z.array(z.string()) })

export function apply(ctx, config) {
  if (!path.isAbsolute(config.root)) throw new Error('Office audit root must be absolute')
  registerOfficeTools(ctx, config)
  registerOfficeModes(ctx)
  const definitions = [
    { name: 'dsh-word', description: '根据材料制作可编辑 Word 报告和方案，或保留已有 DOCX 进行局部文字、段落样式修改；通过 DSH Desktop Office 工具检查和预览交付文件。' },
    { name: 'dsh-excel', description: '在 DSH Desktop 中创建和分析 Excel XLSX，生成公式与原生图表，保留原文件局部改值，并执行重计算、独立数值核对和预览。' }
  ].map((entry) => ({
    ...entry, invocation: { modelInvocable: true, userInvocable: true },
    provider: name, source: 'bundled', rank: BUNDLED_SKILL_RANK + 30,
    locator: new URL(`./skills/${entry.name}/SKILL.md`, import.meta.url),
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL(`./skills/${entry.name}/`, import.meta.url)) }
  }))
  ctx.skills.registerProvider(() => ({
    name,
    list: async () => [...definitions, ...businessSkills.summaries],
    async get(selected, options = {}) {
      options.signal?.throwIfAborted()
      const entry = definitions.find((item) => item.name === selected.name)
      if (!entry) return businessSkills.get(selected.name, options.signal)
      const skill = await readFile(entry.locator, 'utf8')
      options.signal?.throwIfAborted()
      return { ...entry, content: stripFrontmatter(skill) }
    }
  }))
}

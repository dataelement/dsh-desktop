import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'

const provider = 'dsh-desktop-office-business'
const definitions = [
  { name: 'gov-doc-writing', description: '公文写作：按单位、文种、角色和当前材料生成通知、报告、请示等文稿，配合 office-docx 制作可编辑 Word。' },
  { name: 'meeting-recap', description: '会议纪要：整理议题、讨论、决议、行动项、负责人和截止日期，配合 office-docx 及会议纪要案例交付。' },
  { name: 'work-report-writer', description: '工作汇报：按当前记录整理日报、周报、月报与阶段总结，核对交付、数字、风险和下期计划，配合 office-docx 制作可编辑 Word。' },
  { name: 'research-writer', description: '研究报告：整理研究问题、证据、来源、判断与风险，配合 office-docx 制作可编辑报告。' },
  { name: 'saas-metrics-coach', description: '经营指标：核对收入、MRR、客户留存、增长假设与计算口径，配合 office-xlsx 制作经营分析。' },
  { name: 'dataset-health-audit', description: '数据质量：检查缺失、异常、单位、口径、重复与可复现计算，配合 office-xlsx 分析业务数据。' },
  { name: 'data-viz-gen', description: '数据图表：按数据类型和业务问题选择图表与标注，配合 office-xlsx 保留原生公式和图表。' }
]

/** Business methods share the official file-authoring skills and runtime. */
export function registerBusinessSkills(ctx, root = fileURLToPath(new URL('../business-skills/', import.meta.url))) {
  const candidates = definitions.map(item => ({ ...item, provider, source: 'bundled', rank: BUNDLED_SKILL_RANK,
    invocation: { modelInvocable: true, userInvocable: true },
    resourceBase: { kind: 'directory', path: join(root, item.name) },
    locator: join(root, item.name, 'SKILL.md') }))
  ctx.skills.registerProvider(() => ({ name: provider, list: async () => candidates,
    async get(candidate, options = {}) {
      const item = candidates.find(value => value.name === candidate.name)
      if (!item) return undefined
      const body = await readFile(item.locator, { encoding: 'utf8', signal: options.signal })
      return { ...item, content: body.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, '').trim()
        + '\n\n## Desktop 文件交付\n\n当前用户材料提供事实，所选案例提供结构和版式。制作 Word 时配合 office-docx，制作 Excel 时配合 office-xlsx，使用 load_workspace_dependencies 返回的安装级 Python。根据已有材料直接完成可确定的内容，未知字段标为待确认。Excel 修改后用官方 Kit 重算并核对关键数值。用 present 交付最终文件。' }
    }
  }))
}

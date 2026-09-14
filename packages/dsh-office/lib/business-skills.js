import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import { atomicWrite, boundedRead, sha256, workspacePath } from './workspace.js'

const PROVIDER = 'dsh-office'
const MAX_RESOURCE_BYTES = 1024 * 1024
const safePath = value => typeof value === 'string' && value.length > 0 && !/[\\\u0000:]/u.test(value)
  && value.split('/').every(segment => segment && segment !== '.' && segment !== '..')
export const stripFrontmatter = content => content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, '').trim()

// The provider loads only the small catalogue at startup. Bodies and resources
// are read from the signed bundle when a model or user selects an exact name.
export async function createBusinessSkillLibrary(root = new URL('../business-skills/', import.meta.url)) {
  const catalog = JSON.parse((await boundedRead(new URL('catalog.json', root), 1024 * 1024)).toString('utf8'))
  if (catalog.version !== 1 || catalog.entries.length !== catalog.skillCount) throw new Error('Invalid bundled Skill catalogue')
  const entries = new Map()
  for (const entry of catalog.entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name) || entries.has(entry.name)
      || typeof entry.description !== 'string' || typeof entry.family !== 'string'
      || !entry.files['SKILL.md'] || entry.revision !== entry.files['SKILL.md'].sha256) throw new Error('Invalid bundled Skill entry')
    for (const [file, revision] of Object.entries(entry.files)) {
      if (!safePath(file) || !/^[a-f0-9]{64}$/u.test(revision.sha256)
        || !Number.isInteger(revision.bytes) || revision.bytes < 0 || revision.bytes > MAX_RESOURCE_BYTES) throw new Error('Invalid bundled Skill resource')
    }
    entries.set(entry.name, entry)
  }
  function entry(name) {
    const value = entries.get(name)
    if (!value) throw new Error('Choose an exact Skill name from the available catalogue')
    return value
  }
  async function resource(name, file, signal) {
    signal?.throwIfAborted()
    const selected = entry(name), expected = selected.files[file]
    if (!safePath(file) || !Object.hasOwn(selected.files, file)) throw new Error('Choose a resource listed for this Skill')
    const absolute = await workspacePath(fileURLToPath(new URL('source/', root)), `${name}/${file}`)
    const bytes = await boundedRead(absolute, MAX_RESOURCE_BYTES)
    signal?.throwIfAborted()
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error('Skill resource differs from its bundled revision')
    return bytes
  }
  function details(name) {
    const selected = entry(name)
    return { name, family: selected.family, category: selected.category, suggestedModes: selected.suggestedModes,
      revision: selected.revision, dependencies: selected.dependencies, scripts: selected.scripts,
      files: Object.entries(selected.files).map(([file, revision]) => ({ file, ...revision })) }
  }
  const summaries = [...entries.values()].map(selected => ({
    name: selected.name,
    description: `${selected.family}：${selected.description.replace(/\s+/gu, ' ').trim().slice(0, 280)}`,
    invocation: { modelInvocable: true, userInvocable: true }, provider: PROVIDER, source: 'bundled', rank: BUNDLED_SKILL_RANK + 40,
    resourceBase: { kind: 'opaque', description: `Use office_skill_read(name="${selected.name}") to list resources, add file to read one, or office_skill_prepare(name="${selected.name}") to copy its complete resources into the active workspace.` }
  }))
  async function get(name, signal) {
    const summary = summaries.find(item => item.name === name)
    if (!summary) return undefined
    const selected = entry(name)
    const instructions = stripFrontmatter((await resource(name, 'SKILL.md', signal)).toString('utf8'))
    const dcf = ['cashflow-valuation', 'discounted-cashflow-model'].includes(name)
      ? '\nDCF 输入约定：股权价值 = 企业价值 − 总债务 + 现金；以净负债输入时，股权价值 = 企业价值 − 净负债。原脚本 debt 字段参与前一个公式，应传总债务；同时核对现金、债务、企业价值与股数的单位。' : ''
    return { ...summary, content: `## DSH 执行环境\n\n本 Skill 提供当前任务的业务方法。用户要求和当前会话选择确定输出格式。制作 DOCX 时配合 dsh-word，制作 XLSX 时配合 dsh-excel，使用当前宿主的 office_* 工具生成、检查与交付。\n\n配套文件使用 office_skill_read(name="${name}", file="相对路径") 按需读取；省略 file 可查看完整清单。需要执行脚本或使用二进制资产时，先用 office_skill_prepare(name="${name}") 准备工作副本，再通过当前会话已授权的沙箱工具处理。相对路径和示例中的旧环境路径均以返回的工作副本为基准。\n\n附带脚本的额外依赖：${selected.dependencies.join(', ') || '静态扫描未发现第三方 Python 依赖'}。使用脚本前核对实际运行环境；所需数据和服务凭据由当前任务提供。联网、安装依赖、命令执行和外部服务操作沿用宿主的工具权限及审计。${dcf}\n\n## 业务 Skill 正文\n\n${instructions}` }
  }
  return { catalog, summaries, get, resource, details }
}

export const businessSkills = await createBusinessSkillLibrary()

export function registerBusinessSkillTools(register) {
  const name = { type: 'string', required: true, description: 'Exact bundled business Skill name from the session skill catalogue.' }
  register('office_skill_read', 'List a bundled business Skill resource directory and dependencies, or read one exact text resource. Load the Skill instructions with the skill tool first. References are loaded on demand; all reads are bounded, revision-checked and audited.', {
    name, file: { type: 'string', description: 'Exact relative resource path from the returned file list; omit to list resources.' }
  }, false, async (args, exec) => {
    const details = businessSkills.details(args.name)
    if (args.file === undefined) return { status: 'listed', ...details, sourceSha256: details.revision }
    const bytes = await businessSkills.resource(args.name, args.file, exec.signal)
    if (path.extname(args.file).toLowerCase() === '.pdf' || bytes.includes(0)) throw new Error('Use office_skill_prepare to open binary resources with a workspace file viewer')
    return { status: 'read', name: args.name, file: args.file, content: new TextDecoder('utf-8', { fatal: true }).decode(bytes), sourceSha256: sha256(bytes) }
  })
  register('office_skill_prepare', 'Prepare the complete selected business Skill in a new workspace directory, including scripts, references, assets and license files. Returns relative paths and hashes. Execute needed scripts using the active session sandbox tools and available dependencies.', { name }, true, async (args, exec, workspace) => {
    const details = businessSkills.details(args.name)
    const files = await Promise.all(details.files.map(async ({ file }) => ({ file, bytes: await businessSkills.resource(args.name, file, exec.signal) })))
    const relative = `office-skills/${args.name}-${randomUUID()}`, inputs = []
    for (const { file, bytes } of files) {
      exec.signal.throwIfAborted()
      const target = `${relative}/${file}`
      await atomicWrite(await workspacePath(workspace, target, true), bytes)
      inputs.push({ path: target, sha256: sha256(bytes) })
    }
    return { status: 'prepared', name: args.name, path: relative, sourceSha256: details.revision,
      dependencies: details.dependencies, scripts: details.scripts.map(file => `${relative}/${file}`), inputs }
  })
}

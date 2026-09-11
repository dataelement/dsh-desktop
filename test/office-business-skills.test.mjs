import { mkdtemp, readFile, readdir, rm, symlink, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import * as skillTool from '@deepseek-ai/dsh-tool-skill'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@deepseek-ai/dsh-session'
import { agentEvents } from '@deepseek-ai/dsh-agent'
import { createScope } from '@deepseek-ai/dsh-scope'
import { businessSkills, createBusinessSkillLibrary, stripFrontmatter } from '../packages/dsh-office/lib/business-skills.js'
import { apply } from '../packages/dsh-office/index.js'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { sha256 } from '../packages/dsh-office/lib/workspace.js'

const cleanup = []
afterEach(async () => { for (const fn of cleanup.splice(0).reverse()) await fn() })
async function temp() {
  const root = await mkdtemp(path.join(tmpdir(), 'business-skills-'))
  cleanup.push(() => rm(root, { recursive: true, force: true })); return root
}
async function fixture(mode = 'workspace-write') {
  const root = await temp(), tools = new Map()
  registerOfficeTools({ tools: { register: tool => tools.set(tool.name, tool) }, get: () => ({ resolve: () => ({ mode }) }) }, { root: path.join(root, 'audit') })
  return { root, call: (name, args, signal = new AbortController().signal) => tools.get(name).execute(args, {
    name, callId: 'business-test', signal, agent: { id: 'business-test', session: { id: 'business-test', header: { cwd: root } } }
  }) }
}

it('preserves and loads 185 original Skills plus government writing and all 678 bounded resources from the catalogue', async () => {
  expect(businessSkills.summaries).toHaveLength(186)
  expect(new Set(businessSkills.summaries.map(s => s.name)).size).toBe(186)
  let resources = 0
  for (const summary of businessSkills.summaries) {
    expect(summary).not.toHaveProperty('content')
    expect(summary.invocation).toEqual({ modelInvocable: true, userInvocable: true })
    const loaded = await businessSkills.get(summary.name)
    expect(loaded.content).toContain(stripFrontmatter((await businessSkills.resource(summary.name, 'SKILL.md')).toString('utf8')))
    for (const item of businessSkills.details(summary.name).files) {
      const bytes = await businessSkills.resource(summary.name, item.file)
      expect(bytes.length).toBe(item.bytes); expect(sha256(bytes)).toBe(item.sha256); resources++
    }
  }
  expect(resources).toBe(678)
  expect(await businessSkills.get('unknown-skill')).toBeUndefined()
})

it('publishes real session catalogue summaries and loads a selected business Skill through the host skill tool', async () => {
  const root = await temp(), ctx = new Context()
  new SystemPrompt(ctx, {}); new SkillRegistry(ctx); new ToolRuntime(ctx)
  ctx.provide('connection', { rpc: { handle() {} } })
  ctx.provide('officeModes', { state: async () => ({ documentMode: 'word' }) })
  apply(ctx, { root: path.join(root, 'audit') })
  skillTool.apply(ctx)
  const agent = { id: 'business-catalogue', session: Session.create(SessionId('business-catalogue'), undefined,
    { version: SESSION_FORMAT_VERSION, id: 'business-catalogue', createdAt: Date.now(), isSeeded: false, cwd: root }) }
  const scope = createScope(ctx, agent); agent.ctx = scope.ctx; cleanup.push(() => scope.dispose())
  const decision = await agentEvents(ctx, agent).waterfall('agent/pre-step', { turn: 1, step: 1, messages: [], signal: new AbortController().signal }, async () => ({ kind: 'enter', messages: [] }))
  const catalogue = decision.messages.find(m => m.source.kind === 'skill-catalog')
  expect(catalogue.source.entries).toHaveLength(188)
  expect(catalogue.source.entries.some(s => s.name === 'research-writer' && s.description.includes('研究写作'))).toBe(true)
  expect(catalogue.content.map(p => p.text).join('')).not.toContain('## 业务 Skill 正文')
  const foundation = decision.messages.find(m => m.source.plugin === 'dsh-office-composer')
  expect(foundation.source.sections.map(s => s.name)).toEqual(['dsh-word'])
  for (const name of ['research-writer', 'weighted-scoring', 'campaign-planner', 'gov-doc-writing']) {
    const result = await ctx.tools.execute({ name: 'skill', arguments: { name }, callId: name, agent, signal: new AbortController().signal })
    expect(result.isError).toBe(false)
    expect(result.value.name).toBe(name)
    expect(result.value.content).toContain('## 业务 Skill 正文')
  }
})

it('reads references with a read-only policy and stages complete hash-bound working copies with an audit trail', async () => {
  const readonly = await fixture('read-only')
  const read = await readonly.call('office_skill_read', { name: 'weighted-scoring', file: 'scripts/decision_matrix.py' })
  expect(read.content).toContain('def ')
  const govFile = businessSkills.details('gov-doc-writing').files.find(f => f.file.startsWith('01_'))
  const gov = await readonly.call('office_skill_read', { name: 'gov-doc-writing', file: govFile.file })
  expect(gov.content).toContain('生成前')
  await expect(readonly.call('office_skill_prepare', { name: 'weighted-scoring' })).rejects.toThrow('workspace-write policy')
  const f = await fixture()
  for (const name of ['research-writer', 'weighted-scoring', 'theme-factory', 'gov-doc-writing']) {
    const copy = await f.call('office_skill_prepare', { name })
    expect(JSON.parse(JSON.stringify(copy))).toEqual(copy)
    expect(copy.inputs).toHaveLength(businessSkills.details(name).files.length)
    for (const input of copy.inputs) expect(sha256(await readFile(path.join(f.root, input.path)))).toBe(input.sha256)
  }
  const audit = (await readFile(path.join(f.root, 'audit/audit.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse)
  expect(audit.filter(item => item.phase === 'result').every(item => item.sourceSha256 && item.inputs.length)).toBe(true)
})

it('rejects unknown resources, path traversal, symlinks, cancellation and altered bundled content', async () => {
  const f = await fixture()
  for (const file of ['../index.js', '/etc/passwd', 'scripts/../../SKILL.md', '__proto__']) {
    await expect(f.call('office_skill_read', { name: 'weighted-scoring', file })).rejects.toThrow('listed')
  }
  await expect(f.call('office_skill_prepare', { name: '../weighted-scoring' })).rejects.toThrow('exact Skill')
  const outside = await temp(); await symlink(outside, path.join(f.root, 'office-skills'))
  await expect(f.call('office_skill_prepare', { name: 'weighted-scoring' })).rejects.toThrow('regular files')
  expect(await readdir(outside)).toEqual([])
  const controller = new AbortController(); controller.abort()
  await expect(f.call('office_skill_read', { name: 'research-writer' }, controller.signal)).rejects.toThrow()
  const tampered = await temp(), entry = businessSkills.catalog.entries.find(s => s.name === 'research-writer')
  await writeFile(path.join(tampered, 'catalog.json'), JSON.stringify({ version: 1, skillCount: 1, entries: [entry] }))
  await mkdir(path.join(tampered, 'source/research-writer'), { recursive: true })
  await writeFile(path.join(tampered, 'source/research-writer/SKILL.md'), 'Changed body')
  const library = await createBusinessSkillLibrary(pathToFileURL(`${tampered}/`))
  await expect(library.get('research-writer')).rejects.toThrow('bundled revision')
})

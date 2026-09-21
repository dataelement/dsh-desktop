import { mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { inspectOffice } from '../packages/dsh-office/lib/inspect.js'
import { parseZip } from '../packages/dsh-office/lib/zip.js'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { apply } from '../packages/dsh-office/index.js'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'

const word = () => readFileSync(new URL('../packages/dsh-office/templates/coffee-market/example.docx', import.meta.url))
const excel = () => readFileSync(new URL('../packages/dsh-office/templates/bio-assay/example.xlsx', import.meta.url))
function mutateZip(bytes, fn) {
  const parts = Object.fromEntries(parseZip(bytes).parts)
  fn(parts)
  return Buffer.from(zipSync(parts))
}
async function harness(mode = 'workspace-write') {
  const root = await mkdtemp(path.join(tmpdir(), 'office-test-'))
  const auditRoot = await mkdtemp(path.join(tmpdir(), 'office-audit-'))
  const tools = new Map()
  const fs = new LocalFileSystem(new Context(), { cwd: root, diffBasisMaxBytes: 10 * 1024 * 1024 })
  const ctx = { tools: { register(t) { tools.set(t.name, t) } }, fs, sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: root }) } }
  registerOfficeTools(ctx, { root: auditRoot })
  return {
    root, auditRoot,
    async call(name, args) {
      const tool = tools.get(name)
      return tool.execute(args, { name, callId: 'call-1', signal: new AbortController().signal, agent: { id: 'agent-1', session: { id: 'session-1', header: { cwd: root } } } })
    }
  }
}

describe('Office OOXML inspection', () => {
  it('reads native Word and Excel examples', () => {
    const document = inspectOffice(word())
    const workbook = inspectOffice(excel())
    expect(document.kind).toBe('word')
    expect(document.blocks.length).toBeGreaterThan(0)
    expect(workbook.kind).toBe('excel')
    expect(workbook.sheets.length).toBeGreaterThan(0)
  })
  it('reports truncated inspection explicitly', () => {
    const inspection = inspectOffice(excel(), { maxItems: 2 })
    expect(inspection.truncated).toBe(true)
    expect(inspection.sheets.flatMap(s => s.cells)).toHaveLength(2)
  })
  it('reads subsequent cells across worksheets without losing or repeating data', () => {
    const bytes = excel()
    const all = inspectOffice(bytes, { maxItems: 5000 }).sheets.flatMap(s => s.cells)
    const collected = []
    let offset = 0
    do {
      const page = inspectOffice(bytes, { maxItems: 500, offset })
      collected.push(...page.sheets.flatMap(s => s.cells))
      offset = page.nextOffset
    } while (offset !== null)
    expect(collected).toEqual(all)
  })
  it('reports external links without fetching them', () => {
    const bytes = mutateZip(word(), p => {
      p['word/_rels/document.xml.rels'] = strToU8(p['word/_rels/document.xml.rels'].toString().replace('</Relationships>', '<Relationship Id="external" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/source" TargetMode="External"/></Relationships>'))
    })
    expect(inspectOffice(bytes).warnings).toContainEqual({ code: 'external_relationship', part: 'word/_rels/document.xml.rels', target: 'https://example.invalid/source' })
  })
  it.each(['malformed', 'dtd', 'relationship', 'crc', 'expansion'])('rejects %s packages', kind => {
    let bytes = word()
    if (kind === 'malformed' || kind === 'dtd') bytes = mutateZip(bytes, p => { p['word/document.xml'] = strToU8(kind === 'malformed' ? '<w:p>' : '<!DOCTYPE x [<!ENTITY foo "bar">]><x>&foo;</x>') })
    if (kind === 'relationship') bytes = mutateZip(bytes, p => { delete p['word/styles.xml'] })
    if (kind === 'crc') {
      bytes = Buffer.from(bytes)
      let pos = 0
      while ((pos = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), pos)) >= 0) {
        const nameLength = bytes.readUInt16LE(pos + 28), extraLength = bytes.readUInt16LE(pos + 30), commentLength = bytes.readUInt16LE(pos + 32)
        const name = bytes.subarray(pos + 46, pos + 46 + nameLength).toString()
        if (name === 'word/document.xml') { bytes.writeUInt32LE(123, pos + 16); break }
        pos += 46 + nameLength + extraLength + commentLength
      }
    }
    if (kind === 'expansion') {
      bytes = Buffer.from(bytes)
      const pos = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
      bytes.writeUInt32LE(100 * 1024 * 1024, pos + 24)
    }
    expect(() => inspectOffice(bytes)).toThrow()
  })
})

describe('Office governed workspace workflow', () => {
  it('dispatches inspection through the real ToolRuntime and obeys a monotonic policy denial', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'office-registry-'))
    await writeFile(path.join(root, 'sample.docx'), word())
    const ctx = new Context()
    new SystemPrompt(ctx, {})
    new ToolRuntime(ctx)
    const fs = new LocalFileSystem(ctx, { cwd: root, diffBasisMaxBytes: 10 * 1024 * 1024 })
    registerOfficeTools({ tools: ctx.tools, fs, sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) } }, { root: path.join(root, 'audit') })
    const exec = { name: 'office_inspect', arguments: { file_path: 'sample.docx' }, agent: { id: 'agent', session: { id: 'session', header: { cwd: root } } }, callId: 'registry-call', signal: new AbortController().signal }
    const allow = await ctx.tools.execute(exec)
    expect(allow.isError).toBe(false)
    expect(allow.value.status).toBe('inspected')
    ctx.tools.guard(() => 'Denied by policy')
    const denial = await ctx.tools.execute({ ...exec, name: 'office_build', arguments: { language: 'javascript', source: 'throw Error("must stay unexecuted")', output_file: 'denied.docx' } })
    expect(denial.isError).toBe(true)
    expect(await readdir(root)).not.toContain('denied.docx')
  })
  it('denies every mutation under the session read-only policy before execution', async () => {
    const h = await harness('read-only')
    for (const name of ['office_build', 'office_word_edit', 'office_excel_edit', 'office_recalculate', 'office_template']) {
      const args = name === 'office_build' ? { language: 'javascript', source: 'throw Error("must stay unexecuted")', output_file: 'result.docx' }
        : name === 'office_template' ? { template_id: 'coffee-market' }
          : { file_path: 'source.docx', expected_revision: 'revision', output_file: 'result.docx', ...(name.endsWith('_edit') ? { operations: [] } : {}) }
      await expect(h.call(name, args)).rejects.toThrow('workspace-write')
    }
    expect(await readdir(h.root)).toEqual([])
  })
  it('rejects symlink inputs', async () => {
    const h = await harness()
    await writeFile(path.join(h.auditRoot, 'source.docx'), word())
    await symlink(path.join(h.auditRoot, 'source.docx'), path.join(h.root, 'source.docx'))
    await expect(h.call('office_inspect', { file_path: 'source.docx' })).rejects.toThrow('regular')
  })
  it('registers only the discoverable Word and Excel foundation skills', async () => {
    let provider
    const host = { tools: { register() {} }, skills: { registerProvider(factory) { provider = factory() } },
      connection: { rpc: { handle() { return async () => {} } } }, sessions: { get() {} },
      sessionProjections: { register() {}, stateOf() {} }, systemPrompt: { context() {} },
      effect(run) { run(); return () => {} } }
    apply(host, { root: '/tmp/office-test' })
    const skills = await provider.list()
    expect(skills.map(s => s.name)).toEqual(['dsh-word', 'dsh-excel'])
    for (const skill of skills) {
      expect((await provider.get(skill)).content).toContain('office_build')
      expect((await provider.get(skill)).content).toContain('expected_revision')
    }
  })
})

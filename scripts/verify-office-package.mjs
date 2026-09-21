// Exercise the installed dsh-office dependency closure in a fresh bundled-Node
// worker. Desktop/model, native Microsoft Office and built-in PDF preview acceptance are separate.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { app: { type: 'string' }, output: { type: 'string' }, worker: { type: 'boolean' } } })
for (const name of ['app', 'output']) assert.ok(values[name] && path.isAbsolute(values[name]), `--${name} requires an absolute path`)
const windows = process.platform === 'win32'
const resources = path.join(values.app, windows ? 'resources' : 'Contents/Resources')
const node = path.join(resources, 'app/node_modules/node/bin', windows ? 'node.exe' : 'node')
if (!values.worker) {
  execFileSync(node, [fileURLToPath(import.meta.url), '--worker', '--app', values.app, '--output', values.output], {
    stdio: 'inherit',
    timeout: 600000,
    env: windows
      ? { SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot, PATH: path.join(process.env.SystemRoot, 'System32'), LANG: 'en_US.UTF-8' }
      : { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8' }
  })
} else {
  const appModules = path.join(resources, 'app/node_modules')
  const packageRoot = path.join(appModules, 'dsh-office')
  const packaged = name => import(pathToFileURL(path.join(appModules, name, 'lib/index.js')).href)
  const load = relative => import(pathToFileURL(path.join(packageRoot, relative)).href)
  await mkdir(values.output) // The caller must provide a new evidence directory.

  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.version, '0.2.0')
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['@xmldom/xmldom', 'docx', 'fflate', 'saxes'])
  const requiredPeers = [
    '@deepseek-ai/cordis', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-fs', '@deepseek-ai/dsh-skill',
    '@deepseek-ai/dsh-sandbox-policy', '@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-session',
    '@deepseek-ai/dsh-session-projection', '@deepseek-ai/dsh-system-prompt'
  ]
  for (const dependency of requiredPeers) assert.ok(manifest.peerDependencies[dependency], `missing packaged peer ${dependency}`)
  for (const dependency of Object.keys(manifest.dependencies)) {
    const dependencyManifest = JSON.parse(await readFile(path.join(appModules, dependency, 'package.json'), 'utf8'))
    assert.ok(dependencyManifest.name === dependency, `packaged dependency mismatch for ${dependency}`)
  }

  const hostManifest = JSON.parse(await readFile(path.join(appModules, '@deepseek-ai/dsh/package.json'), 'utf8'))
  assert.equal(hostManifest.version, '0.1.6-alpha.2')
  assert.equal(hostManifest.dependencies['dsh-office'], '0.2.0')
  assert.equal(manifest.exports['./client'], './client.js')
  assert.equal(manifest.dsh.client.platform, 'web')
  const clientSource = await readFile(path.join(packageRoot, 'client.js'), 'utf8')
  assert.ok(clientSource.includes('data-office-mode'))

  const { Context } = await packaged('@deepseek-ai/cordis')
  const { ToolRuntime } = await packaged('@deepseek-ai/dsh-tools')
  const { SkillRegistry } = await packaged('@deepseek-ai/dsh-skill')
  const { default: LocalFileSystem } = await packaged('@deepseek-ai/dsh-fs-local')
  const { SessionId, SessionStore } = await packaged('@deepseek-ai/dsh-session')
  const { SessionProjectionRegistry } = await packaged('@deepseek-ai/dsh-session-projection')
  const { SystemPrompt, renderContextSnapshot } = await packaged('@deepseek-ai/dsh-system-prompt')
  const office = await load('index.js')
  const { resolveRuntime } = await load('lib/runtime.js')
  const { parseZip } = await load('lib/zip.js')

  const ctx = new Context()
  const handlers = new Map()
  ctx.provide('connection', { rpc: { handle(channel, handler) {
    assert.ok(!handlers.has(channel), `duplicate RPC channel ${channel}`)
    handlers.set(channel, handler)
    return async () => { handlers.delete(channel) }
  } } })
  ctx.provide('sandboxPolicy', { resolve: ({ session }) => {
    assert.ok(session?.id, 'sandbox policy receives the active session')
    return { mode: 'workspace-write', workspaceRoot: values.output }
  } })
  new SystemPrompt(ctx, { includeHarnessIdentity: false })
  new ToolRuntime(ctx)
  new SkillRegistry(ctx)
  new LocalFileSystem(ctx, { cwd: values.output, diffBasisMaxBytes: 10 * 1024 * 1024 })
  new SessionProjectionRegistry(ctx)
  new SessionStore(ctx)
  const officeFork = ctx.plugin(office, { root: path.join(values.output, 'audit') })
  await officeFork

  const expectedTools = ['office_build', 'office_excel_edit', 'office_inspect', 'office_recalculate', 'office_template', 'office_word_edit', 'office_word_read']
  const registeredTools = ctx.tools.wireSchemas().schemas.map(schema => schema.name).filter(name => name.startsWith('office_')).sort()
  assert.deepEqual(registeredTools, expectedTools)

  const skills = await ctx.skills.list({ cwd: values.output })
  assert.deepEqual(skills.map(skill => skill.name), ['dsh-excel', 'dsh-word'])
  const skillEvidence = []
  for (const summary of skills) {
    const skill = await ctx.skills.get(summary.name, { cwd: values.output })
    assert.ok(skill.content.includes('office_build'))
    assert.ok(skill.content.includes('expected_revision'))
    skillEvidence.push({ name: skill.name, provider: skill.provider, contentBytes: Buffer.byteLength(skill.content), resourceBase: skill.resourceBase.kind })
  }

  const session = ctx.sessions.create(SessionId('packaged-office-test'), { meta: { cwd: values.output } })
  const agent = { id: 'packaged-office-test', session }
  const rpc = async (method, payload = {}) => {
    const response = await handlers.get('/dsh-office')(method, payload, new AbortController().signal)
    assert.equal(response.ok, true, `RPC ${method} transport failure`)
    assert.equal(response.value.status, 'ok', `RPC ${method}: ${JSON.stringify(response.value)}`)
    return response.value.data
  }
  const wordState = await rpc('mode', { sessionId: session.id, mode: 'word' })
  assert.equal(wordState.mode, 'word')
  const selected = await rpc('template/select', { sessionId: session.id, templateId: 'government-notice' })
  assert.equal(selected.selectedTemplateId, 'government-notice')
  const wordPrompt = renderContextSnapshot(await ctx.systemPrompt.assemble({ scope: agent, agent }))
  assert.ok(wordPrompt.includes('当前会话输出格式：Word (.docx)'))
  assert.ok(wordPrompt.includes('<skill_content name="dsh-word">'))
  assert.ok(wordPrompt.includes('office_template(template_id="government-notice")'))
  await rpc('mode', { sessionId: session.id, mode: 'excel' })
  const excelPrompt = renderContextSnapshot(await ctx.systemPrompt.assemble({ scope: agent, agent }))
  assert.ok(excelPrompt.includes('当前会话输出格式：Excel (.xlsx)'))
  assert.ok(excelPrompt.includes('<skill_content name="dsh-excel">'))
  assert.equal(ctx.sessionProjections.stateOf(session, 'office').mode, 'excel')

  let callSequence = 0
  const call = async (name, args = {}) => {
    const result = await ctx.tools.execute({
      name, arguments: args, callId: `package-${++callSequence}-${name}`, signal: new AbortController().signal, agent
    })
    assert.equal(result.isError, false, `${name}: ${JSON.stringify(result)}`)
    return result.value
  }
  const summarizeArtifact = result => ({ status: result.status, path: result.path, sha256: result.sha256, engine: result.engine, confinement: result.confinement })
  const preparedTemplates = []
  for (const templateId of ['government-notice', 'annual-business']) {
    const prepared = await call('office_template', { template_id: templateId })
    assert.equal(prepared.templateId, templateId)
    assert.ok(prepared.example && prepared.sha256 && prepared.guide)
    const inspection = await call('office_inspect', { file_path: prepared.example, max_items: 5 })
    preparedTemplates.push({ templateId, mode: prepared.mode, revision: prepared.revision, example: prepared.example, sha256: prepared.sha256, kind: inspection.kind, itemCount: inspection.kind === 'word' ? inspection.blockCount : inspection.totalCells })
  }

  const wordSource = `import { writeFile } from 'node:fs/promises'
const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, Packer } = docx
const p = text => new Paragraph({ children: [new TextRun({ text, font: { ascii: 'Arial', eastAsia: 'Microsoft YaHei' }, size: 22 })] })
const document = new Document({ sections: [{ children: [
  new Paragraph({ text: '采购执行简报', heading: HeadingLevel.TITLE }),
  p('本轮采购预算为 760 元。'),
  new Table({ rows: [['材料', '数量'], ['材料 A', '3']].map(row => new TableRow({ children: row.map(text => new TableCell({ children: [p(text)] })) })) })
] }] })
await writeFile(office.output, await Packer.toBuffer(document))`
  const wordBuilt = await call('office_build', { language: 'javascript', source: wordSource, output_file: 'word-built.docx' })
  const wordRead = await call('office_word_read', { file_path: wordBuilt.path, max_items: 50 })
  const budgetParagraph = wordRead.paragraphs.find(paragraph => paragraph.text.includes('760'))
  assert.ok(budgetParagraph)
  const wordEdited = await call('office_word_edit', {
    file_path: wordBuilt.path, expected_revision: wordBuilt.sha256, output_file: 'word-edited.docx',
    operations: [{ paragraph_id: budgetParagraph.id, type: 'replace_text', find: '760', replace: '880' }]
  })
  const wordInspection = await call('office_inspect', { file_path: wordEdited.path, max_items: 50 })
  assert.equal(wordInspection.kind, 'word')
  assert.ok(wordInspection.blocks.some(block => block.text?.includes('880')))

  const excelSource = `from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
wb = Workbook(); ws = wb.active; ws.title = '采购'
ws.append(['材料', '数量', '单价', '金额'])
ws.append(['材料 A', 3, 120, '=B2*C2'])
ws.append(['材料 B', 5, 80, '=B3*C3'])
ws.append(['总计', None, None, '=SUM(D2:D3)'])
chart = BarChart(); chart.add_data(Reference(ws, min_col=4, min_row=1, max_row=3), titles_from_data=True); ws.add_chart(chart, 'F2')
wb.save(office['output'])`
  const excelBuilt = await call('office_build', { language: 'python', source: excelSource, output_file: 'excel-built.xlsx' })
  const excelEdited = await call('office_excel_edit', {
    file_path: excelBuilt.path, expected_revision: excelBuilt.sha256, output_file: 'excel-edited.xlsx',
    operations: [{ sheet: '采购', cell: 'B2', value: 4 }]
  })
  const excelCalculated = await call('office_recalculate', {
    file_path: excelEdited.path, expected_revision: excelEdited.sha256, output_file: 'excel-calculated.xlsx',
    checks: [{ sheet: '采购', cell: 'D2', expected: 480 }, { sheet: '采购', cell: 'D4', expected: 880 }]
  })
  assert.equal(excelCalculated.calculation, 'PASS')
  assert.deepEqual(excelCalculated.chartWarnings, [])
  const excelInspection = await call('office_inspect', { file_path: excelCalculated.path, max_items: 50 })
  assert.equal(excelInspection.kind, 'excel')
  assert.equal(excelInspection.formulas.missingCache, 0)
  assert.ok(excelInspection.sheets[0].cells.some(cell => cell.ref === 'D4' && cell.value === 880))
  const parts = parseZip(await readFile(path.join(values.output, excelCalculated.path))).parts
  assert.equal([...parts.keys()].filter(name => /^xl\/charts\/chart\d+\.xml$/u.test(name)).length, 1)

  const runtime = await resolveRuntime({ root: path.join(values.output, 'audit') })
  const runtimeRoot = path.join(resources, 'office-runtime')
  for (const engine of [runtime.python, runtime.libreOffice]) assert.ok(engine?.startsWith(runtimeRoot + path.sep), 'Use bundled Python and LibreOffice')
  assert.ok(runtime.node === process.execPath)
  assert.ok(runtime.docx.startsWith(appModules + path.sep))
  if (windows) for (const engine of [runtime.windowsSandbox, runtime.windowsConverter]) assert.ok(engine?.startsWith(runtimeRoot + path.sep), 'Use bundled Windows workers')

  const auditLines = (await readFile(path.join(values.output, 'audit/audit.ndjson'), 'utf8')).trim().split(/\r?\n/u)
  assert.ok(auditLines.length <= 40, 'verification audit evidence must remain bounded')
  const evidence = {
    status: 'PASS', harnessVersion: hostManifest.version, officeVersion: manifest.version, worker: process.execPath,
    services: ['tools', 'skills', 'fs-local', 'sandbox-policy', 'sessions', 'session-projections', 'system-prompt', 'connection-rpc'],
    tools: registeredTools, skills: skillEvidence,
    rpc: { channel: '/dsh-office', mode: 'PASS', templateSelection: 'PASS' },
    systemPrompt: { word: 'PASS', excel: 'PASS' }, sessionProjection: 'PASS',
    templates: preparedTemplates,
    word: { build: summarizeArtifact(wordBuilt), edit: summarizeArtifact(wordEdited), inspect: { status: wordInspection.status, kind: wordInspection.kind, itemCount: wordInspection.blockCount } },
    excel: { build: summarizeArtifact(excelBuilt), edit: summarizeArtifact(excelEdited), recalculate: summarizeArtifact(excelCalculated), inspect: { status: excelInspection.status, kind: excelInspection.kind, itemCount: excelInspection.totalCells, missingFormulaCaches: excelInspection.formulas.missingCache }, charts: 1 },
    runtime: { platform: runtime.platform, sandbox: runtime.sandbox, node: runtime.node, python: runtime.python, openpyxl: runtime.openpyxl, libreOffice: runtime.libreOffice },
    auditEntries: auditLines.length,
    limitations: { desktopModelAcceptance: 'NOT_RUN', microsoftOfficeAcceptance: 'NOT_RUN', pdfPreview: 'NOT_RUN_BUILT_IN_COVERAGE_NOT_DUPLICATED' }
  }
  const serialized = JSON.stringify(evidence, null, 2) + '\n'
  assert.ok(Buffer.byteLength(serialized) < 32 * 1024, 'verification.json must remain below 32 KiB')
  await writeFile(path.join(values.output, 'verification.json'), serialized)
  console.log(JSON.stringify({ status: 'PASS', output: values.output, skills: skills.length, tools: registeredTools.length, templates: preparedTemplates.length, word: 'build/edit/inspect PASS', excel: 'build/edit/recalculate/inspect PASS', pdfPreview: 'NOT_RUN' }))
}

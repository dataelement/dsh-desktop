// Exercise the installed dependency closure and bundled engines, with an isolated
// test workspace policy. Full Desktop/model and native Office acceptance are separate.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { app: { type: 'string' }, output: { type: 'string' }, worker: { type: 'boolean' } } })
for (const name of ['app', 'output']) assert.ok(values[name] && path.isAbsolute(values[name]), `--${name} requires an absolute path`)
const resources = path.join(values.app, 'Contents/Resources')
const node = path.join(resources, 'app/node_modules/node/bin/node')
if (!values.worker) {
  execFileSync(node, [fileURLToPath(import.meta.url), '--worker', '--app', values.app, '--output', values.output], {
    stdio: 'inherit', timeout: 600000, env: { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8' }
  })
} else {
  const packageRoot = path.join(resources, 'app/node_modules/dsh-office')
  const load = relative => import(pathToFileURL(path.join(packageRoot, relative)).href)
  const { apply } = await load('index.js')
  const { resolveRuntime } = await load('lib/runtime.js')
  const { parseZip } = await load('lib/zip.js')
  const config = { root: path.join(values.output, 'audit') }
  await mkdir(values.output) // unique evidence directory; preserve prior results
  const tools = new Map(); let provider
  const packaged = name => import(pathToFileURL(path.join(resources, 'app/node_modules', name, 'lib/index.js')).href)
  const { Context } = await packaged('@deepseek-ai/cordis')
  const { SystemPrompt } = await packaged('@deepseek-ai/dsh-system-prompt')
  const { ToolRuntime } = await packaged('@deepseek-ai/dsh-tools')
  const toolContext = new Context()
  new SystemPrompt(toolContext, {})
  new ToolRuntime(toolContext)
  const services = {}, routes = new Map()
  const connection = { rpc: { handle: (route, handler) => routes.set(route, handler) } }
  const ppt = await import(pathToFileURL(path.join(resources, 'app/node_modules/dsh-ppt/lib/index.js')).href)
  const host = {
    provide: (name, value) => { services[name] = value },
    inject: (names, callback) => { if (names.includes('webServer')) callback(host) },
    effect: run => run(), webServer: { register: () => () => {} },
    get() {}, on() {}, systemPrompt: { section() {} }, skills: { registerProvider() {} }, tools: { register() {} }, connection
  }
  await ppt.apply(host, { root: path.join(values.output, 'composer-state') })
  apply({ ...host, tools: { register(tool) { tools.set(tool.name, tool); toolContext.tools.register(tool) } }, skills: { registerProvider(factory) { provider = factory() } },
    officeModes: services.officeModes,
    get: () => ({ resolve: () => ({ mode: 'workspace-write', workspaceRoot: values.output }) }) }, config)
  const sessionId = 'packaged-office-test'
  for (const mode of ['word', 'excel', null]) {
    const response = await routes.get('/dsh-office')('mode', { sessionId, mode })
    assert.equal(response.value.data.mode, mode)
  }
  await routes.get('/dsh-ppt')('presentation/mode', { sessionId, mode: 'ppt' })
  assert.equal((await routes.get('/dsh-office')('state', { sessionId })).value.data.mode, 'ppt')
  await routes.get('/dsh-office')('mode', { sessionId, mode: 'word' })
  assert.equal((await services.officeModes.state(sessionId)).presentationMode, undefined)
  const hostManifest = JSON.parse(await readFile(path.join(resources, 'app/node_modules/@deepseek-ai/dsh/package.json'), 'utf8'))
  assert.equal(hostManifest.dependencies['dsh-office'], '0.2.0')
  assert.equal(hostManifest.dependencies['dsh-workbuddy-office'], undefined)
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.exports['./client'], './client.js')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.ok((await readFile(path.join(packageRoot, 'client.js'), 'utf8')).includes('data-office-mode'))
  assert.equal(tools.size, 17)
  const skills = await provider.list()
  assert.equal(skills.length, 188)
  assert.equal(new Set(skills.map(s => s.name)).size, 188)
  assert.deepEqual(skills.slice(0, 2).map(s => s.name), ['dsh-word', 'dsh-excel'])
  for (const skill of skills) assert.ok((await provider.get(skill)).content.length > 100)
  const call = async (name, args = {}) => {
    const result = await toolContext.tools.execute({ name, arguments: args, callId: `package-${name}`, signal: new AbortController().signal,
      agent: { id: 'packaged-office-test', session: { id: 'packaged-office-test', header: { cwd: values.output } } } })
    assert.equal(result.isError, false, `${name}: ${JSON.stringify(result)}`)
    return result.value
  }
  const runtime = await resolveRuntime(config)
  const { businessSkills } = await load('lib/business-skills.js')
  let resourceCount = 0
  for (const skill of skills.slice(2)) {
    const details = await call('office_skill_read', { name: skill.name })
    for (const file of details.files) {
      await businessSkills.resource(skill.name, file.file)
      resourceCount++
    }
  }
  assert.equal(resourceCount, 678)
  const businessSamples = []
  for (const name of ['research-writer', 'weighted-scoring', 'theme-factory', 'gov-doc-writing']) {
    businessSamples.push(await call('office_skill_prepare', { name }))
  }
  const scoringReference = await call('office_skill_read', { name: 'weighted-scoring', file: 'scripts/decision_matrix.py' })
  assert.ok(scoringReference.content.includes('def '))
  const exampleResults = []
  const exampleCatalog = (await routes.get('/dsh-office')('state', { sessionId })).value.data.templates
  assert.equal(exampleCatalog.filter(t => t.mode === 'word').length, 3)
  assert.equal(exampleCatalog.filter(t => t.mode === 'excel').length, 3)
  for (const { id: templateId } of exampleCatalog) {
    const selected = await routes.get('/dsh-office')('state', { sessionId })
    assert.equal(selected.value.data.selectedTemplateId, undefined)
    const prepared = await call('office_template', { template_id: templateId })
    assert.equal(prepared.templateId, templateId)
    assert.ok(prepared.inputs.length >= 2)
    const galleryPreview = await routes.get('/dsh-office')('template/preview', { sessionId, templateId, page: selected.value.data.templates.find(t => t.id === templateId).pages })
    assert.ok(galleryPreview.value.data.image.startsWith('data:image/webp;base64,'))
    let source = { path: prepared.example, sha256: prepared.sha256 }
    if (prepared.authoring) {
      const extension = prepared.mode === 'excel' ? 'xlsx' : 'docx'
      source = await call('office_build', { ...prepared.authoring, output_file: `${templateId}-from-reference.${extension}` })
    }
    if (prepared.mode === 'word') {
      if (prepared.authoring) {
        const preview = await call('office_preview', { file_path: source.path, expected_revision: source.sha256, output_file: `${templateId}-generated.pdf` })
        assert.equal(preview.rendering, 'PASS')
        exampleResults.push({ templateId, source, preview })
      }
      continue
    }
    const checks = templateId === 'annual-business'
      ? [{ sheet:'经营总览', cell:'B8', expected:1404.708375, tolerance:1e-7 }, { sheet:'经营总览', cell:'C98', expected:0 }]
      : JSON.parse(await readFile(path.join(values.output, prepared.path, 'checks.json'), 'utf8'))
    const result = await call('office_recalculate', { file_path:source.path, expected_revision:source.sha256, output_file:`${templateId}-checked.xlsx`, checks })
    assert.equal(result.calculation, 'PASS'); assert.deepEqual(result.chartWarnings, [])
    let edit = { sheet:'经营总览', cell:'D104', value:2.191868 }
    let changedChecks = [{ sheet:'经营总览', cell:'C98', expected:0 }]
    if (templateId === 'port-cargo' || templateId === 'bio-assay') {
      const data = JSON.parse(await readFile(path.join(values.output, prepared.authoring.inputs[0].file_path), 'utf8'))
      const mean = values => values.reduce((a,b)=>a+b,0) / values.length
      if (templateId === 'port-cargo') {
        edit = { sheet:'作业明细', cell:'G8', value:data.records[0][6]+1000 }
        changedChecks = [{ sheet:'港口总览', cell:'B6', expected:(data.records.reduce((s,r)=>s+r[6],0)+1000)/10000, tolerance:1e-6 },
          { sheet:'日度汇总', cell:'D8', expected:data.records.slice(0,6).reduce((s,r)=>s+r[6],0)+1000, tolerance:1e-6 }]
      } else {
        edit = { sheet:'原始读数', cell:'F24', value:data.wells[16][5]+1000 }
        const plate = data.wells.filter(w=>w[0]==='P1')
        const blank = mean(plate.filter(w=>w[2]==='空白').map(w=>w[5])), control = mean(plate.filter(w=>w[2]==='溶剂对照').map(w=>w[5]))
        const values = plate.filter(w=>w[3]===0.01).map(w=>w[5]); values[0]+=1000
        changedChecks = [{ sheet:'剂量响应', cell:'B8', expected:(mean(values)-blank)/(control-blank), tolerance:1e-6 }, { sheet:'实验总览', cell:'B6', expected:288 }]
      }
    }
    const edited = await call('office_excel_edit', { file_path:result.path, expected_revision:result.sha256, output_file:`${templateId}-edited.xlsx`, operations:[edit] })
    const changed = await call('office_recalculate', { file_path:edited.path, expected_revision:edited.sha256, output_file:`${templateId}-rechecked.xlsx`, checks:changedChecks })
    assert.equal(changed.calculation, 'PASS'); assert.deepEqual(changed.chartWarnings, [])
    const preview = await call('office_preview', { file_path:result.path, expected_revision:result.sha256, output_file:`${templateId}-generated.pdf` })
    assert.equal(preview.rendering, 'PASS')
    exampleResults.push({ templateId, source, result, edited, changed, preview })
  }

  for (const engine of [runtime.python, runtime.libreOffice]) assert.ok(engine.startsWith(path.join(resources, 'office-runtime') + path.sep), 'Use the bundled engines')
  assert.ok(runtime.pythonReadRoots.every(p => p.startsWith(path.join(resources, 'office-runtime/python') + path.sep) || p === path.join(resources, 'office-runtime/python')))
  const readiness = await call('office_runtime')
  assert.equal(readiness.status, 'ready')
  const word = await call('office_build', { language: 'javascript', output_file: '本地测试.docx', source: `import {writeFile} from 'node:fs/promises';
const document = new docx.Document({sections:[{children:[new docx.Paragraph({text:'Word 本地测试',heading:docx.HeadingLevel.TITLE}),new docx.Paragraph('采购预算为 760 元。')]}]});
await writeFile(office.output,await docx.Packer.toBuffer(document));` })
  const originalWord = await call('office_word_read', { file_path: word.path })
  const paragraph = originalWord.paragraphs.find(p => p.text.includes('760'))
  const editedWord = await call('office_word_edit', { file_path: word.path, expected_revision: word.sha256, output_file: '本地测试调整.docx',
    operations: [{ paragraph_id: paragraph.id, type: 'replace_text', find: '760', replace: '880' }] })
  assert.ok((await call('office_word_read', { file_path: editedWord.path })).paragraphs.some(p => p.text.includes('880')))
  const wordPreview = await call('office_preview', { file_path: editedWord.path, expected_revision: editedWord.sha256, output_file: 'Word预览.pdf' })
  assert.equal(wordPreview.rendering, 'PASS')
  const reference = await call('office_reference', { topic: 'excel-create' })
  const source = reference.content.match(/```python\n([\s\S]*?)```/u)[1]
  const excel = await call('office_build', { language: 'python', source, output_file: '采购.xlsx' })
  const editedExcel = await call('office_excel_edit', { file_path: excel.path, expected_revision: excel.sha256, output_file: '采购调整.xlsx', operations: [{ sheet: '采购', cell: 'B2', value: 4 }] })
  const calculated = await call('office_recalculate', { file_path: editedExcel.path, expected_revision: editedExcel.sha256, output_file: '采购已核对.xlsx', checks: [{ sheet: '采购', cell: 'D2', expected: 480 }, { sheet: '采购', cell: 'D4', expected: 880 }] })
  assert.equal(calculated.calculation, 'PASS'); assert.equal(calculated.computedCount, 3); assert.deepEqual(calculated.chartWarnings, [])
  const parts = parseZip(await readFile(path.join(values.output, calculated.path))).parts
  assert.equal([...parts.keys()].filter(p => /^xl\/charts\/chart\d+\.xml$/u.test(p)).length, 1)
  const excelPreview = await call('office_preview', { file_path: calculated.path, expected_revision: calculated.sha256, output_file: 'Excel预览.pdf' })
  assert.equal(excelPreview.rendering, 'PASS')
  const evidence = { status: 'PASS', app: values.app, node: process.execPath, skills: skills.map(s => s.name), tools: [...tools.keys()], runtime, readiness,
    businessSkillCount: 186, resourceCount, businessSamples, exampleResults,
    word, editedWord, wordPreview, excel, editedExcel, calculated, excelPreview, desktopModelAcceptance: 'NOT_RUN', nativeOfficeAcceptance: 'NOT_RUN' }
  await writeFile(path.join(values.output, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'PASS', output: values.output, skillCount: skills.length, toolCount: tools.size, word: 'generate/edit/preview PASS', excel: 'generate/chart/edit/recalculate/preview PASS', runtime: 'bundled' }))
}

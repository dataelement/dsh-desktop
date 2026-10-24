import { mkdtemp, mkdir, readFile, realpath, rm, writeFile, access, symlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID, createHash } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolRuntime, defineTool } from '@deepseek-ai/dsh-tools'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import { LocalSandboxProvider } from '@deepseek-ai/dsh-sandbox-local'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import { createDocxWorkflow, docxWorkerArgv, docxWorkerEnvironment, docxWorkerPython, docxWriteTool, registerDocxDelivery } from '../packages/dsh-desktop-office/lib/docx-workflow.js'
const cleanups = []
afterEach(async () => { for (const fn of cleanups.splice(0).reverse()) await fn() })
const sha = data => createHash('sha256').update(data).digest('hex')
async function fixture(templateId = 'government-notice') {
  const workspace = await realpath(await mkdtemp(join(tmpdir(), 'docx-layout-'))); cleanups.push(() => rm(workspace, { recursive: true, force: true }))
  const ctx = new Context()
  for (const plugin of [SystemPrompt, ToolRuntime, LocalSandboxProvider, LocalSubprocessRuntime]) { const fork = ctx.plugin(plugin, {}); await fork; cleanups.push(() => fork.dispose()) }
  const catalog = JSON.parse(await readFile(resolve('packages/dsh-desktop-office/sources/catalog.json'), 'utf8'))
  const sourceRoot = resolve('packages/dsh-desktop-office/sources', catalog.find(item => item.id === templateId).source)
  const source = await readFile(join(sourceRoot, 'example.docx'))
  const profile = await readFile(join(sourceRoot, 'generation.json')).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  const item = { id: 'notice', mode: 'word', revision: 'a'.repeat(24), sampleFile: 'example.docx', files: { 'example.docx': sha(source), ...(profile ? { 'generation.json': sha(profile) } : {}) } }
  const library = { entry: () => item, asset: async (_id, file) => file === 'example.docx' ? source : profile }
  const id = SessionId(randomUUID()); const agent = { id, session: Session.create(id, undefined, { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), isSeeded: false, cwd: workspace }) }
  let mode = 'workspace-write', selection = { documentMode: 'word', selectedDocumentTemplate: { id: item.id, mode: 'word', revision: item.revision } }
  const modes = { state: async () => selection, record: vi.fn(async () => true) }
  let currentDirectory = workspace
  const services = { sandbox: ctx.sandbox, subprocess: ctx.subprocess, workingDirectory: { ensure: async () => currentDirectory }, sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: workspace }) } }
  const workflow = createDocxWorkflow(services, library, modes, resolve('.build/office-runtime'))
  ctx.tools.register(docxWriteTool(workflow)); registerDocxDelivery(ctx, library, modes, workflow)
  const delivered = vi.fn(async () => 'presented')
  ctx.tools.register(defineTool({ name: 'present', description: 'Test delivery side effect', parameters: { files: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true } } } } }, output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] }, execute: delivered }))
  const exec = { agent, signal: new AbortController().signal }
  await writeFile(join(workspace, 'working.docx'), source)
  const prepared = await workflow.run('prepare', { path: 'working.docx' }, exec)
  const title = prepared.paragraphs.find(p => p.text.includes('关于开展2025'))
  const normal = prepared.paragraphs.find(p => p.text.startsWith('为做好2025'))
  const other = prepared.paragraphs.find(p => p.text === '一、活动主题和时间')
  const plan = templateId === 'government-notice' ? { output_path: 'result.docx', replacements: [{ id: 'p1', text: '示例市公园管理局文件' }, { id: title.id, text: '关于公园节假日开放安排的通告' }, { id: normal.id, text: '现将公园节假日开放有关事项通告如下。' }], additions: [{ after: normal.id, source: normal.id, text: '具体开放时间以已确认的安排为准。' }], removals: [other.id] } : { output_path: 'result.docx', replacements: [{ id: prepared.paragraphs.find(p => p.text && p.can_remove).id, text: '当前材料的标题与内容' }] }
  const call = async (name, args) => ctx.tools.execute({ name, arguments: args, callId: randomUUID(), ...exec })
  return { ctx, workflow, prepared, plan, call, delivered, workspace, modes, exec, setDirectory: value => { currentDirectory = value }, setMode: value => { mode = value }, clearSelection: () => { selection = {} } }
}
it('writes the real Word worker output in a changed session directory', async () => {
  const f = await fixture()
  const current = join(f.workspace, 'worktree')
  await mkdir(current)
  f.setDirectory(current)
  await f.workflow.run('write', f.plan, f.exec)
  expect((await readFile(join(current, 'result.docx'))).length).toBeGreaterThan(0)
  await expect(access(join(f.workspace, 'result.docx'))).rejects.toMatchObject({ code: 'ENOENT' })
})
it('keeps the Word worker off the Windows confinement command line', () => {
  const script = 'print("段落")\n'
  const argv = docxWorkerArgv('python.exe')
  expect(argv.join('\0')).not.toContain(script)
  expect(argv.filter(arg => arg.includes('\n'))).toEqual([])
  const env = docxWorkerEnvironment({ env: { ELECTRON_RUN_AS_NODE: '1', SystemRoot: 'C:\\Windows', SECRET: 'x' }, platform: 'win32', versions: { electron: '39.0.0' } }, script)
  expect(env.DSH_DOCX_LAYOUT_SOURCE).toBe(script)
  expect(env.ELECTRON_RUN_AS_NODE).toBe('1')
  expect(env.SystemRoot).toBe('C:\\Windows')
  expect(env.SECRET).toBeUndefined()
  expect(docxWorkerEnvironment({ env: { SystemRoot: 'C:\\Windows' }, platform: 'win32', versions: {} }).ELECTRON_RUN_AS_NODE).toBeUndefined()
  expect(() => docxWorkerEnvironment({ env: {}, platform: 'win32', versions: {} }, 'x'.repeat(24001))).toThrow('Windows environment limit')
  expect(docxWorkerPython('runtime', 'win32')).toBe(join('runtime', 'primary-runtime/dependencies/python', 'pythonw.exe'))
  expect(docxWorkerPython('runtime', 'darwin')).toBe(join('runtime', 'primary-runtime/dependencies/python', 'bin/python3'))
})
it('returns Chinese layout JSON when the Windows code page is charmap', async () => {
  const { spawn } = await import('node:child_process')
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  const sourceRoot = resolve('packages/dsh-desktop-office/sources/legacy/government-notice')
  const source = await readFile(join(sourceRoot, 'example.docx'))
  const profile = JSON.parse(await readFile(join(sourceRoot, 'generation.json'), 'utf8'))
  const workspace = await realpath(await mkdtemp(join(tmpdir(), 'docx-encoding-'))); cleanups.push(() => rm(workspace, { recursive: true, force: true }))
  await writeFile(join(workspace, 'working.docx'), source)
  const script = await readFile(resolve('packages/dsh-desktop-office/lib/docx-layout.py'), 'utf8')
  // -I ignores PYTHONIOENCODING, matching the host. Force the charmap code page on the text streams.
  const forced = "import sys,io\nsys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='cp1252')\nsys.stderr=io.TextIOWrapper(sys.stderr.buffer,encoding='cp1252')\n" + script
  const input = JSON.stringify({ command: 'prepare', args: { path: 'working.docx' }, profile, source: source.toString('base64'), sourceSha256: sha(source) })
  const stdout = await new Promise((resolvePromise, reject) => {
    const child = spawn(python, ['-I', '-B', '-c', forced], { cwd: workspace, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    const out = [], err = []
    child.stdout.on('data', chunk => out.push(chunk))
    child.stderr.on('data', chunk => err.push(chunk))
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolvePromise(Buffer.concat(out).toString('utf8')) : reject(new Error(Buffer.concat(err).toString('utf8') || `exit ${code}`)))
    child.stdin.end(input)
  })
  expect(JSON.parse(stdout).paragraphs.find(p => p.id === 'p1').text).toBe('中国中车股份有限公司文件')
})
it('edits the native template, retains layout and admits it through the real tools pipeline', async () => {
  const f = await fixture()
  expect(f.prepared.paragraphs.find(p => p.id === 'p1').text).toBe('中国中车股份有限公司文件')
  expect(f.prepared.paragraphs.find(p => p.id === 'p1').can_remove).toBe(false)
  const created = await f.call('office_template_write', f.plan)
  expect(created.isError).toBe(false)
  expect((await f.workflow.run('validate', { path: 'result.docx' }, f.exec)).checks).toContain('template-font-assignments')
  f.setMode('read-only')
  const delivery = await f.call('present', { files: [{ path: 'result.docx' }] })
  expect(delivery.isError).toBe(false); expect(f.delivered).toHaveBeenCalledOnce()
  expect(f.modes.record).toHaveBeenCalledWith(f.exec.agent.id, 'office-docx-ready', expect.objectContaining({ operation: 'validate' }))
})
it('blocks a blank-document recreation before the presentation side effect', async () => {
  const f = await fixture()
  // A fresh python-docx package lacks the fonts/footer/frame parts of this selected template.
  const module = await import('node:child_process'); const { promisify } = await import('node:util')
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  await promisify(module.execFile)(python, ['-I', '-B', '-c', "from docx import Document; import sys; d=Document(); d.add_paragraph('New notice'); d.save(sys.argv[1])", join(f.workspace, 'blank.docx')])
  const result = await f.call('present', { files: [{ path: 'blank.docx' }] })
  expect(result.isError).toBe(true); expect(JSON.stringify(result)).toContain('Word template layout check')
  expect(f.delivered).not.toHaveBeenCalled()
})
it('checks current bytes again after a previously valid output is changed', async () => {
  const f = await fixture(); await f.call('office_template_write', f.plan)
  await writeFile(join(f.workspace, 'result.docx'), 'changed')
  expect((await f.call('present', { files: [{ path: 'result.docx' }] })).isError).toBe(true)
  expect(f.delivered).not.toHaveBeenCalled()
})
it('protects the editable issuer header, the red divider and existing output files', async () => {
  const f = await fixture()
  const invalid = await f.call('office_template_write', { ...f.plan, removals: ['p1'] })
  expect(invalid.isError).toBe(true)
  await expect(access(join(f.workspace, 'result.docx'))).rejects.toThrow()
  expect((await f.call('office_template_write', f.plan)).isError).toBe(false)
  const saved = await readFile(join(f.workspace, 'result.docx'))
  expect((await f.call('office_template_write', f.plan)).isError).toBe(true)
  expect((await readFile(join(f.workspace, 'result.docx'))).equals(saved)).toBe(true)
})
it('confines paths, applies the current write policy, and keeps generic delivery after deselection', async () => {
  const f = await fixture()
  expect((await f.call('office_template_write', { ...f.plan, output_path: '../outside.docx' })).isError).toBe(true)
  const outside = await mkdtemp(join(tmpdir(), 'docx-outside-')); cleanups.push(() => rm(outside, { recursive: true, force: true }))
  await symlink(outside, join(f.workspace, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  expect((await f.call('office_template_write', { ...f.plan, output_path: 'linked/result.docx' })).isError).toBe(true)
  f.setMode('read-only')
  expect((await f.call('office_template_write', f.plan)).isError).toBe(true)
  f.clearSelection()
  expect((await f.call('present', { files: [{ path: 'existing.txt' }] })).isError).toBe(false)
  expect(f.delivered).toHaveBeenCalledOnce()
})

it.each(['coffee-market', 'equity-research', 'meeting-minutes'])('retains the native layout of the %s Word case', async name => {
  const f = await fixture(name)
  expect((await f.call('office_template_write', f.plan)).isError).toBe(false)
  expect((await f.call('present', { files: [{ path: 'result.docx' }] })).isError).toBe(false)
})
it('blocks layout and style mutations before delivery', async () => {
  const f = await fixture(); await f.call('office_template_write', f.plan)
  const resultPath = join(f.workspace, 'result.docx')
  const original = await readFile(resultPath)
  const { execFile } = await import('node:child_process'); const { promisify } = await import('node:util')
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  for (const kind of ['font', 'footer', 'divider', 'text-style', 'page-margins', 'document-grid', 'style-definition', 'table-columns']) {
    await writeFile(resultPath, original)
    await promisify(execFile)(python, ['-I', '-B', '-c', `
import sys,zipfile
from lxml import etree as E
p,kind=sys.argv[1:]; ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}; q=lambda x:'{'+ns['w']+'}'+x
with zipfile.ZipFile(p) as z:parts={name:z.read(name) for name in z.namelist()}
if kind=='font':del parts[next(name for name in parts if name.startswith('word/fonts/'))]
elif kind=='footer':del parts['word/footer1.xml']
else:
 d=E.fromstring(parts['word/document.xml'])
 if kind=='divider':
  for e in d.findall('.//w:pBdr',ns):e.getparent().remove(e)
 if kind=='text-style':d.find('.//w:body/w:p/w:r/w:rPr/w:sz',ns).set(q('val'),'100')
 if kind=='page-margins':d.find('.//w:pgMar',ns).set(q('left'),'700')
 if kind=='document-grid':d.find('.//w:docGrid',ns).set(q('linePitch'),'720')
 if kind=='table-columns':d.find('.//w:tblGrid/w:gridCol',ns).set(q('w'),'100')
 if kind=='style-definition':
  styles=E.fromstring(parts['word/styles.xml']);styles.find('.//w:sz',ns).set(q('val'),'100');parts['word/styles.xml']=E.tostring(styles)
 parts['word/document.xml']=E.tostring(d)
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in parts.items():z.writestr(name,data)
`, resultPath, kind])
    expect((await f.call('present', { files: [{ path: 'result.docx' }] })).isError).toBe(true)
    expect(f.delivered).not.toHaveBeenCalled()
  }
}, 60_000)

it('retains mixed heading/body typography with explicit native run references', async () => {
  const f = await fixture()
  const heading = f.prepared.paragraphs.find(p => p.text.startsWith('（一）')), body = f.prepared.paragraphs.find(p => p.text.startsWith('为做好2025'))
  const text = '（一）预约安排。当前材料中的开放安排。'
  f.plan.additions = [{ after: heading.id, source: heading.id, text, runs: [{ source: heading.runs.find(r => r.text).id, text: '（一）预约安排。' }, { source: body.runs.find(r => r.text).id, text: '当前材料中的开放安排。' }] }]
  expect((await f.call('office_template_write', f.plan)).isError).toBe(false)
  expect((await f.call('present', { files: [{ path: 'result.docx' }] })).isError).toBe(false)
})

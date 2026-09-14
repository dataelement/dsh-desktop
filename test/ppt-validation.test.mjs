import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, readdir, realpath, rm, symlink } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import yaml from 'js-yaml'
import { unzipSync } from 'fflate'
import { validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'

let packageRoot, apply, cli
const cleanups = []
beforeAll(async () => {
  // Test the distributable archive, with ordinary dependency resolution from node_modules.
  packageRoot = await mkdtemp(path.resolve('node_modules/.ppt-validation-'))
  execFileSync('tar', ['-xzf', 'packages/ppt-bundles/dsh-ppt-0.1.1-rc.2-desktop-20260906.tgz', '-C', packageRoot, '--strip-components=1'])
  ;({ apply } = await import(pathToFileURL(path.join(packageRoot, 'lib/index.js'))))
  cli = path.join(packageRoot, 'lib/bin.js')
})
afterAll(async () => { if (packageRoot) await rm(packageRoot, { recursive: true, force: true }) })
afterEach(async () => { for (const dir of cleanups.splice(0)) await rm(dir, { recursive: true, force: true }) })

async function fixture({ broken = true, malformed = false } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'ppt-validation-')))
  cleanups.push(root)
  const workspace = path.join(root, 'workspace')
  const project = path.join(workspace, 'deck')
  await mkdir(path.join(project, 'pages'), { recursive: true })
  const files = Array.from({ length: 4 }, (_, i) => `pages/${i + 1}.page`)
  await writeFile(path.join(project, 'deck.pptd'), yaml.dump({ version: 'v2', title: 'Validation fixture', size: [960, 540], pages: files }))
  async function writePages(invalid) {
    for (const [i, file] of files.entries()) await writeFile(path.join(project, file), yaml.dump({
      elements: [{ elementId: 'shared-caption', elementType: 'text', bounds: [48, 80, 800, invalid ? 1 : 100], content: { text: `Readable caption ${i + 1}`, fontSize: 32, fontFamily: 'Arial' } }]
    }))
  }
  await writePages(broken)
  if (malformed) await writeFile(path.join(project, files[0]), 'elements: [\n')
  const tools = new Map()
  let rpc
  const host = {
    // The plugin scopes its webServer work under ctx.inject(['webServer'])
    // (0.1.5 owns connection routes on the reading Context). Give the fake host
    // the two members those callbacks touch so they run inertly.
    effect: (run) => { run?.(); return () => {} },
    webServer: { register: () => () => {} },
    inject: (services, callback) => {
      if (services?.includes?.('webServer')) callback?.(host)
    },
    skills: { registerProvider() {} }, systemPrompt: { section() {} }, on() {},
    tools: { register: tool => tools.set(tool.name, tool) },
    connection: { rpc: { handle: (_route, handler) => { rpc = handler } } }
  }
  await apply(host, { root: path.join(root, 'storage') })
  const exec = { agent: { id: randomUUID(), session: { header: { cwd: workspace } } }, signal: new AbortController().signal }
  async function run(name, args) {
    const tool = tools.get(name)
    const value = await tool.execute(args, exec)
    expect(validateJsonSchemaValue(tool.output.schema, value, 'value')).toEqual([])
    return { value, text: tool.output.render(args, value).map(c => c.text ?? '').join('\n') }
  }
  return { root, workspace, project, exec, run, writePages, rpc }
}

describe('PPT validation authoring loop', () => {
  it('returns all page-qualified issues normally without publishing, then exports after correction', async () => {
    const f = await fixture()
    const checked = await f.run('pptd_check', { project_path: 'deck' })
    expect(checked.value.status).toBe('needs_revision')
    const overflows = checked.value.issues.filter(i => i.code === 'text-overflow')
    expect(overflows).toHaveLength(4)
    expect(overflows.map(i => i.page)).toEqual([1, 2, 3, 4])
    expect(overflows.map(i => i.file)).toEqual(['pages/1.page', 'pages/2.page', 'pages/3.page', 'pages/4.page'])
    expect(new Set(overflows.map(i => i.elementId))).toEqual(new Set(['shared-caption']))
    const first = await f.run('pptd_render', { project_path: 'deck', output_file: 'result.pptx' })
    expect(first.value).toEqual({ status: 'needs_revision', check: checked.value })
    expect(first.text).toContain('尚未导出 PPTX')
    expect(first.text).toContain('第 4 页 · pages/4.page · 元素 shared-caption')
    expect(first.text).not.toContain('Error:')
    expect(await readdir(f.workspace)).toEqual(['deck'])
    expect((await f.rpc('state', { sessionId: f.exec.agent.id })).value.data.decks).toHaveLength(0)
    await f.writePages(false)
    const next = await f.run('pptd_check', { project_path: 'deck/deck.pptd' })
    expect(next.value.errorCount).toBe(0)
    expect(next.value.digest).not.toBe(checked.value.digest)
    const rendered = await f.run('pptd_render', { project_path: 'deck', output_file: 'result.pptx' })
    expect(rendered.value.status).toBe('exported')
    expect(rendered.value.check.errorCount).toBe(0)
    expect(rendered.value.pageCount).toBe(4)
    const zip = unzipSync(await readFile(path.join(f.workspace, rendered.value.outputPath)))
    expect(Object.keys(zip).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))).toHaveLength(4)
    expect((await f.rpc('state', { sessionId: f.exec.agent.id })).value.data.decks).toHaveLength(1)
  })

  it('returns YAML diagnostics as revision feedback, while path and argument faults still reject', async () => {
    const f = await fixture({ malformed: true })
    const { value } = await f.run('pptd_render', { project_path: 'deck', output_file: 'result.pptx' })
    expect(value.status).toBe('needs_revision')
    expect(value.check.issues.some(i => i.code === 'yaml-syntax' && i.file === 'pages/1.page')).toBe(true)
    await expect(f.run('pptd_check', { project_path: '../outside' })).rejects.toThrow('inside the active workspace')
    await expect(f.run('pptd_check', { project_path: 'missing' })).rejects.toThrow()
    await expect(f.run('pptd_render', { project_path: 'deck' })).rejects.toThrow('output_file')
    f.exec.signal = AbortSignal.abort()
    await expect(f.run('pptd_check', { project_path: 'deck' })).rejects.toThrow()
  })

  it('accepts an empty hash only for creation and retains replacement protections', async () => {
    const f = await fixture({ broken: false })
    const args = { project_path: 'new deck', file_path: 'pages/1.page', content: 'elements: []\n', expected_sha256: '' }
    const created = await f.run('pptd_write_file', args)
    expect(created.value.operation).toBe('create')
    for (const hash of ['', undefined, '0'.repeat(64)]) {
      await expect(f.run('pptd_write_file', { ...args, content: 'changed', expected_sha256: hash })).rejects.toThrow()
    }
    expect(await readFile(path.join(f.workspace, 'new deck/pages/1.page'), 'utf8')).toBe(args.content)
    const read = await f.run('pptd_read_file', { project_path: 'new deck', file_path: 'pages/1.page' })
    const replaced = await f.run('pptd_write_file', { ...args, content: 'elements: [] # updated\n', expected_sha256: read.value.sha256 })
    expect(replaced.value.operation).toBe('replace')
    await expect(f.run('pptd_write_file', { ...args, expected_sha256: read.value.sha256 })).rejects.toThrow('changed after')
    await expect(f.run('pptd_write_file', { ...args, file_path: 'pages/2.page', expected_sha256: 'a'.repeat(64) })).rejects.toThrow('only when replacing')
  })

  it('groups misplaced text styles, skips cascading overflow, and supplies directly usable read arguments', { timeout: 15_000 }, async () => {
    const f = await fixture()
    const file = path.join(f.project, 'pages/1.page')
    const page = { elements: [{ elementId: 'shared-caption', elementType: 'text', bounds: [48, 80, 800, 16],
      content: { text: 'A short source' }, fontFamily: 'Arial', fontSize: 9, bold: true, color: '#111111' }] }
    await writeFile(file, yaml.dump(page))
    const checked = await f.run('pptd_check', { project_path: 'deck/deck.pptd' })
    const misplaced = checked.value.issues.filter(i => i.code === 'misplaced-text-style')
    expect(misplaced).toHaveLength(4)
    const cliCheck = spawnSync(process.execPath, [cli, 'check', f.project, '--json'], { encoding: 'utf8', timeout: 10_000 })
    expect(cliCheck.status).toBe(1)
    const cliIssues = JSON.parse(cliCheck.stdout).issues
    expect(cliIssues.filter(i => i.code === 'misplaced-text-style')).toHaveLength(4)
    expect(cliIssues.filter(i => i.code === 'text-overflow').map(i => i.page)).toEqual([2, 3, 4])
    expect(checked.text.match(/\[misplaced-text-style\]/g)).toHaveLength(1)
    expect(checked.text).toContain('移入 content 内')
    expect(checked.value.issues.filter(i => i.code === 'text-overflow').map(i => i.page)).toEqual([2, 3, 4])
    expect(misplaced[0].absolutePath).toBe(await realpath(file))
    expect(misplaced[0].readArgs).toEqual({ project_path: 'deck', file_path: 'pages/1.page' })
    expect((await f.run('pptd_read_file', misplaced[0].readArgs)).value.content).toBe(await readFile(file, 'utf8'))
    const blocked = await f.run('pptd_render', { project_path: 'deck', output_file: 'invalid.pptx' })
    expect(blocked.value.status).toBe('needs_revision')
    for (const key of ['fontFamily', 'fontSize', 'bold', 'color']) { page.elements[0].content[key] = page.elements[0][key]; delete page.elements[0][key] }
    await writeFile(file, yaml.dump(page))
    const fixed = await f.run('pptd_check', { project_path: 'deck' })
    expect(fixed.value.issues.some(i => i.page === 1 && i.severity === 'error')).toBe(false)
    expect(fixed.value.issues.filter(i => i.code === 'text-overflow').map(i => i.page)).toEqual([2, 3, 4])
  })

  it('keeps warnings visible and non-blocking', async () => {
    const f = await fixture({ broken: false })
    const file = path.join(f.project, 'pages/1.page')
    const page = yaml.load(await readFile(file, 'utf8'))
    page.elements.push({ ...page.elements[0], elementId: 'overlapping-caption' })
    await writeFile(file, yaml.dump(page))
    const checked = await f.run('pptd_check', { project_path: 'deck' })
    expect(checked.value.status).toBe('warning')
    expect(checked.value.errorCount).toBe(0)
    expect(checked.value.warningCount).toBeGreaterThan(0)
    const result = await f.run('pptd_render', { project_path: 'deck', output_file: 'warning.pptx' })
    expect(result.value.status).toBe('exported')
    expect(result.text).toContain('校验通过，有建议')
  })

  it('CLI entry works directly and through a .bin symlink, and failed render prints all diagnostics', async () => {
    const f = await fixture()
    const link = path.join(f.root, 'bin with spaces', 'dsh-pptd')
    await mkdir(path.dirname(link))
    const entries = [cli]
    if (process.platform !== 'win32') { await symlink(cli, link); entries.push(link) }
    for (const entry of entries) {
      const help = spawnSync(process.execPath, [entry, '--help'], { encoding: 'utf8', timeout: 10_000 })
      expect(help.status).toBe(0)
      expect(help.stdout).toContain('check')
      const check = spawnSync(process.execPath, [entry, 'check', f.project, '--json'], { encoding: 'utf8', timeout: 10_000 })
      expect(check.status).toBe(1)
      expect(check.stderr).toBe('')
      expect(JSON.parse(check.stdout).issues.filter(i => i.code === 'text-overflow')).toHaveLength(4)
      const render = spawnSync(process.execPath, [entry, 'render', f.project, '-o', path.join(f.workspace, 'failed.pptx'), '--json'], { encoding: 'utf8', timeout: 10_000 })
      expect(render.status).toBe(1)
      const report = JSON.parse(render.stdout)
      expect(report.status).toBe('needs_revision')
      expect(report.exported).toBe(false)
      expect(report.issues.filter(i => i.code === 'text-overflow')).toHaveLength(4)
      expect(await readdir(f.workspace)).toEqual(['deck'])
    }
    const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(cli).href)})`], { encoding: 'utf8', timeout: 10_000 })
    expect(imported.status).toBe(0)
    expect(imported.stdout).toBe('')
  }, 80_000) // Up to seven cold CLI starts on macOS, each independently limited to 10s.
})

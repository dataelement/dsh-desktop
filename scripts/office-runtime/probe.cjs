/** Run on the packaged Electron runtime, resolving every service from app.asar. */
const { createRequire } = require('node:module')
const { dirname, join, resolve } = require('node:path')
const { pathToFileURL } = require('node:url')
const assert = require('node:assert/strict')

// bwrap gives workspace-write a private /tmp. A test resources symlink under
// host /tmp is therefore invisible to the child; use the existing physical
// runtime, without adding mounts or write grants. Real runtimes under /tmp
// remain subject to that isolation (realpath does not bypass it).
async function confinedRuntime(resources) {
  return require('node:fs/promises').realpath(join(resources, 'office-runtime'))
}

async function probe(appRoot, resources, fixtures) {
  const host = createRequire(join(appRoot, 'package.json'))
  const load = name => import(pathToFileURL(host.resolve(name)).href)
  const { Context } = await load('@deepseek-ai/cordis')
  const ctx = new Context()
  const fibers = []
  try {
    for (const name of ['@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-skill']) {
      fibers.push(await ctx.plugin((await load(name)).default))
    }
    fibers.push(await ctx.plugin(await load('dsh-desktop-office'), {
      resources: join(resources, 'office-runtime')
    }))
    fibers.push(await ctx.plugin(await load('@deepseek-ai/dsh-skill-office'), {}))
    fibers.push(await ctx.plugin(await load('@deepseek-ai/dsh-tool-workspace-dependencies'), {
      source: join(resources, 'office-runtime', 'primary-runtime')
    }))
    const skills = await ctx.skills.list()
    for (const name of ['gov-doc-writing', 'meeting-recap', 'work-report-writer', 'research-writer', 'saas-metrics-coach', 'dataset-health-audit', 'data-viz-gen']) {
      const skill = await ctx.skills.get(name)
      assert(skill, `Missing business skill ${name}`)
      assert.equal(resolve(skill.resourceBase.path), join(resources, 'office-runtime', 'business-skills', name), `Unexpected resources for ${name}`)
    }
    const entry = pathToFileURL(host.resolve('dsh-desktop-office'))
    const { createTemplateLibrary } = await import(new URL('./lib/templates.js', entry).href)
    const library = await createTemplateLibrary(join(resources, 'office-runtime', 'templates'))
    const templates = await library.list()
    assert.equal(templates.length, 7)
    assert.deepEqual(templates.filter(item => item.mode === 'word').map(item => item.id), ['government-notice', 'meeting-minutes', 'coffee-market', 'equity-research'])
    assert.equal(library.entry('meeting-minutes').pages, 3)
    assert.deepEqual(templates.filter(item => item.mode === 'excel').map(item => item.id), ['annual-business', 'port-cargo', 'bio-assay'])
    for (const template of templates) {
      for (const file of Object.keys(library.entry(template.id).files)) await library.asset(template.id, file)
    }
    const { createPersonalOfficeLibrary, personalOfficeRenderer } = await import(new URL('./lib/personal-templates.js', entry).href)
    const personal = await createPersonalOfficeLibrary(
      join(fixtures, 'personal-templates'), library,
      personalOfficeRenderer(join(resources, 'office-runtime'), join(resources, 'office-cli.mjs'))
    )
    for (const [mode, fileName] of [['word', 'sample.docx'], ['excel', 'sample.xlsx']]) {
      const original = await require('node:fs/promises').readFile(join(fixtures, fileName))
      const item = await personal.import({ mode, fileName, data: original.toString('base64') })
      assert.equal(item.mode, mode)
      const preview = await personal.preview(item.id, 1)
      assert(preview.image.startsWith('data:image/webp;base64,'))
      const prepared = await personal.prepare(item.id, item)
      const workingCopy = prepared.files.find(file => file.path === personal.entry(item.id).sampleFile)
      assert(workingCopy)
      assert.deepEqual(Buffer.from(workingCopy.data, 'base64'), original)
    }
    console.log('Packaged personal DOCX and XLSX import, preview and native working copy passed')
    const client = await require('node:fs/promises').readFile(host.resolve('dsh-desktop-office/client'), 'utf8')
    assert(client.includes('window.__ModuleLoader__.load'))
    assert(client.includes('conversation.hero.options'))
    const officialSkillRoot = dirname(host.resolve('@deepseek-ai/dsh-skill-office/package.json'))
    for (const name of ['office', 'office-docx', 'office-pptx', 'office-xlsx']) {
      assert(skills.some(skill => skill.name === name), `Missing packaged Office skill ${name}`)
      const skill = await ctx.skills.get(name)
      assert.equal(resolve(skill.resourceBase.path), join(officialSkillRoot, 'assets', name), `Unexpected resources for ${name}`)
    }
    const tool = ctx.tools.get('load_workspace_dependencies')
    assert(tool, 'Missing packaged dependency tool')
    const dependencies = await tool.execute({})
    assert(dependencies.python.startsWith(join(resources, 'office-runtime')))
    assert.equal(dependencies.node, undefined)
    // Exercise the fixed editor from app.asar on the installed Python and actual file sandbox.
    const { mkdtemp, realpath, writeFile, rm } = require('node:fs/promises')
    const { tmpdir } = require('node:os')
    const scratch = await realpath(await mkdtemp(join(tmpdir(), 'packaged-docx-layout-')))
    const nativeFibers = []
    try {
      for (const plugin of ['@deepseek-ai/dsh-sandbox-local', '@deepseek-ai/dsh-subprocess-local']) nativeFibers.push(await ctx.plugin((await load(plugin)).default))
      const { createDocxWorkflow } = await import(new URL('./lib/docx-workflow.js', entry).href)
      const item = library.entry('government-notice')
      const modes = { state: async () => ({ documentMode: 'word', selectedDocumentTemplate: { id: item.id, revision: item.revision, mode: 'word' } }), record: async () => true }
      const workflow = createDocxWorkflow({ sandbox: ctx.sandbox, subprocess: ctx.subprocess, workingDirectory: { ensure: async () => scratch }, sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: scratch }) } }, library, modes, await confinedRuntime(resources))
      const exec = { agent: { id: 'packaged-notice', session: { header: { cwd: scratch } } }, signal: new AbortController().signal }
      await writeFile(join(scratch, 'source.docx'), await library.asset(item.id, item.sampleFile))
      const prepared = await workflow.run('prepare', { path: 'source.docx' }, exec)
      assert(prepared.paragraphs.some(p => p.id === 'p0' && p.text === '示例市公共服务中心文件'))
      await workflow.run('write', { output_path: 'notice.docx', replacements: [{ id: 'p0', text: '示例单位文件' }] }, exec)
      const verified = await workflow.run('validate', { path: 'notice.docx' }, exec)
      assert(verified.checks.includes('paragraph-and-run-styles'))
      console.log('Packaged native Word template editor, embedded-font retention and layout validation passed')
    } finally {
      for (const fiber of nativeFibers.reverse()) await fiber.dispose()
      await rm(scratch, { recursive: true, force: true })
    }
    console.log('Packaged Office plugin activated; seven templates, seven business skills and the official runtime resolve current physical resources')
  } finally {
    for (const fiber of fibers.reverse()) await fiber.dispose()
  }
}
module.exports = { confinedRuntime }

if (require.main === module) {
  probe(process.argv[2], process.argv[3], process.argv[4]).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}

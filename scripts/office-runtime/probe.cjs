/** Run on the packaged Electron runtime, resolving every service from app.asar. */
const { createRequire } = require('node:module')
const { join } = require('node:path')
const { pathToFileURL } = require('node:url')
const assert = require('node:assert/strict')

async function probe(appRoot, resources) {
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
      resources: join(resources, 'office-runtime'),
      cli: join(resources, 'office-cli.mjs')
    }))
    const skills = await ctx.skills.list()
    for (const name of ['gov-doc-writing', 'meeting-recap', 'work-report-writer', 'research-writer', 'saas-metrics-coach', 'dataset-health-audit', 'data-viz-gen']) {
      const skill = await ctx.skills.get(name)
      assert(skill, `Missing business skill ${name}`)
      assert(skill.resourceBase.path.startsWith(join(resources, 'office-runtime', 'business-skills')))
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
    const client = await require('node:fs/promises').readFile(host.resolve('dsh-desktop-office/client'), 'utf8')
    assert(client.includes('window.__ModuleLoader__.load'))
    assert(client.includes('conversation.hero.modeActions'))
    for (const name of ['office-docx', 'office-pptx', 'office-xlsx']) {
      assert(skills.some(skill => skill.name === name), `Missing packaged Office skill ${name}`)
      const skill = await ctx.skills.get(name)
      assert(skill.resourceBase.path.startsWith(join(resources, 'office-runtime', 'office-skills')))
      // Upstream supplies command paths as JSON, escaping Windows separators.
      assert(skill.content.includes(JSON.stringify(process.execPath)), 'Office CLI must use the current Electron runtime')
      assert(skill.content.includes(JSON.stringify(join(resources, 'office-cli.mjs'))), 'Office CLI must resolve from the current installation')
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
      const workflow = createDocxWorkflow({ sandbox: ctx.sandbox, subprocess: ctx.subprocess, sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: scratch }) } }, library, modes, join(resources, 'office-runtime'))
      const exec = { agent: { id: 'packaged-notice', session: { header: { cwd: scratch } } }, signal: new AbortController().signal }
      await writeFile(join(scratch, 'source.docx'), await library.asset(item.id, item.sampleFile))
      const prepared = await workflow.run('prepare', { path: 'source.docx' }, exec)
      assert(prepared.paragraphs.some(p => p.id === 'p1' && p.text === '中国中车股份有限公司文件'))
      await workflow.run('write', { output_path: 'notice.docx', replacements: [{ id: 'p1', text: '示例单位文件' }] }, exec)
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
probe(process.argv[2], process.argv[3]).catch(error => {
  console.error(error)
  process.exitCode = 1
})

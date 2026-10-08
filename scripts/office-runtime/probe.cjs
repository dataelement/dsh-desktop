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
    console.log('Packaged Office plugin activated; skills and dependency tool resolve current physical resources')
  } finally {
    for (const fiber of fibers.reverse()) await fiber.dispose()
  }
}
probe(process.argv[2], process.argv[3]).catch(error => {
  console.error(error)
  process.exitCode = 1
})

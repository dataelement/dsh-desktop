import { isAbsolute, join } from 'node:path'
import * as officeSkills from '@deepseek-ai/dsh-skill-office'
import * as workspaceDependencies from '@deepseek-ai/dsh-tool-workspace-dependencies'
import { createTemplateLibrary } from './lib/templates.js'
import { registerBusinessSkills } from './lib/business-skills.js'
import { registerOfficeContext, registerOfficeRoutes } from './lib/modes.js'
import { templateTool } from './lib/template-tool.js'
import { createDocxWorkflow, docxWriteTool, registerDocxDelivery } from './lib/docx-workflow.js'

export const name = 'desktop-office'
export const inject = ['skills']

/** Installation-owned resources; neither Profile paths nor cwd are anchors. */
export async function apply(ctx, config) {
  if (!config || typeof config.resources !== 'string' || !isAbsolute(config.resources)
    || typeof config.cli !== 'string' || !isAbsolute(config.cli)) {
    ctx.logger?.warn?.('desktop-office: disabled, absolute resources and CLI paths are required')
    return
  }
  // Validate the immutable payload at activation; if missing or corrupted,
  // gracefully degrade by disabling office features instead of crashing Harness.
  try {
    await workspaceDependencies.resolvePrimaryRuntime(join(config.resources, 'primary-runtime'))
    await ctx.plugin(workspaceDependencies, { source: join(config.resources, 'primary-runtime') })
    await ctx.plugin(officeSkills, {
      assetRoot: join(config.resources, 'office-skills'),
      node: process.execPath,
      cli: config.cli
    })
    registerBusinessSkills(ctx, join(config.resources, 'business-skills'))
    const library = await createTemplateLibrary(join(config.resources, 'templates'))
    ctx.inject(['officeModes', 'tools', 'skills', 'workingDirectory', 'sandboxPolicy', 'sandbox', 'subprocess'], scoped => {
      registerOfficeContext(scoped, library, scoped.officeModes)
      const docx = createDocxWorkflow(scoped, library, scoped.officeModes, config.resources)
      scoped.tools.register(templateTool(scoped, library, scoped.officeModes, docx))
      scoped.tools.register(docxWriteTool(docx))
      registerDocxDelivery(scoped, library, scoped.officeModes, docx)
      scoped.inject(['connection'], routes => registerOfficeRoutes(routes, library, scoped.officeModes))
    })
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: office runtime initialization failed, degrading gracefully: ${error?.message || error}`)
  }
}

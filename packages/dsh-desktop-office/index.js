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
  return composeOffice(ctx, config)
}

/**
 * Share Office workflows; callers own mode persistence and runtime registration.
 * Registrations stay on the caller's Cordis scope, including its injected scopes.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {import('./index.js').Config} config
 * @param {import('./index.js').OfficeModes} [modes]
 * @param {import('./index.js').OfficeRuntimeModules} [runtime]
 */
export async function composeOffice(ctx, config, modes, runtime = { officeSkills, workspaceDependencies }) {
  if (!config || typeof config.resources !== 'string' || !isAbsolute(config.resources)
    || typeof config.cli !== 'string' || !isAbsolute(config.cli)) {
    ctx.logger?.warn?.('desktop-office: disabled, absolute resources and CLI paths are required')
    return
  }
  // Validate the immutable payload at activation; if missing or corrupted,
  // gracefully degrade by disabling office features instead of crashing Harness.
  try {
    const { officeSkills, workspaceDependencies } = runtime
    await workspaceDependencies.resolvePrimaryRuntime(join(config.resources, 'primary-runtime'))
    await ctx.plugin(workspaceDependencies, { source: join(config.resources, 'primary-runtime') })
    await ctx.plugin(officeSkills, {
      assetRoot: join(config.resources, 'office-skills'),
      node: process.execPath,
      cli: config.cli
    })
    registerBusinessSkills(ctx, join(config.resources, 'business-skills'))
    const library = await createTemplateLibrary(join(config.resources, 'templates'))
    ctx.inject([...(modes ? [] : ['officeModes']), 'tools', 'skills', 'workingDirectory', 'sandboxPolicy', 'sandbox', 'subprocess'], scoped => {
      const activeModes = modes ?? scoped.officeModes
      registerOfficeContext(scoped, library, activeModes)
      const docx = createDocxWorkflow(scoped, library, activeModes, config.resources)
      scoped.tools.register(templateTool(scoped, library, activeModes, docx))
      scoped.tools.register(docxWriteTool(docx))
      registerDocxDelivery(scoped, library, activeModes, docx)
      scoped.inject(['connection'], routes => registerOfficeRoutes(routes, library, activeModes))
    })
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: office runtime initialization failed, degrading gracefully: ${error?.message || error}`)
  }
}

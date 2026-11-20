import { isAbsolute, join } from 'node:path'
import { resolvePrimaryRuntime } from '@deepseek-ai/dsh-tool-workspace-dependencies'
import { createTemplateLibrary } from './lib/templates.js'
import { registerBusinessSkills } from './lib/business-skills.js'
import { registerOfficeContext, registerOfficeRoutes } from './lib/modes.js'
import { templateTool } from './lib/template-tool.js'
import { createDocxWorkflow, docxWriteTool, registerDocxDelivery } from './lib/docx-workflow.js'

export const name = 'desktop-office'
export const inject = ['skills']

async function registerOfficeWorkflows(ctx, config, { modes, runtimeReady }) {
  registerBusinessSkills(ctx, join(config.resources, 'business-skills'))
  const builtins = await createTemplateLibrary(join(config.resources, 'templates'))
  const home = process.env.DSH_HOME
  let library = builtins
  if (home && isAbsolute(home)) {
    try {
      // An incomplete optional upload package must not abort the Host import.
      const { createPersonalOfficeLibrary, personalOfficeRenderer } = await import('./lib/personal-templates.js')
      library = await createPersonalOfficeLibrary(
        join(home, 'office-templates'), builtins, personalOfficeRenderer(config.resources, config.cli),
        id => ctx.logger?.warn?.(`desktop-office: skipping invalid personal template record ${id}`)
      )
    } catch (error) {
      ctx.logger?.warn?.(`desktop-office: personal template library unavailable; keeping built-in templates: ${error?.message || error}`)
    }
  }
  ctx.inject([...(modes ? [] : ['officeModes']), 'tools', 'skills', 'workingDirectory', 'sandboxPolicy', 'sandbox', 'subprocess'], scoped => {
    const activeModes = modes ?? scoped.officeModes
    registerOfficeContext(scoped, library, activeModes)
    if (runtimeReady) {
      const docx = createDocxWorkflow(scoped, library, activeModes, config.resources)
      scoped.tools.register(templateTool(scoped, library, activeModes, docx))
      scoped.tools.register(docxWriteTool(docx))
      registerDocxDelivery(scoped, library, activeModes, docx)
    }
    scoped.inject(['connection'], routes => registerOfficeRoutes(routes, library, activeModes))
  })
}

/** Installation-owned resources; neither Profile paths nor cwd are anchors. */
export async function apply(ctx, config) {
  if (!config || typeof config.resources !== 'string' || !isAbsolute(config.resources)) {
    ctx.logger?.warn?.('desktop-office: disabled, an absolute resources path is required')
    return
  }
  // Official skill-office and workspace-dependencies stay on the default
  // composition. A bad bundled runtime only disables template writing.
  let runtimeReady = false
  try {
    await resolvePrimaryRuntime(join(config.resources, 'primary-runtime'))
    runtimeReady = true
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: primary runtime unavailable, template write disabled: ${error?.message || error}`)
  }
  try {
    await registerOfficeWorkflows(ctx, config, { runtimeReady })
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: template library initialization failed, degrading gracefully: ${error?.message || error}`)
  }
}

/**
 * Share Office workflows; callers own mode persistence and runtime registration.
 * Registrations stay on the caller's Cordis scope, including its injected scopes.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {import('./index.js').Config} config
 * @param {import('./index.js').OfficeModes} [modes]
 * @param {import('./index.js').OfficeRuntimeModules} [runtime]
 */
export async function composeOffice(ctx, config, modes, runtime) {
  if (!config || typeof config.resources !== 'string' || !isAbsolute(config.resources)
    || typeof config.cli !== 'string' || !isAbsolute(config.cli)) {
    ctx.logger?.warn?.('desktop-office: disabled, absolute resources and CLI paths are required')
    return
  }
  // Validate the immutable payload at activation; if missing or corrupted,
  // gracefully degrade by disabling office features instead of crashing Harness.
  try {
    const resolvedRuntime = runtime ?? {
      officeSkills: await import('@deepseek-ai/dsh-skill-office'),
      workspaceDependencies: await import('@deepseek-ai/dsh-tool-workspace-dependencies')
    }
    const { officeSkills, workspaceDependencies } = resolvedRuntime
    await workspaceDependencies.resolvePrimaryRuntime(join(config.resources, 'primary-runtime'))
    await ctx.plugin(workspaceDependencies, { source: join(config.resources, 'primary-runtime') })
    await ctx.plugin(officeSkills, {
      assetRoot: join(config.resources, 'office-skills'),
      node: process.execPath,
      cli: config.cli
    })
    await registerOfficeWorkflows(ctx, config, { modes, runtimeReady: true })
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: office runtime initialization failed, degrading gracefully: ${error?.message || error}`)
  }
}

import { isAbsolute, join } from 'node:path'
import { resolvePrimaryRuntime } from '@deepseek-ai/dsh-tool-workspace-dependencies'
import { createTemplateLibrary } from './lib/templates.js'
import { registerBusinessSkills } from './lib/business-skills.js'
import { registerOfficeContext, registerOfficeRoutes } from './lib/modes.js'
import { templateTool } from './lib/template-tool.js'
import { createDocxWorkflow, docxWriteTool, registerDocxDelivery } from './lib/docx-workflow.js'

export const name = 'desktop-office'
export const inject = ['skills']

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
    registerBusinessSkills(ctx, join(config.resources, 'business-skills'))
    const library = await createTemplateLibrary(join(config.resources, 'templates'))
    ctx.inject(['officeModes', 'tools', 'skills', 'workingDirectory', 'sandboxPolicy', 'sandbox', 'subprocess'], scoped => {
      registerOfficeContext(scoped, library, scoped.officeModes)
      if (runtimeReady) {
        const docx = createDocxWorkflow(scoped, library, scoped.officeModes, config.resources)
        scoped.tools.register(templateTool(scoped, library, scoped.officeModes, docx))
        scoped.tools.register(docxWriteTool(docx))
        registerDocxDelivery(scoped, library, scoped.officeModes, docx)
      }
      scoped.inject(['connection'], routes => registerOfficeRoutes(routes, library, scoped.officeModes))
    })
  } catch (error) {
    ctx.logger?.warn?.(`desktop-office: template library initialization failed, degrading gracefully: ${error?.message || error}`)
  }
}

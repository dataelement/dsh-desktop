import { isAbsolute, join } from 'node:path'
import * as officeSkills from '@deepseek-ai/dsh-skill-office'
import * as workspaceDependencies from '@deepseek-ai/dsh-tool-workspace-dependencies'

export const name = 'desktop-office'

/** Installation-owned resources; neither Profile paths nor cwd are anchors. */
export async function apply(ctx, config) {
  if (!config || typeof config.resources !== 'string' || !isAbsolute(config.resources)
    || typeof config.cli !== 'string' || !isAbsolute(config.cli)) {
    throw new Error('desktop-office: absolute resources and CLI paths are required')
  }
  // Validate the immutable payload at activation; tool calls still use upstream
  // validation and retry behavior. Safe Mode omits this optional composition.
  await workspaceDependencies.resolvePrimaryRuntime(join(config.resources, 'primary-runtime'))
  await ctx.plugin(workspaceDependencies, { source: join(config.resources, 'primary-runtime') })
  await ctx.plugin(officeSkills, {
    assetRoot: join(config.resources, 'office-skills'),
    node: process.execPath,
    cli: config.cli
  })
}

import { createOfficePptxScopePolicyController } from './office-pptx-scope-policy.js'

/**
 * Refresh only this live Agent's workflow policy before skills/tools are collected.
 * Desktop keeps its existing skills/invocation hook; Web package assembly opts in here.
 * @param {import('@deepseek-ai/cordis').Context} ctx Plugin lifetime context.
 * @param {{ state: (id: string) => Promise<{ presentationMode?: string }> }} modes
 * @returns {() => void} Remove the listener and all owned contributions.
 */
export function installWebModePolicy(ctx, modes) {
  const controller = createOfficePptxScopePolicyController()
  const cleanup = ctx.effect(() => () => controller.dispose())
  const off = ctx.on('system-prompt/prepare', async ({ agent, scope, signal }) => {
    signal?.throwIfAborted()
    if (!agent) return
    if (scope !== agent) throw new Error('PPT Web policy requires matching Agent assembly scope')
    const state = await modes.state(agent.id)
    signal?.throwIfAborted()
    const active = state.presentationMode === 'ppt'
    const cwd = active ? await ctx.workingDirectory.ensure(agent, signal) : undefined
    await controller.sync(agent, { active, cwd, signal })
    signal?.throwIfAborted()
  })
  return () => { off(); cleanup() }
}

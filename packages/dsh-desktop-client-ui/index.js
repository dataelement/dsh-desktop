import { registerDesktopBootRoute } from './boot.js'
import { repairPresetDefinition } from './repair-preset.js'

/** The registry and tools belong to the existing Harness runtime. */
export const inject = ['agentPresets']
export async function apply(ctx) {
  registerDesktopBootRoute(ctx)
  const dispose = await ctx.agentPresets.register(repairPresetDefinition())
  ctx.effect(() => dispose)
}

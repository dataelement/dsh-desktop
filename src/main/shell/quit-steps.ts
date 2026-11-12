/**
 * Shutdown steps run in order. A missing step still continues: Safe Mode has
 * no phone bridge, and an optional call must not skip closing the Host.
 * A rejected step is logged and does not skip the rest.
 */
export async function runQuitSteps(steps: readonly (() => Promise<unknown> | undefined)[]): Promise<void> {
  for (const step of steps) {
    try {
      await step()
    } catch (error: unknown) {
      console.error(error)
    }
  }
}

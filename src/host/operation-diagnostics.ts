/** Bounded delivery of management facts to the shell which owns durable diagnostics. */
import { parsePluginOperationRecord, type PluginOperationRecord, type PluginOperationRunId } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import { disposeWithContext, subscribePluginOperations, type PluginOperationHost } from './upstream-api'

/**
 * Observe manager operations after Host startup, with bounded concurrent IPC deliveries.
 * @param ctx - Context owning the subscription and its pending deliveries.
 * @param send - IPC transport promise which settles when delivery succeeds or fails.
 * @param maxPending - Maximum number of outstanding deliveries; excess events are counted and omitted.
 * @param runId - Host lifetime identity announced before profile startup.
 */
export function installOperationDiagnostics(
  ctx: PluginOperationHost,
  send: (record: PluginOperationRecord) => Promise<void>,
  maxPending: number,
  runId: PluginOperationRunId
): void {
  if (!Number.isSafeInteger(maxPending) || maxPending < 1) throw new RangeError('Invalid diagnostic delivery budget')
  const pending = new Set<Promise<void>>()
  let dropped = 0
  let closed = false
  subscribePluginOperations(ctx, (operation) => {
    if (closed || pending.size >= maxPending) {
      dropped += 1
      return
    }
    const record = parsePluginOperationRecord({ runId, operation, transportDropped: dropped })
    if (record === undefined) {
      dropped += 1
      return
    }
    const delivery = Promise.resolve().then(async () => {
      try {
        await send(record)
      } catch {
        dropped += 1
      }
    })
    pending.add(delivery)
    void delivery.then(() => { pending.delete(delivery) })
  })
  disposeWithContext(ctx, async () => {
    closed = true
    await Promise.allSettled(pending)
  })
}

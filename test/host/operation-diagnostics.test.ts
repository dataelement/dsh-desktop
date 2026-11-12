import { describe, expect, it } from 'vitest'
import type { PluginOperationRunId } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import { installOperationDiagnostics } from '../../src/host/operation-diagnostics'
import type { PluginOperationHost } from '../../src/host/upstream-api'

const runId = '11111111-1111-4111-8111-111111111111' as PluginOperationRunId

function operation(phase: 'started' | 'unknown'): unknown {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    time: '2026-11-06T00:00:00.000Z',
    reason: 'install',
    target: 'example-plugin',
    stage: 'install',
    phase
  }
}

function host(): { ctx: PluginOperationHost, emit: (operation: unknown) => void, dispose: () => Promise<void> } {
  let listener: ((operation: unknown) => void) | undefined
  let dispose: (() => Promise<void>) | undefined
  const ctx: PluginOperationHost = {
    on(_name, callback) {
      listener = callback
    },
    effect(execute) {
      dispose = execute()
    }
  }
  return {
    ctx,
    emit: value => { listener?.(value) },
    dispose: async () => { await dispose?.() }
  }
}

describe('operation diagnostics', () => {
  it('sends a parsed record and drops an unsupported operation', async () => {
    const surface = host()
    const sent: unknown[] = []
    installOperationDiagnostics(surface.ctx, async record => { sent.push(record) }, 1, runId)
    surface.emit(operation('started'))
    surface.emit({ phase: 'nope' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ runId, transportDropped: 0, operation: { target: 'example-plugin', phase: 'started' } })
    await surface.dispose()
  })

  it('counts events that exceed the pending budget', async () => {
    const surface = host()
    let release: (() => void) | undefined
    const sent: Array<{ transportDropped: number }> = []
    installOperationDiagnostics(surface.ctx, record => new Promise(resolve => {
      sent.push(record)
      release = resolve
    }), 1, runId)
    surface.emit(operation('started'))
    surface.emit(operation('unknown'))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sent).toHaveLength(1)
    release?.()
    await new Promise(resolve => setTimeout(resolve, 0))
    surface.emit(operation('unknown'))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sent[1]?.transportDropped).toBeGreaterThan(0)
  })
})

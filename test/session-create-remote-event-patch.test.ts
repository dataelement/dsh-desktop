import { readFile } from 'node:fs/promises'
import { isJsonValue } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

describe('Harness 1.2 session creation event compatibility', () => {
  it('keeps provider-owned projections off the strict remote event boundary', async () => {
    class ProviderProjection {
      readonly ready = true
    }

    const summary = {
      sessionId: 'session-new',
      updatedAt: 1,
      running: false,
      blank: true,
      projections: { values: { provider: new ProviderProjection() } }
    }
    expect(isJsonValue(summary)).toBe(false)

    const { projections: _projections, ...remoteSummary } = summary
    expect(isJsonValue(remoteSummary)).toBe(true)

    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-api-session-controller'),
      'utf8'
    )
    expect(patch).toContain(
      'const { projections: _projections, ...remoteSummary } = this.listState.summaryFor(session)'
    )
    expect(patch).toContain(
      'ctx.emit("api-session/added", remoteSummary)'
    )
  })
})

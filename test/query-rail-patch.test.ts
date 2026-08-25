import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const conversationPatch = patchPath('@deepseek-ai/dsh-client-ui-conversation')

describe('conversation Query navigation rail', () => {
  it('builds one navigation marker for every durable user query', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    expect(patch).toContain('function QueryRail')
    expect(patch).toContain('node?.kind !== "user" && node?.kind !== "steering"')
    expect(patch).toContain('"data-query-key": query.key')
    expect(patch).toContain('queryAtViewport(local, el, queries)')
    expect(patch).toContain('onNavigate(query.key)')
    expect(patch).toContain('behavior: reducedMotion ? "auto" : "smooth"')
  })

  it('keeps the rail independently scrollable and follows the active query', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    expect(patch).toContain('overflow-y:auto')
    expect(patch).toContain('overscroll-behavior-y:contain')
    expect(patch).toContain('scrollbar-width:none')
    expect(patch).toContain('dshQueryRail_scroller::-webkit-scrollbar{width:0;height:0;display:none}')
    expect(patch).toContain('onWheel: (event) => event.stopPropagation()')
    expect(patch).toContain('scroller.scrollTop = Math.max(0, top - 8)')
    expect(patch).toContain('left: Math.round(viewport.left + 12)')
    expect(patch).toContain('dshQueryRail_itemActive')
    expect(patch).toContain('dshQueryRail_tooltipText')
  })

  it('recovers from a sub-threshold initial measurement via a rAF retry chain', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    // The measurement effect's only meaningful dependency change is
    // `queries.length`, and ResizeObserver only fires on size changes — so a
    // loading/settling → active transition (which flips the composer's
    // `position:sticky` without resizing observed nodes) can leave `layout`
    // stuck at null. The patch must keep retrying the measurement for a short
    // window so the rail can recover without waiting for a user resize.
    expect(patch).toContain('requestAnimationFrame(tick)')
    expect(patch).toMatch(/attempts\s*<\s*12/)
    expect(patch).toContain('cancelAnimationFrame(rafId)')
  })
})

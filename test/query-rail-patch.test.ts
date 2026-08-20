import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const patchPath = path.join(
  projectRoot,
  'patches',
  '@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.8.patch'
)

describe('conversation Query navigation rail', () => {
  it('builds one navigation marker for every durable user query', async () => {
    const patch = await readFile(patchPath, 'utf8')

    expect(patch).toContain('function QueryRail')
    expect(patch).toContain('node?.kind !== "user" && node?.kind !== "steering"')
    expect(patch).toContain('"data-query-key": query.key')
    expect(patch).toContain('queryAtViewport(local, el, queries)')
    expect(patch).toContain('onNavigate(query.key)')
    expect(patch).toContain('behavior: reducedMotion ? "auto" : "smooth"')
  })

  it('keeps the rail independently scrollable and follows the active query', async () => {
    const patch = await readFile(patchPath, 'utf8')

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
})

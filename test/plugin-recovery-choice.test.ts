import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

// Exercise the standalone page's Agent choice handler without a Harness runtime.
const html = readFileSync(new URL('../build/plugin-recovery.html', import.meta.url), 'utf8')
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1]
if (!script) throw new Error('Recovery Agent choice script is missing')
const scriptText = script

function renderChoice(offerRepairAgent: boolean) {
  const listeners = new Map<string, () => void>()
  const button = {
    hidden: true,
    disabled: false,
    textContent: '',
    addEventListener: (event: string, listener: () => void) => listeners.set(event, listener)
  }
  const action = vi.fn()
  runInNewContext(scriptText, {
    model: { locale: 'zh', offerRepairAgent, safeModeLabel: '让 Agent 帮我修' },
    document: { getElementById: () => button, querySelectorAll: () => [button] },
    window: { dshRecovery: { action } }
  })
  return { button, action, click: () => listeners.get('click')?.() }
}

describe('standalone recovery Agent choice', () => {
  it('shows the alternative after a failed repair but dispatches nothing until clicked', () => {
    const page = renderChoice(true)
    expect(page.button.hidden).toBe(false)
    expect(page.button.textContent).toBe('让 Agent 帮我修')
    expect(page.action).not.toHaveBeenCalled()
    page.click()
    expect(page.button.disabled).toBe(true)
    expect(page.action).toHaveBeenCalledWith('agent', { prompt: expect.any(String) })
  })
  it('keeps the extra Agent alternative hidden before a repair attempt', () => {
    const page = renderChoice(false)
    expect(page.button.hidden).toBe(true)
    expect(page.action).not.toHaveBeenCalled()
  })
})

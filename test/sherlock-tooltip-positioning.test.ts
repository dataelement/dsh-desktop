import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { Window } from 'happy-dom'
import { afterEach, describe, expect, it } from 'vitest'

const requireModule = createRequire(import.meta.url)
const { createElement } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown
}
const { act } = requireModule('react') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
}
const { createRoot } = requireModule('react-dom/client') as {
  createRoot: (container: unknown) => { render(node: unknown): void; unmount(): void }
}

async function loadTooltip(): Promise<(props: Record<string, unknown>) => unknown> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js',
    'utf8'
  )
  const start = source.indexOf('function Tooltip(')
  const end = source.indexOf('//#endregion', start)
  if (start === -1 || end === -1) throw new Error('Tooltip source not found')
  const react = requireModule('react') as Record<string, unknown>
  const jsxRuntime = requireModule('react/jsx-runtime') as Record<string, unknown>
  const reactDom = requireModule('react-dom') as Record<string, unknown>
  const names = [
    'Fragment', 'jsx', 'jsxs', 'cloneElement', 'createPortal', 'useCallback', 'useEffect',
    'useLayoutEffect', 'useRef', 'useState'
  ]
  const values = [
    jsxRuntime.Fragment, jsxRuntime.jsx, jsxRuntime.jsxs, react.cloneElement,
    reactDom.createPortal, react.useCallback, react.useEffect, react.useLayoutEffect,
    react.useRef, react.useState
  ]
  const factory = new Function(
    ...names,
    'Tooltip_module_css_default',
    `${source.slice(start, end)}; return Tooltip;`
  )
  return factory(...values, { bubble: 'tooltip-bubble' })
}

const previousGlobals = {
  document: globalThis.document,
  HTMLElement: globalThis.HTMLElement,
  window: globalThis.window
}

afterEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
    .IS_REACT_ACT_ENVIRONMENT = false
  Object.assign(globalThis, previousGlobals)
})

describe('Sherlock tooltip positioning', () => {
  it('portals the tooltip to document.body so transformed sidebars cannot offset it', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true
    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    Object.assign(globalThis, {
      document: browserWindow.document,
      HTMLElement: browserWindow.HTMLElement,
      window: browserWindow
    })
    const Tooltip = await loadTooltip()
    const transformedSidebar = browserWindow.document.createElement('div')
    transformedSidebar.style.transform = 'translateX(24px)'
    browserWindow.document.body.appendChild(transformedSidebar)
    const root = createRoot(transformedSidebar)

    try {
      await act(async () => {
        root.render(createElement(Tooltip, {
          label: '复制',
          side: 'bottom'
        }, createElement('button', { type: 'button' }, 'copy')))
      })
      const button = transformedSidebar.querySelector('button')
      await act(async () => {
        ;(button as HTMLElement | null)?.focus()
      })

      const tooltip = browserWindow.document.querySelector('[role="tooltip"]')
      expect(tooltip).not.toBeNull()
      expect(tooltip?.parentElement).toBe(browserWindow.document.body)
    } finally {
      await act(async () => { root.unmount() })
    }
  })
})

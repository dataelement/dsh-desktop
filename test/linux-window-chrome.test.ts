// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { markLinuxPlatform, mountLinuxWindowChrome } from '../src/preload/linux-window-chrome'

async function readShortcutsClient(): Promise<string> {
  return readFile('node_modules/@deepseek-ai/dsh-client-shortcuts/lib/client.js', 'utf8')
}

function extract(source: string, signature: string): string {
  const pattern = new RegExp(`function ${signature}\\([^)]*\\) \\{[\\s\\S]*?\\n\\t\\t\\}`)
  const fn = source.match(pattern)?.[0]
  expect(fn, signature).toBeDefined()
  return fn as string
}

it('marks the Linux platform and the Web keyboard adapter before the client modules mount', () => {
  const doc = document.implementation.createHTMLDocument()
  markLinuxPlatform(doc)
  expect(doc.documentElement.dataset.platform).toBe('linux')
  expect(doc.documentElement.dataset.dshDesktopWebShortcuts).toBe('true')
})

it('marks the root again on DOMContentLoaded', () => {
  const doc = document.implementation.createHTMLDocument()
  const root = doc.documentElement
  root.remove()
  markLinuxPlatform(doc)
  // The preload runs before the parser creates <html>; DOMContentLoaded is the
  // second chance to stamp the attributes the client modules read.
  doc.append(root)
  doc.dispatchEvent(new Event('DOMContentLoaded'))
  expect(root.dataset.platform).toBe('linux')
  expect(root.dataset.dshDesktopWebShortcuts).toBe('true')
})

it('keeps the Web runtime so Harness never demands the missing native keyboard bridge', async () => {
  const source = await readShortcutsClient()
  const detect = new Function(
    `${extract(source, 'detectEnvironment')}; return detectEnvironment`
  )() as (doc: Document, nav: { platform: string }) => { runtime: string; platform: string }

  const doc = document.implementation.createHTMLDocument()
  // Without the marker Harness falls back to navigator.platform, which is the
  // deprecated string "Linux x86_64" rather than a platform name.
  expect(detect(doc, { platform: 'Linux x86_64' })).toEqual({ runtime: 'web', platform: 'linux' })

  markLinuxPlatform(doc)
  // `runtime: desktop` makes Harness throw "Desktop keyboard bridge unavailable"
  // unless window.dshDesktop.keyboard exists, and this host exposes no bridge.
  expect(detect(doc, { platform: 'Linux x86_64' })).toEqual({ runtime: 'web', platform: 'linux' })
})

it('leaves the browser-on-Linux profile unbound instead of borrowing another profile', async () => {
  const source = await readShortcutsClient()
  const resolve = new Function(
    `${extract(source, 'resolveShortcutDefault')}; return resolveShortcutDefault`
  )() as (definition: unknown, runtime: string, platform: string) => unknown

  // Harness declares browser defaults for macOS and Windows but deliberately
  // none for Linux, because `register()` throws `Unsupported Web shortcut` for
  // any browser-on-Linux binding that is not on its small allow list. Falling
  // back to a sibling web profile fails registration and takes down
  // dsh-client-ui-layout, so the absence of a Linux binding is load-bearing.
  expect(resolve({ defaults: { 'web:windows': { code: 'KeyB', modifiers: ['primary', 'alt'] } } }, 'web', 'linux'))
    .toBeUndefined()
  expect(resolve({ defaults: { 'desktop:linux': { code: 'KeyB', modifiers: ['primary'] } } }, 'desktop', 'linux'))
    .toEqual({ code: 'KeyB', modifiers: ['primary'] })
})

it('scopes the Windows caption-strip geometry away from Linux', async () => {
  const conversation = await readFile('patches/@deepseek-ai+dsh-client-ui-conversation+0.1.7-rc.2.patch', 'utf8')

  // Windows leaves data-platform unset, so the caption strip is the absence of
  // both announcing platforms. Linux draws its own caption inside the header
  // bands, so the Windows strip's padding must not reach it either, and Linux
  // geometry is selected by the announcement instead.
  const windowsStrip = 'html:not([data-platform=darwin]):not([data-platform=linux])'
  expect(conversation.split(windowsStrip).length - 1).toBe(2)
  expect(conversation).toContain('html[data-platform=linux] .wSkVaW_headerUtilities')
})

it('leaves the other desktop hosts untouched', async () => {
  const [sidebar, conversation] = await Promise.all([
    readFile('patches/@deepseek-ai+dsh-client-ui-sidebar+0.1.7-rc.2.patch', 'utf8'),
    readFile('patches/@deepseek-ai+dsh-client-ui-conversation+0.1.7-rc.2.patch', 'utf8')
  ])
  // macOS selects its geometry by announcement; the Windows rules must still
  // match a host that announces nothing.
  expect(conversation).toContain('[data-platform=darwin] .wSkVaW_headerLeading')
  for (const patch of [sidebar, conversation]) expect(patch).not.toContain('[data-platform=windows]')
})

it('marks and mounts only on Linux', async () => {
  const source = await readFile('src/preload/index.ts', 'utf8')
  expect(source).toContain("import { markLinuxPlatform, mountLinuxWindowChrome } from './linux-window-chrome'")
  // The platform is announced as the preload loads; the visible chrome waits for
  // a body, beside the Windows caption layout.
  expect(source).toContain('markLinuxPlatform(document)')
  expect(source).toContain('mountLinuxWindowChrome({ document, ipcRenderer })')
  expect(source.match(/process\.platform === 'linux'/g)).toHaveLength(2)
})

it('drops the right sidebar band below the caption so both sidebar buttons share one spot', () => {
  const doc = document.implementation.createHTMLDocument()
  mountLinuxWindowChrome({
    document: doc,
    ipcRenderer: {
      invoke: async () => ({}),
      on: () => undefined,
      removeListener: () => undefined
    }
  })
  const css = doc.getElementById('dsh-desktop-linux-window-chrome-style')?.textContent ?? ''
  const numberIn = (source: string, property: string): number => {
    const value = source.match(new RegExp(`${property}: (\\d+)px`))?.[1]
    expect(value, property).toBeDefined()
    return Number(value)
  }
  const controls = css.match(/#dsh-desktop-linux-window-controls \{[\s\S]*?\}/)?.[0] ?? ''
  // The caption clearance must not reach the right sidebar's own band: that is
  // what pushed its three actions to the left of the window controls.
  expect(css).toContain('[data-window-drag]:not([data-dsh-sidebar-root] *):not([data-rightbar-col] *)')
  const band = css.slice(css.indexOf('[data-rightbar-col] [data-window-drag]'))
  expect(band.length).toBeGreaterThan(0)
  // It starts below the controls' band and keeps their right inset, so the
  // collapse button lands where upstream draws the collapsed sidebar's toggle.
  expect(numberIn(band, 'padding-top')).toBeGreaterThanOrEqual(
    numberIn(controls, 'top') + numberIn(controls, 'height')
  )
  expect(numberIn(band, 'padding-right')).toBe(numberIn(controls, 'right'))
  // The band keeps a box over the caption it vacated, which has to stay a drag
  // region: a frameless window has nothing else to move it by.
  expect(band).toContain('height: auto !important')
})

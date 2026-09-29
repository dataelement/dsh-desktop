import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

interface HandleHarness {
  handler: (event: {
    clientX: number
    clientY: number
    pointerId: number
    currentTarget: {
      getBoundingClientRect: () => { top: number }
      hasPointerCapture: () => boolean
      style: { setProperty: (name: string, value: string) => void }
    }
  }) => void
  properties: Array<[string, string]>
  dragged: number[]
  frames: number
}

/**
 * The width handle's reveal line is painted where `--dsh-width-handle-pointer-y`
 * points, and upstream's CSS reads that variable on hover as well as while
 * dragging. Upstream's pointermove handler returned early unless a drag was live,
 * so a hover left the line at its fallback position and nothing appeared until a
 * drag refreshed the paint. The port writes the variable on every pointermove.
 *
 * This runs the pointermove handler that ships in the installed package, so it
 * fails again if the patch stops being applied.
 */
function hoverHarness(bundle: string, dragging: boolean): HandleHarness {
  const variable = bundle.lastIndexOf('--dsh-width-handle-pointer-y')
  expect(variable).toBeGreaterThan(-1)
  const callback = bundle.lastIndexOf('const onPointerMove', variable)
  expect(callback).toBeGreaterThan(-1)
  const bodyStart = bundle.indexOf('{', bundle.indexOf('(0, react.useCallback)((event) => {', callback)) + 1
  const bodyEnd = bundle.indexOf('}, []);', bodyStart)
  expect(bodyStart).toBeGreaterThan(0)
  expect(bodyEnd).toBeGreaterThan(bodyStart)

  const properties: Array<[string, string]> = []
  const dragged: number[] = []
  const harness: HandleHarness = {
    handler: () => {},
    properties,
    dragged,
    frames: 0
  }
  const target = {
    getBoundingClientRect: () => ({ top: 100 }),
    hasPointerCapture: () => true,
    style: { setProperty: (name: string, value: string) => { properties.push([name, value]) } }
  }
  harness.handler = runInNewContext(`((event) => {${bundle.slice(bodyStart, bodyEnd)}})`, {
    dragging: { current: dragging },
    latest: { current: 0 },
    frame: { current: null },
    callbacks: { current: { onDrag: (width: number) => { dragged.push(width) } } },
    origin: { current: 0 },
    base: { current: 0 },
    outwardWidth: () => 812,
    requestAnimationFrame: (callback: () => void) => {
      harness.frames += 1
      callback()
      return 1
    }
  })
  harness.handler({ clientX: 410, clientY: 300, pointerId: 1, currentTarget: target })
  return harness
}

describe('conversation width handle reveal', () => {
  const entry = (): string =>
    require.resolve('@deepseek-ai/dsh-client-ui-conversation/package.json')
      .replace(/package\.json$/u, 'lib/client.js')

  it('tracks the pointer while hovering, so the line appears where the cursor is', async () => {
    const bundle = await readFile(entry(), 'utf8')
    const hover = hoverHarness(bundle, false)
    expect(hover.properties).toEqual([['--dsh-width-handle-pointer-y', '200px']])
    // A hover must not start a resize.
    expect(hover.dragged).toEqual([])
    expect(hover.frames).toBe(0)
  })

  it('still tracks the pointer and reports the width while dragging', async () => {
    const bundle = await readFile(entry(), 'utf8')
    const drag = hoverHarness(bundle, true)
    expect(drag.properties).toEqual([['--dsh-width-handle-pointer-y', '200px']])
    expect(drag.frames).toBe(1)
    expect(drag.dragged).toEqual([812])
  })
})

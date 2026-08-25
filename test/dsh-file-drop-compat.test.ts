import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it } from 'vitest'
import {
  Window,
  type Element as HappyDOMElement,
  type Event as HappyDOMEvent
} from 'happy-dom'
import {
  DSH_FILE_DROP_RESEARCH_CANVAS_MARKER,
  ensureDshFileDropResearchCanvasCompatibility
} from '../src/main/state/dsh-file-drop-compat'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'

const temporaryDirectories: string[] = []

const CAPTURE_CLIENT = `
window.__ModuleLoader__.load({
  id: 'dsh-file-drop',
  factory: (require) => {
    const React = require('react')
    const exports = {}

    function DropZone(props) {
      const [drag, setDrag] = React.useState(false)
      const depthRef = React.useRef(0)
      React.useEffect(() => {
        const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
        const onDragEnter = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          depthRef.current += 1
          setDrag(true)
        }
        const onDragOver = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        }
        const onDragLeave = (e) => {
          e.stopPropagation()
          depthRef.current -= 1
        }
        const onDrop = (e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          e.stopPropagation()
          depthRef.current = 0
          setDrag(false)
          void handleDrop(e)
        }
        window.addEventListener('dragenter', onDragEnter, true)
        window.addEventListener('dragover', onDragOver, true)
        window.addEventListener('dragleave', onDragLeave, true)
        window.addEventListener('drop', onDrop, true)
        return () => {
          window.removeEventListener('dragenter', onDragEnter, true)
          window.removeEventListener('dragover', onDragOver, true)
          window.removeEventListener('dragleave', onDragLeave, true)
          window.removeEventListener('drop', onDrop, true)
        }
      }, [])

      function handleDrop(e) {
        props.onDrop(e)
      }

      return drag
    }

    exports.DropZone = DropZone
    return exports
  }
})
`

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

async function makeDshHome(clientSource = CAPTURE_CLIENT): Promise<{
  dshHome: string
  clientPath: string
}> {
  const root = await mkdtemp(join(tmpdir(), 'sherlock-dsh-file-drop-'))
  temporaryDirectories.push(root)
  const dshHome = join(root, 'harness')
  const pluginDirectory = join(
    dshHome,
    'profiles',
    'web',
    'node_modules',
    'dsh-file-drop'
  )
  const clientPath = join(pluginDirectory, 'client.js')
  await mkdir(pluginDirectory, { recursive: true })
  await writeFile(
    join(pluginDirectory, 'package.json'),
    `${JSON.stringify({ name: 'dsh-file-drop', version: '1.0.0' }, null, 2)}\n`,
    'utf8'
  )
  await writeFile(clientPath, clientSource, 'utf8')
  return { dshHome, clientPath }
}

function installCaptureClient(
  browserWindow: Window,
  source: string,
  onDrop: () => void,
  onDragState: (active: boolean) => void
): () => void {
  let descriptor: {
    factory(require: (id: string) => unknown): { DropZone: (props: unknown) => unknown }
  } | undefined
  const cleanups: Array<() => void> = []
  Object.assign(browserWindow, {
    __ModuleLoader__: {
      load(value: typeof descriptor) {
        descriptor = value
      }
    }
  })
  runInNewContext(source, { window: browserWindow })
  if (!descriptor) throw new Error('capture fixture did not register')
  const client = descriptor.factory((id) => {
    if (id !== 'react') throw new Error(`unexpected fixture module: ${id}`)
    return {
      useState: () => [false, onDragState],
      useRef: (value: unknown) => ({ current: value }),
      useEffect: (effect: () => void | (() => void)) => {
        const cleanup = effect()
        if (cleanup) cleanups.push(cleanup)
      }
    }
  })
  client.DropZone({ onDrop })
  return () => cleanups.splice(0).forEach((cleanup) => cleanup())
}

function dispatchFileDrag(
  browserWindow: Window,
  target: HappyDOMElement,
  type: string
): HappyDOMEvent {
  const event = new browserWindow.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: ['Files'],
      files: [{ name: 'report.pdf', type: 'application/pdf' }],
      dropEffect: 'none'
    }
  })
  target.dispatchEvent(event)
  return event
}

describe('dsh-file-drop Research canvas compatibility', () => {
  it('lets all file-drag events reach Research while preserving the ordinary window capture drop', async () => {
    const { dshHome, clientPath } = await makeDshHome()

    expect(await ensureDshFileDropResearchCanvasCompatibility(dshHome)).toEqual({
      status: 'patched',
      clientPath
    })
    const patched = await readFile(clientPath, 'utf8')
    expect(patched).toContain(DSH_FILE_DROP_RESEARCH_CANVAS_MARKER)
    expect(await ensureDshFileDropResearchCanvasCompatibility(dshHome)).toEqual({
      status: 'already-compatible',
      clientPath
    })

    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    let composerDrops = 0
    const dragStates: boolean[] = []
    const cleanup = installCaptureClient(
      browserWindow,
      patched,
      () => { composerDrops += 1 },
      (active) => { dragStates.push(active) }
    )
    const canvas = browserWindow.document.createElement('div')
    canvas.setAttribute('data-research-canvas', '')
    const canvasChild = browserWindow.document.createElement('span')
    canvas.appendChild(canvasChild)
    browserWindow.document.body.appendChild(canvas)
    const reachedResearch: string[] = []
    for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
      canvas.addEventListener(type, (event) => {
        reachedResearch.push(type)
        event.preventDefault()
        event.stopPropagation()
      })
    }

    try {
      const outsideEnterTarget = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(outsideEnterTarget)
      dispatchFileDrag(browserWindow, outsideEnterTarget, 'dragenter')
      expect(dragStates.at(-1)).toBe(true)

      for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
        dispatchFileDrag(browserWindow, canvasChild, type)
      }
      expect(reachedResearch).toEqual(['dragenter', 'dragover', 'dragleave', 'drop'])
      expect(composerDrops).toBe(0)
      expect(dragStates.at(-1)).toBe(false)

      const outside = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(outside)
      let outsideTargetDrops = 0
      outside.addEventListener('drop', () => { outsideTargetDrops += 1 })
      const outsideDrop = dispatchFileDrag(browserWindow, outside, 'drop')

      expect(outsideDrop.defaultPrevented).toBe(true)
      expect(outsideTargetDrops).toBe(0)
      expect(composerDrops).toBe(1)
    } finally {
      cleanup()
    }
  })

  it('applies the named compatibility before Harness launches the installed profile', async () => {
    const { dshHome, clientPath } = await makeDshHome()
    const root = join(dshHome, '..')
    const dshEntryPath = join(root, 'dsh-entry.js')
    const nodeExecutablePath = join(root, 'node')
    const nodeEntryPath = join(root, 'node-entry.mjs')
    const dshPatchPath = join(root, 'desktop.patch.yml')
    await Promise.all([
      writeFile(dshEntryPath, '', 'utf8'),
      writeFile(nodeExecutablePath, '', 'utf8'),
      writeFile(nodeEntryPath, '', 'utf8'),
      writeFile(dshPatchPath, '[]\n', 'utf8')
    ])
    let sawCompatibilityAtLaunch = false
    const runtime = new HarnessRuntime({
      dshEntryPath,
      nodeExecutablePath,
      nodeEntryPath,
      dshPatchPath,
      bundledSkillDirectory: root,
      bundledWebSearchEntry: 'file:///tmp/session-model.js',
      dshHome,
      logPath: join(root, 'harness.log'),
      launchProcess: () => {
        sawCompatibilityAtLaunch = readFileSync(clientPath, 'utf8').includes(
          DSH_FILE_DROP_RESEARCH_CANVAS_MARKER
        )
        throw new Error('stop after compatibility assertion')
      },
      onChanged: () => undefined
    })

    await runtime.start(root)

    expect(sawCompatibilityAtLaunch).toBe(true)
    expect(runtime.snapshot().phase).toBe('failed')
  })

  it('does not guess when the named plugin client has an unknown capture shape', async () => {
    const { dshHome, clientPath } = await makeDshHome('window.addEventListener("drop", unknown)\n')

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result).toEqual({
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop 1.0.0 client capture handlers did not match.'
    })
    expect(await readFile(clientPath, 'utf8')).toBe(
      'window.addEventListener("drop", unknown)\n'
    )
  })
})

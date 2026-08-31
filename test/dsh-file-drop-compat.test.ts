import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises'
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
  DSH_FILE_DROP_INLINE_REFERENCE_MARKER,
  DSH_FILE_DROP_QUIET_SUCCESS_MARKER,
  DSH_FILE_DROP_RESEARCH_CANVAS_MARKER,
  ensureDshFileDropResearchCanvasCompatibility
} from '../src/main/state/dsh-file-drop-compat'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'

const temporaryDirectories: string[] = []
const PRISTINE_CLIENT_FIXTURE = new URL(
  './fixtures/dsh-file-drop-1.0.0-client.js',
  import.meta.url
)

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

async function pristineClientSource(): Promise<string> {
  return readFile(PRISTINE_CLIENT_FIXTURE, 'utf8')
}

async function writePlugin(pluginDirectory: string, clientSource: string): Promise<void> {
  await mkdir(pluginDirectory, { recursive: true })
  await writeFile(
    join(pluginDirectory, 'package.json'),
    `${JSON.stringify({ name: 'dsh-file-drop', version: '1.0.0' }, null, 2)}\n`,
    'utf8'
  )
  await writeFile(join(pluginDirectory, 'client.js'), clientSource, 'utf8')
}

async function makeDshHome(clientSource?: string): Promise<{
  dshHome: string
  pluginDirectory: string
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
  await writePlugin(pluginDirectory, clientSource ?? await pristineClientSource())
  return { dshHome, pluginDirectory, clientPath }
}

function installCaptureClient(
  browserWindow: Window,
  source: string,
  onFilePaths: (paths: string[]) => void,
  onDragState: (active: boolean) => void
): () => void {
  let descriptor: {
    factory(require: (id: string) => unknown): Record<string, unknown>
  } | undefined
  const cleanups: Array<() => void> = []
  Object.assign(browserWindow, {
    dshDesktop: {
      getPathForFile: () => '/tmp/report.pdf'
    },
    __ModuleLoader__: {
      load(value: typeof descriptor) {
        descriptor = value
      }
    }
  })
  runInNewContext(source, {
    window: browserWindow,
    document: browserWindow.document,
    setTimeout: () => 1,
    clearTimeout: () => undefined
  })
  if (!descriptor) throw new Error('capture fixture did not register')
  const client = descriptor.factory((id) => {
    if (id !== 'react') throw new Error(`unexpected fixture module: ${id}`)
    return {
      Fragment: Symbol('Fragment'),
      createElement: (type: unknown, props?: unknown) =>
        typeof type === 'function'
          ? (type as (value: unknown) => unknown)(props ?? {})
          : null,
      useState: (value: unknown) => [
        value,
        typeof value === 'boolean' ? onDragState : () => undefined
      ],
      useRef: (value: unknown) => ({ current: value }),
      useEffect: (effect: () => void | (() => void)) => {
        const cleanup = effect()
        if (cleanup) cleanups.push(cleanup)
      }
    }
  })
  const bundle = client as unknown as {
    apply(ctx: {
      effect(effect: () => void | (() => void)): void
      slots: {
        inject(name: string, register: () => void): void
        register(
          options: { id: string },
          render: (props: unknown) => unknown
        ): void
      }
    }): void
  }
  bundle.apply({
    effect(effect) {
      const cleanup = effect()
      if (cleanup) cleanups.push(cleanup)
    },
    slots: {
      inject(_name, register) {
        register()
      },
      register(options, render) {
        if (options.id !== 'file-drop') return
        render({
          sessionId: 'session-1',
          input: { draft: '' },
          inputActions: {
            setDraft: () => undefined,
            insertFilePaths: onFilePaths
          }
        })
      }
    }
  })
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
    expect(patched).toContain(DSH_FILE_DROP_INLINE_REFERENCE_MARKER)
    expect(patched).toContain(DSH_FILE_DROP_QUIET_SUCCESS_MARKER)
    expect(patched).not.toContain('✓ 已获取')
    expect(patched).not.toContain('个文件已上传')
    expect(patched).toContain("errs.length > 0 ? '✗ '")
    expect(await ensureDshFileDropResearchCanvasCompatibility(dshHome)).toEqual({
      status: 'already-compatible',
      clientPath
    })

    const browserWindow = new Window({ url: 'https://sherlock.local/' })
    const composerFilePaths: string[][] = []
    const dragStates: boolean[] = []
    const cleanup = installCaptureClient(
      browserWindow,
      patched,
      (paths) => { composerFilePaths.push(paths) },
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
      expect(composerFilePaths).toEqual([])
      expect(dragStates.at(-1)).toBe(false)

      const outside = browserWindow.document.createElement('div')
      browserWindow.document.body.appendChild(outside)
      let outsideTargetDrops = 0
      outside.addEventListener('drop', () => { outsideTargetDrops += 1 })
      const outsideDrop = dispatchFileDrag(browserWindow, outside, 'drop')

      expect(outsideDrop.defaultPrevented).toBe(true)
      expect(outsideTargetDrops).toBe(0)
      expect(composerFilePaths).toEqual([['/tmp/report.pdf']])
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
      bundledMarketInstallerEntry: 'file:///tmp/market-installer.js',
      localSearchUrl: 'http://127.0.0.1:43123',
      localSearchToken: 'test-search-token',
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

  it('upgrades the previous Research-only compatibility patch in place', async () => {
    const { dshHome, clientPath } = await makeDshHome()
    expect((await ensureDshFileDropResearchCanvasCompatibility(dshHome)).status)
      .toBe('patched')
    const current = await readFile(clientPath, 'utf8')
    const legacy = current.replace(
      `      if (!inputActions || !Array.isArray(paths) || paths.length === 0) return
      // ${DSH_FILE_DROP_INLINE_REFERENCE_MARKER}
      if (typeof inputActions.insertFilePaths === 'function') {
        inputActions.insertFilePaths(paths)
        return
      }`,
      '      if (!inputActions) return'
    ).replace(
      `        // ${DSH_FILE_DROP_QUIET_SUCCESS_MARKER}
        statusStore.set(null)`,
      "        statusStore.set('✓ 已获取 ' + direct.length + ' 个原始路径（桌面壳）')"
    ).replace(
      `      const text = errs.length > 0 ? '✗ ' + errs.join('；') : ''
      statusStore.set(text || null)`,
      `      const text = [
        ok.length > 0 ? '✓ ' + ok.length + ' 个文件已上传' : '',
        errs.length > 0 ? '✗ ' + errs.join('；') : '',
      ].filter(Boolean).join('　')
      statusStore.set(text || '没有文件被处理')`
    ).replace(
      '          statusStore.set(null)',
      "          statusStore.set('✓ 已获取 ' + shellPaths.length + ' 个原始路径（桌面壳）')"
    ).replace(
      '          statusStore.set(null)',
      "          statusStore.set('✓ 已获取 ' + paths.length + ' 个文件路径')"
    )
    expect(legacy).not.toBe(current)
    await writeFile(clientPath, legacy, 'utf8')

    expect(await ensureDshFileDropResearchCanvasCompatibility(dshHome)).toEqual({
      status: 'patched',
      clientPath
    })
    expect(await readFile(clientPath, 'utf8')).toBe(current)
  })

  it('does not guess when the named plugin client has an unknown capture shape', async () => {
    const { dshHome, clientPath } = await makeDshHome('window.addEventListener("drop", unknown)\n')

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result).toEqual({
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop 1.0.0 client source identity did not match.'
    })
    expect(await readFile(clientPath, 'utf8')).toBe(
      'window.addEventListener("drop", unknown)\n'
    )
  })

  it('rejects a marked client when part of the known helper was deleted', async () => {
    const { dshHome, clientPath } = await makeDshHome()
    expect((await ensureDshFileDropResearchCanvasCompatibility(dshHome)).status)
      .toBe('patched')
    const patched = await readFile(clientPath, 'utf8')
    const corrupt = patched.replace(
      '          depthRef.current = 0\n          setDrag(false)\n          return true',
      '          setDrag(false)\n          return true'
    )
    expect(corrupt).not.toBe(patched)
    await writeFile(clientPath, corrupt, 'utf8')

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result.status).toBe('unsupported')
    expect(await readFile(clientPath, 'utf8')).toBe(corrupt)
  })

  it('rejects a partially corrupted compatibility marker', async () => {
    const { dshHome, clientPath } = await makeDshHome()
    expect((await ensureDshFileDropResearchCanvasCompatibility(dshHome)).status)
      .toBe('patched')
    const patched = await readFile(clientPath, 'utf8')
    const corrupt = patched.replace(
      DSH_FILE_DROP_RESEARCH_CANVAS_MARKER,
      'Sherlock dsh-file-drop compatibility: Research owns its canvas'
    )
    expect(corrupt).not.toBe(patched)
    await writeFile(clientPath, corrupt, 'utf8')

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result.status).toBe('unsupported')
    expect(await readFile(clientPath, 'utf8')).toBe(corrupt)
  })

  it('rejects semantic drift even when every capture anchor still matches', async () => {
    const pristine = await pristineClientSource()
    const drifted = pristine.replace(
      'const MAX_BYTES = 25 * 1024 * 1024',
      'const MAX_BYTES = 25 * 1024 * 1024 + 1'
    )
    expect(drifted).not.toBe(pristine)
    const { dshHome, clientPath } = await makeDshHome(drifted)

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result.status).toBe('unsupported')
    expect(await readFile(clientPath, 'utf8')).toBe(drifted)
  })

  it('refuses a symlinked named plugin directory without mutating its target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'sherlock-dsh-file-drop-link-'))
    temporaryDirectories.push(root)
    const dshHome = join(root, 'harness')
    const realPluginDirectory = join(root, 'outside-plugin')
    const pristine = await pristineClientSource()
    await writePlugin(realPluginDirectory, pristine)
    const nodeModules = join(dshHome, 'profiles', 'web', 'node_modules')
    const pluginDirectory = join(nodeModules, 'dsh-file-drop')
    const clientPath = join(pluginDirectory, 'client.js')
    await mkdir(nodeModules, { recursive: true })
    await symlink(
      realPluginDirectory,
      pluginDirectory,
      process.platform === 'win32' ? 'junction' : 'dir'
    )

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result.status).toBe('unsupported')
    expect((await lstat(pluginDirectory)).isSymbolicLink()).toBe(true)
    expect(await readFile(join(realPluginDirectory, 'client.js'), 'utf8')).toBe(pristine)
  })

  it('refuses a symlinked client file without replacing the link or target', async () => {
    const pristine = await pristineClientSource()
    const { dshHome, clientPath } = await makeDshHome()
    const outsideClient = join(dshHome, '..', 'outside-client.js')
    await writeFile(outsideClient, pristine, 'utf8')
    await rm(clientPath)
    await symlink(outsideClient, clientPath, 'file')

    const result = await ensureDshFileDropResearchCanvasCompatibility(dshHome)

    expect(result.status).toBe('unsupported')
    expect((await lstat(clientPath)).isSymbolicLink()).toBe(true)
    expect(await readFile(outsideClient, 'utf8')).toBe(pristine)
  })
})

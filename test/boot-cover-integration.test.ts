// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { expect, it, vi } from 'vitest'
import { shouldReleaseBootCover } from '../src/preload/boot-cover'

function fixture() {
  const source = readFileSync('src/preload/index.ts', 'utf8')
  const start = source.indexOf('function syncBootCover():')
  const end = source.indexOf('\nfunction runDomSync()', start)
  const js = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText
  const context = {
    bootScanSettled: false, sidebarRoot: undefined,
    // Normal Profile has no Safe Mode banner to populate the sidebar cache.
    liveElement: (_cached: unknown, selector: string) => document.querySelector(selector),
    bootFailureTriggered: false, bootFailureTimer: undefined,
    checkBootFailureInDom: vi.fn(), shouldReleaseBootCover,
    rendererHealthReportInFlight: false,
    ipcRenderer: { invoke: vi.fn(async () => ({ ok: true })) },
    bootCover: { releaseWhenReady: vi.fn(), holdForFailure: vi.fn() },
    startRendererHealthHeartbeat: vi.fn(), console: { warn: vi.fn() }
  }
  const sync: () => void = runInNewContext(js + ';syncBootCover', context)
  document.body.innerHTML = '<div data-dsh-sidebar-root></div>'
  return { sync, context }
}

it('reveals the normal Profile without relying on a Safe Mode banner or mobile button', async () => {
  const { sync, context } = fixture()
  sync()
  await vi.waitFor(() => expect(context.bootCover.releaseWhenReady).toHaveBeenCalledOnce())
  expect(context.ipcRenderer.invoke).toHaveBeenCalledWith('harness:reveal-boot-cover')
  expect(context.bootScanSettled).toBe(true)
  sync()
  expect(context.ipcRenderer.invoke).toHaveBeenCalledOnce()
})

it('keeps the cover when main cannot reveal, and retries on the next synchronization', async () => {
  const { sync, context } = fixture()
  context.ipcRenderer.invoke.mockRejectedValueOnce(new Error('remove failed'))
  sync()
  await vi.waitFor(() => expect(context.rendererHealthReportInFlight).toBe(false))
  expect(context.bootScanSettled).toBe(false)
  expect(context.bootCover.releaseWhenReady).not.toHaveBeenCalled()
  sync()
  await vi.waitFor(() => expect(context.bootCover.releaseWhenReady).toHaveBeenCalledOnce())
})

it('does not release the cover if a boot failure arrives while the reveal IPC is pending', async () => {
  const { sync, context } = fixture()
  let finish: (value: { ok: boolean }) => void = () => {}
  context.ipcRenderer.invoke.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  sync()
  context.bootFailureTriggered = true
  finish({ ok: true })
  await vi.waitFor(() => expect(context.rendererHealthReportInFlight).toBe(false))
  expect(context.bootCover.releaseWhenReady).not.toHaveBeenCalled()
  expect(context.bootScanSettled).toBe(false)
  sync()
  expect(context.bootCover.holdForFailure).toHaveBeenCalledOnce()
})

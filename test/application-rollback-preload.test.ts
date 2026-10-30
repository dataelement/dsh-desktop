import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { expect, it, vi } from 'vitest'

it('exposes only named rollback actions and blocks arbitrary values before IPC', async () => {
  const source = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
  const block = source.match(/contextBridge\.exposeInMainWorld\(\s*'dshRollback',[\s\S]*?\n\)/)?.[0]
  if (!block) throw new Error('Rollback bridge missing')
  const expose = vi.fn()
  const invoke = vi.fn().mockResolvedValue({ ok: true })
  runInNewContext(ts.transpileModule(block, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    contextBridge: { exposeInMainWorld: expose }, ipcRenderer: { invoke }
  })
  const bridge = expose.mock.calls[0]?.[1] as { action: (value: unknown) => Promise<{ ok: boolean }> }
  expect(expose.mock.calls[0]?.[0]).toBe('dshRollback')
  for (const invalid of ['install', '', null, {}, 42]) expect(await bridge.action(invalid)).toEqual({ ok: false })
  expect(invoke).not.toHaveBeenCalled()
  for (const valid of ['confirm', 'cancel', 'continue']) {
    expect(await bridge.action(valid)).toEqual({ ok: true })
    expect(invoke).toHaveBeenLastCalledWith('application-rollback:action', valid)
  }
})

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { resolveRuntime, runIsolated } from '../packages/dsh-office/lib/runtime.js'

vi.mock('../packages/dsh-office/lib/runtime.js', async importOriginal => ({
  ...await importOriginal(), resolveRuntime: vi.fn(), runIsolated: vi.fn()
}))

const roots = []
afterEach(async () => {
  vi.resetAllMocks()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

it.each([
  { status: 'ready', missingPython: false, blocked: false },
  { status: 'partial', missingPython: true, blocked: false },
  { status: 'blocked', missingPython: false, blocked: true }
])('returns valid ToolRuntime output for $status readiness', async ({ status, missingPython, blocked }) => {
  const root = await mkdtemp(path.join(tmpdir(), 'office-runtime-contract-'))
  roots.push(root)
  resolveRuntime.mockResolvedValue({
    node: process.execPath, docx: '/test/docx/index.cjs', sandbox: 'seatbelt-development',
    libreOffice: '/test/soffice',
    ...(missingPython ? { pythonError: 'Install openpyxl==3.1.5' } : { openpyxl: '3.1.5' })
  })
  if (blocked) runIsolated.mockRejectedValue(new Error('Isolation probe denied'))
  else runIsolated.mockResolvedValue({ stdout: 'ready' })
  const ctx = new Context()
  new SystemPrompt(ctx, {})
  new ToolRuntime(ctx)
  registerOfficeTools({ tools: ctx.tools, get: () => ({ resolve: () => ({ mode: 'workspace-write' }) }) }, { root: path.join(root, 'audit') })
  const result = await ctx.tools.execute({
    name: 'office_runtime', arguments: {}, callId: `readiness-${status}`, signal: new AbortController().signal,
    agent: { id: 'agent', session: { id: 'session', header: { cwd: root } } }
  })
  expect(result.isError, JSON.stringify(result)).toBe(false)
  expect(result.value.status).toBe(status)
  expect(result.value.isolationDetail).toBe(blocked ? 'Isolation probe denied' : null)
  expect(result.value.excel).toBe(missingPython ? 'Install openpyxl==3.1.5' : 'openpyxl@3.1.5')
})

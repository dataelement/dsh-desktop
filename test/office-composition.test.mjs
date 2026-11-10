import { describe, expect, it, vi } from 'vitest'

vi.mock('../packages/dsh-desktop-office/lib/templates.js', () => ({ createTemplateLibrary: vi.fn(async () => ({})) }))
vi.mock('../packages/dsh-desktop-office/lib/business-skills.js', () => ({ registerBusinessSkills: vi.fn() }))
vi.mock('../packages/dsh-desktop-office/lib/modes.js', () => ({ registerOfficeContext: vi.fn(), registerOfficeRoutes: vi.fn() }))
vi.mock('../packages/dsh-desktop-office/lib/template-tool.js', () => ({ templateTool: vi.fn(() => ({ name: 'template' })) }))
vi.mock('../packages/dsh-desktop-office/lib/docx-workflow.js', () => ({ createDocxWorkflow: vi.fn(() => ({})), docxWriteTool: vi.fn(() => ({ name: 'write' })), registerDocxDelivery: vi.fn() }))
import { composeOffice } from '../packages/dsh-desktop-office/index.js'
import { registerOfficeContext, registerOfficeRoutes } from '../packages/dsh-desktop-office/lib/modes.js'

function fixture() {
  const modes = { state: vi.fn() }
  const runtime = { officeSkills: { name: 'adapted-skills' }, workspaceDependencies: { name: 'adapted-runtime', resolvePrimaryRuntime: vi.fn() } }
  const routes = {}
  const scoped = { officeModes: { native: true }, tools: { register: vi.fn() }, inject: vi.fn((deps, callback) => callback(routes)) }
  const ctx = { plugin: vi.fn(), logger: { warn: vi.fn() }, inject: vi.fn((deps, callback) => callback(scoped)) }
  return { modes, runtime, routes, scoped, ctx }
}

describe('Office composition seam', () => {
  it('shares workflows with caller-owned modes and runtime registration, without requiring officeModes', async () => {
    const { modes, runtime, ctx, scoped, routes } = fixture()
    await composeOffice(ctx, { resources: '/payload', cli: '/payload/cli.mjs' }, modes, runtime)
    expect(runtime.workspaceDependencies.resolvePrimaryRuntime).toHaveBeenCalledWith('/payload/primary-runtime')
    expect(ctx.plugin).toHaveBeenNthCalledWith(1, runtime.workspaceDependencies, { source: '/payload/primary-runtime' })
    expect(ctx.plugin).toHaveBeenNthCalledWith(2, runtime.officeSkills, expect.objectContaining({ cli: '/payload/cli.mjs' }))
    expect(ctx.inject.mock.calls[0][0]).not.toContain('officeModes')
    expect(registerOfficeContext).toHaveBeenLastCalledWith(scoped, {}, modes)
    expect(registerOfficeRoutes).toHaveBeenLastCalledWith(routes, {}, modes)
    expect(scoped.tools.register).toHaveBeenCalledTimes(2)
  })
  it('retains native injected modes when no override is supplied', async () => {
    const { runtime, ctx, scoped } = fixture()
    await composeOffice(ctx, { resources: '/payload', cli: '/payload/cli.mjs' }, undefined, runtime)
    expect(ctx.inject.mock.calls[0][0]).toContain('officeModes')
    expect(registerOfficeContext).toHaveBeenLastCalledWith(scoped, {}, scoped.officeModes)
  })
  it('does not register runtime or workflows for relative paths or failed payload validation', async () => {
    const { runtime, ctx } = fixture()
    await composeOffice(ctx, { resources: 'relative', cli: '/cli' }, {}, runtime)
    expect(ctx.plugin).not.toHaveBeenCalled()
    runtime.workspaceDependencies.resolvePrimaryRuntime.mockRejectedValueOnce(new Error('bad payload'))
    await composeOffice(ctx, { resources: '/payload', cli: '/cli' }, {}, runtime)
    expect(ctx.plugin).not.toHaveBeenCalled()
    expect(ctx.inject).not.toHaveBeenCalled()
    expect(ctx.logger.warn).toHaveBeenLastCalledWith(expect.stringContaining('bad payload'))
  })
})

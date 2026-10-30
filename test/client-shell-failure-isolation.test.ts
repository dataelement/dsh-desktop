import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import type { ClientModuleSystem } from '@deepseek-ai/dsh-client-modules/client'
import { describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

interface ShellContext {
  get(name: string): unknown
  reflect: { provide(name: string, value: unknown): void }
  fiber: { dispose(): Promise<void> }
  loader: {
    create(options: { name: string }): Promise<string>
    entries(): Iterable<{ options: { name: string }; fiber?: { state: number } }>
  }
}

interface ShellRuntime {
  Context: new () => ShellContext
  boot(options: { ctx: ShellContext; modules: ClientModuleSystem; manifest: ClientModuleSystem['manifest'] }): Promise<void>
  mount(ctx: ShellContext, container: object): Promise<void>
  audit(ctx: ShellContext, modules: ClientModuleSystem): void
}

interface Registration {
  id: string
  factory: () => unknown
}

interface ClientApi {
  createClientModuleSystem(
    target: { mode: string; pendingQueue: Registration[]; load?: (registration: Registration) => void },
    bootstrap: { id: string; exports: unknown },
    options: { boot: unknown; staticModules: Record<string, unknown> }
  ): ClientModuleSystem
}

async function loadShellRuntime(): Promise<ShellRuntime> {
  const assets = join(projectRoot, 'node_modules/@deepseek-ai/dsh-web-frontend/dist/assets')
  const candidates = (await readdir(assets)).filter((name) => /^index-.*[.]js$/.test(name))
  expect(candidates).toHaveLength(1)
  const [candidate] = candidates
  if (!candidate) throw new Error('locked web shell asset missing')
  const source = await readFile(join(assets, candidate), 'utf8')
  const file = ts.createSourceFile('web.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const definitions = new Map<string, { name: string; node: ts.Node; text: string }>()
  const units: Array<{ name: string; node: ts.Node; text: string }> = []
  for (const statement of file.statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      const unit = { name: statement.name.text, node: statement, text: statement.getText(file) }
      definitions.set(unit.name, unit)
      units.push(unit)
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue
        const unit = { name: declaration.name.text, node: declaration, text: `var ${declaration.getText(file)};` }
        definitions.set(unit.name, unit)
        units.push(unit)
      }
    }
    if (ts.isExpressionStatement(statement)) {
      units.push({ name: `effect:${statement.pos}`, node: statement, text: statement.getText(file) })
    }
  }
  const references = (node: ts.Node): Set<string> => {
    const result = new Set<string>()
    const visit = (child: ts.Node): void => {
      if (ts.isIdentifier(child) && definitions.has(child.text)
        && !(ts.isPropertyAccessExpression(child.parent) && child.parent.name === child)) result.add(child.text)
      ts.forEachChild(child, visit)
    }
    visit(node)
    return result
  }
  const selected = new Set<string>()
  const select = (name: string): void => {
    if (selected.has(name)) return
    const definition = definitions.get(name)
    if (!definition) throw new Error(`locked web shell definition missing: ${name}`)
    selected.add(name)
    for (const dependency of references(definition.node)) select(dependency)
  }
  // Names belong to the locked 0.2.1-rc.3 artifact. Execute its actual boot, audit,
  // mount and vendored Cordis dependency closure without starting the DOM shell.
  for (const name of ['st', 'jZ', 'IZ', 'EZ']) select(name)
  let changed = true
  while (changed) {
    changed = false
    for (const unit of units) {
      if (!unit.name.startsWith('effect:') || selected.has(unit.name)) continue
      const dependencies = references(unit.node)
      if (![...dependencies].some((name) => selected.has(name))) continue
      selected.add(unit.name)
      for (const name of dependencies) select(name)
      changed = true
    }
  }
  const executable = units.filter((unit) => selected.has(unit.name)).map((unit) => unit.text).join(String.fromCharCode(10))
  return vm.runInNewContext(`${executable};({ Context: st, boot: jZ, audit: IZ, mount: EZ })`, {
    console: { ...console, error: vi.fn() }, setTimeout, clearTimeout
  }) as ShellRuntime
}

async function fixture(failure: 'import' | 'apply' | 'pending', optional = true, requiredConsumer = false) {
  const shell = await loadShellRuntime()
  const source = await readFile(join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-modules/lib/client.js'), 'utf8')
  let api: ClientApi | undefined
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load({ factory }: { factory: () => ClientApi }) { api = factory() } } },
    console: { ...console, error: vi.fn() }
  })
  if (!api) throw new Error('client module bootstrap did not register')
  const mount = vi.fn(() => () => {})
  const registrations: Registration[] = [
    { id: 'dsh-desktop-workbenches', factory: () => ({ apply() {} }) },
    {
      id: 'broken-plugin',
      factory: () => {
        if (failure === 'import') throw new Error('incompatible third-party API')
        return {
          inject: failure === 'pending' ? ['missingWorkbenchAPI'] : [],
          apply() { if (failure === 'apply') throw new Error('workbench activation failed') }
        }
      }
    },
    { id: 'healthy-market', factory: () => ({ apply(ctx: ShellContext) { ctx.reflect.provide('marketActive', true) } }) },
    { id: 'renderer', factory: () => ({ apply(ctx: ShellContext) { ctx.reflect.provide('uiRenderer', { mount }) } }) }
  ]
  if (requiredConsumer) registrations.push({
    id: 'required-consumer',
    factory: () => ({ inject: ['missingWorkbenchAPI'], apply() {} })
  })
  const entries = registrations.map(({ id }) => ({
    id, url: `/??${id}/client.js&rev=1`, rev: '1',
    inject: id === 'broken-plugin' && optional ? ['dsh-desktop-workbenches'] : []
  }))
  const target = { mode: 'queue', pendingQueue: registrations, load: undefined as ((row: Registration) => void) | undefined }
  const modules = api.createClientModuleSystem(target, { id: '@deepseek-ai/dsh-client-modules', exports: api }, {
    boot: { rev: '1', entries, batches: [{ phase: 'application', url: '/??all/client.js&rev=1', rev: '1', entries: entries.map(({ id }) => id) }] },
    staticModules: {}
  })
  const ctx = new shell.Context()
  const bootAndMount = async (): Promise<void> => {
    await shell.boot({ ctx, modules, manifest: modules.manifest })
    await shell.mount(ctx, {})
  }
  return { shell, modules, ctx, mount, bootAndMount, target }
}

describe('real web shell workbench failure isolation', () => {
  it.each(['import', 'apply', 'pending'] as const)('mounts healthy UI after an optional workbench %s failure', async (failure) => {
    const test = await fixture(failure)
    try {
      await test.bootAndMount()
      expect(test.ctx.get('marketActive')).toBe(true)
      expect(test.mount).toHaveBeenCalledOnce()
      expect(test.modules.entries.state.getSnapshot().failures).toEqual([
        expect.objectContaining({ id: 'broken-plugin', message: expect.any(String) })
      ])
      expect([...test.ctx.loader.entries()].find((entry) => entry.options.name === 'broken-plugin')).toBeDefined()
    } finally {
      await test.ctx.fiber.dispose()
    }
  })

  it.each(['import', 'apply', 'pending'] as const)('keeps a required %s failure fatal', async (failure) => {
    const test = await fixture(failure, false)
    try {
      await expect(test.bootAndMount()).rejects.toThrow()
      expect(test.mount).not.toHaveBeenCalled()
    } finally {
      await test.ctx.fiber.dispose()
    }
  })

  it('keeps a required consumer waiting for an optional plugin service fatal', async () => {
    const test = await fixture('import', true, true)
    try {
      await expect(test.bootAndMount()).rejects.toThrow('required-consumer')
      expect(test.mount).not.toHaveBeenCalled()
    } finally {
      await test.ctx.fiber.dispose()
    }
  })

  it('does not exempt entries outside the manifest or swallow factory conflicts', async () => {
    const test = await fixture('import')
    try {
      await test.bootAndMount()
      const factory = (value: number) => () => ({ value })
      const first = factory(1)
      const second = factory(2)
      expect(first.toString()).toBe(second.toString())
      if (!test.target.load) throw new Error('live registration facade missing')
      test.target.load({ id: 'conflicting-plugin', factory: first })
      expect(() => test.target.load?.({ id: 'conflicting-plugin', factory: second })).toThrow('duplicate factory registration')
      await test.ctx.loader.create({ name: 'unknown-required-plugin' })
      expect(() => test.shell.audit(test.ctx, test.modules)).toThrow('unknown-required-plugin')
    } finally {
      await test.ctx.fiber.dispose()
    }
  })
})

import { cp, mkdtemp, rm, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

it('keeps the Office plugin import and built-ins usable when the personal-library module is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'office-recovery-'))
  const previous = process.env.DSH_HOME
  try {
    const skippedModule = resolve('packages/dsh-desktop-office/lib/personal-templates.js')
    await cp(resolve('packages/dsh-desktop-office'), root, { recursive: true, filter: source => resolve(source) !== skippedModule })
    await symlink(resolve('node_modules'), join(root, 'node_modules'))
    process.env.DSH_HOME = join(root, 'profile')
    const plugin = await import(pathToFileURL(join(root, 'index.js')).href)
    const warnings = []
    let registered = false
    await plugin.apply({ plugin: async () => {}, skills: { registerProvider() {} }, logger: { warn: text => warnings.push(text) }, inject() { registered = true } }, {
      resources: resolve('.build/office-runtime'), cli: resolve('build/office-cli.mjs')
    })
    expect(registered).toBe(true)
    expect(warnings.some(text => text.includes('personal template library unavailable; keeping built-in templates'))).toBe(true)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

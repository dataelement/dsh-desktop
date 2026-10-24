import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { rollup } from 'rollup'

const require = createRequire(import.meta.url)
const { verifyDependencyClosure } = require('../scripts/verify-packaged-harness.cjs') as { verifyDependencyClosure(root: string): number }
const { packagedImportsPlugin } = require('../scripts/packaged-imports.cjs') as { packagedImportsPlugin(dependencies: Record<string, string>): import('rollup').Plugin }
let root: string
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'dsh-packaged-closure-')) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })
async function manifest(directory: string, value: Record<string, unknown>): Promise<void> {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify(value))
}

it('checks nested dependencies and host peers without requiring other-platform optional packages', async () => {
  await manifest(root, { name: 'desktop', dependencies: { plugin: '1' } })
  await manifest(join(root, 'node_modules', 'plugin'), { name: 'plugin', dependencies: { private: '1' },
    peerDependencies: { '@deepseek-ai/required': '1', '@deepseek-ai/optional': '1' },
    peerDependenciesMeta: { '@deepseek-ai/optional': { optional: true } }, optionalDependencies: { 'other-platform': '1' } })
  await manifest(join(root, 'node_modules', 'plugin', 'node_modules', 'private'), { name: 'private' })
  await expect(Promise.resolve().then(() => verifyDependencyClosure(root))).rejects.toThrow('@deepseek-ai/required')
  await manifest(join(root, 'node_modules', '@deepseek-ai', 'required'), { name: '@deepseek-ai/required' })
  expect(verifyDependencyClosure(root)).toBe(4)
})

it('fails when native package metadata is missing rather than accepting a remaining binary', async () => {
  await manifest(root, { name: 'desktop', dependencies: { 'node-pty': '1' } })
  await mkdir(join(root, 'node_modules', 'node-pty'), { recursive: true })
  await writeFile(join(root, 'node_modules', 'node-pty', 'index.js'), 'module.exports = {}')
  expect(() => verifyDependencyClosure(root)).toThrow('node-pty')
})

it.each(['./index.js', { import: './index.js' }])('accepts hidden manifests including import-only packages: %j', async exports => {
  await manifest(root, { name: 'desktop', dependencies: { private: '1' } })
  const dependency = join(root, 'node_modules', 'private')
  await manifest(dependency, { name: 'private', exports })
  await writeFile(join(dependency, 'index.js'), 'module.exports = {}')
  expect(verifyDependencyClosure(root)).toBe(2)
})

it.each([false, true])('fails the bundle for an unpackaged external import (dynamic=%s)', async dynamic => {
  await expect(rollup({ input: 'entry', external: ['missing-runtime-package'], plugins: [{
    name: 'fixture', resolveId: id => id === 'entry' ? id : null,
    load: id => id === 'entry' ? dynamic ? 'export const load = () => import("missing-runtime-package")' : 'export { value } from "missing-runtime-package"' : null
  }, packagedImportsPlugin({})] })).rejects.toThrow('not shipped as a runtime dependency')
})

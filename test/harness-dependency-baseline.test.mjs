import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { satisfies } = require('semver')
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const localPackages = Object.entries(manifest.dependencies)
  .filter(([, spec]) => spec.startsWith('file:packages/'))
  .map(([name, spec]) => {
    const file = path.join(root, spec.slice(5), 'package.json')
    return { name, file, manifest: JSON.parse(readFileSync(file, 'utf8')) }
  })

describe('Harness host dependency baseline', () => {
  it('admits the installed prerelease through each maintained host peer range', () => {
    for (const plugin of localPackages) {
      for (const [name, range] of Object.entries(plugin.manifest.peerDependencies ?? {})) {
        if (!name.startsWith('@deepseek-ai/')) continue
        const installed = lock.packages[`node_modules/${name}`]
        if (!installed && plugin.manifest.peerDependenciesMeta?.[name]?.optional) continue
        expect(installed, `${plugin.name}: missing host peer ${name}`).toBeDefined()
        // npm excludes prereleases by default; runtime includePrerelease alone
        // does not make a published plugin's peer contract compatible.
        expect(satisfies(installed.version, range), `${plugin.name}: ${name}@${installed.version} outside ${range}`).toBe(true)
      }
    }
  })

  it('resolves shared Cordis and schema implementations from each plugin physical directory', () => {
    for (const plugin of localPackages) {
      const fromPlugin = createRequire(plugin.file)
      for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/schemastery']) {
        if (!plugin.manifest.dependencies?.[name] && !plugin.manifest.peerDependencies?.[name]) continue
        expect(realpathSync(fromPlugin.resolve(name)), `${plugin.name}: duplicate ${name}`).toBe(realpathSync(require.resolve(name)))
      }
    }
  })
})

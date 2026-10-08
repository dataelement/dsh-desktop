import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HARNESS_INTERNAL_MODULES,
  electronExecutable,
  harnessLoaderAnchor,
  probeElectronNodeLoader
} from '../scripts/electron-node-loader.mjs'

/** A project whose only package is a stand-in for the Harness native loader. */
async function fixtureProject(loaderSource: string): Promise<{ root: string; anchor: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-electron-node-loader-'))
  const loader = path.join(root, 'node_modules', 'node-addon-require-builtin')
  await mkdir(loader, { recursive: true })
  await writeFile(path.join(loader, 'package.json'), JSON.stringify({ name: 'node-addon-require-builtin', main: 'index.js' }))
  await writeFile(path.join(loader, 'index.js'), loaderSource)
  const anchor = path.join(root, 'package.json')
  await writeFile(anchor, JSON.stringify({ name: 'fixture' }))
  return { root, anchor }
}

describe('Electron Node mode Harness loader probe', () => {
  it('loads every internal module Harness profile resolution needs under the pinned Electron', () => {
    const result = probeElectronNodeLoader({
      executable: electronExecutable(process.cwd()),
      anchor: harnessLoaderAnchor(process.cwd())
    })

    expect(result).toMatchObject({ ok: true })
    if (result.ok) expect(result.runtime.electron).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('requests each internal module from the loader Harness resolves', async () => {
    const { root, anchor } = await fixtureProject(`
      const { appendFileSync } = require('node:fs')
      const { join } = require('node:path')
      exports.requireBuiltin = (id) => { appendFileSync(join(__dirname, 'requested.txt'), id + '\\n'); return {} }
    `)
    try {
      const result = probeElectronNodeLoader({ executable: process.execPath, anchor })
      expect(result).toMatchObject({ ok: true, runtime: { electron: null, node: process.versions.node } })
      const requested = await readFile(path.join(root, 'node_modules', 'node-addon-require-builtin', 'requested.txt'), 'utf8')
      expect(requested.trim().split('\n')).toEqual([...HARNESS_INTERNAL_MODULES])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reports the loader rejection instead of passing the build', async () => {
    const { root, anchor } = await fixtureProject(`
      exports.requireBuiltin = () => {
        throw new Error('node-addon-require-builtin unsupported: Unsupported/no-context (unsupported Electron runtime fingerprint: Node 24.18.1)')
      }
    `)
    try {
      const result = probeElectronNodeLoader({ executable: process.execPath, anchor })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.detail).toContain('unsupported Electron runtime fingerprint')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reports an executable that cannot start', async () => {
    const { root, anchor } = await fixtureProject('exports.requireBuiltin = () => ({})')
    try {
      const result = probeElectronNodeLoader({ executable: path.join(root, 'missing-electron'), anchor })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.detail).toContain('could not start')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

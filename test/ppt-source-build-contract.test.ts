import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

const generatedPatterns = [
  'packages/ppt-bundles',
  'packages/ppt-runtime/templates',
  'packages/ppt-runtime/artifacts.json'
]

describe('PPT source build contract', () => {
  it('does not track self-built packages, templates, previews, or hash manifests', () => {
    const tracked = execFileSync('git', ['ls-files', ...generatedPatterns], {
      cwd: projectRoot,
      encoding: 'utf8'
    }).trim()
    expect(tracked).toBe('')
  })

  it('bootstraps from local source packages without generated tgz dependencies', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
    const lock = await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')
    expect(manifest.dependencies['dsh-ppt']).toBe('file:packages/ppt-runtime/core')
    expect(manifest.dependencies['dsh-ppt-composer']).toBe('file:packages/ppt-runtime/adapter')
    expect(lock).not.toContain('ppt-bundles')
  })

  it('runs one preparation pipeline before dev, build, test, and package consumers', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
    expect(manifest.scripts['ppt:build']).toBe('node scripts/prepare-ppt-runtime.mjs')
    expect(manifest.scripts.dev).toMatch(/^npm run ppt:build && /u)
    expect(manifest.scripts.build).toMatch(/^npm run ppt:build && /u)
    expect(manifest.scripts.pretest).toBe('npm run ppt:build')
    expect(manifest.scripts['pretest:watch']).toBe('npm run ppt:build')
    for (const name of Object.keys(manifest.scripts).filter(name => name.startsWith('package:'))) {
      expect(manifest.scripts[name]).toContain('npm run build')
    }
  })

  it('packages the current staged directories instead of node_modules links', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
    const files = manifest.build.files
    expect(manifest.build.afterPack).toBe('scripts/verify-packaged-ppt-runtime.cjs')
    // Builder evaluates unpack globs against source paths, before files.to.
    expect(manifest.build.asarUnpack).toContain('.build/ppt-runtime/packages/**/*')
    expect(files).toContain('!node_modules/dsh-ppt{,/**}')
    expect(files).toContain('!node_modules/dsh-ppt-composer{,/**}')
    expect(files).toContainEqual(expect.objectContaining({
      from: '.build/ppt-runtime/packages/dsh-ppt',
      to: 'node_modules/dsh-ppt'
    }))
    expect(files).toContainEqual(expect.objectContaining({
      from: '.build/ppt-runtime/packages/dsh-ppt-composer',
      to: 'node_modules/dsh-ppt-composer'
    }))
  })
})

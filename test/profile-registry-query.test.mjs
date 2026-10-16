import { spawnSync } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const pnpmEntry = resolve('node_modules/pnpm/bin/pnpm.cjs')
const managerSource = resolve('node_modules/@deepseek-ai/dsh-plugin-manager/lib/index.js')
const roots = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

/**
 * A profile whose `npm` is a marker, so a real npm spawn cannot hide.
 * Windows resolves `npm` to `npm.cmd`; a shebang file named `npm` is skipped
 * and the machine's real npm answers instead.
 */
async function profileWithNpmMarker(npmrc) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-registry-query-'))
  roots.push(dir)
  const bin = join(dir, 'node_modules', '.bin')
  await mkdir(bin, { recursive: true })
  const marker = join(dir, 'npm-was-spawned')
  if (process.platform === 'win32') {
    await writeFile(join(bin, 'npm.cmd'), `@echo off\r
>"%NPM_SPAWN_MARKER%" echo spawned\r
echo https://example.invalid/from-npm\r
`)
  } else {
    await writeFile(join(bin, 'npm'), `#!/bin/sh
printf spawned > "$NPM_SPAWN_MARKER"
printf 'https://example.invalid/from-npm\\n'
`)
    await chmod(join(bin, 'npm'), 0o755)
  }
  if (npmrc !== undefined) await writeFile(join(dir, '.npmrc'), npmrc)
  return { dir, marker }
}

function queryRegistry(dir, marker, extraArgs = []) {
  return spawnSync(process.execPath, [pnpmEntry, 'config', 'get', 'registry', ...extraArgs], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NPM_SPAWN_MARKER: marker }
  })
}

describe('pnpm config get registry', () => {
  it('reads the merged registry in-process when location is project', async () => {
    const { dir, marker } = await profileWithNpmMarker('registry=https://registry.example.test/\n')
    const result = queryRegistry(dir, marker, ['--location=project'])
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('https://registry.example.test/')
    await expect(readFile(marker, 'utf8')).rejects.toThrow()
  })

  it('spawns npm for the default global query', async () => {
    // The click path used to run this form. The marker is the console process
    // on Windows: npm.cmd wrapped by cmd.exe.
    const { dir, marker } = await profileWithNpmMarker()
    const result = queryRegistry(dir, marker)
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe('https://example.invalid/from-npm')
    expect((await readFile(marker, 'utf8')).trim()).toBe('spawned')
  })
})

describe('readProfileRegistry invocation', () => {
  it('adds project location only on Windows', async () => {
    const source = await readFile(managerSource, 'utf8')
    expect(source).toContain('...process.platform === "win32" ? ["--location=project"] : []')
  })
})

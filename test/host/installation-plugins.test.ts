import { mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import { readInstallationPlugins } from '../../src/host/installation-plugins'

it('uses only explicit application declarations, excludes them in Safe Mode and validates metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'desktop-host-declarations-'))
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ dshDesktopHostPlugins: ['fixture-host', 'fixture-host'] }))
    expect(readInstallationPlugins(root, false)?.names).toEqual(['fixture-host'])
    expect(readInstallationPlugins(root, true)).toBeUndefined()
    await writeFile(join(root, 'package.json'), JSON.stringify({ dshDesktopHostPlugins: ['../escape'] }))
    expect(() => readInstallationPlugins(root, false)).toThrow('bare package names')
  } finally { await rm(root, { recursive: true, force: true }) }
})

it('resolves declared host plugins through real Harness interception and preserves missing dependency errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'desktop-host-resolution-'))
  try {
    const app = join(root, 'app')
    const home = join(root, 'home')
    const plugin = join(home, 'profiles/.generations/local/plugin')
    await mkdir(plugin, { recursive: true })
    await mkdir(join(app, 'node_modules/fixture-host'), { recursive: true })
    await mkdir(join(app, 'node_modules/undeclared-host'), { recursive: true })
    await writeFile(join(app, 'package.json'), JSON.stringify({ name: 'product', dshDesktopHostPlugins: ['fixture-host'] }))
    for (const name of ['fixture-host', 'undeclared-host']) {
      const dir = join(app, 'node_modules', name)
      await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', type: 'module', exports: { '.': './index.js', './client': './client.js', './preset': './preset.js' } }))
      for (const entry of ['index', 'client', 'preset']) await writeFile(join(dir, entry + '.js'), 'export const marker = "' + name + '"')
    }
    await writeFile(join(plugin, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(join(plugin, 'missing-peer.js'), 'import "@fixture/missing-peer"')
    await writeFile(join(plugin, 'missing-private.js'), 'import "missing-private"')
    const moduleUrl = (name: string): string => pathToFileURL(resolve(name)).href
    const script = join(root, 'check.mjs')
    await writeFile(script,
      'import { Context } from ' + JSON.stringify(moduleUrl('node_modules/@deepseek-ai/cordis/lib/index.js')) + ';\n' +
      'import { createRuntimeResolution, PluginPackages } from ' + JSON.stringify(moduleUrl('node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')) + ';\n' +
      'import { createRequire } from "node:module"; import assert from "node:assert/strict";\n' +
      'const options = ' + JSON.stringify({ home, installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json'), installationPlugins: readInstallationPlugins(app, false) }) + ';\n' +
      'const resolution = await createRuntimeResolution(options);\n' +
      'assert.equal(resolution.entries.find(e => e.name === "fixture-host").scope, "installation");\n' +
      'assert.equal(resolution.entries.some(e => e.name === "undeclared-host"), false);\n' +
      'assert.equal((await resolution.computeLatestResolution()).entries.some(e => e.name === "fixture-host"), true);\n' +
      'const safe = await createRuntimeResolution({...options, installationPlugins: undefined}); assert.equal(safe.entries.some(e => e.name === "fixture-host"), false);\n' +
      'const ctx = new Context(); await ctx.plugin(PluginPackages, { resolution });\n' +
      'try { const req = createRequire(' + JSON.stringify(join(plugin, 'package.json')) + ');\n' +
      'for (const entry of ["fixture-host", "fixture-host/client", "fixture-host/preset"]) assert.ok(req.resolve(entry).includes("fixture-host"));\n' +
      'assert.throws(() => req.resolve("undeclared-host"), {code: "MODULE_NOT_FOUND"});\n' +
      'for (const [entry, dependency] of [["missing-peer", "@fixture/missing-peer"], ["missing-private", "missing-private"]]) { await assert.rejects(import(' + JSON.stringify(pathToFileURL(plugin + '/').href) + ' + entry + ".js"), error => error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes(dependency)); }\n' +
      '} finally { await ctx.fiber.dispose(); }\n')
    const child = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 20000 })
    expect(child.error).toBeUndefined()
    expect(child.status, child.stderr + child.stdout).toBe(0)
    await expect(access(join(home, 'profiles/node_modules'))).rejects.toThrow()
  } finally { await rm(root, { recursive: true, force: true }) }
})
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

it('validates peers with real Harness interception despite stale shared links', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-peer-runtime-'))
  try {
    const directory = join(home, 'profiles/.generations/live/plugin')
    const plugin = join(directory, 'node_modules/fixture')
    await mkdir(plugin, { recursive: true })
    await mkdir(join(home, 'profiles/web'), { recursive: true })
    await mkdir(join(home, 'profiles/node_modules/@deepseek-ai'), { recursive: true })
    const old = join(home, 'old/dsh')
    await mkdir(join(old, 'lib'), { recursive: true })
    await writeFile(join(old, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', bin: { dsh: 'lib/bin.js' } }))
    await writeFile(join(old, 'lib/bin.js'), 'throw new Error("stale CLI must not run")')
    await symlink(old, join(home, 'profiles/node_modules/@deepseek-ai/dsh'), 'junction')
    await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: 'fixture',
      peerDependencies: { '@deepseek-ai/dsh': '*', react: '*', 'react-dom': '*' } }))
    await writeFile(join(home, 'profiles/web/package.json'), '{}')
    const moduleUrl = name => pathToFileURL(resolve(name)).href
    const entry = join(home, 'check.mjs')
    await writeFile(entry, `
      import { Context } from ${JSON.stringify(moduleUrl('node_modules/@deepseek-ai/cordis/lib/index.js'))};
      import { createRuntimeResolution, PluginPackages, loadProfileDirectory } from ${JSON.stringify(moduleUrl('node_modules/@deepseek-ai/dsh-app-boot/lib/index.js'))};
      import { verifyGenerationPeers } from ${JSON.stringify(moduleUrl('packages/dsh-desktop-market-installer/generations/installer.mjs'))};
      import { createRequire } from 'node:module';
      const home = ${JSON.stringify(home)};
      const anchor = ${JSON.stringify(resolve('node_modules/@deepseek-ai/dsh/package.json'))};
      const profile = loadProfileDirectory('test', home + '/profiles/web', anchor);
      const resolution = await createRuntimeResolution({ home, installAnchor: anchor, profile });
      const ctx = new Context();
      await ctx.plugin(PluginPackages, { resolution });
      try {
        const req = createRequire(${JSON.stringify(join(plugin, 'package.json'))});
        // Test real runtime resolution, including the ReactDOM client subpath.
        if (req.resolve('react-dom/client') !== createRequire(anchor).resolve('react-dom/client')) throw new Error('wrong ReactDOM');
        const result = await verifyGenerationPeers(home, ${JSON.stringify({ directory, id: 'plugin', pluginName: 'fixture', version: '1' })}, { dshEntryPath: ${JSON.stringify(resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'))} });
        console.log(JSON.stringify(result));
        if (!result.ok) process.exitCode = 1;
      } finally { await ctx.fiber.dispose(); }
    `)
    const child = spawnSync(process.execPath, [entry], { encoding: 'utf8', timeout: 15000 })
    expect(child.error).toBeUndefined()
    expect(child.status, child.stderr + child.stdout).toBe(0)
    expect(JSON.parse(child.stdout.trim())).toEqual({ ok: true, problems: [] })
  } finally { await rm(home, { recursive: true, force: true }) }
})

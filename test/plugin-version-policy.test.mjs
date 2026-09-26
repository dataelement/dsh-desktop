import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

it('installs old declared peers through the manager and reports a warning instead of rollback', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-version-install-'))
  roots.push(dir)
  await writeFile(join(dir, 'package.json'), '{}')
  // Replace only the package-manager executable; exercise the real pre/post
  // install checks, manifest transaction and output events without registry I/O.
  const fakePnpm = join(dir, 'pnpm.mjs')
  const manifest = { name: 'fixture-old-peers', version: '1.0.0',
    peerDependencies: { '@deepseek-ai/dsh': '0.1.7-rc.1' },
    dsh: { bundle: { patch: 'cordis.patch.yml' } } }
  await writeFile(fakePnpm, `
    import {mkdirSync, writeFileSync} from 'node:fs';
    const manifest = ${JSON.stringify(manifest)};
    if (process.argv.includes('view')) { console.log(JSON.stringify(manifest)); }
    else {
      mkdirSync('node_modules/fixture-old-peers', {recursive:true});
      writeFileSync('node_modules/fixture-old-peers/package.json', JSON.stringify(manifest));
      writeFileSync('node_modules/fixture-old-peers/cordis.patch.yml', '[]');
      writeFileSync('package.json', JSON.stringify({dependencies:{'fixture-old-peers':'1.0.0'}}));
    }
  `)
  const events = []
  const manager = {
    profile: { dir, name: 'web', installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json'),
      packageManager: { command: process.execPath, args: [fakePnpm] } },
    abort: new AbortController(), outputBytes: 100000, idleTimeoutMs: 10000,
    inspectTimeoutMs: 10000, packageOperations: new Set(),
    ownerContext: { emit: (_event, payload) => events.push(payload) }
  }
  const result = await PluginManager.prototype.runPnpm.call(manager, ['add', 'fixture-old-peers@1.0.0'])
  expect(result.exitCode).toBe(0)
  expect(result.incompatible ?? []).toEqual([])
  expect(events.some(event => event.text.includes('Compatibility is unverified'))).toBe(true)
  expect(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).dependencies['fixture-old-peers']).toBe('1.0.0')
  expect(JSON.parse(await readFile(join(dir, 'node_modules/fixture-old-peers/package.json'), 'utf8'))).toEqual(manifest)
})

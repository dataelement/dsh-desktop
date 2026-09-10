import { it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'

it('real pnpm refuses unapproved scripts and executes an explicitly approved rebuild in staging', async () => {
  // Windows TEMP may contain an 8.3 alias (RUNNER~1). pnpm resolves its
  // workspace root to a real path; keep every install path in that form.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-build-approval-')))
  const run = promisify(execFile)
  let server
  // Stable publication time: a moving timestamp can appear in the future
  // relative to pnpm's resolution start even when the age limit is zero.
  const publishedAt = new Date(Date.now() - 60_000).toISOString()
  try {
    for (const name of ['dependency', 'plugin']) await mkdir(join(root, name, 'package'), { recursive: true })
    await writeFile(join(root, 'dependency/package/package.json'), JSON.stringify({
      name: 'dsh-test-build-dependency', version: '1.0.0', main: 'built.js',
      // Use the same executable that runs pnpm, not a PATH-selected node.cmd.
      scripts: { install: `"${process.execPath}" build.cjs` }
    }))
    await writeFile(join(root, 'dependency/package/build.cjs'), "require('node:fs').writeFileSync(require('node:path').join(__dirname, 'built.js'), 'module.exports = 42')")
    const dependencyTar = join(root, 'dependency.tgz')
    await run('tar', ['-czf', dependencyTar, '-C', join(root, 'dependency'), 'package'])
    await writeFile(join(root, 'plugin/package/package.json'), JSON.stringify({
      name: 'dsh-test-build-plugin', version: '1.0.0', dependencies: { 'dsh-test-build-dependency': '1.0.0' }
    }))
    const pluginTar = join(root, 'plugin.tgz')
    await run('tar', ['-czf', pluginTar, '-C', join(root, 'plugin'), 'package'])
    server = createServer(async (req, res) => {
      const dependency = req.url.includes('dependency')
      const name = dependency ? 'dsh-test-build-dependency' : 'dsh-test-build-plugin'
      if (req.url.endsWith('.tgz')) { res.end(await readFile(dependency ? dependencyTar : pluginTar)); return }
      const pkg = JSON.parse(await readFile(join(root, dependency ? 'dependency/package/package.json' : 'plugin/package/package.json'), 'utf8'))
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ name, time: { '1.0.0': publishedAt }, 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': {
        ...pkg, dist: { integrity: 'sha512-' + createHash('sha512').update(await readFile(dependency ? dependencyTar : pluginTar)).digest('base64'), tarball: `http://127.0.0.1:${server.address().port}/${name}.tgz` }
      } } }))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const home = join(root, 'home')
    const options = {
      dshHome: home, pluginSpec: 'dsh-test-build-plugin@1.0.0', registry: `http://127.0.0.1:${server.address().port}`, expectedPluginName: 'dsh-test-build-plugin',
      expectedVersion: '1.0.0', strictDepBuilds: true, minimumReleaseAge: 0,
      nodeExecutablePath: process.execPath, pnpmEntryPath: join(process.cwd(), 'node_modules/pnpm/bin/pnpm.cjs')
    }
    const tooFresh = await installGeneration({ ...options, minimumReleaseAge: 1440 })
    expect(tooFresh.ok).toBe(false)
    expect(tooFresh.detail).toMatch(/minimumReleaseAge|NO_MATCHING_VERSION/)
    const blocked = await installGeneration(options)
    expect(blocked.ok).toBe(false)
    expect(blocked.detail).toContain('ERR_PNPM_IGNORED_BUILDS')
    const profile = join(home, 'profiles/web')
    await mkdir(profile, { recursive: true })
    await writeFile(join(profile, 'pnpm-workspace.yaml'), 'allowBuilds:\n  dsh-test-build-dependency: true\n')
    let buildOutput = ''
    const approved = await installGeneration({ ...options, onOutput: chunk => { buildOutput += chunk } })
    expect(approved.ok, approved.detail).toBe(true)
    const builtFile = join(approved.generation.directory, 'node_modules/dsh-test-build-dependency/built.js')
    const built = await readFile(builtFile, 'utf8').catch(error => String(error))
    expect(built, `Approved build must produce ${builtFile}\n${buildOutput}`).toBe('module.exports = 42')
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }) }
}, 30_000)

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { it, expect } from 'vitest'
const run = promisify(execFile)
it('Git prepare builds an uncommitted runtime entry before installation', async () => {
 const root = await mkdtemp(join(tmpdir(), 'dsh-prepare-regression-'))
 try {
  const source = join(root, 'source'), target = join(root, 'target')
  await mkdir(source); await mkdir(target)
  await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'dsh-prepare-regression', version: '1.0.0', main: 'generated.js', scripts: { prepare: 'node build.cjs' } }))
  await writeFile(join(source, 'build.cjs'), "require('fs').writeFileSync('generated.js', 'module.exports = 42')")
  const git = (...args) => run('git', args, { cwd: source, windowsHide: true })
  await git('init'); await git('add', '.'); await git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture')
  await writeFile(join(target, 'package.json'), JSON.stringify({ private: true, pnpm: { dangerouslyAllowAllBuilds: true } }))
  await run(process.execPath, [resolve('node_modules/pnpm/bin/pnpm.cjs'), 'add', `git+${pathToFileURL(source).href}`, '--config.dangerouslyAllowAllBuilds=true', '--config.update-notifier=false'], { cwd: target, windowsHide: true, timeout: 45000, env: { ...process.env, CI: '1' } })
  expect(await readFile(join(target, 'node_modules/dsh-prepare-regression/generated.js'), 'utf8')).toBe('module.exports = 42')
 } finally { await rm(root, { recursive: true, force: true }) }
}, 60000)

import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { confinedRuntime } = require('../scripts/office-runtime/probe.cjs')
const exec = promisify(execFile)
const temporary = []
const root = resolve(import.meta.dirname, '..')
async function scratch() {
  const path = await realpath(await mkdtemp(join(tmpdir(), 'dsh-office-probe-test-')))
  temporary.push(path)
  return path
}
afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('resolves only the confined runtime alias, preserving installation resource paths', async () => {
  const resources = await scratch()
  const physical = await scratch()
  await symlink(physical, join(resources, 'office-runtime'), process.platform === 'win32' ? 'junction' : 'dir')
  await writeFile(join(physical, 'marker'), 'current installation')
  expect(await confinedRuntime(resources)).toBe(physical)
  // Resolving the worker must not replace/remove the resource alias used by skills and templates.
  expect(await realpath(join(resources, 'office-runtime', 'marker'))).toBe(join(physical, 'marker'))
  const direct = await scratch()
  await mkdir(join(direct, 'office-runtime'))
  expect(await confinedRuntime(direct)).toBe(join(direct, 'office-runtime'))
  await expect(confinedRuntime(await scratch())).rejects.toMatchObject({ code: 'ENOENT' })
})

it.runIf(process.platform === 'linux')('executes physical bundled Python under bwrap without exposing host temporary files or widening writes', async () => {
  const resources = await scratch()
  const workspace = await scratch()
  const runtime = join(root, '.build/office-runtime')
  await symlink(runtime, join(resources, 'office-runtime'), 'dir')
  const alias = join(resources, 'office-runtime/primary-runtime/dependencies/python/bin/python3')
  const python = join(await confinedRuntime(resources), 'primary-runtime/dependencies/python/bin/python3')
  const profile = ['--ro-bind', '/', '/', '--dev', '/dev', '--unshare-pid', '--proc', '/proc', '--die-with-parent', '--tmpfs', '/tmp', '--bind', workspace, workspace, '--']
  // Same profile as sandbox-local; a failed runner is a failure, not a native fallback.
  await expect(exec('bwrap', [...profile, alias, '-I', '-B', '-c', 'print(123)'])).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('No such file or directory') })
  const marker = join(resources, 'host-only')
  await writeFile(marker, 'must stay hidden')
  const script = `import os, docx, lxml.etree
assert not os.path.exists(${JSON.stringify(marker)})
try:
 open(${JSON.stringify(join(root, '.build/office-probe-forbidden-write'))}, 'w')
except OSError:
 pass
else:
 raise AssertionError('write escaped workspace')
open('worker-result', 'w').write('ok')
print('confined bundled Python passed')`
  const { stdout } = await exec('bwrap', [...profile, python, '-I', '-B', '-c', script], { cwd: workspace })
  expect(stdout.trim()).toBe('confined bundled Python passed')
})

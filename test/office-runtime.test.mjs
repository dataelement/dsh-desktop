import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { officeTarget, downloadAsset, unpackWheel, prepareOfficeRuntime } from '../scripts/office-runtime/prepare.mjs'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { prepareHostPluginSourcesPatch } from '../src/main/state/host-plugin-sources'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../src/main/state/safe-mode-profile'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { electronExecutable } from '../scripts/electron-node-loader.mjs'

const root = resolve(import.meta.dirname, '..')
const exec = promisify(execFile)
const scratch = []
const temporary = async () => {
  const path = await mkdtemp(join(tmpdir(), 'dsh-office-test-'))
  scratch.push(path)
  return path
}
afterEach(async () => {
  await Promise.all(scratch.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('Office runtime assembly', () => {
  it('selects all supported native targets and rejects cross-platform substitutions', () => {
    expect(officeTarget('win32', 'x64')).toBe('win-x64')
    expect(officeTarget('darwin', 'arm64')).toBe('mac-arm64')
    expect(officeTarget('darwin', 'x64')).toBe('mac-x64')
    expect(() => officeTarget('win32', 'arm64')).toThrow('unsupported native target')
  })

  it('rejects corrupt cached input and removes stale payload when preparation fails', async () => {
    const cache = await temporary()
    const digest = createHash('sha256').update('good').digest('hex')
    await writeFile(join(cache, digest), 'bad')
    await expect(downloadAsset('https://invalid.example/archive', digest, cache)).rejects.toThrow('checksum mismatch')
    const target = officeTarget()
    const lock = JSON.parse(await readFile(join(root, 'scripts/office-runtime/lock.json'), 'utf8'))
    await writeFile(join(cache, lock.targets[target].pythonSha256), 'corrupt Python')
    const output = await temporary()
    await writeFile(join(output, 'runtime.json'), 'stale build')
    await expect(prepareOfficeRuntime({ target, cache, output })).rejects.toThrow('checksum mismatch')
    await expect(readFile(join(output, 'runtime.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects wheel paths that escape site-packages or use unsupported installation schemes', async () => {
    const output = await temporary()
    for (const entry of ['../escaped', 'C:/escaped', 'lib\\bad.py', 'package.data/purelib/extra.py']) {
      const wheel = join(output, 'bad.whl')
      await writeFile(wheel, zipSync({ [entry]: strToU8('bad') }))
      await expect(unpackWheel(wheel, join(output, 'site-packages'))).rejects.toThrow(/unsafe wheel|unsupported wheel/)
    }
  })

  it('creates valid Office packages with the prepared Python and checks them with skill resources', async () => {
    const output = await temporary()
    const runtime = join(root, '.build/office-runtime/primary-runtime')
    const manifest = JSON.parse(await readFile(join(runtime, 'runtime.json'), 'utf8'))
    expect(manifest.node).toBeUndefined()
    const python = join(runtime, 'dependencies/python', ...(process.platform === 'win32' ? ['python.exe'] : ['bin/python3']))
    await exec(python, ['-I', '-B', join(root, 'scripts/office-runtime/smoke.py'), output, join(runtime, 'runtime.json')])
    const checker = join(root, '.build/office-runtime/office-skills/scripts/check_office.py')
    for (const extension of ['docx', 'pptx', 'xlsx']) {
      const { stdout } = await exec(python, ['-I', '-B', checker, join(output, `sample.${extension}`), '--contains', 'Office runtime smoke'])
      expect(JSON.parse(stdout).verdict).toBe('pass')
    }
    // ZipInfo's constructor normalizes os.sep on Windows. Set filename after
    // construction so this is truly the malformed Compress-Archive shape.
    await exec(python, ['-I', '-B', '-c', `
import zipfile
from pathlib import Path
p = Path(${JSON.stringify(output)})
with zipfile.ZipFile(p / 'sample.docx') as source, zipfile.ZipFile(p / 'broken.docx', 'w') as bad:
    for name in source.namelist():
        info = zipfile.ZipInfo()
        info.filename = name.replace('/', chr(92))
        bad.writestr(info, source.read(name))
`])
    const malformed = unzipSync(await readFile(join(output, 'broken.docx')))
    expect(Object.keys(malformed)).toContain('word\\document.xml')
    expect(Object.keys(malformed)).not.toContain('word/document.xml')
    // Python's reader also normalizes separators on Windows; the strict
    // preview engine is the portable negative control for this fixture.
    await expect(exec(electronExecutable(root), [join(root, 'build/office-cli.mjs'), 'convert', '--input', join(output, 'broken.docx'), '--output', join(output, 'broken.pdf')], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30_000
    })).rejects.toMatchObject({ code: 1 })
  })
})

it('mounts Office skills and queries the immutable runtime in a real Harness subprocess from a neutral cwd', async () => {
  const home = await temporary()
  const neutral = await temporary()
  const diagnostic = join(home, 'office-probe.mjs')
  await writeFile(diagnostic, `
export const name = 'office-probe'
export const inject = ['skills', 'tools']
export async function apply(ctx) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const skills = await ctx.skills.list()
    const tool = ctx.tools.get('load_workspace_dependencies')
    if (tool && skills.some(skill => skill.name === 'office-docx')) {
      const deps = await tool.execute({})
      const loaded = await ctx.skills.get('office-docx')
      console.log('OFFICE_PROBE:' + JSON.stringify({ names: skills.map(skill => skill.name), deps, content: loaded.content }))
      return
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Office skills and dependency tool were not activated')
}
`)
  const normal = await prepareHostPluginSourcesPatch(home, join(root, 'build/dsh-desktop.patch.yml'), join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'))
  const patch = join(home, 'probe.patch.yml')
  await writeFile(patch, `${await readFile(normal, 'utf8')}\n- insert:\n    - id: office-probe\n      name: ${JSON.stringify(pathToFileURL(diagnostic).href)}\n`)
  const runtime = new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: electronExecutable(root),
    dshPatchPath: patch,
    dshSafePatchPath: patch,
    dshHome: home,
    logPath: join(home, 'harness.log'),
    startupTimeoutMs: 30_000,
    // Node mode here uses the same real Electron runtime as the packaged CLI.
    launchProcess: (executable, args, options) => spawn(executable, args, { ...options, env: { ...options.env, ELECTRON_RUN_AS_NODE: '1' } }),
    onChanged() {}
  })
  try {
    await runtime.start(neutral)
    const snapshot = runtime.snapshot()
    expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
    const marker = snapshot.logs.find(line => line.includes('OFFICE_PROBE:'))
    expect(marker, snapshot.logs.join('\n')).toBeDefined()
    const probe = JSON.parse(marker.slice(marker.indexOf('OFFICE_PROBE:') + 'OFFICE_PROBE:'.length))
    expect(probe.names).toEqual(expect.arrayContaining(['office-docx', 'office-pptx', 'office-xlsx']))
    expect(probe.deps.python).toContain(join(root, '.build/office-runtime'))
    expect(probe.content).toContain('Compress-Archive')
    expect(probe.content).toContain('ELECTRON_RUN_AS_NODE=1')
    const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const rpc = async (method, request) => {
      const response = await fetch(new URL(`/api/${method}`, snapshot.url), {
        method: 'POST',
        headers: { Cookie: cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: method, method, payload: { args: { request } } })
      })
      const envelope = await response.json()
      expect(envelope.result?.ok, JSON.stringify(envelope)).toBe(true)
      return envelope.result.value
    }
    const session = await rpc('session/create', {})
    const catalog = await rpc('skills/list', { sessionId: session.sessionId })
    expect(catalog.skills.filter(skill => skill.modelInvocable).map(skill => skill.name)).toEqual(expect.arrayContaining(['office-docx', 'office-pptx', 'office-xlsx']))
    const ordinary = await rpc('session/create', {})
    const togglePpt = async active => {
      const response = await fetch(new URL('/dsh-ppt/presentation/mode', snapshot.url), {
        method: 'POST', headers: { Cookie: cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ payload: { sessionId: session.sessionId, mode: active ? 'ppt' : null } })
      })
      const envelope = await response.json()
      expect(envelope.result?.value?.status, JSON.stringify(envelope)).toBe('ok')
    }
    await togglePpt(true)
    const [templateCatalog, ordinaryCatalog] = await Promise.all([
      rpc('skills/list', { sessionId: session.sessionId }), rpc('skills/list', { sessionId: ordinary.sessionId })
    ])
    expect(templateCatalog.skills.find(skill => skill.name === 'office-pptx')?.modelInvocable).toBe(false)
    expect(templateCatalog.skills.filter(skill => skill.modelInvocable).map(skill => skill.name)).toEqual(expect.arrayContaining(['office-docx', 'office-xlsx']))
    expect(ordinaryCatalog.skills.find(skill => skill.name === 'office-pptx')?.modelInvocable).toBe(true)
    await togglePpt(false)
    const restored = await rpc('skills/list', { sessionId: session.sessionId })
    expect(restored.skills.find(skill => skill.name === 'office-pptx')?.modelInvocable).toBe(true)
    await exec(electronExecutable(root), [join(root, 'build/office-cli.mjs'), 'capabilities', '--json'], { cwd: neutral, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30_000 })
  } finally {
    await runtime.stop()
  }
}, 60_000)

it('reports a missing Office payload during activation and keeps Safe Mode usable', async () => {
  const home = await temporary()
  const missing = join(home, 'missing-office-payload')
  const source = await readFile(join(root, 'build/dsh-desktop.patch.yml'), 'utf8')
  const patch = join(home, 'missing-office.patch.yml')
  await writeFile(patch, source.replace('resources: !!js process.env.DSH_DESKTOP_OFFICE_RESOURCES', `resources: ${JSON.stringify(missing)}`))
  const runtime = new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: electronExecutable(root),
    dshPatchPath: patch,
    dshSafePatchPath: join(root, 'build/dsh-desktop-safe.patch.yml'),
    dshHome: home,
    logPath: join(home, 'harness.log'),
    startupTimeoutMs: 30_000,
    launchProcess: (executable, args, options) => spawn(executable, args, { ...options, env: { ...options.env, ELECTRON_RUN_AS_NODE: '1' } }),
    onChanged() {}
  })
  try {
    await runtime.start(home)
    expect(runtime.snapshot().phase).toBe('failed')
    expect(runtime.snapshot().logs.join('\n')).toContain(missing)
    expect(runtime.snapshot().logs.join('\n')).toContain('dsh-desktop-office')
    await runtime.stop()
    await ensureSafeModeProfile(home)
    await runtime.start(home, SAFE_MODE_PROFILE)
    expect(runtime.snapshot().phase, runtime.snapshot().logs.join('\n')).toBe('ready')
  } finally {
    await runtime.stop()
  }
}, 60_000)

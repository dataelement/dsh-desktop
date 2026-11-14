import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { officeTarget, officeRuntimeIdentity, downloadAsset, unpackWheel, prepareOfficeRuntime } from '../scripts/office-runtime/prepare.mjs'
import { officeCliAttempts, officeCliCommand, officeCliTimedOut, officeCliTimeoutMs, runOfficeCli } from '../scripts/office-runtime/prepare-templates.mjs'
import { zipSync, unzipSync, strToU8 } from 'fflate'
import { electronExecutable } from '../scripts/verify/electron-node-loader.mjs'

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

describe('Office template preview limits', () => {
  const kitTimeout = stderr => Object.assign(new Error('Command failed'), {
    stderr, code: 1, killed: false, signal: null,
  })

  it('bounds each LibreOffice call to 30 seconds and retries a hang in a new process', async () => {
    expect(officeCliTimeoutMs).toBe(30_000)
    expect(officeCliAttempts).toBe(3)
    const command = officeCliCommand('electron', 'office-cli.mjs', ['render', '--input', 'book.xlsx', '--dpi', '100'])
    expect(command.args).toEqual(['office-cli.mjs', 'render', '--input', 'book.xlsx', '--dpi', '100', '--timeout-ms', '30000'])
    expect(command.timeout).toBe(90_000)
    const hung = kitTimeout('{"code":"timeout","error":"LibreOffice conversion timed out."}\n')
    expect(officeCliTimedOut(hung)).toBe(true)
    expect(officeCliTimedOut(kitTimeout(Buffer.from(hung.stderr)))).toBe(true)
    expect(officeCliTimedOut(Object.assign(new Error('killed'), { killed: true, signal: 'SIGTERM' }))).toBe(true)
    expect(officeCliTimedOut(kitTimeout('{"code":"invalid-document","error":"bad workbook"}'))).toBe(false)

    let calls = 0
    await expect(runOfficeCli('recalculate', async () => {
      calls += 1
      if (calls < 3) throw hung
      return { ok: true }
    })).resolves.toEqual({ ok: true })
    expect(calls).toBe(3)

    await expect(runOfficeCli('recalculate', async () => { throw hung })).rejects.toBe(hung)
    const invalid = kitTimeout('{"code":"invalid-document","error":"bad workbook"}')
    let invalidCalls = 0
    await expect(runOfficeCli('render', async () => {
      invalidCalls += 1
      throw invalid
    })).rejects.toBe(invalid)
    expect(invalidCalls).toBe(1)
  })
})

describe('Office runtime assembly', () => {
  it('runs the full packaging gate against the current Office skills and physical resources', async () => {
    const resources = await temporary()
    await symlink(join(root, '.build/office-runtime'), join(resources, 'office-runtime'), process.platform === 'win32' ? 'junction' : 'dir')
    await symlink(root, join(resources, 'app.asar'), process.platform === 'win32' ? 'junction' : 'dir')
    await copyFile(join(root, 'build/office-cli.mjs'), join(resources, 'office-cli.mjs'))
    await copyFile(join(root, 'build/office-engine-resolution.mjs'), join(resources, 'office-engine-resolution.mjs'))
    const { stdout } = await exec(process.execPath, [join(root, 'scripts/verify/verify-office-runtime.cjs'), resources, electronExecutable(root)], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 180_000
    })
    expect(stdout).toContain('Packaged Office authoring, structure checks and DOCX/PPTX/XLSX PDF conversion passed')
  }, 190_000)

  it('selects all supported native targets and rejects cross-platform substitutions', () => {
    expect(officeTarget('linux', 'x64')).toBe('linux-x64')
    expect(officeRuntimeIdentity('linux-x64')).toEqual({ platform: 'linux', arch: 'x64' })
    expect(officeRuntimeIdentity('mac-arm64')).toEqual({ platform: 'darwin', arch: 'arm64' })
    expect(officeRuntimeIdentity('win-x64')).toEqual({ platform: 'win32', arch: 'x64' })
    expect(() => officeRuntimeIdentity('linux-arm64')).toThrow('unknown target')
    expect(() => officeTarget('linux', 'arm64')).toThrow('unsupported native target')
    expect(officeTarget('win32', 'x64')).toBe('win-x64')
    expect(officeTarget('darwin', 'arm64')).toBe('mac-arm64')
    expect(officeTarget('darwin', 'x64')).toBe('mac-x64')
    expect(() => officeTarget('win32', 'arm64')).toThrow('unsupported native target')
  })

  it('locks Linux CPython and native wheels compatible with glibc 2.28', async () => {
    const lock = JSON.parse(await readFile(join(root, 'scripts/office-runtime/lock.json'), 'utf8'))
    const linux = lock.targets['linux-x64']
    expect(linux.pythonTarget).toBe('x86_64-unknown-linux-gnu')
    expect(linux.pythonSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(linux.wheels).toHaveLength(4)
    for (const wheel of linux.wheels) {
      const url = new URL(wheel.url)
      expect(url.hostname).toBe('files.pythonhosted.org')
      expect(url.pathname).toContain('-cp312-cp312-manylinux')
      expect(url.pathname).toMatch(/manylinux_2_(?:17|24|27|28)_x86_64/)
      expect(wheel.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
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

  it('creates valid Office packages with the prepared Python and checks their document contents', async () => {
    const output = await temporary()
    const runtime = join(root, '.build/office-runtime/primary-runtime')
    const manifest = JSON.parse(await readFile(join(runtime, 'runtime.json'), 'utf8'))
    expect(manifest.node).toBeUndefined()
    const python = join(runtime, 'dependencies/python', ...(process.platform === 'win32' ? ['python.exe'] : ['bin/python3']))
    await exec(python, ['-I', '-B', join(root, 'scripts/office-runtime/smoke.py'), output, join(runtime, 'runtime.json')])
    // The current Office skills expose native tools rather than check_office.py.
    for (const [extension, entry] of [['docx', 'word/document.xml'], ['pptx', 'ppt/slides/slide1.xml'], ['xlsx', 'xl/worksheets/sheet1.xml']]) {
      const entries = unzipSync(await readFile(join(output, `sample.${extension}`)))
      expect(entries['[Content_Types].xml']).toBeDefined()
      expect(new TextDecoder().decode(entries[entry])).toContain('Office runtime smoke')
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

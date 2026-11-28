import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import gate from '../scripts/verify/verify-office-runtime.cjs'

const temporary = []
afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(temporary.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

async function fixture({ failAt, failure, invalidPdf = false } = {}) {
  const resources = await mkdtemp(join(tmpdir(), 'dsh-office-gate-test-'))
  temporary.push(resources)
  const payload = join(resources, 'office-runtime', 'primary-runtime')
  await mkdir(payload, { recursive: true })
  await writeFile(join(payload, 'runtime.json'), JSON.stringify({ platform: process.platform, arch: process.arch }))
  const calls = []
  const execute = async (file, args, options) => {
    calls.push({ file, args, options })
    if (!temporary.includes(options.cwd)) temporary.push(options.cwd)
    if (calls.length === 1) await writeFile(join(options.cwd, 'sample.xlsx'), 'authoring evidence')
    if (calls.length === failAt) throw failure
    if (args[1] === 'convert') {
      await writeFile(args[args.indexOf('--output') + 1], invalidPdf ? 'invalid' : '%PDF-1.7\n')
    }
    return { stdout: '', stderr: '' }
  }
  return { resources, calls, run: () => gate.verifyOfficeRuntime(resources, 'packaged-helper', undefined, execute) }
}

describe('packaged Office gate', () => {
  it.each([false, true])('creates a dedicated diagnostics parent and keeps scratch only on failure=%s', async failed => {
    const failure = new Error('native conversion failed')
    const { resources, calls, run } = await fixture(failed ? { failAt: 7, failure } : {})
    const diagnostics = join(resources, 'new', 'diagnostics')
    vi.stubEnv('DSH_OFFICE_SMOKE_DIAGNOSTICS_DIR', diagnostics)
    if (failed) await expect(run()).rejects.toHaveProperty('cause', failure)
    else await run()
    const scratch = calls[0].options.cwd
    expect(dirname(scratch)).toBe(diagnostics)
    await expect(access(diagnostics)).resolves.toBeUndefined()
    if (failed) await expect(access(scratch)).resolves.toBeUndefined()
    else await expect(access(scratch)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('executes every prerequisite and three conversions with separate CLI and watchdog deadlines, then cleans scratch', async () => {
    const { resources, calls, run } = await fixture()
    await run()
    expect(calls).toHaveLength(7)
    expect(calls[0].args.slice(0, 2)).toEqual(['-I', '-B'])
    expect(basename(calls[0].args[2])).toBe('smoke.py')
    expect(basename(calls[1].args[0])).toBe('probe.cjs')
    expect(calls[2].args).toEqual(['-I', '-B', '-m', 'pip', 'check'])
    expect(calls[3].args).toEqual([join(resources, 'office-cli.mjs'), 'capabilities', '--json'])
    const scratch = calls[0].options.cwd
    for (const [index, extension] of ['docx', 'pptx', 'xlsx'].entries()) {
      expect(calls[index + 4].file).toBe('packaged-helper')
      expect(calls[index + 4].args).toEqual([
        join(resources, 'office-cli.mjs'), 'convert', '--input', join(scratch, `sample.${extension}`),
        '--output', join(scratch, `${extension}.pdf`), '--timeout-ms', '120000'
      ])
    }
    for (const { options } of calls) {
      expect(options).toMatchObject({ cwd: scratch, timeout: 150_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 })
      expect(options.env.ELECTRON_RUN_AS_NODE).toBe('1')
    }
    await expect(access(scratch)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    [1, 'Python authoring smoke'],
    [2, 'Packaged Office plugin probe'],
    [3, 'Python dependency check'],
    [4, 'Office CLI capabilities'],
    [5, 'DOCX to PDF conversion'],
    [6, 'PPTX to PDF conversion'],
    [7, 'XLSX to PDF conversion']
  ])('preserves cause, output and scratch when command %i fails', async (failAt, stage) => {
    const failure = Object.assign(new Error('Command failed: native helper'), {
      code: 1, signal: null, killed: false, stdout: Buffer.from('partial conversion output'),
      stderr: '{"code":"timeout","error":"LibreOffice conversion timed out."}\n'
    })
    const { calls, run } = await fixture({ failAt, failure })
    const error = await run().catch(error => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.cause).toBe(failure)
    expect(error.message).toContain(stage)
    expect(error.message).toContain('code=1 signal=none killed=false')
    expect(error.message).toContain('partial conversion output')
    expect(error.message).toContain(failure.stderr)
    expect(calls).toHaveLength(failAt)
    const scratch = calls[0].options.cwd
    expect(error.message).toContain(`Office smoke scratch preserved: ${scratch}`)
    expect(await readFile(join(scratch, 'sample.xlsx'), 'utf8')).toBe('authoring evidence')
  })

  it('reports watchdog termination independently of a CLI failure and bounds displayed output', async () => {
    const failure = Object.assign(new Error('Command killed'), {
      code: null, signal: 'SIGTERM', killed: true, stdout: '', stderr: 'x'.repeat(20_000) + 'native stderr tail'
    })
    const { run } = await fixture({ failAt: 7, failure })
    const error = await run().catch(error => error)
    expect(error.cause).toBe(failure)
    expect(error.message).toContain('signal=SIGTERM killed=true')
    expect(error.message).toContain('native stderr tail')
    expect(error.message.length).toBeLessThan(18_000)
    expect(error.cause.stderr).toBe(failure.stderr)
  })

  it('still rejects invalid PDF output and preserves the failed validation evidence', async () => {
    const { calls, run } = await fixture({ invalidPdf: true })
    const error = await run().catch(error => error)
    expect(error.message).toContain('DOCX PDF validation')
    expect(error.cause.message).toBe('Office docx conversion did not produce PDF')
    expect(calls).toHaveLength(5)
    expect(await readFile(join(calls[0].options.cwd, 'docx.pdf'), 'utf8')).toBe('invalid')
  })
})

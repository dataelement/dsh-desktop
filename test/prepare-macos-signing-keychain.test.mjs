import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({ security: vi.fn(), certificate: vi.fn() }))
vi.mock('node:child_process', () => ({ execFile: mocks.security }))
vi.mock('../scripts/release/apple-intermediate-certificate.mjs', () => ({ prepareAppleIntermediateCertificate: mocks.certificate }))
const temporary = []
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
  vi.resetModules()
  await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-signing-keychain-'))
  temporary.push(root)
  const output = join(root, 'github-output')
  vi.stubEnv('RUNNER_TEMP', root)
  vi.stubEnv('GITHUB_OUTPUT', output)
  vi.stubEnv('CSC_LINK', Buffer.from('test signing fixture').toString('base64'))
  vi.stubEnv('CSC_KEY_PASSWORD', 'test-password')
  mocks.security.mockImplementation((_file, args, _options, callback) => {
    const stdout = args[0] === 'list-keychains' && args.length === 3
      ? '    "/fixture/login.keychain-db"'
      : args[0] === 'find-identity' ? '  1) fixture identity' : ''
    callback(null, { stdout, stderr: '' })
  })
  return { root, output }
}

describe('macOS signing keychain certificate integration', () => {
  it('imports only after the verified helper succeeds and retains cleanup metadata', async () => {
    const { output } = await setup()
    mocks.certificate.mockImplementation(destination => writeFile(destination, 'verified DER fixture'))
    await import('../scripts/release/prepare-macos-signing-keychain.mjs')
    expect(mocks.certificate).toHaveBeenCalledTimes(1)
    const certificatePath = mocks.certificate.mock.calls[0][0]
    const calls = mocks.security.mock.calls.map(call => call[1])
    expect(calls.some(args => args[0] === 'import' && args[1] === certificatePath)).toBe(true)
    const metadata = await readFile(output, 'utf8')
    expect(metadata).toContain('keychain=')
    expect(metadata).toContain('keychain_list=')
    expect(calls.some(args => args[0] === 'find-identity')).toBe(true)
    await expect(stat(certificatePath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails and restores the original keychains without importing an unverified intermediate', async () => {
    const { output } = await setup()
    const failure = new Error('neither remote nor local source passed verification')
    mocks.certificate.mockRejectedValue(failure)
    await expect(import('../scripts/release/prepare-macos-signing-keychain.mjs')).rejects.toBe(failure)
    const certificatePath = mocks.certificate.mock.calls[0][0]
    const calls = mocks.security.mock.calls.map(call => call[1])
    expect(calls.some(args => args[0] === 'import' && args[1] === certificatePath)).toBe(false)
    expect(calls).toContainEqual(['list-keychains', '-d', 'user', '-s', '/fixture/login.keychain-db'])
    expect(calls.some(args => args[0] === 'delete-keychain')).toBe(true)
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

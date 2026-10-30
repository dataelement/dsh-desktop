import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ApplicationRollback } from '../src/main/update/application-rollback'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-app-rollback-'))
  roots.push(root)
  const file = join(root, 'rollback.json')
  const open = (version: string, platform = 'darwin', arch = 'arm64', packaged = true) =>
    new ApplicationRollback(file, { version, platform, arch, packaged })
  return { file, open }
}

describe('application rollback installation journal', () => {
  it('records the actual previous version, even when an upgrade skips releases', async () => {
    const { file, open } = await fixture()
    await open('0.9.2').recordUpgrade('0.13.0')
    expect(await open('0.9.2').status()).toMatchObject({ available: false, reason: 'rollback-upgrade-pending' })
    expect(await open('0.13.0').status()).toEqual({ available: true, targetVersion: '0.9.2' })
    expect(JSON.parse(await readFile(file, 'utf8')).previousVersion).toBe('0.9.2')
  })
  it('does not guess a version for installations made before journaling existed', async () => {
    const { open } = await fixture()
    expect(await open('0.13.0').status()).toEqual({ available: false, reason: 'previous-installed-version-not-recorded' })
  })
  it('retains the exact target across download failure and prevents another attempt', async () => {
    const { open } = await fixture()
    await open('0.12.0').recordUpgrade('0.13.0')
    const ledger = open('0.13.0')
    expect(await ledger.begin()).toBe('0.12.0')
    await ledger.fail('checksum-failed')
    expect(await open('0.13.0').status()).toEqual({ available: false, targetVersion: '0.12.0', reason: 'checksum-failed' })
    await expect(ledger.begin()).rejects.toThrow('checksum-failed')
  })
  it('does not treat requesting installation as successful application startup', async () => {
    const { open } = await fixture()
    await open('0.12.1').recordUpgrade('0.13.0')
    const ledger = open('0.13.0')
    await ledger.begin()
    await ledger.markInstalling()
    expect(await open('0.13.0').status()).toMatchObject({ available: false, reason: 'rollback-interrupted-or-installation-not-verified' })
  })
  it('recognizes the previous application executable after a rollback and disallows loops', async () => {
    const { open } = await fixture()
    await open('0.12.1').recordUpgrade('0.13.0')
    const ledger = open('0.13.0')
    await ledger.begin()
    await ledger.markInstalling()
    expect(await open('0.12.1').status()).toMatchObject({ available: false, reason: 'rollback-complete' })
  })
  it('fails closed after a platform/architecture or unrelated application change', async () => {
    const { open } = await fixture()
    await open('0.12.1').recordUpgrade('0.13.0')
    await open('0.13.0').initialize()
    expect(await open('0.13.0', 'darwin', 'x64').status()).toMatchObject({ available: false, reason: 'installation-platform-changed' })
    expect(await open('0.14.0').status()).toMatchObject({ available: false, reason: 'installation-version-changed' })
    expect(await open('0.13.0', 'linux').status()).toMatchObject({ available: false, reason: 'unsupported-installation' })
    expect(await open('0.13.0', 'darwin', 'arm64', false).status()).toMatchObject({ available: false, reason: 'unsupported-installation' })
  })
  it('does not overwrite the target when installing an older application manually', async () => {
    const { file, open } = await fixture()
    await open('0.12.1').recordUpgrade('0.13.0')
    const before = await readFile(file, 'utf8')
    await open('0.13.0').recordUpgrade('0.11.0')
    expect(JSON.parse(await readFile(file, 'utf8')).previousVersion).toBe(JSON.parse(before).previousVersion)
  })
  it('rejects corrupt history instead of enabling a guessed fallback', async () => {
    const { file, open } = await fixture()
    await writeFile(file, JSON.stringify({ previousVersion: '../../bad' }))
    await expect(open('0.13.0').status()).rejects.toThrow('Invalid application rollback history')
  })
})

import { describe, expect, it } from 'vitest'
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:os'
import {
  pairingPinStorePath,
  readPairingPinState,
  writePairingPinState
} from '../src/main/mobile/pairing-pin-store'

describe('pairing pin store', () => {
  it('writes pin and consent in one document and omits pin after consent is withdrawn', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-pin-'))
    const path = pairingPinStorePath(dir)
    expect(writePairingPinState(path, { pin: '123456', pinConsent: true })).toBe(true)
    expect(readPairingPinState(path)).toEqual({ pin: '123456', pinConsent: true })
    expect(writePairingPinState(path, { pinConsent: false })).toBe(true)
    const raw = JSON.parse(await readFile(path, 'utf8')) as { pin?: unknown; pinConsent?: unknown }
    expect(raw.pin).toBeUndefined()
    expect(raw.pinConsent).toBeUndefined()
    expect(readPairingPinState(path)).toEqual({})
  })

  it('overwrites an existing pin file on a second write', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-pin-'))
    const path = pairingPinStorePath(dir)
    expect(writePairingPinState(path, { pin: '123456', pinConsent: true })).toBe(true)
    expect(writePairingPinState(path, { pin: '654321', pinConsent: true })).toBe(true)
    expect(readPairingPinState(path)).toEqual({ pin: '654321', pinConsent: true })
  })

  it('treats damaged JSON as no consent and no pin', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-pin-'))
    const path = join(dir, 'mobile-pairing-pin.json')
    await writeFile(path, '{not-json')
    expect(readPairingPinState(path)).toEqual({})
  })

  it('ignores invalid field types without failing the parse', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-pin-'))
    const path = join(dir, 'mobile-pairing-pin.json')
    await writeFile(path, JSON.stringify({ pin: 123456, pinConsent: 'yes', extra: true }))
    expect(readPairingPinState(path)).toEqual({})
  })

  it('reports write failure instead of pretending consent succeeded', async () => {
    if (platform() === 'win32') return
    const dir = await mkdtemp(join(tmpdir(), 'dsh-pin-'))
    await chmod(dir, 0o500)
    expect(writePairingPinState(join(dir, 'nested', 'mobile-pairing-pin.json'), { pinConsent: true })).toBe(
      false
    )
    await chmod(dir, 0o700)
  })
})

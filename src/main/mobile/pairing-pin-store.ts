import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface PairingPinState {
  pin?: string
  pinConsent?: boolean
}

export interface PairingPinStore {
  load(): PairingPinState
  save(state: PairingPinState): boolean
}

export function pairingPinStorePath(userDataPath: string): string {
  return join(userDataPath, 'mobile-pairing-pin.json')
}

export function createFilePairingPinStore(path: string): PairingPinStore {
  return {
    load: () => readPairingPinState(path),
    save: (state) => writePairingPinState(path, state)
  }
}

export function readPairingPinState(path: string): PairingPinState {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      pin?: unknown
      pinConsent?: unknown
    }
    const state: PairingPinState = {}
    if (typeof parsed.pin === 'string' && /^\d{6}$/.test(parsed.pin)) state.pin = parsed.pin
    if (typeof parsed.pinConsent === 'boolean') state.pinConsent = parsed.pinConsent
    return state
  } catch {
    return {}
  }
}

export function writePairingPinState(path: string, state: PairingPinState): boolean {
  const document: PairingPinState = {}
  if (state.pinConsent === true) {
    document.pinConsent = true
    if (typeof state.pin === 'string' && /^\d{6}$/.test(state.pin)) document.pin = state.pin
  }
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(temporary, `${JSON.stringify(document, undefined, 2)}\n`, { mode: 0o600 })
    if (existsSync(path)) unlinkSync(path)
    renameSync(temporary, path)
    return true
  } catch {
    try {
      if (existsSync(temporary)) unlinkSync(temporary)
    } catch {
      // The caller already treats a false return as a failed write.
    }
    return false
  }
}

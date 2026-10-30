import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RepairAttempt } from '../repair-policy'

export interface RepairJournalEntry extends RepairAttempt {
  key: string
  appVersion?: string
  status: 'pending' | 'restart' | 'failed' | 'verified'
  createdAt: string
}
export interface RepairJournal { attempts: RepairJournalEntry[] }
const queues = new Map<string, Promise<void>>()

export async function readRepairJournal(dshHome: string): Promise<RepairJournal> {
  try {
    const data: unknown = JSON.parse(await readFile(join(dshHome, 'repair-journal.json'), 'utf8'))
    if (!data || typeof data !== 'object' || !('attempts' in data) || !Array.isArray(data.attempts)) throw new Error('Invalid repair journal')
    const attempts = data.attempts.filter((entry: unknown): entry is RepairJournalEntry => {
      if (!entry || typeof entry !== 'object') return false
      return (!('appVersion' in entry) || typeof entry.appVersion === 'string') && 'key' in entry && typeof entry.key === 'string' && 'action' in entry && ['upgrade', 'disable', 'configuration'].includes(String(entry.action)) &&
        'plugins' in entry && Array.isArray(entry.plugins) && entry.plugins.every(plugin => typeof plugin === 'string') &&
        'status' in entry && ['pending', 'restart', 'failed', 'verified'].includes(String(entry.status)) && 'createdAt' in entry && typeof entry.createdAt === 'string' &&
        (!('versions' in entry) || (entry.versions !== null && typeof entry.versions === 'object' && Object.values(entry.versions).every(version => typeof version === 'string')))
    })
    if (attempts.length !== data.attempts.length) throw new Error('Invalid repair journal entries')
    return { attempts }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return { attempts: [] }
    throw error
  }
}

/** Old builds encoded the app version in the first key element. Unknown keys are not evidence for this version. */
export function repairAttemptsForVersion(journal: RepairJournal, appVersion: string): RepairJournalEntry[] {
  return journal.attempts.filter(attempt => {
    if (attempt.appVersion !== undefined) return attempt.appVersion === appVersion
    try {
      const key: unknown = JSON.parse(attempt.key)
      return Array.isArray(key) && key[0] === appVersion
    } catch {
      return false
    }
  })
}

/** Serialize writes, and persist before side effects so a crash cannot repeat a round. */
export function recordRepairAttempt(dshHome: string, attempt: Omit<RepairJournalEntry, 'createdAt'>): Promise<RepairJournal> {
  let result: RepairJournal = { attempts: [] }
  const operation = (queues.get(dshHome) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const journal = await readRepairJournal(dshHome)
    const existing = journal.attempts.findIndex(entry => entry.key === attempt.key)
    const entry = { ...attempt, createdAt: existing >= 0 ? journal.attempts[existing]?.createdAt ?? new Date().toISOString() : new Date().toISOString() }
    if (existing >= 0) journal.attempts[existing] = entry
    else journal.attempts.push(entry)
    journal.attempts = journal.attempts.slice(-100)
    await mkdir(dshHome, { recursive: true })
    const destination = join(dshHome, 'repair-journal.json')
    const temporary = `${destination}.tmp`
    await writeFile(temporary, JSON.stringify(journal), { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, destination)
    result = journal
  })
  queues.set(dshHome, operation)
  return operation.then(() => result)
}

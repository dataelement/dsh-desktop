import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readRepairJournal, recordRepairAttempt, repairAttemptsForVersion } from '../src/main/state/repair-job'
const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function home() { const path = await mkdtemp(join(tmpdir(), 'repair-journal-')); directories.push(path); return path }
describe('repair journal', () => {
  it('survives restart and updates a round instead of appending duplicates', async () => {
    const path = await home()
    const attempt = { key: 'a-upgrade-2', action: 'upgrade' as const, plugins: ['a'], versions: { a: '2' } }
    await recordRepairAttempt(path, { ...attempt, status: 'pending' })
    await recordRepairAttempt(path, { ...attempt, status: 'restart' })
    const journal = await readRepairJournal(path)
    expect(journal.attempts).toHaveLength(1)
    expect(journal.attempts[0]?.status).toBe('restart')
    expect(JSON.parse(await readFile(join(path, 'repair-journal.json'), 'utf8'))).toEqual(journal)
  })
  it('serializes independent writes without losing either round', async () => {
    const path = await home()
    await Promise.all(['a', 'b'].map(key => recordRepairAttempt(path, { key, action: 'disable', plugins: [key], status: 'pending' })))
    expect((await readRepairJournal(path)).attempts).toHaveLength(2)
  })
  it('fails closed on corrupt evidence instead of permitting repeat operations', async () => {
    const path = await home()
    await writeFile(join(path, 'repair-journal.json'), '{broken')
    await expect(recordRepairAttempt(path, { key: 'a', action: 'disable', plugins: ['a'], status: 'pending' })).rejects.toThrow()
    expect(await readFile(join(path, 'repair-journal.json'), 'utf8')).toBe('{broken')
  })
  it('persists verification so a new process can distinguish a new incident from an interrupted round', async () => {
    const path = await home()
    const attempt = { key: 'a-disable', action: 'disable' as const, plugins: ['a'] }
    await recordRepairAttempt(path, { ...attempt, status: 'pending' })
    const createdAt = (await readRepairJournal(path)).attempts[0]?.createdAt
    await recordRepairAttempt(path, { ...attempt, status: 'verified' })
    expect((await readRepairJournal(path)).attempts[0]).toMatchObject({ status: 'verified', createdAt })
    expect(JSON.parse(await readFile(join(path, 'repair-journal.json'), 'utf8')).attempts).toHaveLength(1)
  })
  it('rejects invalid action evidence without silently replacing the journal', async () => {
    const path = await home()
    const invalid = JSON.stringify({ attempts: [{ key: 'a', action: 'uninstall', plugins: ['a'], status: 'pending', createdAt: 'now' }] })
    await writeFile(join(path, 'repair-journal.json'), invalid)
    await expect(readRepairJournal(path)).rejects.toThrow('Invalid repair journal entries')
    expect(await readFile(join(path, 'repair-journal.json'), 'utf8')).toBe(invalid)
  })

  it('filters persisted evidence by explicit app version or the older encoded key', async () => {
    const path = await home()
    const base = { action: 'disable' as const, plugins: ['a'], status: 'failed' as const }
    await recordRepairAttempt(path, { ...base, key: 'explicit', appVersion: '0.13.0' })
    await recordRepairAttempt(path, { ...base, key: JSON.stringify(['0.12.0', 'disable', ['a']]) })
    await recordRepairAttempt(path, { ...base, key: JSON.stringify(['0.13.0', 'disable', ['b']]) })
    await recordRepairAttempt(path, { ...base, key: 'unknown' })
    const journal = await readRepairJournal(path)
    expect(repairAttemptsForVersion(journal, '0.13.0').map(entry => entry.key)).toEqual(['explicit', JSON.stringify(['0.13.0', 'disable', ['b']])])
    expect(repairAttemptsForVersion(journal, '0.12.0')).toHaveLength(1)
  })
  it('rejects a non-string app version rather than mis-scoping old evidence', async () => {
    const path = await home()
    await writeFile(join(path, 'repair-journal.json'), JSON.stringify({ attempts: [{ key: 'a', appVersion: 13, action: 'disable', plugins: ['a'], status: 'failed', createdAt: 'now' }] }))
    await expect(readRepairJournal(path)).rejects.toThrow('Invalid repair journal entries')
  })

})

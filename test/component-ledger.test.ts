import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  readComponentLedger,
  recordComponentRepair,
  REPAIR_ESCALATION_THRESHOLD,
  shouldEscalateRepairs
} from '../src/main/state/component-ledger'

describe('component ledger', () => {
  const testRoot = join(__dirname, '.temp-component-ledger')
  const dshHome = join(testRoot, 'dsh-home')
  const at = (iso: string) => () => new Date(iso)

  beforeEach(async () => {
    await mkdir(dshHome, { recursive: true })
  })

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true })
  })

  it('records the first repair of a label', async () => {
    const entry = await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T10:00:00.000Z'))

    expect(entry.repairs).toBe(1)
    expect(entry.lastRepairAt).toBe('2026-08-25T10:00:00.000Z')
  })

  it('counts a label that keeps coming back broken', async () => {
    await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T10:00:00.000Z'))
    await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T11:00:00.000Z'))
    const entry = await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T12:00:00.000Z'))

    expect(entry.repairs).toBe(3)
    expect(entry.lastRepairAt).toBe('2026-08-25T12:00:00.000Z')
  })

  it('counts each label separately', async () => {
    await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T10:00:00.000Z'))
    await recordComponentRepair(dshHome, 'com.dsh.doctor', at('2026-08-25T11:00:00.000Z'))
    await recordComponentRepair(dshHome, 'com.other.agent', at('2026-08-25T11:30:00.000Z'))

    const ledger = await readComponentLedger(dshHome)

    expect(ledger['com.dsh.doctor']?.repairs).toBe(2)
    expect(ledger['com.other.agent']?.repairs).toBe(1)
  })

  it('reads an empty ledger when none has been written', async () => {
    expect(await readComponentLedger(dshHome)).toEqual({})
  })

  it('starts over when the stored ledger is unreadable', async () => {
    const recovery = join(dshHome, 'recovery')
    await mkdir(recovery, { recursive: true })
    await writeFile(join(recovery, 'launch-agent-ledger.json'), '{ not json')

    expect(await readComponentLedger(dshHome)).toEqual({})
  })

  it('keeps repairing while the label stays under the threshold', () => {
    expect(shouldEscalateRepairs({ repairs: REPAIR_ESCALATION_THRESHOLD - 1, lastRepairAt: '' }))
      .toBe(false)
  })

  it('escalates once a label has been repaired too many times', () => {
    expect(shouldEscalateRepairs({ repairs: REPAIR_ESCALATION_THRESHOLD, lastRepairAt: '' }))
      .toBe(true)
  })
})

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * A plugin that recreates its LaunchAgent after every repair would otherwise
 * trap the app in an endless correct-and-be-overwritten cycle. Past this many
 * repairs of one label the app stops correcting it silently and asks the user
 * to decide.
 */
export const REPAIR_ESCALATION_THRESHOLD = 3

export interface ComponentLedgerEntry {
  repairs: number
  lastRepairAt: string
}

export type ComponentLedger = Record<string, ComponentLedgerEntry>

function ledgerPath(dshHome: string): string {
  return join(dshHome, 'recovery', 'launch-agent-ledger.json')
}

export async function readComponentLedger(dshHome: string): Promise<ComponentLedger> {
  try {
    const parsed = JSON.parse(await readFile(ledgerPath(dshHome), 'utf8')) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as ComponentLedger
  } catch {
    // A missing or damaged ledger only costs escalation history, never safety.
    return {}
  }
}

export async function recordComponentRepair(
  dshHome: string,
  label: string,
  now: () => Date = () => new Date()
): Promise<ComponentLedgerEntry> {
  const ledger = await readComponentLedger(dshHome)
  const entry: ComponentLedgerEntry = {
    repairs: (ledger[label]?.repairs ?? 0) + 1,
    lastRepairAt: now().toISOString()
  }
  ledger[label] = entry
  const path = ledgerPath(dshHome)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(ledger, undefined, 2)}\n`)
  return entry
}

export function shouldEscalateRepairs(entry: ComponentLedgerEntry): boolean {
  return entry.repairs >= REPAIR_ESCALATION_THRESHOLD
}

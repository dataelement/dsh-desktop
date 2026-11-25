/** Recent plugin-management lines for the startup recovery page. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parsePluginOperationRecord, type PluginOperationRecord } from '@deepseek-ai/dsh-plugin-manager/diagnostic'

const JOURNAL_FILES = ['operations.previous.jsonl', 'operations.jsonl'] as const

/** The shell's journal lives beside the app data, not inside the Harness home. */
export function pluginOperationDirectory(userData: string): string {
  return join(userData, 'plugin-operations')
}

/** One short line from a validated record. Extra fields are already discarded by the parser. */
export function formatPluginOperation(record: PluginOperationRecord): string {
  const operation = record.operation
  const target = operation.target ?? 'unknown'
  const version = operation.version === undefined ? '' : `@${operation.version}`
  const outcome = operation.phase === 'settled' ? `${operation.phase} ${operation.application}` : operation.phase
  return `${operation.time} ${operation.reason} ${target}${version} ${outcome}`
}

/** The newest accepted lines from the shell journal, or an empty list when the files are absent. */
export async function readRecentPluginOperations(directory: string, limit: number): Promise<string[]> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError('Invalid operation history limit')
  const lines: string[] = []
  for (const name of JOURNAL_FILES) {
    let text = ''
    try {
      text = await readFile(join(directory, name), 'utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const record = parsePluginOperationRecord(parsed)
      if (record !== undefined) lines.push(formatPluginOperation(record))
    }
  }
  return lines.slice(-limit)
}

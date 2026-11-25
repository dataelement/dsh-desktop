import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const MAX_TEXT = 64 * 1024
export const FATAL_REPORT_NAME = 'fatal-report.json'

/** Fields stay optional so a partial or older report still parses. */
export interface FatalReport {
  version?: number
  recordedAt?: string
  message?: string
  diagnostic?: string
}

/**
 * Persist a host failure for the product recovery page.
 * This is not the official fatal dialog. The caller supplies the home directory.
 */
export async function recordFatalFailure(dshHome: string, error: unknown): Promise<FatalReport> {
  const diagnostic = diagnosticOf(error)
  const report: FatalReport = {
    version: 1,
    recordedAt: new Date().toISOString(),
    message: clip(redactFatalText(textOf(error))),
    ...(diagnostic === undefined ? {} : { diagnostic: clip(redactFatalText(diagnostic)) })
  }
  const path = join(dshHome, FATAL_REPORT_NAME)
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(report))
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
  return report
}

export async function readFatalReport(dshHome: string): Promise<FatalReport | undefined> {
  let text: string
  try {
    text = await readFile(join(dshHome, FATAL_REPORT_NAME), 'utf8')
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return {
    ...(typeof record.version === 'number' ? { version: record.version } : {}),
    ...(typeof record.recordedAt === 'string' ? { recordedAt: record.recordedAt } : {}),
    ...(typeof record.message === 'string' ? { message: record.message } : {}),
    ...(typeof record.diagnostic === 'string' ? { diagnostic: record.diagnostic } : {})
  }
}

export async function clearFatalReport(dshHome: string): Promise<void> {
  await rm(join(dshHome, FATAL_REPORT_NAME), { force: true })
}

export function redactFatalText(text: string): string {
  return text.replace(/([?&]token=)[^&\s]+/gu, '$1[redacted]')
}

function textOf(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message
  if (typeof error === 'string' && error.length > 0) return error
  return 'Desktop host failed'
}

function diagnosticOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('diagnostic' in error)) return undefined
  return typeof error.diagnostic === 'string' && error.diagnostic.length > 0 ? error.diagnostic : undefined
}

function clip(text: string): string {
  return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT)}\n… (fatal report truncated)`
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

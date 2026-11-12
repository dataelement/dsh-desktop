/** Isolated auxiliary-report I/O; the shell owns termination and observes worker exit. */
import { parentPort, workerData } from 'node:worker_threads'
import { appendOperationReport } from './operation-report'
import type { OperationReportJobInput } from './operation-report-job'

const cancellation = new AbortController()
const cancel = (message: unknown): void => {
  if (message === 'cancel') cancellation.abort()
}

async function collect(): Promise<void> {
  parentPort?.on('message', cancel)
  try {
    const input = readJobInput(workerData)
    const appended = input !== undefined
      && await appendOperationReport(input.reportPath, input.directory, input.limits, cancellation.signal, input.journal)
    parentPort?.postMessage(appended)
  } finally {
    parentPort?.off('message', cancel)
    parentPort?.close()
  }
}

void collect()

function readJobInput(value: unknown): OperationReportJobInput | undefined {
  if (!isRecord(value)) return undefined
  const reportPath = value.reportPath
  const directory = value.directory
  const limits = value.limits
  const journal = value.journal
  if (typeof reportPath !== 'string' || typeof directory !== 'string' || !isLimits(limits) || !isJournal(journal)) return undefined
  return { reportPath, directory, limits, journal }
}

function isLimits(value: unknown): value is OperationReportJobInput['limits'] {
  if (!isRecord(value)) return false
  return positive(value.bytes) && positive(value.recordBytes) && positive(value.records) && positive(value.outputBytes)
}

function isJournal(value: unknown): value is OperationReportJobInput['journal'] {
  if (value === null) return true
  if (!isRecord(value)) return false
  return nonnegative(value.dropped) && nonnegative(value.failed) && nonnegative(value.repairedSegments)
    && nonnegative(value.queuedBytes) && typeof value.disabled === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

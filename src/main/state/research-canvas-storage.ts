import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'

const RESEARCH_CANVAS_STORAGE_DIRECTORY = 'research-canvas'
const RESEARCH_CANVAS_STORAGE_PREFIXES = [
  'sherlock.research.canvas.files.v1:',
  'sherlock.research.canvas.artifacts.v1:',
  'sherlock.research.canvas.selection.v1:',
  'sherlock.research.canvas.preview-revocations.v1:'
] as const
const RESEARCH_CANVAS_STORAGE_MAX_KEY_LENGTH = 1_024
const RESEARCH_CANVAS_STORAGE_MAX_FILE_BYTES = 48 * 1024 * 1024

export const RESEARCH_CANVAS_STORAGE_MAX_VALUE_LENGTH = 8 * 1024 * 1024

function validResearchCanvasStorageKey(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length <= RESEARCH_CANVAS_STORAGE_MAX_KEY_LENGTH &&
    RESEARCH_CANVAS_STORAGE_PREFIXES.some(
      (prefix) => value.startsWith(prefix) && value.length > prefix.length
    )
}

function validResearchCanvasStorageValue(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length <= RESEARCH_CANVAS_STORAGE_MAX_VALUE_LENGTH
}

export function researchCanvasStoragePath(userDataPath: string, key: string): string {
  const digest = createHash('sha256').update(key).digest('hex')
  return path.join(userDataPath, RESEARCH_CANVAS_STORAGE_DIRECTORY, `${digest}.json`)
}

export class ResearchCanvasStorage {
  private readonly values = new Map<string, string | null>()

  constructor(private readonly userDataPath: string) {}

  getItem(key: unknown): string | null {
    if (!validResearchCanvasStorageKey(key)) return null
    if (this.values.has(key)) return this.values.get(key) ?? null

    const value = this.read(key)
    this.values.set(key, value)
    return value
  }

  setItem(key: unknown, value: unknown): boolean {
    if (!validResearchCanvasStorageKey(key) || !validResearchCanvasStorageValue(value)) {
      return false
    }
    if (this.getItem(key) === value) return true

    const filePath = researchCanvasStoragePath(this.userDataPath, key)
    const temporaryPath = `${filePath}.${process.pid}.tmp`
    const serialized = `${JSON.stringify({ key, value })}\n`
    if (Buffer.byteLength(serialized, 'utf8') > RESEARCH_CANVAS_STORAGE_MAX_FILE_BYTES) {
      return false
    }

    try {
      mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 })
      writeFileSync(temporaryPath, serialized, { encoding: 'utf8', mode: 0o600 })
      renameSync(temporaryPath, filePath)
      this.values.set(key, value)
      return true
    } catch {
      try {
        rmSync(temporaryPath, { force: true })
      } catch {}
      return false
    }
  }

  private read(key: string): string | null {
    const filePath = researchCanvasStoragePath(this.userDataPath, key)
    try {
      if (statSync(filePath).size > RESEARCH_CANVAS_STORAGE_MAX_FILE_BYTES) return null
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
      const record = parsed as { key?: unknown; value?: unknown }
      if (record.key !== key || !validResearchCanvasStorageValue(record.value)) return null
      return record.value
    } catch {
      return null
    }
  }
}

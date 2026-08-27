import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  RESEARCH_CANVAS_STORAGE_MAX_VALUE_LENGTH,
  ResearchCanvasStorage,
  researchCanvasStoragePath
} from '../src/main/state/research-canvas-storage'

const temporaryDirectories: string[] = []

function temporaryUserData(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'sherlock-research-canvas-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('desktop Research canvas storage', () => {
  it('survives a new reader such as a Harness restart on a different port', () => {
    const userData = temporaryUserData()
    const key = 'sherlock.research.canvas.files.v1:session-1'
    const value = '[{"id":"file-1"}]'

    expect(new ResearchCanvasStorage(userData).getItem(key)).toBeNull()
    expect(new ResearchCanvasStorage(userData).setItem(key, value)).toBe(true)
    expect(new ResearchCanvasStorage(userData).getItem(key)).toBe(value)
  })

  it('keeps only bounded Research-owned keys and values', () => {
    const userData = temporaryUserData()
    const storage = new ResearchCanvasStorage(userData)
    const validKey = 'sherlock.research.canvas.selection.v1:session-2'

    expect(storage.setItem('unrelated:key', '{}')).toBe(false)
    expect(storage.setItem(validKey, 'x'.repeat(RESEARCH_CANVAS_STORAGE_MAX_VALUE_LENGTH + 1)))
      .toBe(false)
    expect(storage.getItem('unrelated:key')).toBeNull()
    expect(storage.getItem(validKey)).toBeNull()
  })

  it('accepts the aggregate artifact capacity without allowing unbounded values', () => {
    const userData = temporaryUserData()
    const storage = new ResearchCanvasStorage(userData)
    const key = 'sherlock.research.canvas.artifacts.v1:capacity'
    const value = 'x'.repeat(RESEARCH_CANVAS_STORAGE_MAX_VALUE_LENGTH)

    expect(storage.setItem(key, value)).toBe(true)
    expect(new ResearchCanvasStorage(userData).getItem(key)).toBe(value)
    expect(storage.setItem(key, `${value}x`)).toBe(false)
  })

  it('ignores malformed persisted state without exposing arbitrary values', () => {
    const userData = temporaryUserData()
    const key = 'sherlock.research.canvas.artifacts.v1:session-3'
    const filePath = researchCanvasStoragePath(userData, key)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify({ key: 'unrelated:key', value: 'private' }))

    const storage = new ResearchCanvasStorage(userData)
    expect(storage.getItem('unrelated:key')).toBeNull()
    expect(storage.getItem(key)).toBeNull()
    expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual({
      key: 'unrelated:key', value: 'private'
    })
  })
})

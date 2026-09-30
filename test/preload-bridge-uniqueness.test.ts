import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('desktop preload bridge', () => {
  it('exposes each main-world API once', () => {
    const source = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
    const names = [...source.matchAll(/contextBridge\.exposeInMainWorld\(\s*['"]([^'"]+)['"]/g)].map(match => match[1])
    expect(names.length).toBeGreaterThan(0)
    expect(names).toEqual([...new Set(names)])
  })
})

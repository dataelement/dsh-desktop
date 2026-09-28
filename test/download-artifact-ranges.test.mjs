import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { downloadInRanges } from '../scripts/download-artifact-ranges.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, {recursive:true,force:true}))) })
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`
async function output() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-artifact-ranges-'))
  roots.push(root)
  return join(root, 'artifact.zip')
}

it('assembles concurrently completed ranges in byte order and verifies the complete digest', async () => {
  const bytes = Buffer.alloc(32 * 1024 * 1024 + 31, 37)
  bytes.fill(93, 32 * 1024 * 1024)
  const outputPath = await output()
  const completed = []
  await downloadInRanges({size:bytes.length, digest:digest(bytes), outputPath,
    downloadRange: async (start, end, path) => {
      if (start === 0) await new Promise(resolve => setTimeout(resolve, 30))
      await writeFile(path, bytes.subarray(start, end + 1))
      completed.push(start)
    }
  })
  expect(completed).toEqual([32 * 1024 * 1024, 0])
  expect((await readFile(outputPath)).equals(bytes)).toBe(true)
  expect(await readdir(roots[0])).toEqual(['artifact.zip'])
})

it.each(['short response', 'wrong digest', 'transport error'])('preserves an existing archive on %s and removes temporary parts', async failure => {
  const outputPath = await output()
  await writeFile(outputPath, 'previous verified archive')
  await expect(downloadInRanges({size:3, digest:digest(Buffer.from('abc')), outputPath,
    downloadRange: async (start, end, path) => {
      if (failure === 'transport error') throw new Error('offline')
      await writeFile(path, failure === 'short response' ? 'a' : 'xyz')
    }
  })).rejects.toThrow()
  expect(await readFile(outputPath, 'utf8')).toBe('previous verified archive')
  expect(await readdir(roots[roots.length - 1])).toEqual(['artifact.zip'])
})

it('rejects metadata without a SHA-256 digest before making any request', async () => {
  let called = false
  await expect(downloadInRanges({size:3, digest:null, outputPath:await output(), downloadRange:async () => {called=true}})).rejects.toThrow('SHA-256')
  expect(called).toBe(false)
})

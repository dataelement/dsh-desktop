import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { FileSystemSkillProvider } from '@deepseek-ai/dsh-skill-filesystem'

const projectRoot = path.resolve(import.meta.dirname, '..')
const bundledSkillRoot = path.join(projectRoot, 'skills')

function createProvider() {
  return new FileSystemSkillProvider(
    {
      get: () => undefined,
      logger: { warn: vi.fn() }
    } as never,
    {
      signal: new AbortController().signal,
      invalidate: vi.fn()
    },
    {
      includeDefaultRoots: false,
      bundledSkillDir: bundledSkillRoot,
      watch: false
    }
  )
}

describe('Sherlock bundled PowerPoint skill', () => {
  it('is discoverable through the real DSH bundled-skill provider', async () => {
    const provider = createProvider()

    try {
      const observation = await provider.list({})
      const candidates = Array.isArray(observation)
        ? observation
        : observation.candidates
      const candidate = candidates.find((entry) => entry.name === 'efund-ppt-maker')

      expect(candidate).toMatchObject({
        name: 'efund-ppt-maker',
        source: 'bundled',
        resourceBase: {
          kind: 'directory',
          path: path.join(bundledSkillRoot, 'efund-ppt-maker')
        }
      })
      expect(candidate?.description).toContain('PowerPoint')

      if (!candidate) return
      const loaded = await provider.get(candidate, {})
      expect(loaded?.content).toContain('assets/efund-template-v6.pptx')
      expect(loaded?.content).toContain('assets/efund-master-skeleton.pptx')
    } finally {
      await provider.dispose()
    }
  })
})

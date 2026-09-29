import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A sandboxed preload cannot load files: Electron's `preloadRequire` resolves
 * `electron` and a few builtins and nothing else. Rollup, however, hoists any
 * module that two preload entries import into a chunk both of them
 * `require('./chunks/…')`, so the script throws at load and the renderer
 * silently loses every bridge it exposes.
 *
 * That happened for real: importing a *value* from `src/shared/desktop-menu.ts`
 * into `src/preload/index.ts` while `windows-menu.ts` already imported one from
 * the same module broke the window bridge **and** the Windows caption menu, with
 * only a console error to show for it. Types cost nothing here — they are erased
 * — so the constraint is that no two preload entries may share a runtime import.
 */
const projectRoot = path.resolve(import.meta.dirname, '..')

async function readSource(...segments: string[]): Promise<string> {
  return readFile(path.join(projectRoot, ...segments), 'utf8')
}

/**
 * Relative specifiers this entry imports as values (`import type` is erased).
 * @param file - preload entry file name.
 * @returns the specifiers, in source order.
 */
async function runtimeImportsOf(file: string): Promise<string[]> {
  const source = await readSource('src', 'preload', file)
  const specifiers: string[] = []
  // Line-anchored so prose in comments cannot look like a statement; `import
  // type …` is skipped, while `import { x, type Y } …` is a runtime import.
  for (const match of source.matchAll(/^import\s+(?!type\b)[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/gmu)) {
    const specifier = match[1]
    if (specifier?.startsWith('.')) specifiers.push(specifier)
  }
  return specifiers
}

describe('preload entries', () => {
  it('never share a runtime module, which a sandboxed preload could not load', async () => {
    const config = await readSource('electron.vite.config.ts')
    const entries = [...config.matchAll(/resolve\('src\/preload\/([^']+)'\)/gu)].map((match) => match[1])
    // The entries have to be read out of the config for the check below to mean
    // anything. Upstream currently declares a single preload entry, so nothing
    // can be shared between entries today; the check starts biting again as soon
    // as a second one is declared.
    expect(entries.length).toBeGreaterThan(0)

    const owners = new Map<string, string[]>()
    for (const entry of entries) {
      if (!entry) continue
      for (const specifier of await runtimeImportsOf(entry)) {
        owners.set(specifier, [...(owners.get(specifier) ?? []), entry])
      }
    }

    const shared = [...owners].filter(([, files]) => files.length > 1)
    expect(shared, `shared preload imports: ${JSON.stringify(shared)}`).toEqual([])
  })
})

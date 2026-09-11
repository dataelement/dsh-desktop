import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

/**
 * Harness builds its combined client bundle on every boot and counts the
 * newlines of every plugin's `lib/client.js` to lay out the source map.
 * Upstream counts with `for (const char of value)`, which walks the string
 * iterator one code point at a time; the desktop patch replaces that and the
 * identity-map builder with native scans. Together they were a third of the
 * Harness boot. The replacements must stay byte-identical to upstream.
 */

// Upstream implementations, verbatim, as the oracle.
function newlineCountUpstream(value: string): number {
  let count = 0
  for (const char of value) if (char === '\n') count += 1
  return count
}
function identityMappingsUpstream(source: string): string {
  return Array.from({ length: newlineCountUpstream(source) }, (_, index) =>
    index === 0 ? 'AAAA' : 'AACA'
  ).join(';')
}

/** Pull the patched functions out of the installed bundle and evaluate them. */
async function loadPatched(): Promise<{
  newlineCount: (value: string) => number
  identitySectionMap: (source: string, url: string) => { mappings: string }
}> {
  const bundle = await readFile(
    path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-modules/lib/index.js'),
    'utf8'
  )
  const take = (name: string): string => {
    const start = bundle.indexOf(`function ${name}(`)
    expect(start, name).toBeGreaterThan(-1)
    return bundle.slice(start, bundle.indexOf('\n}\n', start) + 2)
  }
  return new Function(
    `${take('newlineCount')}\n${take('identitySectionMap')}\nreturn { newlineCount, identitySectionMap }`
  )() as Awaited<ReturnType<typeof loadPatched>>
}

async function realClientBundles(): Promise<string[]> {
  const scope = path.join(projectRoot, 'node_modules/@deepseek-ai')
  const bundles: string[] = []
  for (const name of await readdir(scope)) {
    const file = path.join(scope, name, 'lib/client.js')
    if (existsSync(file)) bundles.push(await readFile(file, 'utf8'))
  }
  return bundles
}

describe('client module combo build', () => {
  it('replaces the per-code-point newline walk with a native scan', async () => {
    const bundle = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-modules/lib/index.js'),
      'utf8'
    )
    expect(bundle).not.toContain('for (const char of value) if (char === "\\n") count += 1;')
    expect(bundle).toContain('value.indexOf("\\n", index + 1)')
    expect(bundle).not.toContain('Array.from({ length: newlineCount(source) }')
  })

  it('produces byte-identical counts and source-map segments to upstream', async () => {
    const { newlineCount, identitySectionMap } = await loadPatched()
    const bundles = [
      ...(await realClientBundles()),
      '', 'x', '\n', 'a\nb', 'a\nb\n', '\n\n\n', '\r\n\r\n', 'emoji 😀\n字\n'
    ]
    expect(bundles.length).toBeGreaterThan(30)

    for (const source of bundles) {
      // buildCombo counts `${source};\n`; identitySectionMap counts the source.
      expect(newlineCount(source)).toBe(newlineCountUpstream(source))
      expect(newlineCount(`${source};\n`)).toBe(newlineCountUpstream(`${source};\n`))
      expect(identitySectionMap(source, 'client.js').mappings).toBe(identityMappingsUpstream(source))
    }
  })

  it('reuses an unchanged record combo across graph flushes and rebuilds on a new rev', async () => {
    const bundle = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-modules/lib/index.js'),
      'utf8'
    )
    // compose() goes through the memo instead of rebuilding every record.
    expect(bundle).toContain(
      'for (const record of this.table.values()) {\n\t\t\tconst artifact = recordCombo(record);'
    )
    expect(bundle).not.toContain(
      'for (const record of this.table.values()) {\n\t\t\tconst artifact = buildCombo([record], record.entry.rev);'
    )

    const start = bundle.indexOf('const recordComboCache')
    const end = bundle.indexOf('\n}\n', bundle.indexOf('function recordCombo(')) + 2
    let builds = 0
    const { recordCombo } = new Function(
      'buildCombo',
      `${bundle.slice(start, end)}\nreturn { recordCombo }`
    )((_records: unknown[], rev: string) => {
      builds += 1
      return { rev, script: `build-${builds}` }
    }) as { recordCombo: (record: { entry: { rev: string } }) => { rev: string; script: string } }

    const record = { entry: { rev: 'r1' } }
    const first = recordCombo(record)
    expect(recordCombo(record)).toBe(first)
    expect(builds).toBe(1)

    // rebuilt() mutates the record in place and assigns a new content rev.
    record.entry = { rev: 'r2' }
    expect(recordCombo(record).rev).toBe('r2')
    expect(builds).toBe(2)

    // A replaced record (new source) is a new object and never shares a slot.
    recordCombo({ entry: { rev: 'r2' } })
    expect(builds).toBe(3)
  })
})

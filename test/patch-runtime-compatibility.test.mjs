import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unresolvedPatchedIdentifiers } from '../scripts/check-patched-js-identifiers.mjs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const patchedJs = [...new Set(readdirSync('patches').filter(name => name.endsWith('.patch')).flatMap(name =>
  [...readFileSync(`patches/${name}`, 'utf8').matchAll(/^\+\+\+ b\/(.*\.js)$/gm)].map(match => match[1])
))]

it('all patched JavaScript has no unresolved local identifiers', () => {
// TypeScript 5.9 semantic inference crashes on Cordis's minified named
  // class static computed assignment. Bind lexical references instead of asking
  // for unrelated type inference; every patched file remains checked.
  const failures = unresolvedPatchedIdentifiers(patchedJs)
  expect(failures).toEqual([])
}, 30000)

it('checks scopes, shorthand and binding defaults with accurate locations without semantic type inference', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-patched-identifiers-'))
  const file = join(root, 'fixture.js')
  try {
    writeFileSync(file, [
      'import { value as x } from "unresolved-package";',
      'const { key: bound, ...rest } = x;',
      'function scoped({ value = absentDefault }) { const present = value; return { present, absentShorthand }; }',
      'if (true) { let blockOnly = 1; }',
      'console.log(blockOnly, missingReference, bound, rest);',
      'const a={ key: x, [absentComputed]: x };',
      'const b={ shadow: ({ shadow }) => shadow };',
      'process.stdout.write(Buffer.from("ok")); global.setImmediate(() => {});',
      'typeof Optional !== "undefined" && Optional.run();',
      'Optional.run();',
      'export { x as renamed };',
      'var C=class Ss{static is(t){return !!t?.[Ss.is]} static{Ss.is[Symbol.toPrimitive]=()=>Symbol.for("cordis.is");Ss.prototype[Ss.is]=true}};',
      'const compact=({a:b})=>({b}); compact({a:x});'
    ].join('\n'))
    expect(unresolvedPatchedIdentifiers([file]).map(({ name, line }) => ({ name, line }))).toEqual([
      { name: 'absentDefault', line: 3 }, { name: 'absentShorthand', line: 3 },
      { name: 'blockOnly', line: 5 }, { name: 'missingReference', line: 5 },
      { name: 'absentComputed', line: 6 }, { name: 'Optional', line: 10 }
    ])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

it('recognizes optional host globals only inside their typeof-defined control-flow branches', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-patched-guards-'))
  const file = join(root, 'fixture.js')
  try {
    writeFileSync(file, [
      'const a = typeof Hook < "u" && Hook.ready ? () => Hook.run() : null;',
      'if (!(typeof Other > "u" || typeof Other.run !== "function")) Other.run();',
      'if (typeof Wrong === "undefined") Wrong.run();',
      'const b = typeof Another > "u" ? null : Another.run();'
    ].join('\n'))
    expect(unresolvedPatchedIdentifiers([file]).map(({ name, line }) => ({ name, line }))).toEqual([{ name: 'Wrong', line: 3 }])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

it('every patched client uses current primitives exports, including non-icon components', () => {
  const source = ts.createSourceFile('primitives.js', readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8'), ts.ScriptTarget.Latest, true)
  const exported = new Set(source.statements.filter(ts.isExportDeclaration).flatMap(statement =>
    statement.exportClause && ts.isNamedExports(statement.exportClause) ? statement.exportClause.elements.map(element => element.name.text) : []))
  expect(exported.size).toBeGreaterThan(0)
  for (const file of patchedJs.filter(file => file.endsWith('/client.js'))) {
    const client = readFileSync(file, 'utf8')
    for (const match of client.matchAll(/_deepseek_ai_dsh_client_ui_primitives\.(\w+)/g)) {
      expect(exported.has(match[1]), `${file}: missing primitives export ${match[1]}`).toBe(true)
    }
  }
})

it('maintained Desktop clients inject only slots declared by the installed Harness clients', () => {
  const clients = readdirSync('node_modules/@deepseek-ai').flatMap(name => {
    try { return [readFileSync(`node_modules/@deepseek-ai/${name}/lib/client.js`, 'utf8')] } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  })
  const declarations = new Set(clients.flatMap(source => [...source.matchAll(/["']([^"']+)["']\s*:\s*\{\s*kind:\s*["'](?:list|single|keyed|chain)["']/g)].map(match => match[1])))
  for (const file of ['packages/dsh-desktop-client-ui/client.js', 'packages/dsh-image-generation/client.js', 'packages/dsh-desktop-market-installer/client.js', 'packages/ppt-runtime/adapter/lib/client.js']) {
    for (const match of readFileSync(file, 'utf8').matchAll(/slots\.inject\(["']([^"']+)["']/g)) {
      expect(declarations.has(match[1]), `${file}: undeclared slot ${match[1]}`).toBe(true)
    }
  }
})

it('preserves the native hero options outlet alongside Desktop mode actions', () => {
  const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', 'utf8')
  expect(client.match(/renderSlot\("conversation\.hero\.options", \{\}\)/g)).toHaveLength(1)
  expect(client.match(/renderSlot\("conversation\.hero\.modeActions", zone \?\? \{\}\)/g)).toHaveLength(1)
})

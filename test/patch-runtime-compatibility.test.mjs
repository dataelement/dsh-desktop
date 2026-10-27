import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { unresolvedIdentifiers } from './helpers/unresolved-identifiers.mjs'

const require = createRequire(import.meta.url)
const patchedJs = [...new Set(readdirSync('patches').filter(name => name.endsWith('.patch')).flatMap(name =>
  [...readFileSync(`patches/${name}`, 'utf8').matchAll(/^\+\+\+ b\/(.*\.js)$/gm)].map(match => match[1])
))]

it('all patched JavaScript has no unresolved local identifiers', () => {
  const failures = patchedJs.flatMap(file => unresolvedIdentifiers(readFileSync(file, 'utf8'), file,
    // React's bundled renderer probes these optional host-provided globals.
    // They are not declarations supplied by current lib.dom.d.ts.
    file.includes('/dsh-web-frontend/dist/assets/') ? ['MSApp', '__REACT_DEVTOOLS_GLOBAL_HOOK__'] : []))
  expect(failures).toEqual([])
}, 30000)

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

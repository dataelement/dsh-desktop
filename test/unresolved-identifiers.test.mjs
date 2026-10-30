import { expect, it } from 'vitest'
import { unresolvedIdentifiers } from './helpers/unresolved-identifiers.mjs'

it('detects missing identifiers in expressions, shorthand objects and nested closures', () => {
  const failures = unresolvedIdentifiers('const f = () => ({missing, value: wrong()}); f()', 'fixture.js')
  expect(failures).toHaveLength(2)
  expect(failures.join('\n')).toContain("'missing'")
  expect(failures.join('\n')).toContain("'wrong'")
})

it('respects imports, destructuring, catch bindings, property keys and host globals', () => {
  expect(unresolvedIdentifiers(`import { readFile as read } from 'node:fs';
    const { value: local } = { value: 1 };
    function outer(arg) { try { return () => read(arg, local) } catch (error) { console.log(error) } }
    window.setTimeout(() => outer(globalThis), 1); module.exports = { outer };`, 'fixture.js')).toEqual([])
})

it('does not merge lexical bindings from unrelated bundles or sibling functions', () => {
  expect(unresolvedIdentifiers('function first(){ const hidden = 1 } function second(){ return hidden }', 'fixture.js'))
    .toEqual(["fixture.js:1: Cannot find name 'hidden'"])
  expect(unresolvedIdentifiers('const local = 1', 'a.js')).toEqual([])
  expect(unresolvedIdentifiers('local()', 'b.js')).toHaveLength(1)
})

it('still rejects invalid JavaScript instead of ignoring parser errors', () => {
  expect(() => unresolvedIdentifiers('const = ;', 'broken.js')).toThrow()
})

it('detects writes to undeclared variables while allowing explicit optional runtime globals', () => {
  expect(unresolvedIdentifiers('missing = 1; missing++', 'fixture.js')).toHaveLength(2)
  expect(unresolvedIdentifiers('typeof externalHook', 'fixture.js', ['externalHook'])).toEqual([])
  expect(unresolvedIdentifiers('externalTypo()', 'fixture.js', ['externalHook'])).toHaveLength(1)
})

it('accepts export aliases and re-exports without treating public names as local variables', () => {
  expect(unresolvedIdentifiers("const local = 1; export {local as default}; export {remote} from 'dependency'", 'fixture.js')).toEqual([])
})

#!/usr/bin/env node
/**
 * Post-build normalization of client/client.js, which is a COMMITTED and
 * PUBLISHED artifact — so it must be byte-identical no matter whose machine
 * built it:
 *
 * 1. Rolldown pretty-prints the tsdown banner into a three-line header, but
 *    the published contract (enforced by preflight.mjs, and relied on by
 *    hosts that sniff the loader id from the file head) requires the file to
 *    START with the exact one-line `window.__ModuleLoader__.load({ id: "…"`
 *    prefix. Collapse the header onto one line, leaving blank lines in place
 *    of the folded ones so the sourcemap's line numbers stay valid.
 * 2. tsdown names the CSS module's virtual chunk by ABSOLUTE path, so the
 *    builder's checkout path (`/Users/…`, `D:\Github\…`) ends up committed
 *    in a region comment and shipped to npm. Besides leaking the path, it
 *    makes every contributor's artifact diff churn. Rewrite it to a stable
 *    repo-relative form.
 * 3. The CSS module's class map is emitted in an UNSTABLE key order — two
 *    consecutive builds of identical source differ by ~265 lines. `prepare`
 *    runs the build on a plain `npm install`, so every contributor's working
 *    tree acquires that diff without touching anything, and three open PRs
 *    carry it. Sort the map by key; object key order has no effect on
 *    behaviour, and sorting preserves the line COUNT so the sourcemap's line
 *    numbers stay valid, exactly as the banner fold above relies on.
 */
import fs from 'node:fs'
import path from 'node:path'
import { sortClassMaps } from './sort-class-maps.mjs'

const file = 'client/client.js'
const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {`

let code = fs.readFileSync(file, 'utf8')

// --- 1. one-line loader banner -------------------------------------------
if (!code.startsWith(required)) {
  const lines = code.split('\n')
  const head = [
    'window.__ModuleLoader__.load({',
    `\tid: ${JSON.stringify(name)},`,
    '\tfactory: (require) => {',
  ]
  if (lines[0] !== head[0] || lines[1] !== head[1] || lines[2] !== head[2]) {
    console.error(`normalize-client-banner: unexpected ${file} header:\n` + lines.slice(0, 3).join('\n'))
    process.exit(1)
  }
  lines[0] = required
  lines[1] = ''
  lines[2] = ''
  code = lines.join('\n')
}

// --- 2. machine-independent CSS virtual ids -------------------------------
// `\0dsh-css:<abs>/src/client/Market.module.css.mjs` → `\0dsh-css:src/client/…`
const root = process.cwd().replaceAll('\\', '/')
const before = code
code = code.replace(/(dsh-css:)([^\n"]*?)(src[/\\][^\n"]*?\.css\.mjs)/g, (_all, prefix, _dir, rel) =>
  prefix + rel.replaceAll('\\', '/'))
// Guard: this builder's own checkout path must not survive anywhere, and no
// virtual id may stay absolute. Deliberately narrow — the bundle legitimately
// contains strings like `s:\` inside regexes, so a generic drive-letter scan
// would false-positive.
const leaks = [
  ...code.matchAll(new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
  ...code.matchAll(/dsh-css:(?:\/|[A-Za-z]:[/\\])[^\n"]*/g),
].map(match => match[0].slice(0, 60))
if (leaks.length > 0) {
  console.error(`normalize-client-banner: absolute build path left in ${file}: ${leaks.slice(0, 3).join(', ')}`)
  process.exit(1)
}

// --- 3. deterministic CSS class-map order ---------------------------------
const { code: ordered, sorted } = sortClassMaps(code)
code = ordered

fs.writeFileSync(file, code)
console.log(`normalize-client-banner ok: ${file}${before === code ? '' : ' (paths normalized)'}${sorted > 0 ? ` (${sorted} class-map keys sorted)` : ''}`)

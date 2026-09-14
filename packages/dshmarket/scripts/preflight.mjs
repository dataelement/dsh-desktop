#!/usr/bin/env node
/**
 * Pre-pack guard: every place that must carry the npm package name actually
 * does. Both 1.0.0 (bundle patch name) and 1.0.1 (client loader id) shipped
 * broken after the dsh-market → dshmarket rename because these are plain
 * strings no compiler checks.
 */
import fs from 'node:fs'

const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name

const failures = []

const patch = fs.readFileSync('cordis.patch.yml', 'utf8')
if (!patch.includes(`name: '${name}'`)) {
  failures.push(`cordis.patch.yml must insert by package name '${name}'`)
}

const client = fs.readFileSync('client/client.js', 'utf8')
if (!client.startsWith(`window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}`)) {
  failures.push(`client/client.js must register __ModuleLoader__ id ${JSON.stringify(name)}`)
}

/**
 * A lockfile resolving to a mirror publishes fine and then fails in the
 * consumer's install with EALLOWREMOTE, because a full tarball URL is not a
 * registry name they can re-resolve. It reached us twice — 1.12.0 shipped
 * with 61 npmmirror URLs and had its tag deleted and re-cut, then a single
 * one came back the next time a lock was refreshed behind a mirror. Nothing
 * about running `npm install` in China makes this visible locally, so the
 * guard belongs where the package is built rather than in anyone's habits.
 */
const lock = fs.readFileSync('package-lock.json', 'utf8')
const foreign = [...new Set(
  [...lock.matchAll(/"resolved": "(https?:\/\/[^/"]+)/g)]
    .map(match => match[1])
    .filter(host => host !== 'https://registry.npmjs.org'),
)]
if (foreign.length > 0) {
  failures.push(`package-lock.json resolves to ${foreign.join(', ')} — rewrite to https://registry.npmjs.org or consumers hit EALLOWREMOTE`)
}

if (failures.length > 0) {
  console.error('preflight failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}
console.log(`preflight ok: ${name}`)

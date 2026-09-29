import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Print a version for a locally built package: the release version plus a build
// stamp, so `apt install ./dist/…deb` upgrades an earlier local build instead of
// answering "already the newest version" — which is what it must answer when two
// different builds both say 0.1.1.
//
// Only `package:linux:local` uses this. The release workflow sets the version
// from its tag and calls `package:linux`, so released packages keep the plain
// tag version.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const stamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  pad(now.getHours()),
  pad(now.getMinutes())
].join('')

console.log(`${version}+local.${stamp}`)

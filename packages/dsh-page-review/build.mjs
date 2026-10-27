import { build } from 'esbuild'
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('./', import.meta.url)
await mkdir(new URL('lib/', root), { recursive: true })
// The Desktop generation checker resolves every runtime dependency root. Some
// Puppeteer transitives intentionally have only subpath exports or use a Node
// builtin name. Bundle that private graph so installation has no phantom peers.
// CJS also gives Puppeteer's optional Node requires their real runtime loader.
const host = await build({
  entryPoints: [fileURLToPath(new URL('src/host.mjs', root))],
  bundle: true,
  write: false,
  metafile: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  define: { 'import.meta.url': '__bundle_url__' },
  banner: {
    js: "const __bundle_url__ = require('node:url').pathToFileURL(__filename).href;",
  },
  legalComments: 'inline',
})
await writeFile(new URL('lib/index.cjs', root), host.outputFiles[0].text)
await rm(new URL('lib/index.js', root), { force: true })
// Preserve the license and notice of every package contributing bundled code.
const owners = new Set()
const inputDirectories = new Set(
  Object.keys(host.metafile.inputs)
    .filter((input) => /node_modules[\\/]/.test(input))
    .map((input) => dirname(resolve(input))),
)
for (let directory of inputDirectories) {
  while (directory !== dirname(directory)) {
    try {
      const manifest = JSON.parse(
        await readFile(join(directory, 'package.json'), 'utf8'),
      )
      // ESM/CJS subdirectories can contain a type-only package.json. Their
      // license belongs to the named package above that module boundary.
      if (manifest.name && manifest.version) {
        owners.add(directory)
        break
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    directory = dirname(directory)
  }
}
const notices = []
for (const owner of [...owners].sort()) {
  const pkg = JSON.parse(await readFile(join(owner, 'package.json'), 'utf8'))
  notices.push(
    `\n===== ${pkg.name}@${pkg.version} (${pkg.license || 'see notice'}) =====\n`,
  )
  for (const file of (await readdir(owner))
    .filter((name) => /^(licen[cs]e|notice|copying)([._-]|$)/i.test(name))
    .sort()) {
    notices.push(`${file}\n${await readFile(join(owner, file), 'utf8')}\n`)
  }
}
await writeFile(
  new URL('lib/THIRD_PARTY_LICENSES.txt', root),
  notices.join('\n'),
)
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/client.jsx', root))],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  external: ['react', 'react-dom'],
  loader: { '.css': 'text' },
  legalComments: 'inline',
})
await writeFile(
  new URL('lib/client.js', root),
  `window.__ModuleLoader__.load({id:'dsh-page-review',factory:(require)=>{const module={exports:{}};const exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;}});\n`,
)

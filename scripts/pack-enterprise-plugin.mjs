/**
 * Package a prepared production dependency tree; this command performs no network or package installation.
 * Run it with `node scripts/pack-enterprise-plugin.mjs`. There is no shebang: Vitest evaluates this module
 * through Vite's SSR transform, and that transform only recognizes a LF hashbang (`/^#!.*\n/`). A CRLF
 * checkout on Windows leaves `#!` in the middle of the module, which fails to parse.
 */
import { createHash } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function zipEntries(entries) {
  const local = [], central = []
  let offset = 0
  for (const [path, value] of Object.entries(entries)) {
    const data = Buffer.isBuffer(value) ? value : value.data
    const executable = !Buffer.isBuffer(value) && value.executable
    const name = Buffer.from(path), compressed = deflateRawSync(data), crc = crc32(data)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6)
    header.writeUInt16LE(8, 8); header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26)
    local.push(header, name, compressed)
    const directory = Buffer.alloc(46)
    directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(0x0314, 4); directory.writeUInt16LE(20, 6)
    directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(8, 10); directory.writeUInt16LE(33, 14)
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(data.length, 24)
    directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(((0o100000 | (executable ? 0o755 : 0o644)) << 16) >>> 0, 38)
    directory.writeUInt32LE(offset, 42); central.push(directory, name)
    offset += header.length + name.length + compressed.length
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22), count = Object.keys(entries).length
  if (count > 50000) throw new Error('Bundle exceeds the 50,000 file limit.')
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10)
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}

export async function packEnterprisePlugin(config, configDirectory = process.cwd()) {
  const entries = {}, targets = {}
  for (const [target, input] of Object.entries(config.targets)) {
    if (!/^(darwin|linux|win32)-(arm64|x64)$/u.test(target)) throw new Error(`Invalid target: ${target}`)
    const root = await realpath(resolve(configDirectory, input)), inventory = {}, ancestors = new Set()
    async function walk(path, relativePath) {
      const canonical = await realpath(path), nested = relative(root, canonical)
      if (isAbsolute(nested) || nested.startsWith('..')) throw new Error(`Dependency leaves the prepared tree: ${relativePath}`)
      const metadata = await stat(canonical)
      if (metadata.isDirectory()) {
        if (ancestors.has(canonical)) throw new Error(`Cyclic dependency link: ${relativePath}`)
        ancestors.add(canonical)
        for (const entry of (await readdir(canonical)).sort()) {
          const child = relativePath ? `${relativePath}/${entry}` : entry
          if (child.endsWith('/node_modules/.bin') || child === 'node_modules/.bin') continue
          if (/(^|\/)node_modules\/(react|react-dom|@deepseek-ai)$/u.test(child)) continue
          await walk(join(canonical, entry), child)
        }
        ancestors.delete(canonical)
      } else if (metadata.isFile()) {
        const data = await readFile(canonical)
        entries[`bundles/${target}/${relativePath}`] = { data, executable: Boolean(metadata.mode & 0o111) }
        inventory[relativePath] = createHash('sha256').update(data).digest('hex')
      } else throw new Error(`Unsupported bundle file: ${relativePath}`)
    }
    await walk(join(root, 'node_modules'), 'node_modules')
    targets[target] = inventory
  }
  const manifest = { schema_version: 1, plugin: config.plugin, targets }
  entries['manifest.json'] = Buffer.from(JSON.stringify(manifest, null, 2))
  return zipEntries(entries)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [configPath, outputPath] = process.argv.slice(2)
  if (!configPath || !outputPath) throw new Error('Usage: node scripts/pack-enterprise-plugin.mjs release.json plugin.zip')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  const bytes = await packEnterprisePlugin(config, dirname(resolve(configPath)))
  if (bytes.length > 256 * 1024 * 1024) throw new Error('Compressed bundle exceeds 256 MiB.')
  await mkdir(dirname(resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, bytes, { flag: 'wx' })
  process.stdout.write(`Created ${outputPath}: ${bytes.length} bytes, sha256=${createHash('sha256').update(bytes).digest('hex')}\n`)
}

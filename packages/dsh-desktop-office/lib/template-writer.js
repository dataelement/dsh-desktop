// Fixed installation-owned worker. The Host confines this process to the session workspace.
import { lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export async function materialize(root, payload) {
  root = await realpath(root)
  if (!/^office-templates\/[a-z0-9-]{1,96}-[a-f0-9-]{36}$/.test(payload.directory)
    || !Array.isArray(payload.files) || !payload.files.length || payload.files.length > 80) throw new Error('Invalid Office template copy')
  const regularDirectory = async directory => {
    try { await mkdir(directory, { mode: 0o700 }) } catch (error) { if (error.code !== 'EEXIST') throw error }
    const info = await lstat(directory)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) throw new Error('Choose a regular workspace directory')
  }
  await regularDirectory(join(root, 'office-templates'))
  const directory = join(root, payload.directory)
  await mkdir(directory, { mode: 0o700 }) // a fresh operation owns this directory
  try {
    const seen = new Set(), result = []
    let total = 0
    for (const file of payload.files) {
      if (typeof file.path !== 'string' || !/^[a-zA-Z0-9._/-]+$/.test(file.path)
        || file.path.split('/').some(part => !part || part === '.' || part === '..') || seen.has(file.path)
        || !/^[a-f0-9]{64}$/.test(file.sha256) || typeof file.data !== 'string') throw new Error('Invalid template resource')
      seen.add(file.path)
      const bytes = Buffer.from(file.data, 'base64')
      total += bytes.length
      if (total > 64 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Invalid template resource identity')
      const target = resolve(directory, file.path)
      let parent = directory
      for (const part of file.path.split('/').slice(0, -1)) { parent = join(parent, part); await regularDirectory(parent) }
      if (dirname(target) !== parent) throw new Error('Invalid template path')
      await writeFile(target, bytes, { flag: 'wx', mode: 0o600 })
      result.push({ workspace_path: `${payload.directory}/${file.path}`, sha256: file.sha256 })
    }
    return { directory: payload.directory, files: result }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const chunks = []; let size = 0
  for await (const chunk of process.stdin) {
    size += chunk.length
    if (size > 90 * 1024 * 1024) throw new Error('Office template payload is too large')
    chunks.push(chunk)
  }
  process.stdout.write(JSON.stringify(await materialize(process.cwd(), JSON.parse(Buffer.concat(chunks).toString('utf8')))))
}

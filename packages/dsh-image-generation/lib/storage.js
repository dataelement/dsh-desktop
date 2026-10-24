import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { open, link, unlink } from 'node:fs/promises'
import path from 'node:path'
import { assetDirectory } from './assets.js'
import { ImageError } from './provider.js'

export async function materialize(root, data, signal) {
  signal?.throwIfAborted()
  const directory = await assetDirectory(root, true)
  const sha256 = createHash('sha256').update(data).digest('hex')
  const filename = `${sha256}.png`
  const target = path.join(directory, filename)
  const temporary = path.join(directory, `.${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try {
    await handle.writeFile(data, { signal }); await handle.sync(); await handle.close()
    await assetDirectory(root)
    signal?.throwIfAborted()
    try { await link(temporary, target) } catch (error) {
      if (error.code !== 'EEXIST') throw error
      const existing = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
      try {
        const info = await existing.stat()
        if (!info.isFile() || info.size !== data.length || createHash('sha256').update(await existing.readFile()).digest('hex') !== sha256) throw new ImageError('ASSET_PATH', 'The image asset path contains different content.')
      } finally { await existing.close() }
    }
  } finally { await handle.close().catch(() => {}); await unlink(temporary).catch(() => {}) }
  return { workspace_path: `.workbuddy/generated-images/${filename}`, sha256 }
}

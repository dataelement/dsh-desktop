import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { EntryTree } from '@deepseek-ai/cordis-plugin-loader'
import { randomUUID } from 'node:crypto'

/** A transient Loader subtree keeps client modules and host lifecycle in the same registry. */
class MarketTree extends EntryTree {
  write() {}
}

export function createMarketRuntime(ctx) {
  let tree
  return async record => {
    tree ??= new MarketTree(ctx)
    const root = join(record.directory, 'node_modules', record.name)
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const entry = resolve(root, pkg.main || 'index.js'), nested = relative(root, entry)
    if (isAbsolute(nested) || nested.startsWith('..')) throw new Error('Plugin entry leaves its package.')
    const id = randomUUID()
    let timer
    try {
      const options = { id, name: pathToFileURL(entry).href, config: record.config ?? {} }
      await tree.root.create(options)
      tree.root.data.push(options)
      const fiber = tree.store[id].fiber
      if (!fiber) throw new Error('Plugin did not create a runtime instance.')
      await Promise.race([fiber.await(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Plugin dependencies or configuration are not ready.')), 15000)
      })])
      if (fiber.state !== 2) throw new Error('Plugin dependencies or configuration are not ready.')
      return { dispose: () => tree.root.remove(id), get state() { return fiber.state } }
    } catch (error) {
      await tree.root.remove(id)
      throw error
    } finally { clearTimeout(timer) }
  }
}

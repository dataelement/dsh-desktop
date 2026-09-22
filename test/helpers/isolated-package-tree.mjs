import { cp, mkdir, readFile, realpath, symlink, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

/** Copy declared dependency/peer closures; every link stays inside the test installation. */
export async function isolatePackage(source, destination) {
  const copied = new Map()
  const resolvePackage = async (from, name) => {
    for (let directory = from; ; directory = dirname(directory)) {
      const candidate = join(directory, 'node_modules', name)
      try { if ((await stat(join(candidate, 'package.json'))).isFile()) return realpath(candidate) }
      catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error }
      if (dirname(directory) === directory) throw new Error(`Missing declared dependency: ${name}`)
    }
  }
  const visit = async input => {
    const canonical = await realpath(input)
    if (copied.has(canonical)) return copied.get(canonical)
    const target = join(destination, 'packages', createHash('sha256').update(canonical).digest('hex').slice(0, 16))
    copied.set(canonical, target)
    await cp(canonical, target, { recursive: true, dereference: true, filter: file => file !== join(canonical, 'node_modules') })
    const manifest = JSON.parse(await readFile(join(canonical, 'package.json'), 'utf8'))
    for (const name of new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])) {
      let dependency
      try { dependency = await resolvePackage(canonical, name) }
      catch (error) { if (manifest.peerDependenciesMeta?.[name]?.optional) continue; throw error }
      const link = join(target, 'node_modules', name)
      await mkdir(dirname(link), { recursive: true })
      await symlink(await visit(dependency), link, process.platform === 'win32' ? 'junction' : 'dir')
    }
    return target
  }
  const entry = await visit(source)
  return { entry, packages: copied.size }
}

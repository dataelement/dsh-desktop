import {
  readFile,
  writeFile,
  mkdir,
  symlink,
  lstat,
  realpath,
  unlink,
  copyFile,
  rename,
} from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const profile = process.env.DSH_REVIEW_PROFILE
if (!profile)
  throw new Error(
    'Set DSH_REVIEW_PROFILE to an explicit development profile before installing.',
  )
const name = 'dsh-page-review',
  manifest = join(profile, 'package.json'),
  link = join(profile, 'node_modules', name)
const pkg = JSON.parse(await readFile(manifest, 'utf8'))
const removing = process.argv.includes('--remove')
let exists = false
try {
  await lstat(link)
  exists = true
  if ((await realpath(link)) !== root)
    throw Error('插件路径已被其他安装占用：' + link)
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}
await mkdir(join(root, 'backups'), { recursive: true })
await copyFile(
  manifest,
  join(root, 'backups', 'profile-' + Date.now() + '.json'),
)
if (removing) {
  if (exists) await unlink(link)
  if (pkg.dependencies?.[name] === 'link:' + root) delete pkg.dependencies[name]
  pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter((x) => x !== name)
} else {
  await readFile(join(root, 'lib/client.js'))
  pkg.dependencies ||= {}
  if (pkg.dependencies[name] && pkg.dependencies[name] !== 'link:' + root)
    throw Error('已有其他版本，请先检查')
  if (!exists) await symlink(root, link, 'dir')
  pkg.dependencies[name] = 'link:' + root
  if (!pkg.dsh.profile.bundles.includes(name))
    pkg.dsh.profile.bundles.push(name)
}
const tmp = manifest + '.review.tmp'
await writeFile(tmp, JSON.stringify(pkg, null, 2) + '\n')
await rename(tmp, manifest)
console.log(
  JSON.stringify({
    installed: !removing,
    profile,
    source: root,
    restartRequired: true,
  }),
)

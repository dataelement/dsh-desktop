// Stage supplied local, relocatable engines for an Apple Silicon development build.
// Runtime sources are explicit operator inputs; no user-specific paths enter product defaults.
import { cp, lstat, mkdir, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: {
  'python-root': { type: 'string' }, 'libreoffice-app': { type: 'string' }, output: { type: 'string' }
} })
for (const name of ['python-root', 'libreoffice-app', 'output']) {
  if (!values[name] || !path.isAbsolute(values[name])) throw new Error(`--${name} requires an absolute path`)
}
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This staging recipe requires darwin/arm64')
const output = values.output
const pending = `${output}.staging-${process.pid}`
if (await lstat(output).catch(() => null)) throw new Error('Select a new output directory')
const pySource = await realpath(values['python-root'])
const loSource = await realpath(values['libreoffice-app'])
const run = (file, args) => execFileSync(file, args[0] === '-I' ? ['-B', ...args] : args, { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8' }, timeout: 30000 }).trim()
const sourceInfo = JSON.parse(run(path.join(pySource, 'bin/python3'), ['-I', '-c', 'import sys,platform,json,openpyxl,et_xmlfile; print(json.dumps({"version":platform.python_version(),"minor":"%d.%d"%sys.version_info[:2],"arch":platform.machine(),"openpyxl":openpyxl.__version__,"et_xmlfile":et_xmlfile.__version__}))']))
if (sourceInfo.arch !== 'arm64' || sourceInfo.openpyxl !== '3.1.5' || sourceInfo.et_xmlfile !== '2.0.0') throw new Error('Expected arm64 Python with openpyxl 3.1.5 and et_xmlfile 2.0.0')
const minor = sourceInfo.minor
const pyDestination = path.join(pending, 'python')
const selectedPackages = new Set(['openpyxl', 'openpyxl-3.1.5.dist-info', 'et_xmlfile', 'et_xmlfile-2.0.0.dist-info'])
const inside = (root, filename) => filename === root || filename.startsWith(root + path.sep)
async function verifyLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      if (!inside(pending, await realpath(filename))) throw new Error(`Runtime link leaves bundle: ${path.relative(pending, filename)}`)
    } else if (entry.isDirectory()) await verifyLinks(filename)
  }
}
await mkdir(pending, { recursive: false })
try {
  await mkdir(path.join(pyDestination, 'bin'), { recursive: true })
  await cp(path.join(pySource, 'bin', `python${minor}`), path.join(pyDestination, 'bin', `python${minor}`))
  await symlink(`python${minor}`, path.join(pyDestination, 'bin/python3'))
  await cp(path.join(pySource, 'lib'), path.join(pyDestination, 'lib'), {
    recursive: true, verbatimSymlinks: true,
    filter(filename) {
      const parts = path.relative(path.join(pySource, 'lib'), filename).split(path.sep)
      if (parts[0] === 'pkgconfig') return false // compiler metadata is outside the execution runtime
      if (parts.includes('__pycache__') || filename.endsWith('.pyc')) return false
      const site = parts.indexOf('site-packages')
      return site < 0 || parts.length === site + 1 || selectedPackages.has(parts[site + 1])
    }
  })
  await cp(loSource, path.join(pending, 'libreoffice/LibreOffice.app'), { recursive: true, verbatimSymlinks: true })
  await verifyLinks(pending)
  const relocated = JSON.parse(run(path.join(pyDestination, 'bin/python3'), ['-I', '-c', 'import sys,json,ssl,sqlite3,zipfile,openpyxl,et_xmlfile; print(json.dumps({"prefix":sys.prefix,"roots":sys.path,"openpyxl":openpyxl.__version__,"et_xmlfile":et_xmlfile.__version__}))']))
  if (!inside(pyDestination, relocated.prefix) || relocated.roots.some(p => !inside(pyDestination, p))) throw new Error('Python must resolve its standard library and packages inside the staged bundle')
  const libreOffice = run(path.join(pending, 'libreoffice/LibreOffice.app/Contents/MacOS/soffice'), ['--version'])
  const hashes = {}
  for (const name of [`python/bin/python${minor}`, 'libreoffice/LibreOffice.app/Contents/MacOS/soffice']) hashes[name] = createHash('sha256').update(await readFile(path.join(pending, name))).digest('hex')
  await writeFile(path.join(pending, 'manifest.json'), JSON.stringify({ version: 1, scope: 'local-development', platform: process.platform, arch: process.arch, python: sourceInfo, libreOffice, hashes, notices: [`python/lib/python${minor}/LICENSE.txt`, `python/lib/python${minor}/site-packages/openpyxl-3.1.5.dist-info`, `python/lib/python${minor}/site-packages/et_xmlfile-2.0.0.dist-info`, 'libreoffice/LibreOffice.app/Contents/Resources/LICENSE', 'libreoffice/LibreOffice.app/Contents/Resources/NOTICE'] }, null, 2) + '\n')
  await rename(pending, output)
  console.log(JSON.stringify({ output, python: sourceInfo, libreOffice }))
} catch (error) {
  await rm(pending, { recursive: true, force: true })
  throw error
}

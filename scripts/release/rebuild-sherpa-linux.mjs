import { copyFile, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

// Rebuild only the N-API wrapper: the published C API/ORT libraries already
// support older Linux. Never modify the installed dependency or system libraries.
export async function rebuildSherpa({ source, nodeInclude, output, compiler = 'g++', packageRoot, sourceArchive }) {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Requires native Linux x64')
  const sourceSha256 = sourceArchive && createHash('sha256').update(await readFile(sourceArchive)).digest('hex')
  if (sourceSha256 !== 'b0374cc56dbc186d442ae73d5de743bb092470b640c4c50ce7b029044c0c4fa8') throw new Error('Provide the verified v1.13.8 source archive as the fifth argument')
  source = await realpath(source)
  nodeInclude = await realpath(nodeInclude)
  const platformRoot = await realpath(packageRoot ?? dirname(require.resolve('sherpa-onnx-linux-x64/package.json')))
  const manifest = JSON.parse(await readFile(join(platformRoot, 'package.json'), 'utf8'))
  if (manifest.version !== '1.13.8') throw new Error('Only sherpa-onnx 1.13.8 is reviewed; use matching v1.13.8 source')
  const cmake = await readFile(join(source, 'scripts/node-addon-api/CMakeLists.txt'), 'utf8')
  const sourceList = /set\(srcs([\s\S]*?)\n\)/.exec(cmake)?.[1]
  const sources = sourceList?.match(/src\/[a-z-]+\.cc/g)
  if (!sources || sources.length !== 18) throw new Error('Unreviewed upstream wrapper source list')
  const inputs = ['scripts/node-addon-api/CMakeLists.txt', 'sherpa-onnx/c-api/c-api.h',
    ...sources.map(file => `scripts/node-addon-api/${file}`),
    ...(await readdir(join(source, 'scripts/node-addon-api/src'))).filter(file => file.endsWith('.h')).map(file => `scripts/node-addon-api/src/${file}`)]
  for (const file of inputs) {
    // Upstream wrapper inputs are symlinks into harmony-os; bind their actual
    // contents too, while refusing a symlink outside the verified source tree.
    const physical = await realpath(join(source, file))
    const archivePath = relative(source, physical)
    if (archivePath.startsWith('..') || isAbsolute(archivePath)) throw new Error(`Source escapes archive: ${file}`)
    const archived = execFileSync('tar', ['-xOf', resolve(sourceArchive), `sherpa-onnx-1.13.8/${archivePath}`])
    if (!archived.equals(await readFile(physical))) throw new Error(`Source differs from verified archive: ${file}`)
  }
  const apiInclude = dirname(require.resolve('node-addon-api/napi.h'))
  // mkdir without recursive intentionally refuses any existing destination.
  output = resolve(output)
  if (output.split(/[\/]/).includes('node_modules')) throw new Error('Output must not be inside node_modules')
  await readFile(join(nodeInclude, 'node_api.h'))
  await readFile(join(source, 'sherpa-onnx/c-api/c-api.h'))
  execFileSync(compiler, ['--version'], { stdio: 'inherit' })
  await mkdir(output)
  for (const file of await readdir(platformRoot)) {
    if (file.endsWith('.so') || file === 'package.json' || /license/i.test(file)) await copyFile(join(platformRoot, file), join(output, file))
  }
  const args = ['-std=c++17', '-O2', '-shared', '-fPIC', '-pthread',
    '-I', source, '-I', nodeInclude, '-I', apiInclude,
    ...sources.map(file => join(source, 'scripts/node-addon-api', file)),
    '-L', output, '-lsherpa-onnx-c-api', '-lonnxruntime', '-Wl,-rpath,$ORIGIN',
    '-o', join(output, 'sherpa-onnx.node')]
  execFileSync(compiler, args, { stdio: 'inherit' })
  // This is a genuine dlopen check in the target runtime, not an ELF string gate.
  execFileSync(process.execPath, ['-e', 'require(process.argv[1])', join(output, 'sherpa-onnx.node')], { stdio: 'inherit' })
  const nodeHeaders = createHash('sha256')
  for (const file of (await readdir(nodeInclude)).filter(file => /\.h$/.test(file)).sort()) {
    nodeHeaders.update(file).update(await readFile(join(nodeInclude, file)))
  }
  await writeFile(join(output, 'rebuild.json'), JSON.stringify({ glibc: process.report.getReport().header.glibcVersionRuntime,
    nodeHeadersSha256: nodeHeaders.digest('hex'), compilerArgs: args, version: manifest.version, node: process.versions.node, sourceSha256,
    addonSha256: createHash('sha256').update(await readFile(join(output, 'sherpa-onnx.node'))).digest('hex'),
    compiler: execFileSync(compiler, ['--version'], { encoding: 'utf8' }).split('\n')[0], sourceFiles: sources }, null, 2) + '\n')
  return output
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, nodeInclude, output, compiler, sourceArchive] = process.argv.slice(2)
  if (!source || !nodeInclude || !output) throw new Error('Usage: node scripts/release/rebuild-sherpa-linux.mjs <v1.13.8-source> <node-headers/include/node> <new-output-directory> <g++> <v1.13.8-source.tar.gz>')
  console.log(await rebuildSherpa({ source, nodeInclude, output, compiler, sourceArchive }))
}

/** Locked, relocatable Python payload. No target interpreter is executed here.
 * Lock provenance and deployment contract: docs/office-runtime.md.
 */
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { x as extractTar } from 'tar'

const project = resolve(import.meta.dirname, '../..')
const lock = JSON.parse(await readFile(new URL('./lock.json', import.meta.url), 'utf8'))

export function officeTarget(platform = process.platform, arch = process.arch) {
  const target = `${platform === 'darwin' ? 'mac' : platform === 'win32' ? 'win' : platform}-${arch}`
  if (!Object.hasOwn(lock.targets, target)) throw new Error(`Office runtime: unsupported native target ${platform}/${arch}`)
  return target
}

/** Map only locked native targets into the installed runtime identity. */
export function officeRuntimeIdentity(target) {
  if (!Object.hasOwn(lock.targets, target)) throw new Error(`Office runtime: unknown target ${target}`)
  return {
    platform: target.startsWith('win-') ? 'win32' : target.startsWith('linux-') ? 'linux' : 'darwin',
    arch: target.endsWith('arm64') ? 'arm64' : 'x64',
  }
}

/** SHA-addressed cache; corrupt and partial downloads never become build input. */
export async function downloadAsset(url, sha256, cache) {
  await mkdir(cache, { recursive: true })
  const destination = join(cache, sha256)
  let bytes
  try {
    bytes = await readFile(destination)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) })
    if (!response.ok) throw new Error(`Office runtime download: HTTP ${response.status} ${url}`)
    bytes = Buffer.from(await response.arrayBuffer())
  }
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) {
    throw new Error(`Office runtime download: checksum mismatch for ${url}`)
  }
  const temporary = `${destination}.${process.pid}.tmp`
  try {
    await writeFile(temporary, bytes)
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
  return destination
}

export async function unpackWheel(archive, destination) {
  const files = unzipSync(await readFile(archive))
  for (const [name, bytes] of Object.entries(files)) {
    const parts = name.split('/')
    if (name.includes('\\') || name.startsWith('/') || parts.some(part => part === '..' || part.includes(':'))) {
      throw new Error(`Office runtime: unsafe wheel entry ${name}`)
    }
    const [directory, scheme] = parts
    if (directory?.endsWith('.data') && scheme !== '' && scheme !== 'scripts') {
      throw new Error(`Office runtime: unsupported wheel scheme ${name}`)
    }
    const file = join(destination, ...parts)
    if (name.endsWith('/')) await mkdir(file, { recursive: true })
    else {
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, bytes)
    }
  }
}

async function stripUnusedPythonPayload(dependencies, pythonLib, sitePackages) {
  // Strip C development headers not needed at runtime.
  await rm(join(dependencies, 'python', 'include'), { recursive: true, force: true })
  // Strip unused GUI, package manager, and demo modules from Python standard library.
  const unusedStdlib = [
    join(pythonLib, 'ensurepip'),
    join(pythonLib, 'idlelib'),
    join(pythonLib, 'tkinter'),
    join(pythonLib, 'turtledemo'),
    join(pythonLib, 'turtle.py')
  ]
  for (const item of unusedStdlib) {
    await rm(item, { recursive: true, force: true })
  }
  // Strip heavy test suites, build/packaging tools, and development modules in site-packages.
  const unusedSitePackages = [
    join(sitePackages, 'pandas', 'tests'),
    join(sitePackages, 'numpy', 'tests'),
    join(sitePackages, 'numpy', 'testing'),
    join(sitePackages, 'numpy', 'f2py'),
    join(sitePackages, 'numpy', '_core', 'tests'),
    join(sitePackages, 'numpy', 'typing', 'tests'),
    join(sitePackages, 'numpy', 'lib', 'tests'),
    join(sitePackages, 'numpy', 'random', 'tests'),
    join(sitePackages, 'numpy', 'ma', 'tests'),
    join(sitePackages, 'numpy', 'polynomial', 'tests'),
    join(sitePackages, 'numpy', 'linalg', 'tests'),
    join(sitePackages, 'numpy', 'matrixlib', 'tests'),
    join(sitePackages, 'numpy', 'fft', 'tests'),
    join(sitePackages, 'numpy', '_pyinstaller', 'tests')
  ]
  for (const directory of unusedSitePackages) {
    await rm(directory, { recursive: true, force: true })
  }
  // Strip unused helper binaries.
  const binDir = join(dependencies, 'python', 'bin')
  for (const name of ['idle3', 'idle3.12', 'pydoc3', 'pydoc3.12']) {
    await rm(join(binDir, name), { force: true })
  }
}

/** Always assemble this build's payload. Keep only verified downloads as cache. */
export async function prepareOfficeRuntime({ target = officeTarget(), output = join(project, '.build/office-runtime'), cache = join(project, '.build/office-downloads') } = {}) {
  const artifact = lock.targets[target]
  if (!artifact) throw new Error(`Office runtime: unknown target ${target}`)
  const { version } = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'))
  await mkdir(dirname(output), { recursive: true })
  // Do not leave last build's payload available after a failed preparation.
  await rm(output, { recursive: true, force: true })
  const staging = await mkdtemp(join(dirname(output), '.office-runtime-'))
  try {
    const runtime = join(staging, 'primary-runtime')
    const dependencies = join(runtime, 'dependencies')
    await mkdir(dependencies, { recursive: true })
    const filename = `cpython-${lock.pythonVersion}+${lock.pythonRelease}-${artifact.pythonTarget}-install_only_stripped.tar.gz`
    const url = `https://github.com/astral-sh/python-build-standalone/releases/download/${lock.pythonRelease}/${encodeURIComponent(filename)}`
    await extractTar({ file: await downloadAsset(url, artifact.pythonSha256, cache), cwd: dependencies })
    const windows = target === 'win-x64'
    const pythonLib = join(dependencies, 'python', ...(windows ? ['Lib'] : ['lib', `python${lock.pythonVersion.split('.').slice(0, 2).join('.')}`]))
    const sitePackages = join(pythonLib, 'site-packages')
    for (const wheel of [...artifact.wheels, ...lock.wheels]) {
      await unpackWheel(await downloadAsset(wheel.url, wheel.sha256, cache), sitePackages)
    }
    await stripUnusedPythonPayload(dependencies, pythonLib, sitePackages)
    const manifest = {
      desktopVersion: version,
      ...officeRuntimeIdentity(target),
      payloadDigest: createHash('sha256').update(JSON.stringify({ format: 1, target, artifact, python: lock.pythonVersion, release: lock.pythonRelease, wheels: lock.wheels, packages: lock.pythonPackages })).digest('hex'),
      python: lock.pythonVersion,
      pythonPackages: lock.pythonPackages
    }
    await writeFile(join(runtime, 'runtime.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    // Official Office skills stay in @deepseek-ai/dsh-skill-office. Word template
    // routing is injected by the composer, and PPT routing lives in PPT mode.
    await cp(join(project, 'packages/dsh-desktop-office/business-skills'), join(staging, 'business-skills'), { recursive: true })
    await rename(staging, output)
    console.log(`Office runtime prepared: ${manifest.platform}/${manifest.arch}, Python ${manifest.python}`)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareOfficeRuntime()

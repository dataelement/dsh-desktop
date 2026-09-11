import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { boundedRead } from './workspace.js'

const PYTHON_VERSION = '3.1.5'
export const MAX_LOG_BYTES = 128 * 1024

async function executable(candidates, preserveLink = false) {
  for (const candidate of candidates.filter(Boolean)) {
    const choices = path.isAbsolute(candidate) ? [candidate] : (process.env.PATH ?? '').split(path.delimiter).filter(path.isAbsolute).map(p => path.join(p, candidate))
    for (const choice of choices) {
      try { await access(choice, constants.X_OK); return preserveLink ? path.join(await realpath(path.dirname(choice)), path.basename(choice)) : await realpath(choice) } catch { /* next installed candidate */ }
    }
  }
  return null
}

// Exact argv, a minimal environment, bounded logs and process-group cancellation.
// Used directly only for the fixed interpreter probe; author code always uses runIsolated.
export function runProcess(argv, { cwd, env = {}, signal, timeoutMs = 120000 } = {}) {
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '', bytes = 0, failure
    const child = spawn(argv[0], argv.slice(1), {
      cwd, env: { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8', ...env },
      stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
    })
    const kill = () => {
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL') } catch { /* settled */ }
    }
    const abort = () => { failure = new Error('Office operation cancelled'); kill() }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    const timer = setTimeout(() => { failure = new Error('Office runtime exceeded its time limit'); kill() }, timeoutMs)
    const collect = (channel, chunk) => {
      bytes += chunk.length
      if (bytes > MAX_LOG_BYTES) { failure = new Error('Office runtime exceeded its output limit'); kill(); return }
      if (channel === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString()
    }
    child.stdout.on('data', chunk => collect('stdout', chunk))
    child.stderr.on('data', chunk => collect('stderr', chunk))
    child.once('error', error => { failure = error })
    child.once('close', (code, terminationSignal) => {
      kill() // descendants may outlive their authoring process
      clearTimeout(timer); signal?.removeEventListener('abort', abort)
      if (failure) reject(failure); else resolve({ code, terminationSignal, stdout, stderr })
    })
  })
}

const quote = value => JSON.stringify(value)
export function confinementArgv(argv, job, readRoots, { platform = process.platform, bwrap } = {}) {
  const roots = [...new Set([...readRoots, job])]
  if (platform === 'darwin') {
    const system = ['/System', '/usr', '/bin', '/sbin', '/Library/Apple', '/private/var/db/dyld', '/dev', '/private/etc', '/Library/Fonts']
    const profile = `(version 1) (deny default)
      (allow process*) (allow sysctl-read) (allow mach-lookup) (allow ipc-posix*)
      (allow file-read-metadata)
      (allow file-read* file-map-executable (literal "/") ${[...system, ...roots].map(p => `(subpath ${quote(p)})`).join(' ')})
      (allow file-write* (subpath ${quote(job)}) (literal "/dev/null"))
      (deny network*)`
    return ['/usr/bin/sandbox-exec', '-p', profile, ...argv]
  }
  if (platform === 'linux' && bwrap) {
    const binds = roots.flatMap(p => ['--ro-bind', p, p])
    return [bwrap, '--die-with-parent', '--new-session', '--unshare-all',
      '--ro-bind', '/usr', '/usr', '--ro-bind-try', '/bin', '/bin', '--ro-bind-try', '/lib', '/lib', '--ro-bind-try', '/lib64', '/lib64',
      '--ro-bind-try', '/etc/fonts', '/etc/fonts', '--ro-bind-try', '/etc/ld.so.cache', '/etc/ld.so.cache',
      ...binds, '--bind', job, job, '--proc', '/proc', '--dev', '/dev', '--chdir', job, '--', ...argv]
  }
  throw new Error('OFFICE_SANDBOX_UNAVAILABLE: this host requires macOS Seatbelt or Linux bubblewrap with network isolation')
}

export async function runIsolated(argv, { job, readRoots = [], signal, timeoutMs, env = {}, bwrap } = {}) {
  const wrapped = confinementArgv(argv, job, readRoots, { bwrap })
  const result = await runProcess(wrapped, {
    cwd: job, signal, timeoutMs,
    env: { HOME: job, TMPDIR: job, TMP: job, TEMP: job, XDG_CACHE_HOME: path.join(job, 'cache'), ...env }
  })
  if (result.code !== 0) throw new Error(`Office runtime failed (${result.terminationSignal ?? result.code}): ${result.stderr || result.stdout}`)
  return { ...result, confinement: { filesystem: 'isolated-job', network: 'denied', backend: process.platform === 'darwin' ? 'seatbelt-development' : 'bubblewrap' } }
}

export async function withJob(fn) {
  const job = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-office-')))
  try { await mkdir(path.join(job, 'inputs')); return await fn(job) } finally { await rm(job, { recursive: true, force: true }) }
}

function moduleRoot(filename) {
  const marker = `${path.sep}node_modules${path.sep}`
  const index = filename.indexOf(marker)
  if (index < 0) return path.dirname(filename)
  return filename.slice(0, index + marker.length - 1)
}

// Both the Electron utility process and bundled Node live inside this app.
// Resolve from the running app so moving a local development build keeps its engines usable.
export function bundledRuntimeRoot(executablePath = process.execPath) {
  const marker = '.app/Contents/'
  const index = executablePath.indexOf(marker)
  return index < 0 ? undefined : path.join(executablePath.slice(0, index + marker.length), 'Resources', 'office-runtime')
}

export async function resolveRuntime(config = {}, signal, kind = 'all') {
  const bundledRoot = bundledRuntimeRoot()
  const result = { platform: process.platform, sandbox: process.platform === 'darwin' ? 'seatbelt-development' : 'unavailable' }
  if (process.platform === 'linux') {
    result.bwrap = await executable([config.bwrap, 'bwrap'])
    if (result.bwrap) result.sandbox = 'bubblewrap'
  }
  if (kind === 'all' || kind === 'javascript') {
    result.node = await executable([config.node, process.execPath])
    try {
      result.docx = fileURLToPath(import.meta.resolve('docx'))
      const app = result.node.indexOf('.app/')
      result.nodeReadRoots = [moduleRoot(result.docx), app >= 0 ? result.node.slice(0, app + 4) : path.dirname(result.node)]
    } catch { result.nodeError = 'Install the pinned docx dependency from this package lockfile' }
  }
  if (kind === 'all' || kind === 'python') {
    result.python = await executable([config.python, config.root && path.join(config.root, 'runtime', 'bin', 'python3'), bundledRoot && path.join(bundledRoot, 'python', 'bin', 'python3'), 'python3'], true)
    if (result.python) {
      const probe = await runProcess([result.python, '-B', '-I', '-c', 'import json,sys,openpyxl; print(json.dumps({"version":openpyxl.__version__,"roots":[sys.prefix,sys.base_prefix]+[p for p in sys.path if p]}))'], { signal, timeoutMs: 10000 })
      if (probe.code === 0) {
        try {
          const data = JSON.parse(probe.stdout)
          if (data.version !== PYTHON_VERSION) throw new Error(`Expected openpyxl ${PYTHON_VERSION}, found ${data.version}`)
          result.openpyxl = data.version
          result.pythonReadRoots = [...new Set(data.roots.filter(path.isAbsolute))]
          result.pythonReadRoots = (await Promise.all(result.pythonReadRoots.map(p => realpath(p).catch(() => null)))).filter(Boolean)
          result.pythonReadRoots.push(path.dirname(result.python))
        } catch (error) { result.pythonError = error.message }
      } else result.pythonError = `Python requires openpyxl==${PYTHON_VERSION}; run the documented runtime setup command`
    } else result.pythonError = 'Configure an installed Python interpreter or run the documented runtime setup command'
  }
  if (kind === 'all' || kind === 'libreoffice') {
    result.libreOffice = await executable([config.libreOffice, bundledRoot && path.join(bundledRoot, 'libreoffice', 'LibreOffice.app', 'Contents', 'MacOS', 'soffice'), '/Applications/LibreOffice.app/Contents/MacOS/soffice', 'soffice', 'libreoffice'])
    if (result.libreOffice) {
      const app = result.libreOffice.indexOf('.app/')
      result.loReadRoots = [app >= 0 ? result.libreOffice.slice(0, app + 4) : path.dirname(path.dirname(result.libreOffice))]
    }
  }
  return result
}

export async function authorScript({ language, source, inputs, outputName, job, config, signal }) {
  const runtime = await resolveRuntime(config, signal, language)
  const output = path.join(job, outputName)
  const context = { inputs, output, directory: job }
  let argv, roots, env = {}
  if (language === 'javascript') {
    if (!runtime.docx || !runtime.node) throw new Error(runtime.nodeError ?? 'Office Node runtime is unavailable')
    const script = path.join(job, 'author.mjs')
    await writeFile(script, `import * as docx from ${JSON.stringify(pathToFileURL(runtime.docx).href)};\nconst office = Object.freeze(${JSON.stringify(context)});\n${source}`)
    argv = [runtime.node, '--max-old-space-size=512', script]; roots = runtime.nodeReadRoots
    env = { ELECTRON_RUN_AS_NODE: '1' }
  } else {
    if (!runtime.openpyxl) throw new Error(runtime.pythonError)
    const script = path.join(job, 'author.py')
    await writeFile(script, `import json\noffice = json.loads(${JSON.stringify(JSON.stringify(context))})\n${source}`)
    argv = [runtime.python, '-B', '-I', script]; roots = runtime.pythonReadRoots
  }
  const execution = await runIsolated(argv, { job, readRoots: roots, signal, bwrap: runtime.bwrap, env })
  return { output, execution, engine: language === 'javascript' ? 'docx@9.6.1' : `openpyxl@${runtime.openpyxl}` }
}

export async function convertWithLibreOffice({ bytes, extension, format, config, signal }) {
  const runtime = await resolveRuntime(config, signal, 'libreoffice')
  if (!runtime.libreOffice) throw new Error('OFFICE_ENGINE_UNAVAILABLE: configure LibreOffice for calculation and preview')
  return withJob(async job => {
    const input = path.join(job, `input.${extension}`), outputDir = path.join(job, 'converted'), profile = path.join(job, 'profile')
    await mkdir(outputDir); await mkdir(profile)
    const defaultFonts = process.platform === 'darwin' ? ['/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Library/Fonts', path.join(homedir(), 'Library', 'Fonts')] : ['/usr/share/fonts', '/usr/local/share/fonts']
    const fontRoots = (await Promise.all((config.fontDirectories ?? defaultFonts).map(p => path.isAbsolute(p) ? realpath(p).catch(() => null) : null))).filter(Boolean)
    const fontConfig = path.join(job, 'fonts.conf')
    const escapeXml = value => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    await writeFile(fontConfig, `<?xml version="1.0"?><fontconfig>${fontRoots.map(p => `<dir>${escapeXml(p)}</dir>`).join('')}<cachedir>${escapeXml(path.join(job, 'font-cache'))}</cachedir></fontconfig>`)
    // A failed force-recalculation profile write propagates before engine execution.
    await writeFile(path.join(profile, 'registrymodifications.xcu'), '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item></oor:items>')
    await writeFile(input, bytes)
    const execution = await runIsolated([runtime.libreOffice, `-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--nologo', '--nodefault', '--nolockcheck', '--convert-to', format, '--outdir', outputDir, input], { job, readRoots: [...runtime.loReadRoots, ...fontRoots], bwrap: runtime.bwrap, signal, env: { FONTCONFIG_FILE: fontConfig, FONTCONFIG_PATH: job } })
    const output = await boundedRead(path.join(outputDir, `input.${format.split(':')[0]}`), format === 'pdf' ? 64 * 1024 * 1024 : 16 * 1024 * 1024)
    return { bytes: output, execution }
  })
}

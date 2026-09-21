import { spawn } from 'node:child_process'
import { access, cp, lstat, mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readBytes, resolveRegularFile } from './workspace.js'

const PYTHON_VERSION = '3.1.5'
export const MAX_LOG_BYTES = 128 * 1024

export function runtimeEnvironment(platform = process.platform, systemRoot = process.env.SystemRoot || 'C:\\Windows') {
  return platform === 'win32'
    ? { SystemRoot: systemRoot, WINDIR: systemRoot, PATH: path.win32.join(systemRoot, 'System32'), LANG: 'en_US.UTF-8', NODE_OPTIONS: '--preserve-symlinks --preserve-symlinks-main' }
    : { PATH: '/usr/bin:/bin', LANG: 'en_US.UTF-8' }
}

async function executable(candidates, preserveLink = false) {
  for (const candidate of candidates.filter(Boolean)) {
    const choices = path.isAbsolute(candidate) ? [candidate] : (process.env.PATH ?? '').split(path.delimiter).filter(path.isAbsolute).map(p => path.join(p, candidate))
    for (const choice of choices.flatMap(p => process.platform === 'win32' && !path.extname(p) ? [p + '.exe', p + '.com', p] : [p])) {
      try { await access(choice, constants.X_OK); return preserveLink ? path.join(await realpath(path.dirname(choice)), path.basename(choice)) : await realpath(choice) } catch { /* next installed candidate */ }
    }
  }
  return null
}

// Exact argv, a minimal environment, bounded logs and process-group cancellation.
// Used directly only for the fixed interpreter probe; author code always uses runIsolated.
export function runProcess(argv, { cwd, env = {}, signal, timeoutMs = 120000, cooperativeCancel = false } = {}) {
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '', bytes = 0, failure, forceTimer, stopping = false
    const child = spawn(argv[0], argv.slice(1), {
      cwd, env: { ...runtimeEnvironment(), ...env },
      stdio: [cooperativeCancel ? 'pipe' : 'ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
    })
    const kill = () => {
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL') } catch { /* settled */ }
    }
    const stop = () => {
      if (stopping) return
      stopping = true
      if (cooperativeCancel && !child.stdin.destroyed) {
        child.stdin.end('cancel\n')
        forceTimer ??= setTimeout(kill, 10000)
      } else kill()
    }
    child.stdin?.on('error', () => {}) // Runner exit can close the cancellation pipe first.
    const abort = () => { failure = new Error('Office operation cancelled'); stop() }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    const timer = setTimeout(() => { failure = new Error('Office runtime exceeded its time limit'); stop() }, timeoutMs)
    const collect = (channel, chunk) => {
      bytes += chunk.length
      if (bytes > MAX_LOG_BYTES) { failure = new Error('Office runtime exceeded its output limit'); stop(); return }
      if (channel === 'stdout') stdout += chunk.toString(); else stderr += chunk.toString()
    }
    child.stdout.on('data', chunk => collect('stdout', chunk))
    child.stderr.on('data', chunk => collect('stderr', chunk))
    child.once('error', error => { failure = error })
    child.once('close', (code, terminationSignal) => {
      kill() // descendants may outlive their authoring process
      clearTimeout(timer); clearTimeout(forceTimer); signal?.removeEventListener('abort', abort)
      if (failure) reject(failure); else resolve({ code, terminationSignal, stdout, stderr })
    })
  })
}

const quote = value => JSON.stringify(value)
export function confinementArgv(argv, job, readRoots, { platform = process.platform, bwrap, windowsSandbox, timeoutMs = 120000 } = {}) {
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
  if (platform === 'win32' && windowsSandbox) {
    if (!path.win32.isAbsolute(windowsSandbox) || !path.win32.isAbsolute(job) || readRoots.some(p => !path.win32.isAbsolute(p))) throw new Error('Windows Office confinement requires absolute paths')
    return [windowsSandbox, '--job', job, '--timeout-ms', String(timeoutMs), ...[...new Set(readRoots)].flatMap(p => ['--read', p]), '--', ...argv]
  }
  throw new Error('OFFICE_SANDBOX_UNAVAILABLE: configure the packaged Windows AppContainer runner, macOS Seatbelt, or Linux bubblewrap')
}

export async function readGrantDirectories(readRoots) {
  const directories = new Map()
  for (const root of readRoots) {
    const canonical = await realpath(root)
    const directory = (await stat(canonical)).isDirectory() ? canonical : path.dirname(canonical)
    directories.set(process.platform === 'win32' ? directory.toLowerCase() : directory, directory)
  }
  const roots = [...directories.values()]
  return roots.filter(root => !roots.some(parent => {
    if (parent === root) return false
    const relative = path.relative(parent, root)
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
  }))
}

export async function runIsolated(argv, { job, readRoots = [], signal, timeoutMs = 120000, env = {}, bwrap, windowsSandbox } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw new Error('Office timeout must be between 1 and 600000 ms')
  if (process.platform === 'win32') {
    // Python sys.path includes the stdlib ZIP. Grant its containing runtime
    // directory once, with nested roots removed before ACL propagation.
    readRoots = await readGrantDirectories(readRoots)
  }
  const wrapped = confinementArgv(argv, job, readRoots, { bwrap, windowsSandbox, timeoutMs })
  const result = await runProcess(wrapped, {
    cwd: job, signal, timeoutMs: timeoutMs + (process.platform === 'win32' ? 15000 : 0), cooperativeCancel: process.platform === 'win32',
    env: { HOME: job, USERPROFILE: job, APPDATA: job, LOCALAPPDATA: job, TMPDIR: job, TMP: job, TEMP: job, XDG_CACHE_HOME: path.join(job, 'cache'), ...env }
  })
  if (result.code !== 0) throw new Error(`Office runtime failed (${result.terminationSignal ?? result.code}): ${result.stderr || result.stdout}`)
  return { ...result, confinement: { filesystem: 'isolated-job', network: 'denied', backend: process.platform === 'win32' ? 'windows-appcontainer' : process.platform === 'darwin' ? 'seatbelt-development' : 'bubblewrap' } }
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
export function bundledRuntimeRoot(executablePath = process.execPath, platform = process.platform) {
  if (platform === 'win32') {
    const marker = '\\resources\\app\\';
    const index = executablePath.toLowerCase().indexOf(marker)
    return index >= 0
      ? path.win32.join(executablePath.slice(0, index), 'resources', 'office-runtime')
      : path.win32.join(path.win32.dirname(executablePath), 'resources', 'office-runtime')
  }
  const marker = '.app/Contents/'
  const index = executablePath.indexOf(marker)
  return index < 0 ? undefined : path.posix.join(executablePath.slice(0, index + marker.length), 'Resources', 'office-runtime')
}

export async function resolveRuntime(config = {}, signal, kind = 'all') {
  const bundledRoot = config.runtimeRoot ?? bundledRuntimeRoot()
  if (bundledRoot && !path.isAbsolute(bundledRoot)) throw new Error('Office runtimeRoot must be absolute')
  const windows = process.platform === 'win32'
  const result = { platform: process.platform, sandbox: process.platform === 'darwin' ? 'seatbelt-development' : 'unavailable' }
  if (windows) {
    result.windowsSandbox = await executable([config.windowsSandbox, bundledRoot && path.join(bundledRoot, 'bin', 'office-sandbox.exe')])
    if (result.windowsSandbox) result.sandbox = 'windows-appcontainer'
  }
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
    result.python = await executable([config.python, config.root && path.join(config.root, 'runtime', 'bin', 'python3'), bundledRoot && path.join(bundledRoot, 'python', ...(windows ? ['python.exe'] : ['bin', 'python3'])), ...(windows ? ['python.exe', 'python3.exe'] : ['python3'])], true)
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
    result.libreOffice = await executable([config.libreOffice, bundledRoot && path.join(bundledRoot, 'libreoffice', ...(windows ? ['program', 'soffice.com'] : ['LibreOffice.app', 'Contents', 'MacOS', 'soffice'])), ...(windows ? ['soffice.com', 'soffice.exe'] : ['/Applications/LibreOffice.app/Contents/MacOS/soffice', 'soffice', 'libreoffice'])])
    if (result.libreOffice) {
      if (windows) result.windowsConverter = await executable([path.join(path.dirname(result.libreOffice), 'dsh-office-convert.exe')])
      result.loReadRoots = libreOfficeReadRoots(result.libreOffice, bundledRoot)
    }
  }
  return result
}

export function libreOfficeReadRoots(executablePath, bundledRoot, platform = process.platform) {
  if (platform === 'win32') {
    const expected = bundledRoot && path.win32.join(bundledRoot, 'libreoffice', 'program', 'soffice.com')
    if (!expected || path.win32.normalize(executablePath).toLowerCase() !== expected.toLowerCase())
      throw new Error('Windows Office conversion requires LibreOffice inside the configured runtime bundle')
    // Bootstrap checks the LibreOffice installation directory with FindFirstFile.
    // Its parent must be enumerable, so the boundary is the dedicated engine
    // bundle, which contains only staged runtimes and their license notices.
    return [bundledRoot]
  }
  const app = executablePath.indexOf('.app/')
  return [app >= 0 ? executablePath.slice(0, app + 4) : path.dirname(path.dirname(executablePath))]
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
  const execution = await runIsolated(argv, { job, readRoots: roots, signal, bwrap: runtime.bwrap, windowsSandbox: runtime.windowsSandbox, env })
  return { output, execution, engine: language === 'javascript' ? 'docx@9.6.1' : `openpyxl@${runtime.openpyxl}` }
}

export function libreOfficeConversionArgv(runtime, { profile, input, outputDir, format }, platform = process.platform) {
  if (platform === 'win32') {
    if (!runtime.windowsConverter) throw new Error('OFFICE_ENGINE_UNAVAILABLE: the Windows bundle requires the LibreOfficeKit conversion worker')
    const output = path.win32.join(outputDir, `input.${format}`)
    return [runtime.windowsConverter, path.win32.dirname(runtime.libreOffice), pathToFileURL(profile, { windows: true }).href, pathToFileURL(input, { windows: true }).href, pathToFileURL(output, { windows: true }).href, format]
  }
  return [runtime.libreOffice, `-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--nologo', '--nodefault', '--nolockcheck', '--convert-to', format, '--outdir', outputDir, input]
}

export async function prepareLibreOfficeProfile(profile, runtime, platform = process.platform) {
  const user = path.join(profile, 'user')
  await mkdir(profile, { recursive: true })
  let setup = ''
  if (platform === 'win32') {
    // Match LibreOffice userinstall::create: copy the shipped presets, then mark
    // setup complete. The host prepares this private profile before LPAC starts;
    // the worker can use it without desktop first-run installation or migration.
    const presets = path.join(path.dirname(runtime.libreOffice), '..', 'presets')
    await cp(presets, user, { recursive: true, force: false, errorOnExist: true, filter: async source => {
      if ((await lstat(source)).isSymbolicLink()) throw new Error('Office profile presets must contain regular files and directories')
      return true
    } })
    setup = '<item oor:path="/org.openoffice.Setup/Office"><prop oor:name="ooSetupInstCompleted" oor:op="fuse"><value>true</value></prop></item>'
  } else await mkdir(user)
  // A failed profile write propagates before engine execution. LibreOffice reads
  // user/registrymodifications.xcu relative to its UserInstallation URL.
  await writeFile(path.join(user, 'registrymodifications.xcu'), `<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry">${setup}<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item></oor:items>`)
}

export async function convertWithLibreOffice({ bytes, extension, format, config, signal }) {
  const runtime = await resolveRuntime(config, signal, 'libreoffice')
  if (!runtime.libreOffice) throw new Error('OFFICE_ENGINE_UNAVAILABLE: configure LibreOffice for calculation and preview')
  return withJob(async job => {
    const input = path.join(job, `input.${extension}`), outputDir = path.join(job, 'converted'), profile = path.join(job, 'profile')
    await mkdir(outputDir); await prepareLibreOfficeProfile(profile, runtime)
    const defaultFonts = process.platform === 'darwin' ? ['/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Library/Fonts', path.join(homedir(), 'Library', 'Fonts')] : process.platform === 'win32' ? [path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts')] : ['/usr/share/fonts', '/usr/local/share/fonts']
    const fontRoots = (await Promise.all((config.fontDirectories ?? defaultFonts).map(p => path.isAbsolute(p) ? realpath(p).catch(() => null) : null))).filter(Boolean)
    const grantedFonts = process.platform === 'win32' ? fontRoots.filter(p => path.relative(path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts'), p) !== '') : fontRoots
    const fontConfig = path.join(job, 'fonts.conf')
    const escapeXml = value => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    await writeFile(fontConfig, `<?xml version="1.0"?><fontconfig>${fontRoots.map(p => `<dir>${escapeXml(p)}</dir>`).join('')}<cachedir>${escapeXml(path.join(job, 'font-cache'))}</cachedir></fontconfig>`)
    await writeFile(input, bytes)
    // Windows VCL controls and the Kit calls share their creating thread.
    // unipoll keeps Calc loading on that thread; calculation uses the CPU.
    const execution = await runIsolated(libreOfficeConversionArgv(runtime, { profile, input, outputDir, format }), { job, readRoots: [...runtime.loReadRoots, ...grantedFonts], bwrap: runtime.bwrap, windowsSandbox: runtime.windowsSandbox, signal, env: { FONTCONFIG_FILE: fontConfig, FONTCONFIG_PATH: job, ...(process.platform === 'win32' ? { SAL_DISABLE_OPENCL: '1', SAL_LOK_OPTIONS: 'unipoll' } : {}) } })
    const outputFile = path.join(outputDir, `input.${format.split(':')[0]}`)
    const outputTarget = await resolveRegularFile(config.fs, outputFile, job, signal)
    const output = await readBytes(config.fs, outputTarget, format === 'pdf' ? 64 * 1024 * 1024 : 16 * 1024 * 1024, signal)
    return { bytes: output, execution }
  })
}

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { createRequire } = require('node:module')
const { execFile, spawn } = require('node:child_process')
const { promisify } = require('node:util')
const { pathToFileURL } = require('node:url')
const { runInNewContext } = require('node:vm')

/** Read manifests through the packaged Electron's ASAR filesystem, not the build checkout. */
function verifyDependencyClosure(appRoot) {
  appRoot = fs.realpathSync(appRoot)
  const seen = new Set()
  const pending = [path.join(appRoot, 'package.json')]
  while (pending.length) {
    const manifestPath = pending.pop()
    if (seen.has(manifestPath)) continue
    seen.add(manifestPath)
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const anchor = createRequire(manifestPath)
    const optional = manifest.optionalDependencies ?? {}
    const required = { ...manifest.dependencies }
    for (const [name, version] of Object.entries(manifest.peerDependencies ?? {})) {
      if (name.startsWith('@deepseek-ai/') && !manifest.peerDependenciesMeta?.[name]?.optional) required[name] = version
    }
    for (const name of Object.keys(required)) {
      if (name in optional) continue
      let resolved
      try {
        resolved = anchor.resolve(`${name}/package.json`)
      } catch (error) {
        // Manifest inspection also supports import-only packages with hidden package.json exports.
        for (const directory of anchor.resolve.paths(name) ?? []) {
          const candidate = path.join(directory, name, 'package.json')
          if (fs.existsSync(candidate)) { resolved = fs.realpathSync(candidate); break }
        }
        if (!resolved) throw new Error(`Packaged dependency ${name} is missing; parent manifest: ${manifestPath}`, { cause: error })
      }
      const relative = path.relative(appRoot, resolved)
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Packaged dependency ${name} escaped the installation: ${resolved}`)
      pending.push(resolved)
    }
  }
  return seen.size
}

async function verifyTerminal(appRoot) {
  const require = createRequire(path.join(appRoot, 'package.json'))
  const pty = require('node-pty')
  // Loading the speech addon exercises its platform package and native metadata paths.
  require('sherpa-onnx-node')
  const terminal = pty.spawn(process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : '/bin/sh',
    process.platform === 'win32' ? ['/d', '/c', 'echo dsh-packaged-terminal-ok'] : ['-c', 'printf dsh-packaged-terminal-ok'],
    { cwd: os.tmpdir(), env: process.env, cols: 80, rows: 24 })
  await new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => { terminal.kill(); reject(new Error('Packaged terminal timed out')) }, 10_000)
    terminal.onData(chunk => { output += chunk })
    terminal.onExit(({ exitCode }) => {
      clearTimeout(timer)
      if (exitCode === 0 && output.includes('dsh-packaged-terminal-ok')) resolve()
      else reject(new Error('Packaged terminal failed to execute'))
    })
  })
}

async function verifyHarness(appRoot, resources, executable) {
  const home = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-packaged-harness-')))
  const launchRoot = path.join(home, 'launch-root')
  await fsp.mkdir(launchRoot, { recursive: true })
  const profile = path.join(home, 'harness', 'profiles', 'desktop-safe-mode')
  await fsp.mkdir(profile, { recursive: true })
  await fsp.writeFile(path.join(profile, 'package.json'), JSON.stringify({ name: 'packaged-recovery-probe', private: true,
    dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } }))
  const entry = path.join(appRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  const child = spawn(executable, ['--expose-internals', path.join(resources, 'harness-node-entry.mjs'), entry,
    '--profile', 'desktop-safe-mode', '--no-open', '--host', '127.0.0.1', '--port', '0'], {
    cwd: launchRoot, windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: path.join(home, 'harness'),
      DSH_DESKTOP_HOST_RESOLVED: '1', DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let output = ''
  let failure
  const append = chunk => { output = `${output}${chunk}`.slice(-64_000) }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.once('error', error => { failure = error })
  const closed = new Promise(resolve => child.once('close', resolve))
  try {
    const deadline = Date.now() + 90_000
    let url
    while (Date.now() < deadline && child.exitCode === null && !failure) {
      url = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/u.exec(output)?.[1]
      if (url) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (!url) throw new Error('Packaged Harness did not become ready', { cause: failure })
    const exchange = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
    const cookie = exchange.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    if (!cookie) throw new Error('Packaged Harness token exchange did not create a session')
    const response = await fetch(new URL('/', url), { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000) })
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Packaged Harness authenticated HTML failed')
    const html = await response.text()
    const parser = createRequire(path.join(appRoot, 'package.json')).resolve('parse5')
    const { parse } = await import(pathToFileURL(parser).href)
    const scripts = []
    const visit = node => {
      if (node.tagName === 'script') scripts.push(node)
      for (const child of node.childNodes ?? []) visit(child)
    }
    visit(parse(html))
    const bootstrap = scripts.flatMap(node => node.attrs.filter(attr => attr.name === 'src').map(attr => attr.value))
      .find(src => src.includes('@deepseek-ai/dsh-client-modules/client.js'))
    if (!bootstrap) throw new Error('Packaged Harness bootstrap is missing from HTML')
    const scriptUrl = new URL(bootstrap, url)
    if (scriptUrl.origin !== new URL(url).origin) throw new Error('Packaged Harness bootstrap is not local')
    const script = await fetch(scriptUrl, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10_000) })
    if (!script.ok) throw new Error('Packaged Harness bootstrap request failed')
    const registrations = []
    runInNewContext(await script.text(), { window: { __ModuleLoader__: { load: registration => registrations.push(registration) } } }, { timeout: 10_000 })
    if (!registrations.some(registration => registration.id === '@deepseek-ai/dsh-client-modules')) throw new Error('Packaged Harness bootstrap did not register')
  } catch (error) {
    throw new Error(`${error.message}\n${output.replace(/token=[^\s]+/gu, 'token=[redacted]')}`, { cause: error })
  } finally {
    if (child.exitCode === null) {
      try { child.kill(process.platform === 'win32' ? 'SIGKILL' : 'SIGTERM') } catch {}
    }
    let timer
    await Promise.race([closed, new Promise(resolve => { timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {}; resolve() }, 5_000) })])
    clearTimeout(timer)
    await closed
    await fsp.rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

async function verifyRuntime(appRoot, resources, executable) {
  const count = verifyDependencyClosure(appRoot)
  await verifyTerminal(appRoot)
  await verifyHarness(appRoot, resources, executable)
  console.log(`Packaged Harness, bootstrap, native modules, terminal and ${count} dependency manifests passed`)
}

async function verifyPackagedHarness(context) {
  const product = context.packager.appInfo.productFilename
  const contents = path.join(context.appOutDir, `${product}.app`, 'Contents')
  const resources = context.electronPlatformName === 'darwin' ? path.join(contents, 'Resources') : path.join(context.appOutDir, 'resources')
  const executable = context.electronPlatformName === 'darwin'
    ? path.join(contents, 'Frameworks', `${product} Helper.app`, 'Contents', 'MacOS', `${product} Helper`)
    : path.join(context.appOutDir, `${product}.exe`)
  try {
    const { stdout, stderr } = await promisify(execFile)(executable, [__filename, '--verify-runtime', path.join(resources, 'app.asar'), resources, executable], {
      cwd: context.appOutDir, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      timeout: 120_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true
    })
    process.stdout.write(stdout)
    if (stderr) process.stderr.write(stderr)
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout)
    if (error.stderr) process.stderr.write(error.stderr)
    throw error
  }
}
module.exports = { verifyDependencyClosure, verifyTerminal, verifyHarness, verifyPackagedHarness }
if (require.main === module && process.argv[2] === '--verify-runtime') {
  const [appRoot, resources, ...executableParts] = process.argv.slice(3)
  const executable = executableParts.length ? executableParts.join(' ') : process.execPath
  verifyRuntime(appRoot, resources, executable)
    .then(() => { process.exit(0) })
    .catch(error => { console.error(error); process.exit(1) })
}

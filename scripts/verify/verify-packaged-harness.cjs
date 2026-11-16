const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { packagedLayout } = require('./packaged-layout.cjs')
const os = require('node:os')
const { createRequire } = require('node:module')
const { execFile, spawn } = require('node:child_process')
const { promisify } = require('node:util')
const { pathToFileURL } = require('node:url')
const { runInNewContext } = require('node:vm')
const { createServer } = require('node:http')

/** Catch accidental reliance on a developer machine's npm in the shipped ASAR. */
async function verifyRegistryMetadata(appRoot, executable) {
  const temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-packaged-registry-'))
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ 'dist-tags': { latest: '1.0.0' }, versions: {
      '1.0.0': { name: 'dsh-registry-fixture', version: '1.0.0', dsh: { client: { entry: 'client.js' } } }
    } }))
  })
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    const config = path.join(temporary, 'empty.npmrc')
    await fsp.writeFile(config, '')
    await fsp.writeFile(path.join(temporary, 'package.json'), '{"private":true}')
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/iu.test(key) && !/^path$/iu.test(key)))
    const { stdout } = await promisify(execFile)(executable, [
      path.join(appRoot, 'node_modules/dsh-desktop-market-installer/pnpm-runner.mjs'),
      path.join(appRoot, 'node_modules/pnpm/bin/pnpm.cjs'),
      'view', 'dsh-registry-fixture', 'name', 'version', 'dsh', '--json',
      `--registry=http://127.0.0.1:${server.address().port}/`
    ], { cwd: temporary, env: { ...environment, ELECTRON_RUN_AS_NODE: '1', PATH: temporary,
      npm_config_userconfig: config, npm_config_globalconfig: config }, timeout: 15000, windowsHide: true })
    const result = JSON.parse(stdout)
    if (result.name !== 'dsh-registry-fixture' || result.version !== '1.0.0' || result.dsh?.client?.entry !== 'client.js') {
      throw new Error('Packaged registry metadata query returned an invalid plugin')
    }
    console.log('Packaged registry metadata query passed without npm on PATH')
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await fsp.rm(temporary, { recursive: true, force: true })
  }
}

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

async function prepareHarnessProbeProfile(home) {
  const profile = path.join(home, 'harness', 'profiles', 'desktop-safe-mode')
  await fsp.mkdir(profile, { recursive: true })
  await fsp.writeFile(path.join(profile, 'package.json'), JSON.stringify({ name: 'packaged-recovery-probe', private: true,
    dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } }))
  await fsp.writeFile(path.join(profile, 'cordis.yml'), '[]\n')
  await fsp.writeFile(path.join(profile, 'cordis.patch.yml'), '[]\n')
  // Match the product telemetry opt-out without adding optional Desktop plugins.
  const patchFile = path.join(home, 'harness', 'desktop-product.patch.yml')
  await fsp.writeFile(patchFile, '- id: desktop-product-telemetry\n  disabled: true\n- id: product-analytics\n  disabled: true\n')
  return { profile, patchFile }
}

async function verifyHarness(appRoot, resources, executable) {
  const home = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'dsh-packaged-harness-')))
  const { profile, patchFile } = await prepareHarnessProbeProfile(home)
  const hostEntry = path.join(appRoot, 'out', 'main', 'host.js')
  const child = spawn(executable, ['--expose-internals', hostEntry, appRoot, profile, path.join(resources, 'office-runtime', 'primary-runtime')], {
    cwd: profile, windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: path.join(home, 'harness'),
      DSH_DESKTOP_PROFILE: 'desktop-safe-mode', DSH_DESKTOP_PATCH_FILE: patchFile, DEEPSEEK_BASE_URL: 'https://api.deepseek.com/anthropic' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  })
  let output = ''
  let failure
  let url
  const append = chunk => { output = `${output}${chunk}`.slice(-64_000) }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.on('message', message => {
    if (typeof message === 'object' && message !== null && message.type === 'ready' && typeof message.url === 'string') url = message.url
  })
  child.once('error', error => { failure = error })
  const closed = new Promise(resolve => child.once('close', resolve))
  try {
    const deadline = Date.now() + 90_000
    while (Date.now() < deadline && child.exitCode === null && !failure) {
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
  await verifyRegistryMetadata(appRoot, executable)
  await verifyTerminal(appRoot)
  await verifyHarness(appRoot, resources, executable)
  console.log(`Packaged Harness, bootstrap, native modules, terminal and ${count} dependency manifests passed`)
}

async function verifyPackagedHarness(context) {
  const { resources, executable } = packagedLayout(context)
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
module.exports = { prepareHarnessProbeProfile, verifyDependencyClosure, verifyTerminal, verifyHarness, verifyPackagedHarness }
if (require.main === module && process.argv[2] === '--verify-runtime') {
  const [appRoot, resources, ...executableParts] = process.argv.slice(3)
  const executable = executableParts.length ? executableParts.join(' ') : process.execPath
  verifyRuntime(appRoot, resources, executable)
    .then(() => { process.exit(0) })
    .catch(error => { console.error(error); process.exit(1) })
}

import assert from 'node:assert/strict'
import { spawn, execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, realpath } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const executable = resolve(process.argv[2])
const output = resolve(process.argv[3] || 'artifacts/workbench-install')
const profile = `dsh-workbench-acceptance-${randomUUID()}`
const userData = join(process.platform === 'win32' ? process.env.APPDATA : join(process.env.HOME, 'Library/Application Support'), profile)
const home = join(userData, 'harness')
const results = []
let desktop
let page

await mkdir(output, { recursive: true })
const fixtureRoot = await realpath(output)

async function waitFor(description, action, timeout = 90_000) {
  const deadline = Date.now() + timeout
  let lastError
  while (Date.now() < deadline) {
    try {
      const value = await action()
      if (value) return value
    } catch (error) { lastError = error }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${description}`, { cause: lastError })
}

async function freePort() {
  const server = createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise(resolve => server.close(resolve))
  return port
}

// Drive the packaged renderer through Chromium's own debugging protocol. Files
// enter its actual file input so the native preload must resolve their paths.
async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error('Packaged renderer debugging connection timed out'))
    }, 10_000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    socket.addEventListener('error', error => { clearTimeout(timer); reject(error) }, { once: true })
  })
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    clearTimeout(request.timer)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(new Error('Packaged renderer disconnected'))
    }
    pending.clear()
  })
  return {
    close: () => socket.close(),
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id
        const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timed out for ${method}`)) }, 30_000)
        pending.set(requestId, { resolve, reject, timer })
        socket.send(JSON.stringify({ id: requestId, method, params }))
      })
    }
  }
}

async function evaluate(expression) {
  const reply = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text)
  return reply.result.value
}

async function click(expression) {
  const point = await waitFor('click target', () => evaluate(`(() => {
    const element = ${expression};
    if (!element || element.disabled) return null;
    element.scrollIntoView({block:'center'});
    const bounds = element.getBoundingClientRect();
    return bounds.width && bounds.height ? {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2} : null;
  })()`))
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point })
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point })
}

function textButton(pattern) {
  return `[...document.querySelectorAll('button,[role="button"],[role="menuitem"]')].find(element => ${pattern}.test(element.innerText.trim()) && element.getBoundingClientRect().height)`
}

async function screenshot(name) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
  await writeFile(join(output, `${name}.png`), Buffer.from(data, 'base64'))
}

async function startDesktop() {
  const debugPort = await freePort()
  const env = {
    ...process.env, DSH_DEV_PROFILE: profile,
    DSH_DEV_HARNESS_PORT: String(await freePort()), DSH_DEV_MOBILE_PORT: String(await freePort())
  }
  delete env.ELECTRON_RUN_AS_NODE
  desktop = spawn(executable, [`--remote-debugging-port=${debugPort}`], {
    cwd: fixtureRoot, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']
  })
  let diagnostics = ''
  desktop.stdout.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-16_384) })
  desktop.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-16_384) })
  desktop.on('error', error => { diagnostics += error.message })
  let importSkipped = false
  const target = await waitFor('packaged application renderer', async () => {
    if (desktop.exitCode !== null) throw new Error(`Desktop exited with ${desktop.exitCode}\n${diagnostics}`)
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`, { signal: AbortSignal.timeout(2000) }).then(response => response.json())
    const importPage = targets.find(target => target.type === 'page' && target.url.includes('/web-import.html'))
    if (importPage && !importSkipped) {
      page = await connect(importPage.webSocketDebuggerUrl)
      await click("document.getElementById('skip')")
      page.close()
      page = undefined
      importSkipped = true
    }
    return targets.find(target => target.type === 'page' && target.url.startsWith('dsh-app://app'))
  })
  page = await connect(target.webSocketDebuggerUrl)
  await page.send('Page.enable')
  console.log('Connected to packaged renderer')
  await waitFor('workbench sidebar', () => evaluate(`!!${textButton('/^(工作台|Workbenches)$/')}`), 120_000)
}

async function stopDesktop() {
  page?.close()
  page = undefined
  if (!desktop || desktop.exitCode !== null || desktop.signalCode !== null) return
  if (process.platform === 'win32') await run('taskkill', ['/PID', String(desktop.pid), '/T', '/F'])
  else process.kill(-desktop.pid, 'SIGTERM')
  await waitFor('owned desktop process to exit', () => desktop.exitCode !== null || desktop.signalCode !== null, 15_000)
}

async function verifyHostSession() {
  const workspacePath = join(fixtureRoot, '数据项素-工作区')
  await mkdir(workspacePath, { recursive: true })
  const rpc = (method, request) => evaluate(`(async () => {
    const rpcId = crypto.randomUUID();
    const response = await fetch('/api/' + ${JSON.stringify(method)}, {
      method: 'POST', headers: {'content-type':'application/json'},
      body: JSON.stringify({type:'client-request',rpcId,method:${JSON.stringify(method)},payload:{args:{request:${JSON.stringify(request)}}}})
    });
    if (!response.ok) throw new Error('Harness RPC HTTP ' + response.status);
    const reply = await response.json();
    if (reply.rpcId !== rpcId || !reply.result?.ok) throw new Error(JSON.stringify(reply.result?.error || reply));
    return reply.result.value;
  })()`)
  const workspace = await rpc('workspace/create', { path: workspacePath })
  assert(workspace.workspace?.workspaceId, 'Workspace creation must return a workspace ID')
  const session = await rpc('session/create', { workspaceId: workspace.workspace.workspaceId })
  assert(session.sessionId, 'Session creation must return a session ID')
  await new Promise(resolve => setTimeout(resolve, 20_000))
  // V0.14.0 publishes readiness through the current Host generation's IPC boot
  // bridge. The older stdout URL and "Harness is ready" markers no longer exist.
  const boot = await evaluate('window.dshDesktopBoot.ready()')
  assert(Array.isArray(boot.injections) && boot.streamBaseUrl, 'The current Host must remain ready after workspace/session creation')
  results.push({ stage: 'host-session', workspaceCreated: true, sessionCreated: true, readyAfter20Seconds: true })
  console.log('Packaged Windows Harness smoke test passed.')
}

async function makeFixture(name, title, scripts) {
  const directory = join(fixtureRoot, name)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({
    name, version: '1.0.0', type: 'module',
    exports: { '.': './index.js', './client': './client.js', './package.json': './package.json', './cordis.patch.yml': './cordis.patch.yml' },
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } },
    ...(scripts ? { scripts: { postinstall: `"${executable}" build.cjs` } } : {})
  }))
  await writeFile(join(directory, 'index.js'), `export const name = ${JSON.stringify(name)}\nexport function apply() {}\n`)
  await writeFile(join(directory, 'cordis.patch.yml'), `- insert:\n    - id: ${name}\n      name: ${name}\n`)
  await writeFile(join(directory, 'build.cjs'), "require('node:fs').writeFileSync('build-proof.txt', 'approved-script-ran')\n")
  await writeFile(join(directory, 'client.js'), `window.__ModuleLoader__.load({
    id: ${JSON.stringify(name)},
    factory(require) {
      const React = require('react')
      function Panel() {
        const [count, setCount] = React.useState(() => Number(localStorage.getItem(${JSON.stringify(name)}) || 0))
        return React.createElement('main', {style:{padding:32}},
          React.createElement('h1', null, ${JSON.stringify(title)}),
          React.createElement('button', {'data-install-acceptance':${JSON.stringify(name)}, onClick:() => {
            localStorage.setItem(${JSON.stringify(name)}, String(count + 1)); setCount(count + 1)
          }}, 'Counter ' + count))
      }
      return {inject:['desktopWorkbenches'],apply(ctx) {
        ctx.effect(() => ctx.desktopWorkbenches.register({title:${JSON.stringify(title)},description:'Packaged installation acceptance',customFrame:true}, Panel))
      }}
    }
  })\n`)
  const archive = join(fixtureRoot, `${name}-1.0.0.tgz`)
  await run('tar', ['-czf', archive, '-C', fixtureRoot, name])
  return archive
}

async function openMarket() {
  await click(textButton('/^(工作台|Workbenches)$/'))
  await waitFor('workbench market', () => evaluate("!!document.querySelector('.dshWbMarketHeaderActions')"))
}

async function selectArchive(archive) {
  await click("document.querySelector('.dshWbMarketHeaderActions button[aria-haspopup=menu]')")
  await click(textButton('/^(上传安装包安装|Install from a package)$/'))
  await waitFor('upload dialog', () => evaluate("!!document.querySelector('.dshWbInstallModal input[type=file]')"))
  const { root } = await page.send('DOM.getDocument')
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.dshWbInstallModal input[type=file]' })
  await page.send('DOM.setFileInputFiles', { nodeId, files: [archive] })
  await waitFor('native selected file', () => evaluate(`document.querySelector('.dshWbDropzone')?.innerText.includes(${JSON.stringify(archive.split(/[\\/]/u).at(-1))})`))
}

async function installedCard(title) {
  const outcome = await waitFor(`${title} installed and enabled`, () => evaluate(`(() => {
    const retry = [...document.querySelectorAll('.dshWbInstallModal button')].some(button => /^(重试安装|Retry installation)$/.test(button.innerText.trim()));
    const diagnostic = document.querySelector('.dshWbInstallDiagnostic')?.textContent;
    if (retry && diagnostic) return {error:diagnostic};
    const selected = document.getElementById('dsh-workbench-mine-tab')?.getAttribute('aria-selected') === 'true';
    const card = [...document.querySelectorAll('.dshWbCard')].find(card => card.querySelector('h2')?.innerText === ${JSON.stringify(title)});
    return selected && card?.querySelector('[role=switch]')?.getAttribute('aria-checked') === 'true';
  })()`), 120_000)
  if (outcome.error) throw new Error(`Package installation failed: ${outcome.error}`)
}

try {
  const plainName = 'dsh-workbench-package-acceptance'
  const scriptName = 'dsh-workbench-script-acceptance'
  const plainTitle = 'Package install acceptance'
  const scriptTitle = 'Script approval acceptance'
  const plainArchive = await makeFixture(plainName, plainTitle, false)
  const scriptArchive = await makeFixture(scriptName, scriptTitle, true)
  await startDesktop()
  await verifyHostSession()
  await openMarket()
  await selectArchive(plainArchive)
  console.log('Selected plain package through native file input')
  await screenshot('01-upload-package')
  await click(textButton('/^(确认安装|Confirm installation)$/'))
  await installedCard(plainTitle)
  results.push({ stage: 'plain-upload', installed: true, enabled: true, navigatedToInstalled: true })
  console.log('Plain package installed and enabled')
  await screenshot('02-plain-installed')

  await selectArchive(scriptArchive)
  await click(textButton('/^(确认安装|Confirm installation)$/'))
  await waitFor('script approval required', () => evaluate(`!!${textButton('/^(允许这些安装脚本并重试|Allow these installation scripts and retry)$/')}`))
  console.log('Script package correctly requires approval')
  await screenshot('03-script-blocked')
  const generationRoot = join(home, 'profiles/.generations/live')
  const before = await readdir(generationRoot)
  assert(!before.some(name => name.startsWith(scriptName)), 'Unapproved package must not publish a generation')
  results.push({ stage: 'script-unapproved', published: false, approvalVisible: true })
  await click(textButton('/^(允许这些安装脚本并重试|Allow these installation scripts and retry)$/'))
  await installedCard(scriptTitle)
  const generations = await readdir(generationRoot)
  const generation = generations.find(name => name.startsWith(scriptName))
  assert(generation, 'Approved package must publish a generation')
  assert.equal(await readFile(join(generationRoot, generation, 'node_modules', scriptName, 'build-proof.txt'), 'utf8'), 'approved-script-ran')
  results.push({ stage: 'script-approved', installed: true, enabled: true, scriptExecuted: true })
  await screenshot('04-script-installed')
  await click("document.querySelector('.dshWbModeSwitch')")
  await click(`[...document.querySelectorAll('.dshWbModeOption')].find(button => button.querySelector('.dshWbModeOptionLabel')?.textContent === ${JSON.stringify(scriptTitle)})`)
  const counter = `document.querySelector('[data-install-acceptance="${scriptName}"]')`
  await waitFor('actual workbench panel', () => evaluate(`${counter}?.innerText === 'Counter 0'`))
  await click(counter)
  await waitFor('workbench interaction', () => evaluate(`${counter}?.innerText === 'Counter 1'`))
  await screenshot('05-workbench-interaction')
  // Let the host acknowledge the business state write before closing this test's
  // owned process. A later launch must render the retained business value.
  await waitFor('persisted business value', async () => {
    const storage = await readFile(join(home, 'profiles/desktop/desktop-storage.json'), 'utf8').catch(() => '')
    return storage && JSON.parse(storage)[scriptName] === '1'
  })
  await stopDesktop()
  await startDesktop()
  await waitFor('business panel retained after restart', () => evaluate(`${counter}?.innerText === 'Counter 1'`))
  await click(counter)
  await waitFor('post-restart interaction', () => evaluate(`${counter}?.innerText === 'Counter 2'`))
  await screenshot('06-restart-retained')
  await openMarket()
  await click("document.getElementById('dsh-workbench-mine-tab')")
  await installedCard(plainTitle)
  await installedCard(scriptTitle)
  await screenshot('07-restart-installed-enabled')
  results.push({ stage: 'desktop-restart', plainEnabled: true, scriptEnabled: true, businessValueRetained: true, interaction: 2 })
  console.log('Packaged workbench installation acceptance passed')
} catch (error) {
  results.push({ stage: 'failure', message: error.stack })
  if (page) {
    await evaluate("document.querySelectorAll('.dshWbInstallModal details').forEach(element => { element.open = true })").catch(() => {})
    await screenshot('failure').catch(() => {})
    const text = await evaluate("document.body.innerText + '\\n' + (document.querySelector('.dshWbInstallDiagnostic')?.textContent || '')").catch(() => '')
    console.error(text.slice(-12_000))
  }
  throw error
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ platform: process.platform, arch: process.arch, results }, null, 2))
  await stopDesktop()
}

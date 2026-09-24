/** Exercise the image writer inside a real Electron utility process, as macOS Desktop does. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const appRoot = process.env.IMAGE_SMOKE_APP || root
const req = createRequire(path.join(appRoot, 'package.json'))
const use = name => import(pathToFileURL(req.resolve(name)).href)
if (process.argv.includes('--worker')) {
  assert.equal(process.type, 'utility')
  assert.ok(process.versions.electron)
  const { Context } = await use('@deepseek-ai/cordis')
  const { LocalSandboxProvider } = await use('@deepseek-ai/dsh-sandbox-local')
  const { LocalSubprocessRuntime } = await use('@deepseek-ai/dsh-subprocess-local')
  const { default: sharp } = await use('sharp')
  const { imageTool } = await use('dsh-image-generation')
  const workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-image-electron-work-')))
  const ctx = new Context(); const forks = []; let calls = 0
  const png = await sharp({ create: { width: 256, height: 192, channels: 4, background: '#12345680' } }).png().toBuffer()
  const server = createServer(async (request, response) => {
    let body = ''; for await (const part of request) body += part
    const input = JSON.parse(body)
    assert.ok(input.prompt); calls++
    if (input.model === 'doubao-seedream-5-0-pro-260628' && (['sequential_image_generation', 'sequential_image_generation_options'].some(field => Object.hasOwn(input, field)) || input.stream === true)) {
      response.writeHead(400, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: { code: 'InvalidParameter', param: 'sequential_image_generation', message: 'The parameter is unsupported for this model.' } }))
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }))
  })
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    for (const plugin of [LocalSandboxProvider, LocalSubprocessRuntime]) { const fork = ctx.plugin(plugin, {}); forks.push(fork); await fork }
    const services = { sandbox: ctx.sandbox, subprocess: ctx.subprocess, logger: { info() {} }, sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: workspace }) } }
    for (const [provider, model] of [['openai', 'gpt-image-2.5-flare'], ['bytedance', 'doubao-seedream-5-0-pro-260628']]) {
      const tool = imageTool(services, { active: async () => ({ provider, model, baseUrl: `http://127.0.0.1:${server.address().port}/v1`, key: 'local-smoke-key' }) })
      const value = await tool.execute({ prompt: 'A flower', aspect_ratio: '16:9' }, { agent: { session: { header: { cwd: workspace } } }, signal: new AbortController().signal })
      const data = await readFile(path.join(workspace, value.workspace_path))
      assert.equal(createHash('sha256').update(data).digest('hex'), value.sha256)
      const meta = await sharp(data).metadata(); assert.equal(meta.format, 'png'); assert.equal(meta.hasAlpha, true)
    }
    assert.equal(calls, 2)
    console.log(`PASS: real Electron ${process.versions.electron} utility Host, OpenAI and Seedream 5.0 Pro single-image contract, sandboxed PNG writer (loopback simulation).`)
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve))
    for (const fork of forks.reverse()) await fork.dispose()
    await rm(workspace, { recursive: true, force: true })
  }
} else {
  const temp = await mkdtemp(path.join(tmpdir(), 'dsh-image-electron-'))
  const main = path.join(temp, 'main.cjs')
  await writeFile(main, `const { app, utilityProcess } = require('electron');
app.setPath('userData', ${JSON.stringify(path.join(temp, 'profile'))}); app.disableHardwareAcceleration();
app.whenReady().then(() => {
  const worker = utilityProcess.fork(${JSON.stringify(fileURLToPath(import.meta.url))}, ['--worker'], { stdio: 'pipe', execArgv: [] });
  worker.stdout.on('data', part => process.stdout.write(part)); worker.stderr.on('data', part => process.stderr.write(part));
  const timer = setTimeout(() => { worker.kill(); app.exit(1); }, 60000);
  worker.once('exit', code => { clearTimeout(timer); app.exit(code ?? 1); });
});`)
  try {
    const env = { ...process.env, IMAGE_SMOKE_APP: appRoot }; delete env.ELECTRON_RUN_AS_NODE
    const child = spawn(createRequire(import.meta.url)('electron'), [main], { env, stdio: 'inherit', signal: AbortSignal.timeout(90_000) })
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
    assert.equal(code, 0, 'Electron utility-process image acceptance failed')
  } finally { await rm(temp, { recursive: true, force: true }) }
}

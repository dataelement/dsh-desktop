import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

// #599: the SDK's per-request timeout does not bound connect + paginated discovery.
const serverSource = String.raw`
import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
const [mode, trace, pageDelay = '150', startupBudget = '900'] = process.argv.slice(2);
const record = value => appendFileSync(trace, JSON.stringify({ pid: process.pid, ...value }) + '\n');
record({ event: 'spawn' });
let page = 0;
let lists = 0;
const notify = () => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' }) + '\n');
createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  record({ method: request.method, cursor: request.params?.cursor });
  const reply = result => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
  if (request.method === 'server/discover') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Legacy fixture' } }) + '\n');
  }
  if (request.method === 'initialize' && mode !== 'silent') {
    const initialize = () => reply({ protocolVersion: '2025-11-25', capabilities: { tools: { listChanged: true } }, serverInfo: { name: 'fixture', version: '1' } });
    if (mode === 'slow-connect') setTimeout(initialize, Number(startupBudget) * 0.375);
    else initialize();
  }
  if (request.method === 'tools/call') {
    notify();
    reply({ content: [] });
  }
  if (request.method === 'tools/list') {
    if (mode === 'hang') return;
    const tool = { name: 'ping', inputSchema: { type: 'object' } };
    lists++;
    if (mode.startsWith('runtime-')) {
      if (lists === 1) reply({ tools: [tool] });
      // Runtime refresh must finish even after a whole startup budget passes.
      else setTimeout(() => reply({ tools: [{ ...tool, name: 'runtime' }] }), Number(startupBudget) + 250);
      return;
    }
    if (mode.startsWith('notify-')) {
      if (lists === 1 || (mode === 'notify-drain' && lists === 2)) {
        notify();
        setTimeout(() => reply({ tools: [tool] }), 100);
      } else if (mode === 'notify-register-error') reply({ tools: [{ ...tool, name: 'rejected' }] });
      else if (mode === 'notify-error') reply({ tools: [tool, tool] });
      else if (mode === 'notify-drain') reply({ tools: [{ ...tool, name: 'final' }] });
      return;
    }
    if (mode === 'pages') {
      page++;
      setTimeout(() => reply({ tools: [], nextCursor: String(page) }), Number(pageDelay));
    } else if (mode === 'slow-connect') setTimeout(() => reply({ tools: [tool] }), Number(startupBudget) * 0.75);
    else reply({ tools: [tool] });
  }
});
process.stdin.on('end', () => process.exit(0));
`

interface FixtureOptions {
  mode?: string
  strict?: boolean
  startupTimeoutMs?: number
  pageDelayMs?: number
}

// Include cold Node startup headroom: this fixture exercises real stdio children,
// whose initialization can exceed a subsecond budget under full-suite load.
async function runProfile({ mode = 'hang', strict = false, startupTimeoutMs = 4000, pageDelayMs = 150 }: FixtureOptions = {}) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-mcp-deadline-'))
  try {
    const profile = join(home, 'profiles', 'fixture')
    await mkdir(profile, { recursive: true })
    const server = join(home, 'server.mjs')
    const trace = join(home, 'traffic.jsonl')
    await writeFile(server, serverSource)
    const config = (serverName: string, serverMode: string) => ({
      transport: 'stdio', serverName, command: process.execPath,
      args: [server, serverMode, trace, String(pageDelayMs), String(startupTimeoutMs)], startupTimeoutMs,
      ...(serverName === 'stalled' && strict ? { failOnStartupError: true } : {}),
      reconnect: { enabled: false }
    })
    const mcpUrl = pathToFileURL(resolve('node_modules/@deepseek-ai/dsh-mcp-client/lib/index.js')).href
    await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'mcp-fixture', dsh: { profile: { bundles: [] } } }))
    await writeFile(join(profile, 'cordis.yml'), JSON.stringify([
      { id: 'stalled', name: mcpUrl, config: config('stalled', mode) },
      { id: 'healthy', name: mcpUrl, config: config('healthy', 'healthy') }
    ]))
    const entry = join(home, 'entry.mjs')
    const bootUrl = pathToFileURL(resolve('node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')).href
    await writeFile(entry, `
      import { boot, loadProfile } from ${JSON.stringify(bootUrl)};
      const live = new Set();
      const runtimeReady = Promise.withResolvers();
      let triggerRuntime;
      const profile = loadProfile('fixture', 'fixture', ${JSON.stringify(resolve('node_modules/@deepseek-ai/dsh/package.json'))}, ${JSON.stringify(home)});
      const ctx = await boot('fixture', ${JSON.stringify(join(profile, 'cordis.yml'))}, profile.layers.flatMap(layer => layer.patches), ctx => {
        ctx.logger.exporter({ levels: { default: 3 }, export: record => {
          const message = record.args.map(String).join(' ');
          console.error(message);
          if (${JSON.stringify(mode)} === 'runtime-register-error' && message.includes('tool registration failed')) runtimeReady.resolve();
        } });
        ctx.provide('tools', { register(definition) {
          if (definition.name === 'mcp__stalled__rejected' || (${JSON.stringify(mode)} === 'runtime-register-error' && definition.name === 'mcp__stalled__runtime')) throw new Error('fixture registry rejection');
          if (definition.name === 'mcp__stalled__ping') triggerRuntime = () => definition.execute({}, { signal: new AbortController().signal });
          live.add(definition.name);
          if (definition.name === 'mcp__stalled__runtime') runtimeReady.resolve();
          return () => live.delete(definition.name);
        } });
      });
      console.log('PROFILE_READY:' + JSON.stringify([...live]));
      ${mode.startsWith('runtime-') ? `await triggerRuntime(); await runtimeReady.promise; console.log('RUNTIME_READY:' + JSON.stringify([...live]));` : ''}
      await ctx.fiber.dispose();
      console.log('PROFILE_DISPOSED:' + live.size);
    `)
    const started = Date.now()
    const result = spawnSync(process.execPath, [resolve('build/harness-node-entry.mjs'), entry], {
      encoding: 'utf8', timeout: 12_000,
      env: { ...process.env, DSH_HOME: home }
    })
    expect(result.error, result.stderr).toBeUndefined()
    const traffic: { pid: number, event?: string, method?: string, cursor?: string }[] =
      (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
    // Successful startup and strict failure must both release actual server processes.
    for (const pid of new Set(traffic.map(item => item.pid))) {
      expect(() => process.kill(pid, 0), 'MCP child must exit after loader disposal').toThrow()
    }
    return { ...result, traffic, elapsed: Date.now() - started }
  } finally {
    await rm(home, { recursive: true, force: true })
  }
}

describe('MCP entry startup deadline through the real Profile loader', () => {
  it.each([false, true])('bounds notifications queued during initial discovery (strict=%s)', async strict => {
    const startupTimeoutMs = 4000
    const result = await runProfile({ mode: 'notify-stall', strict, startupTimeoutMs })
    expect(result.status, result.stderr).toBe(strict ? 1 : 0)
    expect(result.traffic.filter(item => item.method === 'tools/list').length).toBeGreaterThanOrEqual(3)
    expect(result.stderr).toContain(`mcp-client(stalled): tools/list startup deadline exceeded after ${startupTimeoutMs}ms`)
    if (strict) expect(result.stdout).not.toContain('PROFILE_READY:')
    else expect(result.stdout).toContain('PROFILE_READY:["mcp__healthy__ping"]')
  }, 15_000)

  it('waits until every startup notification refresh has published its final tool set', async () => {
    // These cases test queue semantics, not startup speed. Leave room for the
    // real child process to initialize even while the full suite is busy.
    const result = await runProfile({ mode: 'notify-drain', strict: true, startupTimeoutMs: 4000 })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('mcp__stalled__final')
    expect(result.stdout).not.toContain('mcp__stalled__ping')
  }, 15_000)

  it('propagates a startup notification refresh error instead of swallowing the queue rejection', async () => {
    const result = await runProfile({ mode: 'notify-error', strict: true, startupTimeoutMs: 4000 })
    expect(result.status, result.stderr).toBe(1)
    expect(result.stdout).not.toContain('PROFILE_READY:')
    expect(result.stderr).toContain('more than once')
  }, 15_000)

  it('preserves strict startup registration failure from a queued notification', async () => {
    const result = await runProfile({ mode: 'notify-register-error', strict: true, startupTimeoutMs: 4000 })
    expect(result.status, result.stderr).toBe(1)
    expect(result.stdout).not.toContain('PROFILE_READY:')
    expect(result.stderr).toContain('fixture registry rejection')
  }, 15_000)

  it('contains runtime registration failure even with strict startup enabled', async () => {
    const result = await runProfile({ mode: 'runtime-register-error', strict: true })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('RUNTIME_READY:["mcp__healthy__ping"]')
    expect(result.stderr).toContain('fixture registry rejection')
    expect(result.stderr).not.toContain('startup deadline exceeded')
  }, 15_000)

  it('keeps post-startup notification refreshes outside the startup budget', async () => {
    const result = await runProfile({ mode: 'runtime-refresh', strict: true })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('mcp__stalled__ping')
    expect(result.stdout).toMatch(/RUNTIME_READY:.*mcp__stalled__runtime/)
    expect(result.stderr).not.toContain('startup deadline exceeded')
  }, 15_000)

  it('exposes a 20s default for both transports and rejects invalid programmatic budgets', () => {
    const source = `
      import assert from 'node:assert/strict';
      import { Config, apply } from './node_modules/@deepseek-ai/dsh-mcp-client/lib/index.js';
      assert.equal(Config({ transport: 'stdio', serverName: 'x', command: 'node' }).startupTimeoutMs, 20000);
      assert.equal(Config({ transport: 'streamable-http', serverName: 'x', url: 'http://localhost' }).startupTimeoutMs, 20000);
      for (const value of [0, -1, NaN, Infinity, 2147483648]) {
        await assert.rejects(apply({}, { serverName: 'x', startupTimeoutMs: value }), /startupTimeoutMs must be a positive finite number/);
        if (!Number.isNaN(value)) assert.throws(() => Config({ transport: 'stdio', serverName: 'x', command: 'node', startupTimeoutMs: value }));
      }
    `
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8', timeout: 5000 })
    expect(result.error).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  })

  it('contains a tools/list stall after successful initialize and boots a healthy entry', async () => {
    const result = await runProfile()
    expect(result.status, result.stderr).toBe(0)
    expect(result.traffic.some(item => item.method === 'notifications/initialized')).toBe(true)
    expect(result.traffic.some(item => item.method === 'tools/list')).toBe(true)
    expect(result.stdout).toContain('PROFILE_READY:["mcp__healthy__ping"]')
    expect(result.stdout).toContain('PROFILE_DISPOSED:0')
    expect(result.stderr).toContain('mcp-client(stalled): tools/list startup deadline exceeded after 4000ms')
    expect(result.elapsed).toBeLessThan(8_000)
  }, 15_000)

  it('preserves server/method/deadline diagnostics when failOnStartupError is true', async () => {
    const result = await runProfile({ strict: true })
    expect(result.status, result.stderr).toBe(1)
    expect(result.stdout).not.toContain('PROFILE_READY:')
    expect(result.stderr).toContain('mcp-client(stalled): tools/list startup deadline exceeded after 4000ms')
    expect(result.stderr).not.toContain('loader timeout waiting')
  }, 15_000)

  it('bounds a silent initialize rather than waiting for the SDK request timeout', async () => {
    const result = await runProfile({ mode: 'silent' })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stderr).toContain('mcp-client(stalled): initialize startup deadline exceeded after 4000ms')
    expect(result.stdout).toContain('PROFILE_READY:["mcp__healthy__ping"]')
  }, 15_000)

  it('uses one budget across all tools/list pages, not a new budget for each page', async () => {
    // Every page answers well inside the budget, but pagination never ends.
    // A per-page reset would hit the outer process timeout instead of returning
    // the expected shared-deadline diagnostic and booting the healthy entry.
    const startupTimeoutMs = 4000
    const result = await runProfile({ mode: 'pages', startupTimeoutMs, pageDelayMs: startupTimeoutMs / 8 })
    expect(result.status, result.stderr).toBe(0)
    expect(result.traffic.filter(item => item.cursor !== undefined).length).toBeGreaterThan(1)
    expect(result.stderr).toContain(`mcp-client(stalled): tools/list startup deadline exceeded after ${startupTimeoutMs}ms`)
    expect(result.stdout).toContain('PROFILE_READY:["mcp__healthy__ping"]')
    expect(result.elapsed).toBeLessThan(8_000)
  }, 15_000)

  it('includes time spent connecting in the initial tools/list budget', async () => {
    // Connecting and listing each fit individually; their combined delay does
    // not. Leave startup headroom while retaining this distinction.
    const startupTimeoutMs = 4000
    const result = await runProfile({ mode: 'slow-connect', startupTimeoutMs })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stderr).toContain(`mcp-client(stalled): tools/list startup deadline exceeded after ${startupTimeoutMs}ms`)
    expect(result.stdout).toContain('PROFILE_READY:["mcp__healthy__ping"]')
  }, 15_000)
})

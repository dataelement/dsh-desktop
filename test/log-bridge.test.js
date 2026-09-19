import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as bridge from '../packages/dsh-desktop-log-bridge/index.js'
import { patchPath } from './patch-path'

const { BRIDGE_READY_LINE, bridgeLines, createLimitedWriter } = bridge

/** Run the bridge in a real Cordis context, collecting what it writes to stderr and stdout. */
async function bridged(before) {
  const capture = (stream) => {
    const written = []
    vi.spyOn(stream, 'write').mockImplementation((text) => {
      written.push(String(text))
      return true
    })
    return () => written.join('').split('\n').filter(Boolean)
  }
  const lines = capture(process.stderr)
  const notices = capture(process.stdout)
  const ctx = new Context()
  before?.(ctx)
  await ctx.plugin(bridge)
  return { ctx, lines, notices }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('desktop log bridge', () => {
  it('writes warnings and errors, which the logger otherwise only keeps in memory', async () => {
    const { ctx, lines } = await bridged()
    ctx.logger('agent-presets').warn('preset "%s" failed to mount: %s', 'mine', 'expected string but got 1')
    ctx.logger('noise').info('routine')
    ctx.logger('session-controller').error(new Error('boom\n    at somewhere'))

    expect(lines().slice(0, 3)).toEqual([
      '[harness-log] warn agent-presets: preset "mine" failed to mount: expected string but got 1',
      '[harness-log] error session-controller: Error: boom',
      '[harness-log]       at somewhere'
    ])
    // The whole stack follows, every line prefixed; nothing at info level.
    expect(lines().every((line) => line.startsWith('[harness-log] '))).toBe(true)
    expect(lines().join('\n')).not.toContain('routine')
  })

  it('recovers errors logged before it loaded, which are still in the ring', async () => {
    const { lines } = await bridged((ctx) => {
      ctx.logger('early').error('before the bridge')
      ctx.logger('early').warn('filtered out of the ring by the default level')
    })
    expect(lines()).toEqual(['[harness-log] error early: before the bridge'])
  })

  it('announces itself on stdout, keeping stderr for warnings and errors', async () => {
    const { lines, notices } = await bridged()
    expect(notices()).toEqual([BRIDGE_READY_LINE])
    expect(lines()).toEqual([])
  })

  it('records session activation failures, which never reach the logger', async () => {
    const { ctx, lines } = await bridged()
    ctx.emit('api-session/error', 'session-1', 'agent-presets: preset "code" not found (available: ptc)')
    expect(lines()).toContain('[harness-log] session-error session-1: agent-presets: preset "code" not found (available: ptc)')
  })

  it('prefixes every line, so the desktop can tell bridged output from launch evidence', () => {
    expect(bridgeLines('error', 'x', 'first\nsecond\n\nthird')).toEqual([
      '[harness-log] error x: first',
      '[harness-log]   second',
      '[harness-log]   third'
    ])
  })

  it('caps a flood and reports how much it dropped', () => {
    let time = 0
    const written = []
    const write = createLimitedWriter((text) => written.push(text), () => time)
    for (let index = 0; index < 105; index += 1) write([`[harness-log] warn loop: ${index}`])
    expect(written).toHaveLength(100)
    time = 60_000
    write(['[harness-log] warn loop: next window'])
    expect(written.slice(-2)).toEqual([
      '[harness-log] warn dsh-desktop-log-bridge: dropped 5 message(s) over the rate limit\n',
      '[harness-log] warn loop: next window\n'
    ])
  })

  it('is composed into both the normal and the Safe Mode profile', async () => {
    for (const file of ['dsh-desktop.patch.yml', 'dsh-desktop-safe.patch.yml']) {
      const patch = await readFile(join(process.cwd(), 'build', file), 'utf8')
      expect(patch).toContain('name: dsh-desktop-log-bridge')
    }
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
    expect(manifest.dependencies['dsh-desktop-log-bridge']).toBe('file:packages/dsh-desktop-log-bridge')
    const dshPatch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    expect(dshPatch).toContain('"dsh-desktop-log-bridge": "0.1.0"')
  })
})

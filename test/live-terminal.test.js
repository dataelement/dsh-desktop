import { describe, expect, it, vi } from 'vitest'

import {
  LIVE_TERMINAL_CALL_ID_ENV,
  LIVE_TERMINAL_PATH,
  installLiveTerminalStreaming,
  renderLiveOutput
} from '../packages/dsh-desktop-market-installer/live-terminal.js'

function collector(value) {
  return {
    readFrom(offset) {
      return { text: value.text.slice(offset), nextOffset: value.text.length }
    }
  }
}

function response() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(body) {
      this.body = body
    }
  }
}

describe('live terminal streaming', () => {
  it('renders stderr after stdout without consuming either collector', () => {
    expect(renderLiveOutput('one', 'two')).toBe('one\n[stderr]\ntwo')
    expect(renderLiveOutput('one\n', 'two')).toBe('one\n[stderr]\ntwo')
  })

  it('correlates a running subprocess by tool call id and exposes incremental output', async () => {
    let settle
    const done = new Promise((resolve) => { settle = resolve })
    const stdout = { text: 'first\n' }
    const stderr = { text: '' }
    const originalSpawn = vi.fn(() => ({
      collected: { stdout: collector(stdout), stderr: collector(stderr) },
      done
    }))
    let route
    let cleanup
    const hostCtx = {
      subprocess: { spawn: originalSpawn },
      webServer: {
        register(definition) {
          route = definition
          return vi.fn()
        }
      },
      effect(factory) {
        cleanup = factory()
      }
    }
    const ctx = {
      inject(dependencies, callback) {
        expect(dependencies).toEqual(['webServer', 'subprocess'])
        callback(hostCtx)
      }
    }

    installLiveTerminalStreaming(ctx)
    const wrappedSpawn = hostCtx.subprocess.spawn
    hostCtx.subprocess.spawn({
      env: { [LIVE_TERMINAL_CALL_ID_ENV]: 'call-7' }
    })

    expect(route.path).toBe(LIVE_TERMINAL_PATH)
    const firstResponse = response()
    route.handler({ method: 'GET', url: `${LIVE_TERMINAL_PATH}?callId=call-7` }, firstResponse)
    expect(JSON.parse(firstResponse.body)).toMatchObject({
      found: true,
      active: true,
      output: 'first\n'
    })

    stdout.text += 'second\n'
    stderr.text += 'warning\n'
    const secondResponse = response()
    route.handler({ method: 'GET', url: `${LIVE_TERMINAL_PATH}?callId=call-7` }, secondResponse)
    expect(JSON.parse(secondResponse.body).output).toBe('first\nsecond\n[stderr]\nwarning\n')

    settle({ exitCode: 0, signal: null })
    await done
    await Promise.resolve()
    cleanup()
    expect(hostCtx.subprocess.spawn).not.toBe(wrappedSpawn)
  })
})

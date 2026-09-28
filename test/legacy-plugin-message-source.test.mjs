import { describe, expect, it } from 'vitest'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import { releasedV4SessionFormatCodec } from '@deepseek-ai/dsh-session-format-v3-to-v4'

function message(source, text = 'legacy context') {
  return createUserMessage({ content: [{ type: 'text', text }], source })
}

function session() {
  return Session.create(SessionId('legacy-plugin-source-test'))
}

describe('legacy plugin source admission on the Harness V4 write path', () => {
  it('converts a third-party plugin message before it enters the in-memory log and V4 codec', () => {
    const agentSession = session()
    const input = message({
      kind: 'plugin', plugin: 'dsh-example', form: 'snapshot',
      sections: [{ name: 'example', text: 'legacy context' }]
    })
    const event = agentSession.append('user/message', input, { surfaceOp: 'append' })

    expect(input.source).toMatchObject({ kind: 'plugin', plugin: 'dsh-example' })
    expect(event.data.source).toEqual({
      kind: 'plugin:dsh-example', form: 'snapshot',
      sections: [{ name: 'example', text: 'legacy context' }]
    })
    expect(releasedV4SessionFormatCodec.encodeEvent(event).data.source).toEqual(event.data.source)
  })

  it('uses the released V3-to-V4 producer mapping for first-party names', () => {
    const agentSession = session()
    const cases = [
      ['time-context', 'time-context'],
      ['compact', 'compact-checkpoint'],
      ['tools-ptc', 'ptc-mode'],
      ['@deepseek-ai/dsh-system-prompt', 'runtime-context']
    ]
    for (const [plugin, expected] of cases) {
      const event = agentSession.append('user/message', message({ kind: 'plugin', plugin }), { surfaceOp: 'append' })
      expect(event.data.source).toEqual({ kind: expected })
      expect(releasedV4SessionFormatCodec.encodeEvent(event).data.source).toEqual({ kind: expected })
    }
  })

  it('converts embedded inbox messages and leaves direct sources unchanged', () => {
    const agentSession = session()
    const old = message({ kind: 'plugin', plugin: 'dsh-example' })
    const direct = message({ kind: 'plugin:already-v4' })
    const event = agentSession.append('agent/inbox/spliced', { inserted: [old, direct] })
    expect(event.data.inserted.map((item) => item.source)).toEqual([
      { kind: 'plugin:dsh-example' }, { kind: 'plugin:already-v4' }
    ])
    expect(releasedV4SessionFormatCodec.encodeEvent(event).data.inserted[0].source.kind).toBe('plugin:dsh-example')
  })

  it('preserves V4 rejection of plugin wrappers without a usable owner', () => {
    const agentSession = session()
    const event = agentSession.append('user/message', message({ kind: 'plugin' }), { surfaceOp: 'append' })
    expect(event.data.source).toEqual({ kind: 'plugin' })
    expect(() => releasedV4SessionFormatCodec.encodeEvent(event)).toThrow('producer-owned source kind')
  })
})

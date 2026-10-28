import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { LlmError } from '@deepseek-ai/dsh-llm'

function streamTranslator() {
  const source = readFileSync('node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js', 'utf8')
  const helper = name => source.slice(source.indexOf(`function ${name}(`), source.indexOf('\n}', source.indexOf(`function ${name}(`)) + 2)
  const streamStart = source.indexOf('async function* toStreamChunks(')
  const stream = source.slice(streamStart, source.indexOf('\n}', streamStart) + 2)
  return new Function('brandString', 'isContextOverflow', 'LlmError', `${helper('toPiReplayState')}\n${helper('completeTerminalMessage')}\n${helper('mapUsage')}\n${helper('mapStopReason')}\n${stream}\nreturn toStreamChunks`)(value => value, () => false, LlmError)
}

it('reconstructs missing terminal content in native pi-ai format with replay signatures intact', async () => {
  const run = streamTranslator()
  const thinking = { type: 'thinking', thinking: 'reason', thinkingSignature: 'test-signature' }
  const text = { type: 'text', text: 'hello', textSignature: 'test-text-signature' }
  const toolCall = { type: 'toolCall', id: 'call-1', name: 'example', arguments: { x: 1 }, thoughtSignature: 'test-tool-signature' }
  const message = { api: 'test-api', provider: 'test-provider', model: 'test-model', stopReason: 'toolUse', usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: {} } }
  const events = [
    { type: 'thinking_end', contentIndex: 0, content: thinking.thinking, partial: { content: [thinking] } },
    { type: 'text_end', contentIndex: 1, content: text.text, partial: { content: [thinking, text] } },
    { type: 'toolcall_end', contentIndex: 2, toolCall },
    { type: 'done', message }
  ]
  const chunks = []
  for await (const chunk of run(events, 128000, undefined, 'test-model')) chunks.push(chunk)
  expect(chunks.filter(chunk => chunk.type === 'block-end').map(chunk => chunk.block.type)).toEqual(['reasoning', 'text', 'tool-call'])
  expect(chunks.at(-1).replayState.blocks).toEqual([
    { type: 'reasoning', thinkingSignature: 'test-signature' },
    { type: 'text', textSignature: 'test-text-signature' },
    { type: 'tool-call', thoughtSignature: 'test-tool-signature' }
  ])
})

it.each(['toolUse', 'length'])('preserves upstream malformed-tool validation with missing terminal content (%s)', async stopReason => {
  const run = streamTranslator()
  const toolCall = { type: 'toolCall', id: 'call-broken', name: 'example', arguments: {}, argumentsError: 'incomplete JSON' }
  const events = [
    { type: 'toolcall_end', contentIndex: 0, toolCall },
    { type: 'done', message: { api: 'test-api', provider: 'test-provider', model: 'test-model', stopReason, usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: {} } } }
  ]
  const chunks = []
  const consume = async () => { for await (const chunk of run(events, 128000, undefined, 'test-model')) chunks.push(chunk) }
  if (stopReason === 'toolUse') await expect(consume()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  else {
    await consume()
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'max-tokens' } })
  }
  expect(chunks.some(chunk => chunk.type === 'block-end')).toBe(false)
})

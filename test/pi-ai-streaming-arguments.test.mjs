import { expect, it } from 'vitest'
import { processResponsesStream } from '../node_modules/@earendil-works/pi-ai/dist/api/openai-responses-shared.js'

it('streams large tool arguments without reparsing each delta and finalizes exact arguments', async () => {
  const args = { text: 'x'.repeat(128 * 1024), count: 7 }
  const json = JSON.stringify(args)
  const item = { type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'write_file', arguments: '' }
  const events = [{ type: 'response.output_item.added', output_index: 0, item }]
  for (let i = 0; i < json.length; i += 128) {
    events.push({ type: 'response.function_call_arguments.delta', output_index: 0, delta: json.slice(i, i + 128) })
  }
  events.push({ type: 'response.function_call_arguments.done', output_index: 0, arguments: json })
  events.push({ type: 'response.output_item.done', output_index: 0, item: { ...item, arguments: json } })
  events.push({ type: 'response.completed', response: { status: 'completed' } })
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: {} }
  const output = { content: [], usage }
  const deltas = [], completed = []
  await processResponsesStream((async function* () { yield* events })(), output, {
    push(event) {
      if (event.type === 'toolcall_delta') {
        deltas.push(event.delta)
        expect(event.partial.content[0].arguments).toEqual({})
      }
      if (event.type === 'toolcall_end') completed.push(event.toolCall)
    }
  }, { cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })
  expect(deltas.join('')).toBe(json)
  expect(completed).toHaveLength(1)
  expect(completed[0].arguments).toEqual(args)
  expect(completed[0]).not.toHaveProperty('partialJson')
})

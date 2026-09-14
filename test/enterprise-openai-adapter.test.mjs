import { describe, expect, it } from 'vitest'
import { EnterpriseLlmAdapter, serializeEnterpriseRequest } from '../packages/dsh-desktop-enterprise/openai.js'

const model = {
  id: 'bisheng:42',
  display_name: 'BiSheng Chat',
  capabilities: { streaming: true, tools: true, reasoning_content: false }
}

async function usageFrom(payload) {
  const stream = [
    'data: {"choices":[{"index":0,"delta":{"content":"ok"},"finish_reason":null}]}\n\n',
    'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    `data: ${JSON.stringify({ choices: [], usage: payload })}\n\n`,
    'data: [DONE]\n\n'
  ].join('')
  const adapter = new EnterpriseLlmAdapter({
    providerName: () => 'BiSheng',
    models: () => [model],
    request: async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
  })
  const chunks = []
  for await (const chunk of adapter.stream({
    provider: 'bisheng-enterprise', model: model.id,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
  })) chunks.push(chunk)
  return chunks.find((chunk) => chunk.type === 'usage')?.usage
}

describe('BiSheng OpenAI adapter', () => {
  it('serializes tool history without putting provider credentials in the request body', () => {
    const request = serializeEnterpriseRequest({
      model: model.id,
      messages: [
        { role: 'assistant', content: [{ type: 'tool-call', id: 'call-1', name: 'lookup', arguments: '{"q":"x"}' }] },
        { role: 'user', content: [{ type: 'tool-result', toolCallId: 'call-1', content: [{ type: 'text', text: 'result' }] }] }
      ],
      tools: [{ name: 'lookup', description: 'Lookup', parameters: { type: 'object' } }]
    }, model)
    expect(request).toMatchObject({
      model: 'bisheng:42', stream: true, stream_options: { include_usage: true },
      messages: [
        { role: 'assistant', tool_calls: [{ id: 'call-1' }] },
        { role: 'tool', tool_call_id: 'call-1', content: 'result' }
      ]
    })
    expect(JSON.stringify(request)).not.toContain('access_token')
    expect(JSON.stringify(request)).not.toContain('refresh_token')
  })

  it('assembles split UTF-8 SSE text, authoritative usage, and a terminal finish', async () => {
    const encoder = new TextEncoder()
    const source = [
      'data: {"choices":[{"index":0,"delta":{"content":"Mock 联',
      '调成功"},"finish_reason":null}]}\r\n\r\n',
      'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":2,"completion_tokens":3,"total_tokens":5}}\n\n',
      'data: [DONE]\n\n'
    ]
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng',
      models: () => [model],
      request: async () => new Response(new ReadableStream({
        start(controller) {
          for (const piece of source) controller.enqueue(encoder.encode(piece))
          controller.close()
        }
      }), { status: 200, headers: { 'content-type': 'text/event-stream' } })
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'Mock 联调成功' })
    expect(chunks).toContainEqual({ type: 'usage', usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('finishes normally when a successful SSE response has no authoritative usage block', async () => {
    const stream = [
      'data: {"choices":[{"index":0,"delta":{"content":"ok"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng',
      models: () => [model],
      request: async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(chunks).not.toContainEqual(expect.objectContaining({ type: 'usage' }))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('treats null usage fields as unavailable usage, not as a stream failure', async () => {
    const stream = [
      'data: {"choices":[{"index":0,"delta":{"content":"ok"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":null,"completion_tokens":null,"total_tokens":null}}\n\n',
      'data: [DONE]\n\n'
    ].join('')
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng',
      models: () => [model],
      request: async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(chunks).not.toContainEqual(expect.objectContaining({ type: 'usage' }))
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('maps prompt cache details to DSH cache token usage fields', async () => {
    await expect(usageFrom({
      prompt_tokens: 100,
      completion_tokens: 20,
      total_tokens: 120,
      prompt_tokens_details: {
        cached_tokens: 80,
        cache_creation_tokens: null
      }
    })).resolves.toEqual({
      inputTokens: 20,
      outputTokens: 20,
      totalTokens: 120,
      cacheReadTokens: 80
    })
  })

  it('treats missing or null cache details as unavailable cache data', async () => {
    for (const payload of [
      { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, prompt_tokens_details: null },
      { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, prompt_tokens_details: {} },
      {
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        prompt_tokens_details: {
          cached_tokens: null,
          cache_creation_tokens: null
        }
      }
    ]) {
      await expect(usageFrom(payload)).resolves.toEqual({
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120
      })
    }
  })

  it('does not synthesize a zero for a missing cache detail field', async () => {
    await expect(usageFrom({
      prompt_tokens: 100,
      completion_tokens: 20,
      total_tokens: 120,
      prompt_tokens_details: {
        cached_tokens: 25
      }
    })).resolves.toEqual({
      inputTokens: 75,
      outputTokens: 20,
      totalTokens: 120,
      cacheReadTokens: 25
    })
  })

  it('preserves explicit zero cache counts and omits unknown null counts', async () => {
    await expect(usageFrom({
      prompt_tokens: 100,
      completion_tokens: 20,
      total_tokens: 120,
      prompt_tokens_details: {
        cached_tokens: 0,
        cache_creation_tokens: 10
      }
    })).resolves.toEqual({
      inputTokens: 90,
      outputTokens: 20,
      totalTokens: 120,
      cacheReadTokens: 0,
      cacheWriteTokens: 10
    })
  })

  it('ignores invalid cache details without dropping reliable total usage', async () => {
    await expect(usageFrom({
      prompt_tokens: 100,
      completion_tokens: 20,
      total_tokens: 120,
      prompt_tokens_details: {
        cached_tokens: 80,
        cache_creation_tokens: 30
      }
    })).resolves.toEqual({
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120
    })
  })

  it('keeps partial text and terminates on an SSE error without retrying', async () => {
    let requests = 0
    const stream = [
      'data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      'event: error\ndata: {"error":{"message":"quota reached","type":"quota_error","code":"monthly_token_limit_exceeded"},"request_id":"req-1"}\n\n'
    ].join('')
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng', models: () => [model],
      request: async () => {
        requests += 1
        return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
      }
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(requests).toBe(1)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'partial' })
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error', failure: { status: 200, requestId: 'req-1' } } })
  })
})

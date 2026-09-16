import {
  LlmAdapter,
  LlmError,
  ProviderRequestId,
  QUOTA_EXCEEDED_CODE,
  ToolCallId,
  attributionHeaders,
  contentHasImage
} from '@deepseek-ai/dsh-llm'

function textContent(blocks) {
  return blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function assertTextOnly(blocks) {
  if (contentHasImage(blocks)) {
    throw new LlmError('BiSheng DSH models do not support image input in this release.', 'UNSUPPORTED_CONTENT')
  }
}

function assistantMessage(message, includeReasoning) {
  const content = textContent(message.content)
  const reasoning = message.content
    .filter((block) => block.type === 'reasoning')
    .map((block) => block.text)
    .join('')
  const toolCalls = message.content
    .filter((block) => block.type === 'tool-call')
    .map((block) => ({
      id: block.id,
      type: 'function',
      function: { name: block.name, arguments: block.arguments }
    }))
  return {
    role: 'assistant',
    content,
    ...(includeReasoning && reasoning ? { reasoning_content: reasoning } : {}),
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
  }
}

export function serializeEnterpriseRequest(options, model) {
  const messages = []
  if (options.system !== undefined) messages.push({ role: 'system', content: options.system })
  for (const message of options.messages) {
    assertTextOnly(message.content)
    if (message.role === 'system') {
      messages.push({ role: 'system', content: textContent(message.content) })
      continue
    }
    if (message.role === 'assistant') {
      messages.push(assistantMessage(message, model.capabilities.reasoning_content))
      continue
    }
    const regularText = textContent(message.content)
    const toolResults = message.content.filter((block) => block.type === 'tool-result')
    if (regularText || toolResults.length === 0) messages.push({ role: 'user', content: regularText })
    for (const result of toolResults) {
      assertTextOnly(result.content)
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: textContent(result.content) || '(no output)'
      })
    }
  }
  const tools = options.tools?.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
  if (tools && tools.length > 0 && !model.capabilities.tools) {
    throw new LlmError(`BiSheng model "${model.id}" does not support tools.`, 'UNSUPPORTED_OPTION')
  }
  return {
    model: options.model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    ...(options.maxTokens === undefined ? {} : { max_completion_tokens: options.maxTokens }),
    ...(options.stop === undefined ? {} : { stop: options.stop }),
    n: 1
  }
}

export async function* parseSseEvents(body, signal) {
  if (!body) throw new LlmError('BiSheng returned an empty event stream.', 'STREAM_CLOSED')
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      if (signal?.aborted) throw signal.reason
      const { value, done } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      buffer = buffer.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n')
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        if (!frame || frame.startsWith(':')) continue
        let event = 'message'
        const data = []
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /u, ''))
        }
        if (data.length > 0) yield { event, data: data.join('\n') }
      }
      if (done) break
    }
    if (buffer.trim() && !buffer.trimStart().startsWith(':')) {
      throw new LlmError('BiSheng event stream ended with an incomplete frame.', 'STREAM_CLOSED')
    }
  } finally {
    reader.releaseLock()
  }
}

function requestFailure(status, requestId, payload) {
  const error = payload && typeof payload === 'object' && !Array.isArray(payload) &&
    payload.error && typeof payload.error === 'object' && !Array.isArray(payload.error)
    ? payload.error
    : {}
  const code = typeof error.code === 'string' ? error.code : 'request_failed'
  const mapped = code === 'monthly_token_limit_exceeded'
    ? QUOTA_EXCEEDED_CODE
    : code === 'context_length_exceeded'
      ? 'CONTEXT_WINDOW_EXCEEDED'
      : code === 'invalid_access_token'
        ? 'AUTH'
        : status >= 500
          ? 'SERVER'
          : status === 429
            ? 'RATE_LIMIT'
            : 'PROVIDER_ERROR'
  return new LlmError(
    typeof error.message === 'string' && error.message.length > 0
      ? error.message
      : `BiSheng model request failed (${status}).`,
    mapped,
    {
      status,
      ...(requestId ? { requestId: ProviderRequestId(requestId) } : {})
    }
  )
}

async function responseFailure(response) {
  const requestId = response.headers.get('x-request-id') ?? undefined
  const payload = await response.json().catch(() => ({}))
  return requestFailure(response.status, requestId, payload)
}

function validUsage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const prompt = value.prompt_tokens
  const completion = value.completion_tokens
  const total = value.total_tokens
  if (prompt === null && completion === null && total === null) return undefined
  if (
    !Number.isSafeInteger(prompt) || prompt < 0 ||
    !Number.isSafeInteger(completion) || completion < 0 ||
    !Number.isSafeInteger(total) || total < 0 ||
    total !== prompt + completion
  ) return undefined
  const details = value.prompt_tokens_details
  const read = details && typeof details === 'object' && !Array.isArray(details)
    ? optionalTokenCount(details.cached_tokens)
    : undefined
  const write = details && typeof details === 'object' && !Array.isArray(details)
    ? optionalTokenCount(details.cache_creation_tokens)
    : undefined
  const cached = (read ?? 0) + (write ?? 0)
  const safeCache = cached <= prompt
  return {
    inputTokens: safeCache ? prompt - cached : prompt,
    outputTokens: completion,
    totalTokens: total,
    ...(safeCache && read !== undefined ? { cacheReadTokens: read } : {}),
    ...(safeCache && write !== undefined ? { cacheWriteTokens: write } : {})
  }
}

function optionalTokenCount(value) {
  if (value === null || value === undefined) return undefined
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function finishReason(value) {
  if (value === 'stop') return { kind: 'stop' }
  if (value === 'length') return { kind: 'max-tokens' }
  if (value === 'tool_calls') return { kind: 'tool-calls' }
  if (value === 'content_filter') {
    return {
      kind: 'error',
      failure: { message: 'BiSheng filtered the model response.', code: 'CONTENT_FILTERED' }
    }
  }
  return undefined
}

export class EnterpriseLlmAdapter extends LlmAdapter {
  constructor(options) {
    super()
    this.options = options
  }

  providerInfo(provider) {
    return { id: provider, name: this.options.providerName() }
  }

  providerRetryPolicy() {
    return { mode: 'normal', maxRetries: 0, retryableCodes: ['TRANSPORT'] }
  }

  listModels(provider) {
    return Promise.resolve(this.options.models().map((model) => ({
      provider,
      id: model.id,
      name: model.display_name,
      inputModalities: ['text']
    })))
  }

  resolveModel(provider, id) {
    const model = this.options.models().find((candidate) => candidate.id === id)
    if (!model) throw new LlmError(`BiSheng provider has no authorized model "${id}".`, 'UNKNOWN_MODEL')
    return Promise.resolve({
      provider,
      id,
      name: model.display_name,
      inputModalities: ['text']
    })
  }

  async *stream(options) {
    const model = this.options.models().find((candidate) => candidate.id === options.model)
    if (!model) throw new LlmError(`BiSheng provider has no authorized model "${options.model}".`, 'UNKNOWN_MODEL')
    const response = await this.options.request(
      serializeEnterpriseRequest(options, model),
      options.signal,
      attributionHeaders()
    )
    if (!response.ok) throw await responseFailure(response)
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('text/event-stream')) {
      throw new LlmError('BiSheng returned a non-SSE model response.', 'INVALID_RESPONSE', {
        status: response.status
      })
    }

    const blocks = []
    const tools = new Map()
    let textBlock
    let reasoningBlock
    let usage
    let stopped
    let done = false

    const startBlock = (type) => {
      const block = { index: blocks.length, type, text: '' }
      blocks.push(block)
      return block
    }

    for await (const event of parseSseEvents(response.body, options.signal)) {
      if (event.data === '[DONE]') {
        done = true
        break
      }
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        throw new LlmError('BiSheng event stream contains invalid JSON.', 'INVALID_RESPONSE')
      }
      if (event.event === 'error' || payload?.error) {
        for (const block of blocks) {
          if (block.type === 'text') yield { type: 'block-end', index: block.index, block: { type: 'text', text: block.text } }
          else if (block.type === 'reasoning') yield { type: 'block-end', index: block.index, block: { type: 'reasoning', text: block.text } }
          else yield { type: 'block-end', index: block.index, block: { type: 'tool-call', id: ToolCallId(block.id), name: block.name, arguments: block.arguments } }
        }
        const failure = requestFailure(200, payload?.request_id, payload)
        yield { type: 'finish', reason: { kind: 'error', failure: failure.failure } }
        return
      }
      const parsedUsage = validUsage(payload?.usage)
      if (parsedUsage) usage = parsedUsage
      const choices = Array.isArray(payload?.choices) ? payload.choices : []
      for (const choice of choices) {
        if (!choice || typeof choice !== 'object' || choice.index !== 0) continue
        const delta = choice.delta && typeof choice.delta === 'object' ? choice.delta : {}
        if (model.capabilities.reasoning_content && typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
          if (!reasoningBlock) {
            reasoningBlock = startBlock('reasoning')
            yield { type: 'block-start', index: reasoningBlock.index, blockType: 'reasoning' }
          }
          reasoningBlock.text += delta.reasoning_content
          yield { type: 'reasoning-delta', index: reasoningBlock.index, text: delta.reasoning_content }
        }
        if (typeof delta.content === 'string' && delta.content) {
          if (!textBlock) {
            textBlock = startBlock('text')
            yield { type: 'block-start', index: textBlock.index, blockType: 'text' }
          }
          textBlock.text += delta.content
          yield { type: 'text-delta', index: textBlock.index, text: delta.content }
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const item of delta.tool_calls) {
            if (!item || !Number.isSafeInteger(item.index) || item.index < 0) continue
            let tool = tools.get(item.index)
            if (!tool) {
              tool = { index: undefined, id: '', name: '', arguments: '', pendingArguments: '' }
              tools.set(item.index, tool)
            }
            if (typeof item.id === 'string' && item.id) tool.id = item.id
            if (typeof item.function?.name === 'string') tool.name += item.function.name
            if (typeof item.function?.arguments === 'string') tool.pendingArguments += item.function.arguments
            if (tool.id && tool.index === undefined) {
              const block = startBlock('tool-call')
              tool.index = block.index
              block.id = tool.id
              block.name = tool.name
              block.arguments = ''
              yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
            }
            if (tool.index !== undefined && tool.pendingArguments) {
              const block = blocks[tool.index]
              block.name = tool.name
              block.arguments += tool.pendingArguments
              yield {
                type: 'tool-call-delta',
                index: tool.index,
                id: ToolCallId(tool.id),
                ...(tool.name ? { name: tool.name } : {}),
                argumentsDelta: tool.pendingArguments
              }
              tool.pendingArguments = ''
            }
          }
        }
        const nextStop = finishReason(choice.finish_reason)
        if (nextStop) stopped = nextStop
      }
    }

    if (!done || !stopped) throw new LlmError('BiSheng event stream closed before completion.', 'STREAM_CLOSED')
    if (blocks.length === 0 && stopped.kind !== 'error') {
      throw new LlmError('BiSheng event stream completed without model output.', 'EMPTY_RESPONSE')
    }
    for (const block of blocks) {
      if (block.type === 'text') {
        yield { type: 'block-end', index: block.index, block: { type: 'text', text: block.text } }
      } else if (block.type === 'reasoning') {
        yield { type: 'block-end', index: block.index, block: { type: 'reasoning', text: block.text } }
      } else {
        if (!block.id || !block.name) throw new LlmError('BiSheng returned an incomplete tool call.', 'INVALID_RESPONSE')
        try {
          JSON.parse(block.arguments)
        } catch {
          throw new LlmError('BiSheng returned incomplete tool arguments.', 'INVALID_RESPONSE')
        }
        yield {
          type: 'block-end',
          index: block.index,
          block: {
            type: 'tool-call',
            id: ToolCallId(block.id),
            name: block.name,
            arguments: block.arguments
          }
        }
      }
    }
    if (usage) yield { type: 'usage', usage }
    await this.options.onComplete?.(options.model)
    yield { type: 'finish', reason: stopped }
  }
}

// Minimal Chrome DevTools Protocol driver for a running DSH Desktop renderer.
//
// Normally reached through cdp-eval.sh, which resolves the target for you.
// Args: <websocket-url> [<js expression> | --eval-file <path> | --watch <ms>].
//
// Usage: node scripts/cdp-eval.mjs "$WS" 'document.title'  — evaluates in the page and prints JSON.
//        node scripts/cdp-eval.mjs "$WS" --eval-file <path>
//        node scripts/cdp-eval.mjs "$WS" --watch <ms>      — streams console output for <ms>.
import { readFile } from 'node:fs/promises'

const endpoint = process.argv[2]
const mode = process.argv[3]
const argument = process.argv[4]

const ws = new WebSocket(endpoint)
let nextId = 1
const pending = new Map()
const consoleLines = []

function send(method, params = {}) {
  const id = nextId++
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) {
    const entry = pending.get(message.id)
    if (entry === undefined) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)))
    else entry.resolve(message.result)
    return
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    const text = (message.params.args ?? [])
      .map((arg) => (arg.value !== undefined ? String(arg.value) : arg.description ?? arg.type))
      .join(' ')
    consoleLines.push(text)
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleLines.push(`[exception] ${message.params.exceptionDetails?.text ?? ''}`)
  }
})

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve)
  ws.addEventListener('error', reject)
})

await send('Runtime.enable')

if (mode === '--watch') {
  const ms = Number(argument ?? 15000)
  await new Promise((resolve) => setTimeout(resolve, ms))
  console.log(consoleLines.join('\n'))
} else {
  const expression =
    mode === '--eval-file' ? await readFile(argument, 'utf8') : (argument ?? mode)
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  })
  if (result.exceptionDetails !== undefined) {
    console.log('EXCEPTION:', JSON.stringify(result.exceptionDetails, null, 2))
  } else {
    console.log(
      typeof result.result.value === 'string'
        ? result.result.value
        : JSON.stringify(result.result.value, null, 2)
    )
  }
}

ws.close()

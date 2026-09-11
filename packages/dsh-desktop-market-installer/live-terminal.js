export const LIVE_TERMINAL_PATH = '/dsh-desktop/live-terminal/output'
export const LIVE_TERMINAL_CALL_ID_ENV = 'DSH_LIVE_TERMINAL_CALL_ID'

const MAX_OUTPUT_BYTES = 300 * 1024
const POLL_INTERVAL_MS = 100
const SETTLED_RETENTION_MS = 30 * 1000

function appendBounded(current, chunk) {
  const next = current + chunk
  return next.length <= MAX_OUTPUT_BYTES ? next : next.slice(-MAX_OUTPUT_BYTES)
}

function readCollector(collector, offset) {
  if (!collector || typeof collector.readFrom !== 'function') return { text: '', nextOffset: offset }
  const slice = collector.readFrom(offset)
  return {
    text: typeof slice?.text === 'string' ? slice.text : '',
    nextOffset: typeof slice?.nextOffset === 'number' ? slice.nextOffset : offset
  }
}

export function renderLiveOutput(stdout, stderr) {
  if (stderr === '') return stdout
  const separator = stdout !== '' && !stdout.endsWith('\n') ? '\n' : ''
  return `${stdout}${separator}[stderr]\n${stderr}`
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Expose the collected stdout/stderr of Desktop-owned shell calls while they
 * are running. The shell executor already retains both streams; this adapter
 * reads independent collector cursors, so it neither consumes nor changes the
 * final tool result.
 */
export function installLiveTerminalStreaming(ctx) {
  ctx.inject(['webServer', 'subprocess'], (hostCtx) => hostCtx.effect(() => {
    const records = new Map()
    const originalSpawn = hostCtx.subprocess.spawn.bind(hostCtx.subprocess)

    const wrappedSpawn = (spec) => {
      const handle = originalSpawn(spec)
      const callId = spec?.env?.[LIVE_TERMINAL_CALL_ID_ENV]
      const stdoutCollector = handle?.collected?.stdout
      const stderrCollector = handle?.collected?.stderr
      if (typeof callId !== 'string' || callId === '' || (!stdoutCollector && !stderrCollector)) {
        return handle
      }

      const record = {
        callId,
        stdout: '',
        stderr: '',
        stdoutOffset: 0,
        stderrOffset: 0,
        startedAt: Date.now(),
        active: true,
        drain: undefined,
        timer: undefined,
        removalTimer: undefined
      }
      records.set(callId, record)

      const drain = () => {
        const stdout = readCollector(stdoutCollector, record.stdoutOffset)
        const stderr = readCollector(stderrCollector, record.stderrOffset)
        record.stdoutOffset = stdout.nextOffset
        record.stderrOffset = stderr.nextOffset
        if (stdout.text !== '') record.stdout = appendBounded(record.stdout, stdout.text)
        if (stderr.text !== '') record.stderr = appendBounded(record.stderr, stderr.text)
      }
      record.drain = drain

      record.timer = setInterval(drain, POLL_INTERVAL_MS)
      record.timer.unref?.()
      Promise.resolve(handle.done).finally(() => {
        drain()
        record.active = false
        clearInterval(record.timer)
        record.timer = undefined
        record.removalTimer = setTimeout(() => {
          if (records.get(callId) === record) records.delete(callId)
        }, SETTLED_RETENTION_MS)
        record.removalTimer.unref?.()
      }).catch(() => undefined)

      return handle
    }

    hostCtx.subprocess.spawn = wrappedSpawn
    const disposeRoute = hostCtx.webServer.register({
      kind: 'exact',
      path: LIVE_TERMINAL_PATH,
      handler: (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed.' })
          return
        }
        const requestUrl = new URL(req.url ?? LIVE_TERMINAL_PATH, 'http://127.0.0.1')
        const callId = requestUrl.searchParams.get('callId')
        const record = callId === null ? undefined : records.get(callId)
        if (record === undefined) {
          sendJson(res, 200, { found: false, active: false, output: '' })
          return
        }
        record.drain?.()
        sendJson(res, 200, {
          found: true,
          active: record.active,
          output: renderLiveOutput(record.stdout, record.stderr),
          elapsedMs: Math.max(0, Date.now() - record.startedAt)
        })
      }
    })

    return () => {
      disposeRoute()
      if (hostCtx.subprocess.spawn === wrappedSpawn) hostCtx.subprocess.spawn = originalSpawn
      for (const record of records.values()) {
        if (record.timer !== undefined) clearInterval(record.timer)
        if (record.removalTimer !== undefined) clearTimeout(record.removalTimer)
      }
      records.clear()
    }
  }, 'dsh-desktop-market-installer: live terminal streaming'))
}

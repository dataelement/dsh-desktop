import { Logger } from '@deepseek-ai/cordis'

/**
 * Write Harness's runtime warnings and errors to stderr, where the desktop
 * already records everything into harness.log.
 *
 * Cordis's `ctx.logger` only keeps an in-memory ring of recent messages;
 * nothing in the shipped composition exports them anywhere. So an error that
 * happens after startup — a session that cannot activate, a preset that fails
 * to mount — left no trace a person or the Repair Agent could read once the
 * process was gone. The default exporter level also filters out `warn`, so
 * warnings were not even in the ring.
 *
 * Session activation failures never reach the logger at all: the session
 * controller only pushes them to the client as `api-session/error`. Those are
 * recorded here too.
 *
 * Every line carries {@link LINE_PREFIX}. The desktop's startup-failure
 * parsers skip such lines, so bridged runtime chatter can never change which
 * plugin plugin recovery blames or what it reports as the failure cause.
 */
export const name = 'dsh-desktop-log-bridge'

/** Marks every bridged line; see `latestHarnessAttemptLogs` in the desktop. */
export const LINE_PREFIX = '[harness-log]'

/** Written once per launch when the bridge is active. */
export const BRIDGE_READY_LINE = `${LINE_PREFIX} info dsh-desktop-log-bridge: runtime warnings and errors are recorded from here on`

/** Cordis levels: error 0, info 1, warn 2. The exporter admits up to warn. */
const EXPORT_LEVEL = 2
/** Messages written per window; a warning in a loop must not flood the log. */
const WINDOW_MS = 60_000
const WINDOW_LIMIT = 100

/**
 * Render one message as prefixed lines.
 * @param type - `error` or `warn`, or `session-error` for activation failures.
 * @param source - the logger name, or the session id.
 * @param text - the message, possibly spanning lines (a stack trace).
 * @returns the lines to write, each carrying the prefix.
 */
export function bridgeLines(type, source, text) {
  const [first = '', ...rest] = String(text).split(/\r?\n/)
  return [
    `${LINE_PREFIX} ${type} ${source}: ${first}`,
    ...rest.filter((line) => line.trim() !== '').map((line) => `${LINE_PREFIX}   ${line}`)
  ]
}

/**
 * A writer that drops what exceeds the window's budget and says how much it
 * dropped once the next window opens.
 */
export function createLimitedWriter(write, now = Date.now) {
  let windowStart = now()
  let written = 0
  let dropped = 0
  return (lines) => {
    const time = now()
    if (time - windowStart >= WINDOW_MS) {
      if (dropped > 0) write(`${LINE_PREFIX} warn dsh-desktop-log-bridge: dropped ${dropped} message(s) over the rate limit\n`)
      windowStart = time
      written = 0
      dropped = 0
    }
    if (written >= WINDOW_LIMIT) {
      dropped += 1
      return
    }
    written += 1
    write(`${lines.join('\n')}\n`)
  }
}

export function apply(ctx) {
  const emit = createLimitedWriter((text) => {
    process.stderr.write(text)
  })
  const exporter = {
    colors: 0,
    levels: { default: EXPORT_LEVEL },
    export(message) {
      if (message.type !== 'error' && message.type !== 'warn') return
      emit(bridgeLines(message.type, message.name, Logger.format(exporter, message)))
    }
  }

  // Errors logged before this plugin loaded are still in the ring; warnings
  // were filtered out of it by the default level and are gone.
  const buffered = ctx.logger.buffer
  if (Array.isArray(buffered)) {
    for (const message of buffered) {
      if (message?.type === 'error') exporter.export(message)
    }
  }
  ctx.logger.exporter(exporter)

  ctx.on('api-session/error', (sessionId, error) => {
    emit(bridgeLines('session-error', String(sessionId), error))
  })
  // One line per launch: a log without it predates the bridge, so the
  // absence of runtime errors there proves nothing. It is a notice, not a
  // problem, so it goes to stdout; stderr carries only warnings and errors.
  process.stdout.write(`${BRIDGE_READY_LINE}\n`)
}

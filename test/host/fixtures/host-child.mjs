import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const report = process.env.FIXTURE_REPORT
if (typeof report === 'string' && report.length > 0) {
  writeFileSync(report, JSON.stringify({
    home: process.env.DSH_HOME ?? '',
    profile: process.env.DSH_DESKTOP_PROFILE ?? '',
    execPath: process.execPath
  }))
}

process.send?.({ type: 'starting', runId: '00000000-0000-4000-8000-000000000001' })

if (process.env.FIXTURE_MODE === 'output') {
  process.stdout.write('child-stdout\n')
  process.stderr.write('child-stderr http://127.0.0.1:9/?token=secret\n')
  process.exit(0)
}

if (process.env.FIXTURE_MODE === 'fatal') {
  process.send?.({ type: 'fatal', message: 'fixture failed' })
  process.exit(1)
}

if (process.env.FIXTURE_MODE === 'invalid') {
  process.send?.({ type: 'nope' })
  setTimeout(() => { process.exit(0) }, 1000)
} else {
  process.send?.({ type: 'ready', url: 'http://127.0.0.1:9/', injections: ['boot'] })
  process.on('message', message => {
    if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'shutdown') {
      if (process.env.FIXTURE_MODE === 'inherited-pipes') {
        // Outlive the Host while holding its stdout/stderr open, like a plugin proxy.
        const proxy = spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 4000)'], {
          stdio: ['ignore', 'inherit', 'inherit'], env: process.env
        })
        proxy.unref()
      }
      process.send?.({ type: 'shutdown-complete' }, () => { process.exit(0) })
    }
  })
}

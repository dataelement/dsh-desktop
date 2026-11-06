import { writeFileSync } from 'node:fs'

const report = process.env.FIXTURE_REPORT
if (typeof report === 'string' && report.length > 0) {
  writeFileSync(report, JSON.stringify({
    home: process.env.DSH_HOME ?? '',
    profile: process.env.DSH_DESKTOP_PROFILE ?? ''
  }))
}

process.send?.({ type: 'starting', runId: '00000000-0000-4000-8000-000000000001' })

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
      process.send?.({ type: 'shutdown-complete' })
      process.exit(0)
    }
  })
}

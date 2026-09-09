import { describe, expect, it } from 'vitest'
import { StartupTrace } from '../src/main/runtime/startup-trace'

describe('startup diagnostics', () => {
  it('records elapsed async work and distinct launch IDs without changing its result', async () => {
    const lines: string[] = []
    const trace = new StartupTrace(line => lines.push(line), { kind: 'normal', version: 'test' })
    const result = await trace.measure('fixture.wait', async () => {
      await new Promise(resolve => setTimeout(resolve, 25))
      return 42
    })
    expect(result).toBe(42)
    const events = lines.map(line => JSON.parse(line.slice('[startup-timing] '.length)))
    expect(events.map(e => e.status)).toEqual(['begin', 'begin', 'done'])
    expect(events[2].durationMs).toBeGreaterThanOrEqual(15)
    expect(events.every(e => e.run === trace.id)).toBe(true)
    expect(new StartupTrace(() => {}).id).not.toBe(trace.id)
  })

  it('preserves sync and async failures without copying secrets into timing records', async () => {
    const lines: string[] = []
    const trace = new StartupTrace(line => lines.push(line))
    const error = new Error('private-token-and-path')
    expect(() => trace.measureSync('fixture.sync', () => { throw error })).toThrow(error)
    await expect(trace.measure('fixture.async', async () => { throw error })).rejects.toBe(error)
    expect(lines.filter(line => line.includes('"status":"failed"'))).toHaveLength(2)
    expect(lines.join('\n')).not.toContain(error.message)
  })
})

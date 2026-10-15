import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { absorbBrokenPipe } from '../src/main/runtime/harness-runtime'

describe('harness log echo', () => {
  it('absorbs EPIPE from a closed standard stream and still throws other write errors', () => {
    const stream = new EventEmitter()
    absorbBrokenPipe(stream)
    absorbBrokenPipe(stream)
    expect(() => {
      stream.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }))
    }).not.toThrow()
    expect(() => {
      stream.emit('error', Object.assign(new Error('reset'), { code: 'ECONNRESET' }))
    }).toThrow(/reset/)
  })
})

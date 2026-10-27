import test from 'node:test'
import assert from 'node:assert/strict'
import { createFramePump } from '../src/frames.mjs'
const drain = () => new Promise((resolve) => setImmediate(resolve))
function timers() {
  let seq = 0
  const pending = new Map()
  return {
    pending,
    setTimer: (fn, ms) => {
      const id = ++seq
      pending.set(id, { fn, ms })
      return id
    },
    clearTimer: (id) => pending.delete(id),
  }
}

test('空格或点击能唤醒取帧，不必等正常轮询间隔', async () => {
  const clock = timers(),
    shown = []
  let reads = 0
  const pump = createFramePump({
    ...clock,
    read: async () => ++reads,
    present: (frame) => shown.push(frame),
    interval: () => 750,
  })
  await pump.request()
  assert.equal(reads, 1)
  assert.equal([...clock.pending.values()][0].ms, 750)
  const next = pump.request()
  assert.equal(clock.pending.size, 0)
  await next
  assert.deepEqual(shown, [1, 2])
  assert.equal(clock.pending.size, 1)
  pump.stop()
  assert.equal(clock.pending.size, 0)
})

test('快速按键和点击只合并成下一帧，不堆积截图请求', async () => {
  const clock = timers(),
    shown = [],
    resolvers = []
  let reads = 0
  const pump = createFramePump({
    ...clock,
    read: () => {
      reads++
      return new Promise((resolve) => resolvers.push(resolve))
    },
    present: (f) => shown.push(f),
  })
  const first = pump.request()
  await drain()
  for (let i = 0; i < 30; i++) assert.equal(pump.request(), first)
  assert.equal(reads, 1)
  resolvers.shift()('before')
  await first
  await drain()
  assert.equal(reads, 2)
  resolvers.shift()('after')
  await drain()
  assert.deepEqual(shown, ['before', 'after'])
  assert.equal(clock.pending.size, 1)
  pump.stop()
})

test('切换网页后，不展示已停止取帧器的迟到截图', async () => {
  const clock = timers(),
    shown = []
  let resolve
  const pump = createFramePump({
    ...clock,
    read: () => new Promise((r) => (resolve = r)),
    present: (f) => shown.push(f),
  })
  const pending = pump.request()
  await drain()
  pump.stop()
  resolve('old-tab')
  await pending
  assert.deepEqual(shown, [])
  assert.equal(clock.pending.size, 0)
  await pump.request()
  assert.equal(clock.pending.size, 0)
})

test('取帧失败保留后续刷新能力，重新请求可立刻恢复', async () => {
  const clock = timers(),
    shown = [],
    errors = []
  let reads = 0
  const pump = createFramePump({
    ...clock,
    read: async () => {
      if (++reads === 1) throw Error('断线')
      return 'recovered'
    },
    present: (f) => shown.push(f),
    onError: (e) => errors.push(e.message),
  })
  await pump.request()
  assert.deepEqual(errors, ['断线'])
  assert.equal(clock.pending.size, 1)
  await pump.request()
  assert.deepEqual(shown, ['recovered'])
  pump.stop()
})

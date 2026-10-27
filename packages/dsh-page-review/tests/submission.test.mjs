import test from 'node:test'
import assert from 'node:assert/strict'
import { createDirectSender } from '../src/submission.mjs'
import { deliverPacket } from '../src/packet.mjs'
import { retireComposer } from '../src/composer.mjs'

test('不经过审查或浏览器面板，单次提交直接包含图片、元素和注释', async () => {
  const calls = [],
    packet = {
      text: '用户补充要求：修改按钮\n批注 1\n定位：#submit\n用户要求：改成蓝色',
      images: [
        {
          type: 'image',
          mediaType: 'image/jpeg',
          data: 'aW1hZ2U=',
          name: '网页批注-1.jpg',
          width: 400,
          height: 300,
        },
      ],
      deliveryId: 'd1',
    }
  const session = {
    beginSubmission: (x) => {
      calls.push(['begin', x])
      return { requestId: 'one' }
    },
    prompt: async (...args) => {
      calls.push(['prompt', ...args])
      return { ok: true, value: { accepted: true } }
    },
  }
  const sender = createDirectSender({
    prepare: async () => packet,
    deliver: (p, a) => deliverPacket(session, p, a),
    retire: () => calls.push(['retire']),
    ack: async () => {
      calls.push(['ack'])
      return { notes: [] }
    },
  })
  await sender.send()
  assert.deepEqual(
    calls.map((x) => x[0]),
    ['begin', 'prompt', 'retire', 'ack'],
  )
  assert.deepEqual(
    calls[1][1].map((x) => x.type),
    ['text', 'image'],
  )
  assert.match(calls[1][1][0].text, /#submit/)
  assert.match(calls[1][1][0].text, /改成蓝色/)
  assert.equal(calls[1][1][1].data, 'aW1hZ2U=')
})

test('连续点击和 Enter 共用进行中的请求，不产生重复消息', async () => {
  let resume,
    prepared = 0,
    delivered = 0
  const ready = new Promise((r) => (resume = r))
  const sender = createDirectSender({
    prepare: async () => {
      prepared++
      await ready
      return {}
    },
    deliver: async () => {
      delivered++
    },
    retire: () => {},
    ack: async () => ({}),
  })
  const first = sender.send(),
    second = sender.send()
  assert.equal(first, second)
  resume()
  await first
  assert.equal(prepared, 1)
  assert.equal(delivered, 1)
})

test('发送失败保留原请求及草稿，重试不丢失发送期间新增的文字', async () => {
  let prepared = 0,
    attempts = 0,
    acked = 0,
    pruned = []
  const snapshot = { text: '原要求', draftRev: 1, attachmentIds: ['image-a'] },
    current = {
      draft: '新增要求',
      draftRev: 2,
      attachmentIds: ['image-a', 'image-b'],
    }
  const actions = {
    setDraft: () => assert.fail('不能清空新草稿'),
    pruneAttachments: (ids) => pruned.push(ids),
  }
  const sender = createDirectSender({
    prepare: async () => {
      prepared++
      return { composer: snapshot }
    },
    deliver: async (p, a) => {
      a.requestId ??= 'stable-id'
      assert.equal(a.requestId, 'stable-id')
      if (++attempts === 1) throw Error('响应丢失')
    },
    retire: (p) => retireComposer(p.composer, current, actions),
    ack: async () => {
      acked++
      return {}
    },
  })
  await assert.rejects(sender.send(), /响应丢失/)
  assert.equal(acked, 0)
  assert.deepEqual(pruned, [])
  await sender.send()
  assert.equal(prepared, 1)
  assert.equal(attempts, 2)
  assert.equal(acked, 1)
  assert.deepEqual(pruned, [['image-b']])
})

test('模型已接收而本地归档失败时，只重试回执，不再次发送', async () => {
  let prepared = 0,
    delivered = 0,
    retired = 0,
    acked = 0
  const sender = createDirectSender({
    prepare: async () => {
      prepared++
      return {}
    },
    deliver: async () => {
      delivered++
    },
    retire: () => retired++,
    ack: async () => {
      if (++acked === 1) throw Error('本地回执失败')
      return { notes: [] }
    },
  })
  await assert.rejects(sender.send(), /本地回执失败/)
  await sender.send()
  assert.deepEqual([prepared, delivered, retired, acked], [1, 1, 1, 2])
})

test('准备附件失败可重新准备，不交付半份消息，也不留在发送中', async () => {
  let prepared = 0,
    delivered = 0,
    ended = 0
  const sender = createDirectSender({
    prepare: async () => {
      if (++prepared === 1) throw Error('附件未完成')
      return {}
    },
    deliver: async () => delivered++,
    retire: () => {},
    ack: async () => ({}),
    onEnd: () => ended++,
  })
  await assert.rejects(sender.send(), /附件未完成/)
  assert.equal(delivered, 0)
  await sender.send()
  assert.deepEqual([prepared, delivered, ended], [2, 1, 2])
})

test('explicit admission rejection permits repaired attachments; transport failures retain the attempt', async () => {
  let prepared = 0,
    calls = 0,
    received
  const sender = createDirectSender({
    prepare: async () => ({ version: ++prepared }),
    deliver: async (packet) => {
      calls++
      if (calls === 1)
        throw Object.assign(Error('Invalid image bytes'), {
          admissionRejected: true,
        })
      received = packet.version
    },
    retire() {},
    ack: async () => ({}),
  })
  await assert.rejects(sender.send(), /Invalid image/)
  await sender.send()
  assert.equal(prepared, 2)
  assert.equal(received, 2)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  captureComposer,
  serializeComposerReferences,
  withComposerText,
  composerAttachments,
  retireComposer,
} from '../src/composer.mjs'
import { deliverPacket } from '../src/packet.mjs'

test('reference chips use native owner codecs and retain the readable draft and revision', async () => {
  const state = {
    draft: 'QA: report.txt + thread',
    draftRev: 7,
    attachmentIds: ['image'],
    occurrences: [
      {
        source: 'file',
        ref: 'receipt-1',
        offset: 4,
        length: 10,
        clipboardText: 'report.txt',
      },
      {
        source: 'session',
        ref: 'session-2',
        offset: 17,
        length: 6,
        clipboardText: 'thread',
      },
    ],
  }
  const captured = captureComposer(state)
  state.occurrences[0].ref = 'changed-later'
  const calls = [],
    signal = new AbortController().signal
  const serialized = await serializeComposerReferences(
    captured,
    {
      async serializeReference(source, ref, passedSignal) {
        calls.push([source, ref])
        assert.equal(passedSignal, signal)
        return source === 'file'
          ? 'authorized-file-context'
          : 'authorized-session-context'
      },
    },
    signal,
  )
  assert.deepEqual(calls, [
    ['file', 'receipt-1'],
    ['session', 'session-2'],
  ])
  const packet = withComposerText(
    { text: 'annotation packet', displayText: 'annotation summary' },
    serialized,
  )
  assert.match(
    packet.text,
    /QA: authorized-file-context \+ authorized-session-context/,
  )
  assert.match(packet.displayText, /QA: report.txt \+ thread/)
  assert.equal(serialized.text, 'QA: report.txt + thread')
  assert.equal(serialized.draftRev, 7)
})

test('invalid, overlapping or unavailable references fail before admission without consuming the draft', async () => {
  const capture = {
    text: 'file',
    draftRev: 1,
    references: [
      {
        source: 'file',
        ref: 'id',
        offset: 0,
        length: 4,
        clipboardText: 'file',
      },
    ],
  }
  await assert.rejects(serializeComposerReferences(capture, null), /引用不可用/)
  await assert.rejects(
    serializeComposerReferences(
      { ...capture, references: [{ ...capture.references[0], invalid: true }] },
      { serializeReference: async () => 'data' },
    ),
    /引用不可用/,
  )
  await assert.rejects(
    serializeComposerReferences(
      {
        ...capture,
        references: [...capture.references, ...capture.references],
      },
      { serializeReference: async () => 'data' },
    ),
    /引用不可用/,
  )
  await assert.rejects(
    serializeComposerReferences(capture, {
      serializeReference: async () => {
        throw Error('owner unavailable')
      },
    }),
    /owner unavailable/,
  )
  const abort = new AbortController()
  abort.abort()
  await assert.rejects(
    serializeComposerReferences(
      capture,
      { serializeReference: async () => 'data' },
      abort.signal,
    ),
    { name: 'AbortError' },
  )
  assert.equal(capture.text, 'file')
  assert.equal(capture.draftRev, 1)
})

test('注释与输入内容绑定为同一份预览，保留附件顺序', () => {
  const input = {
    draft: '让按钮更醒目',
    draftRev: 5,
    attachmentIds: ['image', 'file'],
    phase: 'plain',
    occurrences: [],
  }
  const snapshot = captureComposer(input)
  input.attachmentIds.push('later')
  assert.deepEqual(snapshot.attachmentIds, ['image', 'file'])
  const packet = { text: '元素定位与注释', images: [] }
  assert.match(
    withComposerText(packet, snapshot).text,
    /让按钮更醒目[\s\S]*元素定位与注释/,
  )
  assert.equal(packet.text, '元素定位与注释')
  assert.throws(() => captureComposer({ ...input, claim: {} }), /命令/)
  assert.throws(
    () => captureComposer({ ...input, phase: 'submitting' }),
    /提交/,
  )
})
test('发送回执只清理同版本草稿，发送期间新增文字与附件保留', () => {
  const snapshot = { text: '旧文字', draftRev: 1, attachmentIds: ['old'] }
  let cleared = 0,
    attachmentIds = ['old', 'new']
  const actions = {
    setDraft: () => cleared++,
    // Model the native keep-only contract, so reversing it loses the new file.
    pruneAttachments: (available) => {
      attachmentIds = attachmentIds.filter((id) => available.includes(id))
    },
  }
  retireComposer(
    snapshot,
    { draft: '新文字', draftRev: 2, attachmentIds },
    actions,
  )
  assert.equal(cleared, 0)
  assert.deepEqual(attachmentIds, ['new'])
  attachmentIds = ['old']
  retireComposer(
    snapshot,
    { draft: '旧文字', draftRev: 1, attachmentIds },
    actions,
  )
  assert.equal(cleared, 1)
  assert.deepEqual(attachmentIds, [])
})
test('原有图片和文件通过宿主附件序列化，不会在发送注释时丢失', async () => {
  const originals = [
    {
      id: 'image',
      kind: 'image',
      file: { name: '附图.png' },
      width: 10,
      height: 20,
    },
    { id: 'file', kind: 'file' },
  ]
  let retired
  const service = {
    resolveDraftAttachments: () => originals,
    serializeDraftAttachments: async () => ({
      attachments: [
        { type: 'image', mediaType: 'image/png', data: 'YWJj' },
        { type: 'file', receiptId: 'receipt' },
      ],
    }),
    fileUploads: {
      getSnapshot: () => ({
        file: { status: 'ready', file: { name: '说明.pdf' } },
      }),
    },
    settleSubmittedAttachments: (...args) => (retired = args),
  }
  const extra = await composerAttachments(
    service,
    { attachmentIds: ['image', 'file'] },
    'session',
    1,
  )
  assert.deepEqual(
    extra.content.map((p) => p.type),
    ['image', 'file'],
  )
  assert.match(extra.pending[0].value.previewUrl, /^data:image\/png;base64,/)
  assert.equal(extra.pending[1].value.name, '说明.pdf')
  extra.onRetire({
    reason: 'observed',
    attachments: ['annotation', 'image-ref', 'file-ref'],
  })
  assert.deepEqual(retired[2].attachments, ['image-ref', 'file-ref'])
  let begin, wire
  const session = {
    beginSubmission: (args) => ((begin = args), { requestId: 'id' }),
    prompt: async (content) => (
      (wire = content),
      { ok: true, value: { accepted: true } }
    ),
  }
  await deliverPacket(
    session,
    {
      text: '文字与元素',
      images: [
        {
          type: 'image',
          mediaType: 'image/jpeg',
          data: 'abc',
          name: '注释.jpg',
        },
      ],
    },
    {},
    extra,
  )
  assert.deepEqual(
    wire.map((p) => p.type),
    ['text', 'image', 'image', 'file'],
  )
  assert.equal(begin.attachments.length, 3)
  service.serializeDraftAttachments = async () => {
    throw Error('附件尚未上传')
  }
  await assert.rejects(
    () =>
      composerAttachments(
        service,
        { attachmentIds: ['image', 'file'] },
        'session',
        1,
      ),
    /尚未上传/,
  )
})

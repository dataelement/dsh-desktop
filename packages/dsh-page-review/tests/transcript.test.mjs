import test from 'node:test'
import assert from 'node:assert/strict'
import {
  annotationTranscript,
  ANNOTATION_INSTRUCTIONS,
  serializeAnnotations,
} from '../src/transcript.mjs'
import { buildPacket, deliverPacket } from '../src/packet.mjs'
import { withComposerText } from '../src/composer.mjs'
const note = {
  id: 'n',
  sessionId: 's',
  captureId: 'c',
  comment: '请把按钮换成蓝色\n保留 <em>强调</em> 和 "引号"',
  updatedAt: 'v1',
}
const capture = {
  sessionId: 's',
  data: 'YWJj',
  url: 'http://localhost:3000/',
  width: 900,
  height: 700,
  createdAt: '2026-10-21T00:00:00Z',
  rect: { x: 1, y: 2, width: 50, height: 20 },
  scroll: { x: 0, y: 12 },
  element: {
    tag: 'button',
    text: '提交',
    selector: '#submit',
    matches: 1,
    html: '<button id="submit">提交</button>',
    styles: { color: 'red' },
    source: 'src/app.tsx:12',
  },
}
const packet = () =>
  withComposerText(
    buildPacket([note], () => capture),
    { text: '这是补充要求' },
  )
const content = (p) => [{ type: 'text', text: p.text }, ...p.images]
test('聊天展示仅投影补充文字和注释卡片，模型仍收到完整截图、DOM、样式和位置', async () => {
  const p = packet(),
    r = annotationTranscript(content(p))
  assert.equal(r.userText, '这是补充要求')
  assert.equal(r.notes[0].comment, note.comment)
  assert.equal(r.notes[0].element.html, capture.element.html)
  assert.deepEqual(r.notes[0].element.styles, capture.element.styles)
  assert.equal(r.notes[0].element.source, capture.element.source)
  assert.equal(r.images[0].data, 'YWJj')
  assert.deepEqual(r.content, [{ type: 'text', text: '这是补充要求' }])
  let echo, wire
  await deliverPacket(
    {
      beginSubmission: (e) => ((echo = e), { requestId: 'r' }),
      prompt: async (c) => (
        (wire = c),
        { ok: true, value: { accepted: true } }
      ),
    },
    p,
  )
  assert.doesNotMatch(echo.text, /DOM|selector|src\/app/)
  assert.match(echo.text, /1 条网页注释/)
  assert.equal(wire[0].text, p.text)
  assert.equal(wire[1].data, 'YWJj')
  assert.equal(
    annotationTranscript(wire).notes[0].element.html,
    capture.element.html,
  )
})
test('用户额外图片及文件仍走原生展示，截图与编号按顺序对应', () => {
  const p = packet(),
    extraImage = { type: 'image', attachment: { id: 'extra' } },
    file = { type: 'file', attachment: { name: '文档.pdf' } }
  const r = annotationTranscript([...content(p), extraImage, file])
  assert.equal(r.images.length, 1)
  assert.deepEqual(r.content.slice(1), [extraImage, file])
})
test('普通用户消息、损坏元数据和缺少截图时保留原生渲染，不能吞文字', () => {
  assert.equal(
    annotationTranscript([{ type: 'text', text: '普通消息 <div>test</div>' }]),
    null,
  )
  assert.equal(
    annotationTranscript([{ type: 'text', text: packet().text }]),
    null,
  )
  assert.equal(
    annotationTranscript([
      {
        type: 'text',
        text:
          ANNOTATION_INSTRUCTIONS +
          '\n<dsh_browser_annotations version="1">bad</dsh_browser_annotations>',
      },
      { type: 'image' },
    ]),
    null,
  )
  assert.equal(
    annotationTranscript([
      {
        type: 'text',
        text: serializeAnnotations([{ url: 'x', comment: 12, element: {} }]),
      },
      { type: 'image' },
    ]),
    null,
  )
})
test('特殊标记、HTML 和多行批注可无损往返，不把页面内容作为 HTML 执行', () => {
  const n = {
    url: 'https://example.com',
    comment: '</dsh_browser_annotations>\n<div>要求</div>',
    element: capture.element,
  }
  const text = serializeAnnotations([n])
  assert.equal((text.match(/<\/dsh_browser_annotations>/g) || []).length, 1)
  assert.equal(
    annotationTranscript([{ type: 'text', text }, { type: 'image' }]).notes[0]
      .comment,
    n.comment,
  )
})
test('旧版本已发送记录可折叠成注释卡片，并保留完整详情供审查', () => {
  const text =
    '用户补充要求：\n旧补充\n\n' +
    ANNOTATION_INSTRUCTIONS +
    '\n\n批注 1 · 对应图片 网页批注-1.jpg\n页面：https://example.com/\n用户要求：旧要求\n第二行\n目标：button · 提交\n定位：#submit（唯一性校验：唯一命中）\n视口坐标：{}\nDOM 引用：<button>提交</button>\n样式引用：{}'
  const r = annotationTranscript([
    { type: 'text', text },
    { type: 'image', attachment: { id: 'screenshot' } },
  ])
  assert.equal(r.userText, '旧补充')
  assert.equal(r.notes[0].comment, '旧要求\n第二行')
  assert.match(r.notes[0].legacyContext, /<button>/)
  assert.equal(r.notes[0].element.text, '提交')
})

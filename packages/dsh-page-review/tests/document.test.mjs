import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { JSDOM } from 'jsdom'
import {
  documentKind,
  fileResourceSession,
  documentRegions,
  documentSelection,
} from '../src/document.mjs'
import { ReviewEngine } from '../src/engine.mjs'
import { annotationTranscript } from '../src/transcript.mjs'
import { bodyOf } from '../src/host.mjs'
const sid = 'doc-test',
  address = `dsh-resource://file/session/${sid}/notes.pdf`
const args = {
  tabId: 'native-file-tab',
  document: {
    path: '/work/notes.pdf',
    resourceAddress: address,
    version: 'v1',
    regions: [{ page: 2, rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 } }],
  },
  width: 900,
  height: 700,
  rect: { x: 90, y: 140, width: 270, height: 70 },
  element: {
    tag: 'span',
    text: '文档内的目标段落',
    name: '第 2 页',
    selector: '[data-pdf-page="2"] span',
  },
  scroll: { x: 0, y: 500 },
  data: Buffer.from([255, 216, 255, 217]).toString('base64'),
}
test('文件类型和资源地址按会话隔离，不混用网页或其他会话文件', () => {
  for (const [path, kind] of [
    ['a.PDF', 'pdf'],
    ['a.docx', 'word'],
    ['a.doc', 'word'],
    ['a.md', 'markdown'],
    ['a.markdown', 'markdown'],
  ])
    assert.equal(documentKind(path), kind)
  assert.equal(documentKind('a.html'), null)
  assert.equal(fileResourceSession(address), sid)
  assert.equal(fileResourceSession('file:///private/a.pdf'), null)
})
test('跨页框选分别记录页内归一化坐标，缩放后仍可定位', () => {
  const regions = documentRegions({ x: 25, y: 80, width: 50, height: 80 }, [
    { page: 1, rect: { x: 0, y: 0, width: 100, height: 100 } },
    { page: 2, rect: { x: 0, y: 120, width: 100, height: 200 } },
  ])
  assert.deepEqual(regions, [
    { page: 1, rect: { x: 0.25, y: 0.8, width: 0.5, height: 0.2 } },
    { page: 2, rect: { x: 0.25, y: 0, width: 0.5, height: 0.2 } },
  ])
  assert.deepEqual(
    documentRegions({ x: 500, y: 500, width: 10, height: 10 }, [
      { page: 1, rect: { x: 0, y: 0, width: 100, height: 100 } },
    ]),
    [],
  )
})
test('Markdown 选区保留源文件、目标文字、行号与视口；区域裁剪到可见范围', () => {
  const dom = new JSDOM(
    '<div id="body"><div data-textpreview-line="12">需要修改的段落</div></div>',
  )
  try {
    const body = dom.window.document.querySelector('#body'),
      target = body.firstChild
    body.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      width: 600,
      height: 400,
    })
    target.getBoundingClientRect = () => ({
      left: 80,
      top: 100,
      width: 300,
      height: 40,
    })
    const selected = documentSelection(body, { x: 20, y: 70 }, null, target, {
      path: '/work/a.md',
      kind: 'markdown',
      resourceAddress: 'file-resource',
    })
    assert.equal(selected.document.line, 12)
    assert.equal(selected.element.text, '需要修改的段落')
    assert.deepEqual(selected.rect, { x: 0, y: 50, width: 280, height: 40 })
    assert.equal(selected.document.path, '/work/a.md')
    assert.throws(
      () =>
        documentSelection(body, { x: 20, y: 70 }, null, target, {
          kind: 'pdf',
          path: '/work/loading.pdf',
        }),
      /尚未加载完成/,
    )
  } finally {
    dom.window.close()
  }
})
test('文件截图和定位跨重启保留，并与网页批注共用真正图片块及聊天卡片', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-file-notes-'))
  try {
    const engine = new ReviewEngine(root),
      s = await engine.session(sid),
      capture = await engine.documentCapture(s, args)
    await engine.note(s, {
      captureId: capture.id,
      comment: '调整这个段落的排版',
    })
    assert.equal(s.notes[0].document.path, args.document.path)
    const reopened = new ReviewEngine(root),
      restored = await reopened.session(sid),
      packet = await reopened.prepare(restored, [restored.notes[0].id])
    assert.equal(packet.images[0].type, 'image')
    assert.equal(packet.images[0].data, args.data)
    assert.equal(packet.images[0].name, '文件批注-1.jpg')
    const view = annotationTranscript([
      { type: 'text', text: packet.text },
      ...packet.images,
    ])
    assert.equal(view.notes[0].document.regions[0].page, 2)
    assert.equal(view.notes[0].document.version, 'v1')
    assert.equal(view.notes[0].comment, '调整这个段落的排版')
    assert.equal(view.content.length, 0)
    await reopened.acknowledge(restored, packet.deliveryId)
    assert.equal(restored.notes.length, 0)
    assert.equal(restored.history[0].notes[0].document.path, args.document.path)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
test('拒绝其他会话资源、越界选区、非截图数据及不支持的文件类型', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-file-invalid-'))
  try {
    const engine = new ReviewEngine(root),
      s = await engine.session(sid)
    await assert.rejects(
      engine.documentCapture(s, {
        ...args,
        document: {
          ...args.document,
          resourceAddress: 'dsh-resource://file/session/other/a.pdf',
        },
      }),
      /来源/,
    )
    await assert.rejects(
      engine.documentCapture(s, {
        ...args,
        rect: { x: -1, y: 0, width: 10, height: 10 },
      }),
      /坐标/,
    )
    await assert.rejects(
      engine.documentCapture(s, {
        ...args,
        data: Buffer.from('not an image').toString('base64'),
      }),
      /截图/,
    )
    await assert.rejects(
      engine.documentCapture(s, {
        ...args,
        document: { ...args.document, path: 'a.exe' },
      }),
      /来源/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
test('文件截图上传可采用专用容量限制，其他请求仍受原有大小限制', async () => {
  const data = Buffer.from(JSON.stringify({ data: 'a'.repeat(200000) }))
  await assert.rejects(bodyOf(Readable.from([data])), /请求过大/)
  assert.equal(
    (await bodyOf(Readable.from([data]), 1024 * 1024)).data.length,
    200000,
  )
})

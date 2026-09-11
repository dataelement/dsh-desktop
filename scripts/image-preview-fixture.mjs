/** Persist a simulated successful tool result through the real Harness log writer. */
import path from 'node:path'
import { mkdir, realpath } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import { SESSION_FORMAT_VERSION, Session, SessionStore } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { createUserMessage, createAssistantMessage, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import sharp from 'sharp'
import { materialize } from '../packages/dsh-image-generation/lib/storage.js'

export async function imagePreviewFixture(home) {
  const directory = path.join(home, 'preview-workspace'); await mkdir(directory)
  const cwd = await realpath(directory)
  const png = await sharp(Buffer.from('<svg width="960" height="540" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#739fae"/><stop offset="1" stop-color="#dce3c1"/></linearGradient></defs><rect width="960" height="540" fill="url(#sky)"/><circle cx="700" cy="125" r="50" fill="#ffe9a3"/><path d="M0 360L200 120L470 400L630 230L960 430V540H0" fill="#406e6d"/><path d="M0 450L240 350L510 470L800 330L960 390V540H0" fill="#294d51"/><text x="32" y="510" fill="#ffffff" font-size="24">Image preview fixture</text></svg>')).png().toBuffer()
  const asset = await materialize(cwd, png)
  const image = { ...asset, asset_id: `sha256:${asset.sha256}`, media_type: 'image/png', width: 960, height: 540, bytes: png.length, provider: 'bytedance', model: 'doubao-seedream-5-0-pro-260628' }
  const id = `session-${randomUUID()}`
  const session = Session.create(id, undefined, { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), isSeeded: false, cwd, delegationDepth: 0 })
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '图片预览验收：展示模拟生图结果' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  const args = { prompt: 'Landscape preview fixture', aspect_ratio: '16:9' }
  session.append('assistant/message', { turn: 1, step: 1, stream: [], message: createAssistantMessage({ source: { provider: 'fixture', model: 'fixture' }, content: [{ type: 'tool-call', callId: 'image-fixture', name: 'image_generate', arguments: JSON.stringify(args) }] }) }, { surfaceOp: 'append' })
  session.append('tool/call', { turn: 1, step: 1, callId: 'image-fixture', name: 'image_generate', arguments: JSON.stringify(args) })
  session.append('tool/result', { turn: 1, step: 1, message: createToolResultMessage({ callId: 'image-fixture', content: [{ type: 'text', text: JSON.stringify(image) }], isError: false }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('step/start', { turn: 1, step: 2 })
  session.append('assistant/message', { turn: 1, step: 2, stream: [], message: createAssistantMessage({ source: { provider: 'fixture', model: 'fixture' }, content: [{ type: 'text', text: '图片已生成，点击下方缩略图可放大查看。' }] }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 2 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  const ctx = new Context(); const forks = []
  try {
    for (const [plugin, config] of [[SessionStore, {}], [JsonlSessionPersistence, { root: path.join(home, 'sessions') }]]) { const fork = ctx.plugin(plugin, config); forks.push(fork); await fork }
    const handle = await ctx.sessionPersistence.create(session.header)
    try {
      await handle.append(session.snapshotEvents())
      await handle.flush()
    } finally {
      await handle.close()
    }
  } finally { for (const fork of forks.reverse()) await fork.dispose() }
  return { sessionId: session.id, image, png }
}

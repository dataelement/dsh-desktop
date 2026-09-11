import { open, realpath } from 'node:fs/promises'
import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { assetDirectory } from './assets.js'
import { ImageError, MAX_IMAGE_BYTES } from './provider.js'

/** Read only canonical image results, including results created before previews existed. */
export function imageResult(content) {
  if (!Array.isArray(content)) return
  for (const block of content) {
    if (block?.type !== 'text' || typeof block.text !== 'string' || block.text.length > 16384) continue
    let value
    try { value = JSON.parse(block.text) } catch { continue }
    if (value && /^[a-f0-9]{64}$/.test(value.sha256) && value.asset_id === `sha256:${value.sha256}`
      && value.workspace_path === `.workbuddy/generated-images/${value.sha256}.png` && value.media_type === 'image/png'
      && Number.isInteger(value.width) && value.width > 0 && Number.isInteger(value.height) && value.height > 0
      && Number.isInteger(value.bytes) && value.bytes > 0 && value.bytes <= MAX_IMAGE_BYTES) return value
  }
}

/** The session's successful image tool result grants access to exactly that immutable PNG. */
function referencedImage(events, sha) {
  const calls = new Map()
  for (const event of events) {
    if (event.type === 'tool/call') calls.set(event.data.callId, event.data.name)
    let result
    if (event.type === 'tool/result' && event.surfaceOp === 'append' && calls.get(event.data.message?.source?.callId) === 'image_generate') result = event.data.message.content[0]
    if (event.type === 'tool/code-dispatch' && event.data.name === 'image_generate') result = event.data
    if (result && !result.isError) {
      const image = imageResult(result.content)
      if (image?.sha256 === sha) return image
    }
  }
}

export async function previewImage(ctx, request) {
  let file
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session')
    const sha = url.searchParams.get('asset')
    if (!sessionId || sessionId.length > 1024 || /[\u0000-\u001f\u007f]/.test(sessionId) || !/^[a-f0-9]{64}$/.test(sha ?? '')) throw new ImageError('PREVIEW', 'Invalid image reference.', 400)
    // Harness IDs are opaque (Desktop uses session-<uuid>). The controller
    // resolves their identity; only the authorized result supplies a file path.
    const inspection = await ctx.sessionController.inspect(sessionId, request.signal)
    const image = referencedImage(inspection.events, sha)
    if (!image || !inspection.meta.cwd) throw new ImageError('PREVIEW', 'Image is unavailable in this session.', 404)
    const root = await realpath(inspection.meta.cwd)
    const directory = await assetDirectory(root)
    const target = path.join(directory, `${sha}.png`)
    file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const info = await file.stat()
    if (!info.isFile() || info.size > MAX_IMAGE_BYTES || info.size !== image.bytes || await realpath(target) !== target) throw new ImageError('PREVIEW', 'Image file is unavailable.', 404)
    const data = Buffer.alloc(info.size)
    let offset = 0
    while (offset < data.length) {
      request.signal.throwIfAborted()
      const { bytesRead } = await file.read(data, offset, data.length - offset, offset)
      if (!bytesRead) break
      offset += bytesRead
    }
    if (offset !== data.length || createHash('sha256').update(data).digest('hex') !== sha || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new ImageError('PREVIEW', 'The generated image has changed.', 404)
    ctx.logger.info('image-generation: preview allowed; session=%s asset=%s', sessionId, sha)
    return new Response(data, { headers: { 'Content-Type': 'image/png', 'Content-Length': String(data.length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline; filename="generated-image.png"' } })
  } catch (error) {
    ctx.logger.info('image-generation: preview unavailable')
    return Response.json({ code: 'PREVIEW', error: 'Image preview is unavailable.' }, { status: error instanceof ImageError && error.code === 'PREVIEW' ? error.status : 404, headers: { 'Cache-Control': 'no-store' } })
  } finally { await file?.close() }
}

import { serializeAnnotations, annotationSummary } from './transcript.mjs'
export function buildPacket(notes, captureOf) {
  if (!notes.length) throw Error('请先保存至少一条批注')
  if (notes.length > 12) throw Error('每次最多发送 12 条批注，请分批发送')
  const images = [],
    versions = [],
    context = []
  let bytes = 0
  notes.forEach((note, index) => {
    const c = captureOf(note.captureId)
    if (!c?.data || c.sessionId !== note.sessionId)
      throw Error('截图缺失，批注未发送；请重新选取此元素')
    bytes += (c.data.length * 3) / 4
    const n = index + 1,
      name = `${c.document ? '文件' : '网页'}批注-${n}.jpg`,
      el = c.element
    images.push({
      type: 'image',
      mediaType: 'image/jpeg',
      data: c.data,
      name,
      width: c.width,
      height: c.height,
    })
    versions.push({
      id: note.id,
      updatedAt: note.updatedAt,
      comment: note.comment,
    })
    context.push({
      number: n,
      image: name,
      id: note.id,
      captureId: note.captureId,
      url: c.url,
      comment: note.comment,
      element: el,
      rect: c.rect,
      viewport: { width: c.width, height: c.height },
      scroll: c.scroll,
      capturedAt: c.createdAt,
      ...(c.document ? { document: c.document } : {}),
    })
  })
  if (bytes > 12 * 1024 * 1024)
    throw Error('截图总大小超过 12 MB，请减少本次发送的批注')
  return {
    text: serializeAnnotations(context),
    displayText: annotationSummary(context),
    images,
    versions,
  }
}

export function acceptedVersions(notes, versions) {
  const accepted = new Map(versions.map((x) => [x.id, x]))
  return notes.filter((n) => {
    const sent = accepted.get(n.id)
    return !(
      sent &&
      sent.updatedAt === n.updatedAt &&
      sent.comment === n.comment
    )
  })
}

export async function deliverPacket(session, packet, attempt = {}, extra = {}) {
  if (!session?.beginSubmission || !session?.prompt)
    throw Error('当前对话暂不支持发送，请先打开一个有效会话')
  if (!attempt.submission)
    attempt.submission = session.beginSubmission({
      mode: 'queue',
      text: packet.displayText ?? packet.text,
      attachments: [
        ...packet.images.map((im) => ({
          type: 'image',
          value: {
            previewUrl: `data:${im.mediaType};base64,${im.data}`,
            name: im.name,
            width: im.width,
            height: im.height,
          },
        })),
        ...(extra.pending || []),
      ],
      ...(extra.onRetire ? { onRetire: extra.onRetire } : {}),
    })
  const result = await session.prompt(
    [
      { type: 'text', text: packet.text },
      ...packet.images.map(({ width, height, ...image }) => image),
      ...(extra.content || []),
    ],
    'queue',
    undefined,
    attempt.submission.requestId,
  )
  if (!result?.ok || !result.value?.accepted) {
    const error = Error(
      result?.error?.message || '会话未确认接收，批注和截图已保留',
    )
    // An explicit negative admission can be rebuilt after the user repairs an
    // attachment. A thrown transport error has no such proof and keeps its id.
    error.admissionRejected =
      result?.ok === false || result?.value?.accepted === false
    throw error
  }
  return result
}

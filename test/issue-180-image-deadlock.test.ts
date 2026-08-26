import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const conversationPatch = patchPath('@deepseek-ai/dsh-client-ui-conversation')

/**
 * Regression coverage for the "image-deadlock" recovery added in response to
 * dsh-desktop#180: when a user attaches images to a vision-capable model,
 * hits a non-image send failure (e.g. invalid API key), and then switches to
 * a text-only model, the composer re-rejects every subsequent send with
 * `MODEL_DOES_NOT_SUPPORT_IMAGES` because the draft images are still attached
 * and there is no UI path to clear them. The patched InputBar watches for
 * that exact promptError and drops the draft images so the user can keep
 * sending text without manually removing the attachments.
 */
describe('conversation InputBar image-deadlock recovery', () => {
  it('auto-drops draft images after a MODEL_DOES_NOT_SUPPORT_IMAGES promptError', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    // The recovery useEffect must be present, gated on the exact
    // attachment-error / MODEL_DOES_NOT_SUPPORT_IMAGES shape that the wire
    // protocol produces — anything looser would clear attachments on every
    // unrelated prompt error.
    expect(patch).toContain(
      'Recover from a deadlocking "model doesn\'t support images" send.'
    )
    expect(patch).toContain('promptError.error.code !== "attachment-error"')
    expect(patch).toContain(
      'promptError.error.details?.reason !== "MODEL_DOES_NOT_SUPPORT_IMAGES"'
    )
    expect(patch).toContain('inputActions === void 0 || removeImage === void 0')
    expect(patch).toContain('attachments.length === 0')
    expect(patch).toContain('for (const attachment of attachments) removeImage(attachment.id)')
  })

  it('surfaces a user-facing toast when the recovery fires', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    // The recovery must tell the user why their attachments disappeared —
    // silently dropping them is more confusing than the deadlock.
    expect(patch).toContain('showToast(t("image.attachmentsClearedForModel"))')
  })

  it('ships localized copy for both supported locales', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    // Chinese (zh) and English (default) — the two locales the desktop
    // bundle ships. A missing translation key would fall back to the raw
    // key in the toast, which is worse than no toast at all.
    expect(patch).toContain(
      '"image.attachmentsClearedForModel": "已移除当前模型不支持的图片，可继续发送文字"'
    )
    expect(patch).toContain(
      '"image.attachmentsClearedForModel": "Removed images the current model can\'t process; you can keep sending text"'
    )
  })

  it('keeps the recovery effect off the existing promptError-toast effect', async () => {
    const patch = await readFile(conversationPatch, 'utf8')

    // The pre-existing effect just toasts whatever promptError says. The
    // new effect is gated on a specific code/reason, so it must NOT
    // unconditionally re-toast the same MODEL_DOES_NOT_SUPPORT_IMAGES
    // message — that would double-toast the user once we clear the
    // images. The presence of the dedicated `attachmentsClearedForModel`
    // key in the toast call is what guarantees the differentiation.
    const recoveryToast = patch.match(
      /showToast\(t\("image\.attachmentsClearedForModel"\)\)/g
    )
    expect(recoveryToast).not.toBeNull()
    expect(recoveryToast!.length).toBe(1)
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  HARNESS_BOOT_COVER_CSS,
  HarnessBootCover,
  createHarnessBootCoverSession,
  isHarnessBootCoverUrl,
  noteHarnessBootCoverInstallStarted,
  noteHarnessBootCoverNavigation,
  noteHarnessBootCoverReveal,
  restoreHarnessBootCoverKey,
  settleHarnessBootCoverInstall,
  shouldInstallHarnessBootCover
} from '../src/main/harness-boot-cover'

describe('harness boot cover', () => {
  it('covers the packaged shell and legacy loopback page, but not other documents', () => {
    expect(isHarnessBootCoverUrl('dsh-desktop://harness/')).toBe(true)
    expect(isHarnessBootCoverUrl('http://127.0.0.1:43129/')).toBe(true)
    expect(isHarnessBootCoverUrl('dsh-desktop://harness.evil/')).toBe(false)
    expect(isHarnessBootCoverUrl('dsh-desktop://user@harness/')).toBe(false)
    expect(isHarnessBootCoverUrl('https://example.com/')).toBe(false)
    expect(isHarnessBootCoverUrl('file:///tmp/plugin-recovery.html')).toBe(false)
    expect(isHarnessBootCoverUrl('dsh-desktop://desktop/safe-mode.html')).toBe(false)
  })

  it('hides the boot document without hiding the desktop cover', () => {
    expect(HARNESS_BOOT_COVER_CSS).toContain('body, body * { visibility: hidden !important; }')
    expect(HARNESS_BOOT_COVER_CSS).toContain('#dsh-desktop-boot-cover')
  })

  it('keeps an insert only when it still belongs to this Harness document', () => {
    const harness = 'dsh-desktop://harness/'
    let session = noteHarnessBootCoverInstallStarted(createHarnessBootCoverSession())
    expect(shouldInstallHarnessBootCover(session, harness)).toBe(false)
    const kept = settleHarnessBootCoverInstall(session, session.generation, harness, 'css-1')
    expect(kept.staleKey).toBeUndefined()
    expect(kept.session.cssKey).toBe('css-1')
    expect(shouldInstallHarnessBootCover(kept.session, harness)).toBe(false)

    session = noteHarnessBootCoverInstallStarted(createHarnessBootCoverSession())
    const started = session.generation
    session = noteHarnessBootCoverNavigation(session, 'file:///tmp/splash.html')
    const replaced = settleHarnessBootCoverInstall(session, started, 'file:///tmp/splash.html', 'css-late')
    expect(replaced.staleKey).toBe('css-late')
    expect(replaced.session.cssKey).toBeUndefined()
    expect(replaced.session.dismissed).toBe(true)
  })

  it('retires an in-flight insert when the page is revealed', () => {
    const harness = 'dsh-desktop://harness/'
    let session = noteHarnessBootCoverInstallStarted(createHarnessBootCoverSession())
    const started = session.generation
    const revealed = noteHarnessBootCoverReveal(session)
    const settled = settleHarnessBootCoverInstall(revealed.session, started, harness, 'css-late')
    expect(revealed.cssKey).toBeUndefined()
    expect(settled.staleKey).toBe('css-late')
    expect(shouldInstallHarnessBootCover(settled.session, harness)).toBe(false)
  })

  it('returns the installed key on reveal and can restore it when removal fails', () => {
    const harness = 'dsh-desktop://harness/'
    const installed = settleHarnessBootCoverInstall(
      noteHarnessBootCoverInstallStarted(createHarnessBootCoverSession()),
      0,
      harness,
      'css-1'
    )
    const revealed = noteHarnessBootCoverReveal(installed.session)
    expect(revealed.cssKey).toBe('css-1')
    expect(revealed.session.cssKey).toBeUndefined()
    const restored = restoreHarnessBootCoverKey(revealed.session, revealed.session.generation, 'css-1')
    expect(restored.cssKey).toBe('css-1')
    expect(restored.dismissed).toBe(true)
    expect(shouldInstallHarnessBootCover(restored, harness)).toBe(false)
  })
})

describe('window-owned boot cover', () => {
  function contents() {
    return {
      isDestroyed: () => false,
      getURL: vi.fn(() => 'dsh-desktop://harness/'),
      insertCSS: vi.fn(async () => 'css-1'),
      removeInsertedCSS: vi.fn(async (_key: string) => {})
    }
  }

  it('removes a late insertion after recovery navigation without covering the recovery page', async () => {
    const window = contents()
    let finish: (key: string) => void = () => {}
    window.insertCSS.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const cover = new HarnessBootCover(window)
    const pending = cover.conceal(window.getURL())
    window.getURL.mockReturnValue('file:///plugin-recovery.html')
    cover.navigate(window.getURL())
    finish('late')
    await pending
    expect(window.removeInsertedCSS).toHaveBeenCalledWith('late')
    await cover.conceal(window.getURL())
    expect(window.insertCSS).toHaveBeenCalledTimes(1)
  })

  it('keeps a failed removal retryable and never reveals another window', async () => {
    const first = contents(), second = contents()
    const cover = new HarnessBootCover(first), other = new HarnessBootCover(second)
    await cover.conceal(first.getURL())
    await other.conceal(second.getURL())
    first.removeInsertedCSS.mockRejectedValueOnce(new Error('remove failed'))
    await expect(cover.reveal()).rejects.toThrow('remove failed')
    await cover.reveal()
    expect(first.removeInsertedCSS).toHaveBeenCalledTimes(2)
    expect(second.removeInsertedCSS).not.toHaveBeenCalled()
  })

  it('can retry failed insertion and does not hide an already revealed document', async () => {
    const window = contents()
    window.insertCSS.mockRejectedValueOnce(new Error('insert failed'))
    const cover = new HarnessBootCover(window)
    await expect(cover.conceal(window.getURL())).rejects.toThrow('insert failed')
    await cover.conceal(window.getURL())
    await cover.reveal()
    await cover.conceal(window.getURL())
    expect(window.insertCSS).toHaveBeenCalledTimes(2)
  })
})

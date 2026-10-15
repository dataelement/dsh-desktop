import { describe, expect, it } from 'vitest'
import {
  HARNESS_BOOT_COVER_CSS,
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
  it('covers only the loopback Harness origin', () => {
    expect(isHarnessBootCoverUrl('http://127.0.0.1:43130/')).toBe(true)
    expect(isHarnessBootCoverUrl('file:///tmp/plugin-recovery.html')).toBe(false)
    expect(isHarnessBootCoverUrl('dsh-desktop://desktop/safe-mode.html')).toBe(false)
  })

  it('hides the boot document without hiding the desktop cover', () => {
    expect(HARNESS_BOOT_COVER_CSS).toContain('body, body * { visibility: hidden !important; }')
    expect(HARNESS_BOOT_COVER_CSS).toContain('#dsh-desktop-boot-cover')
  })

  it('keeps an insert only when it still belongs to this Harness document', () => {
    const harness = 'http://127.0.0.1:43130/'
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
    const harness = 'http://127.0.0.1:43130/'
    let session = noteHarnessBootCoverInstallStarted(createHarnessBootCoverSession())
    const started = session.generation
    const revealed = noteHarnessBootCoverReveal(session)
    const settled = settleHarnessBootCoverInstall(revealed.session, started, harness, 'css-late')
    expect(revealed.cssKey).toBeUndefined()
    expect(settled.staleKey).toBe('css-late')
    expect(shouldInstallHarnessBootCover(settled.session, harness)).toBe(false)
  })

  it('returns the installed key on reveal and can restore it when removal fails', () => {
    const harness = 'http://127.0.0.1:43130/'
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

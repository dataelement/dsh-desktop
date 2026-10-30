import { isHarnessBootPage } from '../shared/harness-boot'

export const HARNESS_BOOT_COVER_CSS = `
  html { background: #f8f8f6 !important; }
  @media (prefers-color-scheme: dark) {
    html { background: #141416 !important; }
  }
  body, body * { visibility: hidden !important; }
  #dsh-desktop-boot-cover, #dsh-desktop-boot-cover * { visibility: visible !important; }
`

export const isHarnessBootCoverUrl = isHarnessBootPage

/**
 * One main window owns this session. `generation` advances whenever the
 * document changes or the page is deliberately revealed, so an insertCSS that
 * resolves late cannot hide the document that replaced it.
 */
export interface HarnessBootCoverSession {
  cssKey?: string
  dismissed: boolean
  generation: number
  pendingGeneration?: number
}

export function createHarnessBootCoverSession(): HarnessBootCoverSession {
  return { dismissed: false, generation: 0 }
}

/** A full navigation leaves the document that owns the current rule. */
export function noteHarnessBootCoverNavigation(
  session: HarnessBootCoverSession,
  url: string
): HarnessBootCoverSession {
  return {
    dismissed: !isHarnessBootCoverUrl(url),
    generation: session.generation + 1
  }
}

export function shouldInstallHarnessBootCover(
  session: HarnessBootCoverSession,
  url: string
): boolean {
  return isHarnessBootCoverUrl(url)
    && !session.dismissed
    && session.cssKey === undefined
    && session.pendingGeneration !== session.generation
}

export function noteHarnessBootCoverInstallStarted(
  session: HarnessBootCoverSession
): HarnessBootCoverSession {
  return { ...session, pendingGeneration: session.generation }
}

export interface HarnessBootCoverInstallSettlement {
  session: HarnessBootCoverSession
  /** Present when this insert landed after the document changed or was revealed. */
  staleKey?: string
}

export function settleHarnessBootCoverInstall(
  session: HarnessBootCoverSession,
  startedGeneration: number,
  url: string,
  cssKey: string
): HarnessBootCoverInstallSettlement {
  const pendingGeneration = session.pendingGeneration === startedGeneration
    ? undefined
    : session.pendingGeneration
  const current = { ...session, pendingGeneration }
  const stale = current.dismissed
    || current.generation !== startedGeneration
    || !isHarnessBootCoverUrl(url)
  if (stale) return { session: current, staleKey: cssKey }
  return { session: { ...current, cssKey } }
}

export interface HarnessBootCoverReveal {
  session: HarnessBootCoverSession
  cssKey?: string
}

/** Showing the page retires the current rule and any insert still in flight. */
export function noteHarnessBootCoverReveal(
  session: HarnessBootCoverSession
): HarnessBootCoverReveal {
  return {
    session: {
      dismissed: true,
      generation: session.generation + 1
    },
    cssKey: session.cssKey
  }
}

/** Keep the key when removal failed, so a later reveal can try again. */
export function restoreHarnessBootCoverKey(
  session: HarnessBootCoverSession,
  revealedGeneration: number,
  cssKey: string
): HarnessBootCoverSession {
  if (session.generation !== revealedGeneration || session.cssKey !== undefined) return session
  return { ...session, cssKey }
}

export async function installHarnessBootCover(
  contents: { insertCSS(css: string): Promise<string> }
): Promise<string> {
  return contents.insertCSS(HARNESS_BOOT_COVER_CSS)
}

export async function removeHarnessBootCover(
  contents: { removeInsertedCSS(key: string): Promise<void> },
  key: string
): Promise<void> {
  await contents.removeInsertedCSS(key)
}

interface BootCoverContents {
  isDestroyed(): boolean
  getURL(): string
  insertCSS(css: string): Promise<string>
  removeInsertedCSS(key: string): Promise<void>
}

/** A window owns its CSS keys; other windows and superseded documents cannot reveal them. */
export class HarnessBootCover {
  private session = createHarnessBootCoverSession()

  constructor(private readonly contents: BootCoverContents) {}

  navigate(url: string): void {
    this.session = noteHarnessBootCoverNavigation(this.session, url)
  }

  async conceal(url: string): Promise<void> {
    if (this.contents.isDestroyed() || !shouldInstallHarnessBootCover(this.session, url)) return
    const generation = this.session.generation
    this.session = noteHarnessBootCoverInstallStarted(this.session)
    let cssKey: string
    try {
      cssKey = await installHarnessBootCover(this.contents)
    } catch (error) {
      if (this.session.pendingGeneration === generation) {
        this.session = { ...this.session, pendingGeneration: undefined }
      }
      throw error
    }
    const settled = settleHarnessBootCoverInstall(this.session, generation,
      this.contents.isDestroyed() ? '' : this.contents.getURL(), cssKey)
    this.session = settled.session
    if (!settled.staleKey || this.contents.isDestroyed()) return
    // A late insertion may have landed on the replacement document.
    const currentGeneration = this.session.generation
    try {
      await removeHarnessBootCover(this.contents, settled.staleKey)
    } catch (error) {
      this.session = restoreHarnessBootCoverKey(this.session, currentGeneration, settled.staleKey)
      throw error
    }
  }

  async reveal(): Promise<void> {
    const revealed = noteHarnessBootCoverReveal(this.session)
    this.session = revealed.session
    if (!revealed.cssKey || this.contents.isDestroyed()) return
    try {
      await removeHarnessBootCover(this.contents, revealed.cssKey)
    } catch (error) {
      this.session = restoreHarnessBootCoverKey(this.session, revealed.session.generation, revealed.cssKey)
      throw error
    }
  }
}

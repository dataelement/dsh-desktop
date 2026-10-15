export const HARNESS_BOOT_COVER_CSS = `
  html { background: #f8f8f6 !important; }
  @media (prefers-color-scheme: dark) {
    html { background: #141416 !important; }
  }
  body, body * { visibility: hidden !important; }
  #dsh-desktop-boot-cover, #dsh-desktop-boot-cover * { visibility: visible !important; }
`

export function isHarnessBootCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' && parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

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

type RoutedFrame = {
  processId: number
  routingId: number
}

type TrustedWindowEvent = {
  sender: unknown
  senderFrame: RoutedFrame | null
}

export type TrustedWindow = {
  isDestroyed(): boolean
  webContents: {
    mainFrame: RoutedFrame
  }
}

export function isTrustedMainWindowEvent(
  event: TrustedWindowEvent,
  window: TrustedWindow
): boolean {
  const senderFrame = event.senderFrame
  const mainFrame = window.webContents.mainFrame
  return !window.isDestroyed() &&
    event.sender === window.webContents &&
    senderFrame !== null &&
    senderFrame.processId === mainFrame.processId &&
    senderFrame.routingId === mainFrame.routingId
}

export function assertTrustedMainWindowEvent(
  event: TrustedWindowEvent,
  window: TrustedWindow | undefined
): asserts window is TrustedWindow {
  if (!window || !isTrustedMainWindowEvent(event, window)) {
    throw new Error('This action is only available from the main Sherlock window.')
  }
}

type RoutedFrame = {
  processId: number
  routingId: number
}

type TrustedWindowEvent = {
  sender: unknown
  senderFrame: RoutedFrame | null
}

type TrustedWindow = {
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

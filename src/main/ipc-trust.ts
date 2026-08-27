type RoutedFrame = {
  processId: number
  routingId: number
}

export type TrustedWindowEvent = {
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

export function registerTrustedMainWindowHandler<
  Event extends TrustedWindowEvent,
  Arguments extends unknown[],
  Result
>(
  ipcMain: {
    handle(
      channel: string,
      handler: (event: Event, ...args: Arguments) => Result
    ): unknown
  },
  channel: string,
  getMainWindow: () => TrustedWindow | undefined,
  handler: (event: Event, ...args: Arguments) => Result
): void {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedMainWindowEvent(event, getMainWindow())
    return handler(event, ...args)
  })
}

export function registerTrustedMainWindowListener<
  Event extends TrustedWindowEvent & { returnValue: unknown },
  Arguments extends unknown[],
  Result
>(
  ipcMain: {
    on(
      channel: string,
      listener: (event: Event, ...args: Arguments) => void
    ): unknown
  },
  channel: string,
  getMainWindow: () => TrustedWindow | undefined,
  listener: (event: Event, ...args: Arguments) => Result,
  rejectedValue: Result,
  onRejected?: (error: unknown) => void
): void {
  ipcMain.on(channel, (event, ...args) => {
    try {
      assertTrustedMainWindowEvent(event, getMainWindow())
      event.returnValue = listener(event, ...args)
    } catch (error) {
      onRejected?.(error)
      event.returnValue = rejectedValue
    }
  })
}

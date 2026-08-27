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

type PrivilegedMainWindowIpc = {
  removeHandler(channel: string): void
  removeAllListeners(channel: string): unknown
  handle(
    channel: string,
    handler: (event: any, ...args: any[]) => unknown
  ): unknown
  on(
    channel: string,
    listener: (event: any, ...args: any[]) => void
  ): unknown
}

type PrivilegedMainWindowHandlerOptions = {
  ipcMain: PrivilegedMainWindowIpc
  getMainWindow(): TrustedWindow | undefined
  showHarnessLog(): void
  openDirectory(): Promise<string | null>
  showItemInFolder(path: unknown): { ok: boolean }
  researchFilesAvailable(paths: unknown): Promise<boolean[]>
  researchCanvasStorageGet(key: unknown): string | null
  researchCanvasStorageSet(key: unknown, value: unknown): boolean
  onStorageReadRejected?(error: unknown): void
  onStorageWriteRejected?(error: unknown): void
}

export function registerPrivilegedMainWindowHandlers(
  options: PrivilegedMainWindowHandlerOptions
): void {
  const { ipcMain, getMainWindow } = options

  ipcMain.removeHandler('harness:show-log')
  registerTrustedMainWindowHandler(
    ipcMain,
    'harness:show-log',
    getMainWindow,
    () => options.showHarnessLog()
  )

  ipcMain.removeHandler('directory-picker:open')
  registerTrustedMainWindowHandler(
    ipcMain,
    'directory-picker:open',
    getMainWindow,
    () => options.openDirectory()
  )

  ipcMain.removeHandler('filesystem:show-item-in-folder')
  registerTrustedMainWindowHandler(
    ipcMain,
    'filesystem:show-item-in-folder',
    getMainWindow,
    (_event, path: unknown) => options.showItemInFolder(path)
  )

  ipcMain.removeHandler('research:files-available')
  registerTrustedMainWindowHandler(
    ipcMain,
    'research:files-available',
    getMainWindow,
    (_event, paths: unknown) => options.researchFilesAvailable(paths)
  )

  ipcMain.removeAllListeners('research:canvas-storage:get')
  registerTrustedMainWindowListener(
    ipcMain,
    'research:canvas-storage:get',
    getMainWindow,
    (_event, key: unknown) => options.researchCanvasStorageGet(key),
    null,
    options.onStorageReadRejected
  )

  ipcMain.removeAllListeners('research:canvas-storage:set')
  registerTrustedMainWindowListener(
    ipcMain,
    'research:canvas-storage:set',
    getMainWindow,
    (_event, key: unknown, value: unknown) =>
      options.researchCanvasStorageSet(key, value),
    false,
    options.onStorageWriteRejected
  )
}

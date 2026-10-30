import { app, BrowserWindow, ipcMain, Notification, type IpcMainEvent } from 'electron'
import { existsSync } from 'node:fs'

export interface DesktopNotificationPayload {
  id: number
  title: string
  options?: {
    body?: string
    icon?: string
    tag?: string
    silent?: boolean
  }
}

export function registerDesktopNotificationBridge(
  getMainWindow: () => BrowserWindow | undefined,
  getIconPath: () => string
): () => void {
  const activeNotifications = new Map<number, Notification>()

  const handleShow = (event: IpcMainEvent, payload: unknown): void => {
    if (!payload || typeof payload !== 'object') return
    const { id, title, options } = payload as Partial<DesktopNotificationPayload>
    if (typeof id !== 'number' || typeof title !== 'string') return

    const opts = options && typeof options === 'object' ? options : {}
    const body = typeof opts.body === 'string' ? opts.body : undefined
    const silent = typeof opts.silent === 'boolean' ? opts.silent : false

    if (typeof Notification?.isSupported === 'function' && !Notification.isSupported()) {
      return
    }

    const iconPath = getIconPath()
    const notification = new Notification({
      title,
      body,
      silent,
      icon: iconPath && existsSync(iconPath) ? iconPath : undefined
    })

    activeNotifications.set(id, notification)

    notification.on('click', () => {
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
      if (process.platform === 'darwin') {
        app.focus({ steal: true })
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send('dsh:notification-clicked', id)
      }
    })

    notification.on('close', () => {
      activeNotifications.delete(id)
      if (!event.sender.isDestroyed()) {
        event.sender.send('dsh:notification-closed', id)
      }
    })

    notification.show()
  }

  const handleClose = (_event: IpcMainEvent, id: unknown): void => {
    if (typeof id !== 'number') return
    const notification = activeNotifications.get(id)
    if (notification) {
      activeNotifications.delete(id)
      notification.close()
    }
  }

  ipcMain.removeAllListeners('dsh:notification-show')
  ipcMain.removeAllListeners('dsh:notification-close')
  ipcMain.on('dsh:notification-show', handleShow)
  ipcMain.on('dsh:notification-close', handleClose)

  return () => {
    ipcMain.removeListener('dsh:notification-show', handleShow)
    ipcMain.removeListener('dsh:notification-close', handleClose)
    for (const notification of activeNotifications.values()) {
      notification.close()
    }
    activeNotifications.clear()
  }
}

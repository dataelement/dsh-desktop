import type { MenuItemConstructorOptions } from 'electron'
import { formatZoomPercentage, type DesktopMenuCommand } from '../shared/desktop-menu'

/**
 * The two caption menus the Windows page shows beside the sidebar toggle, in
 * the seat the upstream Desktop uses. The popups are native so they paint over
 * the page, the webviews and the caption controls without a separate view.
 */
export const windowsMenuNames = ['application', 'edit'] as const
export type WindowsMenuName = (typeof windowsMenuNames)[number]

/** Editing keys go to the focused editor, whose own history ignores Chromium's native undo stack. */
export type EditingKey = { keyCode: string; modifiers: Array<'control'> }

export interface WindowsMenuActions {
  run(command: DesktopMenuCommand): void
  sendEditingKey(key: EditingKey): void
}

export interface WindowsMenuRequest {
  name: WindowsMenuName
  x: number
  y: number
}

/** Validate a popup request from the page: a known menu anchored inside the window. */
export function parseWindowsMenuRequest(name: unknown, x: unknown, y: unknown): WindowsMenuRequest {
  const coordinate = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000
  if (!windowsMenuNames.includes(name as WindowsMenuName) || !coordinate(x) || !coordinate(y)) {
    throw new Error('The Windows caption menu request is invalid.')
  }
  return { name: name as WindowsMenuName, x, y }
}

/**
 * Build one caption menu. The application menu carries every Desktop command
 * the former dropdown offered; the edit menu mirrors upstream.
 * @param zoomFactor - current page zoom, shown on the reset item.
 */
export function windowsMenuTemplate(
  name: WindowsMenuName,
  locale: 'zh' | 'en',
  zoomFactor: number,
  actions: WindowsMenuActions
): MenuItemConstructorOptions[] {
  const zh = locale === 'zh'
  const command = (
    id: DesktopMenuCommand,
    zhLabel: string,
    enLabel: string,
    accelerator?: string
  ): MenuItemConstructorOptions => ({
    label: zh ? zhLabel : enLabel,
    ...(accelerator === undefined ? {} : { accelerator, registerAccelerator: false }),
    click: () => actions.run(id)
  })
  const editing = (
    zhLabel: string,
    enLabel: string,
    key: EditingKey,
    accelerator?: string
  ): MenuItemConstructorOptions => ({
    label: zh ? zhLabel : enLabel,
    ...(accelerator === undefined ? {} : { accelerator, registerAccelerator: false }),
    click: () => actions.sendEditingKey(key)
  })

  if (name === 'edit') {
    return [
      editing('撤销', 'Undo', { keyCode: 'Z', modifiers: ['control'] }, 'Ctrl+Z'),
      editing('重做', 'Redo', { keyCode: 'Y', modifiers: ['control'] }, 'Ctrl+Y'),
      { type: 'separator' },
      editing('剪切', 'Cut', { keyCode: 'X', modifiers: ['control'] }, 'Ctrl+X'),
      editing('复制', 'Copy', { keyCode: 'C', modifiers: ['control'] }, 'Ctrl+C'),
      editing('粘贴', 'Paste', { keyCode: 'V', modifiers: ['control'] }, 'Ctrl+V'),
      editing('删除', 'Delete', { keyCode: 'Delete', modifiers: [] }),
      { type: 'separator' },
      editing('全选', 'Select All', { keyCode: 'A', modifiers: ['control'] }, 'Ctrl+A')
    ]
  }

  return [
    command('connect-phone', '连接手机…', 'Connect Phone…', 'Ctrl+Shift+M'),
    command('restart-harness', '重启', 'Restart', 'Ctrl+Shift+R'),
    command('safe-mode', '以安全模式重启…', 'Restart as Safe Mode…'),
    command('show-harness-log', '显示 Harness 日志', 'Show Harness Log'),
    { type: 'separator' },
    {
      label: zh ? '视图' : 'View',
      submenu: [
        command('reload', '重新加载', 'Reload', 'Ctrl+R'),
        command('toggle-devtools', '开发者工具', 'Developer Tools', 'Ctrl+Shift+I'),
        { type: 'separator' },
        command('zoom-in', '放大', 'Zoom In', 'Ctrl+='),
        command('zoom-out', '缩小', 'Zoom Out', 'Ctrl+-'),
        command(
          'zoom-reset',
          `实际大小（当前 ${formatZoomPercentage(zoomFactor)}）`,
          `Actual Size (now ${formatZoomPercentage(zoomFactor)})`,
          'Ctrl+0'
        ),
        { type: 'separator' },
        command('toggle-fullscreen', '切换全屏', 'Toggle Full Screen', 'F11')
      ]
    },
    { type: 'separator' },
    command('check-for-updates', '检查更新…', 'Check for Updates…', 'Ctrl+U'),
    command('about', '关于 DSH Desktop', 'About DSH Desktop'),
    { type: 'separator' },
    command('quit', '退出', 'Exit')
  ]
}

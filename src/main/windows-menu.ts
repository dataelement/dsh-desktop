import { desktopMenuMessages } from './shell/menu-messages'
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
  locale: string,
  zoomFactor: number,
  actions: WindowsMenuActions
): MenuItemConstructorOptions[] {
  const text = desktopMenuMessages(locale)
  const command = (
    id: DesktopMenuCommand,
    label: string,
    accelerator?: string
  ): MenuItemConstructorOptions => ({
    label,
    ...(accelerator === undefined ? {} : { accelerator, registerAccelerator: false }),
    click: () => actions.run(id)
  })
  const editing = (
    label: string,
    key: EditingKey,
    accelerator?: string
  ): MenuItemConstructorOptions => ({
    label,
    ...(accelerator === undefined ? {} : { accelerator, registerAccelerator: false }),
    click: () => actions.sendEditingKey(key)
  })

  if (name === 'edit') {
    return [
      editing(text.undo, { keyCode: 'Z', modifiers: ['control'] }, 'Ctrl+Z'),
      editing(text.redo, { keyCode: 'Y', modifiers: ['control'] }, 'Ctrl+Y'),
      { type: 'separator' },
      editing(text.cut, { keyCode: 'X', modifiers: ['control'] }, 'Ctrl+X'),
      editing(text.copyAction, { keyCode: 'C', modifiers: ['control'] }, 'Ctrl+C'),
      editing(text.paste, { keyCode: 'V', modifiers: ['control'] }, 'Ctrl+V'),
      editing(text.delete, { keyCode: 'Delete', modifiers: [] }),
      { type: 'separator' },
      editing(text.selectAll, { keyCode: 'A', modifiers: ['control'] }, 'Ctrl+A')
    ]
  }

  return [
    command('connect-phone', text.phone, 'Ctrl+Shift+M'),
    command('restart-harness', text.restart, 'Ctrl+Shift+R'),
    command('safe-mode', text.safeMode),
    command('show-harness-log', text.log),
    { type: 'separator' },
    {
      label: text.view,
      submenu: [
        command('reload', text.reload, 'Ctrl+R'),
        command('toggle-devtools', text.devtools, 'Ctrl+Shift+I'),
        { type: 'separator' },
        command('zoom-in', text.zoomIn, 'Ctrl+='),
        command('zoom-out', text.zoomOut, 'Ctrl+-'),
        command(
          'zoom-reset',
          text.zoomCurrent.replace('{zoom}', formatZoomPercentage(zoomFactor)),
          'Ctrl+0'
        ),
        { type: 'separator' },
        command('toggle-fullscreen', text.fullscreen, 'F11')
      ]
    },
    { type: 'separator' },
    command('check-for-updates', text.update, 'Ctrl+U'),
    command('about', text.about),
    command('explore-enterprise', text.enterprise),
    { type: 'separator' },
    command('quit', text.exit)
  ]
}

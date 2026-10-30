import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it } from 'vitest'
import {
  desktopMenuCommands,
  isDesktopMenuCommand,
  type DesktopMenuCommand
} from '../src/shared/desktop-menu'
import {
  parseWindowsMenuRequest,
  windowsMenuTemplate,
  type EditingKey
} from '../src/main/windows-menu'

function record(): { run: DesktopMenuCommand[]; keys: EditingKey[]; actions: Parameters<typeof windowsMenuTemplate>[3] } {
  const run: DesktopMenuCommand[] = []
  const keys: EditingKey[] = []
  return { run, keys, actions: { run: (command) => run.push(command), sendEditingKey: (key) => keys.push(key) } }
}

function clickAll(items: MenuItemConstructorOptions[]): void {
  for (const item of items) {
    if (Array.isArray(item.submenu)) clickAll(item.submenu)
    // The template's handlers ignore Electron's arguments.
    else (item.click as (() => void) | undefined)?.()
  }
}

function labels(items: MenuItemConstructorOptions[]): string[] {
  return items.flatMap((item) => [
    ...(item.label === undefined ? [] : [item.label]),
    ...(Array.isArray(item.submenu) ? labels(item.submenu) : [])
  ])
}

describe('Windows caption menus', () => {
  it('accepts only the fixed menu command allowlist', () => {
    expect(isDesktopMenuCommand('copy')).toBe(true)
    expect(isDesktopMenuCommand('export-session')).toBe(false)
    expect(isDesktopMenuCommand('run-shell-command')).toBe(false)
    expect(isDesktopMenuCommand({ command: 'quit' })).toBe(false)
  })

  it('keeps every Desktop command in the application menu, including the View group', () => {
    const { run, actions } = record()
    clickAll(windowsMenuTemplate('application', 'zh', 1, actions))
    const editing = new Set<DesktopMenuCommand>(['undo', 'redo', 'cut', 'copy', 'paste', 'select-all'])
    expect(new Set(run)).toEqual(new Set(desktopMenuCommands.filter((command) => !editing.has(command))))
  })

  it('sends editing shortcuts as key events so editor-owned history receives them', () => {
    const { run, keys, actions } = record()
    clickAll(windowsMenuTemplate('edit', 'en', 1, actions))
    expect(run).toEqual([])
    expect(keys).toEqual([
      { keyCode: 'Z', modifiers: ['control'] },
      { keyCode: 'Y', modifiers: ['control'] },
      { keyCode: 'X', modifiers: ['control'] },
      { keyCode: 'C', modifiers: ['control'] },
      { keyCode: 'V', modifiers: ['control'] },
      { keyCode: 'Delete', modifiers: [] },
      { keyCode: 'A', modifiers: ['control'] }
    ])
  })

  it('labels the menus in the app language and shows the current zoom', () => {
    const { actions } = record()
    expect(labels(windowsMenuTemplate('application', 'zh', 1.25, actions))).toContain('实际大小（当前 125%）')
    expect(labels(windowsMenuTemplate('application', 'en', 0.9, actions))).toContain('Actual Size (now 90%)')
    expect(labels(windowsMenuTemplate('application', 'zh', 1, actions))).not.toContain('导出 Session 日志…')
    expect(labels(windowsMenuTemplate('application', 'en', 1, actions))).not.toContain('Export Session Log…')
    expect(labels(windowsMenuTemplate('edit', 'zh', 1, actions))).toEqual(
      ['撤销', '重做', '剪切', '复制', '粘贴', '删除', '全选']
    )
  })

  it('does not register popup accelerators over the application menu shortcuts', () => {
    const { actions } = record()
    const flatten = (items: MenuItemConstructorOptions[]): MenuItemConstructorOptions[] =>
      items.flatMap((item) => (Array.isArray(item.submenu) ? flatten(item.submenu) : [item]))
    for (const name of ['application', 'edit'] as const) {
      for (const item of flatten(windowsMenuTemplate(name, 'en', 1, actions))) {
        if (item.accelerator !== undefined) expect(item.registerAccelerator).toBe(false)
      }
    }
  })

  it('rejects popup requests outside the two menus or the window', () => {
    expect(parseWindowsMenuRequest('application', 48, 34)).toEqual({ name: 'application', x: 48, y: 34 })
    expect(() => parseWindowsMenuRequest('view', 48, 34)).toThrow()
    expect(() => parseWindowsMenuRequest('edit', -1, 34)).toThrow()
    expect(() => parseWindowsMenuRequest('edit', 48, Number.NaN)).toThrow()
    expect(() => parseWindowsMenuRequest('edit', '48', 34)).toThrow()
  })
})

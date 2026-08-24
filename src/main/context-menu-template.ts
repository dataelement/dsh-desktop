import type { MenuItemConstructorOptions } from 'electron'
import { isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface ContextMenuState {
  isEditable: boolean
  selectionText: string
  linkURL: string
  hasImageContents: boolean
  /** Existing absolute local path under the clicked content, when any. */
  finderPath: string
  editFlags: {
    canUndo: boolean
    canRedo: boolean
    canCut: boolean
    canCopy: boolean
    canPaste: boolean
    canSelectAll: boolean
  }
}

export interface ContextMenuActions {
  openLink: (url: string) => void
  copyLink: (url: string) => void
  copyImage: () => void
  revealItem: (path: string) => void
}

interface ContextMenuLabels {
  openLink: string
  copyLink: string
  copyImage: string
  revealItem: string
  undo: string
  redo: string
  cut: string
  copy: string
  paste: string
  selectAll: string
}

const labels: Record<'en' | 'zh', ContextMenuLabels> = {
  en: {
    openLink: 'Open Link in Browser',
    copyLink: 'Copy Link Address',
    copyImage: 'Copy Image',
    revealItem: 'Show in Finder',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All'
  },
  zh: {
    openLink: '在浏览器中打开链接',
    copyLink: '复制链接地址',
    copyImage: '复制图片',
    revealItem: '在 Finder 中显示',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选'
  }
}

export function isExternalWebUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.hostname !== '127.0.0.1' &&
      url.hostname !== 'localhost'
    )
  } catch {
    return false
  }
}

/**
 * Resolve the first existing absolute filesystem path carried by the native
 * context event or by metadata on the clicked rendered element. Relative
 * display labels are intentionally ignored: the renderer's title/aria-label
 * must supply their absolute backing path before Finder is offered.
 */
export function resolveFinderPath(
  values: readonly string[],
  exists: (path: string) => boolean
): string {
  for (const raw of values) {
    const value = raw.trim()
    if (value === '') continue
    const candidates: string[] = []
    if (value.startsWith('file:')) {
      try {
        candidates.push(fileURLToPath(value))
      } catch {
        // Malformed file URL — continue with the plain-text candidates.
      }
    }
    candidates.push(value)
    const slash = value.indexOf('/')
    if (slash > 0) candidates.push(value.slice(slash))

    for (const candidate of candidates) {
      const normalized = candidate.trim().replace(/[\s\])}>，。；：、'"”’]+$/u, '')
      if (isAbsolute(normalized) && exists(normalized)) return normalized
    }
  }
  return ''
}

function appendSection(
  template: MenuItemConstructorOptions[],
  section: MenuItemConstructorOptions[]
): void {
  if (section.length === 0) return
  if (template.length > 0) template.push({ type: 'separator' })
  template.push(...section)
}

export function buildContextMenuTemplate(
  state: ContextMenuState,
  locale: 'en' | 'zh',
  actions: ContextMenuActions
): MenuItemConstructorOptions[] {
  const text = labels[locale]
  const template: MenuItemConstructorOptions[] = []
  const hasSelection = state.selectionText.trim().length > 0

  if (state.finderPath !== '') {
    appendSection(template, [{
      label: text.revealItem,
      click: () => actions.revealItem(state.finderPath)
    }])
  }

  if (state.linkURL) {
    const linkItems: MenuItemConstructorOptions[] = []
    if (isExternalWebUrl(state.linkURL)) {
      linkItems.push({
        label: text.openLink,
        click: () => actions.openLink(state.linkURL)
      })
    }
    linkItems.push({
      label: text.copyLink,
      click: () => actions.copyLink(state.linkURL)
    })
    appendSection(template, linkItems)
  }

  if (state.hasImageContents) {
    appendSection(template, [
      {
        label: text.copyImage,
        click: actions.copyImage
      }
    ])
  }

  if (state.isEditable) {
    appendSection(template, [
      { label: text.undo, role: 'undo', enabled: state.editFlags.canUndo },
      { label: text.redo, role: 'redo', enabled: state.editFlags.canRedo },
      { type: 'separator' },
      { label: text.cut, role: 'cut', enabled: state.editFlags.canCut },
      {
        label: text.copy,
        role: 'copy',
        enabled: state.editFlags.canCopy || hasSelection
      },
      { label: text.paste, role: 'paste', enabled: state.editFlags.canPaste },
      { type: 'separator' },
      { label: text.selectAll, role: 'selectAll', enabled: state.editFlags.canSelectAll }
    ])
  } else {
    const contentItems: MenuItemConstructorOptions[] = []
    if (hasSelection) {
      contentItems.push({ label: text.copy, role: 'copy' })
    }
    contentItems.push({ label: text.selectAll, role: 'selectAll' })
    appendSection(template, contentItems)
  }

  return template
}

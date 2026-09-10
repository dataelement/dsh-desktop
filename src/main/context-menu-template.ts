import type { MenuItemConstructorOptions } from 'electron'

export interface ContextMenuState {
  isEditable: boolean
  selectionText: string
  linkURL: string
  hasImageContents: boolean
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
}

interface ContextMenuLabels {
  openLink: string
  copyLink: string
  copyImage: string
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
      url.protocol === 'https:' || url.protocol === 'http:'
    )
  } catch {
    return false
  }
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

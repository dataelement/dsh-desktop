import { describe, expect, it, vi } from 'vitest'
import * as contextMenuModule from '../src/main/context-menu-template'
import {
  buildContextMenuTemplate,
  isExternalWebUrl,
  type ContextMenuActions,
  type ContextMenuState
} from '../src/main/context-menu-template'

function state(overrides: Partial<ContextMenuState> & { finderPath?: string } = {}): ContextMenuState {
  return {
    isEditable: false,
    selectionText: '',
    linkURL: '',
    hasImageContents: false,
    editFlags: {
      canUndo: false,
      canRedo: false,
      canCut: false,
      canCopy: false,
      canPaste: false,
      canSelectAll: true
    },
    finderPath: '',
    ...overrides
  } as ContextMenuState
}

function actions(): ContextMenuActions & { revealItem: ReturnType<typeof vi.fn> } {
  return {
    openLink: vi.fn(),
    copyLink: vi.fn(),
    copyImage: vi.fn(),
    revealItem: vi.fn()
  } as ContextMenuActions & { revealItem: ReturnType<typeof vi.fn> }
}

describe('conversation context menu', () => {
  it('offers copy for selected conversation text', () => {
    const template = buildContextMenuTemplate(
      state({ selectionText: '选中的回答' }),
      'zh',
      actions()
    )

    expect(template).toEqual([
      { label: '复制', role: 'copy' },
      { label: '全选', role: 'selectAll' }
    ])
  })

  it('offers the standard editing commands inside the composer', () => {
    const template = buildContextMenuTemplate(
      state({
        isEditable: true,
        selectionText: 'draft',
        editFlags: {
          canUndo: true,
          canRedo: false,
          canCut: true,
          canCopy: true,
          canPaste: true,
          canSelectAll: true
        }
      }),
      'en',
      actions()
    )

    expect(template.map((item) => item.role ?? item.type)).toEqual([
      'undo',
      'redo',
      'separator',
      'cut',
      'copy',
      'paste',
      'separator',
      'selectAll'
    ])
    expect(template[1]?.enabled).toBe(false)
  })

  it('opens safe web links externally and can copy their address', () => {
    const callbacks = actions()
    const template = buildContextMenuTemplate(
      state({ linkURL: 'https://example.com/docs' }),
      'en',
      callbacks
    )

    template[0]?.click?.({} as never, undefined, {} as never)
    template[1]?.click?.({} as never, undefined, {} as never)
    expect(callbacks.openLink).toHaveBeenCalledWith('https://example.com/docs')
    expect(callbacks.copyLink).toHaveBeenCalledWith('https://example.com/docs')
  })

  it('never offers to open non-web link schemes externally', () => {
    const callbacks = actions()
    const template = buildContextMenuTemplate(
      state({ linkURL: 'javascript:alert(1)' }),
      'en',
      callbacks
    )

    expect(template[0]?.label).toBe('Copy Link Address')
    expect(template.some((item) => item.label === 'Open Link in Browser')).toBe(false)
  })

  it('supports copying rendered images', () => {
    const callbacks = actions()
    const template = buildContextMenuTemplate(
      state({ hasImageContents: true }),
      'en',
      callbacks
    )

    template[0]?.click?.({} as never, undefined, {} as never)
    expect(callbacks.copyImage).toHaveBeenCalledOnce()
  })

  it('offers Finder reveal for a recognized local path and invokes the exact item', () => {
    const callbacks = actions()
    const template = buildContextMenuTemplate(
      state({ selectionText: 'report.pdf', finderPath: '/tmp/project/report.pdf' }),
      'zh',
      callbacks
    )

    expect(template[0]?.label).toBe('在 Finder 中显示')
    template[0]?.click?.({} as never, undefined, {} as never)
    expect(callbacks.revealItem).toHaveBeenCalledWith('/tmp/project/report.pdf')
  })

  it('resolves only existing absolute paths from selected text or clicked-element metadata', () => {
    const resolver = (contextMenuModule as Record<string, unknown>).resolveFinderPath
    expect(resolver).toBeTypeOf('function')
    const exists = (candidate: string): boolean => candidate === '/Users/me/Project/index.html'

    expect((resolver as (values: string[], exists: (path: string) => boolean) => string)([
      'index.html',
      '打开 /Users/me/Project/index.html',
    ], exists)).toBe('/Users/me/Project/index.html')
    expect((resolver as (values: string[], exists: (path: string) => boolean) => string)([
      'index.html',
      'https://example.com/index.html',
    ], exists)).toBe('')
  })

  it('recognizes only HTTP and HTTPS as external web URLs', () => {
    expect(isExternalWebUrl('https://example.com')).toBe(true)
    expect(isExternalWebUrl('http://example.com')).toBe(true)
    expect(isExternalWebUrl('http://127.0.0.1:43127/session')).toBe(false)
    expect(isExternalWebUrl('http://localhost:43127/settings')).toBe(false)
    expect(isExternalWebUrl('file:///tmp/report.html')).toBe(false)
    expect(isExternalWebUrl('not a URL')).toBe(false)
  })
})

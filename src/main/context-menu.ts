import { clipboard, Menu, shell, type BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { buildContextMenuTemplate, resolveFinderPath } from './context-menu-template'

async function clickedElementPathCandidates(
  window: BrowserWindow,
  x: number,
  y: number
): Promise<string[]> {
  if (window.isDestroyed()) return []
  try {
    const result = await window.webContents.executeJavaScript(`(() => {
      const origin = document.elementFromPoint(${JSON.stringify(x)}, ${JSON.stringify(y)});
      if (!(origin instanceof Element)) return [];
      const values = [];
      let element = origin;
      for (let depth = 0; element instanceof Element && depth < 5; depth += 1) {
        for (const name of ['data-path', 'title', 'aria-label', 'href']) {
          const value = element.getAttribute(name);
          if (value) values.push(value);
        }
        element = element.parentElement;
      }
      if (origin.textContent) values.push(origin.textContent);
      return values;
    })()`, true)
    return Array.isArray(result) ? result.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function installContextMenu(
  window: BrowserWindow,
  locale: () => 'en' | 'zh'
): void {
  window.webContents.on('context-menu', async (_event, params) => {
    const elementCandidates = await clickedElementPathCandidates(window, params.x, params.y)
    if (window.isDestroyed()) return
    const finderPath = resolveFinderPath(
      [params.selectionText, params.linkURL, ...elementCandidates],
      existsSync
    )
    const template = buildContextMenuTemplate({ ...params, finderPath }, locale(), {
      openLink: (url) => {
        void shell.openExternal(url)
      },
      copyLink: (url) => clipboard.writeText(url),
      revealItem: (path) => shell.showItemInFolder(path),
      copyImage: () => {
        if (window.isDestroyed()) return
        window.webContents.copyImageAt(params.x, params.y)
      }
    })

    if (template.length === 0 || window.isDestroyed()) return
    Menu.buildFromTemplate(template).popup({ window })
  })
}

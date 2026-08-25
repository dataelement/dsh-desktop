import type { Rectangle } from 'electron'
import { WINDOWS_TITLEBAR_HEIGHT } from '../shared/desktop-menu'

export const WINDOWS_CAPTION_CONTROLS_WIDTH = 140
export const WINDOWS_MENU_BUTTON_WIDTH = 44
export const WINDOWS_MENU_PANEL_WIDTH = 304
export const WINDOWS_MENU_PANEL_MAX_HEIGHT = 760

interface ContentSize {
  width: number
  height: number
}

export function windowsMenuViewBounds(
  contentSize: ContentSize,
  menuOpen: boolean,
  fullscreen = false
): Rectangle {
  const contentWidth = Math.max(0, Math.floor(contentSize.width))
  const contentHeight = Math.max(0, Math.floor(contentSize.height))
  const captionWidth = fullscreen
    ? 0
    : Math.min(WINDOWS_CAPTION_CONTROLS_WIDTH, contentWidth)
  const availableWidth = Math.max(0, contentWidth - captionWidth)
  const requestedWidth = menuOpen ? WINDOWS_MENU_PANEL_WIDTH : WINDOWS_MENU_BUTTON_WIDTH
  const width = Math.min(requestedWidth, availableWidth)
  const height = menuOpen
    ? Math.min(WINDOWS_MENU_PANEL_MAX_HEIGHT, contentHeight)
    : Math.min(WINDOWS_TITLEBAR_HEIGHT, contentHeight)

  return {
    x: Math.max(0, contentWidth - captionWidth - width),
    y: 0,
    width,
    height
  }
}

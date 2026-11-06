/** Native window chrome. macOS draws the traffic lights inside the sidebar row. */
export interface DesktopWindowChrome {
  titleBarStyle?: 'hiddenInset'
  trafficLightPosition?: { x: number; y: number }
  vibrancy?: 'sidebar'
  visualEffectState?: 'active'
  backgroundColor?: string
}

/**
 * macOS keeps the close buttons and the sidebar collapse control on one row.
 * A normal title bar pushes that control down into the page.
 */
export function desktopWindowChrome(platform: string): DesktopWindowChrome {
  if (platform !== 'darwin') return {}
  return {
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000'
  }
}

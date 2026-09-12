// Native macOS controls span 60 DIP and do not scale with web content.
const TRAFFIC_LIGHT_WIDTH = 60
const COLLAPSED_SIDEBAR_WIDTH = 96

// Center in the collapsed rail at Actual Size; never follow renderer geometry.
export const MAC_WINDOW_BUTTON_POSITION = Object.freeze({
  x: (COLLAPSED_SIDEBAR_WIDTH - TRAFFIC_LIGHT_WIDTH) / 2,
  y: 9
})

const DESKTOP_SHELL_STYLE_ID = 'sherlock-desktop-shell-style'

const desktopShellStyles = `
  .t8lSSG_toggleCluster {
    top: calc(8px + env(safe-area-inset-top)) !important;
  }
`

export function mountDesktopShellStyles(document: Document): void {
  if (document.getElementById(DESKTOP_SHELL_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = DESKTOP_SHELL_STYLE_ID
  style.textContent = desktopShellStyles
  document.documentElement.appendChild(style)
}

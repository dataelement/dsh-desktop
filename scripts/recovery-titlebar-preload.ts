import { ipcRenderer } from 'electron'
import { markWindowsTitlebar, mountWindowsTitlebarLayout } from '../src/preload/windows-titlebar'

// Exercise the production Windows caption layout even on non-Windows runners.
// Native Windows caption controls are still verified only on Windows runners.
markWindowsTitlebar(document)
window.addEventListener('DOMContentLoaded', () => {
  mountWindowsTitlebarLayout({ document, ipcRenderer })
}, { once: true })

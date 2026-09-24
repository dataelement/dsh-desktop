import { createRequire } from 'node:module'
import { installWindowsDirectoryInstaller } from './windows-directory-installer.mjs'

installWindowsDirectoryInstaller()
if (process.env.JSIGN_JAR || process.env.JSIGN_PIN_FILE) {
  if (!process.env.JSIGN_JAR || !process.env.JSIGN_PIN_FILE) {
    throw new Error('Incomplete Jsign environment for Windows installer packaging')
  }
  process.argv.push('--config.win.signtoolOptions.sign=./scripts/jsign-windows-hook.mjs')
  process.argv.push('--config.win.signtoolOptions.signingHashAlgorithms=sha256')
}
const require = createRequire(import.meta.url)
require('electron-builder/cli.js')

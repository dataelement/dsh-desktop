import { createRequire } from 'node:module'
import { installWindowsDirectoryInstaller } from './windows-directory-installer.mjs'

installWindowsDirectoryInstaller()
const require = createRequire(import.meta.url)
require('electron-builder/cli.js')

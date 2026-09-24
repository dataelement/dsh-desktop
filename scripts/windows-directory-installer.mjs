/** Adapt the pinned electron-builder 26.15.3 NSIS template for directory staging.
 * Based on deepseek-ai/deepseek-harness/apps/desktop/scripts/windows-directory-installer.mjs.
 */
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const require = createRequire(import.meta.url)
const templates = join(dirname(require.resolve('app-builder-lib/package.json')), 'templates', 'nsis')
const patched = Symbol.for('dsh-desktop/windows-directory-installer')
const execFileAsync = promisify(execFile)
const WINDOWS_7ZIP_ARCHIVE = '7zip-win-x64.tar.gz'
const WINDOWS_7ZIP_SHA256 = 'be071f15bd6da2f78fe81c6ddef2009b0c4d8a51f36b780cb806c7e6df95e1b3'

export function assertWindowsExecutable(bytes) {
  if (bytes.length < 0x40 || bytes.toString('ascii', 0, 2) !== 'MZ') {
    throw new Error('Installer extraction tool is not a Windows PE executable')
  }
  const peOffset = bytes.readUInt32LE(0x3c)
  if (peOffset > bytes.length - 6 || bytes.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
    throw new Error('Installer extraction tool has an invalid Windows PE header')
  }
  const machine = bytes.readUInt16LE(peOffset + 4)
  if (machine !== 0x14c && machine !== 0x8664) {
    throw new Error(`Installer extraction tool has an unsupported PE machine: ${machine}`)
  }
}

async function windows7zipTool() {
  // getPath7za() selects the build host's binary. This installer runs on Windows
  // even when electron-builder is invoked on macOS.
  const { downloadBuilderToolset } = require('app-builder-lib/out/util/electronGet.js')
  const directory = await downloadBuilderToolset({
    releaseName: '7zip@1.0.0',
    filenameWithExt: WINDOWS_7ZIP_ARCHIVE,
    checksums: { [WINDOWS_7ZIP_ARCHIVE]: WINDOWS_7ZIP_SHA256 },
    githubOrgRepo: 'electron-userland/electron-builder-binaries'
  })
  const executable = join(directory, 'bin', '7za.exe')
  assertWindowsExecutable(await readFile(executable))
  return { executable, licenseDirectory: directory }
}

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`electron-builder NSIS template changed: ${before}`)
  return source.replace(before, after)
}

export function directoryInstallSection(source) {
  let result = source.replaceAll('\r\n', '\n')
  result = replaceOnce(result, '!include installer.nsh', `!include installer.nsh
!macroundef extractUsing7za
!macro extractUsing7za FILE
  !insertmacro dshExtractPayload "\${FILE}"
!macroend
!macroundef uninstallOldVersion
!macro uninstallOldVersion ROOT_KEY
  ; Directory promotion replaces a same-path install. A different directory is
  ; independent: running its old uninstaller before promotion can hang or erase
  ; the working copy before the new one is ready.
  StrCpy $R0 0
  ClearErrors
!macroend`)
  result = replaceOnce(result, '!insertmacro setLinkVars', '!insertmacro setLinkVars\n!insertmacro dshStageApplication')
  result = replaceOnce(result, '!insertmacro installApplicationFiles', 'Call dshPromoteDirectories\nIfErrors 0 +3\n  SetErrorLevel 2\n  Quit')
  // The staged payload already contains the uninstaller icon.
  result = replaceOnce(result, '!ifdef UNINSTALLER_ICON\n  File /oname=uninstallerIcon.ico "${UNINSTALLER_ICON}"\n!endif\n', '')
  return result
}

export function directoryInstallerExits(source) {
  return source.replaceAll(/^(\s*)Quit\s*$/gm, '$1!ifndef BUILD_UNINSTALLER\n$1Call dshCleanupDirectories\n$1!endif\n$1Quit')
}

export async function signWindowsPeWithJsign(path) {
  const { JSIGN_JAR, JSIGN_PIN_FILE } = process.env
  if (!JSIGN_JAR && !JSIGN_PIN_FILE) return // unsigned Windows staging build
  if (!JSIGN_JAR || !JSIGN_PIN_FILE) throw new Error('Incomplete Jsign environment for installer tool')
  await execFileAsync('java', [
    '-jar', JSIGN_JAR, '--storetype', 'ETOKEN', '--storepass', `file:${JSIGN_PIN_FILE}`,
    '--alg', 'SHA-256', '--tsaurl', 'http://timestamp.digicert.com', '--tsmode', 'RFC3161',
    '--tsretries', '3', '--tsretrywait', '10', path
  ])
  await execFileAsync('java', ['-jar', JSIGN_JAR, 'extract', '--format', 'DER', path])
  const signature = `${path}.sig`
  if ((await stat(signature)).size === 0) throw new Error(`Installer extraction tool was not signed: ${path}`)
  await rm(signature)
}

export function installWindowsDirectoryInstaller() {
  require('app-builder-lib')
  const { NsisTarget } = require('app-builder-lib/out/targets/nsis/NsisTarget.js')
  const prototype = NsisTarget.prototype
  if (prototype[patched]) return
  prototype[patched] = true
  const compute = prototype.computeFinalScript
  prototype.computeFinalScript = async function (source, ...args) {
    const directory = join(this.outDir, '.nsis-directory-installer')
    await mkdir(directory, { recursive: true })
    const section = join(directory, 'installSection.nsh')
    await writeFile(section, directoryInstallSection(await readFile(join(templates, 'installSection.nsh'), 'utf8')))
    const { executable, licenseDirectory } = await windows7zipTool()
    const tool = join(directory, '7za.exe')
    await copyFile(executable, tool)
    await signWindowsPeWithJsign(tool)
    let adapted = replaceOnce(source, '!include "installSection.nsh"', `!include "${section}"`)
    for (const helper of ['allowOnlyOneInstallerInstance.nsh', 'installUtil.nsh']) {
      const path = join(directory, helper)
      await writeFile(path, directoryInstallerExits(await readFile(join(templates, 'include', helper), 'utf8')))
      adapted = replaceOnce(adapted, `!include "${helper}"`, `!include "${path}"`)
    }
    return `!define DSH_SEVENZIP_PATH "${tool}"\n!define DSH_SEVENZIP_LICENSE_DIR "${licenseDirectory}"\n${await compute.call(this, adapted, ...args)}`
  }
}

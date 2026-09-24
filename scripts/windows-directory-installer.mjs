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
  !insertmacro readReg $R4 "\${ROOT_KEY}" "\${INSTALL_REGISTRY_KEY}" InstallLocation
  \${If} $R4 == $INSTDIR
    StrCpy $R0 0
    ClearErrors
  \${Else}
    Push "\${ROOT_KEY}"
    Call uninstallOldVersion
  \${EndIf}
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

async function signInstallerTool(path) {
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
  const { getPath7za } = require('app-builder-lib/out/toolsets/7zip.js')
  const prototype = NsisTarget.prototype
  if (prototype[patched]) return
  prototype[patched] = true
  const compute = prototype.computeFinalScript
  prototype.computeFinalScript = async function (source, ...args) {
    const directory = join(this.outDir, '.nsis-directory-installer')
    await mkdir(directory, { recursive: true })
    const section = join(directory, 'installSection.nsh')
    await writeFile(section, directoryInstallSection(await readFile(join(templates, 'installSection.nsh'), 'utf8')))
    const sourceTool = await getPath7za()
    const tool = join(directory, '7za.exe')
    await copyFile(sourceTool, tool)
    await signInstallerTool(tool)
    let adapted = replaceOnce(source, '!include "installSection.nsh"', `!include "${section}"`)
    for (const helper of ['allowOnlyOneInstallerInstance.nsh', 'installUtil.nsh']) {
      const path = join(directory, helper)
      await writeFile(path, directoryInstallerExits(await readFile(join(templates, 'include', helper), 'utf8')))
      adapted = replaceOnce(adapted, `!include "${helper}"`, `!include "${path}"`)
    }
    return `!define DSH_SEVENZIP_PATH "${tool}"\n!define DSH_SEVENZIP_LICENSE_DIR "${dirname(dirname(sourceTool))}"\n${await compute.call(this, adapted, ...args)}`
  }
}

import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

/** Inspect the signed bundle, not the source plist, before publishing or notarizing it. */
export async function verifyMacOSMicrophonePermissions(appPath, { run = exec, list = readdir } = {}) {
  const { stdout: description } = await run('/usr/libexec/PlistBuddy', [
    '-c', 'Print :NSMicrophoneUsageDescription', join(appPath, 'Contents', 'Info.plist')
  ], { timeout: 10_000 })
  if (!description.trim()) throw new Error('macOS microphone usage description is empty')

  const frameworks = join(appPath, 'Contents', 'Frameworks')
  const helpers = (await list(frameworks)).filter(name => name.endsWith(' Helper.app')
    || name.includes(' Helper (') && name.endsWith('.app'))
  if (helpers.length === 0) throw new Error('macOS microphone verification found no Electron helpers')
  for (const bundle of [appPath, ...helpers.map(name => join(frameworks, name))]) {
    // Newer macOS versions default to a human-readable dictionary unless XML is explicit.
    const { stdout: xml } = await run('/usr/bin/codesign', ['-d', '--entitlements', '-', '--xml', bundle], { timeout: 10_000 })
    if (!/<key>com\.apple\.security\.device\.audio-input<\/key>\s*<true\s*\/>/u.test(xml)) {
      throw new Error('macOS signed bundle is missing audio-input entitlement: ' + bundle)
    }
  }
}

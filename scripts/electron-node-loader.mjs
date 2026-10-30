import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'

/**
 * Harness 0.1.7 resolves Profile packages through Node internals reached by
 * `node-addon-require-builtin`. Its native binary accepts only the Electron
 * runtime fingerprints it was built for (exact Node and V8), and it reports an
 * unsupported one only when Harness boots. Electron 43.4.0 passed every
 * packaging step and failed there. This probe runs the same calls under the
 * Electron executable in Node mode so an unsupported pairing stops packaging.
 */
export const HARNESS_INTERNAL_MODULES = [
  'internal/modules/esm/loader',
  'internal/modules/cjs/loader',
  'internal/modules/helpers',
  'internal/modules/esm/utils',
  'internal/modules/esm/resolve'
]

const PROBE_SOURCE = `
const { createRequire } = require('node:module')
const [anchor, ...ids] = process.argv.slice(1)
const addon = createRequire(anchor)('node-addon-require-builtin')
for (const id of ids) addon.requireBuiltin(id)
process.stdout.write(JSON.stringify({
  electron: process.versions.electron ?? null,
  node: process.versions.node,
  v8: process.versions.v8
}))
`

/** The package manifest Harness loads the addon from, so the probe resolves the same copy. */
export function harnessLoaderAnchor(projectRoot) {
  const projectRequire = createRequire(`${projectRoot}/package.json`)
  return projectRequire.resolve('@deepseek-ai/dsh-app-boot/package.json')
}

/** The Electron executable the build packages, as the `electron` package reports it. */
export function electronExecutable(projectRoot) {
  const projectRequire = createRequire(`${projectRoot}/package.json`)
  const executable = projectRequire('electron')
  if (typeof executable !== 'string') {
    throw new Error('The electron package did not report an executable path.')
  }
  return executable
}

/**
 * Run the Harness loader calls under `executable` in Electron Node mode.
 * @returns the runtime versions on success, or the loader's own error text.
 */
export function probeElectronNodeLoader({ executable, anchor, timeoutMs = 60_000 }) {
  const result = spawnSync(
    executable,
    ['-e', PROBE_SOURCE, anchor, ...HARNESS_INTERNAL_MODULES],
    {
      cwd: dirname(anchor),
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      timeout: timeoutMs,
      windowsHide: true
    }
  )
  if (result.error) {
    return { ok: false, detail: `could not start ${executable}: ${result.error.message}` }
  }
  if (result.status !== 0) {
    const output = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim()
    const reason = output.split(/\r?\n/u).find((line) => /unsupported|Error/u.test(line)) ?? output
    return { ok: false, detail: reason || `exited with ${result.status ?? result.signal}` }
  }
  try {
    const runtime = JSON.parse(result.stdout.trim())
    return { ok: true, runtime }
  } catch {
    return { ok: false, detail: `returned an invalid probe result: ${result.stdout.trim()}` }
  }
}

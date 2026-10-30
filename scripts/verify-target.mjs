import { electronExecutable, harnessLoaderAnchor, probeElectronNodeLoader } from './electron-node-loader.mjs'

const [expectedPlatform, expectedArch] = process.argv.slice(2)

if (!expectedPlatform || !expectedArch) {
  console.error('Usage: node scripts/verify-target.mjs <platform> <arch>')
  process.exit(2)
}

if (process.platform !== expectedPlatform || process.arch !== expectedArch) {
  console.error(
    `This package must be built on ${expectedPlatform}/${expectedArch}; current runtime is ${process.platform}/${process.arch}.`
  )
  console.error('Install dependencies and run the build on the matching machine or CI runner.')
  process.exit(1)
}

// The Desktop ships no standalone Node: Windows runs Harness through Electron
// Node mode and macOS through a utility process, and package commands use the
// Electron executable (the macOS Helper) as Node. Both reach Node internals
// through the Harness native loader, which accepts only the Electron builds it
// was compiled for.
const loader = probeElectronNodeLoader({
  executable: electronExecutable(process.cwd()),
  anchor: harnessLoaderAnchor(process.cwd())
})
if (!loader.ok) {
  console.error(`Electron Node mode cannot load the Harness native loader: ${loader.detail}`)
  console.error('Pin an Electron version the installed node-addon-require-builtin supports, or update the loader, before packaging.')
  process.exit(1)
}

console.log(
  `Packaging target verified: ${process.platform}/${process.arch}; ` +
  `Electron ${loader.runtime.electron} (Node ${loader.runtime.node}) loads the Harness native loader`
)

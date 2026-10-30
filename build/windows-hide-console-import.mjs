import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { enforceWindowsChildProcessHide } from './windows-child-process-hide.mjs'

// Loaded with `--import` in the short-lived package processes that do not go
// through harness-node-entry. Those processes spawn `pnpm.cmd` / `npm.cmd`,
// and a console-less parent lets cmd.exe open its own visible console.
if (process.platform === 'win32') {
  const { createHiddenConsole } = await import('./windows-hidden-console.mjs')
  const hidden = createHiddenConsole()
  if (!hidden) {
    process.stderr.write(
      '[windows-hide-console] hidden console was not created; child consoles may remain visible\n'
    )
  }
  enforceWindowsChildProcessHide(childProcess, syncBuiltinESMExports)
}

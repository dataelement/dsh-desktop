import { runCli } from '@deepseek-ai/dsh/lib/bin.js'

// The public dsh CLI refuses plugin changes to the reserved desktop profile.
// This entry is the desktop carrier, so it is allowed to manage that profile.
await runCli({ manageDesktopProfile: true })

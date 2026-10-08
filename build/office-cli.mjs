import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerOfficeEngineResolution } from './office-engine-resolution.mjs'

// Agent shells inherit Node mode from harness-node-entry. Declare it again for
// LibreOffice's children; this CLI must be launched with ELECTRON_RUN_AS_NODE=1.
process.env.ELECTRON_RUN_AS_NODE = '1'
const archive = join(import.meta.dirname, 'app.asar')
const root = existsSync(archive) ? archive : dirname(import.meta.dirname)
const requireHost = createRequire(join(root, 'package.json'))
registerOfficeEngineResolution(requireHost.resolve('@deepseek-ai/dsh/lib/bin.js'))
await import(pathToFileURL(requireHost.resolve('@deepseek-ai/libreoffice-kit/cli')).href)

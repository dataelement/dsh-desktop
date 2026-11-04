import { defineConfig } from 'vitest/config'
import { resolveVitestConfig } from './vitest.config'

// All-platform builds run the common suite on macOS. Keep Windows coverage on native
// processes, path handling, Profile loading, installation, and updates.
export default defineConfig(resolveVitestConfig('windows-serial'))

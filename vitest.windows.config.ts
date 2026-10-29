import { defineConfig } from 'vitest/config'
import baseConfig from './vitest.config'

// All-platform builds run the common suite on macOS. Keep Windows coverage on native
// processes, path handling, Profile loading, installation, and updates.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // Do not parallelize integration files: Windows subprocesses and archive
    // extraction can contend for locked files even with separate test workers.
    fileParallelism: false,
    include: [
      'test/windows-*.test.{ts,js,mjs}',
      'test/archive-windows-release.test.mjs',
      'test/generation-*.test.{ts,js,mjs}',
      'test/profile-*.test.{ts,js,mjs}',
      'test/safe-mode*.test.ts',
      'test/update*.test.ts',
      'test/open-in-app-environment.test.ts',
      'test/office-runtime.test.mjs',
      'test/office-templates.test.mjs',
      'test/node-pty-*.test.{ts,js,mjs}',
      'test/runtime.test.ts',
      'test/harness-node-entry.test.ts',
      'test/launch-root.test.ts',
      'test/desktop-plugin-closure.test.ts',
      'test/plugin-startup-failure.test.ts',
      'test/host-disabled-plugins.test.ts',
      'test/plugin-recovery.test.ts',
      'test/market-installer.test.js',
      'test/migration-failure-paths.test.ts',
      'test/legacy-preset-migration.test.ts',
      'test/pnpm-runner.test.js',
      'test/local-path-links.test.ts',
      'test/office-engine-resolution.test.ts',
      'test/remove-tree.test.ts',
      'test/shell-environment-encoding.test.ts',
      'test/directory-picker.test.ts',
      'test/file-preview.test.ts',
      'test/desktop-service.test.ts',
      'test/desktop-storage.test.ts',
      'test/gpu-fallback.test.ts',
      'test/window-raise.test.ts',
      'test/close-to-tray.test.ts',
      'test/ppt-fonts.test.mjs'
    ]
  }
})

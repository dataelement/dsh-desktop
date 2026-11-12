import { configDefaults, defineConfig } from 'vitest/config'

export const WINDOWS_COMPLETE_EXCLUDES = [
  '**/test/docx-template-fidelity*',
  '**/test/ppt-personal-templates*',
  '**/test/ppt-import-memory*',
  '**/test/ppt-personal-template-ui*',
  '**/test/ppt-windows-font-layout*'
]

export const WINDOWS_SERIAL_SUITES = [
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
  'test/window-permissions.test.mjs',
  'test/launch-root.test.ts',
  'test/desktop-plugin-closure.test.ts',
  'test/host/*.test.ts',
  'test/plugin-recovery.test.ts',
  'test/market-installer.test.js',
  'test/migration-failure-paths.test.ts',
  'test/legacy-preset-migration.test.ts',
  'test/pnpm-runner.test.js',
  'test/local-path-links.test.ts',
  'test/office-engine-resolution.test.ts',
  'test/office-engine-asar.test.ts',
  'test/remove-tree.test.ts',
  'test/directory-picker.test.ts',
  'test/file-preview.test.ts',
  'test/desktop-service.test.ts',
  'test/desktop-storage.test.ts',
  'test/gpu-fallback.test.ts',
  'test/window-raise.test.ts',
  'test/close-to-tray.test.ts',
  'test/ppt-fonts.test.mjs',
  'test/*-runtime.test.{ts,js,mjs}',
  'test/ppt-validation.test.mjs',
  'test/repair-agent-diagnosis.test.ts',
  'test/mcp-startup-deadline.test.ts',
  'test/lan-mobile-tunnel.test.ts',
  'test/renderer-recovery-electron.test.ts',
  'test/shell/startup-recovery-electron.test.ts',
  'test/shell/mobile-window-electron.test.ts',
  'test/ptc-electron-helper.test.js',
  'test/landlock-asar-layout.test.mjs'
]

function resolveCliMode(argv = process.argv): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--mode' || arg === '-m') return argv[i + 1]
    if (arg?.startsWith('--mode=')) return arg.slice('--mode='.length)
  }
  return process.env.DSH_VITEST_WINDOWS_PHASE
}

export function resolveVitestConfig(mode = resolveCliMode()) {
  if (mode === 'windows-parallel') {
    return {
      test: {
        include: ['test/**/*.{test,spec}.{ts,js,mjs}'],
        exclude: [...configDefaults.exclude, ...WINDOWS_COMPLETE_EXCLUDES, ...WINDOWS_SERIAL_SUITES],
        fileParallelism: true,
        testTimeout: 60_000
      }
    }
  }
  if (mode === 'windows-serial') {
    return {
      test: {
        include: WINDOWS_SERIAL_SUITES,
        exclude: [...configDefaults.exclude, ...WINDOWS_COMPLETE_EXCLUDES],
        fileParallelism: false,
        testTimeout: 60_000
      }
    }
  }
  return {
    test: {
      include: ['test/**/*.{test,spec}.{ts,js,mjs}'],
      // Native Intel runners and Windows CI contend for CPU and disk while integration suites
      // unpack archives and launch subprocesses (hitting EBUSY locks). Keep every test, but serialize files.
      fileParallelism: !(
        process.env.CI &&
        ((process.platform === 'darwin' && process.arch === 'x64') || process.platform === 'win32')
      ),
      testTimeout: 60_000
    }
  }
}

export default defineConfig(resolveVitestConfig())

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js,mjs}'],
    // These suites gate payloads the Linux package cannot ship: lock.json carries
    // no Linux Office/Python runtime, LibreOfficeKit has no Linux native package,
    // and the AppImage/deb have no updater channel. docs/linux-port.md records the
    // resulting gaps; macOS and Windows still run every suite.
    exclude: process.platform === 'linux'
      ? [
          'test/application-rollback-manager.test.ts',
          'test/docx-template-fidelity.test.mjs',
          'test/office-meeting-minutes.test.mjs',
          'test/office-runtime.test.mjs',
          'test/office-templates.test.mjs'
        ]
      : [],
    // Native Intel runners and Windows CI contend for CPU and disk while integration suites
    // unpack archives and launch subprocesses (hitting EBUSY locks). Keep every test, but serialize files.
    fileParallelism: !(
      process.env.CI &&
      ((process.platform === 'darwin' && process.arch === 'x64') || process.platform === 'win32')
    ),
    testTimeout: 60_000
  }
})

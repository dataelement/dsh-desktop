import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const filename = require.resolve('node-pty/lib/unixTerminal.js')
const source = fs.readFileSync(filename, 'utf8')
const moduleRequire = createRequire(filename)
const utils = moduleRequire('./utils') as Record<string, unknown>

function resolveHelper(
  moduleDirectory: string,
  paths: typeof path.posix,
  options: { override?: string, sibling?: boolean, nativeDirectory?: string } = {}
): string {
  const execPath = paths.resolve('/runtime/app.asar/node')
  const sibling = execPath + '-spawn-helper'
  const stopped = new Error('stopped at native fork')
  const fork = vi.fn((..._args: unknown[]): never => { throw stopped })
  const existsSync = vi.fn((candidate: string) => options.sibling === true && candidate === sibling)
  const exports: { UnixTerminal?: new (file: string, args: string[], options: object) => unknown } = {}

  // Execute the complete installed module with its real Terminal base and utilities.
  // Stub only native loading/fork and the executable-sibling filesystem probe.
  runInNewContext(source, {
    exports,
    __dirname: moduleDirectory,
    require: (id: string): unknown => {
      if (id === 'path') return paths
      if (id === 'fs') return { ...fs, existsSync }
      if (id === './utils') return {
        ...utils,
        loadNativeModule: () => ({ dir: options.nativeDirectory ?? '../prebuilds/darwin-arm64', module: { fork } })
      }
      return moduleRequire(id)
    },
    process: { env: { DSH_NODE_PTY_SPAWN_HELPER: options.override }, execPath, cwd: () => paths.resolve('/work') }
  }, { filename })

  const UnixTerminal = exports.UnixTerminal
  if (!UnixTerminal) throw new Error('installed node-pty did not export UnixTerminal')
  expect(() => new UnixTerminal('/bin/sh', [], { env: {} })).toThrow(stopped)
  expect(fork).toHaveBeenCalledOnce()
  expect(existsSync.mock.calls).toEqual(options.override ? [] : [[sibling]])
  const helper = fork.mock.calls[0]?.[9]
  if (typeof helper !== 'string') throw new Error('native fork did not receive a helper path')
  return helper
}

describe.each([
  ['POSIX', path.posix],
  ['Windows separators', path.win32]
] as const)('node-pty default helper with %s', (_name, paths) => {
  it.each([
    ['app.asar', 'app.asar.unpacked'],
    ['node_modules.asar', 'node_modules.asar.unpacked'],
    ['app.asar.unpacked', 'app.asar.unpacked'],
    ['node_modules.asar.unpacked', 'node_modules.asar.unpacked'],
    ['app.asar.unpacked.unpacked', 'app.asar.unpacked.unpacked'],
    ['node_modules.asar.unpacked.unpacked', 'node_modules.asar.unpacked.unpacked'],
    ['plain', 'plain'],
    ['myapp.asar', 'myapp.asar'],
    ['my_node_modules.asar', 'my_node_modules.asar'],
    ['app.asar.backup', 'app.asar.backup'],
    ['node_modules.asar.backup', 'node_modules.asar.backup'],
    ['appXasar', 'appXasar'],
    ['app.asar/node_modules.asar', 'app.asar.unpacked/node_modules.asar.unpacked'],
    ['app.asar/app.asar', 'app.asar.unpacked/app.asar.unpacked'],
    ['node_modules.asar/node_modules.asar', 'node_modules.asar.unpacked/node_modules.asar.unpacked'],
    ['app.asar.backup/app.asar', 'app.asar.backup/app.asar.unpacked'],
    ['myapp.asar/node_modules.asar.unpacked', 'myapp.asar/node_modules.asar.unpacked']
  ])('maps only exact archive segments: %s', (input, expected) => {
    const directory = paths.resolve('/resources', input, 'node-pty/lib')
    const helper = paths.resolve('/resources', expected, 'node-pty/prebuilds/darwin-arm64/spawn-helper')
    expect(resolveHelper(directory, paths)).toBe(helper)
    // Feed the resolved physical location through the fallback again.
    expect(resolveHelper(paths.dirname(helper), paths, { nativeDirectory: '.' })).toBe(helper)
  })

  it('keeps an explicit helper above the executable sibling and archive fallback', () => {
    const override = paths.resolve('/external/app.asar/node_modules.asar/spawn-helper')
    expect(resolveHelper(paths.resolve('/resources/app.asar.unpacked/lib'), paths, {
      override, sibling: true
    })).toBe(override)
  })

  it('resolves a relative explicit helper without archive rewriting', () => {
    const override = 'external/app.asar/spawn-helper'
    expect(resolveHelper(paths.resolve('/resources/app.asar.unpacked/lib'), paths, { override }))
      .toBe(paths.resolve(override))
  })

  it('keeps an executable sibling above the archive fallback without rewriting it', () => {
    expect(resolveHelper(paths.resolve('/resources/app.asar.unpacked/lib'), paths, { sibling: true }))
      .toBe(paths.resolve('/runtime/app.asar/node') + '-spawn-helper')
  })

  it('treats an empty override as absent', () => {
    expect(resolveHelper(paths.resolve('/resources/app.asar.unpacked/lib'), paths, { override: '', sibling: true }))
      .toBe(paths.resolve('/runtime/app.asar/node') + '-spawn-helper')
  })
})

it('handles mixed separators using the actual path resolver', () => {
  expect(resolveHelper('C:\\resources/app.asar\\node_modules.asar/node-pty/lib', path.win32))
    .toBe('C:\\resources\\app.asar.unpacked\\node_modules.asar.unpacked\\node-pty\\prebuilds\\darwin-arm64\\spawn-helper')
})

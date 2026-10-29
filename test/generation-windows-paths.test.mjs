import { readFileSync } from 'node:fs'
import { win32 } from 'node:path'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

it('finds a wildcard-export package root across Windows short and physical paths', async () => {
  const source = readFileSync('packages/dsh-desktop-market-installer/generations/installer.mjs', 'utf8')
  const code = source.slice(source.indexOf('function hasRuntimeExport('), source.indexOf('/** Verify every installed'))
  const short = String.raw`C:\Users\RUNNER~1\AppData\Local\Temp\generation\node_modules`
  const full = String.raw`C:\Users\runneradmin\AppData\Local\Temp\generation\node_modules`
  const physical = path => path.replace(short, full)
  const root = win32.join(full, 'sdk')
  const files = new Map([
    [win32.join(root, 'package.json'), JSON.stringify({ name: 'sdk', exports: { './*': './dist/cjs/*', './client': './dist/cjs/client.js' } })],
    [win32.join(root, 'dist/cjs/package.json'), '{"type":"commonjs"}'],
    [win32.join(root, 'dist/cjs/client.js'), 'module.exports = {}']
  ])
  const resolve = () => win32.join(short, 'sdk/dist/cjs/package.json')
  resolve.paths = () => [short]
  const locate = runInNewContext(code + ';resolveNonRootPackage', {
    ...win32,
    existsSync: path => files.has(physical(path)),
    readFile: async path => {
      const value = files.get(physical(path))
      if (value === undefined) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      return value
    },
    realpath: async path => physical(path),
    isInsideDirectory: (parent, child) => {
      const relative = win32.relative(parent, child)
      return relative === '' || (!relative.startsWith('..') && !win32.isAbsolute(relative))
    }
  })
  expect(await locate({ resolve }, 'sdk')).toBe(win32.join(root, 'dist/cjs/client.js'))
})

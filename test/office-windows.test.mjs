import { expect, it } from 'vitest'
import { bundledRuntimeRoot, confinementArgv, libreOfficeConversionArgv, libreOfficeReadRoots, prepareLibreOfficeProfile, runtimeEnvironment } from '../packages/dsh-office/lib/runtime.js'

it('discovers engines after Windows installer and app relocation, including packaged Node', () => {
  for (const app of ['C:\\Users\\user\\AppData\\Local\\Programs\\DSH Desktop', 'D:\\中文目录\\DSH Dev']) {
    for (const exe of ['DSH Desktop.exe', 'resources\\app\\node_modules\\node\\bin\\node.exe', 'resources\\app\\node_modules\\node\\node_modules\\node-win-x64\\bin\\node.exe']) {
      expect(bundledRuntimeRoot(`${app}\\${exe}`, 'win32')).toBe(`${app}\\resources\\office-runtime`)
    }
  }
  expect(bundledRuntimeRoot('/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop', 'darwin')).toBe('/Applications/DSH Desktop.app/Contents/Resources/office-runtime')
})

it('passes literal Windows argv and explicit grants to the confined runner', () => {
  const argv = ['C:\\Runtime\\node.exe', '-e', 'console.log("中文 & $PATH")', '', 'x\\']
  const command = confinementArgv(argv, 'C:\\Jobs\\中文 任务', ['C:\\Runtime'], {
    platform: 'win32', windowsSandbox: 'C:\\App\\office-sandbox.exe', timeoutMs: 3000
  })
  expect(command.slice(command.indexOf('--') + 1)).toEqual(argv)
  expect(command.slice(0, -argv.length)).toEqual(['C:\\App\\office-sandbox.exe', '--job', 'C:\\Jobs\\中文 任务', '--timeout-ms', '3000', '--read', 'C:\\Runtime', '--'])
  expect(() => confinementArgv(argv, 'C:\\Jobs', [], { platform: 'win32' })).toThrow('OFFICE_SANDBOX_UNAVAILABLE')
  expect(() => confinementArgv(argv, 'relative', [], { platform: 'win32', windowsSandbox: 'runner.exe' })).toThrow('absolute paths')
})

it('constructs the Windows loader environment from a small allowlist', () => {
  const env = runtimeEnvironment('win32', 'D:\\Windows')
  expect(env).toEqual({ SystemRoot: 'D:\\Windows', WINDIR: 'D:\\Windows', PATH: 'D:\\Windows\\System32', LANG: 'en_US.UTF-8', NODE_OPTIONS: '--preserve-symlinks --preserve-symlinks-main' })
  expect(env).not.toHaveProperty('USERPROFILE')
})

it('uses the embedded conversion worker with escaped Unicode file URLs on Windows', () => {
  const runtime = { libreOffice: 'C:\\Office\\program\\soffice.com', windowsConverter: 'C:\\Office\\program\\dsh-office-convert.exe' }
  const options = { profile: 'D:\\任务 空间\\profile', input: 'D:\\任务 空间\\input.docx', outputDir: 'D:\\任务 空间\\converted', format: 'pdf' }
  const args = libreOfficeConversionArgv(runtime, options, 'win32')
  expect(args.slice(0, 2)).toEqual([runtime.windowsConverter, 'C:\\Office\\program'])
  expect(args.slice(2)).toEqual(['file:///D:/%E4%BB%BB%E5%8A%A1%20%E7%A9%BA%E9%97%B4/profile', 'file:///D:/%E4%BB%BB%E5%8A%A1%20%E7%A9%BA%E9%97%B4/input.docx', 'file:///D:/%E4%BB%BB%E5%8A%A1%20%E7%A9%BA%E9%97%B4/converted/input.pdf', 'pdf'])
  expect(() => libreOfficeConversionArgv({ libreOffice: runtime.libreOffice }, options, 'win32')).toThrow('LibreOfficeKit conversion worker')
})

it('normalizes Python stdlib ZIP, nested and duplicate paths into directory grants', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')
  const { readGrantDirectories } = await import('../packages/dsh-office/lib/runtime.js')
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'office-grants-'))
  try {
    const python = path.join(root, 'python'), site = path.join(python, 'Lib', 'site-packages')
    const sibling = path.join(root, 'python-tools')
    await fs.mkdir(site, { recursive: true }); await fs.mkdir(sibling)
    const zip = path.join(python, 'python313.zip'); await fs.writeFile(zip, 'stdlib fixture')
    expect(await readGrantDirectories([zip, python, site, python, sibling])).toEqual([await fs.realpath(python), await fs.realpath(sibling)])
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

it('prepares independent Windows profiles from the shipped presets before marking setup complete', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'office-profile-'))
  try {
    const defaults = path.join(root, 'engine/presets/config')
    await fs.mkdir(defaults, { recursive: true })
    await fs.writeFile(path.join(defaults, 'settings.xml'), 'bundled defaults')
    const runtime = { libreOffice: path.join(root, 'engine/program/soffice.com') }
    const first = path.join(root, 'first'), second = path.join(root, 'second')
    await prepareLibreOfficeProfile(first, runtime, 'win32')
    await prepareLibreOfficeProfile(second, runtime, 'win32')
    await fs.writeFile(path.join(first, 'user/config/settings.xml'), 'private changes')
    expect(await fs.readFile(path.join(second, 'user/config/settings.xml'), 'utf8')).toBe('bundled defaults')
    expect(await fs.readFile(path.join(defaults, 'settings.xml'), 'utf8')).toBe('bundled defaults')
    const settings = await fs.readFile(path.join(first, 'user/registrymodifications.xcu'), 'utf8')
    expect(settings).toContain('ooSetupInstCompleted')
    expect(settings).toContain('OOXMLRecalcMode')
    await expect(prepareLibreOfficeProfile(path.join(root, 'missing'), { libreOffice: path.join(root, 'absent/program/soffice.com') }, 'win32')).rejects.toThrow()
    await expect(fs.access(path.join(root, 'missing/user/registrymodifications.xcu'))).rejects.toThrow()
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

it('bounds Windows conversion discovery to the dedicated bundled engines', () => {
  const root = 'D:\\中文 应用\\resources\\office-runtime'
  expect(libreOfficeReadRoots(root + '\\libreoffice\\program\\soffice.com', root, 'win32')).toEqual([root])
  expect(() => libreOfficeReadRoots('C:\\Program Files\\LibreOffice\\program\\soffice.com', root, 'win32')).toThrow('inside the configured runtime bundle')
  expect(() => libreOfficeReadRoots(root + '\\libreoffice\\program\\soffice.com', undefined, 'win32')).toThrow('configured runtime bundle')
})

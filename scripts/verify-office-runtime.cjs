/** Native payload and rendering gate, also usable on the installed application. */
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { promisify } = require('node:util')
const execFile = promisify(require('node:child_process').execFile)

async function verifyOfficeRuntime(resources, executable, smokeScript = path.join(__dirname, 'office-runtime', 'smoke.py')) {
  const payload = path.join(resources, 'office-runtime', 'primary-runtime')
  const metadata = path.join(payload, 'runtime.json')
  const manifest = JSON.parse(await fs.readFile(metadata, 'utf8'))
  if (manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error('Office runtime target mismatch')
  if (manifest.node !== undefined || manifest.pnpm !== undefined) throw new Error('Office payload must not duplicate the Electron Node runtime')
  const python = path.join(payload, 'dependencies', 'python', ...(process.platform === 'win32' ? ['python.exe'] : ['bin', 'python3']))
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-office-smoke-'))
  const options = { cwd: scratch, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 120_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true }
  try {
    await execFile(executable, [path.join(__dirname, 'office-runtime', 'probe.cjs'), path.join(resources, 'app.asar'), resources], options)
    await execFile(python, ['-I', '-B', smokeScript, scratch, metadata], options)
    await execFile(python, ['-I', '-B', '-m', 'pip', 'check'], options)
    const checker = path.join(resources, 'office-runtime', 'office-skills', 'scripts', 'check_office.py')
    const cli = path.join(resources, 'office-cli.mjs')
    await execFile(executable, [cli, 'capabilities', '--json'], options)
    for (const extension of ['docx', 'pptx', 'xlsx']) {
      const input = path.join(scratch, `sample.${extension}`)
      await execFile(python, ['-I', '-B', checker, input, '--contains', 'Office runtime smoke'], options)
      await execFile(executable, [cli, 'convert', '--input', input, '--output', path.join(scratch, `${extension}.pdf`)], options)
      const pdf = await fs.readFile(path.join(scratch, `${extension}.pdf`))
      if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Office ${extension} conversion did not produce PDF`)
    }
    console.log('Packaged Office authoring, structure checks and DOCX/PPTX/XLSX PDF conversion passed')
  } finally {
    await fs.rm(scratch, { recursive: true, force: true })
  }
}

async function afterPack(context) {
  const product = context.packager.appInfo.productFilename
  const contents = path.join(context.appOutDir, `${product}.app`, 'Contents')
  const resources = process.platform === 'darwin' ? path.join(contents, 'Resources') : path.join(context.appOutDir, 'resources')
  const executable = process.platform === 'darwin'
    ? path.join(contents, 'Frameworks', `${product} Helper.app`, 'Contents', 'MacOS', `${product} Helper`)
    : path.join(context.appOutDir, `${product}.exe`)
  await verifyOfficeRuntime(resources, executable)
}
module.exports = { verifyOfficeRuntime, afterPack }
if (require.main === module) verifyOfficeRuntime(path.resolve(process.argv[2]), path.resolve(process.argv[3])).catch(error => {
  console.error(error)
  process.exitCode = 1
})

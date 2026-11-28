/** Native payload and rendering gate, also usable on the installed application. */
const fs = require('node:fs/promises')
const path = require('node:path')
const { packagedLayout } = require('./packaged-layout.cjs')
const os = require('node:os')
const { promisify } = require('node:util')
const execFile = promisify(require('node:child_process').execFile)

async function verifyOfficeRuntime(resources, executable, smokeScript = path.join(__dirname, '..', 'office-runtime', 'smoke.py'), execute = execFile) {
  const payload = path.join(resources, 'office-runtime', 'primary-runtime')
  const metadata = path.join(payload, 'runtime.json')
  const manifest = JSON.parse(await fs.readFile(metadata, 'utf8'))
  if (manifest.platform !== process.platform || manifest.arch !== process.arch) throw new Error('Office runtime target mismatch')
  if (manifest.node !== undefined || manifest.pnpm !== undefined) throw new Error('Office payload must not duplicate the Electron Node runtime')
  const python = path.join(payload, 'dependencies', 'python', ...(process.platform === 'win32' ? ['python.exe'] : ['bin', 'python3']))
  const diagnosticsDirectory = process.env.DSH_OFFICE_SMOKE_DIAGNOSTICS_DIR || os.tmpdir()
  await fs.mkdir(diagnosticsDirectory, { recursive: true })
  const scratch = await fs.mkdtemp(path.join(diagnosticsDirectory, 'dsh-office-smoke-'))
  // Let the CLI report its own 120-second deadline before the process watchdog fires.
  const options = { cwd: scratch, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 120_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true }
  let stage = 'Python authoring smoke'
  try {
    await execute(python, ['-I', '-B', smokeScript, scratch, metadata], options)
    stage = 'Packaged Office plugin probe'
    const probe = await execute(executable, [path.join(__dirname, '..', 'office-runtime', 'probe.cjs'), path.join(resources, 'app.asar'), resources, scratch], options)
    if (probe.stdout) process.stdout.write(probe.stdout)
    stage = 'Python dependency check'
    await execute(python, ['-I', '-B', '-m', 'pip', 'check'], options)
    const cli = path.join(resources, 'office-cli.mjs')
    stage = 'Office CLI capabilities'
    await execute(executable, [cli, 'capabilities', '--json'], options)
    for (const extension of ['docx', 'pptx', 'xlsx']) {
      const input = path.join(scratch, `sample.${extension}`)
      // smoke.py reopens each document and checks content and OPC paths;
      // current upstream skills no longer ship scripts/check_office.py.
      stage = `${extension.toUpperCase()} to PDF conversion`
      await execute(executable, [cli, 'convert', '--input', input, '--output', path.join(scratch, `${extension}.pdf`), '--timeout-ms', '120000'], { ...options, timeout: 150_000 })
      stage = `${extension.toUpperCase()} PDF validation`
      const pdf = await fs.readFile(path.join(scratch, `${extension}.pdf`))
      if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Office ${extension} conversion did not produce PDF`)
    }
    console.log('Packaged Office authoring, structure checks and DOCX/PPTX/XLSX PDF conversion passed')
  } catch (cause) {
    // electron-builder prints message/stack, but drops execFile's diagnostic fields.
    const outputTail = value => String(value ?? '').slice(-16 * 1024)
    console.error([
      `Packaged Office gate failed at ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`,
      `code=${cause?.code ?? 'unknown'} signal=${cause?.signal ?? 'none'} killed=${cause?.killed ?? 'unknown'}`,
      `stdout (last 16384 characters):\n${outputTail(cause?.stdout)}`,
      `stderr (last 16384 characters):\n${outputTail(cause?.stderr)}`,
      `Office smoke scratch preserved: ${scratch}`
    ].join('\n'))
    throw cause
  }
  await fs.rm(scratch, { recursive: true, force: true })
}

async function afterPack(context) {
  const { resources, executable } = packagedLayout(context)
  await verifyOfficeRuntime(resources, executable)
}
module.exports = { verifyOfficeRuntime, afterPack }
if (require.main === module) verifyOfficeRuntime(path.resolve(process.argv[2]), path.resolve(process.argv[3])).catch(error => {
  console.error(error)
  process.exitCode = 1
})

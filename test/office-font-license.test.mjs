import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const exec = promisify(execFile)
const sourceRelative = 'packages/dsh-desktop-office/sources/curated/government-notice'
const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
const audit = resolve('scripts/office-runtime/check-templates.py')

it('preserves approved font license bytes through Windows-style checkout and the real DOCX audit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'office-font-license-'))
  const git = args => exec('git', args, { cwd: directory, timeout: 30_000 })
  try {
    await cp(resolve(sourceRelative), join(directory, sourceRelative), { recursive: true })
    await writeFile(join(directory, '.gitattributes'), await readFile(resolve('.gitattributes')))
    // This control proves core.autocrlf=true is active, rather than assuming it.
    await writeFile(join(directory, 'checkout-control.txt'), 'first\nsecond\n')
    await git(['init', '--quiet'])
    await git(['-c', 'core.autocrlf=false', 'add', '--', '.gitattributes', sourceRelative, 'checkout-control.txt'])
    const approved = await readFile(resolve(sourceRelative, 'OFL.txt'))
    for (const conversion of ['false', 'true']) {
      const license = join(directory, sourceRelative, 'OFL.txt')
      const control = join(directory, 'checkout-control.txt')
      await rm(license)
      await rm(control)
      await git(['-c', 'core.autocrlf=' + conversion, 'checkout-index', '--force', '--all'])
      expect(await readFile(license)).toEqual(approved)
      expect(await readFile(control, 'utf8')).toBe(conversion === 'true' ? 'first\r\nsecond\r\n' : 'first\nsecond\n')
      const { stdout } = await exec(python, ['-I', '-B', '-c', String.raw`
import hashlib, importlib.util, json, sys
from pathlib import Path
spec = importlib.util.spec_from_file_location('template_audit', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = Path(sys.argv[2])
license = (source / 'OFL.txt').read_bytes()
assert b'\r' not in license
assert hashlib.sha256(license).hexdigest() == module.APPROVED_NOTICE_FONT['licenseSha256']
result = module.audit_docx(source / 'example.docx', source, 'government-notice')
assert result == {'embedded_fonts': 3139120, 'family': 'DSH Gov Song'}
print(json.dumps(result))
`, audit, join(directory, sourceRelative)], { timeout: 30_000 })
      expect(JSON.parse(stdout)).toEqual({ embedded_fonts: 3139120, family: 'DSH Gov Song' })
    }
  } finally { await rm(directory, { recursive: true, force: true }) }
}, 60_000)

it('keeps the exact approved license hash gate for manual CRLF conversion and changed attribution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'office-font-license-negative-'))
  try {
    await cp(resolve(sourceRelative), directory, { recursive: true })
    const { stdout } = await exec(python, ['-I', '-B', '-c', String.raw`
import importlib.util, sys
from pathlib import Path
spec = importlib.util.spec_from_file_location('template_audit', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = Path(sys.argv[2])
path = source / 'OFL.txt'
approved = path.read_bytes()
for changed in [approved.replace(b'\n', b'\r\n'), approved.replace(b'Copyright 2017-2022 Adobe', b'Copyright 2017-2023 Adobe'), approved + b' ', approved[:-1]]:
    assert changed != approved
    path.write_bytes(changed)
    try:
        module.audit_docx(source / 'example.docx', source, 'government-notice')
    except AssertionError as error:
        assert 'OFL license does not match the approved notice font' in str(error), error
    else:
        raise AssertionError('changed license bypassed the approved-byte digest')
path.unlink()
try:
    module.audit_docx(source / 'example.docx', source, 'government-notice')
except FileNotFoundError:
    pass
else:
    raise AssertionError('missing license accepted')
print('approved license hash retained')
`, audit, directory], { timeout: 30_000 })
    expect(stdout).toContain('approved license hash retained')
  } finally { await rm(directory, { recursive: true, force: true }) }
}, 60_000)

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

it('copies verified numeric caches and rejects stale inputs, changed formulas, calculation errors and output overwrite', () => {
  const helper = resolve('packages/dsh-desktop-office/lib/xlsx-cache.py')
  const program = `import io, pathlib, runpy, tempfile, zipfile, subprocess, sys
w=runpy.run_path(${JSON.stringify(helper)})
def package(quantity='12',formula='B2*C2',cache='',kind='n'):
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w') as z:
  z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="经营测算" sheetId="1" r:id="rId1"/></sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Type="http://x/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
  z.writestr('xl/styles.xml','immutable-styles')
  z.writestr('xl/worksheets/sheet1.xml',f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="B2"><v>{quantity}</v></c><c r="C2"><v>25</v></c><c r="D2" s="1" t="{kind}"><f>{formula}</f>{"<v>"+cache+"</v>" if cache else ""}</c></row></sheetData></worksheet>')
 return b.getvalue()
source=package();result,count=w['merge'](source,package(cache='300'))
assert count==1
with zipfile.ZipFile(io.BytesIO(result)) as z:
 assert z.read('xl/styles.xml')==b'immutable-styles'
 assert b'<f>B2*C2</f>' in z.read('xl/worksheets/sheet1.xml') and b'<v>300</v>' in z.read('xl/worksheets/sheet1.xml')
for bad in [package(quantity='10',cache='250'),package(formula='B2+C2',cache='37'),package(cache='#VALUE!',kind='e'),package()]:
 try:w['merge'](source,bad)
 except ValueError:pass
 else:raise AssertionError('invalid cache input accepted')
with tempfile.TemporaryDirectory() as temporary:
 root=pathlib.Path(temporary); (root/'source.xlsx').write_bytes(source); (root/'calculated.xlsx').write_bytes(package(cache='300'))
 (root/'existing.xlsx').write_bytes(b'keep-existing-output')
 command=[sys.executable,'-I','-B',${JSON.stringify(helper)},'--source','source.xlsx','--calculated','calculated.xlsx','--output']
 for target in ['existing.xlsx','source.xlsx','../outside.xlsx']:
  attempt=subprocess.run(command+[target],cwd=root,capture_output=True)
  assert attempt.returncode!=0
 assert (root/'source.xlsx').read_bytes()==source
 assert (root/'existing.xlsx').read_bytes()==b'keep-existing-output'
 assert subprocess.run(command+['final.xlsx'],cwd=root,capture_output=True).returncode==0
 assert (root/'final.xlsx').is_file()
print('native-cache-boundaries-pass')`
  const result = spawnSync(resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3'), ['-I', '-B', '-c', program], { encoding: 'utf8' })
  expect(result.stderr).toBe(''); expect(result.status).toBe(0); expect(result.stdout).toContain('native-cache-boundaries-pass')
})

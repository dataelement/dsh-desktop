// Exercise isolated authoring and calculation before the complete native gate.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { authorScript, convertWithLibreOffice, withJob } from '../packages/dsh-office/lib/runtime.js'
import { inspectOffice } from '../packages/dsh-office/lib/inspect.js'
const root = process.env.DSH_OFFICE_BUNDLE_ROOT
if (process.platform !== 'win32' || !root) throw new Error('Windows bundled runtime required')
const config = { runtimeRoot: root }
await withJob(async job => {
  const authored = await authorScript({ language: 'python', source: "from openpyxl import Workbook\nwb=Workbook()\nws=wb.active\nws['A1']=4\nws['B1']=120\nws['C1']='=A1*B1'\nwb.save(office['output'])", inputs: [], outputName: 'input.xlsx', job, config })
  const result = await convertWithLibreOffice({ bytes: await readFile(authored.output), extension: 'xlsx', format: 'xlsx', config })
  const inspected = inspectOffice(result.bytes)
  assert.equal(inspected.formulas.missingCache, 0)
  assert.equal(inspected.sheets[0].cells.find(cell => cell.ref === 'C1').value, 480)
  assert.equal(result.execution.confinement.backend, 'windows-appcontainer')
  console.log(JSON.stringify({ status: 'PASS', conversion: 'isolated Windows XLSX', outputBytes: result.bytes.length, confinement: result.execution.confinement }))
})

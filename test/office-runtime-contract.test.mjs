import { expect, it } from 'vitest'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'

it('registers the current OOXML, authoring, recalculation and template tool surface', () => {
  const registered = new Set()
  registerOfficeTools({
    tools: { register(tool) { registered.add(tool.name) } },
    get: () => ({ resolve: () => ({ mode: 'workspace-write' }) })
  }, { root: '/tmp/office-runtime-contract' })
  expect([...registered].sort()).toEqual([
    'office_build',
    'office_excel_edit',
    'office_inspect',
    'office_recalculate',
    'office_template',
    'office_word_edit',
    'office_word_read'
  ])
})

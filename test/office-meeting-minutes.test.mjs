import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
const validator = resolve('packages/dsh-desktop-office/business-skills/meeting-recap/scripts/validate_minutes.py')
async function validate(actions) {
  const content = '# 试点评审会议纪要\n\n## 议题记录\n已定事项：按两个小组试点，扩组建议留待复盘。\n\n## 行动项\n' + actions
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c',
    'import runpy,json,sys; m=runpy.run_path(sys.argv[1]); r=m["validate"](sys.argv[2]); print(json.dumps({"passed":r.passed,"errors":r.errors,"warnings":r.warnings}))', validator, content])
  return JSON.parse(stdout)
}
const header = '| 任务 | 负责人 | 期限 | 交付标准 |\n| --- | --- | --- | --- |\n'

it('accepts explicit unknowns and preserves a relative deadline without inventing dates or owners', async () => {
  const result = await validate(header + '| 核对试点安排 | 待确认 | 下周 | 客户确认参会人 |')
  expect(result.passed).toBe(true)
  expect(result.warnings).toHaveLength(1)
})

it('preserves empty table cells and reports the missing owner in its original column', async () => {
  const result = await validate(header + '| 核对试点安排 | | 2026-09-09 | 客户确认参会人 |')
  expect(result.passed).toBe(false)
  expect(result.errors).toContain('行动项缺失字段请标为待确认')
  const missingDeliverable = await validate(header + '| 核对试点安排 | 陈晨 | 下周 ||')
  expect(missingDeliverable.errors).toContain('行动项缺失字段请标为待确认')
})

it('checks real calendar dates and duplicate tasks', async () => {
  const result = await validate(header + '| 核对试点安排 | 陈晨 | 2026-02-30 | 客户确认 |\n| 核对试点安排 | 陈晨 | 待确认 | 客户确认 |')
  expect(result.passed).toBe(false)
  expect(result.errors.some(message => message.includes('2026-02-30'))).toBe(true)
  expect(result.errors.some(message => message.includes('重复任务'))).toBe(true)
})

it('accepts a meeting with no new tasks and reports an empty action table', async () => {
  expect((await validate('本次没有新增任务，继续执行上次会议确认的计划。')).passed).toBe(true)
  expect((await validate(header)).passed).toBe(false)
})

it('requires the deliverable column and consistent row dimensions', async () => {
  expect((await validate('| 任务 | 负责人 | 期限 |\n| --- | --- | --- |\n| 核对 | 陈晨 | 下周 |')).passed).toBe(false)
  expect((await validate(header + '| 核对 | 陈晨 | 下周 |')).passed).toBe(false)
})

it('renders the government notice from editable text and keeps the curated source', async () => {
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c', `
import json
import zipfile
from pathlib import Path
from PIL import Image
root = Path('.build/office-runtime/templates')
image = Image.open(root / 'government-notice/pages/1.webp').convert('RGB')
source = Path('packages/dsh-desktop-office/sources/curated/government-notice/example.docx')
with zipfile.ZipFile(root / 'government-notice/example.docx') as archive:
    media = [name for name in archive.namelist() if name.startswith('word/media/')]
red_page = sum(1 for pixel in image.getdata() if pixel[0] > 160 and pixel[1] < 100 and pixel[2] < 100)
print(json.dumps({'redPage': red_page, 'media': media, 'originalSource': (root / 'government-notice/example.docx').read_bytes() == source.read_bytes()}))
`])
  const result = JSON.parse(stdout)
  expect(result.originalSource).toBe(true)
  expect(result.media).toEqual([])
  expect(result.redPage).toBeGreaterThan(1000)
})

it('keeps the approved meeting editable with native headings, fifteen actions and preserved relative deadlines', async () => {
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c', `
import json
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
source = Path('packages/dsh-desktop-office/sources/curated/meeting-minutes/example.docx')
sample = Path('.build/office-runtime/templates/meeting-minutes/example.docx')
document = Document(sample)
table = document.tables[0]
title = next(p for p in document.paragraphs if p.style.name == 'Title')
text = '\\n'.join(cell.text for row in table.rows for cell in row.cells)
grid = [int(col.get(qn('w:w'))) for col in table._tbl.find(qn('w:tblGrid'))]
result = {'sameSource':source.read_bytes()==sample.read_bytes(), 'actions':len(table.rows)-1,
          'columns':len(table.columns), 'grid':grid, 'todayCount':text.count('今天下班前'),
          'reviewTime':'明天下午对齐' in text, 'marketPolish':'市场润色话术' in text,
          'absoluteDeadline':'2024-07-23' in text or '2024-07-22' in text,
          'titleBorder':title._p.find('./'+qn('w:pPr')+'/'+qn('w:pBdr')) is not None,
          'styleBorder':document.styles['Title']._element.find('./'+qn('w:pPr')+'/'+qn('w:pBdr')) is not None,
          'headingStyles':sorted({p.style.name for p in document.paragraphs if p.style.name.startswith('Heading')})}
print(json.dumps(result))
`])
  expect(JSON.parse(stdout)).toEqual({ sameSource: true, actions: 15, columns: 3,
    grid: [5783, 1757, 2097], todayCount: 2, reviewTime: true, marketPolish: true,
    absoluteDeadline: false, titleBorder: false, styleBorder: false, headingStyles: ['Heading 1', 'Heading 2'] })
})

it('renders complete meeting title glyphs using the explicit Chinese font family', async () => {
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c', `
import json
import zipfile
from pathlib import Path
from lxml import etree
from PIL import Image
root = Path('.build/office-runtime/templates/meeting-minutes')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(root / 'example.docx') as archive:
    families = {font for name in ('word/document.xml', 'word/styles.xml', 'word/footer1.xml')
                for font in etree.fromstring(archive.read(name)).xpath('//w:rFonts/@w:eastAsia', namespaces=ns)}
proof = json.loads((root / 'preview-checks.json').read_text(encoding='utf-8'))['checks'][0]
image = Image.open(root / proof['image']).convert('RGB')
x0, y0, x1, y1 = proof['region']
region = image.crop((int(image.width*x0), int(image.height*y0), int(image.width*x1), int(image.height*y1)))
coverage = sum(max(pixel) < proof['darkMax'] for pixel in region.getdata()) / (region.width * region.height)
print(json.dumps({'families':sorted(families), 'coverage':coverage, 'minimum':proof['minInkCoverage']}))
`])
  const result = JSON.parse(stdout)
  expect(result.families).toContain('Hiragino Sans GB W3')
  expect(result.families).not.toContain('Hiragino Sans GB')
  expect(result.minimum).toBe(0.14)
  expect(result.coverage).toBeGreaterThanOrEqual(result.minimum)
})

import { describe, it, expect } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
import { unzipSync } from 'fflate'
import { parsePptdProject, renderPptdProject } from 'dsh-ppt/pptd'

it('uses the paired Chinese face for Chinese text and the Latin face for English text', async () => {
  const fontFamily = { latin: 'Georgia', ea: 'Noto Serif CJK SC', mac: 'Songti SC', win: 'SimSun' }
  const page = { elements: ['A thoughtful decision', '一个审慎的决定'].map((text, index) => ({ elementId: `title-${index}`, elementType: 'text', bounds: [48, 100 + index * 150, 800, 100], content: { text, fontFamily, fontSize: 38 } })) }
  const project = parsePptdProject({ entryName: 'deck.pptd', manifest: yaml.dump({ version: 'v2', title: 'Bilingual font test', size: [960, 540], pages: ['01.page'] }), pages: new Map([['01.page', yaml.dump(page)]]), assets: new Map() })
  const rendered = await renderPptdProject(project)
  const files = unzipSync(rendered.bytes)
  const slide = new TextDecoder().decode(files['ppt/slides/slide1.xml'])
  expect(new TextDecoder().decode(files['ppt/theme/theme1.xml'])).not.toContain('MiSans')
  expect(slide).toContain('typeface="Georgia"')
  expect(slide).toContain(`typeface="${process.platform === 'darwin' ? 'Songti SC' : process.platform === 'win32' ? 'SimSun' : 'Noto Serif CJK SC'}"`)
  expect(slide).toContain('一个审慎的决定')
  expect(slide).not.toContain('<p:pic>')
})

describe('PPT bilingual catalog', () => {
  it('has English-only visible preview content and Chinese source examples in every pack', async () => {
    const root = path.resolve(import.meta.dirname, '../packages/ppt-runtime/templates')
    let count = 0
    function inspect(value, file) {
      if (!value || typeof value !== 'object') return
      for (const [key, item] of Object.entries(value)) {
        if (key === 'notes') continue
        if (typeof item === 'string') expect(item, `${file} ${key}`).not.toMatch(/[\u3400-\u9fff]/u)
        else inspect(item, file)
      }
    }
    for (const category of await readdir(root)) for (const slug of await readdir(path.join(root, category))) {
      const dir = path.join(root, category, slug)
      const { definition } = JSON.parse(await readFile(path.join(dir, 'metadata.json'), 'utf8'))
      expect(definition.previewLanguage).toBe('en')
      expect(definition.fonts.en.title).toBeTruthy()
      expect(definition.fonts.zh.title).toBeTruthy()
      expect(definition.fonts.fallbacks.zh.Windows).toBeTruthy()
      for (const page of await readdir(path.join(dir, 'source/pages'))) inspect(yaml.load(await readFile(path.join(dir, 'source/pages', page), 'utf8')), `${slug}/${page}`)
      const chinese = await Promise.all((await readdir(path.join(dir, 'source-zh/pages'))).map(page => readFile(path.join(dir, 'source-zh/pages', page), 'utf8')))
      expect(chinese.join('')).toMatch(/[\u3400-\u9fff]/u)
      count++
    }
    expect(count).toBe(16)
  })
})

it('wraps English at word boundaries without losing long tokens or Chinese text', async () => {
  const { wrapTextLines } = await import('../packages/ppt-runtime/core/lib/text-wrap.js')
  const lines = wrapTextLines('Make the first step clear', 14, text => text.length)
  expect(lines).toEqual(['Make the first', 'step clear'])
  expect(wrapTextLines('A point.', 7, text => text.length)).toEqual(['A', 'point.'])
  expect(wrapTextLines('averylongtoken', 5, text => text.length).join('')).toBe('averylongtoken')
  expect(wrapTextLines('观察证据再做决定', 4, text => text.length)).toEqual(['观察证据', '再做决定'])
})

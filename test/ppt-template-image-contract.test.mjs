import { describe, expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import yaml from 'js-yaml';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { parsePptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';
import { IMAGE_CONTRACT_SCHEMA, parseImageContract, readPptxImageContracts } from '../packages/ppt-runtime/core/lib/template-image-contract.js';

const contract = () => ({ schema: IMAGE_CONTRACT_SCHEMA, layoutId: 'scene', pageRole: '业务场景', style: { medium: '摄影', palette: '自然绿色', lighting: '日光', tone: '务实', textTreatment: '原生文字', continuity: '相同色温' }, slots: [{ elementId: 'photo', role: '应用场景', contentSources: ['title'], sourcePolicy: 'contextual-scene', subject: '正文中的参与者与工作现场', composition: '右侧主体', aspectRatio: '4:3', reuseGroup: 'scene', maskElementIds: ['mask'] }] });
async function pptx(c = contract()) {
  const ppt = new PptxGenJS(); const slide = ppt.addSlide();
  slide.addText('智慧农业', { objectName: 'title', x: 0.3, y: 0.3, w: 3, h: 0.5, fill: { color: 'FFFFFF' } });
  const png = await sharp({ create: { width: 48, height: 36, channels: 4, background: '#14CA5D' } }).png().toBuffer();
  slide.addImage({ objectName: 'photo', data: 'image/png;base64,' + png.toString('base64'), x: 4, y: 1, w: 4, h: 3 });
  slide.addShape('rect', { objectName: 'mask', x: 4, y: 1, w: 1, h: 1, fill: { color: 'FFFFFF' } });
  slide.addNotes(typeof c === 'string' ? c : JSON.stringify(c));
  return Buffer.from(await ppt.write({ outputType: 'nodebuffer' }));
}

describe('portable template image semantics', () => {
  it('preserves content, image and native mask bindings through two PPTX conversions', async () => {
    let bytes = await pptx();
    for (let pass = 0; pass < 2; pass++) {
      expect(readPptxImageContracts(bytes).size).toBe(1);
      const converted = await convertPptxToPptd(bytes, '模板.pptx');
      const page = yaml.load([...converted.source.pages.values()][0]);
      const c = parseImageContract(page.notes, page.elements);
      expect(c.slots).toHaveLength(1);
      expect(page.elements.find(e => e.elementId === c.slots[0].elementId).fit.mode).toBe('cover');
      expect(page.elements.find(e => e.elementId === c.slots[0].contentSources[0]).content.text).toContain('智慧农业');
      bytes = Buffer.from((await renderPptdProject(parsePptdProject(converted.source))).bytes);
    }
  });
  it('treats ordinary slide notes as content and validates only the declared contract', async () => {
    const converted = await convertPptxToPptd(await pptx('Author notes: use a green photo.'), '普通.pptx');
    expect(yaml.load([...converted.source.pages.values()][0]).notes).toBeUndefined();
    const c = contract(); c.tool = 'bash';
    expect(() => parseImageContract(JSON.stringify(c))).toThrow('字段');
  });
  it('rejects broken bindings, duplicate slots and unsupported provider ratios', async () => {
    const missing = contract(); missing.slots[0].contentSources = ['missing'];
    await expect(convertPptxToPptd(await pptx(missing), '坏绑定.pptx')).rejects.toThrow('唯一匹配');
    const duplicate = contract(); duplicate.slots.push(duplicate.slots[0]);
    expect(() => parseImageContract(JSON.stringify(duplicate))).toThrow('重复');
    const ratio = contract(); ratio.slots[0].aspectRatio = '3:2';
    expect(() => parseImageContract(JSON.stringify(ratio))).toThrow('比例');
  });
});

import { expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import yaml from 'js-yaml';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { boundedPptxMedia, createPptxImageReader, MAX_IMPORT_IMAGE_BYTES, MAX_IMPORT_IMAGE_PIXELS } from '../packages/ppt-runtime/core/lib/pptx-media.js';
import { parsePptdProject, checkPptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';

async function fixture(edit, options = {}) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const slide = pptx.addSlide(); slide.background = { color: '234567' };
  const png = await sharp({ create: { width: 12, height: 8, channels: 4, background: '#EEDDCC' } }).png().toBuffer();
  slide.addText('Before', { x: 1, y: .3, w: 2, h: .3, fontSize: 18 });
  slide.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: 1, y: 1, w: 3, h: 2, ...options });
  slide.addText('After', { x: 1, y: 4, w: 2, h: .3, fontSize: 18 });
  const parts = unzipSync(Buffer.from(await pptx.write({ outputType: 'nodebuffer' })));
  const mediaKey = Object.keys(parts).find(key => key.startsWith('ppt/media/') && key.endsWith('.png'));
  edit?.(parts, mediaKey);
  const bytes = Buffer.from(zipSync(parts, { level: 1 }));
  const converted = await convertPptxToPptd(bytes, 'media.pptx');
  return { bytes, converted, page: yaml.load([...converted.source.pages.values()][0]), png };
}

it.each(['missing', 'relationship', 'format', 'corrupt', 'unsafe-svg', 'emf'])(
  'keeps %s image geometry, layer order and replaceability through editable PPTX export', async mode => {
    const { converted, page } = await fixture((parts, mediaKey) => {
      if (mode === 'missing') delete parts[mediaKey];
      if (mode === 'relationship') parts['ppt/slides/slide1.xml'] = strToU8(strFromU8(parts['ppt/slides/slide1.xml']).replace(/r:embed="[^"]+"/, 'r:embed="missing"'));
      if (mode === 'corrupt') parts[mediaKey] = parts[mediaKey].subarray(0, 36);
      if (['format', 'unsafe-svg', 'emf'].includes(mode)) {
        const replacement = mode === 'format' ? 'unknown.wmf' : mode === 'emf' ? 'truncated.emf' : 'external.svg';
        parts['ppt/slides/_rels/slide1.xml.rels'] = strToU8(strFromU8(parts['ppt/slides/_rels/slide1.xml.rels']).replace(/Target="\.\.\/media\/[^\"]+"/, `Target="../media/${replacement}"`));
        parts['ppt/media/' + replacement] = mode === 'unsafe-svg' ? strToU8('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/image.png"/></svg>') : strToU8('invalid vector bytes');
        delete parts[mediaKey];
      }
    }, { rotate: 30, flipH: true });
    expect(converted.diagnostics.filter(item => item.level === 'unsupported')).toEqual([]);
    const warning = converted.diagnostics.find(item => item.level === 'placeholder');
    expect(warning).toMatchObject({ slide: 1, feature: 'picture', bounds: [72, 72, 216, 144] });
    expect(page.elements.map(item => item.elementType)).toEqual(['text', 'image', 'text']);
    const image = page.elements[1];
    expect(image).toMatchObject({ bounds: [72, 72, 216, 144], rotation: 30, flip: [true, false] });
    expect(warning.elementId).toBe(image.elementId);
    const asset = converted.source.assets.get(image.src);
    const { data, info } = await sharp(asset.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = [...data.subarray((10 * info.width + 10) * 4, (10 * info.width + 10) * 4 + 4)];
    expect(pixel.slice(0, 3)).toEqual([255, 255, 255]); expect(pixel[3]).toBeGreaterThan(220); expect(pixel[3]).toBeLessThan(255);
    const project = parsePptdProject(converted.source); expect(checkPptdProject(project).errorCount).toBe(0);
    const output = unzipSync((await renderPptdProject(project)).bytes);
    const xml = strFromU8(output['ppt/slides/slide1.xml']);
    expect(xml).toContain('<p:pic>'); expect(xml).toContain('rot="1800000"'); expect(xml).toContain('flipH="1"');
    expect(xml.indexOf('Before')).toBeLessThan(xml.indexOf('<p:pic>')); expect(xml.indexOf('<p:pic>')).toBeLessThan(xml.indexOf('After'));
  }
);

it('places a grouped missing picture using the composed coordinate transform', async () => {
  const { page } = await fixture((parts, mediaKey) => {
    delete parts[mediaKey];
    const key = 'ppt/slides/slide1.xml', xml = strFromU8(parts[key]), pic = xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)[0];
    const group = `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="90" name="group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="1828800" y="1828800"/><a:ext cx="5486400" cy="3657600"/><a:chOff x="914400" y="914400"/><a:chExt cx="2743200" cy="1828800"/></a:xfrm></p:grpSpPr>${pic}</p:grpSp>`;
    parts[key] = strToU8(xml.replace(pic, group));
  });
  expect(page.elements.find(item => item.elementType === 'image').bounds).toEqual([144, 144, 432, 288]);
});

it.each(['video', 'audio', 'p14-video'])('retains a %s position as a placeholder and skips its playback payload', async variant => {
  const kind = variant === 'audio' ? 'audio' : 'video';
  const { bytes, converted, page } = await fixture(parts => {
    const key = 'ppt/slides/slide1.xml';
    const media = variant === 'p14-video' ? '<p:extLst><p:ext uri="media"><p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="rIdPlayback"/></p:ext></p:extLst>' : `<a:${kind}File r:link="rIdPlayback"/>`;
    parts[key] = strToU8(strFromU8(parts[key]).replace(/(<p:nvPicPr>[\s\S]*?)<p:nvPr(?:\s*\/>|>[\s\S]*?<\/p:nvPr>)/, `$1<p:nvPr>${media}</p:nvPr>`));
    expect(strFromU8(parts[key])).toContain('rIdPlayback');
    parts['ppt/slides/_rels/slide1.xml.rels'] = strToU8(strFromU8(parts['ppt/slides/_rels/slide1.xml.rels']).replace('</Relationships>', `<Relationship Id="rIdPlayback" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${kind}" Target="../media/playback.${kind === 'video' ? 'mp4' : 'wav'}"/></Relationships>`));
    parts[`ppt/media/playback.${kind === 'video' ? 'mp4' : 'wav'}`] = new Uint8Array(33 * 1024 * 1024);
  });
  expect(boundedPptxMedia(bytes).omitted.size).toBe(1);
  expect(converted.diagnostics.filter(item => item.level === 'placeholder')).toMatchObject([{ feature: kind }]);
  expect(page.elements.find(item => item.elementType === 'image').bounds).toEqual([72, 72, 216, 144]);
});

it.each([false, true])('skips an oversized compressed picture before inflation, including nested media (%s)', async nested => {
  const { bytes, converted, page } = await fixture((parts, mediaKey) => {
    const target = nested ? 'ppt/media/nested/large.png' : mediaKey;
    if (nested) {
      parts['ppt/slides/_rels/slide1.xml.rels'] = strToU8(strFromU8(parts['ppt/slides/_rels/slide1.xml.rels']).replace(/Target="\.\.\/media\/[^\"]+"/, 'Target="../media/nested/large.png"'));
      delete parts[mediaKey];
    }
    parts[target] = new Uint8Array(33 * 1024 * 1024);
  });
  expect(boundedPptxMedia(bytes).omitted.size).toBe(1);
  expect(converted.diagnostics.find(item => item.level === 'placeholder').message).toContain('大小限制');
  expect(page.elements).toHaveLength(3);
});

it('bounds image pixel allocation, catches damaged payloads and reuses validated bytes', async () => {
  const reader = createPptxImageReader();
  const valid = await sharp({ create: { width: 16, height: 16, channels: 4, background: '#123456' } }).png().toBuffer();
  const first = await reader('image.png', valid); expect(first.bytes).toBe(valid); expect(await reader('image.png', valid)).toBe(first);
  expect((await reader('image.png', valid.subarray(0, 36))).reason).toBeTruthy();
  expect((await reader('image.png', new Uint8Array(MAX_IMPORT_IMAGE_BYTES + 1))).reason).toContain('大小限制');
  const giant = strToU8(`<svg xmlns="http://www.w3.org/2000/svg" width="${MAX_IMPORT_IMAGE_PIXELS}" height="2"><rect width="1" height="1"/></svg>`);
  expect((await reader('image.svg', giant)).reason).toBeTruthy();
});

it('keeps usable images unchanged and retains fatal structural failures as errors', async () => {
  const { converted, png } = await fixture();
  expect(converted.diagnostics.filter(item => item.level === 'placeholder')).toEqual([]);
  expect(Buffer.from([...converted.source.assets.values()][0].bytes)).toEqual(png);
  expect(() => boundedPptxMedia(Buffer.from('invalid zip'))).toThrow();
  const parts = { 'ppt/slides/slide1.xml': new Uint8Array(33 * 1024 * 1024) };
  expect(() => boundedPptxMedia(zipSync(parts, { level: 1 }))).toThrow('解析大小限制');
});

import { expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import yaml from 'js-yaml';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { parsePptdProject, checkPptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';

async function fixture(edit, setup) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const slide = pptx.addSlide();
  slide.addText('Before', { x: 1, y: .1, w: 2, h: .3, fontSize: 12 });
  if (setup) await setup(slide, pptx);
  else slide.addShape('rect', { x: 1, y: 1, w: 3, h: 1, fill: { color: '123456' } });
  slide.addText('After', { x: 1, y: 4, w: 2, h: .3, fontSize: 12 });
  const parts = unzipSync(Buffer.from(await pptx.write({ outputType: 'nodebuffer' })));
  edit?.(parts);
  const bytes = Buffer.from(zipSync(parts));
  const converted = await convertPptxToPptd(bytes, 'coverage.pptx');
  const page = yaml.load([...converted.source.pages.values()][0]);
  return { bytes, converted, page };
}
function replaceShape(parts, replace) {
  const key = 'ppt/slides/slide1.xml', xml = strFromU8(parts[key]);
  const shapes = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(match => match[0]);
  parts[key] = strToU8(xml.replace(shapes[1], replace(shapes[1])));
}
async function assertPlaceholder(result, feature) {
  const { converted, page } = result;
  expect(converted.diagnostics.filter(d => d.level === 'unsupported')).toEqual([]);
  const diagnostic = converted.diagnostics.find(d => d.level === 'placeholder');
  expect(diagnostic.feature).toBe(feature);
  expect(page.elements).toHaveLength(3);
  expect(page.elements[0].content.text).toContain('Before');
  expect(page.elements[2].content.text).toContain('After');
  expect(page.elements[1]).toMatchObject({ elementType: 'image', elementId: diagnostic.elementId, bounds: diagnostic.bounds });
  const project = parsePptdProject(converted.source);
  expect(checkPptdProject(project).errorCount).toBe(0);
  const xml = strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
  expect(xml.indexOf('Before')).toBeLessThan(xml.indexOf('<p:pic>'));
  expect(xml.indexOf('<p:pic>')).toBeLessThan(xml.indexOf('After'));
  return diagnostic;
}

it('uses the exact affine envelope for a rotated child under nonuniform group scaling', async () => {
  const result = await fixture(parts => replaceShape(parts, shape => {
    shape = shape.replace('<a:xfrm>', '<a:xfrm rot="2700000">');
    return `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="90" name="affine group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="5486400" cy="914400"/><a:chOff x="914400" y="914400"/><a:chExt cx="2743200" cy="914400"/></a:xfrm></p:grpSpPr>${shape}</p:grpSp>`;
  }));
  const diagnostic = await assertPlaceholder(result, 'group-affine');
  const expected = [4 - 2 * Math.SQRT2, 1.5 - Math.SQRT2, 4 * Math.SQRT2, 2 * Math.SQRT2].map(v => v * 72);
  diagnostic.bounds.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 3));
  expect(result.page.elements[1].rotation).toBeUndefined();
});

it('retains an unknown geometry at its original position instead of failing final validation', async () => {
  const result = await fixture(parts => replaceShape(parts, shape => shape.replace('prst="rect"', 'prst="vendorUnknownShape"')));
  expect((await assertPlaceholder(result, 'shape-geometry')).bounds).toEqual([72, 72, 216, 72]);
});

it.each([
  ['smartart', 'http://schemas.openxmlformats.org/drawingml/2006/diagram', '<dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" r:dm="missing"/>'],
  ['embedded-object', 'http://schemas.openxmlformats.org/presentationml/2006/ole', '<p:oleObj r:id="missing"/>'],
  ['chart', 'http://schemas.microsoft.com/office/drawing/2014/chartex', '<cx:chart xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" r:id="missing"/>'],
  ['graphicFrame', 'urn:vendor:drawing', '<vendor:item xmlns:vendor="urn:vendor:drawing"/>']
])('accounts for %s objects that the upstream parser omits', async (feature, uri, content) => {
  const result = await fixture(parts => replaceShape(parts, shape => {
    const id = shape.match(/<p:cNvPr id="([^\"]+)"/)[1];
    return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="source frame"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="914400" y="914400"/><a:ext cx="2743200" cy="914400"/></p:xfrm><a:graphic><a:graphicData uri="${uri}">${content}</a:graphicData></a:graphic></p:graphicFrame>`;
  }));
  expect((await assertPlaceholder(result, feature)).bounds).toEqual([72, 72, 216, 72]);
  expect(result.converted.sourceNodeCount).toBe(3);
});

it.each(['no-cache', '3d'])('degrades a %s chart to a replaceable frame', async mode => {
  const result = await fixture(parts => {
    const key = Object.keys(parts).find(k => /^ppt\/charts\/chart\d+\.xml$/.test(k));
    let xml = strFromU8(parts[key]);
    if (mode === '3d') xml = xml.replaceAll('c:barChart', 'c:bar3DChart');
    else xml = xml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, '');
    parts[key] = strToU8(xml);
  }, (slide, pptx) => slide.addChart(pptx.ChartType.bar, [{ name: 'Data', labels: ['A', 'B'], values: [10, 20] }], { x: 1, y: 1, w: 3, h: 1 }));
  await assertPlaceholder(result, 'chart');
});

it('selects an explicit AlternateContent fallback and preserves its source layer', async () => {
  const { converted, page } = await fixture(parts => replaceShape(parts, shape => `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="vendor"><vendor:item xmlns:vendor="urn:vendor"/></mc:Choice><mc:Fallback>${shape}</mc:Fallback></mc:AlternateContent>`));
  expect(page.elements).toHaveLength(3);
  expect(page.elements[1]).toMatchObject({ elementType: 'shape', shapeName: 'rect', bounds: [72, 72, 216, 72] });
  expect(converted.diagnostics.some(d => d.level === 'placeholder')).toBe(false);
  expect(converted.diagnostics.some(d => d.feature === 'alternate-content')).toBe(true);
});

it('preserves fractional image crop through editable export and later crop edits', async () => {
  const { converted, page } = await fixture(parts => {
    const key = 'ppt/slides/slide1.xml';
    parts[key] = strToU8(strFromU8(parts[key]).replace('<a:stretch>', '<a:srcRect l="15000" t="10000" r="25000" b="0"/><a:stretch>'));
  }, async slide => {
    const png = await sharp({ create: { width: 40, height: 10, channels: 3, background: '#123456' } }).png().toBuffer();
    slide.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: 1, y: 1, w: 3, h: 1, rotate: 30, flipH: true });
  });
  expect(page.elements[1].crop).toEqual({ left: .15, top: .1, right: .25, bottom: 0 });
  let project = parsePptdProject(converted.source);
  let xml = strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
  expect(xml).toContain('l="15000"'); expect(xml).toContain('r="25000"'); expect(xml).toContain('rot="1800000"'); expect(xml).toContain('flipH="1"');
  page.elements[1].crop.left = .05;
  const pages = new Map(converted.source.pages); pages.set([...pages.keys()][0], yaml.dump(page));
  project = parsePptdProject({ ...converted.source, pages });
  xml = strFromU8(unzipSync((await renderPptdProject(project)).bytes)['ppt/slides/slide1.xml']);
  expect(xml).toContain('l="5000"'); expect(xml).not.toContain('l="15000"');
});

it('reports effect simplification separately from successful native geometry conversion', async () => {
  const { converted } = await fixture(parts => replaceShape(parts, shape => shape.replace('</p:spPr>', '<a:effectLst><a:glow rad="200000"><a:srgbClr val="FF0000"/></a:glow></a:effectLst></p:spPr>')));
  expect(converted.diagnostics.find(d => d.feature === 'shape-style').message).toContain('效果按当前图形能力简化');
});

it('preserves indexed chart cache gaps through conversion and editable export', async () => {
  const { converted, page } = await fixture(parts => {
    const key = Object.keys(parts).find(k => /^ppt\/charts\/chart\d+\.xml$/.test(k));
    parts[key] = strToU8(strFromU8(parts[key]).replace('<c:pt idx="1"><c:v>20</c:v></c:pt>', ''));
  }, (slide, pptx) => slide.addChart(pptx.ChartType.bar, [{ name: 'Data', labels: ['A', 'B', 'C'], values: [10, 20, 30] }], { x: 1, y: 1, w: 3, h: 1 }));
  expect(page.elements[1].elementType, JSON.stringify(converted.diagnostics)).toBe('chart');
  expect(page.elements[1].data.rows).toEqual([['A', 10], ['B', null], ['C', 30]]);
  const parts = unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes);
  const xml = strFromU8(parts[Object.keys(parts).find(k => /^ppt\/charts\/chart\d+\.xml$/.test(k))]);
  expect(xml).toContain('<c:pt idx="1"><c:v></c:v></c:pt>');
  expect(xml).toContain('<c:pt idx="2"><c:v>30</c:v></c:pt>');
});

it('keeps master group decorations when another child is a placeholder', async () => {
  const { page } = await fixture(parts => {
    const slide = strFromU8(parts['ppt/slides/slide1.xml']);
    const shapes = [...slide.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(m => m[0]);
    const decoration = shapes[1].replace('123456', 'ABCDEF');
    const placeholder = shapes[0].replace('<p:nvPr></p:nvPr>', '<p:nvPr><p:ph type="title"/></p:nvPr>');
    const key = 'ppt/slideMasters/slideMaster1.xml';
    const group = `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="990" name="master group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/><a:chOff x="0" y="0"/><a:chExt cx="12192000" cy="6858000"/></a:xfrm></p:grpSpPr>${decoration}${placeholder}</p:grpSp>`;
    parts[key] = strToU8(strFromU8(parts[key]).replace('</p:spTree>', group + '</p:spTree>'));
  });
  expect(page.elements).toHaveLength(4);
  expect(page.elements[0].fill.color).toBe('#ABCDEF');
  expect(page.elements.filter(e => e.content?.text?.includes('Before'))).toHaveLength(1);
});

it.each(['image', 'gradient', 'pattern'])('retains a %s slide background below foreground objects', async mode => {
  const { converted, page } = await fixture(parts => {
    let fill;
    if (mode === 'image') {
      const png = parts[Object.keys(parts).find(k => /^ppt\/media\/.*\.png$/.test(k))];
      parts['ppt/media/background.png'] = png;
      const key = 'ppt/slides/_rels/slide1.xml.rels';
      parts[key] = strToU8(strFromU8(parts[key]).replace('</Relationships>', '<Relationship Id="rIdBackground" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/background.png"/></Relationships>'));
      fill = '<a:blipFill><a:blip r:embed="rIdBackground"/><a:stretch><a:fillRect/></a:stretch></a:blipFill>';
    } else if (mode === 'gradient') fill = '<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="123456"/></a:gs><a:gs pos="100000"><a:srgbClr val="ABCDEF"/></a:gs></a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill>';
    else fill = '<a:pattFill prst="pct50"><a:fgClr><a:srgbClr val="123456"/></a:fgClr><a:bgClr><a:srgbClr val="ABCDEF"/></a:bgClr></a:pattFill>';
    const key = 'ppt/slides/slide1.xml';
    parts[key] = strToU8(strFromU8(parts[key]).replace('<p:spTree>', `<p:bg><p:bgPr>${fill}</p:bgPr></p:bg><p:spTree>`));
  }, mode === 'image' ? async slide => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#123456' } }).png().toBuffer();
    slide.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: 1, y: 1, w: 3, h: 1 });
  } : undefined);
  expect(page.elements[0].bounds).toEqual([0, 0, 960, 540]);
  const xml = strFromU8(unzipSync((await renderPptdProject(parsePptdProject(converted.source))).bytes)['ppt/slides/slide1.xml']);
  expect(xml.indexOf('slide-1-background')).toBeLessThan(xml.indexOf('Before'));
  if (mode === 'gradient') expect(xml).toContain('<a:gradFill');
  if (mode === 'pattern') expect(xml).toContain('<a:pattFill');
});

it('resolves inherited picture background relationships even when master graphics are hidden', async () => {
  const { converted, page } = await fixture(parts => {
    const mediaKey = Object.keys(parts).find(k => /^ppt\/media\/.*\.png$/.test(k));
    const masterKey = 'ppt/slideMasters/slideMaster1.xml';
    const bg='<p:bg><p:bgPr><a:blipFill><a:blip r:embed="backgroundRId"/><a:stretch><a:fillRect/></a:stretch></a:blipFill></p:bgPr></p:bg>';
    const master=strFromU8(parts[masterKey]);
    parts[masterKey] = strToU8(master.includes('<p:bg>')?master.replace(/<p:bg>[\s\S]*?<\/p:bg>/,bg):master.replace('<p:spTree>',bg+'<p:spTree>'));
    const relKey = 'ppt/slideMasters/_rels/slideMaster1.xml.rels';
    parts[relKey] = strToU8(strFromU8(parts[relKey]).replace('</Relationships>', `<Relationship Id="backgroundRId" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaKey.split('/').at(-1)}"/></Relationships>`));
    for (const key of Object.keys(parts).filter(k=>/^ppt\/slideLayouts\/[^/]+\.xml$/.test(k))) parts[key]=strToU8(strFromU8(parts[key]).replace(/<p:bg>[\s\S]*?<\/p:bg>/,''));
    const slideKey = 'ppt/slides/slide1.xml';
    parts[slideKey] = strToU8(strFromU8(parts[slideKey]).replace('<p:sld ', '<p:sld showMasterSp="0" '));
  }, async slide => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#00FF00' } }).png().toBuffer();
    slide.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: 1, y: 1, w: 3, h: 1 });
  });
  expect(converted.diagnostics.filter(d => d.level === 'placeholder')).toEqual([]);
  expect(page.elements[0]).toMatchObject({ elementType: 'image', bounds: [0, 0, 960, 540] });
});

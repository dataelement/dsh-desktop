import { expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import PptxGenJS from 'pptxgenjs';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { flattenPptxGroups } from '../packages/ppt-runtime/core/lib/pptx-groups.js';
import { sanitizeOoXml, serializeOoXmlElement } from '../packages/ppt-runtime/core/lib/pptx-resources.js';

function installDomParser() {
  const window = new JSDOM('').window;
  const previous = globalThis.DOMParser;
  globalThis.DOMParser = window.DOMParser;
  return () => {
    window.close();
    if (previous === undefined) Reflect.deleteProperty(globalThis, 'DOMParser');
    else globalThis.DOMParser = previous;
  };
}

const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></a:xfrm></p:spPr>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

it('strips empty prefix namespace declarations that XML 1.0 forbids', () => {
  expect(sanitizeOoXml('<root xmlns:r="" xmlns:a=\'\' id="1"/>')).toBe('<root id="1"/>');
});

it('flattens slides that undeclare unused OOXML prefixes without throwing', () => {
  const restore = installDomParser();
  try {
    const parsed = new DOMParser().parseFromString(slideXml, 'application/xml');
    expect(parsed.querySelector('parsererror')?.textContent).toMatch(/undefine prefix/i);
    const flattened = flattenPptxGroups(slideXml);
    expect(flattened.count).toBe(0);
    expect(flattened.xml).not.toMatch(/xmlns:r\s*=\s*["']/);
    expect(new DOMParser().parseFromString(flattened.xml, 'application/xml').querySelector('parsererror')).toBeNull();
  } finally {
    restore();
  }
});

it('serializes documents after JSDOM adds empty prefix declarations', () => {
  const restore = installDomParser();
  try {
    const doc = new DOMParser().parseFromString(sanitizeOoXml(slideXml), 'application/xml');
    doc.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:r', '');
    expect(() => doc.documentElement.outerHTML).toThrow(/undeclare a namespace/i);
    const xml = serializeOoXmlElement(doc.documentElement);
    expect(xml).toContain('p:sld');
    expect(xml).not.toMatch(/xmlns:r\s*=\s*["']/);
  } finally {
    restore();
  }
});

it('converts a PPTX whose XML undeclares unused prefixes, including grouped shapes', async () => {
  const pptx = new PptxGenJS();
  pptx.addSlide().addText('Prefix', { x: 1, y: 1, w: 4, h: 1, fontSize: 18, objectName: 'child' });
  const parts = unzipSync(Buffer.from(await pptx.write({ outputType: 'nodebuffer' })));
  const slidePath = 'ppt/slides/slide1.xml';
  let xml = strFromU8(parts[slidePath]);
  const shape = xml.match(/<p:sp>.*?<\/p:sp>/s)[0];
  const group = `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="10" name="group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="3657600" cy="914400"/><a:chOff x="914400" y="914400"/><a:chExt cx="3657600" cy="914400"/></a:xfrm></p:grpSpPr>${shape}</p:grpSp>`;
  xml = xml.replace(shape, group);
  for (const key of Object.keys(parts)) {
    if (!/\.xml(?:\.rels)?$/i.test(key)) continue;
    const text = key === slidePath ? xml : strFromU8(parts[key]);
    parts[key] = strToU8(text.replace(/<([A-Za-z0-9:]+)(\s)/, '<$1 xmlns:unused=""$2'));
  }
  const converted = await convertPptxToPptd(zipSync(parts), 'prefix.pptx');
  expect(converted.slideCount).toBe(1);
  expect(converted.diagnostics.some(item => item.feature === 'group')).toBe(true);
});

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { JSDOM } from 'jsdom';
import { convertPptxToPptd } from '../packages/ppt-runtime/core/lib/pptx-converter.js';
import { parsePptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';
import { renderOfficeTemplatePreview } from '../packages/ppt-runtime/core/lib/office-template-preview.js';

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
afterEach(() => Object.defineProperty(process, 'platform', platformDescriptor));

async function source(font = 'PingFang SC Semibold', withDefaults = false) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const slide = pptx.addSlide();
  slide.addText('项目汇报', { x: 1, y: 1, w: 8, h: 1, fontSize: 36, fontFace: font, color: '000000', margin: 0 });
  const bytes = Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
  if (!withDefaults) return bytes;
  const parts = unzipSync(bytes);
  const window = new JSDOM(strFromU8(parts['ppt/slides/slide1.xml']), { contentType: 'text/xml' }).window;
  const document = window.document, namespace = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const paragraph = document.getElementsByTagNameNS(namespace, 'p')[0];
  const properties = document.getElementsByTagNameNS(namespace, 'pPr')[0];
  for (const [parent, name] of [[properties, 'defRPr'], [paragraph, 'endParaRPr']]) {
    const prior = parent.getElementsByTagNameNS(namespace, name)[0];
    const defaults = document.createElementNS(namespace, `a:${name}`);
    defaults.setAttribute('sz', '3600');
    defaults.setAttribute('b', '0');
    for (const script of ['latin', 'ea', 'cs']) {
      const face = document.createElementNS(namespace, `a:${script}`);
      face.setAttribute('typeface', font); defaults.append(face);
    }
    if (prior) prior.replaceWith(defaults); else parent.append(defaults);
  }
  parts['ppt/slides/slide1.xml'] = strToU8(new window.XMLSerializer().serializeToString(document));
  window.close();
  return Buffer.from(zipSync(parts));
}

async function roundtrip(platform, font, withDefaults = false) {
  const bytes = await source(font, withDefaults);
  Object.defineProperty(process, 'platform', { ...platformDescriptor, value: platform });
  try {
    const converted = await convertPptxToPptd(bytes, 'font-layout.pptx');
    const project = parsePptdProject(converted.source);
    const exported = await renderPptdProject(project);
    const xml = strFromU8(unzipSync(exported.bytes)['ppt/slides/slide1.xml']);
    return { project, document: new JSDOM(xml, { contentType: 'text/xml' }).window.document };
  } finally {
    Object.defineProperty(process, 'platform', platformDescriptor);
  }
}

it.each([
  ['PingFang SC', 'Microsoft YaHei', false],
  ['PingFang SC Regular', 'Microsoft YaHei', false],
  ['PingFang SC Semibold', 'Microsoft YaHei', true],
  ['PingFangSC-Semibold', 'Microsoft YaHei', true],
  ['PingFang SC Light', 'Microsoft YaHei Light', false],
])('exports %s with an explicit Windows family and weight', async (font, family, bold) => {
  const { project, document } = await roundtrip('win32', font);
  const content = project.pages[0].elements.find(element => element.elementType === 'text').content;
  expect(content.paragraphs[0].runs[0].options).toMatchObject({ fontFamily: family });
  expect(content.paragraphs[0].runs[0].options.bold === true).toBe(bold);
  const run = [...document.getElementsByTagNameNS('*', 'r')].find(node => node.textContent === '项目汇报');
  const properties = run.getElementsByTagNameNS('*', 'rPr')[0];
  for (const script of ['latin', 'ea', 'cs']) {
    expect(properties.getElementsByTagNameNS('*', script)[0].getAttribute('typeface')).toBe(family);
  }
  expect(properties.getAttribute('b') === '1').toBe(bold);
  expect(document.getElementsByTagNameNS('*', 't')).toHaveLength(1);
  expect(content.paragraphs[0].runs[0].text).toBe('项目汇报');
});

it.each([
  ['darwin', 'PingFang SC Semibold'],
  ['win32', 'Noto Sans CJK SC'],
  ['win32', 'KaiTi'],
])('preserves the authored %s/%s face', async (platform, font) => {
  const { document } = await roundtrip(platform, font);
  const run = [...document.getElementsByTagNameNS('*', 'r')].find(node => node.textContent === '项目汇报');
  expect(run.getElementsByTagNameNS('*', 'ea')[0].getAttribute('typeface')).toBe(font);
});

it('uses matching Windows metrics in paragraph defaults and end marks and retains source geometry', async () => {
  const windows = await roundtrip('win32', 'PingFang SC Semibold', true);
  const mac = await roundtrip('darwin', 'PingFang SC Semibold', true);
  const frames = result => result.project.pages[0].elements.map(element => element.bounds);
  expect(frames(windows)).toEqual(frames(mac));
  for (const name of ['defRPr', 'endParaRPr']) {
    const properties = windows.document.getElementsByTagNameNS('*', name)[0];
    expect(properties.getAttribute('b')).toBe('1');
    for (const script of ['latin', 'ea', 'cs']) {
      expect(properties.getElementsByTagNameNS('*', script)[0].getAttribute('typeface')).toBe('Microsoft YaHei');
    }
    expect(mac.document.getElementsByTagNameNS('*', name)[0].getElementsByTagNameNS('*', 'ea')[0].getAttribute('typeface')).toBe('PingFang SC Semibold');
  }
});

it('renders the imported Chinese heading at its authored width through Office and PDFium', async () => {
  const converted = await convertPptxToPptd(await source(), 'native-font-layout.pptx');
  const project = parsePptdProject(converted.source);
  const root = await mkdtemp(path.join(os.tmpdir(), 'ppt-native-font-layout-'));
  try {
    const metadata = await renderOfficeTemplatePreview(project, root, project.width, 1);
    const bytes = await readFile(path.join(root, 'preview/pages/page-1.png'));
    const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, right = -1;
    for (let y = 50; y < 170; y++) for (let x = 40; x < 700; x++) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset] < 100 && data[offset + 1] < 100 && data[offset + 2] < 100) {
        left = Math.min(left, x); right = Math.max(right, x);
      }
    }
    const inkWidth = right - left + 1;
    if (process.env.DSH_PPT_FONT_EVIDENCE) {
      const destination = process.env.DSH_PPT_FONT_EVIDENCE;
      await mkdir(destination, { recursive: true });
      await writeFile(path.join(destination, 'metrics.json'), JSON.stringify({ platform: process.platform, inkWidth, width: info.width, height: info.height, ...metadata }, null, 2));
      await copyFile(path.join(root, 'preview/pages/page-1.png'), path.join(destination, 'preview.png'));
      await copyFile(path.join(root, 'preview-deck.pptx'), path.join(destination, 'preview-deck.pptx'));
    }
    // Four 36 pt Han glyphs need approximately 144 pt; collapsed advances
    // leave a narrow stack. A blank render also fails this gate.
    expect(inkWidth).toBeGreaterThan(115);
    expect(inkWidth).toBeLessThan(170);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120000);

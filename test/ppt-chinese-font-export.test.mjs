import { expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import yaml from 'js-yaml';
import { resolveFontFace } from '../packages/ppt-runtime/core/lib/font-family.js';
import { parsePptdProject, renderPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';

it('selects Chinese faces by platform and preserves explicit design choices', () => {
  for (const [platform, face] of [['darwin', 'PingFang SC'], ['win32', 'Microsoft YaHei'], ['linux', 'Noto Sans CJK SC']]) {
    expect(resolveFontFace('Arial', 'Arial', '北京', platform)).toBe(face);
    expect(resolveFontFace('Arial', 'Arial', '2026 Report', platform)).toBe('Arial');
    expect(resolveFontFace('Songti SC', 'Arial', '北京', platform)).toBe('Songti SC');
  }
  expect(resolveFontFace({ latin: 'Arial', mac: 'Heiti SC', ea: 'Noto Sans CJK SC' }, 'Arial', '北京', 'darwin')).toBe('Heiti SC');
});

it('exports Chinese inline runs and table cells with a real East Asian font', async () => {
  const family = resolveFontFace('Arial', 'Arial', '北京');
  const elements = [
    { elementId: 'heading', elementType: 'text', bounds: [20, 20, 800, 60], content: { fontFamily: 'Arial', fontSize: 30,
      text: '<p><span style="font-family:Arial;font-weight:700">北京：都城演进史</span><span style="font-family:Arial"> 2026</span></p>' } },
    { elementId: 'serif', elementType: 'text', bounds: [20, 110, 600, 60], content: { fontFamily: 'Songti SC', fontSize: 20, text: '明确选择宋体' } },
    { elementId: 'table', elementType: 'table', bounds: [20, 200, 500, 150], columnWidths: [1], rowHeights: [1], rows: [[{ text: '都城沿革', fontFamily: 'Arial', fontSize: 20 }]] }
  ];
  const project = parsePptdProject({ entryName: 'deck.pptd', manifest: yaml.dump({ version: 'v2', title: 'Chinese typography', size: [960, 540], pages: ['one.page'] }),
    pages: new Map([['one.page', yaml.dump({ elements })]]), assets: new Map() });
  const output = await renderPptdProject(project);
  const xml = strFromU8(unzipSync(output.bytes)['ppt/slides/slide1.xml']);
  const runs = [...xml.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)].map(match => match[1]);
  for (const text of ['北京：都城演进史', '都城沿革']) {
    expect(runs.find(run => run.includes(text))).toContain(`<a:ea typeface="${family}"`);
  }
  expect(runs.find(run => run.includes('2026'))).toContain('<a:latin typeface="Arial"');
  expect(runs.find(run => run.includes('明确选择宋体'))).toContain('<a:ea typeface="Songti SC"');
}, 30000);

it('lists only content-type overrides backed by generated package parts', async () => {
  const source = {
    entryName: 'deck.pptd',
    manifest: yaml.dump({ version: 'v2', title: 'Content Types', size: [1280, 720], pages: ['one.page', 'two.page'] }),
    pages: new Map([
      ['one.page', yaml.dump({ elements: [] })],
      ['two.page', yaml.dump({ elements: [{
        elementId: 'bar',
        elementType: 'chart',
        bounds: [50, 50, 600, 400],
        data: { cols: ['category', 'value'], rows: [['A', 3], ['B', 0]] },
        series: [{ type: 'bar', name: 'Value', encode: { x: 'category', y: 'value' } }],
        legend: false,
      }] })],
    ]),
    assets: new Map(),
  };
  const output = await renderPptdProject(parsePptdProject(source));
  const entries = unzipSync(output.bytes);
  const contentTypes = strFromU8(entries['[Content_Types].xml']);
  const partNames = [...contentTypes.matchAll(/<Override\b[^>]*\bPartName="([^"]+)"[^>]*\/>/gu)]
    .map((match) => match[1].replace(/^\/+/, ''));

  expect(partNames).toContain('ppt/slideMasters/slideMaster1.xml');
  expect(partNames).not.toContain('ppt/slideMasters/slideMaster2.xml');
  expect(partNames.every((partName) => entries[partName] !== undefined)).toBe(true);
  const chart = strFromU8(entries['ppt/charts/chart1.xml']);
  expect(chart).toContain('<c:strRef>');
  expect(chart).not.toContain('<c:multiLvlStrRef>');
  const workbook = unzipSync(entries['ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx']);
  const worksheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);
  expect(worksheet).toContain('<c r="B3"><v>0</v></c>');
}, 30000);

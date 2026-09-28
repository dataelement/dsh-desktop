import { expect, it } from 'vitest';
import yaml from 'js-yaml';
import { markSourceLayout, hasSourceLayout } from '../packages/ppt-runtime/core/lib/source-layout.js';
import { layoutRichText } from '../packages/ppt-runtime/core/lib/rich-text-layout.js';
import { parsePptdProject, checkPptdProject } from '../packages/ppt-runtime/core/lib/pptd.js';

const project = elements => parsePptdProject({ entryName: 'deck.pptd', manifest: yaml.dump({ version: 'v2', title: 'Import contract', size: [960, 540], pages: ['1.page'] }), pages: new Map([['1.page', yaml.dump({ elements })]]), assets: new Map() });

it('preserves source layout notes and checks edited objects strictly after YAML round-trip', () => {
  const source = markSourceLayout({ elementId: 'source', elementType: 'text', bounds: [-10, 20, 80, 10], content: { text: '原始文稿的文本内容', fontSize: 24 } });
  expect(hasSourceLayout(yaml.load(yaml.dump(source)))).toBe(true);
  const checked = checkPptdProject(project([source]));
  expect(checked.errorCount).toBe(0);
  expect(checked.issues.filter(i => ['out-of-bounds', 'text-overflow'].includes(i.code)).every(i => i.severity === 'warning')).toBe(true);
  const edited = { ...source, content: { ...source.content, text: '这次改写以后也必须验证布局容量' } };
  expect(hasSourceLayout(edited)).toBe(false);
  expect(checkPptdProject(project([edited])).issues.some(i => i.code === 'text-overflow' && i.severity === 'error')).toBe(true);
  const malformed = markSourceLayout({ ...source, bounds: [0, 0, -1, 10] });
  expect(checkPptdProject(project([malformed])).issues.some(i => i.code === 'bounds' && i.severity === 'error')).toBe(true);
});

it('honors explicit source autofit and retains strict checks for newly authored content', () => {
  const content = { text: 'check', fontSize: 18, fit: 'shrink' };
  const element = { elementId: 'icon-text', elementType: 'text', bounds: [0, 0, 20, 20], content };
  const layout = layoutRichText([{ text: 'check', options: {} }], content, 20, 20);
  expect(layout.overflow).toBe(false); expect(layout.fontScale).toBeLessThan(1);
  expect(checkPptdProject(project([markSourceLayout(element)])).errorCount).toBe(0);
  expect(checkPptdProject(project([element])).issues.some(i => i.code === 'text-overflow' && i.severity === 'error')).toBe(true);
});

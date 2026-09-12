import { expect, it } from 'vitest';
import { layoutRichText } from '../packages/ppt-runtime/core/lib/rich-text-layout.js';

it('measures mixed font sizes per line and still rejects real vertical overflow', () => {
  const runs = [{ text: '大标题\n', options: { fontSize: 30 } }, { text: '正文内容\n'.repeat(5).trimEnd(), options: { fontSize: 10 } }];
  const layout = layoutRichText(runs, { fontSize: 10 }, 200, 100);
  expect(layout.overflow).toBe(false);
  expect(layout.lineCount).toBe(6);
  expect(layout.requiredHeight).toBeCloseTo(92);
  expect(layout.lines.map(line => line.fontSize)).toEqual([30, 10, 10, 10, 10, 10]);
  expect(layoutRichText(runs, { fontSize: 10 }, 200, 90).overflow).toBe(true);
});

it('retains nested effective styles and English spaces across rich run boundaries', () => {
  const runs = [{ text: 'Hello ', options: { bold: true } }, { text: 'world and ', options: { fontSize: 14 } }, { text: 'CJK文字', options: {} }];
  const layout = layoutRichText(runs, { fontSize: 10 }, 300, 50);
  expect(layout.lines[0].runs.map(run => run.text).join('')).toBe('Hello world and CJK文字');
  expect(layout.lines[0].runs.map(run => run.options.fontSize)).toEqual([10, 14, 10]);
  expect(layout.lines[0].runs[0].options.bold).toBe(true);
  expect(layoutRichText(runs, { fontSize: 10, wrap: false }, 30, 200).horizontalOverflow).toBe(true);
  expect(layoutRichText([{ text: '界'.repeat(10), options: {} }], { fontSize: 10, wrap: false }, 102, 20).overflow).toBe(false);
});

it('wraps words across formatting boundaries and keeps explicit blank lines', () => {
  const runs = [{ text: 'hello wo', options: {} }, { text: 'rld\n\n末行', options: { bold: true } }];
  const layout = layoutRichText(runs, { fontSize: 10 }, 38, 100);
  expect(layout.lines.map(line => line.runs.map(run => run.text).join(''))).toEqual(['hello', 'world', '', '末行']);
  expect(layout.overflow).toBe(false);
});

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const runtime = process.env.DSH_PPT_RUNTIME_ROOT ?? path.resolve('node_modules/.ppt-green-pulse-bundled');
const load = file => import(pathToFileURL(path.join(runtime, 'lib', file)));
const { apply } = await load('index.js');
const { loadPptdProject, checkPptdProject } = await load('pptd.js');
const { parseImageContract } = await load('template-image-contract.js');
const { bundledProjectTemplates, bundledProjectSource, bundledProjectFileTable } = await load('bundled-template-projects.js');
const { validateJsonSchemaValue } = await import(pathToFileURL(path.join(runtime, '../@deepseek-ai/dsh-tools/lib/index.js')));

test('packaged editable templates: fresh profile, selection, source rules, scoped copy and audit', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-bundled-template-'));
  try {
    const workspace = path.join(root, 'workspace');
    await fs.mkdir(workspace);
    const registry = new Map(); let rpc;
    const host = { effect(run) { run?.(); return () => {}; }, webServer: { register() { return () => {}; } },
      inject(services, callback) { if (services?.includes?.('webServer')) callback?.(host); }, skills: { registerProvider() {} }, systemPrompt: { section() {} }, on() {},
      tools: { register(t) { registry.set(t.name, t); } },
      connection: { rpc: { handle(_route, handler) { rpc = handler; } } }
    };
    const boot = () => apply(host, { root: path.join(root, 'storage') });
    await boot();
    const request = async (endpoint, args = {}) => {
      const result = await rpc(endpoint, { sessionId: 'bundle-test', ...args });
      assert.equal(result.ok, true);
      if (result.value.status === 'error') throw new Error(result.value.error.message);
      return result.value.data;
    };
    const tool = async (name, args) => {
      const t = registry.get(name);
      const value = await t.execute(args, { agent: { id: 'bundle-test', session: { header: { cwd: workspace } } }, signal: new AbortController().signal });
      assert.deepEqual(validateJsonSchemaValue(t.output.schema, value, 'value'), []);
      return value;
    };
    const state = await request('state');
    assert(bundledProjectTemplates.length > 0);
    assert.deepEqual(state.templates.slice(0, bundledProjectTemplates.length).map(template => template.id), bundledProjectTemplates.map(template => template.id));
    assert.equal(state.templates.filter(t => t.origin === 'personal').length, 0);
    await assert.rejects(tool('ppt_template_create_project', { template_id: bundledProjectTemplates[0].id, output_directory: 'unselected' }));
    const summaries = [];
    for (const catalogTemplate of bundledProjectTemplates) {
      const template = state.templates.find(item => item.id === catalogTemplate.id);
      assert.equal(template.origin, 'built-in');
      assert(template.slideCount > 0);
      assert(template.previewImages.length > 0);
      await request('template/select', { templateId: template.id, mode: 'ppt' });
      await boot();
      assert.equal((await request('state')).selectedTemplateId, template.id);
      const refs = await tool('ppt_get_template_reference', { template_id: template.id });
      assert(JSON.stringify(refs).includes('ppt_template_create_project'));
      const files = bundledProjectFileTable(template.id);
      for (const page of template.pageIndex) assert.equal(Object.hasOwn(files, page.file), true);
      const pages = await tool('ppt_get_template_pages', { template_id: template.id });
      assert.equal(pages.length, template.slideCount);
      const detailNumbers = [...new Set([1, Math.min(4, template.slideCount), template.slideCount])];
      const detail = await tool('ppt_get_template_pages', { template_id: template.id, slide_numbers: detailNumbers });
      assert(detail.every(page => page.pptdLayoutReference.length > 0));
      const copy = await tool('ppt_template_create_project', { template_id: template.id, output_directory: `test-${template.id}` });
      const project = await loadPptdProject(path.join(workspace, copy.projectPath));
      assert.equal(checkPptdProject(project).errorCount, 0);
      const contracts = project.pages.map(page => parseImageContract(page.notes, page.elements)).filter(Boolean);
      const imageSlots = contracts.reduce((count, contract) => count + contract.slots.length, 0);
      const masks = contracts.reduce((count, contract) => count + contract.slots.reduce((slotCount, slot) => slotCount + slot.maskElementIds.length, 0), 0);
      const source = await bundledProjectSource(template.id);
      const first = template.pageIndex[0].file;
      const original = await fs.readFile(path.join(source, first));
      await fs.appendFile(path.join(workspace, copy.projectPath, first), '\n# task-owned change\n');
      assert.deepEqual(await fs.readFile(path.join(source, first)), original);
      summaries.push({ templateId: template.id, templateName: template.name, pages: template.slideCount, imageSlots, masks, sourcePageSha256: createHash('sha256').update(original).digest('hex') });
    }
    const greenPulse = summaries.find(template => template.templateId === 'dsh-green-pulse');
    assert.deepEqual(
      { name: greenPulse?.templateName, pages: greenPulse?.pages, imageSlots: greenPulse?.imageSlots, masks: greenPulse?.masks },
      { name: 'Green Pulse · 绿色活力配图模板', pages: 22, imageSlots: 17, masks: 11 }
    );
    await assert.rejects(tool('ppt_template_create_project', { template_id: bundledProjectTemplates.at(-1).id, output_directory: '../escape' }));
    await assert.rejects(bundledProjectSource('../../outside'));
    const selected = bundledProjectTemplates.find(template => template.id === 'dsh-green-pulse');
    const originalIndex = selected.pageIndex;
    selected.pageIndex = [...originalIndex, { slideNumber: 99, file: '../outside.page' }];
    try {
      await assert.rejects(tool('ppt_get_template_pages', { template_id: selected.id }), /已校验文件表/);
    } finally {
      selected.pageIndex = originalIndex;
    }
    const audit = await fs.readFile(path.join(root, 'storage/audit.ndjson'), 'utf8');
    assert.match(audit, /copy-bundled-template/);
    const skill = await fs.readFile(path.join(runtime, 'skills/dsh-ppt/SKILL.md'), 'utf8');
    assert.match(skill, /DSH-PPT-AUTHORING-20260910-V4/);
    assert.match(skill, /带可编辑工程的内置模板/);
    assert.match(skill, /image_generate/);
    assert.doesNotMatch(skill, /IMAGE-TEMPLATES-V1/);
    console.log(JSON.stringify({ status: 'PASS', templates: summaries,
      gates: ['fresh catalog', 'preview resources', 'selection persists', 'tool output schemas', 'editable copy', 'image contracts', 'workspace boundary', 'source unchanged', 'mutation audit', 'shared image tool workflow'] }));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

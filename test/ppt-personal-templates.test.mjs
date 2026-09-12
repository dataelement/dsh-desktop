import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { validateJsonSchemaValue } from '@deepseek-ai/dsh-tools';

let apply, packageRoot;
const cleanups = [];
beforeAll(async () => {
  packageRoot = await mkdtemp(path.resolve('node_modules/.ppt-personal-'));
  execFileSync('tar', ['-xzf', 'packages/ppt-bundles/dsh-ppt-0.1.1-rc.2-desktop-20260906.tgz', '-C', packageRoot, '--strip-components=1']);
  ({ apply } = await import(pathToFileURL(path.join(packageRoot, 'lib/index.js'))));
});
afterAll(async () => { if (packageRoot) await rm(packageRoot, { recursive: true, force: true }); });
afterEach(async () => { for (const root of cleanups.splice(0)) await rm(root, { recursive: true, force: true }); });

async function fixture(existingRoot) {
  const root = existingRoot ?? await mkdtemp(path.join(os.tmpdir(), 'ppt-personal-'));
  if (!existingRoot) cleanups.push(root);
  const storage = path.join(root, 'storage');
  const workspace = path.join(root, 'workspace');
  await mkdir(workspace, { recursive: true });
  const tools = new Map(); let rpc;
  const host = {
    provide() {},
    effect: (run) => { run?.(); return () => {}; },
    webServer: { register: () => () => {} },
    inject: (services, callback) => { if (services.includes('webServer')) callback(host); },
    skills: { registerProvider() {} }, systemPrompt: { section() {} }, on() {},
    tools: { register: tool => tools.set(tool.name, tool) },
    connection: { rpc: { handle: (_route, handler) => { rpc = handler; } } }
  };
  await apply(host, { root: storage });
  async function request(endpoint, input = {}, sessionId = 'session-a') {
    const result = await rpc(endpoint, { ...input, sessionId });
    expect(result.ok).toBe(true);
    if (result.value.status === 'error') throw new Error(result.value.error.message);
    return result.value.data;
  }
  async function tool(name, args, sessionId = 'session-b') {
    const tool = tools.get(name);
    const exec = { agent: { id: sessionId, session: { header: { cwd: workspace } } }, signal: new AbortController().signal };
    const value = await tool.execute(args, exec);
    expect(validateJsonSchemaValue(tool.output.schema, value, 'value')).toEqual([]);
    return value;
  }
  return { root, storage, workspace, request, tool, rpc };
}

async function source() {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const logo = await sharp({ create: { width: 24, height: 24, channels: 4, background: '#446677' } }).png().toBuffer();
  for (let page = 0; page < 4; page++) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F4F2ED' };
    slide.addText(`Company template ${page + 1}`, { x: 0.8, y: 0.7, w: 10, h: 0.6, fontFace: 'Arial', fontSize: 28, color: '1C3848' });
    slide.addText('Replace this sample business content', { x: 0.8, y: 2, w: 10, h: 1, fontFace: 'Arial', fontSize: 20 });
    slide.addShape(pptx.ShapeType.rect, { x: 11.8, y: 0.5, w: 0.7, h: 0.7, fill: { color: 'CA7352' }, line: { color: 'CA7352' } });
    slide.addImage({ data: `image/png;base64,${logo.toString('base64')}`, x: 11.8, y: 6, w: 0.5, h: 0.5 });
  }
  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
}

async function save(f) {
  const bytes = await source();
  const draft = await f.request('template/prepare', { input: { fileName: '公司模板.pptx', base64: bytes.toString('base64') } });
  const template = await f.request('template/save', { draftId: draft.draftId, name: '公司模板' });
  return { bytes, draft, template };
}

describe('personal PPT templates in the shipped runtime', () => {
  it('imports and reuses a PPTX above 16 MB with its real image assets intact', async () => {
    const f = await fixture();
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    const slide = pptx.addSlide();
    slide.addText('Large image template', { x: 0.5, y: 0.3, w: 11, h: 0.6, fontSize: 24 });
    const images = [];
    for (let i = 0; i < 2; i++) {
      const image = await sharp(randomBytes(1800 * 1600 * 3), { raw: { width: 1800, height: 1600, channels: 3 } }).png().toBuffer();
      images.push(image);
      slide.addImage({ data: `image/png;base64,${image.toString('base64')}`, x: 0.5 + i * 6.2, y: 1.3, w: 5.8, h: 5.2 });
    }
    const bytes = Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
    expect(bytes.length).toBeGreaterThan(16 * 1024 * 1024);
    const draft = await f.request('template/prepare', { input: { fileName: 'Large.pptx', base64: bytes.toString('base64') } });
    expect(draft.previews).toHaveLength(1);
    const template = await f.request('template/save', { draftId: draft.draftId, name: 'Large image template' });
    const restored = await fixture(f.root);
    await restored.request('template/select', { templateId: template.id, mode: 'ppt' }, 'session-b');
    await restored.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'large-project' });
    const result = await restored.tool('pptd_render', { project_path: 'large-project', output_file: 'large.pptx' });
    expect(result.status, JSON.stringify(result.check)).toBe('exported');
    const exported = unzipSync(await readFile(path.join(f.workspace, result.outputPath)));
    const mediaHashes = Object.entries(exported).filter(([name]) => name.startsWith('ppt/media/')).map(([, data]) => createHash('sha256').update(data).digest('hex'));
    for (const image of images) expect(mediaHashes).toContain(createHash('sha256').update(image).digest('hex'));
    expect((await readFile(path.join(f.storage, 'personal-templates/saved', template.id, 'source.pptx'))).equals(bytes)).toBe(true);
  }, 30000);

  it('imports mixed-size title and body text without inflating all text to the largest run', async () => {
    const f = await fixture();
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    const slide = pptx.addSlide();
    slide.addText([
      { text: '方案标题', options: { fontSize: 24, bold: true, breakLine: true } },
      { text: 'Hello ', options: { fontSize: 10 } },
      { text: 'world', options: { fontSize: 10, bold: true, breakLine: true } },
      { text: '正文内容\n'.repeat(5).trimEnd(), options: { fontSize: 10 } }
    ], { x: 1, y: 1, w: 3, h: 1.6, fontFace: 'Arial', fontSize: 10 });
    const bytes = Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
    const draft = await f.request('template/prepare', { input: { fileName: 'Mixed.pptx', base64: bytes.toString('base64') } });
    expect(draft.previews).toHaveLength(1);
    const saved = await f.request('template/save', { draftId: draft.draftId, name: 'Mixed' });
    const project = path.join(f.storage, 'personal-templates', 'saved', saved.id, 'project');
    const { stdout } = await import('node:child_process').then(({ spawnSync }) => spawnSync(process.execPath, [path.join(packageRoot, 'lib/bin.js'), 'check', project, '--json'], { encoding: 'utf8' }));
    expect(JSON.parse(stdout).errorCount).toBe(0);
    const { loadPptdProject, renderPptdProject } = await import(pathToFileURL(path.join(packageRoot, 'lib/pptd.js')));
    const { unzipSync } = await import('fflate');
    const exported = await renderPptdProject(await loadPptdProject(project));
    const xml = new TextDecoder().decode(unzipSync(exported.bytes)['ppt/slides/slide1.xml']);
    expect(xml).toContain('sz="2400"');
    expect(xml).toContain('sz="1000"');
    expect(xml).toContain('Hello ');
    expect(xml).toContain('world');
  }, 30000);

  it('reports every conversion issue with its page and object, audits the source identity, and accepts a retry', async () => {
    const f = await fixture();
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    for (let page = 0; page < 3; page++) {
      const slide = pptx.addSlide();
      slide.addImage({ data: 'image/png;base64,' + (await sharp({ create: { width: 2, height: 2, channels: 4, background: '#112233' } }).png().toBuffer()).toString('base64'), x: 1, y: 1, w: 1, h: 1 });
    }
    const parts = unzipSync(Buffer.from(await pptx.write({ outputType: 'nodebuffer' })));
    for (const key of Object.keys(parts)) if (key.startsWith('ppt/media/')) delete parts[key];
    const bytes = Buffer.from(zipSync(parts));
    const result = await f.rpc('template/prepare', { sessionId: 'session-a', input: { fileName: '转换问题.pptx', base64: bytes.toString('base64') } });
    expect(result.value.status).toBe('error');
    expect(result.value.error.message).toContain('3 项转换问题');
    for (let page = 1; page <= 3; page++) expect(result.value.error.message).toContain(`第 ${page} 页 · 对象`);
    const audit = (await readFile(path.join(f.storage, 'audit.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse).at(-1);
    expect(audit.status).toBe('failed');
    expect(audit.conversion.fileName).toBe('转换问题.pptx');
    expect(audit.conversion.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(audit.conversion.check.issues.filter(issue => issue.severity === 'error')).toHaveLength(3);
    expect((await f.request('state')).templates.filter(t => t.origin === 'personal')).toEqual([]);
    expect((await readdir(path.join(f.storage, 'personal-templates', 'drafts')))).toEqual([]);
    expect((await save(f)).template.slideCount).toBe(4);
  });

  it('previews before registration and persists across sessions/restarts with profile isolation', async () => {
    const f = await fixture(); const bytes = await source();
    const draft = await f.request('template/prepare', { input: { fileName: 'Company.pptx', base64: bytes.toString('base64') } });
    expect(draft.previews).toHaveLength(4);
    expect(draft.previews.every(image => image.startsWith('data:image/png;base64,iVBOR'))).toBe(true);
    const full = await sharp(Buffer.from(draft.previews[0].split(',')[1], 'base64')).metadata();
    const thumbnail = await sharp(Buffer.from(draft.template.previewImages[0].split(',')[1], 'base64')).metadata();
    expect([full.width, full.height]).toEqual([1920, 1080]);
    expect([thumbnail.width, thumbnail.height]).toEqual([720, 405]);
    expect(draft.template.previewImages.every(image => image.length < 4 * 1024 * 1024)).toBe(true);

    expect((await f.request('state')).templates.filter(t => t.origin === 'personal')).toEqual([]);
    await expect(f.request('template/save', { draftId: draft.draftId, name: 'Wrong owner' }, 'session-b')).rejects.toThrow('其他会话');
    const template = await f.request('template/save', { draftId: draft.draftId, name: 'Company 2026' });
    const selected = { templateId: template.id, mode: 'ppt' };
    await f.request('template/select', selected, 'session-b');
    const restored = await fixture(f.root);
    const state = await restored.request('state', {}, 'session-b');
    expect(state.templates.filter(t => t.origin === 'personal').map(t => t.name)).toEqual(['Company 2026']);
    expect(state.selectedTemplateId).toBe(template.id);
    const other = await fixture();
    expect((await other.request('state')).templates.some(t => t.id === template.id)).toBe(false);
    const duplicate = await restored.request('template/prepare', { input: { fileName: 'Renamed.pptx', base64: bytes.toString('base64') } });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.template.id).toBe(template.id);
  }, 30000);

  it('copies the selected source into independent projects, exports editable PPTX, and preserves saved source', async () => {
    const f = await fixture(); const { bytes, template } = await save(f);
    await f.request('template/select', { templateId: template.id, mode: 'ppt' }, 'session-b');
    const index = await f.tool('ppt_get_template_pages', { template_id: template.id });
    expect(index).toHaveLength(4);
    const detail = await f.tool('ppt_get_template_pages', { template_id: template.id, slide_numbers: [2] });
    expect(detail[0].pptdLayoutReference).toContain('Company template 2');
    await f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-quarter' });
    await f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-year' });
    const file = path.join(f.workspace, 'new-quarter', template.pageIndex[0].file);
    await writeFile(file, (await readFile(file, 'utf8')).replace('Company template 1', 'Quarterly review'));
    expect(await readFile(path.join(f.workspace, 'new-year', template.pageIndex[0].file), 'utf8')).toContain('Company template 1');
    const result = await f.tool('pptd_render', { project_path: 'new-quarter', output_file: 'quarter.pptx' });
    expect(result.status, JSON.stringify(result.check)).toBe('exported');
    expect(result.pageCount).toBe(4);
    expect(result.nativeObjectCount).toBeGreaterThanOrEqual(12);
    const stored = await readFile(path.join(f.storage, 'personal-templates', 'saved', template.id, 'source.pptx'));
    expect(stored.equals(bytes)).toBe(true);
    const audit = await readFile(path.join(f.storage, 'audit.ndjson'), 'utf8');
    expect(audit).toContain('copy-personal-template');
    await expect(f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-year' })).rejects.toThrow();
    await expect(f.tool('ppt_template_create_project', { template_id: template.id, output_directory: '../escape' })).rejects.toThrow();
  }, 30000);

  it('renames globally, deletes from selection, and retains existing task copies', async () => {
    const f = await fixture(); const { template } = await save(f);
    await f.request('template/select', { templateId: template.id, mode: 'ppt' }, 'session-b');
    await f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'kept' });
    await f.request('template/rename', { templateId: template.id, name: '年度模板' });
    expect((await f.request('state', {}, 'session-b')).templates.find(t => t.id === template.id).name).toBe('年度模板');
    await f.request('template/delete', { templateId: template.id });
    const next = await f.request('state', {}, 'session-b');
    expect(next.selectedTemplateId).toBeUndefined();
    expect(next.templateMigration.reason).toBe('personal-template-deleted');
    expect(next.templates.some(t => t.id === template.id)).toBe(false);
    expect(await readFile(path.join(f.workspace, 'kept/deck.pptd'), 'utf8')).toContain('version: v2');
  }, 30000);

  it('persists edited name and description atomically while preserving selection and source', async () => {
    const f = await fixture(); const { bytes, template } = await save(f);
    await f.request('template/select', { templateId: template.id, mode: 'ppt' }, 'session-b');
    const changes = { templateId: template.id, name: '年度报告', description: '品牌配色与简洁图表。\n适用于年度经营汇报。' };
    const updated = await f.request('template/update', changes);
    expect(updated).toMatchObject({ name: changes.name, description: changes.description, id: template.id, createdAt: template.createdAt });
    const restored = await fixture(f.root);
    const state = await restored.request('state', {}, 'session-b');
    expect(state.selectedTemplateId).toBe(template.id);
    expect(state.templates.find(t => t.id === template.id).description).toBe(changes.description);
    await expect(f.request('template/update', { ...changes, name: 'changed', description: 'x'.repeat(1001) })).rejects.toThrow('1000');
    await expect(f.request('template/update', { ...changes, name: '' })).rejects.toThrow('1–80');
    expect((await f.request('state')).templates.find(t => t.id === template.id).name).toBe(changes.name);
    await f.request('template/rename', { templateId: template.id, name: '报告模板' });
    expect((await f.request('state')).templates.find(t => t.id === template.id).description).toBe(changes.description);
    await f.request('template/update', { templateId: template.id, name: '报告模板', description: '' });
    expect((await f.request('state')).templates.find(t => t.id === template.id).description).toBe('');
    expect((await readFile(path.join(f.storage, 'personal-templates', 'saved', template.id, 'source.pptx'))).equals(bytes)).toBe(true);
    expect(await readFile(path.join(f.storage, 'audit.ndjson'), 'utf8')).toContain('update-personal-template');
  }, 30000);

  it('rejects invalid uploads, cancels drafts, and prevents library path escapes', async () => {
    const f = await fixture();
    await expect(f.request('template/prepare', { input: { fileName: 'legacy.ppt', base64: 'UEsDBA==' } })).rejects.toThrow('PPTX');
    for (const base64 of ['UEsD?A==', 'UEsDBA=', 'UEsDBB=='])
      await expect(f.request('template/prepare', { input: { fileName: 'bad.pptx', base64 } })).rejects.toThrow('Base64');
    await expect(f.request('template/prepare', { input: { fileName: '../secret.pptx', base64: 'UEsDBA==' } })).rejects.toThrow();
    await expect(f.request('template/prepare', { input: { fileName: 'bad.pptx', base64: 'UEsDBA==' } })).rejects.toThrow();
    expect((await f.request('state')).templates.filter(t => t.origin === 'personal')).toEqual([]);
    const bytes = await source();
    const draft = await f.request('template/prepare', { input: { fileName: 'cancel.pptx', base64: bytes.toString('base64') } });
    await f.request('template/cancel', { draftId: draft.draftId });
    await expect(f.request('template/save', { draftId: draft.draftId, name: 'Cancelled' })).rejects.toThrow();
    await mkdir(path.join(f.storage, 'personal-templates/saved'), { recursive: true });
    await symlink(f.workspace, path.join(f.storage, 'personal-templates/saved', `personal-${'a'.repeat(64)}`));
    await expect(f.request('state')).rejects.toThrow();
  }, 30000);
});

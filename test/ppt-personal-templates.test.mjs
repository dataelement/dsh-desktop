import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import PptxGenJS from 'pptxgenjs';
import sharp from 'sharp';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { validateJsonSchemaValue } from '@deepseek-ai/dsh-tools';

let apply, packageRoot, MAX_PERSONAL_TEMPLATE_HTTP_BODY_BYTES, PERSONAL_TEMPLATE_CONVERSION_VERSION, PERSONAL_TEMPLATE_PREVIEW_VERSION;
const cleanups = [];
beforeAll(async () => {
  packageRoot = await mkdtemp(path.resolve('node_modules/.ppt-personal-'));
  await cp(path.resolve('.build/ppt-runtime/packages/dsh-ppt'), packageRoot, { recursive: true });
  ({ apply } = await import(pathToFileURL(path.join(packageRoot, 'lib/index.js'))));
  ({ MAX_PERSONAL_TEMPLATE_HTTP_BODY_BYTES, PERSONAL_TEMPLATE_CONVERSION_VERSION, PERSONAL_TEMPLATE_PREVIEW_VERSION } = await import(pathToFileURL(path.join(packageRoot, 'lib/personal-templates.js'))));
});
afterAll(async () => { if (packageRoot) await rm(packageRoot, { recursive: true, force: true }); });
afterEach(async () => { for (const root of cleanups.splice(0)) await rm(root, { recursive: true, force: true }); });

async function fixture(existingRoot) {
  const root = existingRoot ?? await mkdtemp(path.join(os.tmpdir(), 'ppt-personal-'));
  if (!existingRoot) cleanups.push(root);
  const storage = path.join(root, 'storage');
  const workspace = path.join(root, 'workspace');
  await mkdir(workspace, { recursive: true });
  const tools = new Map(); const routes = new Map(); let rpc;
  const connection = {
    rpc: { handle: (_route, handler) => { rpc = handler; } },
    requestRejection: req => req.headers.authorization === 'Bearer test-session' ? undefined : 401
  };
  const host = {
    effect(run) { run(); return () => {}; },
    webServer: { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } },
    get(name) { if (name === 'connection') return connection; throw new Error(`Unexpected service: ${name}`); },
    inject(_services, activate) { return activate(host); }, skills: { registerProvider() {} }, systemPrompt: { section() {} }, on() {},
    tools: { register: tool => tools.set(tool.name, tool) },
    connection
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
  async function httpRequest(endpoint, payload, { channel = '/dsh-ppt', authorized = true } = {}) {
    const req = Readable.from([Buffer.from(JSON.stringify({ rpcId: 'template-request', payload: { ...payload, sessionId: 'session-a' } }))]);
    Object.assign(req, { method: 'POST', url: `${channel}/${endpoint}`, headers: authorized ? { authorization: 'Bearer test-session' } : {} });
    const response = { status: undefined, body: undefined };
    await routes.get(channel).handler(req, {
      writeHead(status) { response.status = status; },
      end(body) { response.body = body; }
    });
    return response;
  }
  async function httpRequestOversize(bytes) {
    const chunk = Buffer.alloc(1024 * 1024, 65);
    async function* body() {
      let sent = 0;
      while (sent < bytes) {
        const next = Math.min(chunk.length, bytes - sent);
        sent += next;
        yield next === chunk.length ? chunk : chunk.subarray(0, next);
      }
    }
    const req = Readable.from(body());
    Object.assign(req, { method: 'POST', url: '/dsh-ppt/template/prepare', headers: { authorization: 'Bearer test-session' } });
    const response = { status: undefined, body: undefined };
    await routes.get('/dsh-ppt').handler(req, {
      writeHead(status) { response.status = status; },
      end(body) { response.body = body; }
    });
    return response;
  }
  return { root, storage, workspace, request, tool, rpc, httpRequest, httpRequestOversize };
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
  it('publishes real rendered pages during preparation with session ownership and cursor reads', async () => {
    const f=await fixture(), bytes=await source(), requestId=randomUUID();
    const preparing=f.request('template/prepare',{input:{fileName:'progress.pptx',base64:bytes.toString('base64'),requestId}});
    await expect(f.request('template/import-progress',{requestId},'session-b')).rejects.toThrow('其他会话');
    const draft=await preparing;
    const progress=await f.request('template/import-progress',{requestId,after:0});
    expect(progress).toMatchObject({total:4,completed:4,status:'finished'});
    expect(progress.pages.map(item=>item.page)).toEqual([1,2,3,4]);
    const image=await sharp(Buffer.from(progress.pages[0].preview.split(',')[1],'base64')).metadata();
    expect(Math.max(image.width,image.height)).toBe(240);
    expect((await f.request('template/import-progress',{requestId,after:3})).pages.map(item=>item.page)).toEqual([4]);
    await expect(f.request('template/import-progress',{requestId,after:-1})).rejects.toThrow();
    await f.request('template/cancel',{draftId:draft.draftId});
  },120000);

  it('reads full-size saved previews through the authenticated host and validates page bounds', async () => {
    const f = await fixture();
    const { template } = await save(f);
    const result = await f.request('template/preview-saved-page', { templateId: template.id, page: 4 });
    expect(result.page).toBe(4);
    const metadata = await sharp(Buffer.from(result.preview.split(',')[1], 'base64')).metadata();
    expect(Math.max(metadata.width, metadata.height)).toBe(1920);
    expect(await f.httpRequest('template/preview-saved-page', { templateId: template.id, page: 1 }, { authorized: false })).toEqual({ status: 401, body: 'unauthorized' });
    await expect(f.request('template/preview-saved-page', { templateId: template.id, page: 5 })).rejects.toThrow('预览页码无效');
    await expect(f.request('template/preview-saved-page', { templateId: '../private', page: 1 })).rejects.toThrow('个人模板标识无效');
  });

  it('uploads and saves a personal template through authenticated current and legacy HTTP routes', async () => {
    const f = await fixture();
    const bytes = await source();
    const input = { input: { fileName: 'Company.pptx', base64: bytes.toString('base64') } };
    expect(await f.httpRequest('template/prepare', input, { authorized: false })).toEqual({ status: 401, body: 'unauthorized' });
    const prepared = await f.httpRequest('template/prepare', input);
    expect(prepared.status).toBe(200);
    const message = JSON.parse(prepared.body);
    expect(message).toMatchObject({ type: 'server-response', rpcId: 'template-request', result: { ok: true } });
    const saved = await f.httpRequest('template/save', { draftId: message.result.value.data.draftId, name: 'HTTP template' }, { channel: '/kimi-ppt' });
    expect(saved.status).toBe(200);
    expect(JSON.parse(saved.body).result.value.data).toMatchObject({ name: 'HTTP template' });
  }, 30_000);

  it('uploads, imports and reuses a PPTX above 64 MB with its real image assets intact', async () => {
    const f = await fixture();
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    const slide = pptx.addSlide();
    slide.addText('Large image template', { x: 0.5, y: 0.3, w: 11, h: 0.6, fontSize: 24 });
    const images = [];
    for (let i = 0; i < 8; i++) {
      const image = await sharp(randomBytes(1800 * 1600 * 3), { raw: { width: 1800, height: 1600, channels: 3 } }).png().toBuffer();
      images.push(image);
      slide.addImage({ data: `image/png;base64,${image.toString('base64')}`, x: 0.4 + i % 4 * 3.2, y: 1.3 + Math.floor(i / 4) * 2.5, w: 3, h: 2.3 });
    }
    const bytes = Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
    expect(bytes.length).toBeGreaterThan(64 * 1024 * 1024);
    async function http(endpoint,payload) {
      const response=await f.httpRequest(endpoint,payload);
      expect(response.status).toBe(200);
      const result=JSON.parse(response.body).result;
      expect(result.value.status,JSON.stringify(result)).toBe('ok');
      return result.value.data;
    }
    const upload=await http('template/upload-start',{input:{fileName:'Large.pptx',size:bytes.length}});
    for(let offset=0;offset<bytes.length;offset+=upload.chunkBytes) {
      const chunk=bytes.subarray(offset,offset+upload.chunkBytes);
      expect(await http('template/upload-chunk',{uploadId:upload.uploadId,offset,base64:chunk.toString('base64')})).toEqual({received:offset+chunk.length,size:bytes.length});
    }
    const draft=await http('template/prepare',{input:{uploadId:upload.uploadId}});
    expect(await readdir(path.join(f.storage,'personal-templates/uploads'))).toEqual([]);
    expect(draft.preview.startsWith('data:image/png;base64,')).toBe(true);
    expect(draft.previews).toBeUndefined();
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
  }, 60000);

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
    expect(draft.preview.startsWith('data:image/png;base64,')).toBe(true);
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
    expect(xml).not.toContain('Hello ');
    expect(xml).not.toContain('world');
    expect(xml).toContain('项目方案');
    expect(xml).toMatch(/<a:rPr sz="1000"[^>]*b="1"[^>]*>[\s\S]*?<\/a:rPr><a:t>ine<\/a:t>/u);
  }, 30000);

  it('imports missing pictures as visible placeholders and persists source identity and page diagnostics', async () => {
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
    expect(result.value.status).toBe('ok');
    const draft = result.value.data;
    expect(draft.template.resourcePlaceholders).toHaveLength(3);
    expect(draft.template.resourcePlaceholders.map(item => item.slide)).toEqual([1, 2, 3]);
    expect(draft.template.resourcePlaceholders.every(item => item.feature === 'picture' && item.elementId && item.bounds.length === 4)).toBe(true);
    const preview = await f.request('template/preview-page', { draftId: draft.draftId, page: 3 });
    expect((await sharp(Buffer.from(preview.preview.split(',')[1], 'base64')).metadata()).width).toBe(1920);
    const saved = await f.request('template/save', { draftId: draft.draftId, name: '占位模板' });
    expect(saved.resourcePlaceholders).toEqual(draft.template.resourcePlaceholders);
    const directory = path.join(f.storage, 'personal-templates', 'saved', saved.id);
    expect(await readFile(path.join(directory, 'source.pptx'))).toEqual(bytes);
    expect(saved.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    const audit = (await readFile(path.join(f.storage, 'audit.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse);
    expect(audit.every(item => item.status === 'completed')).toBe(true);
    expect((await f.request('state')).templates.find(item => item.id === saved.id).resourcePlaceholders).toHaveLength(3);
    await writeFile(path.join(f.workspace, 'missing.pptx'), bytes);
    const imported = await f.tool('pptd_import', { pptx_path: 'missing.pptx', output_directory: 'imported' });
    expect(imported.status).toBe('warning'); expect(imported.placeholderCount).toBe(3); expect(imported.unsupportedCount).toBe(0);
    expect(imported.diagnostics.filter(item => item.level === 'placeholder')).toHaveLength(3);
    await expect(f.tool('pptd_import', { pptx_path: 'missing.pptx', output_directory: 'strict', strict: true })).rejects.toThrow('3 placeholder');
  }, 30000);

  it('reports structural conversion issues with their pages and objects and accepts a retry', async () => {
    const f = await fixture();
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    for (let page = 0; page < 3; page++) pptx.addSlide().addShape(pptx.ShapeType.rect, { x: 1, y: 1, w: 1, h: 1 });
    const parts = unzipSync(Buffer.from(await pptx.write({ outputType: 'nodebuffer' })));
    for (const key of Object.keys(parts)) if (/^ppt\/slides\/slide\d+\.xml$/.test(key)) parts[key] = strToU8(strFromU8(parts[key]).replace('prst="rect"', 'prst="invalidGeometry"').replace('<a:ext cx="914400" cy="914400"/>','<a:ext cx="-914400" cy="914400"/>'));
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

  it('previews, saves and reopens unsupported shapes as position-preserving placeholders', async () => {
    const f=await fixture(),pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';
    pptx.addSlide().addShape('rect',{x:1,y:1,w:2,h:1});
    const parts=unzipSync(Buffer.from(await pptx.write({outputType:'nodebuffer'})));
    parts['ppt/slides/slide1.xml']=strToU8(strFromU8(parts['ppt/slides/slide1.xml']).replace('prst="rect"','prst="vendorShape"'));
    const bytes=Buffer.from(zipSync(parts));
    const draft=await f.request('template/prepare',{input:{fileName:'Unknown shape.pptx',base64:bytes.toString('base64')}});
    expect(draft.preview).toContain('data:image/png;base64,');
    expect(draft.template.resourcePlaceholders).toMatchObject([{feature:'shape-geometry',slide:1,bounds:[72,72,144,72]}]);
    const saved=await f.request('template/save',{draftId:draft.draftId,name:'Unknown shape'});
    expect((await f.request('template/preview-saved-page',{templateId:saved.id,page:1})).preview).toContain('data:image/png;base64,');
    expect(await readFile(path.join(f.storage,'personal-templates','saved',saved.id,'source.pptx'))).toEqual(bytes);
  },30000);

  it('previews before registration and persists across sessions/restarts with profile isolation', async () => {
    const f = await fixture(); const bytes = await source();
    const draft = await f.request('template/prepare', { input: { fileName: 'Company.pptx', base64: bytes.toString('base64') } });
    expect(draft.preview.startsWith('data:image/png;base64,iVBOR')).toBe(true);
    expect(draft.previews).toBeUndefined();
    const second = await f.request('template/preview-page', { draftId: draft.draftId, page: 2 });
    expect(second.page).toBe(2);
    expect(second.preview.startsWith('data:image/png;base64,iVBOR')).toBe(true);
    const full = await sharp(Buffer.from(draft.preview.split(',')[1], 'base64')).metadata();
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
    expect(detail[0].pptdLayoutReference).toContain('Section overview');
    expect(detail[0].pptdLayoutReference).not.toContain('Company template 2');
    expect(template.templateSamples.representativePages).toEqual([1,2]);
    expect(template.palette).toMatchObject({background:'F4F2ED',text:'000000'});
    expect(template.templateProfile.typography.title.fontSize).toBe(28);
    expect(JSON.parse(index[1].structureSummary).slotCounts).toMatchObject({title:1,body:1,image:1});
    expect(JSON.parse(detail[0].structureSummary).slots.find(slot=>slot.role==='title')).toMatchObject({fontSize:28,fontFace:'Arial',action:'replace-content'});
    const reference=await f.tool('ppt_get_template_reference',{template_id:template.id});
    expect(reference.designProfile).toContain('F4F2ED');
    expect(reference.pageContracts).toHaveLength(4);
    await f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-quarter' });
    await f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-year' });
    expect(await readFile(path.join(f.workspace,'new-quarter/deck.pptd'),'utf8')).toContain('fontSize: 28');
    const file = path.join(f.workspace, 'new-quarter', template.pageIndex[0].file);
    await writeFile(file, (await readFile(file, 'utf8')).replaceAll('Project overview', 'Quarterly review'));
    expect(await readFile(path.join(f.workspace, 'new-year', template.pageIndex[0].file), 'utf8')).toContain('Project overview');
    const result = await f.tool('pptd_render', { project_path: 'new-quarter', output_file: 'quarter.pptx' });
    expect(result.status, JSON.stringify(result.check)).toBe('exported');
    expect(result.pageCount).toBe(4);
    expect(result.nativeObjectCount).toBeGreaterThanOrEqual(12);
    const exported=unzipSync(await readFile(path.join(f.workspace,result.outputPath)));
    expect(strFromU8(exported['ppt/slides/slide1.xml'])).toContain('Quarterly review');
    expect(strFromU8(exported['ppt/slides/slide1.xml'])).not.toContain('Company template');
    const stored = await readFile(path.join(f.storage, 'personal-templates', 'saved', template.id, 'source.pptx'));
    expect(stored.equals(bytes)).toBe(true);
    const audit = await readFile(path.join(f.storage, 'audit.ndjson'), 'utf8');
    expect(audit).toContain('copy-personal-template');
    await expect(f.tool('ppt_template_create_project', { template_id: template.id, output_directory: 'new-year' })).rejects.toThrow();
    await expect(f.tool('ppt_template_create_project', { template_id: template.id, output_directory: '../escape' })).rejects.toThrow();
  }, 30000);

  it('reuses template page images through saving and enforces ownership, bounds and file confinement',async()=>{
    const f=await fixture(),bytes=await source();
    const draft=await f.request('template/prepare',{input:{fileName:'Sample.pptx',base64:bytes.toString('base64')}});
    const directory=path.join(f.storage,'personal-templates/drafts',draft.draftId);
    await expect(f.request('template/preview-page',{draftId:draft.draftId,page:1},'session-b')).rejects.toThrow('其他会话');
    await expect(f.request('template/preview-page',{draftId:draft.draftId,page:0})).rejects.toThrow('预览页码无效');
    await expect(f.request('template/preview-page',{draftId:draft.draftId,page:draft.template.slideCount+1})).rejects.toThrow('预览页码无效');
    const first=await f.request('template/preview-page',{draftId:draft.draftId,page:1});
    expect(first.preview).toBe(draft.preview);
    expect(await f.request('template/preview-page',{draftId:draft.draftId,page:1})).toEqual(first);
    // A request from an older client also follows the single template-preview path.
    expect(await f.request('template/preview-page',{draftId:draft.draftId,page:1,view:'original'})).toEqual(first);
    expect(await readdir(directory)).not.toContain('original-preview');
    const second=await f.request('template/preview-page',{draftId:draft.draftId,page:2});
    expect(second.preview).not.toBe(first.preview);
    const saved=await f.request('template/save',{draftId:draft.draftId,name:'Sample library'});
    expect(await f.request('template/preview-saved-page',{templateId:saved.id,page:1})).toEqual(first);
    expect(await f.request('template/preview-saved-page',{templateId:saved.id,page:2})).toEqual(second);
    const savedDirectory=path.join(f.storage,'personal-templates/saved',saved.id);
    expect(await readFile(path.join(savedDirectory,'source.pptx'))).toEqual(bytes);
    expect(await readdir(savedDirectory)).not.toContain('original-preview');
    const cached=path.join(savedDirectory,'preview/pages/page-1.png');
    await rm(cached);await symlink(path.join(f.root,'private.png'),cached);
    await expect(f.request('template/preview-saved-page',{templateId:saved.id,page:1})).rejects.toThrow('模板文件应为普通本地文件');
  },30000);

  it('enriches a current cached conversion from its editable model while reusing every rendered page',async()=>{
    const f=await fixture(),{bytes,template}=await save(f);
    const directory=path.join(f.storage,'personal-templates/saved',template.id);
    const record=JSON.parse(await readFile(path.join(directory,'template.json'),'utf8'));
    delete record.templateProfile;
    record.titleFontFace='Arial';record.palette.background='FFFFFF';
    await writeFile(path.join(directory,'template.json'),JSON.stringify(record));
    const imageBefore=await readFile(path.join(directory,'preview/pages/page-1.png'));
    const enriched=await f.request('template/prepare',{input:{fileName:'again.pptx',base64:bytes.toString('base64')}});
    expect(enriched.duplicate).toBe(true);
    expect(enriched.template.templateProfile.version).toBe(1);
    expect(enriched.template.palette.background).toBe('F4F2ED');
    expect(enriched.template.previewMetadata).toEqual(record.previewMetadata);
    expect(await readFile(path.join(directory,'preview/pages/page-1.png'))).toEqual(imageBefore);
    expect((await f.request('state')).templates.find(t=>t.id===template.id).templateProfile).toEqual(enriched.template.templateProfile);
    expect(await readFile(path.join(directory,'source.pptx'))).toEqual(bytes);
  },30000);

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

  it('validates chunk ordering, total integrity and upload session ownership',async()=>{
    const f=await fixture(),bytes=await source();
    await expect(f.request('template/upload-start',{input:{fileName:'../escape.pptx',size:8}})).rejects.toThrow('PPTX');
    await expect(f.request('template/upload-start',{input:{fileName:'Source.pptx',size:-1}})).rejects.toThrow('大小无效');
    const upload=await f.request('template/upload-start',{input:{fileName:'Source.pptx',size:bytes.length}});
    const chunk={uploadId:upload.uploadId,offset:0,base64:bytes.subarray(0,4).toString('base64')};
    await expect(f.request('template/upload-chunk',chunk,'session-b')).rejects.toThrow('其他会话');
    await expect(f.request('template/prepare',{input:{uploadId:upload.uploadId}},'session-b')).rejects.toThrow('其他会话');
    await expect(f.request('template/upload-cancel',{uploadId:upload.uploadId},'session-b')).rejects.toThrow('其他会话');
    await expect(f.request('template/upload-chunk',{...chunk,offset:1})).rejects.toThrow('不匹配');
    await expect(f.request('template/upload-chunk',{...chunk,base64:'UEsDBB=='})).rejects.toThrow('Base64');
    await expect(f.request('template/upload-chunk',{...chunk,base64:'A'.repeat(Math.ceil(upload.chunkBytes/3)*4+4)})).rejects.toThrow('分片');
    await expect(f.request('template/upload-chunk',{...chunk,base64:Buffer.alloc(bytes.length+1).toString('base64')})).rejects.toThrow('不匹配');
    expect(await f.request('template/upload-chunk',chunk)).toEqual({received:4,size:bytes.length});
    await expect(f.request('template/prepare',{input:{uploadId:upload.uploadId}})).rejects.toThrow('完成文件上传');
    await f.request('template/upload-chunk',{...chunk,offset:4,base64:bytes.subarray(4).toString('base64')});
    expect(await readFile(path.join(f.storage,'personal-templates/uploads',upload.uploadId,'source.pptx'))).toEqual(bytes);
    await f.request('template/upload-cancel',{uploadId:upload.uploadId});
    await f.request('template/upload-cancel',{uploadId:upload.uploadId});
    expect(await readdir(path.join(f.storage,'personal-templates/uploads'))).toEqual([]);
    expect(await readFile(path.join(f.storage,'audit.ndjson'),'utf8')).toContain('upload-personal-template-chunk');
  });

  it('confines uploaded files and cleans a complete source when conversion fails',async()=>{
    const f=await fixture();
    const upload=await f.request('template/upload-start',{input:{fileName:'Bad.pptx',size:4}});
    const file=path.join(f.storage,'personal-templates/uploads',upload.uploadId,'source.pptx');
    const privateFile=path.join(f.root,'private.pptx');await writeFile(privateFile,'kept');
    await rm(file);await symlink(privateFile,file);
    await expect(f.request('template/upload-chunk',{uploadId:upload.uploadId,offset:0,base64:'UEsDBA=='})).rejects.toThrow('普通本地文件');
    expect(await readFile(privateFile,'utf8')).toBe('kept');
    await rm(file);await writeFile(file,Buffer.alloc(0));
    await f.request('template/upload-chunk',{uploadId:upload.uploadId,offset:0,base64:'UEsDBA=='});
    await expect(f.request('template/prepare',{input:{uploadId:upload.uploadId}})).rejects.toThrow();
    expect(await readdir(path.join(f.storage,'personal-templates/uploads'))).toEqual([]);
  });

  it('rejects invalid uploads, cancels drafts, and prevents library path escapes', async () => {
    const f = await fixture();
    await expect(f.request('template/prepare', { input: { fileName: 'legacy.ppt', base64: 'UEsDBA==' } })).rejects.toThrow('PPTX');
    for (const base64 of ['UEsD?A==', 'UEsDBA=', 'UEsDBB=='])
      await expect(f.request('template/prepare', { input: { fileName: 'bad.pptx', base64 } })).rejects.toThrow('Base64');
    await expect(f.request('template/prepare', { input: { fileName: '../secret.pptx', base64: 'UEsDBA==' } })).rejects.toThrow();
    await expect(f.request('template/prepare', { input: { fileName: 'bad.pptx', base64: 'UEsDBA==' } })).rejects.toThrow();
    expect(await f.httpRequestOversize(MAX_PERSONAL_TEMPLATE_HTTP_BODY_BYTES + 1)).toEqual({
      status: 413,
      body: 'payload too large'
    });
    expect((await f.request('state')).templates.filter(t => t.origin === 'personal')).toEqual([]);
    const bytes = await source();
    const draft = await f.request('template/prepare', { input: { fileName: 'cancel.pptx', base64: bytes.toString('base64') } });
    await f.request('template/cancel', { draftId: draft.draftId });
    await expect(f.request('template/save', { draftId: draft.draftId, name: 'Cancelled' })).rejects.toThrow();
    await mkdir(path.join(f.storage, 'personal-templates/saved'), { recursive: true });
    await symlink(f.workspace, path.join(f.storage, 'personal-templates/saved', `personal-${'a'.repeat(64)}`));
    await expect(f.request('state')).rejects.toThrow();
  }, 30000);
  it('reconverts legacy uploads after preview acceptance while preserving identity, metadata and backup', async () => {
    const f = await fixture(); const { bytes, template } = await save(f);
    await f.request('template/select', {templateId:template.id,mode:'ppt'}, 'session-b');
    const file = path.join(f.storage,'personal-templates','saved',template.id,'template.json');
    const old = JSON.parse(await readFile(file,'utf8'));
    delete old.conversionVersion; delete old.previewVersion; old.description='Keep metadata';
    await writeFile(file,JSON.stringify(old));
    const draft=await f.request('template/prepare',{input:{fileName:'refresh.pptx',base64:bytes.toString('base64')}});
    expect(draft.duplicate).toBeUndefined();expect(draft.template.id).toBe(template.id);
    expect(JSON.parse(await readFile(file,'utf8')).conversionVersion).toBeUndefined();
    const updated=await f.request('template/save',{draftId:draft.draftId,name:old.name});
    expect(updated.conversionVersion).toBe(PERSONAL_TEMPLATE_CONVERSION_VERSION);expect(updated.previewVersion).toBe(PERSONAL_TEMPLATE_PREVIEW_VERSION);expect(updated.description).toBe('Keep metadata');
    expect(updated.createdAt).toBe(old.createdAt);
    expect((await f.request('state',{},'session-b')).selectedTemplateId).toBe(old.id);
    const backups=await readdir(path.join(f.storage,'personal-templates','backups',template.id));
    expect(backups).toHaveLength(1);
    expect(JSON.parse(await readFile(path.join(f.storage,'personal-templates','backups',template.id,backups[0],'template.json'),'utf8')).conversionVersion).toBeUndefined();
  },30000);

});

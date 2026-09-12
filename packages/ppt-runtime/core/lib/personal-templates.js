import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { loadPptdProject, checkPptdProject, parsePptdProject } from './pptd.js';
import { runCli } from './bin.js';

const MAX_TEMPLATES = 100;
const PREVIEW_LONG_EDGE = 1920;
const THUMBNAIL_LONG_EDGE = 720;
const ID = /^personal-[a-f0-9]{64}$/;
const DRAFT = /^[a-f0-9-]{36}$/;
const hash = value => createHash('sha256').update(value).digest('hex');
const nameOf = value => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/u.test(value))
    throw new Error('模板名称应为 1–80 个字符');
  return value.trim();
};
const descriptionOf = value => {
  if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))
    throw new Error('模板描述应为 1000 个字符以内的文字');
  return value.trim();
};
const exists = async target => {
  try { await lstat(target); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
};

function conversionError(check, fileName, sha256) {
  const issues = check.issues.filter(issue => issue.severity === 'error');
  const details = issues.map(issue => [
    issue.page === undefined ? '文稿' : `第 ${issue.page} 页`,
    issue.elementId ? `对象 ${issue.elementId}` : '',
    issue.message
  ].filter(Boolean).join(' · '));
  const error = new Error([
    `模板导入遇到 ${check.errorCount} 项转换问题：`,
    ...details,
    '请保留原 PPT 文件，提供这些详情以排查转换兼容性。'
  ].join('\n'));
  error.conversion = { fileName, sha256, check };
  return error;
}

/** One library per host-owned Desktop profile; caller-supplied paths never select a library. */
export class PersonalTemplateLibrary {
  tail = Promise.resolve();
  constructor(store, convert, writeSource, maxSlides) {
    this.store = store;
    this.root = path.join(store.root, 'personal-templates');
    this.convert = convert;
    this.writeSource = writeSource;
    this.maxSlides = maxSlides;
  }
  async locked(work) {
    const pending = this.tail.catch(() => {}).then(work);
    this.tail = pending;
    return pending;
  }
  async directory(...parts) {
    await mkdir(this.store.root, { recursive: true, mode: 0o700 });
    const target = path.join(this.root, ...parts);
    const relative = path.relative(this.store.root, target);
    let current = this.store.root;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      await mkdir(current, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('模板目录应为本地独立目录');
    }
    return target;
  }
  async checkedFile(directory, file) {
    const target = path.join(directory, file);
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('模板文件应为普通本地文件');
    const actual = await realpath(target);
    if (!actual.startsWith((await realpath(this.root)) + path.sep)) throw new Error('模板文件超出个人库范围');
    return target;
  }
  async readRecord(id) {
    if (!ID.test(id)) throw new Error('个人模板标识无效');
    const directory = path.join(this.root, 'saved', id);
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('模板目录无效');
    const record = JSON.parse(await readFile(await this.checkedFile(directory, 'template.json'), 'utf8'));
    if (record.id !== id || record.origin !== 'personal') throw new Error('模板记录无效');
    if (!Array.isArray(record.previewImages) || record.previewImages.length !== 3 || record.previewImages.some(image =>
      typeof image !== 'string' || !image.startsWith('data:image/png;base64,') || image.length > 4 * 1024 * 1024)) throw new Error('模板预览资源无效');
    nameOf(record.name);
    if (!Array.isArray(record.pageIndex) || record.pageIndex.length !== record.slideCount || record.pageIndex.some((page, i) =>
      page.slideNumber !== i + 1 || typeof page.file !== 'string' || !/^pages\/[A-Za-z0-9_.-]+\.page$/.test(page.file))) throw new Error('模板页面索引无效');
    return record;
  }
  async list() {
    const directory = path.join(this.root, 'saved');
    if (!await exists(directory)) return [];
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('个人模板库目录无效');
    const items = await readdir(directory, { withFileTypes: true });
    const records = [];
    for (const item of items) {
      if (!ID.test(item.name)) continue;
      records.push(await this.readRecord(item.name));
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async audit(sessionId, operation, work) {
    const startedAt = new Date().toISOString();
    try {
      const result = await work();
      await this.store.appendAudit(sessionId, {
        id: randomUUID(), operation, actor: 'user', status: 'completed', startedAt,
        completedAt: new Date().toISOString(), summary: operation
      }, { templateId: result?.id, draftId: result?.draftId });
      return result;
    } catch (error) {
      await this.store.appendAudit(sessionId, {
        id: randomUUID(), operation, actor: 'user', status: 'failed', startedAt,
        completedAt: new Date().toISOString(), error: error.message
      }, error.conversion ? { conversion: error.conversion } : {});
      throw error;
    }
  }
  async prepare(sessionId, input) {
    return this.locked(() => this.audit(sessionId, 'prepare-personal-template', async () => {
      const fileName = input?.fileName;
      if (typeof fileName !== 'string' || fileName.length > 240 || !/\.pptx$/i.test(fileName) || /[\\/\u0000]/u.test(fileName))
        throw new Error('请选择 PPTX 文件');
      const encoded = input?.base64;
      if (typeof encoded !== 'string' || encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded))
        throw new Error('上传数据应为有效 Base64');
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.toString('base64') !== encoded) throw new Error('上传数据应为有效 Base64');
      if (bytes.length < 4 || !bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])))
        throw new Error('请选择有效的 PPTX 文件');
      const id = `personal-${hash(bytes)}`;
      const saved = (await this.list()).find(item => item.id === id);
      if (saved) return { duplicate: true, template: saved };
      if ((await this.list()).length >= MAX_TEMPLATES) throw new Error('个人模板库最多保存 100 套模板');
      const drafts = await this.directory('drafts');
      // Expired previews are temporary resources, independent of registered templates.
      for (const item of await readdir(drafts, { withFileTypes: true })) {
        if (item.isDirectory() && DRAFT.test(item.name) && Date.now() - (await lstat(path.join(drafts, item.name))).mtimeMs > 86400000)
          await rm(path.join(drafts, item.name), { recursive: true });
      }
      if ((await readdir(drafts)).length >= 10) throw new Error('待保存模板达到 10 套，请先保存或取消已有预览');
      const converted = await this.convert(bytes, fileName);
      if (!converted.slideCount || converted.slideCount > this.maxSlides) throw new Error(`模板应包含 1–${this.maxSlides} 页`);
      const missing = converted.diagnostics.filter(item => item.level === 'unsupported');
      if (missing.length) throw conversionError({ errorCount: missing.length, issues: missing.map(item => ({
        severity: 'error', code: 'conversion-unsupported', page: item.slide, elementId: item.nodeId,
        message: `${item.feature}：${item.message}`
      })) }, fileName, hash(bytes));
      const parsed = parsePptdProject(converted.source);
      const checked = checkPptdProject(parsed);
      if (checked.status === 'fail') throw conversionError(checked, fileName, hash(bytes));
      const draftId = randomUUID();
      const directory = await this.directory('drafts', draftId);
      try {
        const project = await this.directory('drafts', draftId, 'project');
        await this.writeSource(project, converted.source);
        await writeFile(path.join(directory, 'source.pptx'), bytes, { mode: 0o600 });
        const previewDirectory = path.join(directory, 'preview');
        let output = '';
        const scale = Math.min(8, PREVIEW_LONG_EDGE / Math.max(parsed.width, parsed.height));
        const code = await runCli(['screenshot', project, '-o', previewDirectory, '--scale', String(scale), '--json'], {
          stdout: { write: value => { output += value; } }, stderr: { write: value => { output += value; } }
        });
        if (code !== 0) throw new Error(`模板预览生成失败：${output.slice(0, 500)}`);
        const previews = [];
        for (let page = 1; page <= converted.slideCount; page++) {
          const image = await readFile(path.join(previewDirectory, 'pages', `page-${page}.png`));
          previews.push(`data:image/png;base64,${image.toString('base64')}`);
        }
        // The review dialog uses the full render; the catalog carries three smaller images.
        const previewImages = await Promise.all([0, Math.floor(previews.length / 2), previews.length - 1].map(async index => {
          const image = Buffer.from(previews[index].split(',')[1], 'base64');
          const thumbnail = await sharp(image).resize({ width: THUMBNAIL_LONG_EDGE, height: THUMBNAIL_LONG_EDGE, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
          return `data:image/png;base64,${thumbnail.toString('base64')}`;
        }));
        const name = nameOf(fileName.replace(/\.pptx$/i, '').slice(0, 80));
        const record = {
          id, origin: 'personal', name, category: 'personal', supportedModes: ['ppt'], aspectRatio: 'wide',
          description: `${converted.slideCount} 页个人 PPT 模板`, previewTitle: name, previewSubtitle: '我的模板',
          palette: { background: 'FFFFFF', surface: 'F4F4F4', text: '222222', muted: '666666', accent: '333333', secondary: 'AAAAAA' },
          titleFontFace: 'Arial', bodyFontFace: 'Arial',
          createdAt: new Date().toISOString(), fileName, sha256: hash(bytes), slideCount: converted.slideCount,
          previewImages,
          diagnostics: converted.diagnostics, checkWarnings: checked.warningCount,
          reviewIssues: checked.issues.filter(issue => issue.severity === 'warning').map(issue => ({
            ...issue, message: issue.code === 'out-of-bounds' ? '源文件对象位于页面边缘或画布外，预览按页面范围显示。'
              : issue.code === 'text-overflow' ? '源文件文字可能超出文本框，请在预览中核对。' : issue.message
          })),
          pageIndex: [...converted.source.pages.keys()].map((file, i) => ({ slideNumber: i + 1, file }))
        };
        await writeFile(path.join(directory, 'template.json'), JSON.stringify(record), { mode: 0o600 });
        await writeFile(path.join(directory, 'owner.json'), JSON.stringify({ session: hash(sessionId) }), { mode: 0o600 });
        return { draftId, template: record, previews };
      } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
    }));
  }
  async draft(sessionId, draftId) {
    if (!DRAFT.test(draftId)) throw new Error('预览标识无效');
    const directory = path.join(this.root, 'drafts', draftId);
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('预览目录无效');
    const owner = JSON.parse(await readFile(await this.checkedFile(directory, 'owner.json'), 'utf8'));
    if (owner.session !== hash(sessionId)) throw new Error('该预览属于其他会话');
    return directory;
  }
  async save(sessionId, draftId, name) {
    name = nameOf(name);
    return this.locked(() => this.audit(sessionId, 'save-personal-template', async () => {
      const directory = await this.draft(sessionId, draftId);
      const record = JSON.parse(await readFile(await this.checkedFile(directory, 'template.json'), 'utf8'));
      if (!ID.test(record.id)) throw new Error('模板标识无效');
      const duplicate = (await this.list()).find(item => item.id === record.id);
      if (duplicate) { await rm(directory, { recursive: true }); return duplicate; }
      if ((await this.list()).length >= MAX_TEMPLATES) throw new Error('个人模板库最多保存 100 套模板');
      const project = await loadPptdProject(path.join(directory, 'project'));
      if (checkPptdProject(project).status === 'fail') throw new Error('请重新上传完整的模板文件');
      const next = { ...record, name, previewTitle: name };
      await writeFile(path.join(directory, 'template.json'), JSON.stringify(next), { mode: 0o600 });
      await rename(directory, path.join(await this.directory('saved'), record.id));
      return next;
    }));
  }
  async cancel(sessionId, draftId) {
    return this.locked(() => this.audit(sessionId, 'cancel-personal-template', async () => {
      await rm(await this.draft(sessionId, draftId), { recursive: true });
      return { draftId };
    }));
  }
  async rename(sessionId, id, name) {
    return this.update(sessionId, id, { name }, 'rename-personal-template');
  }
  async update(sessionId, id, changes, operation = 'update-personal-template') {
    return this.locked(() => this.audit(sessionId, operation, async () => {
      const name = nameOf(changes.name);
      const description = changes.description === undefined ? undefined : descriptionOf(changes.description);
      const record = await this.readRecord(id);
      const next = { ...record, name, previewTitle: name, ...(description === undefined ? {} : { description }), updatedAt: new Date().toISOString() };
      const file = path.join(this.root, 'saved', id, 'template.json');
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, file);
      } finally { await rm(temporary, { force: true }); }
      return next;
    }));
  }
  async remove(sessionId, id) {
    return this.locked(() => this.audit(sessionId, 'delete-personal-template', async () => {
      await this.readRecord(id);
      const directory = path.join(this.root, 'saved', id);
      const trash = path.join(await this.directory('trash'), `${id}-${randomUUID()}`);
      await rename(directory, trash);
      return { id };
    }));
  }
  async projectSource(id) {
    await this.readRecord(id);
    const directory = path.join(this.root, 'saved', id, 'project');
    // Walk before reading or copying; saved image paths remain confined to this project.
    const inspect = async current => {
      for (const item of await readdir(current, { withFileTypes: true })) {
        if (item.isSymbolicLink()) throw new Error('模板工程应使用本地文件');
        if (item.isDirectory()) await inspect(path.join(current, item.name));
        else if (!item.isFile()) throw new Error('模板工程包含无效文件');
      }
    };
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('模板工程目录无效');
    await inspect(directory);
    await loadPptdProject(directory);
    return directory;
  }
  async copyProject(id, output) {
    return this.locked(async () => {
      const source = await this.projectSource(id);
      for (const item of await readdir(source))
        await cp(path.join(source, item), path.join(output, item), { recursive: true, errorOnExist: true, force: false });
    });
  }
}

import { readFileSync } from 'node:fs';
import { mkdir, readFile, lstat, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Shipped, read-only PPTD projects. The signed package owns this manifest;
// session data supplies an ID and never selects a source filesystem path.
const root = fileURLToPath(new URL('./bundled-template-projects/', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const byId = new Map();
for (const entry of manifest) {
  const { template, files } = entry;
  if (!/^dsh-[a-z0-9-]+$/.test(template.id) || byId.has(template.id) || template.origin !== 'built-in')
    throw new Error('内置模板目录无效');
  if (!files['deck.pptd'] || Object.keys(files).length > 1000) throw new Error('内置模板文件清单无效');
  for (const [file, digest] of Object.entries(files)) {
    if (path.posix.isAbsolute(file) || file.includes('\\') || file.split('/').some(p => !p || p === '.' || p === '..') || !/^[a-f0-9]{64}$/.test(digest))
      throw new Error('内置模板文件路径无效');
  }
  byId.set(template.id, entry);
}
export const bundledProjectTemplates = manifest.map(entry => entry.template);
export const bundledProjectTemplate = id => byId.get(id)?.template;
export function bundledProjectFileTable(id) {
  const entry = byId.get(id);
  if (!entry) throw new Error('请选择带有可编辑工程的模板');
  return entry.files;
}

async function verifiedFiles(id) {
  const entry = byId.get(id);
  if (!entry) throw new Error('请选择带有可编辑工程的模板');
  const directory = path.join(root, id);
  const canonicalRoot = await realpath(root);
  const result = [];
  let total = 0;
  for (const [file, digest] of Object.entries(entry.files)) {
    const target = path.join(directory, file);
    const info = await lstat(target);
    const actual = await realpath(target);
    if (!info.isFile() || info.isSymbolicLink() || !actual.startsWith(canonicalRoot + path.sep) || info.size > 16 * 1024 * 1024)
      throw new Error('内置模板文件应在应用资源目录内');
    const bytes = await readFile(target);
    total += bytes.length;
    if (total > 64 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== digest)
      throw new Error('内置模板文件校验失败');
    result.push([file, bytes]);
  }
  return { directory, files: result };
}

export async function bundledProjectSource(id) {
  return (await verifiedFiles(id)).directory;
}

// Called only inside the existing workspace-path policy and mutation audit.
// Copy the verified bytes so the package always remains a reusable source.
export async function copyBundledProject(id, output) {
  const { files } = await verifiedFiles(id);
  for (const [file, bytes] of files) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
  }
}

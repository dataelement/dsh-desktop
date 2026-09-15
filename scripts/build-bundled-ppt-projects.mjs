import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const DEFAULT_ROOT = path.resolve('packages/ppt-runtime/core/lib/bundled-template-projects');
const TEMPLATE_KEYS = new Set([
  'id', 'name', 'category', 'supportedModes', 'description', 'aspectRatio',
  'titleFontFace', 'bodyFontFace', 'previewTitle', 'previewSubtitle',
  'previewFiles', 'diagnostics', 'palette'
]);
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_PROJECT_BYTES = 64 * 1024 * 1024;
const MAX_PROJECT_FILES = 1000;

function fail(id, message) {
  throw new Error(`${id}: ${message}`);
}

function safeRelative(id, value, field) {
  if (typeof value !== 'string' || path.posix.isAbsolute(value) || value.includes('\\') || value.split('/').some(part => !part || part === '.' || part === '..')) {
    fail(id, `${field} must be a safe relative path`);
  }
  return value;
}

async function regularFile(id, root, relative, field) {
  safeRelative(id, relative, field);
  const target = path.join(root, relative);
  const info = await fs.lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) fail(id, `${field} must reference a regular file`);
  if (info.size > MAX_FILE_BYTES) fail(id, `${field} exceeds 16 MB`);
  return fs.readFile(target);
}

async function projectFiles(id, directory) {
  const files = [];
  const visit = async (current, prefix = '') => {
    for (const entry of (await fs.readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (prefix === '' && (entry.name === 'template.json' || entry.name === 'previews')) continue;
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      safeRelative(id, relative, 'project file');
      if (entry.isSymbolicLink()) fail(id, `project file is a symbolic link: ${relative}`);
      if (entry.isDirectory()) await visit(path.join(current, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
      else fail(id, `project file has an unsupported type: ${relative}`);
    }
  };
  await visit(directory);
  if (!files.includes('deck.pptd')) fail(id, 'deck.pptd is required');
  if (files.length > MAX_PROJECT_FILES) fail(id, `project contains more than ${MAX_PROJECT_FILES} files`);
  return files.sort();
}

async function buildEntry(directory) {
  const descriptor = JSON.parse(await fs.readFile(path.join(directory, 'template.json'), 'utf8'));
  const id = descriptor.id;
  if (!/^dsh-[a-z0-9-]+$/.test(id) || path.basename(directory) !== id) fail(id || path.basename(directory), 'directory and id must match dsh-*');
  if (Object.keys(descriptor).some(key => !TEMPLATE_KEYS.has(key))) fail(id, 'template.json contains an unsupported field');
  for (const field of ['name', 'category', 'description', 'aspectRatio', 'titleFontFace', 'bodyFontFace', 'previewTitle', 'previewSubtitle']) {
    if (typeof descriptor[field] !== 'string' || !descriptor[field].trim()) fail(id, `${field} is required`);
  }
  if (descriptor.aspectRatio !== 'wide') fail(id, 'aspectRatio must be wide');
  if (JSON.stringify(descriptor.supportedModes) !== '["ppt"]') fail(id, 'supportedModes must contain ppt');
  if (!Array.isArray(descriptor.previewFiles) || descriptor.previewFiles.length < 1 || descriptor.previewFiles.length > 3) fail(id, 'provide 1-3 previewFiles');
  if (!Array.isArray(descriptor.diagnostics)) fail(id, 'diagnostics must be an array');
  if (!descriptor.palette || typeof descriptor.palette !== 'object' || Array.isArray(descriptor.palette)) fail(id, 'palette is required');

  const project = yaml.load(await fs.readFile(path.join(directory, 'deck.pptd'), 'utf8'), { schema: yaml.JSON_SCHEMA });
  if (project?.version !== 'v2' || project?.template?.id !== id || project?.template?.name !== descriptor.name) fail(id, 'deck.pptd template identity must match template.json');
  if (!Array.isArray(project.pages) || project.pages.length < 1 || project.pages.length > 40) fail(id, 'deck.pptd must contain 1-40 pages');
  const pageIndex = project.pages.map((file, index) => ({ slideNumber: index + 1, file: safeRelative(id, file, 'page') }));
  if (new Set(project.pages).size !== project.pages.length) fail(id, 'deck.pptd page paths must be unique');

  const files = {};
  let totalBytes = 0;
  for (const relative of await projectFiles(id, directory)) {
    const bytes = await regularFile(id, directory, relative, 'project file');
    totalBytes += bytes.length;
    if (totalBytes > MAX_PROJECT_BYTES) fail(id, 'project exceeds 64 MB');
    files[relative] = createHash('sha256').update(bytes).digest('hex');
  }
  for (const page of pageIndex) if (!files[page.file]) fail(id, `page is missing from project: ${page.file}`);

  const previewImages = [];
  for (const relative of descriptor.previewFiles) {
    const bytes = await regularFile(id, directory, relative, 'preview file');
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) fail(id, `preview must be JPEG: ${relative}`);
    previewImages.push(`data:image/jpeg;base64,${bytes.toString('base64')}`);
  }
  const { previewFiles: _previewFiles, ...metadata } = descriptor;
  return {
    template: {
      ...metadata,
      origin: 'built-in',
      slideCount: pageIndex.length,
      pageIndex,
      previewImages
    },
    files
  };
}

export async function rebuildBundledTemplateManifest(root = DEFAULT_ROOT) {
  await fs.mkdir(root, { recursive: true });
  const directories = (await fs.readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('dsh-'))
    .sort((a, b) => a.name.localeCompare(b.name));
  const entries = [];
  for (const directory of directories) entries.push(await buildEntry(path.join(root, directory.name)));
  const ids = entries.map(entry => entry.template.id);
  if (new Set(ids).size !== ids.length) throw new Error('Bundled template IDs must be unique');
  await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(entries, null, 2)}\n`);
  return entries.map(entry => ({ id: entry.template.id, pages: entry.template.slideCount, files: Object.keys(entry.files).length, previews: entry.template.previewImages.length }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await rebuildBundledTemplateManifest(), null, 2));
}

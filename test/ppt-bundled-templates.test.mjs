import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

let apply, bundledProjectFileTable, bundledProjectSource, bundledProjectTemplate, bundledProjectTemplates, packageRoot;
const cleanups = [];
beforeAll(async () => {
  packageRoot = await mkdtemp(path.resolve('node_modules/.ppt-bundled-'));
  execFileSync('tar', ['-xzf', 'packages/ppt-bundles/dsh-ppt-0.1.1-rc.2-desktop-20260906.tgz', '-C', packageRoot, '--strip-components=1']);
  ({ apply } = await import(pathToFileURL(path.join(packageRoot, 'lib/index.js'))));
  ({ bundledProjectFileTable, bundledProjectSource, bundledProjectTemplate, bundledProjectTemplates } = await import(pathToFileURL(path.join(packageRoot, 'lib/bundled-template-projects.js'))));
});
afterAll(async () => { if (packageRoot) await rm(packageRoot, { recursive: true, force: true }); });
afterEach(async () => {
  for (const root of cleanups.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ppt-bundled-'));
  cleanups.push(root);
  const workspace = path.join(root, 'workspace');
  await mkdir(workspace);
  const tools = new Map();
  let rpc;
  const host = {
    effect(run) { run?.(); return () => {}; },
    webServer: { register() { return () => {}; } },
    inject(services, callback) { if (services?.includes?.('webServer')) callback?.(host); },
    skills: { registerProvider() {} },
    systemPrompt: { section() {} },
    on() {},
    tools: { register(tool) { tools.set(tool.name, tool); } },
    connection: { rpc: { handle(_route, handler) { rpc = handler; } } }
  };
  await apply(host, { root: path.join(root, 'storage') });
  const request = async (endpoint, args = {}) => {
    const result = await rpc(endpoint, { sessionId: 'bundle-test', ...args });
    expect(result.ok).toBe(true);
    if (result.value.status === 'error') throw new Error(result.value.error.message);
    return result.value.data;
  };
  const tool = (name, args) => tools.get(name).execute(args, {
    agent: { id: 'bundle-test', session: { header: { cwd: workspace } } },
    signal: new AbortController().signal
  });
  return { request, tool };
}

describe('bundled editable PPT templates', () => {
  it('keeps every catalog pageIndex path inside the verified file table', () => {
    expect(bundledProjectTemplates.length).toBeGreaterThan(0);
    for (const catalog of bundledProjectTemplates) {
      const template = bundledProjectTemplate(catalog.id);
      const files = bundledProjectFileTable(catalog.id);
      expect(template.pageIndex.length).toBe(template.slideCount);
      for (const page of template.pageIndex) {
        expect(Object.hasOwn(files, page.file)).toBe(true);
        expect(path.posix.isAbsolute(page.file)).toBe(false);
        expect(page.file.includes('\\')).toBe(false);
        expect(page.file.split('/').some(part => !part || part === '.' || part === '..')).toBe(false);
      }
    }
  });

  it('rejects a pageIndex path that is missing from the verified file table', async () => {
    const f = await fixture();
    const template = bundledProjectTemplate('dsh-green-pulse');
    await f.request('template/select', { templateId: template.id, mode: 'ppt' });
    const originalIndex = template.pageIndex;
    template.pageIndex = [...originalIndex, { slideNumber: 99, file: '../outside.page' }];
    try {
      await expect(f.tool('ppt_get_template_pages', { template_id: template.id })).rejects.toThrow('已校验文件表');
    } finally {
      template.pageIndex = originalIndex;
    }
    await expect(bundledProjectSource('../../outside')).rejects.toThrow();
  });
});

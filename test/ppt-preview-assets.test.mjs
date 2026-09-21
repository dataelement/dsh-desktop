import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPreviewHandler, registerPreviewAssets } from '../packages/ppt-runtime/core/lib/preview-assets.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);
const hash = createHash('sha256').update(jpeg).digest('hex');
let dir, server, base, file;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'dsh-preview-test-'));
  const root = path.join(dir, 'references');
  await mkdir(path.join(root, 'business/example/pages'), { recursive: true });
  file = path.join(root, 'business/example/pages/01.jpg');
  await writeFile(file, jpeg);
  await writeFile(path.join(dir, 'private.txt'), 'private user content');
  const files = { [hash]: 'business/example/pages/01.jpg', ['0'.repeat(64)]: '../private.txt' };
  server = createServer(createPreviewHandler(files, root));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/dsh-ppt/previews/`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

describe('shared local PPT preview assets', () => {
  it('serves the original bytes to both clients with content-addressed caching', async () => {
    const first = await fetch(base + hash + '.jpg');
    expect(first.status).toBe(200);
    expect(first.headers.get('content-type')).toBe('image/jpeg');
    expect(first.headers.get('cache-control')).toContain('immutable');
    expect(Buffer.from(await first.arrayBuffer())).toEqual(jpeg);
    const cached = await fetch(base + hash + '.jpg', { headers: { 'If-None-Match': first.headers.get('etag') } });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
    const head = await fetch(base + hash + '.jpg', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(jpeg.length));
    expect(await head.text()).toBe('');
  });
  it('does not serve unknown IDs, filesystem paths or manifest paths outside the reference root', async () => {
    for (const suffix of ['f'.repeat(64) + '.jpg', '0'.repeat(64) + '.jpg', '%2e%2e%2fprivate.txt', 'constructor.jpg']) {
      const response = await fetch(base + suffix);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).not.toContain('private');
    }
  });
  it('does not cache missing or changed assets under an old content hash', async () => {
    await writeFile(file, 'changed content');
    expect((await fetch(base + hash + '.jpg')).status).toBe(404);
    await rm(file);
    expect((await fetch(base + hash + '.jpg')).status).toBe(404);
  });
  it('only permits read methods', async () => {
    const response = await fetch(base + hash + '.jpg', { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });
  it('registers with the owning web server and disposes its route with the plugin', () => {
    let route, disposed = false;
    let dispose;
    registerPreviewAssets({ effect(register) { dispose = register(); }, webServer: { register(value) { route = value; return () => { disposed = true; }; } } }, {}, dir);
    expect(route.path).toBe('/dsh-ppt/previews');
    dispose();
    expect(disposed).toBe(true);
  });
});

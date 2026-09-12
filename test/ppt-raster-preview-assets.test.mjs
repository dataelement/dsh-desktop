import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import sharp from 'sharp';
import { preparePreviewProject } from '../packages/ppt-runtime/core/lib/raster-preview-assets.js';

it('preserves alpha, contain/cover frames, and original bytes when one large image is reused', async () => {
  const raw = randomBytes(900 * 900 * 4);
  for (let i = 3; i < raw.length; i += 4) raw[i] = 128;
  const bytes = await sharp(raw, { raw: { width: 900, height: 900, channels: 4 } }).png().toBuffer();
  expect(bytes.length).toBeGreaterThan(1024 * 1024);
  const asset = { path: 'assets/photo.png', bytes, mediaType: 'image/png' };
  const project = { pages: [{ elements: [
    { elementType: 'image', src: asset.path, bounds: [0, 0, 200, 100], fit: { mode: 'contain' } },
    { elementType: 'image', src: asset.path, bounds: [200, 0, 100, 200], fit: { mode: 'cover' } }
  ] }], source: { assets: new Map([[asset.path, asset]]) } };
  const preview = await preparePreviewProject(project, 0, 2);
  const images = preview.pages[0].elements.map(element => preview.source.assets.get(element.src));
  expect(images[0]).not.toBe(images[1]);
  for (const [i, image] of images.entries()) {
    const { data, info } = await sharp(image.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual(i === 0 ? [400, 200] : [200, 400]);
    expect(data[3]).toBe(i === 0 ? 0 : 128);
    expect(data[(Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3]).toBe(128);
    expect(image.bytes.length).toBeLessThan(6 * 1024 * 1024);
  }
  expect(project.pages[0].elements.map(element => element.src)).toEqual([asset.path, asset.path]);
  expect(project.source.assets).toHaveLength(1);
  expect(preview.source.assets.get(asset.path)).toBe(asset);
  expect((await sharp(bytes).metadata()).width).toBe(900);
});

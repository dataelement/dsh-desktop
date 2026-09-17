import path from 'node:path';
import { extract as nativeExtract } from './binding.js';

/**
 * Extract a zip archive to a directory.
 *
 *   await extract(source, { dir: '/abs/path' })
 *
 * @param {string} zipPath
 * @param {import('./index.js').ExtractOptions} opts
 * @returns {Promise<void>}
 */
export async function extract(zipPath, opts) {
  if (!opts || typeof opts.dir !== 'string') {
    throw new TypeError('extract: opts.dir is required');
  }
  if (!path.isAbsolute(opts.dir)) {
    throw new TypeError('extract: opts.dir must be an absolute path');
  }
  return nativeExtract(zipPath, opts);
}

export default extract;

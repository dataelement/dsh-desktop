import { createFilter } from 'vite';
export { createLogger, defineConfig as defineViteConfig, mergeConfig } from 'vite';
export { b as bytecodePlugin, d as defineConfig, e as externalizeDepsPlugin, a as loadConfigFromFile, l as loadEnv, r as resolveConfig } from './chunks/lib-q6ns0vZr.js';
export { createServer } from './chunks/lib-7y7CgM8M.js';
export { build } from './chunks/lib-BkLsMF4i.js';
export { preview } from './chunks/lib-Dvh2Hokw.js';
import { createRequire } from 'node:module';
import 'node:path';
import 'node:fs';
import 'node:url';
import 'picocolors';
import 'esbuild';
import 'node:child_process';
import 'node:crypto';
import 'node:fs/promises';
import 'magic-string';
import '@babel/core';

async function transformWithSWC(code, id, options) {
    const { sourcemap = false, minify = false } = options;
    delete options.sourcemap;
    delete options.minify;
    const isTs = /\.tsx?$/.test(id);
    const require = createRequire(import.meta.url);
    let swc;
    try {
        swc = require('@swc/core');
    }
    catch {
        throw new Error('swc plugin require @swc/core, you need to install it.');
    }
    const jsc = {
        parser: {
            syntax: isTs ? 'typescript' : 'ecmascript',
            decorators: true
        },
        transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            ...options
        },
        keepClassNames: true,
        target: 'es2022',
        minify: {
            format: {
                comments: false
            }
        }
    };
    const result = await swc.transform(code, {
        jsc,
        sourceMaps: sourcemap,
        minify,
        configFile: false,
        swcrc: false
    });
    const map = sourcemap && result.map ? JSON.parse(result.map) : { mappings: '' };
    return {
        code: result.code,
        map
    };
}
/**
 * Use SWC to support for emitting type metadata for decorators.
 * When using `swcPlugin`, you need to install `@swc/core`.
 */
function swcPlugin(options = {}) {
    const filter = createFilter(options.include || /\.(m?ts|[jt]sx)$/, options.exclude || /\.js$/);
    let sourcemap = false;
    let minify = false;
    return {
        name: 'vite:swc',
        config() {
            return {
                esbuild: false
            };
        },
        async configResolved(resolvedConfig) {
            sourcemap = resolvedConfig.build?.sourcemap === 'inline' ? 'inline' : !!resolvedConfig.build?.sourcemap;
            minify = resolvedConfig.build?.minify;
        },
        async transform(code, id) {
            if (filter(id)) {
                const result = await transformWithSWC(code, id, { sourcemap, ...(options.transformOptions || {}) });
                return {
                    code: result.code,
                    map: result.map
                };
            }
        },
        async renderChunk(code, chunk) {
            if (!minify || minify === 'terser') {
                return null;
            }
            const result = await transformWithSWC(code, chunk.fileName, {
                sourcemap,
                minify: true,
                ...(options.transformOptions || {})
            });
            return {
                code: result.code,
                map: result.map
            };
        }
    };
}

export { swcPlugin };

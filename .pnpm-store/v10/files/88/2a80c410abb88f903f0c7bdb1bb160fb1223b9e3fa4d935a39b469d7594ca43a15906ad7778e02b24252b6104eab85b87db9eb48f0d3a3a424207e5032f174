import { build as build$1 } from 'vite';
import { r as resolveConfig } from './lib-q6ns0vZr.js';
import 'node:path';
import 'node:fs';
import 'node:url';
import 'node:module';
import 'picocolors';
import 'esbuild';
import 'node:child_process';
import 'node:crypto';
import 'node:fs/promises';
import 'magic-string';
import '@babel/core';

/**
 * Bundles the electron app for production.
 */
async function build(inlineConfig = {}) {
    process.env.NODE_ENV_ELECTRON_VITE = 'production';
    const config = await resolveConfig(inlineConfig, 'build', 'production');
    if (!config.config) {
        return;
    }
    // Build targets in order: main -> preload -> renderer
    const buildTargets = ['main', 'preload', 'renderer'];
    for (const target of buildTargets) {
        const viteConfig = config.config[target];
        if (viteConfig) {
            // Disable watch mode in production builds
            if (viteConfig.build?.watch) {
                viteConfig.build.watch = null;
            }
            await build$1(viteConfig);
        }
    }
}

export { build };

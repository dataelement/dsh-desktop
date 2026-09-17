import { createLogger, createServer as createServer$1, mergeConfig, build } from 'vite';
import colors from 'picocolors';
import { r as resolveConfig, c as resolveHostname, s as startElectron } from './lib-q6ns0vZr.js';
import 'node:path';
import 'node:fs';
import 'node:url';
import 'node:module';
import 'esbuild';
import 'node:child_process';
import 'node:crypto';
import 'node:fs/promises';
import 'magic-string';
import '@babel/core';

async function createServer(inlineConfig = {}, options) {
    process.env.NODE_ENV_ELECTRON_VITE = 'development';
    const config = await resolveConfig(inlineConfig, 'serve', 'development');
    if (config.config) {
        const logger = createLogger(inlineConfig.logLevel);
        let server;
        let ps;
        const errorHook = (e) => {
            logger.error(`${colors.bgRed(colors.white(' ERROR '))} ${colors.red(e.message)}`);
        };
        const mainViteConfig = config.config?.main;
        if (mainViteConfig && !options.rendererOnly) {
            const watchHook = () => {
                logger.info(colors.green(`\nelectron main process rebuilt successfully`));
                if (ps) {
                    ps.removeAllListeners();
                    ps.kill();
                    ps = startElectron(inlineConfig.root);
                    logger.info(colors.green(`\nrestarting electron app...\n`));
                }
            };
            await doBuild(mainViteConfig, watchHook, errorHook);
            logger.info(colors.green(`\nelectron main process built successfully`));
        }
        const preloadViteConfig = config.config?.preload;
        if (preloadViteConfig && !options.rendererOnly) {
            logger.info(colors.gray(`\n-----\n`));
            const watchHook = () => {
                logger.info(colors.green(`\nelectron preload scripts rebuilt successfully`));
                if (server) {
                    logger.info(colors.cyan(`\nreloading electron renderer...\n`));
                    server.ws.send({ type: 'full-reload' });
                }
            };
            await doBuild(preloadViteConfig, watchHook, errorHook);
            logger.info(colors.green(`\nelectron preload scripts built successfully`));
        }
        if (options.rendererOnly) {
            logger.warn(`\n${colors.yellow(colors.bold('(!)'))} ${colors.yellow('skipped building main process and preload scripts (using previous build)')}`);
        }
        const rendererViteConfig = config.config?.renderer;
        if (rendererViteConfig) {
            logger.info(colors.gray(`\n-----\n`));
            server = await createServer$1(rendererViteConfig);
            if (!server.httpServer) {
                throw new Error('HTTP server not available');
            }
            await server.listen();
            const conf = server.config.server;
            const protocol = conf.https ? 'https:' : 'http:';
            const host = resolveHostname(conf.host);
            const port = conf.port;
            process.env.ELECTRON_RENDERER_URL = `${protocol}//${host}:${port}`;
            const slogger = server.config.logger;
            slogger.info(colors.green(`dev server running for the electron renderer process at:\n`), {
                clear: !slogger.hasWarned && !options.rendererOnly
            });
            server.printUrls();
        }
        ps = startElectron(inlineConfig.root);
        logger.info(colors.green(`\nstarting electron app...\n`));
    }
}
async function doBuild(config, watchHook, errorHook) {
    return new Promise(resolve => {
        if (config.build?.watch) {
            let firstBundle = true;
            const closeBundle = () => {
                if (firstBundle) {
                    firstBundle = false;
                    resolve();
                }
                else {
                    watchHook();
                }
            };
            config = mergeConfig(config, {
                plugins: [
                    {
                        name: 'vite:electron-watcher',
                        closeBundle
                    }
                ]
            });
        }
        build(config)
            .then(() => {
            if (!config.build?.watch) {
                resolve();
            }
        })
            .catch(e => errorHook(e));
    });
}

export { createServer };

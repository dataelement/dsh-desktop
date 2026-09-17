#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { pathToFileURL } from 'node:url';
import { getProjectRootPath } from './search-module.js';
import { locateElectronModule } from './electron-locator.js';
import { rebuild } from './rebuild.js';
const options = {
    version: { short: 'v', type: 'string', description: 'The version of Electron to build against' },
    force: {
        short: 'f',
        type: 'boolean',
        description: 'Force rebuilding modules, even if we would skip it otherwise',
    },
    arch: {
        short: 'a',
        type: 'string',
        description: "Override the target architecture to something other than your system's",
    },
    platform: {
        type: 'string',
        description: "Override the target platform to something other than your system's",
    },
    'module-dir': {
        short: 'm',
        type: 'string',
        description: 'The path to the node_modules directory to rebuild',
    },
    'which-module': {
        short: 'w',
        type: 'string',
        description: 'A specific module to build, or comma separated list of modules. Modules will only be rebuilt if they also match the types of dependencies being rebuilt (see --types).',
    },
    only: {
        short: 'o',
        type: 'string',
        description: 'Only build specified module, or comma separated list of modules. All others are ignored.',
    },
    'electron-prebuilt-dir': {
        short: 'e',
        type: 'string',
        description: 'The path to the prebuilt electron module',
    },
    'dist-url': {
        short: 'd',
        type: 'string',
        description: 'Custom header tarball URL. Can also be set via the ELECTRON_REBUILD_DIST_URL environment variable.',
    },
    types: {
        short: 't',
        type: 'string',
        description: 'The types of dependencies to rebuild.  Comma separated list of "prod", "dev" and "optional".  Default is "prod,optional"',
    },
    parallel: {
        short: 'p',
        type: 'boolean',
        description: 'Rebuild in parallel, this is enabled by default on macOS and Linux',
    },
    sequential: {
        short: 's',
        type: 'boolean',
        description: 'Rebuild modules sequentially, this is enabled by default on Windows',
    },
    debug: { short: 'b', type: 'boolean', description: 'Build debug version of modules' },
    jobs: {
        short: 'j',
        type: 'string',
        description: "Number of parallel compile jobs node-gyp should run (passed as node-gyp --jobs). Defaults to node-gyp's own default.",
    },
    'prebuild-tag-prefix': {
        type: 'string',
        description: 'GitHub tag prefix passed to prebuild-install. Default is "v"',
    },
    'force-abi': {
        type: 'string',
        description: 'Override the ABI version for the version of Electron you are targeting.  Only use when targeting Nightly releases.',
    },
    'use-electron-clang': {
        type: 'boolean',
        description: 'Use the clang executable that Electron used when building its binary. This will guarantee compiler compatibility',
    },
    'disable-pre-gyp-copy': { type: 'boolean', description: 'Disables the pre-gyp copy step' },
    'build-from-source': {
        type: 'boolean',
        description: 'Skips prebuild download and rebuilds module from source.',
    },
    help: { short: 'h', type: 'boolean', description: 'Show help' },
};
const { values: argv } = parseArgs({ options, allowPositionals: true });
if (argv.help) {
    console.log('Usage: electron-rebuild --version [version] --module-dir [path]\n\nOptions:');
    for (const [name, opt] of Object.entries(options)) {
        const short = 'short' in opt ? `-${opt.short}, ` : '    ';
        console.log(`  ${short}--${name.padEnd(22)} ${opt.description}`);
    }
    process.exit(0);
}
if (process.argv.length === 3 && process.argv[2] === '--version') {
    try {
        console.log('Electron Rebuild Version:', (await import(pathToFileURL(path.resolve(import.meta.dirname, '../../package.json')).toString(), { with: { type: 'json' } })).default.version);
    }
    catch {
        console.log('Electron Rebuild Version:', (await import(pathToFileURL(path.resolve(import.meta.dirname, '../package.json')).toString(), { with: { type: 'json' } })).default.version);
    }
    process.exit(0);
}
const handler = (err) => {
    console.error(styleText('red', '\nAn unhandled error occurred inside electron-rebuild'));
    console.error(styleText('red', `${err.message}\n\n${err.stack}`));
    process.exit(-1);
};
process.on('uncaughtException', handler);
process.on('unhandledRejection', handler);
void (async () => {
    const projectRootPath = await getProjectRootPath(process.cwd());
    const electronModulePath = argv['electron-prebuilt-dir']
        ? path.resolve(process.cwd(), argv['electron-prebuilt-dir'])
        : await locateElectronModule(projectRootPath);
    let electronModuleVersion = argv.version;
    if (!electronModuleVersion) {
        try {
            if (!electronModulePath)
                throw new Error('Prebuilt electron module not found');
            const pkgJson = await import(pathToFileURL(path.join(electronModulePath, 'package.json')).toString(), { with: { type: 'json' } });
            electronModuleVersion = pkgJson.default.version;
        }
        catch {
            throw new Error(`Unable to find electron's version number, either install it or specify an explicit version`);
        }
    }
    let rootDirectory = argv['module-dir'];
    if (!rootDirectory) {
        // NB: We assume here that we're going to rebuild the immediate parent's
        // node modules, which might not always be the case but it's at least a
        // good guess
        rootDirectory = path.resolve(import.meta.dirname, '../../..');
        if (!fs.existsSync(rootDirectory) ||
            !fs.existsSync(path.resolve(rootDirectory, 'package.json'))) {
            // Then we try the CWD
            rootDirectory = process.cwd();
            if (!fs.existsSync(rootDirectory) ||
                !fs.existsSync(path.resolve(rootDirectory, 'package.json'))) {
                throw new Error('Unable to find parent node_modules directory, specify it via --module-dir, E.g. "--module-dir ." for the current directory');
            }
        }
    }
    else {
        rootDirectory = path.resolve(process.cwd(), rootDirectory);
    }
    const forceAbi = argv['force-abi'] ? Number(argv['force-abi']) : undefined;
    if (argv['force-abi'] && Number.isNaN(forceAbi)) {
        throw new Error('force-abi must be a number');
    }
    const jobs = argv.jobs ? Number(argv.jobs) : undefined;
    if (argv.jobs && Number.isNaN(jobs)) {
        throw new Error('jobs must be a number');
    }
    console.error('Searching dependency tree');
    const rebuilder = rebuild({
        buildPath: rootDirectory,
        electronVersion: electronModuleVersion,
        arch: argv.arch || process.arch,
        platform: argv.platform || process.platform,
        extraModules: argv['which-module'] ? argv['which-module'].split(',') : [],
        onlyModules: argv.only ? argv.only.split(',') : null,
        force: argv.force,
        headerURL: argv['dist-url'] || process.env.ELECTRON_REBUILD_DIST_URL,
        types: argv.types ? argv.types.split(',') : ['prod', 'optional'],
        mode: argv.parallel ? 'parallel' : argv.sequential ? 'sequential' : undefined,
        debug: argv.debug,
        prebuildTagPrefix: argv['prebuild-tag-prefix'] ?? 'v',
        forceABI: forceAbi,
        useElectronClang: !!argv['use-electron-clang'],
        disablePreGypCopy: !!argv['disable-pre-gyp-copy'],
        projectRootPath,
        buildFromSource: !!argv['build-from-source'],
        jobs,
    });
    const lifecycle = rebuilder.lifecycle;
    lifecycle.on('modules-found', (moduleNames) => {
        if (moduleNames.length > 0) {
            console.error(`Building modules: ${moduleNames.join(', ')}`);
        }
        else {
            console.error('No native modules found');
        }
    });
    try {
        await rebuilder;
    }
    catch (err) {
        console.error(styleText('red', '✖ Rebuild Failed'));
        throw err;
    }
    console.error(styleText('green', '✔ Rebuild Complete'));
})();
//# sourceMappingURL=cli.js.map
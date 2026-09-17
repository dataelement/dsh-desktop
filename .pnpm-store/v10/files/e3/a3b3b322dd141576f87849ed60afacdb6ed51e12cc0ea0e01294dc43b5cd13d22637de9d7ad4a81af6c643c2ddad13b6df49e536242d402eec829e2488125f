#!/usr/bin/env node
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const minimist = require("minimist");
const path = require("path");
const _1 = require(".");
const config_1 = require("./config");
const constants_1 = require("./constants");
const mode = process.argv[2];
const readHelpText = `electron-fuses read --app [path-to-app]`;
const writeHelpText = `electron-fuses write --app [path-to-app] <...key=on/off>`;
if (mode !== 'read' && mode !== 'write') {
    console.error('Invalid mode, check the usage below:');
    console.info(readHelpText);
    console.info(writeHelpText);
    process.exit(0);
}
function stringForState(state) {
    switch (state) {
        case constants_1.FuseState.ENABLE:
            return chalk.green('Enabled');
        case constants_1.FuseState.DISABLE:
            return chalk.red('Disabled');
        case constants_1.FuseState.INHERIT:
            return chalk.yellow('Inherited');
        case constants_1.FuseState.REMOVED:
            return chalk.strikethrough(chalk.red('Removed'));
    }
}
if (mode === 'read') {
    const argv = minimist(process.argv.slice(3), {
        string: ['app'],
        boolean: ['help'],
    });
    if (argv.help) {
        console.log(readHelpText);
        process.exit(0);
    }
    if (!argv.app) {
        console.error('--app argument is required');
        process.exit(1);
    }
    console.log('Analyzing app:', chalk.cyan(path.basename(argv.app)));
    (0, _1.getCurrentFuseWire)(argv.app)
        .then((config) => {
        const { version, resetAdHocDarwinSignature, strictlyRequireAllFuses } = config, rest = __rest(config, ["version", "resetAdHocDarwinSignature", "strictlyRequireAllFuses"]);
        console.log(`Fuse Version: ${chalk.cyan(`v${version}`)}`);
        switch (config.version) {
            case config_1.FuseVersion.V1:
                for (const key of Object.keys(rest)) {
                    console.log(`  ${chalk.yellow(config_1.FuseV1Options[key])} is ${stringForState(rest[key])}`);
                }
                break;
        }
    })
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
else {
    const argv = minimist(process.argv.slice(3), {
        string: ['app'],
        boolean: ['help'],
    });
    if (argv.help) {
        console.log(writeHelpText);
        process.exit(0);
    }
    if (!argv.app) {
        console.error('--app argument is required');
        process.exit(1);
    }
    console.log('Analyzing app:', chalk.cyan(path.basename(argv.app)));
    (0, _1.getCurrentFuseWire)(argv.app)
        .then((config) => {
        const { version, resetAdHocDarwinSignature } = config, rest = __rest(config, ["version", "resetAdHocDarwinSignature"]);
        console.log(`Fuse Version: ${chalk.cyan(`v${version}`)}`);
        const keyPairs = argv._ || [];
        for (const keyPair of keyPairs) {
            const [key, state] = keyPair.split('=');
            if (!key || !state) {
                console.error('Invalid fuse:', keyPair);
                console.error('Must be in the format FuseName=on/off');
                process.exit(1);
            }
            if (state !== 'on' && state !== 'off') {
                console.error('Invalid fuse state:', chalk.yellow(keyPair));
                console.error(`Fuses can only be set to the "${chalk.green('on')}" or "${chalk.red('off')}" state`);
                process.exit(1);
            }
            switch (config.version) {
                case config_1.FuseVersion.V1:
                    const validFuseNames = Object.keys(config_1.FuseV1Options).filter((k) => !/^[0-9]+$/.test(k));
                    if (!validFuseNames.includes(key)) {
                        console.error('Invalid fuse name', chalk.yellow(key));
                        console.error('Expected name to be one of', chalk.yellow(JSON.stringify(validFuseNames)));
                        process.exit(1);
                    }
                    const currentState = config[config_1.FuseV1Options[key]];
                    const newState = state === 'on' ? constants_1.FuseState.ENABLE : constants_1.FuseState.DISABLE;
                    if (currentState === newState) {
                        console.log(`  ${chalk.yellow(key)} is already ${stringForState(currentState)} and will not be changed`);
                    }
                    else {
                        console.log(`  ${chalk.yellow(key)} is ${stringForState(currentState)} and will become ${stringForState(newState)}`);
                    }
                    config[config_1.FuseV1Options[key]] = newState;
                    break;
            }
        }
        console.log('Writing to app:', chalk.cyan(path.basename(argv.app)));
        function adaptConfig(config) {
            const { version, resetAdHocDarwinSignature } = config, rest = __rest(config, ["version", "resetAdHocDarwinSignature"]);
            const fuseConfig = {
                version,
                resetAdHocDarwinSignature,
            };
            for (const key of Object.keys(rest)) {
                fuseConfig[key] = rest[key] === constants_1.FuseState.ENABLE;
            }
            return fuseConfig;
        }
        return (0, _1.flipFuses)(argv.app, adaptConfig(config));
    })
        .then(() => {
        console.log(chalk.green('Fuses written to disk'));
    })
        .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=bin.js.map
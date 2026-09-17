"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.flipFuses = exports.getCurrentFuseWire = void 0;
const cp = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const config_1 = require("./config");
const constants_1 = require("./constants");
__exportStar(require("./config"), exports);
const state = (b) => b === undefined ? constants_1.FuseState.INHERIT : b ? constants_1.FuseState.ENABLE : constants_1.FuseState.DISABLE;
const buildFuseV1Wire = (config, wireLength) => {
    const { version } = config, nonVersionConfig = __rest(config, ["version"]);
    const badFuseOption = Object.keys(nonVersionConfig).find((fuseOption) => parseInt(fuseOption, 10) >= wireLength);
    if (badFuseOption !== undefined) {
        throw new Error(`Trying to configure ${config_1.FuseV1Options[badFuseOption]} but the fuse wire in this version of Electron is not long enough`);
    }
    return [
        state(config[config_1.FuseV1Options.RunAsNode]),
        state(config[config_1.FuseV1Options.EnableCookieEncryption]),
        state(config[config_1.FuseV1Options.EnableNodeOptionsEnvironmentVariable]),
        state(config[config_1.FuseV1Options.EnableNodeCliInspectArguments]),
        state(config[config_1.FuseV1Options.EnableEmbeddedAsarIntegrityValidation]),
        state(config[config_1.FuseV1Options.OnlyLoadAppFromAsar]),
        state(config[config_1.FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]),
        state(config[config_1.FuseV1Options.GrantFileProtocolExtraPrivileges]),
    ];
};
const pathToFuseFile = (pathToElectron) => {
    if (pathToElectron.endsWith('.app')) {
        return path.resolve(pathToElectron, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Electron Framework');
    }
    if (pathToElectron.includes('.app')) {
        return path.resolve(pathToElectron, '..', '..', 'Frameworks', 'Electron Framework.framework', 'Electron Framework');
    }
    return pathToElectron;
};
const setFuseWire = async (pathToElectron, fuseVersion, strictlyRequireAllFuses, fuseWireBuilder, fuseNamer) => {
    const fuseFilePath = pathToFuseFile(pathToElectron);
    const electron = await fs.readFile(fuseFilePath);
    const firstSentinel = electron.indexOf(constants_1.SENTINEL);
    const lastSentinel = electron.lastIndexOf(constants_1.SENTINEL);
    // If the last sentinel is different to the first sentinel we are probably in a universal build
    // We should flip the fuses in both sentinels to affect both slices of the universal binary
    const sentinels = firstSentinel === lastSentinel ? [firstSentinel] : [firstSentinel, lastSentinel];
    for (const indexOfSentinel of sentinels) {
        if (indexOfSentinel === -1) {
            throw new Error('Could not find sentinel in the provided Electron binary, fuses are only supported in Electron 12 and higher');
        }
        const fuseWirePosition = indexOfSentinel + constants_1.SENTINEL.length;
        const fuseWireVersion = electron[fuseWirePosition];
        if (parseInt(fuseVersion, 10) !== fuseWireVersion) {
            throw new Error(`Provided fuse wire version "${parseInt(fuseVersion, 10)}" does not match watch was found in the binary "${fuseWireVersion}".  You should update your usage of @electron/fuses.`);
        }
        const fuseWireLength = electron[fuseWirePosition + 1];
        const wire = fuseWireBuilder(fuseWireLength).slice(0, fuseWireLength);
        if (wire.length < fuseWireLength && strictlyRequireAllFuses) {
            throw new Error(`strictlyRequireAllFuses: The fuse wire in the Electron binary has ${fuseWireLength} fuses but you only provided a config for ${wire.length} fuses, you may need to update @electron/fuses or provide additional fuse settings`);
        }
        for (let i = 0; i < wire.length; i++) {
            const idx = fuseWirePosition + 2 + i;
            const currentState = electron[idx];
            const newState = wire[i];
            if (currentState === constants_1.FuseState.REMOVED && newState !== constants_1.FuseState.INHERIT) {
                console.warn(`Overriding fuse "${fuseNamer(i)}" that has been marked as removed, setting this fuse is a noop`);
            }
            if (newState === constants_1.FuseState.INHERIT) {
                if (strictlyRequireAllFuses) {
                    throw new Error(`strictlyRequireAllFuses: Missing explicit configuration for fuse ${fuseNamer(i)}`);
                }
                continue;
            }
            electron[idx] = newState;
        }
    }
    await fs.writeFile(fuseFilePath, electron);
    return sentinels.length;
};
const getCurrentFuseWire = async (pathToElectron) => {
    const fuseFilePath = pathToFuseFile(pathToElectron);
    const electron = await fs.readFile(fuseFilePath);
    const fuseWirePosition = electron.indexOf(constants_1.SENTINEL) + constants_1.SENTINEL.length;
    if (fuseWirePosition - constants_1.SENTINEL.length === -1) {
        throw new Error('Could not find sentinel in the provided Electron binary, fuses are only supported in Electron 12 and higher');
    }
    const fuseWireVersion = electron[fuseWirePosition];
    const fuseWireLength = electron[fuseWirePosition + 1];
    const fuseConfig = {
        version: `${fuseWireVersion}`,
    };
    for (let i = 0; i < fuseWireLength; i++) {
        const idx = fuseWirePosition + 2 + i;
        const currentState = electron[idx];
        switch (fuseConfig.version) {
            case config_1.FuseVersion.V1:
                fuseConfig[i] = currentState;
                break;
        }
    }
    return fuseConfig;
};
exports.getCurrentFuseWire = getCurrentFuseWire;
const flipFuses = async (pathToElectron, fuseConfig) => {
    let numSentinels;
    switch (fuseConfig.version) {
        case config_1.FuseVersion.V1:
            numSentinels = await setFuseWire(pathToElectron, fuseConfig.version, fuseConfig.strictlyRequireAllFuses || false, buildFuseV1Wire.bind(null, fuseConfig), (i) => config_1.FuseV1Options[i]);
            break;
        default:
            throw new Error(`Unsupported fuse version number: ${fuseConfig.version}`);
    }
    // Reset the ad-hoc signature on macOS, should only be done for arm64 apps
    if (fuseConfig.resetAdHocDarwinSignature && pathToElectron.includes('.app')) {
        const pathToApp = `${pathToElectron.split('.app')[0]}.app`;
        const result = cp.spawnSync('codesign', [
            '--sign',
            '-',
            '--force',
            '--preserve-metadata=entitlements,requirements,flags,runtime',
            '--deep',
            pathToApp,
        ]);
        if (result.status !== 0) {
            console.error(result.stderr.toString());
            throw new Error(`Ad-hoc codesign failed with status: ${result.status}`);
        }
    }
    return numSentinels;
};
exports.flipFuses = flipFuses;
//# sourceMappingURL=index.js.map
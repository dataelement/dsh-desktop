"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifactVersion = exports.getArtifactRemoteURL = exports.getArtifactFileName = void 0;
const utils_1 = require("./utils");
const BASE_URL = 'https://github.com/electron/electron/releases/download/';
const NIGHTLY_BASE_URL = 'https://github.com/electron/nightlies/releases/download/';
function getArtifactFileName(details) {
    (0, utils_1.ensureIsTruthyString)(details, 'artifactName');
    if (details.isGeneric) {
        return details.artifactName;
    }
    (0, utils_1.ensureIsTruthyString)(details, 'arch');
    (0, utils_1.ensureIsTruthyString)(details, 'platform');
    (0, utils_1.ensureIsTruthyString)(details, 'version');
    return `${[
        details.artifactName,
        details.version,
        details.platform,
        details.arch,
        ...(details.artifactSuffix ? [details.artifactSuffix] : []),
    ].join('-')}.zip`;
}
exports.getArtifactFileName = getArtifactFileName;
function mirrorVar(name, options, defaultValue) {
    // Convert camelCase to camel_case for env var reading
    const snakeName = name.replace(/([a-z])([A-Z])/g, (_, a, b) => `${a}_${b}`).toLowerCase();
    return (
    // .npmrc
    process.env[`npm_config_electron_${name.toLowerCase()}`] ||
        process.env[`NPM_CONFIG_ELECTRON_${snakeName.toUpperCase()}`] ||
        process.env[`npm_config_electron_${snakeName}`] ||
        // package.json
        process.env[`npm_package_config_electron_${name}`] ||
        process.env[`npm_package_config_electron_${snakeName.toLowerCase()}`] ||
        // env
        process.env[`ELECTRON_${snakeName.toUpperCase()}`] ||
        options[name] ||
        defaultValue);
}
async function getArtifactRemoteURL(details) {
    const opts = details.mirrorOptions || {};
    let base = mirrorVar('mirror', opts, BASE_URL);
    if (details.version.includes('nightly')) {
        const nightlyDeprecated = mirrorVar('nightly_mirror', opts, '');
        if (nightlyDeprecated) {
            base = nightlyDeprecated;
            console.warn(`nightly_mirror is deprecated, please use nightlyMirror`);
        }
        else {
            base = mirrorVar('nightlyMirror', opts, NIGHTLY_BASE_URL);
        }
    }
    const path = mirrorVar('customDir', opts, details.version).replace('{{ version }}', details.version.replace(/^v/, ''));
    const file = mirrorVar('customFilename', opts, getArtifactFileName(details));
    // Allow customized download URL resolution.
    if (opts.resolveAssetURL) {
        const url = await opts.resolveAssetURL(details);
        return url;
    }
    return `${base}${path}/${file}`;
}
exports.getArtifactRemoteURL = getArtifactRemoteURL;
function getArtifactVersion(details) {
    return (0, utils_1.normalizeVersion)(mirrorVar('customVersion', details.mirrorOptions || {}, details.version));
}
exports.getArtifactVersion = getArtifactVersion;
//# sourceMappingURL=artifact-utils.js.map
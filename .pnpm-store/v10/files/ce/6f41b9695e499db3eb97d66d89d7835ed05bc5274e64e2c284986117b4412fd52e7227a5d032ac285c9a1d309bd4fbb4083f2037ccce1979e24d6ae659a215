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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preAutoEntitlements = void 0;
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const plist = __importStar(require("plist"));
const util_1 = require("./util");
const preAuthMemo = new Map();
/**
 * This function returns a promise completing the entitlements automation: The
 * process includes checking in `Info.plist` for `ElectronTeamID` or setting
 * parsed value from identity, and checking in entitlements file for
 * `com.apple.security.application-groups` or inserting new into array. A
 * temporary entitlements file may be created to replace the input for any
 * changes introduced.
 */
async function preAutoEntitlements(opts, perFileOpts, computed) {
    var _a;
    if (!perFileOpts.entitlements)
        return;
    const memoKey = [opts.app, perFileOpts.entitlements].join('---');
    if (preAuthMemo.has(memoKey))
        return preAuthMemo.get(memoKey);
    // If entitlements file not provided, default will be used. Fixes #41
    const appInfoPath = path.join((0, util_1.getAppContentsPath)(opts), 'Info.plist');
    (0, util_1.debugLog)('Automating entitlement app group...', '\n', '> Info.plist:', appInfoPath, '\n');
    let entitlements;
    if (typeof perFileOpts.entitlements === 'string') {
        const entitlementsContents = await fs.readFile(perFileOpts.entitlements, 'utf8');
        entitlements = plist.parse(entitlementsContents);
    }
    else {
        entitlements = perFileOpts.entitlements.reduce((dict, entitlementKey) => (Object.assign(Object.assign({}, dict), { [entitlementKey]: true })), {});
    }
    if (!entitlements['com.apple.security.app-sandbox']) {
        // Only automate when app sandbox enabled by user
        return;
    }
    const appInfoContents = await fs.readFile(appInfoPath, 'utf8');
    const appInfo = plist.parse(appInfoContents);
    // Use ElectronTeamID in Info.plist if already specified
    if (appInfo.ElectronTeamID) {
        (0, util_1.debugLog)('`ElectronTeamID` found in `Info.plist`: ' + appInfo.ElectronTeamID);
    }
    else {
        // The team identifier in signing identity should not be trusted
        if (computed.provisioningProfile) {
            appInfo.ElectronTeamID =
                computed.provisioningProfile.message.Entitlements['com.apple.developer.team-identifier'];
            (0, util_1.debugLog)('`ElectronTeamID` not found in `Info.plist`, use parsed from provisioning profile: ' +
                appInfo.ElectronTeamID);
        }
        else {
            const teamID = (_a = /^.+\((.+?)\)$/g.exec(computed.identity.name)) === null || _a === void 0 ? void 0 : _a[1];
            if (!teamID) {
                throw new Error(`Could not automatically determine ElectronTeamID from identity: ${computed.identity.name}`);
            }
            appInfo.ElectronTeamID = teamID;
            (0, util_1.debugLog)('`ElectronTeamID` not found in `Info.plist`, use parsed from signing identity: ' +
                appInfo.ElectronTeamID);
        }
        await fs.writeFile(appInfoPath, plist.build(appInfo), 'utf8');
        (0, util_1.debugLog)('`Info.plist` updated:', '\n', '> Info.plist:', appInfoPath);
    }
    const appIdentifier = appInfo.ElectronTeamID + '.' + appInfo.CFBundleIdentifier;
    // Insert application identifier if not exists
    if (entitlements['com.apple.application-identifier']) {
        (0, util_1.debugLog)('`com.apple.application-identifier` found in entitlements file: ' +
            entitlements['com.apple.application-identifier']);
    }
    else {
        (0, util_1.debugLog)('`com.apple.application-identifier` not found in entitlements file, new inserted: ' +
            appIdentifier);
        entitlements['com.apple.application-identifier'] = appIdentifier;
    }
    // Insert developer team identifier if not exists
    if (entitlements['com.apple.developer.team-identifier']) {
        (0, util_1.debugLog)('`com.apple.developer.team-identifier` found in entitlements file: ' +
            entitlements['com.apple.developer.team-identifier']);
    }
    else {
        (0, util_1.debugLog)('`com.apple.developer.team-identifier` not found in entitlements file, new inserted: ' +
            appInfo.ElectronTeamID);
        entitlements['com.apple.developer.team-identifier'] = appInfo.ElectronTeamID;
    }
    // Init entitlements app group key to array if not exists
    if (!entitlements['com.apple.security.application-groups']) {
        entitlements['com.apple.security.application-groups'] = [];
    }
    // Insert app group if not exists
    if (Array.isArray(entitlements['com.apple.security.application-groups']) &&
        entitlements['com.apple.security.application-groups'].indexOf(appIdentifier) === -1) {
        (0, util_1.debugLog)('`com.apple.security.application-groups` not found in entitlements file, new inserted: ' +
            appIdentifier);
        entitlements['com.apple.security.application-groups'].push(appIdentifier);
    }
    else {
        (0, util_1.debugLog)('`com.apple.security.application-groups` found in entitlements file: ' + appIdentifier);
    }
    // Create temporary entitlements file
    const dir = await fs.mkdtemp(path.resolve(os.tmpdir(), 'tmp-entitlements-'));
    const entitlementsPath = path.join(dir, 'entitlements.plist');
    await fs.writeFile(entitlementsPath, plist.build(entitlements), 'utf8');
    (0, util_1.debugLog)('Entitlements file updated:', '\n', '> Entitlements:', entitlementsPath);
    preAuthMemo.set(memoKey, entitlementsPath);
    return entitlementsPath;
}
exports.preAutoEntitlements = preAutoEntitlements;
//# sourceMappingURL=util-entitlements.js.map
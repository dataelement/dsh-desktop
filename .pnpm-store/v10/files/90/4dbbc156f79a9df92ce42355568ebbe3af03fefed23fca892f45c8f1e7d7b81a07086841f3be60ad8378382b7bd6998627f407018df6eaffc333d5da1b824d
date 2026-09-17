"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findIdentities = exports.Identity = void 0;
const util_1 = require("./util");
class Identity {
    constructor(name, hash) {
        this.name = name;
        this.hash = hash;
    }
}
exports.Identity = Identity;
async function findIdentities(keychain, identity) {
    // Only to look for valid identities, excluding those flagged with
    // CSSMERR_TP_CERT_EXPIRED or CSSMERR_TP_NOT_TRUSTED. Fixes #9
    const args = [
        'find-identity',
        '-v'
    ];
    if (keychain) {
        args.push(keychain);
    }
    const result = await (0, util_1.execFileAsync)('security', args);
    const identities = result.split('\n').map(function (line) {
        if (line.indexOf(identity) >= 0) {
            const identityFound = line.substring(line.indexOf('"') + 1, line.lastIndexOf('"'));
            const identityHashFound = line.substring(line.indexOf(')') + 2, line.indexOf('"') - 1);
            (0, util_1.debugLog)('Identity:', '\n', '> Name:', identityFound, '\n', '> Hash:', identityHashFound);
            return new Identity(identityFound, identityHashFound);
        }
        return null;
    });
    return (0, util_1.compactFlattenedList)(identities);
}
exports.findIdentities = findIdentities;
//# sourceMappingURL=util-identities.js.map
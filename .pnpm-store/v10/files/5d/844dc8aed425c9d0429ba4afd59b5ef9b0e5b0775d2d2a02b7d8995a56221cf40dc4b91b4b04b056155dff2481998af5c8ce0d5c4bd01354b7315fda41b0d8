"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLicenseButtonsFile = getLicenseButtonsFile;
const license_1 = require("app-builder-lib/out/util/license");
async function getLicenseButtonsFile(packager) {
    return (0, license_1.getLicenseAssets)((await packager.resourceList).filter(it => {
        const name = it.toLowerCase();
        // noinspection SpellCheckingInspection
        return name.startsWith("licensebuttons_") && (name.endsWith(".json") || name.endsWith(".yml"));
    }), packager);
}
//# sourceMappingURL=licenseButtons.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLicenseToDmg = addLicenseToDmg;
const license_1 = require("app-builder-lib/out/util/license");
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const js_yaml_1 = require("js-yaml");
const licenseButtons_1 = require("./licenseButtons");
async function addLicenseToDmg(packager, explicitLicense) {
    // null = explicitly disabled; skip both explicit and convention paths
    if (explicitLicense === null) {
        return null;
    }
    // Explicit config overrides file-naming convention
    if (explicitLicense !== undefined) {
        return buildExplicitLicenseConfig(packager, explicitLicense);
    }
    // File-naming convention: license_LANG.{rtf,txt,html}
    return buildConventionLicenseConfig(packager);
}
async function buildExplicitLicenseConfig(packager, license) {
    if (typeof license === "string") {
        const resolvedPath = await packager.getResource(license);
        if (resolvedPath == null) {
            throw new builder_util_1.InvalidConfigurationError(`dmg.license file not found: "${license}"`);
        }
        return { "default-language": "en_US", licenses: { en_US: resolvedPath } };
    }
    // Record<langCode, filePath>
    const licenses = {};
    for (const [lang, filePath] of Object.entries(license)) {
        const resolvedPath = await packager.getResource(filePath);
        if (resolvedPath == null) {
            throw new builder_util_1.InvalidConfigurationError(`dmg.license file not found for language "${lang}": "${filePath}"`);
        }
        licenses[lang] = resolvedPath;
    }
    if (Object.keys(licenses).length === 0) {
        return null;
    }
    return {
        "default-language": Object.keys(licenses)[0],
        licenses,
    };
}
async function buildConventionLicenseConfig(packager) {
    var _a;
    const licenseFiles = await (0, license_1.getLicenseFiles)(packager);
    if (licenseFiles.length === 0) {
        return null;
    }
    const licenseButtonFiles = await (0, licenseButtons_1.getLicenseButtonsFile)(packager);
    packager.debugLogger.add("dmg.licenseFiles", licenseFiles);
    packager.debugLogger.add("dmg.licenseButtons", licenseButtonFiles);
    const licenses = {};
    for (const file of licenseFiles) {
        if (licenses[file.langWithRegion] != null) {
            throw new builder_util_1.InvalidConfigurationError(`Multiple license files found for language "${file.langWithRegion}": "${licenses[file.langWithRegion]}" and "${file.file}". Only one license file per language is supported.`);
        }
        licenses[file.langWithRegion] = file.file;
    }
    const result = {
        "default-language": licenseFiles[0].langWithRegion,
        licenses,
    };
    if (licenseButtonFiles.length > 0) {
        const buttons = {};
        for (const button of licenseButtonFiles) {
            const filepath = button.file;
            const raw = filepath.endsWith(".yml") ? (0, js_yaml_1.load)(await (0, fs_extra_1.readFile)(filepath, "utf-8"), { schema: js_yaml_1.CORE_SCHEMA }) : await (0, fs_extra_1.readJson)(filepath);
            const entry = {};
            if (raw.languageName != null) {
                entry.language = raw.languageName;
            }
            if (raw.agree != null) {
                entry.agree = raw.agree;
            }
            if (raw.disagree != null) {
                entry.disagree = raw.disagree;
            }
            if (raw.print != null) {
                entry.print = raw.print;
            }
            if (raw.save != null) {
                entry.save = raw.save;
            }
            // support legacy `description` field as well as `message`
            const msg = (_a = raw.message) !== null && _a !== void 0 ? _a : raw.description;
            if (msg != null) {
                entry.message = msg;
            }
            buttons[button.langWithRegion] = entry;
        }
        result.buttons = buttons;
    }
    return result;
}
//# sourceMappingURL=dmgLicense.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAwsCredentials = resolveAwsCredentials;
const fs = require("fs");
const os = require("os");
const path = require("path");
function parseIniSection(content, sectionName) {
    let inSection = false;
    let found = false;
    const result = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line.startsWith("[")) {
            const name = line.slice(1, line.indexOf("]")).trim();
            inSection = name === sectionName;
            if (inSection) {
                found = true;
            }
        }
        else if (inSection && line && !line.startsWith("#") && !line.startsWith(";")) {
            const eq = line.indexOf("=");
            if (eq > 0) {
                result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
            }
        }
    }
    return found ? result : null;
}
/**
 * Resolves AWS credentials using the standard provider chain:
 *   1. Environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *   2. Shared credentials file (~/.aws/credentials, respects AWS_PROFILE)
 *
 * Returns undefined when no credentials are found — callers should let aws4 sign
 * with anonymous credentials or throw a descriptive error as appropriate.
 */
function resolveAwsCredentials() {
    var _a;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
        };
    }
    try {
        const profile = (_a = process.env.AWS_PROFILE) !== null && _a !== void 0 ? _a : "default";
        const credsPath = path.join(os.homedir(), ".aws", "credentials");
        const raw = fs.readFileSync(credsPath, "utf8");
        const section = parseIniSection(raw, profile);
        if ((section === null || section === void 0 ? void 0 : section.aws_access_key_id) && (section === null || section === void 0 ? void 0 : section.aws_secret_access_key)) {
            return {
                accessKeyId: section.aws_access_key_id,
                secretAccessKey: section.aws_secret_access_key,
                sessionToken: section.aws_session_token || undefined,
            };
        }
    }
    catch {
        // file absent or unreadable — fall through
    }
    return undefined;
}
//# sourceMappingURL=awsCredentials.js.map
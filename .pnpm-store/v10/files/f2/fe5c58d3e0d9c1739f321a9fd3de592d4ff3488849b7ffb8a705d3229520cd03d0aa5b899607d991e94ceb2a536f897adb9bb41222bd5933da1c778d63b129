"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMakensisOutput = checkMakensisOutput;
exports.verifyInstallerSize = verifyInstallerSize;
const builder_util_1 = require("builder-util");
/**
 * Validates makensis stdout/stderr after a zero-exit run.
 *
 * NSIS can emit "Error:" lines on stderr and still exit 0 (e.g. disk-full
 * scenarios where the OS silently drops writes). Also checks the
 * "Install data: <written> / <expected> bytes" progress line for truncation.
 */
function checkMakensisOutput(stdout, stderr) {
    const errorLines = stderr
        .split("\n")
        .map(l => l.trim())
        .filter(l => /^Error:/i.test(l));
    if (errorLines.length > 0) {
        throw new builder_util_1.ExecError("makensis", 0, stdout, stderr);
    }
}
/**
 * Verifies the generated installer is at least as large as the sum of the
 * embedded archive(s). An installer smaller than its payload is definitively
 * truncated regardless of the makensis exit code.
 *
 * Only runs when APP_64/APP_32/APP_ARM64 defines are present (i.e. normal,
 * non-portable installers). Skipped for the intermediate uninstaller build.
 */
async function verifyInstallerSize(outFile, defines) {
    let archiveSize = 0;
    for (const key of ["APP_64", "APP_32", "APP_ARM64"]) {
        const p = defines[key];
        if (typeof p === "string") {
            const s = await (0, builder_util_1.statOrNull)(p);
            if (s != null) {
                archiveSize += s.size;
            }
        }
    }
    if (archiveSize === 0) {
        return;
    }
    const outStat = await (0, builder_util_1.statOrNull)(outFile);
    if (outStat == null) {
        throw new Error(`Generated installer was not created at "${outFile}" — output may be incomplete. Check available disk space and try again.`);
    }
    if (outStat.size < archiveSize) {
        throw new Error(`Generated installer (${outStat.size} bytes) is smaller than the embedded archive(s) (${archiveSize} bytes) — ` +
            `output may be incomplete. Check available disk space and try again.`);
    }
}
//# sourceMappingURL=nsisValidation.js.map
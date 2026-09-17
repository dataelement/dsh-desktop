"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tar = tar;
exports.compute7zCompressArgs = compute7zCompressArgs;
exports.archive = archive;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const tar_1 = require("tar");
const linux_1 = require("../toolsets/linux");
const _7zip_1 = require("../toolsets/7zip");
const ALLOWED_7Z_FILTERS = new Set(["BCJ", "BCJ2", "ARM", "ARMT", "IA64", "PPC", "SPARC", "DELTA"]);
function validateCompressionLevel(level) {
    if (!/^[0-9]$/.test(level)) {
        throw new Error(`ELECTRON_BUILDER_COMPRESSION_LEVEL must be a single digit 0-9, got: "${level}"`);
    }
}
/** @internal */
async function tar({ compression, format, outFile, dirToArchive, isMacApp, tempDirManager }) {
    const tarFile = await tempDirManager.getTempFile({ suffix: ".tar" });
    const tarArgs = {
        file: tarFile,
        portable: true,
        cwd: dirToArchive,
        prefix: path.basename(outFile, `.${format}`),
    };
    let tarDirectory = ".";
    if (isMacApp) {
        delete tarArgs.prefix;
        tarArgs.cwd = path.dirname(dirToArchive);
        tarDirectory = path.basename(dirToArchive);
    }
    await Promise.all([
        (0, tar_1.create)(tarArgs, [tarDirectory]),
        // remove file before - 7z doesn't overwrite file, but update
        (0, builder_util_1.unlinkIfExists)(outFile),
    ]);
    if (format === "tar.lz") {
        const lzipPath = process.platform === "darwin" ? (await (0, linux_1.getLinuxToolsMacToolset)()).lzip : "lzip";
        await (0, builder_util_1.exec)(lzipPath, [compression === "store" ? "-1" : "-9", "--keep" /* keep (don't delete) input files */, tarFile]);
        // lzip creates the output file in the same directory as the input with a .lz suffix
        await (0, fs_extra_1.move)(`${tarFile}.lz`, outFile);
        return;
    }
    const compressFormat = format === "tar.xz" ? "xz" : format === "tar.bz2" ? "bzip2" : "gzip";
    const args = compute7zCompressArgs(compressFormat, { isRegularFile: true, method: "DEFAULT", compression });
    args.push(outFile, tarFile);
    await (0, builder_util_1.exec)(await (0, _7zip_1.getPath7za)(), args, { cwd: path.dirname(dirToArchive) }, builder_util_1.debug7z.enabled);
}
function compute7zCompressArgs(format, options = {}) {
    let storeOnly = options.compression === "store";
    const args = debug7zArgs("a");
    const compressionLevel = process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL;
    if (compressionLevel != null) {
        validateCompressionLevel(compressionLevel);
        storeOnly = false; // env var overrides "store" config
        args.push(`-mx=${compressionLevel}`);
    }
    else if (storeOnly) {
        // -mx=0 is the universal "no compression" flag across all formats (zip, 7z, gzip, xz, bzip2).
        // -mm=Copy would only be valid for zip/7z and causes E_INVALIDARG on xz/gzip/bzip2.
        args.push("-mx=0");
    }
    else {
        const isZip = format === "zip";
        // ZIP uses level 7 by default; everything else (7z, gzip, xz, bzip2) uses level 9
        args.push("-mx=" + (isZip && options.compression !== "maximum" ? "7" : "9"));
        if (isZip && options.compression === "maximum") {
            // http://superuser.com/a/742034
            args.push("-mfb=258", "-mpass=15");
        }
    }
    if (options.dictSize != null) {
        args.push(`-md=${options.dictSize}m`);
    }
    // Disable NTFS timestamps for reproducible archives
    if (!options.isRegularFile) {
        args.push("-mtc=off");
    }
    if (format === "7z" || format.endsWith(".7z")) {
        if (options.solid === false) {
            args.push("-ms=off");
        }
        if (options.isArchiveHeaderCompressed === false) {
            args.push("-mhc=off");
        }
        const sevenZFilter = process.env.ELECTRON_BUILDER_7Z_FILTER;
        if (sevenZFilter) {
            if (!ALLOWED_7Z_FILTERS.has(sevenZFilter.toUpperCase())) {
                throw new Error(`ELECTRON_BUILDER_7Z_FILTER must be one of: ${[...ALLOWED_7Z_FILTERS].join(", ")}`);
            }
            args.push(`-mf=${sevenZFilter}`);
        }
        args.push("-mtm=off", "-mta=off");
    }
    if (options.method != null && options.method !== "DEFAULT") {
        args.push(`-mm=${options.method}`);
    }
    else if (format === "zip") {
        // -mm is only set explicitly for zip (Deflate/Copy) and includes the UTF-8 flag.
        // For all other formats the codec is implicit from the output file extension.
        args.push(`-mm=${storeOnly ? "Copy" : "Deflate"}`);
        args.push("-mcu");
    }
    return args;
}
// 7z is very fast, so, use ultra compression
/** @internal */
async function archive(format, outFile, dirToArchive, options = {}) {
    const outFileStat = await (0, builder_util_1.statOrNull)(outFile);
    const dirStat = await (0, builder_util_1.statOrNull)(dirToArchive);
    if (outFileStat && dirStat && outFileStat.mtime > dirStat.mtime) {
        builder_util_1.log.info({ reason: "Archive file is up to date", outFile }, `skipped archiving`);
        return outFile;
    }
    // On macOS, use native `zip` when symlink preservation is required (e.g. .framework bundles).
    // 7zip dereferences symlinks, corrupting .framework structure and breaking codesign.
    // Only opt in via preserveSymlinks — Windows zip targets built on macOS still use 7z
    // so that the UTF-8 bit (-mcu) is set correctly in the zip header.
    const use7z = !(process.platform === "darwin" && format === "zip" && options.preserveSymlinks);
    if (use7z) {
        const args = compute7zCompressArgs(format, options);
        await (0, builder_util_1.unlinkIfExists)(outFile);
        args.push(outFile, options.withoutDir ? "." : path.basename(dirToArchive));
        if (options.excluded != null) {
            for (const mask of options.excluded) {
                if (mask.includes("..")) {
                    throw new Error(`Excluded archive pattern contains path traversal sequence: "${mask}"`);
                }
                args.push(`-xr!${mask}`);
            }
        }
        try {
            await (0, builder_util_1.exec)(await (0, _7zip_1.getPath7za)(), args, { cwd: options.withoutDir ? dirToArchive : path.dirname(dirToArchive) }, builder_util_1.debug7z.enabled);
        }
        catch (e) {
            if (e.code === "ENOENT" && !(await (0, builder_util_1.exists)(dirToArchive))) {
                throw new Error(`Cannot create archive: "${dirToArchive}" doesn't exist`);
            }
            else {
                throw e;
            }
        }
    }
    else {
        // macOS native zip: -y preserves symlinks (required for .framework bundles)
        const args = ["-q", "-r", "-y"];
        if (builder_util_1.debug7z.enabled) {
            args.push("-v");
        }
        if (options.compression === "store") {
            args.push("-0");
        }
        else {
            args.push(options.compression === "maximum" ? "-9" : "-7");
        }
        await (0, builder_util_1.unlinkIfExists)(outFile);
        args.push(outFile, options.withoutDir ? "." : path.basename(dirToArchive));
        if (options.excluded != null) {
            for (const mask of options.excluded) {
                if (mask.includes("..")) {
                    throw new Error(`Excluded archive pattern contains path traversal sequence: "${mask}"`);
                }
                args.push(`-x${mask}`);
            }
        }
        await (0, builder_util_1.exec)("zip", args, { cwd: options.withoutDir ? dirToArchive : path.dirname(dirToArchive) }, builder_util_1.debug7z.enabled);
    }
    return outFile;
}
function debug7zArgs(command) {
    const args = [command, "-bd"];
    if (builder_util_1.debug7z.enabled) {
        args.push("-bb");
    }
    return args;
}
//# sourceMappingURL=archive.js.map
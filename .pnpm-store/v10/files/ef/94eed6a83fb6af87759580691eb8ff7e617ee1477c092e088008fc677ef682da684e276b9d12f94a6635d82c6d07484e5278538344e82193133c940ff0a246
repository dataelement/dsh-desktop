"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUniversalMachO = exports.mergeASARs = exports.generateAsarIntegrity = exports.detectAsarMode = exports.AsarMode = void 0;
const asar_1 = __importDefault(require("@electron/asar"));
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const minimatch_1 = require("minimatch");
const os_1 = __importDefault(require("os"));
const debug_1 = require("./debug");
const LIPO = 'lipo';
var AsarMode;
(function (AsarMode) {
    AsarMode[AsarMode["NO_ASAR"] = 0] = "NO_ASAR";
    AsarMode[AsarMode["HAS_ASAR"] = 1] = "HAS_ASAR";
})(AsarMode || (exports.AsarMode = AsarMode = {}));
// See: https://github.com/apple-opensource-mirror/llvmCore/blob/0c60489d96c87140db9a6a14c6e82b15f5e5d252/include/llvm/Object/MachOFormat.h#L108-L112
const MACHO_MAGIC = new Set([
    // 32-bit Mach-O
    0xfeedface, 0xcefaedfe,
    // 64-bit Mach-O
    0xfeedfacf, 0xcffaedfe,
]);
const MACHO_UNIVERSAL_MAGIC = new Set([
    // universal
    0xcafebabe, 0xbebafeca,
]);
const detectAsarMode = async (appPath) => {
    (0, debug_1.d)('checking asar mode of', appPath);
    const asarPath = path_1.default.resolve(appPath, 'Contents', 'Resources', 'app.asar');
    if (!(await fs_extra_1.default.pathExists(asarPath))) {
        (0, debug_1.d)('determined no asar');
        return AsarMode.NO_ASAR;
    }
    (0, debug_1.d)('determined has asar');
    return AsarMode.HAS_ASAR;
};
exports.detectAsarMode = detectAsarMode;
const generateAsarIntegrity = (asarPath) => {
    return {
        algorithm: 'SHA256',
        hash: crypto_1.default
            .createHash('SHA256')
            .update(asar_1.default.getRawHeader(asarPath).headerString)
            .digest('hex'),
    };
};
exports.generateAsarIntegrity = generateAsarIntegrity;
function toRelativePath(file) {
    return file.replace(/^\//, '');
}
function isDirectory(a, file) {
    return Boolean('files' in asar_1.default.statFile(a, file));
}
function checkSingleArch(archive, file, allowList) {
    if (allowList === undefined || !(0, minimatch_1.minimatch)(file, allowList, { matchBase: true })) {
        throw new Error(`Detected unique file "${file}" in "${archive}" not covered by ` +
            `allowList rule: "${allowList}"`);
    }
}
const mergeASARs = async ({ x64AsarPath, arm64AsarPath, outputAsarPath, singleArchFiles, }) => {
    (0, debug_1.d)(`merging ${x64AsarPath} and ${arm64AsarPath}`);
    const x64Files = new Set(asar_1.default.listPackage(x64AsarPath, { isPack: false }).map(toRelativePath));
    const arm64Files = new Set(asar_1.default.listPackage(arm64AsarPath, { isPack: false }).map(toRelativePath));
    //
    // Build set of unpacked directories and files
    //
    const unpackedFiles = new Set();
    function buildUnpacked(a, fileList) {
        for (const file of fileList) {
            const stat = asar_1.default.statFile(a, file);
            if (!('unpacked' in stat) || !stat.unpacked) {
                continue;
            }
            if ('files' in stat) {
                continue;
            }
            unpackedFiles.add(file);
        }
    }
    buildUnpacked(x64AsarPath, x64Files);
    buildUnpacked(arm64AsarPath, arm64Files);
    //
    // Build list of files/directories unique to each asar
    //
    for (const file of x64Files) {
        if (!arm64Files.has(file)) {
            checkSingleArch(x64AsarPath, file, singleArchFiles);
        }
    }
    const arm64Unique = [];
    for (const file of arm64Files) {
        if (!x64Files.has(file)) {
            checkSingleArch(arm64AsarPath, file, singleArchFiles);
            arm64Unique.push(file);
        }
    }
    //
    // Find common bindings with different content
    //
    const commonBindings = [];
    for (const file of x64Files) {
        if (!arm64Files.has(file)) {
            continue;
        }
        // Skip directories
        if (isDirectory(x64AsarPath, file)) {
            continue;
        }
        const x64Content = asar_1.default.extractFile(x64AsarPath, file);
        const arm64Content = asar_1.default.extractFile(arm64AsarPath, file);
        // Skip file if the same content
        if (x64Content.compare(arm64Content) === 0) {
            continue;
        }
        // Skip universal Mach-O files.
        if ((0, exports.isUniversalMachO)(x64Content)) {
            continue;
        }
        if (!MACHO_MAGIC.has(x64Content.readUInt32LE(0))) {
            throw new Error(`Can't reconcile two non-macho files ${file}`);
        }
        commonBindings.push(file);
    }
    //
    // Extract both
    //
    const x64Dir = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'x64-'));
    const arm64Dir = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'arm64-'));
    try {
        (0, debug_1.d)(`extracting ${x64AsarPath} to ${x64Dir}`);
        asar_1.default.extractAll(x64AsarPath, x64Dir);
        (0, debug_1.d)(`extracting ${arm64AsarPath} to ${arm64Dir}`);
        asar_1.default.extractAll(arm64AsarPath, arm64Dir);
        for (const file of arm64Unique) {
            const source = path_1.default.resolve(arm64Dir, file);
            const destination = path_1.default.resolve(x64Dir, file);
            if (isDirectory(arm64AsarPath, file)) {
                (0, debug_1.d)(`creating unique directory: ${file}`);
                await fs_extra_1.default.mkdirp(destination);
                continue;
            }
            (0, debug_1.d)(`xopying unique file: ${file}`);
            await fs_extra_1.default.mkdirp(path_1.default.dirname(destination));
            await fs_extra_1.default.copy(source, destination);
        }
        for (const binding of commonBindings) {
            const source = await fs_extra_1.default.realpath(path_1.default.resolve(arm64Dir, binding));
            const destination = await fs_extra_1.default.realpath(path_1.default.resolve(x64Dir, binding));
            (0, debug_1.d)(`merging binding: ${binding}`);
            (0, child_process_1.execFileSync)(LIPO, [source, destination, '-create', '-output', destination]);
        }
        (0, debug_1.d)(`creating archive at ${outputAsarPath}`);
        const resolvedUnpack = Array.from(unpackedFiles).map((file) => path_1.default.join(x64Dir, file));
        let unpack;
        if (resolvedUnpack.length > 1) {
            unpack = `{${resolvedUnpack.join(',')}}`;
        }
        else if (resolvedUnpack.length === 1) {
            unpack = resolvedUnpack[0];
        }
        await asar_1.default.createPackageWithOptions(x64Dir, outputAsarPath, {
            unpack,
        });
        (0, debug_1.d)('done merging');
    }
    finally {
        await Promise.all([fs_extra_1.default.remove(x64Dir), fs_extra_1.default.remove(arm64Dir)]);
    }
};
exports.mergeASARs = mergeASARs;
const isUniversalMachO = (fileContent) => {
    return MACHO_UNIVERSAL_MAGIC.has(fileContent.readUInt32LE(0));
};
exports.isUniversalMachO = isUniversalMachO;
//# sourceMappingURL=asar-utils.js.map
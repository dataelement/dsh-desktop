"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIcon = convertIcon;
exports.getPngSize = getPngSize;
exports.buildSourceCandidates = buildSourceCandidates;
const promises_1 = require("fs/promises");
const path = require("path");
const icons_1 = require("../toolsets/icons");
class IconConversionError extends Error {
    constructor(message, errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.code = errorCode;
    }
}
async function convertIcon({ sources, fallbackSources, roots, format, outDir }) {
    const candidates = buildSourceCandidates(sources, format);
    let icons = await doConvertIcon(candidates, roots, format, outDir);
    let isFallback = false;
    if (icons == null) {
        const fallbackCandidates = buildSourceCandidates(fallbackSources, format);
        icons = await doConvertIcon(fallbackCandidates, roots, format, outDir);
        isFallback = true;
    }
    return { icons: icons !== null && icons !== void 0 ? icons : [], isFallback };
}
// ─── PNG dimension reader ─────────────────────────────────────────────────────
// Reads width/height from the PNG IHDR chunk at a fixed offset (no dependencies).
async function getPngSize(filePath) {
    const buf = await (0, promises_1.readFile)(filePath);
    // PNG signature = 8 bytes, IHDR chunk header = 8 bytes → width at 16, height at 20
    if (buf.length < 24) {
        return { width: 0, height: 0 };
    }
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
// ─── ICO header parser ────────────────────────────────────────────────────────
async function getIcoMaxSize(filePath) {
    const buf = await (0, promises_1.readFile)(filePath);
    if (buf.length < 6 || buf[0] !== 0 || buf[1] !== 0 || buf[2] !== 1 || buf[3] !== 0) {
        return null;
    }
    const count = buf.readUInt16LE(4);
    let max = 0;
    for (let i = 0; i < count; i++) {
        const off = 6 + i * 16;
        if (off + 2 > buf.length) {
            break;
        }
        const w = buf[off] || 256;
        const h = buf[off + 1] || 256;
        if (w > max) {
            max = w;
        }
        if (h > max) {
            max = h;
        }
    }
    return max;
}
// ─── Set output remapper ──────────────────────────────────────────────────────
// CLI outputs NxN.png; remap to icon_NxN.png to preserve existing naming convention.
async function remapSetOutput(outDir) {
    const entries = await (0, promises_1.readdir)(outDir);
    const result = [];
    for (const name of entries) {
        const match = name.match(/^(\d+)x\d+\.png$/);
        if (!match) {
            continue;
        }
        const size = parseInt(match[1], 10);
        const oldPath = path.join(outDir, name);
        const newPath = path.join(outDir, `icon_${size}x${size}.png`);
        await (0, promises_1.rename)(oldPath, newPath);
        result.push({ file: newPath, size });
    }
    return result.sort((a, b) => a.size - b.size);
}
// ─── CLI output collector ─────────────────────────────────────────────────────
async function collectCliOutput(outDir, format, sourceMaxSize = 0) {
    if (format === "icns") {
        return [{ file: path.join(outDir, "icon.icns"), size: sourceMaxSize }];
    }
    if (format === "ico") {
        const icoFile = path.join(outDir, "icon.ico");
        const size = await getIcoMaxSize(icoFile);
        return [{ file: icoFile, size: size !== null && size !== void 0 ? size : sourceMaxSize }];
    }
    return remapSetOutput(outDir);
}
// ─── File resolution (matches go fileResolver.go + icon-converter.go) ────────
function imageHasExtension(name, format) {
    return name.endsWith("." + format) || name.endsWith(".png") || name.endsWith(".ico") || name.endsWith(".svg") || name.endsWith(".icns");
}
function buildSourceCandidates(sources, format) {
    const result = [];
    for (const src of sources) {
        if (imageHasExtension(src, format)) {
            result.push(src);
        }
        else {
            if (format !== "set") {
                result.push(src + "." + format);
            }
            result.push(src);
            result.push(src + ".png");
            result.push(src + ".svg");
            if (format !== "icns") {
                result.push(src + ".icns");
                if (format !== "ico") {
                    result.push(src + ".ico");
                }
            }
        }
    }
    if (format !== "set") {
        result.push("icon." + format);
    }
    for (const setName of ["icons", "icon"]) {
        result.push(setName);
    }
    result.push("icon.png");
    result.push("icon.svg");
    if (format !== "icns") {
        result.push("icon.icns");
        if (format !== "ico") {
            result.push("icon.ico");
        }
    }
    // Deduplicate while preserving order so resolveSourceFile never stats the same path twice
    return [...new Set(result)];
}
async function resolveSourceFile(candidates, roots) {
    for (const candidate of candidates) {
        const absPath = path.isAbsolute(candidate) ? path.normalize(candidate) : null;
        const searchPaths = absPath ? [absPath] : roots.map(r => path.join(r, candidate));
        for (const p of searchPaths) {
            try {
                const s = await (0, promises_1.stat)(p);
                return { resolved: p, isDir: s.isDirectory() };
            }
            catch {
                // not found, try next
            }
        }
    }
    return null;
}
// ─── Directory icon collection (go collect-icons.go) ────────────────────────
async function collectIconsFromDir(dir) {
    const entries = await (0, promises_1.readdir)(dir);
    const sizeMap = new Map();
    let fallbackFile = null;
    for (const name of entries) {
        if (name === "icon.png" || name === "icon.PNG") {
            fallbackFile = path.join(dir, name);
            continue;
        }
        const match = name.match(/^(\d+)(?:x\d+)?\.png$/i);
        if (!match) {
            continue;
        }
        const size = parseInt(match[1], 10);
        if (isNaN(size)) {
            continue;
        }
        const filePath = path.join(dir, name);
        const existing = sizeMap.get(size);
        if (!existing || name.length < path.basename(existing.file).length) {
            sizeMap.set(size, { file: filePath, size });
        }
    }
    const icons = Array.from(sizeMap.values()).sort((a, b) => a.size - b.size);
    return { icons, fallbackFile };
}
// ─── Main conversion logic ───────────────────────────────────────────────────
async function doConvertIcon(candidates, roots, format, outDir) {
    const found = await resolveSourceFile(candidates, roots);
    if (!found) {
        return null;
    }
    const { resolved, isDir } = found;
    // SVG source for set format: return the SVG directly — Linux targets place it in
    // the freedesktop scalable/ dir. Never call getPngSize on an SVG file.
    if (!isDir && resolved.endsWith(".svg") && format === "set") {
        return [{ file: resolved, size: 1024 }];
    }
    const outExt = format === "set" ? ".png" : "." + format;
    // If source already has the target extension and is not a directory, return it directly
    if (!isDir && resolved.endsWith(outExt)) {
        if (format === "icns") {
            return [{ file: resolved, size: 0 }];
        }
        if (format === "ico") {
            const size = await getIcoMaxSize(resolved);
            if (size === null) {
                throw new IconConversionError(`Icon is not a valid ICO file: ${resolved}`, "ERR_ICON_UNKNOWN_FORMAT");
            }
            if (size < 256) {
                throw new IconConversionError(`Icon must be at least 256x256 pixels, provided: ${size}x${size}`, "ERR_ICON_TOO_SMALL");
            }
            return [{ file: resolved, size }];
        }
        // set: source is already a .png — return as-is with its dimensions
        const { width, height } = await getPngSize(resolved);
        return [{ file: resolved, size: Math.max(width, height) }];
    }
    if (isDir) {
        const { icons, fallbackFile } = await collectIconsFromDir(resolved);
        if (format === "set") {
            if (icons.length > 0) {
                return icons;
            }
            if (fallbackFile) {
                return doConvertSingleFile(fallbackFile, format, outDir);
            }
            return null;
        }
        if (icons.length > 0) {
            // Use largest available PNG from the directory as CLI input
            const maxIcon = icons[icons.length - 1];
            await (0, promises_1.mkdir)(outDir, { recursive: true });
            await (0, icons_1.runIconsTool)({ inputFile: maxIcon.file, outputFormat: format, outDir });
            return collectCliOutput(outDir, format, maxIcon.size);
        }
        if (fallbackFile) {
            return doConvertSingleFile(fallbackFile, format, outDir);
        }
        return null;
    }
    // Single file: ICNS → ico or set — pass ICNS directly to CLI (CLI handles extraction)
    if (resolved.endsWith(".icns") && format !== "icns") {
        await (0, promises_1.mkdir)(outDir, { recursive: true });
        await (0, icons_1.runIconsTool)({ inputFile: resolved, outputFormat: format, outDir });
        return collectCliOutput(outDir, format);
    }
    return doConvertSingleFile(resolved, format, outDir);
}
async function doConvertSingleFile(sourceFile, format, outDir) {
    const ext = path.extname(sourceFile).toLowerCase();
    let maxSize;
    if (ext === ".svg") {
        maxSize = 1024; // CLI rasterizes SVG at 1024px
    }
    else {
        const { width, height } = await getPngSize(sourceFile);
        maxSize = Math.max(width, height);
        if (maxSize === 0) {
            return null;
        }
        const recommendedMin = format === "icns" ? 512 : 256;
        if (maxSize < recommendedMin) {
            throw new IconConversionError(`Icon must be at least ${recommendedMin}x${recommendedMin} pixels, provided: ${maxSize}x${maxSize}`, "ERR_ICON_TOO_SMALL");
        }
    }
    await (0, promises_1.mkdir)(outDir, { recursive: true });
    await (0, icons_1.runIconsTool)({ inputFile: sourceFile, outputFormat: format, outDir });
    return collectCliOutput(outDir, format, maxSize);
}
//# sourceMappingURL=iconConverter.js.map
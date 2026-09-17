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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackage = createPackage;
exports.createPackageWithOptions = createPackageWithOptions;
exports.createPackageFromFiles = createPackageFromFiles;
exports.createPackageFromStreams = createPackageFromStreams;
exports.statFile = statFile;
exports.getRawHeader = getRawHeader;
exports.listPackage = listPackage;
exports.extractFile = extractFile;
exports.extractAll = extractAll;
exports.uncache = uncache;
exports.uncacheAll = uncacheAll;
const path = __importStar(require("path"));
const minimatch_1 = __importDefault(require("minimatch"));
const wrapped_fs_1 = __importDefault(require("./wrapped-fs"));
const filesystem_1 = require("./filesystem");
const disk = __importStar(require("./disk"));
const crawlfs_1 = require("./crawlfs");
/**
 * Whether a directory should be excluded from packing due to the `--unpack-dir" option.
 *
 * @param dirPath - directory path to check
 * @param pattern - literal prefix [for backward compatibility] or glob pattern
 * @param unpackDirs - Array of directory paths previously marked as unpacked
 */
function isUnpackedDir(dirPath, pattern, unpackDirs) {
    if (dirPath.startsWith(pattern) || (0, minimatch_1.default)(dirPath, pattern)) {
        if (!unpackDirs.includes(dirPath)) {
            unpackDirs.push(dirPath);
        }
        return true;
    }
    else {
        return unpackDirs.some((unpackDir) => dirPath.startsWith(unpackDir) && !path.relative(unpackDir, dirPath).startsWith('..'));
    }
}
async function createPackage(src, dest) {
    return createPackageWithOptions(src, dest, {});
}
async function createPackageWithOptions(src, dest, options) {
    const globOptions = options.globOptions ? options.globOptions : {};
    globOptions.dot = options.dot === undefined ? true : options.dot;
    const pattern = src + (options.pattern ? options.pattern : '/**/*');
    const [filenames, metadata] = await (0, crawlfs_1.crawl)(pattern, globOptions);
    return createPackageFromFiles(src, dest, filenames, metadata, options);
}
/**
 * Create an ASAR archive from a list of filenames.
 *
 * @param src - Base path. All files are relative to this.
 * @param dest - Archive filename (& path).
 * @param filenames - List of filenames relative to src.
 * @param [metadata] - Object with filenames as keys and {type='directory|file|link', stat: fs.stat} as values. (Optional)
 * @param [options] - Options passed to `createPackageWithOptions`.
 */
async function createPackageFromFiles(src, dest, filenames, metadata = {}, options = {}) {
    src = path.normalize(src);
    dest = path.normalize(dest);
    filenames = filenames.map(function (filename) {
        return path.normalize(filename);
    });
    const filesystem = new filesystem_1.Filesystem(src);
    const files = [];
    const links = [];
    const unpackDirs = [];
    let filenamesSorted = [];
    if (options.ordering) {
        const orderingFiles = (await wrapped_fs_1.default.readFile(options.ordering))
            .toString()
            .split('\n')
            .map((line) => {
            if (line.includes(':')) {
                line = line.split(':').pop();
            }
            line = line.trim();
            if (line.startsWith('/')) {
                line = line.slice(1);
            }
            return line;
        });
        const ordering = [];
        for (const file of orderingFiles) {
            const pathComponents = file.split(path.sep);
            let str = src;
            for (const pathComponent of pathComponents) {
                str = path.join(str, pathComponent);
                ordering.push(str);
            }
        }
        let missing = 0;
        const total = filenames.length;
        for (const file of ordering) {
            if (!filenamesSorted.includes(file) && filenames.includes(file)) {
                filenamesSorted.push(file);
            }
        }
        for (const file of filenames) {
            if (!filenamesSorted.includes(file)) {
                filenamesSorted.push(file);
                missing += 1;
            }
        }
        console.log(`Ordering file has ${((total - missing) / total) * 100}% coverage.`);
    }
    else {
        filenamesSorted = filenames;
    }
    const handleFile = async function (filename) {
        if (!metadata[filename]) {
            const fileType = await (0, crawlfs_1.determineFileType)(filename);
            if (!fileType) {
                throw new Error('Unknown file type for file: ' + filename);
            }
            metadata[filename] = fileType;
        }
        const file = metadata[filename];
        const shouldUnpackPath = function (relativePath, unpack, unpackDir) {
            let shouldUnpack = false;
            if (unpack) {
                shouldUnpack = (0, minimatch_1.default)(filename, unpack, { matchBase: true });
            }
            if (!shouldUnpack && unpackDir) {
                shouldUnpack = isUnpackedDir(relativePath, unpackDir, unpackDirs);
            }
            return shouldUnpack;
        };
        let shouldUnpack;
        switch (file.type) {
            case 'directory':
                shouldUnpack = shouldUnpackPath(path.relative(src, filename), undefined, options.unpackDir);
                filesystem.insertDirectory(filename, shouldUnpack);
                break;
            case 'file':
                shouldUnpack = shouldUnpackPath(path.relative(src, path.dirname(filename)), options.unpack, options.unpackDir);
                files.push({ filename, unpack: shouldUnpack });
                return filesystem.insertFile(filename, () => wrapped_fs_1.default.createReadStream(filename), shouldUnpack, file, options);
            case 'link':
                shouldUnpack = shouldUnpackPath(path.relative(src, filename), options.unpack, options.unpackDir);
                links.push({ filename, unpack: shouldUnpack });
                filesystem.insertLink(filename, shouldUnpack);
                break;
        }
        return Promise.resolve();
    };
    const insertsDone = async function () {
        await wrapped_fs_1.default.mkdirp(path.dirname(dest));
        return disk.writeFilesystem(dest, filesystem, { files, links }, metadata);
    };
    const names = filenamesSorted.slice();
    const next = async function (name) {
        if (!name) {
            return insertsDone();
        }
        await handleFile(name);
        return next(names.shift());
    };
    return next(names.shift());
}
/**
 * Create an ASAR archive from a list of streams.
 *
 * @param dest - Archive filename (& path).
 * @param streams - List of streams to be piped in-memory into asar filesystem. Insertion order is preserved.
 */
async function createPackageFromStreams(dest, streams) {
    // We use an ambiguous root `src` since we're piping directly from a stream and the `filePath` for the stream is already relative to the src/root
    const src = '.';
    const filesystem = new filesystem_1.Filesystem(src);
    const files = [];
    const links = [];
    const handleFile = async function (stream) {
        const { path: destinationPath, type } = stream;
        const filename = path.normalize(destinationPath);
        switch (type) {
            case 'directory':
                filesystem.insertDirectory(filename, stream.unpacked);
                break;
            case 'file':
                files.push({
                    filename,
                    streamGenerator: stream.streamGenerator,
                    link: undefined,
                    mode: stream.stat.mode,
                    unpack: stream.unpacked,
                });
                return filesystem.insertFile(filename, stream.streamGenerator, stream.unpacked, {
                    type: 'file',
                    stat: stream.stat,
                });
            case 'link':
                links.push({
                    filename,
                    streamGenerator: stream.streamGenerator,
                    link: stream.symlink,
                    mode: stream.stat.mode,
                    unpack: stream.unpacked,
                });
                filesystem.insertLink(filename, stream.unpacked, path.dirname(filename), stream.symlink, src);
                break;
        }
        return Promise.resolve();
    };
    const insertsDone = async function () {
        await wrapped_fs_1.default.mkdirp(path.dirname(dest));
        return disk.streamFilesystem(dest, filesystem, { files, links });
    };
    const streamQueue = streams.slice();
    const next = async function (stream) {
        if (!stream) {
            return insertsDone();
        }
        await handleFile(stream);
        return next(streamQueue.shift());
    };
    return next(streamQueue.shift());
}
function statFile(archivePath, filename, followLinks = true) {
    const filesystem = disk.readFilesystemSync(archivePath);
    return filesystem.getFile(filename, followLinks);
}
function getRawHeader(archivePath) {
    return disk.readArchiveHeaderSync(archivePath);
}
function listPackage(archivePath, options) {
    return disk.readFilesystemSync(archivePath).listFiles(options);
}
function extractFile(archivePath, filename, followLinks = true) {
    const filesystem = disk.readFilesystemSync(archivePath);
    const fileInfo = filesystem.getFile(filename, followLinks);
    if ('link' in fileInfo || 'files' in fileInfo) {
        throw new Error('Expected to find file at: ' + filename + ' but found a directory or link');
    }
    return disk.readFileSync(filesystem, filename, fileInfo);
}
function extractAll(archivePath, dest) {
    const filesystem = disk.readFilesystemSync(archivePath);
    const filenames = filesystem.listFiles();
    // under windows just extract links as regular files
    const followLinks = process.platform === 'win32';
    // create destination directory
    wrapped_fs_1.default.mkdirpSync(dest);
    const extractionErrors = [];
    for (const fullPath of filenames) {
        // Remove leading slash
        const filename = fullPath.substr(1);
        const destFilename = path.join(dest, filename);
        const file = filesystem.getFile(filename, followLinks);
        if (path.relative(dest, destFilename).startsWith('..')) {
            throw new Error(`${fullPath}: file "${destFilename}" writes out of the package`);
        }
        if ('files' in file) {
            // it's a directory, create it and continue with the next entry
            wrapped_fs_1.default.mkdirpSync(destFilename);
        }
        else if ('link' in file) {
            // it's a symlink, create a symlink
            const linkSrcPath = path.dirname(path.join(dest, file.link));
            const linkDestPath = path.dirname(destFilename);
            const relativePath = path.relative(linkDestPath, linkSrcPath);
            // try to delete output file, because we can't overwrite a link
            try {
                wrapped_fs_1.default.unlinkSync(destFilename);
            }
            catch (_a) { }
            const linkTo = path.join(relativePath, path.basename(file.link));
            if (path.relative(dest, linkSrcPath).startsWith('..')) {
                throw new Error(`${fullPath}: file "${file.link}" links out of the package to "${linkSrcPath}"`);
            }
            wrapped_fs_1.default.symlinkSync(linkTo, destFilename);
        }
        else {
            // it's a file, try to extract it
            try {
                const content = disk.readFileSync(filesystem, filename, file);
                wrapped_fs_1.default.writeFileSync(destFilename, content);
                if (file.executable) {
                    wrapped_fs_1.default.chmodSync(destFilename, '755');
                }
            }
            catch (e) {
                extractionErrors.push(e);
            }
        }
    }
    if (extractionErrors.length) {
        throw new Error('Unable to extract some files:\n\n' +
            extractionErrors.map((error) => error.stack).join('\n\n'));
    }
}
function uncache(archivePath) {
    return disk.uncacheFilesystem(archivePath);
}
function uncacheAll() {
    disk.uncacheAll();
}
// Export everything in default, too
exports.default = {
    createPackage,
    createPackageWithOptions,
    createPackageFromFiles,
    createPackageFromStreams,
    statFile,
    getRawHeader,
    listPackage,
    extractFile,
    extractAll,
    uncache,
    uncacheAll,
};
//# sourceMappingURL=asar.js.map
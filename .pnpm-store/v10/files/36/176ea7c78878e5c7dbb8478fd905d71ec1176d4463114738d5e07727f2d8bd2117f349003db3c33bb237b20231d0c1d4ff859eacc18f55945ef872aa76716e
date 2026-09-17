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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFilesystem = writeFilesystem;
exports.streamFilesystem = streamFilesystem;
exports.readArchiveHeaderSync = readArchiveHeaderSync;
exports.readFilesystemSync = readFilesystemSync;
exports.uncacheFilesystem = uncacheFilesystem;
exports.uncacheAll = uncacheAll;
exports.readFileSync = readFileSync;
const path = __importStar(require("path"));
const wrapped_fs_1 = __importDefault(require("./wrapped-fs"));
const pickle_1 = require("./pickle");
const filesystem_1 = require("./filesystem");
const util_1 = require("util");
const stream = __importStar(require("stream"));
const pipeline = (0, util_1.promisify)(stream.pipeline);
let filesystemCache = Object.create(null);
async function copyFile(dest, src, filename) {
    const srcFile = path.join(src, filename);
    const targetFile = path.join(dest, filename);
    const [content, stats] = await Promise.all([
        wrapped_fs_1.default.readFile(srcFile),
        wrapped_fs_1.default.stat(srcFile),
        wrapped_fs_1.default.mkdirp(path.dirname(targetFile)),
    ]);
    return wrapped_fs_1.default.writeFile(targetFile, content, { mode: stats.mode });
}
async function streamTransformedFile(stream, outStream) {
    return new Promise((resolve, reject) => {
        stream.pipe(outStream, { end: false });
        stream.on('error', reject);
        stream.on('end', () => resolve());
    });
}
const writeFileListToStream = async function (dest, filesystem, out, lists, metadata) {
    const { files, links } = lists;
    for (const file of files) {
        if (file.unpack) {
            // the file should not be packed into archive
            const filename = path.relative(filesystem.getRootPath(), file.filename);
            await copyFile(`${dest}.unpacked`, filesystem.getRootPath(), filename);
        }
        else {
            const transformed = metadata[file.filename].transformed;
            const stream = wrapped_fs_1.default.createReadStream(transformed ? transformed.path : file.filename);
            await streamTransformedFile(stream, out);
        }
    }
    for (const file of links.filter((f) => f.unpack)) {
        // the symlink needs to be recreated outside in .unpacked
        const filename = path.relative(filesystem.getRootPath(), file.filename);
        const link = await wrapped_fs_1.default.readlink(file.filename);
        await createSymlink(dest, filename, link);
    }
    return out.end();
};
async function writeFilesystem(dest, filesystem, lists, metadata) {
    const out = await createFilesystemWriteStream(filesystem, dest);
    return writeFileListToStream(dest, filesystem, out, lists, metadata);
}
async function streamFilesystem(dest, filesystem, lists) {
    var _a, e_1, _b, _c;
    const out = await createFilesystemWriteStream(filesystem, dest);
    const { files, links } = lists;
    try {
        for (var _d = true, files_1 = __asyncValues(files), files_1_1; files_1_1 = await files_1.next(), _a = files_1_1.done, !_a; _d = true) {
            _c = files_1_1.value;
            _d = false;
            const file = _c;
            // the file should not be packed into archive
            if (file.unpack) {
                const targetFile = path.join(`${dest}.unpacked`, file.filename);
                await wrapped_fs_1.default.mkdirp(path.dirname(targetFile));
                const writeStream = wrapped_fs_1.default.createWriteStream(targetFile, { mode: file.mode });
                await pipeline(file.streamGenerator(), writeStream);
            }
            else {
                await streamTransformedFile(file.streamGenerator(), out);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = files_1.return)) await _b.call(files_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    for (const file of links.filter((f) => f.unpack && f.link)) {
        // the symlink needs to be recreated outside in .unpacked
        await createSymlink(dest, file.filename, file.link);
    }
    return out.end();
}
function readArchiveHeaderSync(archivePath) {
    const fd = wrapped_fs_1.default.openSync(archivePath, 'r');
    let size;
    let headerBuf;
    try {
        const sizeBuf = Buffer.alloc(8);
        if (wrapped_fs_1.default.readSync(fd, sizeBuf, 0, 8, null) !== 8) {
            throw new Error('Unable to read header size');
        }
        const sizePickle = pickle_1.Pickle.createFromBuffer(sizeBuf);
        size = sizePickle.createIterator().readUInt32();
        headerBuf = Buffer.alloc(size);
        if (wrapped_fs_1.default.readSync(fd, headerBuf, 0, size, null) !== size) {
            throw new Error('Unable to read header');
        }
    }
    finally {
        wrapped_fs_1.default.closeSync(fd);
    }
    const headerPickle = pickle_1.Pickle.createFromBuffer(headerBuf);
    const header = headerPickle.createIterator().readString();
    return { headerString: header, header: JSON.parse(header), headerSize: size };
}
function readFilesystemSync(archivePath) {
    if (!filesystemCache[archivePath]) {
        const header = readArchiveHeaderSync(archivePath);
        const filesystem = new filesystem_1.Filesystem(archivePath);
        filesystem.setHeader(header.header, header.headerSize);
        filesystemCache[archivePath] = filesystem;
    }
    return filesystemCache[archivePath];
}
function uncacheFilesystem(archivePath) {
    if (filesystemCache[archivePath]) {
        filesystemCache[archivePath] = undefined;
        return true;
    }
    return false;
}
function uncacheAll() {
    filesystemCache = {};
}
function readFileSync(filesystem, filename, info) {
    let buffer = Buffer.alloc(info.size);
    if (info.size <= 0) {
        return buffer;
    }
    if (info.unpacked) {
        // it's an unpacked file, copy it.
        buffer = wrapped_fs_1.default.readFileSync(path.join(`${filesystem.getRootPath()}.unpacked`, filename));
    }
    else {
        // Node throws an exception when reading 0 bytes into a 0-size buffer,
        // so we short-circuit the read in this case.
        const fd = wrapped_fs_1.default.openSync(filesystem.getRootPath(), 'r');
        try {
            const offset = 8 + filesystem.getHeaderSize() + parseInt(info.offset);
            wrapped_fs_1.default.readSync(fd, buffer, 0, info.size, offset);
        }
        finally {
            wrapped_fs_1.default.closeSync(fd);
        }
    }
    return buffer;
}
async function createFilesystemWriteStream(filesystem, dest) {
    const headerPickle = pickle_1.Pickle.createEmpty();
    headerPickle.writeString(JSON.stringify(filesystem.getHeader()));
    const headerBuf = headerPickle.toBuffer();
    const sizePickle = pickle_1.Pickle.createEmpty();
    sizePickle.writeUInt32(headerBuf.length);
    const sizeBuf = sizePickle.toBuffer();
    const out = wrapped_fs_1.default.createWriteStream(dest);
    await new Promise((resolve, reject) => {
        out.on('error', reject);
        out.write(sizeBuf);
        return out.write(headerBuf, () => resolve());
    });
    return out;
}
async function createSymlink(dest, filepath, link) {
    // if symlink is within subdirectories, then we need to recreate dir structure
    await wrapped_fs_1.default.mkdirp(path.join(`${dest}.unpacked`, path.dirname(filepath)));
    // create symlink within unpacked dir
    await wrapped_fs_1.default.symlink(link, path.join(`${dest}.unpacked`, filepath)).catch(async (error) => {
        if (error.code === 'EPERM' && error.syscall === 'symlink') {
            throw new Error('Could not create symlinks for unpacked assets. On Windows, consider activating Developer Mode to allow non-admin users to create symlinks by following the instructions at https://docs.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development.');
        }
        throw error;
    });
}
//# sourceMappingURL=disk.js.map
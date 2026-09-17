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
exports.Filesystem = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util_1 = require("util");
const stream = __importStar(require("stream"));
const integrity_1 = require("./integrity");
const wrapped_fs_1 = __importDefault(require("./wrapped-fs"));
const UINT32_MAX = 2 ** 32 - 1;
const pipeline = (0, util_1.promisify)(stream.pipeline);
class Filesystem {
    constructor(src) {
        this.src = path.resolve(src);
        this.header = { files: Object.create(null) };
        this.headerSize = 0;
        this.offset = BigInt(0);
    }
    getRootPath() {
        return this.src;
    }
    getHeader() {
        return this.header;
    }
    getHeaderSize() {
        return this.headerSize;
    }
    setHeader(header, headerSize) {
        this.header = header;
        this.headerSize = headerSize;
    }
    searchNodeFromDirectory(p) {
        let json = this.header;
        const dirs = p.split(path.sep);
        for (const dir of dirs) {
            if (dir !== '.') {
                if ('files' in json) {
                    if (!json.files[dir]) {
                        json.files[dir] = { files: Object.create(null) };
                    }
                    json = json.files[dir];
                }
                else {
                    throw new Error('Unexpected directory state while traversing: ' + p);
                }
            }
        }
        return json;
    }
    searchNodeFromPath(p) {
        p = path.relative(this.src, p);
        if (!p) {
            return this.header;
        }
        const name = path.basename(p);
        const node = this.searchNodeFromDirectory(path.dirname(p));
        if (!node.files) {
            node.files = Object.create(null);
        }
        if (!node.files[name]) {
            node.files[name] = Object.create(null);
        }
        return node.files[name];
    }
    insertDirectory(p, shouldUnpack) {
        const node = this.searchNodeFromPath(p);
        if (shouldUnpack) {
            node.unpacked = shouldUnpack;
        }
        node.files = node.files || Object.create(null);
        return node.files;
    }
    async insertFile(p, streamGenerator, shouldUnpack, file, options = {}) {
        const dirNode = this.searchNodeFromPath(path.dirname(p));
        const node = this.searchNodeFromPath(p);
        if (shouldUnpack || dirNode.unpacked) {
            node.size = file.stat.size;
            node.unpacked = true;
            node.integrity = await (0, integrity_1.getFileIntegrity)(streamGenerator());
            return Promise.resolve();
        }
        let size;
        const transformed = options.transform && options.transform(p);
        if (transformed) {
            const tmpdir = await wrapped_fs_1.default.mkdtemp(path.join(os.tmpdir(), 'asar-'));
            const tmpfile = path.join(tmpdir, path.basename(p));
            const out = wrapped_fs_1.default.createWriteStream(tmpfile);
            await pipeline(streamGenerator(), transformed, out);
            file.transformed = {
                path: tmpfile,
                stat: await wrapped_fs_1.default.lstat(tmpfile),
            };
            size = file.transformed.stat.size;
        }
        else {
            size = file.stat.size;
        }
        // JavaScript cannot precisely present integers >= UINT32_MAX.
        if (size > UINT32_MAX) {
            throw new Error(`${p}: file size can not be larger than 4.2GB`);
        }
        node.size = size;
        node.offset = this.offset.toString();
        node.integrity = await (0, integrity_1.getFileIntegrity)(streamGenerator());
        if (process.platform !== 'win32' && file.stat.mode & 0o100) {
            node.executable = true;
        }
        this.offset += BigInt(size);
    }
    insertLink(p, shouldUnpack, parentPath = wrapped_fs_1.default.realpathSync(path.dirname(p)), symlink = wrapped_fs_1.default.readlinkSync(p), // /var/tmp => /private/var
    src = wrapped_fs_1.default.realpathSync(this.src)) {
        const link = this.resolveLink(src, parentPath, symlink);
        if (link.startsWith('..')) {
            throw new Error(`${p}: file "${link}" links out of the package`);
        }
        const node = this.searchNodeFromPath(p);
        const dirNode = this.searchNodeFromPath(path.dirname(p));
        if (shouldUnpack || dirNode.unpacked) {
            node.unpacked = true;
        }
        node.link = link;
        return link;
    }
    resolveLink(src, parentPath, symlink) {
        const target = path.join(parentPath, symlink);
        const link = path.relative(src, target);
        return link;
    }
    listFiles(options) {
        const files = [];
        const fillFilesFromMetadata = function (basePath, metadata) {
            if (!('files' in metadata)) {
                return;
            }
            for (const [childPath, childMetadata] of Object.entries(metadata.files)) {
                const fullPath = path.join(basePath, childPath);
                const packState = 'unpacked' in childMetadata && childMetadata.unpacked ? 'unpack' : 'pack  ';
                files.push(options && options.isPack ? `${packState} : ${fullPath}` : fullPath);
                fillFilesFromMetadata(fullPath, childMetadata);
            }
        };
        fillFilesFromMetadata('/', this.header);
        return files;
    }
    getNode(p, followLinks = true) {
        const node = this.searchNodeFromDirectory(path.dirname(p));
        const name = path.basename(p);
        if ('link' in node && followLinks) {
            return this.getNode(path.join(node.link, name));
        }
        if (name) {
            return node.files[name];
        }
        else {
            return node;
        }
    }
    getFile(p, followLinks = true) {
        const info = this.getNode(p, followLinks);
        if (!info) {
            throw new Error(`"${p}" was not found in this archive`);
        }
        // if followLinks is false we don't resolve symlinks
        if ('link' in info && followLinks) {
            return this.getFile(info.link, followLinks);
        }
        else {
            return info;
        }
    }
}
exports.Filesystem = Filesystem;
//# sourceMappingURL=filesystem.js.map
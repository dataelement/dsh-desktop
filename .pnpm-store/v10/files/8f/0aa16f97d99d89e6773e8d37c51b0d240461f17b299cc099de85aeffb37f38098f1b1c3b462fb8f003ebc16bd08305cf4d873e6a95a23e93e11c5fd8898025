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
exports.determineFileType = determineFileType;
exports.crawl = crawl;
const util_1 = require("util");
const glob_1 = require("glob");
const wrapped_fs_1 = __importDefault(require("./wrapped-fs"));
const path = __importStar(require("path"));
const glob = (0, util_1.promisify)(glob_1.glob);
async function determineFileType(filename) {
    const stat = await wrapped_fs_1.default.lstat(filename);
    if (stat.isFile()) {
        return { type: 'file', stat };
    }
    else if (stat.isDirectory()) {
        return { type: 'directory', stat };
    }
    else if (stat.isSymbolicLink()) {
        return { type: 'link', stat };
    }
    return null;
}
async function crawl(dir, options) {
    const metadata = {};
    const crawled = await glob(dir, options);
    const results = await Promise.all(crawled.map(async (filename) => [filename, await determineFileType(filename)]));
    const links = [];
    const filenames = results
        .map(([filename, type]) => {
        if (type) {
            metadata[filename] = type;
            if (type.type === 'link')
                links.push(filename);
        }
        return filename;
    })
        .filter((filename) => {
        // Newer glob can return files inside symlinked directories, to avoid
        // those appearing in archives we need to manually exclude theme here
        const exactLinkIndex = links.findIndex((link) => filename === link);
        return links.every((link, index) => {
            if (index === exactLinkIndex) {
                return true;
            }
            const isFileWithinSymlinkDir = filename.startsWith(link);
            // symlink may point outside the directory: https://github.com/electron/asar/issues/303
            const relativePath = path.relative(link, path.dirname(filename));
            return !isFileWithinSymlinkDir || relativePath.startsWith('..');
        });
    });
    return [filenames, metadata];
}
//# sourceMappingURL=crawlfs.js.map
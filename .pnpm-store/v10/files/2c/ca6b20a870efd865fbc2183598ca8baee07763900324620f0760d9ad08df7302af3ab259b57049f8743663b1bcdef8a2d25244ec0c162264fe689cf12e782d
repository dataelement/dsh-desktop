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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileIntegrity = getFileIntegrity;
const crypto = __importStar(require("crypto"));
const stream = __importStar(require("stream"));
const util_1 = require("util");
const ALGORITHM = 'SHA256';
// 4MB default block size
const BLOCK_SIZE = 4 * 1024 * 1024;
const pipeline = (0, util_1.promisify)(stream.pipeline);
function hashBlock(block) {
    return crypto.createHash(ALGORITHM).update(block).digest('hex');
}
async function getFileIntegrity(inputFileStream) {
    const fileHash = crypto.createHash(ALGORITHM);
    const blockHashes = [];
    let currentBlockSize = 0;
    let currentBlock = [];
    await pipeline(inputFileStream, new stream.PassThrough({
        decodeStrings: false,
        transform(_chunk, encoding, callback) {
            fileHash.update(_chunk);
            function handleChunk(chunk) {
                const diffToSlice = Math.min(BLOCK_SIZE - currentBlockSize, chunk.byteLength);
                currentBlockSize += diffToSlice;
                currentBlock.push(chunk.slice(0, diffToSlice));
                if (currentBlockSize === BLOCK_SIZE) {
                    blockHashes.push(hashBlock(Buffer.concat(currentBlock)));
                    currentBlock = [];
                    currentBlockSize = 0;
                }
                if (diffToSlice < chunk.byteLength) {
                    handleChunk(chunk.slice(diffToSlice));
                }
            }
            handleChunk(_chunk);
            callback();
        },
        flush(callback) {
            blockHashes.push(hashBlock(Buffer.concat(currentBlock)));
            currentBlock = [];
            callback();
        },
    }));
    return {
        algorithm: ALGORITHM,
        hash: fileHash.digest('hex'),
        blockSize: BLOCK_SIZE,
        blocks: blockHashes,
    };
}
//# sourceMappingURL=integrity.js.map
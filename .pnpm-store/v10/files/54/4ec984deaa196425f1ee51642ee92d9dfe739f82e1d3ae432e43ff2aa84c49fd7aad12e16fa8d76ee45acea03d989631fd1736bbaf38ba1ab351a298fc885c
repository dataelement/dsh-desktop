"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
const fs_extra_1 = require("fs-extra");
const DifferentialDownloader_1 = require("./DifferentialDownloader");
const zlib_1 = require("zlib");
class FileWithEmbeddedBlockMapDifferentialDownloader extends DifferentialDownloader_1.DifferentialDownloader {
    async download() {
        const packageInfo = this.blockAwareFileInfo;
        const fileSize = packageInfo.size;
        const offset = fileSize - (packageInfo.blockMapSize + 4);
        this.fileMetadataBuffer = await this.readRemoteBytes(offset, fileSize - 1);
        const newBlockMap = readBlockMap(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
        await this.doDownload(await readEmbeddedBlockMapData(this.options.oldFile), newBlockMap);
    }
}
exports.FileWithEmbeddedBlockMapDifferentialDownloader = FileWithEmbeddedBlockMapDifferentialDownloader;
function readBlockMap(data) {
    return JSON.parse((0, zlib_1.inflateRawSync)(data).toString());
}
async function readEmbeddedBlockMapData(file) {
    const fd = await (0, fs_extra_1.open)(file, "r");
    try {
        const fileSize = (await (0, fs_extra_1.fstat)(fd)).size;
        const sizeBuffer = Buffer.allocUnsafe(4);
        await (0, fs_extra_1.read)(fd, sizeBuffer, 0, sizeBuffer.length, fileSize - sizeBuffer.length);
        const dataBuffer = Buffer.allocUnsafe(sizeBuffer.readUInt32BE(0));
        await (0, fs_extra_1.read)(fd, dataBuffer, 0, dataBuffer.length, fileSize - sizeBuffer.length - dataBuffer.length);
        await (0, fs_extra_1.close)(fd);
        return readBlockMap(dataBuffer);
    }
    catch (e) {
        await (0, fs_extra_1.close)(fd);
        throw e;
    }
}
//# sourceMappingURL=FileWithEmbeddedBlockMapDifferentialDownloader.js.map
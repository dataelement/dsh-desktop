"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationKind = void 0;
exports.computeOperations = computeOperations;
var OperationKind;
(function (OperationKind) {
    OperationKind[OperationKind["COPY"] = 0] = "COPY";
    OperationKind[OperationKind["DOWNLOAD"] = 1] = "DOWNLOAD";
})(OperationKind || (exports.OperationKind = OperationKind = {}));
function computeOperations(oldBlockMap, newBlockMap, logger) {
    const nameToOldBlocks = buildBlockFileMap(oldBlockMap.files);
    const nameToNewBlocks = buildBlockFileMap(newBlockMap.files);
    let lastOperation = null;
    // for now only one file is supported in block map
    const blockMapFile = newBlockMap.files[0];
    const operations = [];
    const name = blockMapFile.name;
    const oldEntry = nameToOldBlocks.get(name);
    if (oldEntry == null) {
        // new file (unrealistic case for now, because in any case both blockmap contain the only file named as "file")
        throw new Error(`no file ${name} in old blockmap`);
    }
    const newFile = nameToNewBlocks.get(name);
    let changedBlockCount = 0;
    const { checksumToOffset: checksumToOldOffset, checksumToOldSize } = buildChecksumMap(nameToOldBlocks.get(name), oldEntry.offset, logger);
    let newOffset = blockMapFile.offset;
    for (let i = 0; i < newFile.checksums.length; newOffset += newFile.sizes[i], i++) {
        const blockSize = newFile.sizes[i];
        const checksum = newFile.checksums[i];
        let oldOffset = checksumToOldOffset.get(checksum);
        if (oldOffset != null && checksumToOldSize.get(checksum) !== blockSize) {
            logger.warn(`Checksum ("${checksum}") matches, but size differs (old: ${checksumToOldSize.get(checksum)}, new: ${blockSize})`);
            oldOffset = undefined;
        }
        if (oldOffset === undefined) {
            // download data from new file
            changedBlockCount++;
            if (lastOperation != null && lastOperation.kind === OperationKind.DOWNLOAD && lastOperation.end === newOffset) {
                lastOperation.end += blockSize;
            }
            else {
                lastOperation = {
                    kind: OperationKind.DOWNLOAD,
                    start: newOffset,
                    end: newOffset + blockSize,
                    // oldBlocks: null,
                };
                validateAndAdd(lastOperation, operations, checksum, i);
            }
        }
        else {
            // reuse data from old file
            if (lastOperation != null && lastOperation.kind === OperationKind.COPY && lastOperation.end === oldOffset) {
                lastOperation.end += blockSize;
                // lastOperation.oldBlocks!!.push(checksum)
            }
            else {
                lastOperation = {
                    kind: OperationKind.COPY,
                    start: oldOffset,
                    end: oldOffset + blockSize,
                    // oldBlocks: [checksum]
                };
                validateAndAdd(lastOperation, operations, checksum, i);
            }
        }
    }
    if (changedBlockCount > 0) {
        logger.info(`File${blockMapFile.name === "file" ? "" : " " + blockMapFile.name} has ${changedBlockCount} changed blocks`);
    }
    return operations;
}
const isValidateOperationRange = process.env["DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES"] === "true";
function validateAndAdd(operation, operations, checksum, index) {
    if (isValidateOperationRange && operations.length !== 0) {
        const lastOperation = operations[operations.length - 1];
        if (lastOperation.kind === operation.kind && operation.start < lastOperation.end && operation.start > lastOperation.start) {
            const min = [lastOperation.start, lastOperation.end, operation.start, operation.end].reduce((p, v) => (p < v ? p : v));
            throw new Error(`operation (block index: ${index}, checksum: ${checksum}, kind: ${OperationKind[operation.kind]}) overlaps previous operation (checksum: ${checksum}):\n` +
                `abs: ${lastOperation.start} until ${lastOperation.end} and ${operation.start} until ${operation.end}\n` +
                `rel: ${lastOperation.start - min} until ${lastOperation.end - min} and ${operation.start - min} until ${operation.end - min}`);
        }
    }
    operations.push(operation);
}
function buildChecksumMap(file, fileOffset, logger) {
    const checksumToOffset = new Map();
    const checksumToSize = new Map();
    let offset = fileOffset;
    for (let i = 0; i < file.checksums.length; i++) {
        const checksum = file.checksums[i];
        const size = file.sizes[i];
        const existing = checksumToSize.get(checksum);
        if (existing === undefined) {
            checksumToOffset.set(checksum, offset);
            checksumToSize.set(checksum, size);
        }
        else if (logger.debug != null) {
            const sizeExplanation = existing === size ? "(same size)" : `(size: ${existing}, this size: ${size})`;
            logger.debug(`${checksum} duplicated in blockmap ${sizeExplanation}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
        }
        offset += size;
    }
    return { checksumToOffset, checksumToOldSize: checksumToSize };
}
function buildBlockFileMap(list) {
    const result = new Map();
    for (const item of list) {
        result.set(item.name, item);
    }
    return result;
}
//# sourceMappingURL=downloadPlanBuilder.js.map
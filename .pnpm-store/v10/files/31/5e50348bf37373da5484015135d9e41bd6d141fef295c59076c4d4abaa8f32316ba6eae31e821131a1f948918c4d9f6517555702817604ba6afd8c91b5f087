"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSplitter = void 0;
exports.copyData = copyData;
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_1 = require("fs");
const stream_1 = require("stream");
const downloadPlanBuilder_1 = require("./downloadPlanBuilder");
const DOUBLE_CRLF = Buffer.from("\r\n\r\n");
var ReadState;
(function (ReadState) {
    ReadState[ReadState["INIT"] = 0] = "INIT";
    ReadState[ReadState["HEADER"] = 1] = "HEADER";
    ReadState[ReadState["BODY"] = 2] = "BODY";
})(ReadState || (ReadState = {}));
function copyData(task, out, oldFileFd, reject, resolve) {
    const readStream = (0, fs_1.createReadStream)("", {
        fd: oldFileFd,
        autoClose: false,
        start: task.start,
        // end is inclusive
        end: task.end - 1,
    });
    readStream.on("error", reject);
    readStream.once("end", resolve);
    readStream.pipe(out, {
        end: false,
    });
}
class DataSplitter extends stream_1.Writable {
    constructor(out, options, partIndexToTaskIndex, boundary, partIndexToLength, finishHandler, grandTotalBytes, onProgress) {
        super();
        this.out = out;
        this.options = options;
        this.partIndexToTaskIndex = partIndexToTaskIndex;
        this.partIndexToLength = partIndexToLength;
        this.finishHandler = finishHandler;
        this.grandTotalBytes = grandTotalBytes;
        this.onProgress = onProgress;
        // properties for progress update calculations
        this.start = Date.now(); // download start time used to calculate average rate
        this.nextUpdate = this.start + 1000; // timestamp of next update to prevent updates more often than once per second
        this.transferred = 0; // total number of bytes transferred
        this.delta = 0; // number of bytes transferred since last update, reset after each update
        this.partIndex = -1;
        this.headerListBuffer = null;
        this.readState = ReadState.INIT;
        this.ignoreByteCount = 0;
        this.remainingPartDataCount = 0;
        this.actualPartLength = 0;
        this.boundaryLength = boundary.length + 4; /* size of \r\n-- */
        // first chunk doesn't start with \r\n
        this.ignoreByteCount = this.boundaryLength - 2;
    }
    get isFinished() {
        return this.partIndex === this.partIndexToLength.length;
    }
    // noinspection JSUnusedGlobalSymbols
    _write(data, encoding, callback) {
        if (this.isFinished) {
            console.error(`Trailing ignored data: ${data.length} bytes`);
            return;
        }
        this.handleData(data)
            .then(() => {
            if (this.onProgress) {
                const now = Date.now();
                if ((now >= this.nextUpdate || this.transferred === this.grandTotalBytes) && this.grandTotalBytes && (now - this.start) / 1000) {
                    this.nextUpdate = now + 1000;
                    this.onProgress({
                        total: this.grandTotalBytes,
                        delta: this.delta,
                        transferred: this.transferred,
                        percent: (this.transferred / this.grandTotalBytes) * 100,
                        bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1000)),
                    });
                    this.delta = 0;
                }
            }
            callback();
        })
            .catch(callback);
    }
    async handleData(chunk) {
        let start = 0;
        if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0) {
            throw (0, builder_util_runtime_1.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
        }
        if (this.ignoreByteCount > 0) {
            const toIgnore = Math.min(this.ignoreByteCount, chunk.length);
            this.ignoreByteCount -= toIgnore;
            start = toIgnore;
        }
        else if (this.remainingPartDataCount > 0) {
            const toRead = Math.min(this.remainingPartDataCount, chunk.length);
            this.remainingPartDataCount -= toRead;
            await this.processPartData(chunk, 0, toRead);
            start = toRead;
        }
        if (start === chunk.length) {
            return;
        }
        if (this.readState === ReadState.HEADER) {
            const headerListEnd = this.searchHeaderListEnd(chunk, start);
            if (headerListEnd === -1) {
                return;
            }
            start = headerListEnd;
            this.readState = ReadState.BODY;
            // header list is ignored, we don't need it
            this.headerListBuffer = null;
        }
        while (true) {
            if (this.readState === ReadState.BODY) {
                this.readState = ReadState.INIT;
            }
            else {
                this.partIndex++;
                let taskIndex = this.partIndexToTaskIndex.get(this.partIndex);
                if (taskIndex == null) {
                    if (this.isFinished) {
                        taskIndex = this.options.end;
                    }
                    else {
                        throw (0, builder_util_runtime_1.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
                    }
                }
                const prevTaskIndex = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1; /* prev part is download, next maybe copy */
                if (prevTaskIndex < taskIndex) {
                    await this.copyExistingData(prevTaskIndex, taskIndex);
                }
                else if (prevTaskIndex > taskIndex) {
                    throw (0, builder_util_runtime_1.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
                }
                if (this.isFinished) {
                    this.onPartEnd();
                    this.finishHandler();
                    return;
                }
                start = this.searchHeaderListEnd(chunk, start);
                if (start === -1) {
                    this.readState = ReadState.HEADER;
                    return;
                }
            }
            const partLength = this.partIndexToLength[this.partIndex];
            const end = start + partLength;
            const effectiveEnd = Math.min(end, chunk.length);
            await this.processPartStarted(chunk, start, effectiveEnd);
            this.remainingPartDataCount = partLength - (effectiveEnd - start);
            if (this.remainingPartDataCount > 0) {
                return;
            }
            start = end + this.boundaryLength;
            if (start >= chunk.length) {
                this.ignoreByteCount = this.boundaryLength - (chunk.length - end);
                return;
            }
        }
    }
    copyExistingData(index, end) {
        return new Promise((resolve, reject) => {
            const w = () => {
                if (index === end) {
                    resolve();
                    return;
                }
                const task = this.options.tasks[index];
                if (task.kind !== downloadPlanBuilder_1.OperationKind.COPY) {
                    reject(new Error("Task kind must be COPY"));
                    return;
                }
                copyData(task, this.out, this.options.oldFileFd, reject, () => {
                    index++;
                    w();
                });
            };
            w();
        });
    }
    searchHeaderListEnd(chunk, readOffset) {
        const headerListEnd = chunk.indexOf(DOUBLE_CRLF, readOffset);
        if (headerListEnd !== -1) {
            return headerListEnd + DOUBLE_CRLF.length;
        }
        // not all headers data were received, save to buffer
        const partialChunk = readOffset === 0 ? chunk : chunk.slice(readOffset);
        if (this.headerListBuffer == null) {
            this.headerListBuffer = partialChunk;
        }
        else {
            this.headerListBuffer = Buffer.concat([this.headerListBuffer, partialChunk]);
        }
        return -1;
    }
    onPartEnd() {
        const expectedLength = this.partIndexToLength[this.partIndex - 1];
        if (this.actualPartLength !== expectedLength) {
            throw (0, builder_util_runtime_1.newError)(`Expected length: ${expectedLength} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
        }
        this.actualPartLength = 0;
    }
    processPartStarted(data, start, end) {
        if (this.partIndex !== 0) {
            this.onPartEnd();
        }
        return this.processPartData(data, start, end);
    }
    processPartData(data, start, end) {
        this.actualPartLength += end - start;
        this.transferred += end - start;
        this.delta += end - start;
        const out = this.out;
        if (out.write(start === 0 && data.length === end ? data : data.slice(start, end))) {
            return Promise.resolve();
        }
        else {
            return new Promise((resolve, reject) => {
                out.on("error", reject);
                out.once("drain", () => {
                    out.removeListener("error", reject);
                    resolve();
                });
            });
        }
    }
}
exports.DataSplitter = DataSplitter;
//# sourceMappingURL=DataSplitter.js.map
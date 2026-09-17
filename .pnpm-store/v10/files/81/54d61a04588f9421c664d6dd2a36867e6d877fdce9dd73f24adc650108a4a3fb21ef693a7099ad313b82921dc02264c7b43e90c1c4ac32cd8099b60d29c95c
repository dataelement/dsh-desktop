"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressDifferentialDownloadCallbackTransform = void 0;
const stream_1 = require("stream");
var OperationKind;
(function (OperationKind) {
    OperationKind[OperationKind["COPY"] = 0] = "COPY";
    OperationKind[OperationKind["DOWNLOAD"] = 1] = "DOWNLOAD";
})(OperationKind || (OperationKind = {}));
class ProgressDifferentialDownloadCallbackTransform extends stream_1.Transform {
    constructor(progressDifferentialDownloadInfo, cancellationToken, onProgress) {
        super();
        this.progressDifferentialDownloadInfo = progressDifferentialDownloadInfo;
        this.cancellationToken = cancellationToken;
        this.onProgress = onProgress;
        this.start = Date.now();
        this.transferred = 0;
        this.delta = 0;
        this.expectedBytes = 0;
        this.index = 0;
        this.operationType = OperationKind.COPY;
        this.nextUpdate = this.start + 1000;
    }
    _transform(chunk, encoding, callback) {
        if (this.cancellationToken.cancelled) {
            callback(new Error("cancelled"), null);
            return;
        }
        // Don't send progress update when copying from disk
        if (this.operationType == OperationKind.COPY) {
            callback(null, chunk);
            return;
        }
        this.transferred += chunk.length;
        this.delta += chunk.length;
        const now = Date.now();
        if (now >= this.nextUpdate &&
            this.transferred !== this.expectedBytes /* will be emitted by endRangeDownload() */ &&
            this.transferred !== this.progressDifferentialDownloadInfo.grandTotal /* will be emitted on _flush */) {
            this.nextUpdate = now + 1000;
            this.onProgress({
                total: this.progressDifferentialDownloadInfo.grandTotal,
                delta: this.delta,
                transferred: this.transferred,
                percent: (this.transferred / this.progressDifferentialDownloadInfo.grandTotal) * 100,
                bytesPerSecond: Math.round(this.transferred / ((now - this.start) / 1000)),
            });
            this.delta = 0;
        }
        callback(null, chunk);
    }
    beginFileCopy() {
        this.operationType = OperationKind.COPY;
    }
    beginRangeDownload() {
        this.operationType = OperationKind.DOWNLOAD;
        this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
    }
    endRangeDownload() {
        // _flush() will doour final 100%
        if (this.transferred !== this.progressDifferentialDownloadInfo.grandTotal) {
            this.onProgress({
                total: this.progressDifferentialDownloadInfo.grandTotal,
                delta: this.delta,
                transferred: this.transferred,
                percent: (this.transferred / this.progressDifferentialDownloadInfo.grandTotal) * 100,
                bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1000)),
            });
        }
    }
    // Called when we are 100% done with the connection/download
    _flush(callback) {
        if (this.cancellationToken.cancelled) {
            callback(new Error("cancelled"));
            return;
        }
        this.onProgress({
            total: this.progressDifferentialDownloadInfo.grandTotal,
            delta: this.delta,
            transferred: this.transferred,
            percent: 100,
            bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1000)),
        });
        this.delta = 0;
        this.transferred = 0;
        callback(null);
    }
}
exports.ProgressDifferentialDownloadCallbackTransform = ProgressDifferentialDownloadCallbackTransform;
//# sourceMappingURL=ProgressDifferentialDownloadCallbackTransform.js.map
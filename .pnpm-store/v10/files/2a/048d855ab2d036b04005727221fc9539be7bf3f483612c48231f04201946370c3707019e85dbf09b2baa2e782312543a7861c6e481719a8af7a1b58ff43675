"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifferentialDownloader = void 0;
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const fs_1 = require("fs");
const DataSplitter_1 = require("./DataSplitter");
const url_1 = require("url");
const downloadPlanBuilder_1 = require("./downloadPlanBuilder");
const multipleRangeDownloader_1 = require("./multipleRangeDownloader");
const ProgressDifferentialDownloadCallbackTransform_1 = require("./ProgressDifferentialDownloadCallbackTransform");
class DifferentialDownloader {
    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    constructor(blockAwareFileInfo, httpExecutor, options) {
        this.blockAwareFileInfo = blockAwareFileInfo;
        this.httpExecutor = httpExecutor;
        this.options = options;
        this.fileMetadataBuffer = null;
        this.logger = options.logger;
    }
    createRequestOptions() {
        const result = {
            headers: {
                ...this.options.requestHeaders,
                accept: "*/*",
            },
        };
        (0, builder_util_runtime_1.configureRequestUrl)(this.options.newUrl, result);
        // user-agent, cache-control and other common options
        (0, builder_util_runtime_1.configureRequestOptions)(result);
        return result;
    }
    doDownload(oldBlockMap, newBlockMap) {
        // we don't check other metadata like compressionMethod - generic check that it is make sense to differentially update is suitable for it
        if (oldBlockMap.version !== newBlockMap.version) {
            throw new Error(`version is different (${oldBlockMap.version} - ${newBlockMap.version}), full download is required`);
        }
        const logger = this.logger;
        const operations = (0, downloadPlanBuilder_1.computeOperations)(oldBlockMap, newBlockMap, logger);
        if (logger.debug != null) {
            logger.debug(JSON.stringify(operations, null, 2));
        }
        let downloadSize = 0;
        let copySize = 0;
        for (const operation of operations) {
            const length = operation.end - operation.start;
            if (operation.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
                downloadSize += length;
            }
            else {
                copySize += length;
            }
        }
        const newSize = this.blockAwareFileInfo.size;
        if (downloadSize + copySize + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== newSize) {
            throw new Error(`Internal error, size mismatch: downloadSize: ${downloadSize}, copySize: ${copySize}, newSize: ${newSize}`);
        }
        logger.info(`Full: ${formatBytes(newSize)}, To download: ${formatBytes(downloadSize)} (${Math.round(downloadSize / (newSize / 100))}%)`);
        return this.downloadFile(operations);
    }
    downloadFile(tasks) {
        const fdList = [];
        const closeFiles = () => {
            return Promise.all(fdList.map(openedFile => {
                return (0, fs_extra_1.close)(openedFile.descriptor).catch((e) => {
                    this.logger.error(`cannot close file "${openedFile.path}": ${e}`);
                });
            }));
        };
        return this.doDownloadFile(tasks, fdList)
            .then(closeFiles)
            .catch((e) => {
            // then must be after catch here (since then always throws error)
            return closeFiles()
                .catch(closeFilesError => {
                // closeFiles never throw error, but just to be sure
                try {
                    this.logger.error(`cannot close files: ${closeFilesError}`);
                }
                catch (errorOnLog) {
                    try {
                        console.error(errorOnLog);
                    }
                    catch (_ignored) {
                        // ok, give up and ignore error
                    }
                }
                throw e;
            })
                .then(() => {
                throw e;
            });
        });
    }
    async doDownloadFile(tasks, fdList) {
        const oldFileFd = await (0, fs_extra_1.open)(this.options.oldFile, "r");
        fdList.push({ descriptor: oldFileFd, path: this.options.oldFile });
        const newFileFd = await (0, fs_extra_1.open)(this.options.newFile, "w");
        fdList.push({ descriptor: newFileFd, path: this.options.newFile });
        const fileOut = (0, fs_1.createWriteStream)(this.options.newFile, { fd: newFileFd });
        await new Promise((resolve, reject) => {
            const streams = [];
            // Create our download info transformer if we have one
            let downloadInfoTransform = undefined;
            if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
                const expectedByteCounts = [];
                let grandTotalBytes = 0;
                for (const task of tasks) {
                    if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
                        expectedByteCounts.push(task.end - task.start);
                        grandTotalBytes += task.end - task.start;
                    }
                }
                const progressDifferentialDownloadInfo = {
                    expectedByteCounts: expectedByteCounts,
                    grandTotal: grandTotalBytes,
                };
                downloadInfoTransform = new ProgressDifferentialDownloadCallbackTransform_1.ProgressDifferentialDownloadCallbackTransform(progressDifferentialDownloadInfo, this.options.cancellationToken, this.options.onProgress);
                streams.push(downloadInfoTransform);
            }
            const digestTransform = new builder_util_runtime_1.DigestTransform(this.blockAwareFileInfo.sha512);
            // to simply debug, do manual validation to allow file to be fully written
            digestTransform.isValidateOnEnd = false;
            streams.push(digestTransform);
            // noinspection JSArrowFunctionCanBeReplacedWithShorthand
            fileOut.on("finish", () => {
                ;
                fileOut.close(() => {
                    // remove from fd list because closed successfully
                    fdList.splice(1, 1);
                    try {
                        digestTransform.validate();
                    }
                    catch (e) {
                        reject(e);
                        return;
                    }
                    resolve(undefined);
                });
            });
            streams.push(fileOut);
            let lastStream = null;
            for (const stream of streams) {
                stream.on("error", reject);
                if (lastStream == null) {
                    lastStream = stream;
                }
                else {
                    lastStream = lastStream.pipe(stream);
                }
            }
            const firstStream = streams[0];
            let w;
            if (this.options.isUseMultipleRangeRequest) {
                w = (0, multipleRangeDownloader_1.executeTasksUsingMultipleRangeRequests)(this, tasks, firstStream, oldFileFd, reject);
                w(0);
                return;
            }
            let downloadOperationCount = 0;
            let actualUrl = null;
            this.logger.info(`Differential download: ${this.options.newUrl}`);
            const requestOptions = this.createRequestOptions();
            requestOptions.redirect = "manual";
            w = (index) => {
                var _a, _b;
                if (index >= tasks.length) {
                    if (this.fileMetadataBuffer != null) {
                        firstStream.write(this.fileMetadataBuffer);
                    }
                    firstStream.end();
                    return;
                }
                const operation = tasks[index++];
                if (operation.kind === downloadPlanBuilder_1.OperationKind.COPY) {
                    // We are copying, let's not send status updates to the UI
                    if (downloadInfoTransform) {
                        downloadInfoTransform.beginFileCopy();
                    }
                    (0, DataSplitter_1.copyData)(operation, firstStream, oldFileFd, reject, () => w(index));
                    return;
                }
                const range = `bytes=${operation.start}-${operation.end - 1}`;
                requestOptions.headers.range = range;
                (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.debug) === null || _b === void 0 ? void 0 : _b.call(_a, `download range: ${range}`);
                // We are starting to download
                if (downloadInfoTransform) {
                    downloadInfoTransform.beginRangeDownload();
                }
                const request = this.httpExecutor.createRequest(requestOptions, response => {
                    response.on("error", reject);
                    response.on("aborted", () => {
                        reject(new Error("response has been aborted by the server"));
                    });
                    // Electron net handles redirects automatically, our NodeJS test server doesn't use redirects - so, we don't check 3xx codes.
                    if (response.statusCode >= 400) {
                        reject((0, builder_util_runtime_1.createHttpError)(response));
                    }
                    response.pipe(firstStream, {
                        end: false,
                    });
                    response.once("end", () => {
                        // Pass on that we are downloading a segment
                        if (downloadInfoTransform) {
                            downloadInfoTransform.endRangeDownload();
                        }
                        if (++downloadOperationCount === 100) {
                            downloadOperationCount = 0;
                            setTimeout(() => w(index), 1000);
                        }
                        else {
                            w(index);
                        }
                    });
                });
                request.on("redirect", (statusCode, method, redirectUrl) => {
                    this.logger.info(`Redirect to ${removeQuery(redirectUrl)}`);
                    actualUrl = redirectUrl;
                    (0, builder_util_runtime_1.configureRequestUrl)(new url_1.URL(actualUrl), requestOptions);
                    request.followRedirect();
                });
                this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
                request.end();
            };
            w(0);
        });
    }
    async readRemoteBytes(start, endInclusive) {
        const buffer = Buffer.allocUnsafe(endInclusive + 1 - start);
        const requestOptions = this.createRequestOptions();
        requestOptions.headers.range = `bytes=${start}-${endInclusive}`;
        let position = 0;
        await this.request(requestOptions, chunk => {
            chunk.copy(buffer, position);
            position += chunk.length;
        });
        if (position !== buffer.length) {
            throw new Error(`Received data length ${position} is not equal to expected ${buffer.length}`);
        }
        return buffer;
    }
    request(requestOptions, dataHandler) {
        return new Promise((resolve, reject) => {
            const request = this.httpExecutor.createRequest(requestOptions, response => {
                if (!(0, multipleRangeDownloader_1.checkIsRangesSupported)(response, reject)) {
                    return;
                }
                response.on("error", reject);
                response.on("aborted", () => {
                    reject(new Error("response has been aborted by the server"));
                });
                response.on("data", dataHandler);
                response.on("end", () => resolve());
            });
            this.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
            request.end();
        });
    }
}
exports.DifferentialDownloader = DifferentialDownloader;
function formatBytes(value, symbol = " KB") {
    return new Intl.NumberFormat("en").format((value / 1024).toFixed(2)) + symbol;
}
// safety
function removeQuery(url) {
    const index = url.indexOf("?");
    return index < 0 ? url : url.substring(0, index);
}
//# sourceMappingURL=DifferentialDownloader.js.map
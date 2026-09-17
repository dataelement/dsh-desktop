"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTasksUsingMultipleRangeRequests = executeTasksUsingMultipleRangeRequests;
exports.checkIsRangesSupported = checkIsRangesSupported;
const builder_util_runtime_1 = require("builder-util-runtime");
const DataSplitter_1 = require("./DataSplitter");
const downloadPlanBuilder_1 = require("./downloadPlanBuilder");
function executeTasksUsingMultipleRangeRequests(differentialDownloader, tasks, out, oldFileFd, reject) {
    const w = (taskOffset) => {
        if (taskOffset >= tasks.length) {
            if (differentialDownloader.fileMetadataBuffer != null) {
                out.write(differentialDownloader.fileMetadataBuffer);
            }
            out.end();
            return;
        }
        const nextOffset = taskOffset + 1000;
        doExecuteTasks(differentialDownloader, {
            tasks,
            start: taskOffset,
            end: Math.min(tasks.length, nextOffset),
            oldFileFd,
        }, out, () => w(nextOffset), reject);
    };
    return w;
}
function doExecuteTasks(differentialDownloader, options, out, resolve, reject) {
    let ranges = "bytes=";
    let partCount = 0;
    let grandTotalBytes = 0;
    const partIndexToTaskIndex = new Map();
    const partIndexToLength = [];
    for (let i = options.start; i < options.end; i++) {
        const task = options.tasks[i];
        if (task.kind === downloadPlanBuilder_1.OperationKind.DOWNLOAD) {
            ranges += `${task.start}-${task.end - 1}, `;
            partIndexToTaskIndex.set(partCount, i);
            partCount++;
            partIndexToLength.push(task.end - task.start);
            grandTotalBytes += task.end - task.start;
        }
    }
    if (partCount <= 1) {
        // the only remote range - copy
        const w = (index) => {
            if (index >= options.end) {
                resolve();
                return;
            }
            const task = options.tasks[index++];
            if (task.kind === downloadPlanBuilder_1.OperationKind.COPY) {
                (0, DataSplitter_1.copyData)(task, out, options.oldFileFd, reject, () => w(index));
            }
            else {
                const requestOptions = differentialDownloader.createRequestOptions();
                requestOptions.headers.Range = `bytes=${task.start}-${task.end - 1}`;
                const request = differentialDownloader.httpExecutor.createRequest(requestOptions, response => {
                    response.on("error", reject);
                    if (!checkIsRangesSupported(response, reject)) {
                        return;
                    }
                    response.pipe(out, {
                        end: false,
                    });
                    response.once("end", () => w(index));
                });
                differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
                request.end();
            }
        };
        w(options.start);
        return;
    }
    const requestOptions = differentialDownloader.createRequestOptions();
    requestOptions.headers.Range = ranges.substring(0, ranges.length - 2);
    const request = differentialDownloader.httpExecutor.createRequest(requestOptions, response => {
        if (!checkIsRangesSupported(response, reject)) {
            return;
        }
        const contentType = (0, builder_util_runtime_1.safeGetHeader)(response, "content-type");
        const m = /^multipart\/.+?\s*;\s*boundary=(?:"([^"]+)"|([^\s";]+))\s*$/i.exec(contentType);
        if (m == null) {
            reject(new Error(`Content-Type "multipart/byteranges" is expected, but got "${contentType}"`));
            return;
        }
        const dicer = new DataSplitter_1.DataSplitter(out, options, partIndexToTaskIndex, m[1] || m[2], partIndexToLength, resolve, grandTotalBytes, differentialDownloader.options.onProgress);
        dicer.on("error", reject);
        response.pipe(dicer);
        response.on("end", () => {
            setTimeout(() => {
                request.abort();
                reject(new Error("Response ends without calling any handlers"));
            }, 10000);
        });
    });
    differentialDownloader.httpExecutor.addErrorAndTimeoutHandlers(request, reject);
    request.end();
}
function checkIsRangesSupported(response, reject) {
    // Electron net handles redirects automatically, our NodeJS test server doesn't use redirects - so, we don't check 3xx codes.
    if (response.statusCode >= 400) {
        reject((0, builder_util_runtime_1.createHttpError)(response));
        return false;
    }
    if (response.statusCode !== 206) {
        const acceptRanges = (0, builder_util_runtime_1.safeGetHeader)(response, "accept-ranges");
        if (acceptRanges == null || acceptRanges === "none") {
            reject(new Error(`Server doesn't support Accept-Ranges (response code ${response.statusCode})`));
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=multipleRangeDownloader.js.map
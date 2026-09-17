"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpPublisher = void 0;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const publisher_1 = require("./publisher");
class HttpPublisher extends publisher_1.Publisher {
    constructor(context, useSafeArtifactName = false) {
        super(context);
        this.context = context;
        this.useSafeArtifactName = useSafeArtifactName;
    }
    async upload(task) {
        const fileName = (this.useSafeArtifactName ? task.safeArtifactName : null) || (0, path_1.basename)(task.file);
        if (task.fileContent != null) {
            await this.doUpload(fileName, task.arch || builder_util_1.Arch.x64, task.fileContent.length, (request, reject) => {
                if (task.timeout) {
                    request.setTimeout(task.timeout, () => {
                        request.destroy();
                        reject(new Error("Request timed out"));
                    });
                }
                return request.end(task.fileContent);
            }, task.file);
            return;
        }
        const fileStat = await (0, fs_extra_1.stat)(task.file);
        const progressBar = this.createProgressBar(fileName, fileStat.size);
        return this.doUpload(fileName, task.arch || builder_util_1.Arch.x64, fileStat.size, (request, reject) => {
            if (progressBar != null) {
                // reset (because can be called several times (several attempts)
                progressBar.update(0);
            }
            if (task.timeout) {
                request.setTimeout(task.timeout, () => {
                    request.destroy();
                    reject(new Error("Request timed out"));
                });
            }
            return this.createReadStreamAndProgressBar(task.file, fileStat, progressBar, reject).pipe(request);
        }, task.file);
    }
}
exports.HttpPublisher = HttpPublisher;
//# sourceMappingURL=httpPublisher.js.map
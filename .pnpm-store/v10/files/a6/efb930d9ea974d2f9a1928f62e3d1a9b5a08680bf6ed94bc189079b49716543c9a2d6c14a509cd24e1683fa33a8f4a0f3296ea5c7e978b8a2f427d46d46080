"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publisher = void 0;
exports.getCiTag = getCiTag;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const chalk = require("chalk");
const fs_extra_1 = require("fs-extra");
const progressBarOptions = {
    incomplete: " ",
    width: 20,
};
class Publisher {
    constructor(context) {
        this.context = context;
    }
    createProgressBar(fileName, size) {
        builder_util_1.log.info({ file: fileName, provider: this.providerName }, "uploading");
        if (this.context.progress == null || size < 512 * 1024) {
            return null;
        }
        return this.context.progress.createBar(`${" ".repeat(builder_util_1.PADDING + 2)}[:bar] :percent :etas | ${chalk.green(fileName)} to ${this.providerName}`, {
            total: size,
            ...progressBarOptions,
        });
    }
    createReadStreamAndProgressBar(file, fileStat, progressBar, reject) {
        const fileInputStream = (0, fs_extra_1.createReadStream)(file);
        fileInputStream.on("error", reject);
        if (progressBar == null) {
            return fileInputStream;
        }
        else {
            const progressStream = new builder_util_runtime_1.ProgressCallbackTransform(fileStat.size, this.context.cancellationToken, it => progressBar.tick(it.delta));
            progressStream.on("error", reject);
            return fileInputStream.pipe(progressStream);
        }
    }
}
exports.Publisher = Publisher;
function getCiTag() {
    const tag = process.env.TRAVIS_TAG ||
        process.env.APPVEYOR_REPO_TAG_NAME ||
        process.env.CIRCLE_TAG ||
        process.env.BITRISE_GIT_TAG ||
        process.env.CI_BUILD_TAG || // deprecated, GitLab uses `CI_COMMIT_TAG` instead
        process.env.CI_COMMIT_TAG ||
        process.env.BITBUCKET_TAG ||
        (process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : null);
    return tag != null && tag.length > 0 ? tag : null;
}
//# sourceMappingURL=publisher.js.map
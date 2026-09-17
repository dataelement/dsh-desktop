var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as fs from 'fs-extra';
import got, { HTTPError } from 'got';
import * as path from 'path';
import * as ProgressBar from 'progress';
const PROGRESS_BAR_DELAY_IN_SECONDS = 30;
/**
 * Default {@link Downloader} implemented with {@link https://npmjs.com/package/got | `got`}.
 * @category Downloader
 */
export class GotDownloader {
    async download(url, targetFilePath, options) {
        if (!options) {
            options = {};
        }
        const { quiet, getProgressCallback } = options, gotOptions = __rest(options, ["quiet", "getProgressCallback"]);
        let downloadCompleted = false;
        let bar;
        let progressPercent;
        let timeout = undefined;
        await fs.mkdirp(path.dirname(targetFilePath));
        const writeStream = fs.createWriteStream(targetFilePath);
        if (!quiet || !process.env.ELECTRON_GET_NO_PROGRESS) {
            const start = new Date();
            timeout = setTimeout(() => {
                if (!downloadCompleted) {
                    bar = new ProgressBar(`Downloading ${path.basename(url)}: [:bar] :percent ETA: :eta seconds `, {
                        curr: progressPercent,
                        total: 100,
                    });
                    // https://github.com/visionmedia/node-progress/issues/159
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    bar.start = start;
                }
            }, PROGRESS_BAR_DELAY_IN_SECONDS * 1000);
        }
        await new Promise((resolve, reject) => {
            const downloadStream = got.stream(url, gotOptions);
            downloadStream.on('downloadProgress', async (progress) => {
                progressPercent = progress.percent;
                if (bar) {
                    bar.update(progress.percent);
                }
                if (getProgressCallback) {
                    await getProgressCallback(progress);
                }
            });
            downloadStream.on('error', error => {
                if (error instanceof HTTPError && error.response.statusCode === 404) {
                    error.message += ` for ${error.response.url}`;
                }
                if (writeStream.destroy) {
                    writeStream.destroy(error);
                }
                reject(error);
            });
            writeStream.on('error', error => reject(error));
            writeStream.on('close', () => resolve());
            downloadStream.pipe(writeStream);
        });
        downloadCompleted = true;
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}
//# sourceMappingURL=GotDownloader.js.map
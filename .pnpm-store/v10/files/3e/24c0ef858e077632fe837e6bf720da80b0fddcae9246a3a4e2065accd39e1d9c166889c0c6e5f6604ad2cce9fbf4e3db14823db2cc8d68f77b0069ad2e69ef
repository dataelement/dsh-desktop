import fs from 'graceful-fs';
import path from 'node:path';
import ProgressBar from 'progress';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
const PROGRESS_BAR_DELAY_IN_SECONDS = 30;
/**
 * @category Downloader
 */
export class HTTPError extends Error {
    response;
    constructor(response) {
        super(`Response code ${response.status} (${response.statusText}) for ${response.url}`);
        this.response = response;
        this.name = 'HTTPError';
    }
}
/**
 * Default {@link Downloader} implemented with the built-in
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API | Fetch API}.
 * @category Downloader
 */
export class FetchDownloader {
    async download(url, targetFilePath, options = {}) {
        const { quiet, getProgressCallback, ...fetchOptions } = options;
        let downloadCompleted = false;
        let bar;
        let progressPercent;
        let timeout = undefined;
        await fs.promises.mkdir(path.dirname(targetFilePath), { recursive: true });
        if (!quiet && !process.env.ELECTRON_GET_NO_PROGRESS) {
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
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new HTTPError(response);
            }
            if (!response.body) {
                throw new Error('Response body is empty');
            }
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : null;
            let transferred = 0;
            const onProgress = (percent) => {
                progressPercent = percent;
                if (bar) {
                    bar.update(percent);
                }
                if (getProgressCallback) {
                    void getProgressCallback({ transferred, total, percent });
                }
            };
            await pipeline(Readable.fromWeb(response.body), async function* (source) {
                for await (const chunk of source) {
                    transferred += chunk.length;
                    onProgress(total ? transferred / total : 0);
                    yield chunk;
                }
            }, fs.createWriteStream(targetFilePath));
            onProgress(1);
        }
        finally {
            downloadCompleted = true;
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }
}
//# sourceMappingURL=FetchDownloader.js.map
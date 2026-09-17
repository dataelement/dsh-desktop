import { Downloader } from './Downloader.js';
/**
 * @category Downloader
 */
export interface Progress {
    /** Bytes downloaded so far. */
    transferred: number;
    /** Total bytes to download, or `null` if the response had no `Content-Length` header. */
    total: number | null;
    /**
     * Ratio of `transferred` to `total` between 0 and 1.
     * If `total` is unknown, this is 0 until the download completes, then 1.
     */
    percent: number;
}
/**
 * @category Downloader
 */
export declare class HTTPError extends Error {
    readonly response: Response;
    constructor(response: Response);
}
/**
 * @category Downloader
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/RequestInit | `RequestInit`} for possible keys/values.
 */
export type FetchDownloaderOptions = RequestInit & {
    /** Called on each chunk with the current download {@link Progress}. */
    getProgressCallback?: (progress: Progress) => Promise<void>;
    /**
     * Disables the console progress bar. Setting the `ELECTRON_GET_NO_PROGRESS`
     * environment variable to a non-empty value also does this.
     */
    quiet?: boolean;
};
/**
 * Default {@link Downloader} implemented with the built-in
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API | Fetch API}.
 * @category Downloader
 */
export declare class FetchDownloader implements Downloader<FetchDownloaderOptions> {
    download(url: string, targetFilePath: string, options?: FetchDownloaderOptions): Promise<void>;
}

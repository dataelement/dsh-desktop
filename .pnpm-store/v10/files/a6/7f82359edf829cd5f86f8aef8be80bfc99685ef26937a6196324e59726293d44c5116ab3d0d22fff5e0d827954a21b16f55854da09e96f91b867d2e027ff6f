import { Progress as GotProgress, Options as GotOptions } from 'got';
import { Downloader } from './Downloader';
/**
 * Options for the default [`got`](https://github.com/sindresorhus/got) Downloader implementation.
 *
 * @category Downloader
 * @see {@link https://github.com/sindresorhus/got/tree/v11.8.5?tab=readme-ov-file#options | `got#options`} for possible keys/values.
 */
export type GotDownloaderOptions = (GotOptions) & {
    isStream?: true;
} & {
    /**
     * if defined, triggers every time `got`'s
     * {@link https://github.com/sindresorhus/got/tree/v11.8.5?tab=readme-ov-file#downloadprogress | `downloadProgress``} event callback is triggered.
     */
    getProgressCallback?: (progress: GotProgress) => Promise<void>;
    /**
     * if `true`, disables the console progress bar (setting the `ELECTRON_GET_NO_PROGRESS`
     * environment variable to a non-empty value also does this).
     */
    quiet?: boolean;
};
/**
 * Default {@link Downloader} implemented with {@link https://npmjs.com/package/got | `got`}.
 * @category Downloader
 */
export declare class GotDownloader implements Downloader<GotDownloaderOptions> {
    download(url: string, targetFilePath: string, options?: GotDownloaderOptions): Promise<void>;
}

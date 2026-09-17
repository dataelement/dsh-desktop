/**
 * Generic interface for the artifact downloader library.
 * The default implementation is {@link GotDownloader},
 * but any custom downloader can be passed to `@electron/get` via
 * the {@link ElectronDownloadRequestOptions.downloader} option.
 *
 * @typeParam T - Options to pass to the downloader
 * @category Downloader
 */
export interface Downloader<T> {
    /**
     * Download an artifact from an arbitrary URL to a file path on system
     * @param url URL of the file to download
     * @param targetFilePath Filesystem path to download the artifact to (including the file name)
     * @param options Options to pass to the downloader
     */
    download(url: string, targetFilePath: string, options: T): Promise<void>;
}

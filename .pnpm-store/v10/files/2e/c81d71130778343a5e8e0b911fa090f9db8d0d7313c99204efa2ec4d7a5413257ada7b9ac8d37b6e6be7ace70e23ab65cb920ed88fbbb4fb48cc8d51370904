export async function getDownloaderForSystem() {
    // TODO: Resolve the downloader or default to GotDownloader
    // Current thoughts are a dot-file traversal for something like
    // ".electron.downloader" which would be a text file with the name of the
    // npm module to import() and use as the downloader
    const { GotDownloader } = await import('./GotDownloader');
    return new GotDownloader();
}
//# sourceMappingURL=downloader-resolver.js.map
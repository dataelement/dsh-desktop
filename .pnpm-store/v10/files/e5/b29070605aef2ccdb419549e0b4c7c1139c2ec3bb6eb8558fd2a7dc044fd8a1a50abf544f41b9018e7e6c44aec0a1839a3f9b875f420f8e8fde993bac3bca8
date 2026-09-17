import debug from 'debug';
import { setTimeout as sleep } from 'node:timers/promises';
const d = debug('electron-rebuild');
export async function fetchUrl(url, responseType, retries = 3) {
    if (retries === 0)
        throw new Error('Failed to fetch a clang resource, run with DEBUG=electron-rebuild for more information');
    d('downloading:', url);
    try {
        const response = await globalThis.fetch(url);
        if (!response.ok) {
            d('got bad status code:', response.status);
            await sleep(2000);
            return fetchUrl(url, responseType, retries - 1);
        }
        d('response came back OK');
        if (responseType === 'buffer') {
            return Buffer.from(await response.arrayBuffer());
        }
        return (await response.text());
    }
    catch (err) {
        d('request failed for some reason', err);
        await sleep(2000);
        return fetchUrl(url, responseType, retries - 1);
    }
}
//# sourceMappingURL=fetcher.js.map
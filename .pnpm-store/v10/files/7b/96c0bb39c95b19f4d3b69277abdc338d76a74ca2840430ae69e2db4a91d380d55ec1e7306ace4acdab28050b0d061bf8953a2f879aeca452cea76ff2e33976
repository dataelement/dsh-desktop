import { createRequire } from 'node:module';
import debug from 'debug';
const d = debug('@electron/get:proxy');
const require = createRequire(import.meta.url);
/**
 * Initializes a third-party proxy module for HTTP(S) requests. Call this function before
 * using the {@link download} and {@link downloadArtifact} APIs if you need proxy support.
 *
 * If the `ELECTRON_GET_USE_PROXY` environment variable is set to `true`, this function will be
 * called automatically for `@electron/get` requests.
 *
 * Supported environment variables are `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`.
 *
 * @category Utility
 * @see {@link https://undici.nodejs.org/#/docs/api/EnvHttpProxyAgent | `EnvHttpProxyAgent`}
 * documentation for available environment variables.
 */
export function initializeProxy() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { EnvHttpProxyAgent, setGlobalDispatcher } = require('undici');
        setGlobalDispatcher(new EnvHttpProxyAgent());
    }
    catch (e) {
        d('Could not load undici, built-in proxy support not available:', e);
    }
}
//# sourceMappingURL=proxy.js.map
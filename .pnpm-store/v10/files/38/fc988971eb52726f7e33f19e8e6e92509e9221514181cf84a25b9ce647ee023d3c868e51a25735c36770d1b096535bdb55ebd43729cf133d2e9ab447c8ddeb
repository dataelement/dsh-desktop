import * as debug from 'debug';
import { getEnv, setEnv } from './utils';
const d = debug('@electron/get:proxy');
/**
 * Initializes a third-party proxy module for HTTP(S) requests. Call this function before
 * using the {@link download} and {@link downloadArtifact} APIs if you need proxy support.
 *
 * If the `ELECTRON_GET_USE_PROXY` environment variable is set to `true`, this function will be
 * called automatically for `@electron/get` requests.
 *
 * @category Utility
 * @see {@link https://github.com/gajus/global-agent?tab=readme-ov-file#environment-variables | `global-agent`}
 * documentation for available environment variables.
 *
 * @example
 * ```sh
 * export GLOBAL_AGENT_HTTPS_PROXY="$HTTPS_PROXY"
 * ```
 */
export function initializeProxy() {
    try {
        // See: https://github.com/electron/get/pull/214#discussion_r798845713
        const env = getEnv('GLOBAL_AGENT_');
        setEnv('GLOBAL_AGENT_HTTP_PROXY', env('HTTP_PROXY'));
        setEnv('GLOBAL_AGENT_HTTPS_PROXY', env('HTTPS_PROXY'));
        setEnv('GLOBAL_AGENT_NO_PROXY', env('NO_PROXY'));
        /**
         * TODO: replace global-agent with a hpagent. @BlackHole1
         * https://github.com/sindresorhus/got/blob/HEAD/documentation/tips.md#proxying
         */
        require('global-agent').bootstrap();
    }
    catch (e) {
        d('Could not load either proxy modules, built-in proxy support not available:', e);
    }
}
//# sourceMappingURL=proxy.js.map
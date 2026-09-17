"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeProxy = void 0;
const debug = require("debug");
const utils_1 = require("./utils");
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
function initializeProxy() {
    try {
        // See: https://github.com/electron/get/pull/214#discussion_r798845713
        const env = (0, utils_1.getEnv)('GLOBAL_AGENT_');
        (0, utils_1.setEnv)('GLOBAL_AGENT_HTTP_PROXY', env('HTTP_PROXY'));
        (0, utils_1.setEnv)('GLOBAL_AGENT_HTTPS_PROXY', env('HTTPS_PROXY'));
        (0, utils_1.setEnv)('GLOBAL_AGENT_NO_PROXY', env('NO_PROXY'));
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
exports.initializeProxy = initializeProxy;
//# sourceMappingURL=proxy.js.map
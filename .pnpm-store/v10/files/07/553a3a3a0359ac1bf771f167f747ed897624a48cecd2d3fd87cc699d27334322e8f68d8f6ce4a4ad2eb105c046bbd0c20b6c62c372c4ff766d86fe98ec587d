"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronHttpExecutor = exports.NET_SESSION_NAME = void 0;
exports.getNetSession = getNetSession;
const builder_util_runtime_1 = require("builder-util-runtime");
exports.NET_SESSION_NAME = "electron-updater";
function getNetSession() {
    return require("electron").session.fromPartition(exports.NET_SESSION_NAME, {
        cache: false,
    });
}
class ElectronHttpExecutor extends builder_util_runtime_1.HttpExecutor {
    constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
        this.cachedSession = null;
    }
    async download(url, destination, options) {
        return await options.cancellationToken.createPromise((resolve, reject, onCancel) => {
            const requestOptions = {
                headers: options.headers || undefined,
                redirect: "manual",
            };
            (0, builder_util_runtime_1.configureRequestUrl)(url, requestOptions);
            (0, builder_util_runtime_1.configureRequestOptions)(requestOptions);
            this.doDownload(requestOptions, {
                destination,
                options,
                onCancel,
                callback: error => {
                    if (error == null) {
                        resolve(destination);
                    }
                    else {
                        reject(error);
                    }
                },
                responseHandler: null,
            }, 0);
        });
    }
    createRequest(options, callback) {
        // fix (node 7+) for making electron updater work when using AWS private buckets, check if headers contain Host property
        if (options.headers && options.headers.Host) {
            // set host value from headers.Host
            options.host = options.headers.Host;
            // remove header property 'Host', if not removed causes net::ERR_INVALID_ARGUMENT exception
            delete options.headers.Host;
        }
        // differential downloader can call this method very often, so, better to cache session
        if (this.cachedSession == null) {
            this.cachedSession = getNetSession();
        }
        const request = require("electron").net.request({
            ...options,
            session: this.cachedSession,
        });
        request.on("response", callback);
        if (this.proxyLoginCallback != null) {
            request.on("login", this.proxyLoginCallback);
        }
        return request;
    }
    addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
            // no way to modify request options, abort old and make a new one
            // https://github.com/electron/electron/issues/11505
            request.abort();
            if (redirectCount > this.maxRedirects) {
                reject(this.createMaxRedirectError());
            }
            else {
                handler(builder_util_runtime_1.HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
            }
        });
    }
}
exports.ElectronHttpExecutor = ElectronHttpExecutor;
//# sourceMappingURL=electronHttpExecutor.js.map
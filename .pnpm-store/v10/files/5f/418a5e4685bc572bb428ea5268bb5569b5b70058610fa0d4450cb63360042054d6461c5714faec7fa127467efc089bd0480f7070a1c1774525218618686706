"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpExecutor = exports.NodeHttpExecutor = void 0;
exports.buildGotProxyAgent = buildGotProxyAgent;
const builder_util_runtime_1 = require("builder-util-runtime");
const http_1 = require("http");
const http_proxy_agent_1 = require("http-proxy-agent");
const https = require("https");
const https_proxy_agent_1 = require("https-proxy-agent");
const stringUtil_1 = require("./stringUtil");
class NodeHttpExecutor extends builder_util_runtime_1.HttpExecutor {
    // noinspection JSMethodCanBeStatic
    // noinspection JSUnusedGlobalSymbols
    createRequest(options, callback) {
        if (process.env["https_proxy"] !== undefined && options.protocol === "https:") {
            options.agent = new https_proxy_agent_1.HttpsProxyAgent(process.env["https_proxy"]);
        }
        else if (process.env["http_proxy"] !== undefined && options.protocol === "http:") {
            options.agent = new http_proxy_agent_1.HttpProxyAgent(process.env["http_proxy"]);
        }
        return (options.protocol === "http:" ? http_1.request : https.request)(options, callback);
    }
}
exports.NodeHttpExecutor = NodeHttpExecutor;
exports.httpExecutor = new NodeHttpExecutor();
function buildGotProxyAgent() {
    // Use Array.find so a whitespace-only uppercase var doesn't block the lowercase fallback.
    const httpsProxy = [process.env.HTTPS_PROXY, process.env.https_proxy].find(v => !(0, stringUtil_1.isEmptyOrSpaces)(v));
    const httpProxy = [process.env.HTTP_PROXY, process.env.http_proxy].find(v => !(0, stringUtil_1.isEmptyOrSpaces)(v));
    if (!httpsProxy && !httpProxy) {
        return undefined;
    }
    return {
        ...(httpProxy ? { http: new http_proxy_agent_1.HttpProxyAgent(httpProxy) } : {}),
        ...(httpsProxy ? { https: new https_proxy_agent_1.HttpsProxyAgent(httpsProxy) } : {}),
    };
}
//# sourceMappingURL=nodeHttpExecutor.js.map
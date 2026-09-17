"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAndSend = exports.sendWithHttp = exports.MAX_RESPONSE_BODY_SIZE = void 0;
const zlib = require("zlib");
const stream_1 = require("stream");
const is_export_retryable_1 = require("../is-export-retryable");
const types_1 = require("../types");
const version_1 = require("../version");
const DEFAULT_USER_AGENT = `OTel-OTLP-Exporter-JavaScript/${version_1.VERSION}`;
/**
 * Maximum response body size (4 MB) that the HTTP transport will read.
 * If the server sends more data the connection is destroyed and the export
 * is treated as a non-retryable error regardless of status code.
 */
exports.MAX_RESPONSE_BODY_SIZE = 4 * 1024 * 1024;
/**
 * Sends data using http
 * @param request
 * @param url
 * @param headers
 * @param compression
 * @param userAgent
 * @param agent
 * @param data
 * @param timeoutMillis
 */
function sendWithHttp(request, url, headers, compression, userAgent, agent, data, timeoutMillis) {
    return new Promise(resolve => {
        const parsedUrl = new URL(url);
        if (userAgent) {
            headers['User-Agent'] = `${userAgent} ${DEFAULT_USER_AGENT}`;
        }
        else {
            headers['User-Agent'] = DEFAULT_USER_AGENT;
        }
        const options = {
            method: 'POST',
            headers,
            agent,
        };
        const req = request(parsedUrl, options, (res) => {
            const responseData = [];
            let responseSize = 0;
            res.on('data', (chunk) => {
                responseSize += chunk.length;
                if (responseSize > exports.MAX_RESPONSE_BODY_SIZE) {
                    const sizeError = new Error(`OTLP export response body exceeded size limit of ${exports.MAX_RESPONSE_BODY_SIZE} bytes`);
                    // Oversized responses are treated as non-retryable errors
                    // regardless of status code.
                    // Resolve before destroying: res.destroy() tears down the socket which
                    // triggers ECONNRESET on req.on('error'), so, resolving first makes that
                    // a no-op. res.on('error') does not fire because destroy() is called
                    // without an error argument.
                    resolve({ status: 'failure', error: sizeError });
                    res.destroy();
                    return;
                }
                responseData.push(chunk);
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode <= 299) {
                    resolve({
                        status: 'success',
                        data: Buffer.concat(responseData),
                    });
                }
                else if (res.statusCode &&
                    (0, is_export_retryable_1.isExportHTTPErrorRetryable)(res.statusCode)) {
                    resolve({
                        status: 'retryable',
                        retryInMillis: (0, is_export_retryable_1.parseRetryAfterToMills)(res.headers['retry-after']),
                    });
                }
                else {
                    const error = new types_1.OTLPExporterError(res.statusMessage, res.statusCode, Buffer.concat(responseData).toString());
                    resolve({
                        status: 'failure',
                        error,
                    });
                }
            });
            res.on('error', (error) => {
                // Note: 'end' may still be emitted after 'error' on the same response object, since we're resolving a promise,
                // the first call to resolve() will determine the final state.
                if (res.statusCode && res.statusCode <= 299) {
                    // If the response is successful but an error occurs while reading the response,
                    // we consider it a success since the data has been sent successfully.
                    resolve({
                        status: 'success',
                    });
                }
                else if (res.statusCode &&
                    (0, is_export_retryable_1.isExportHTTPErrorRetryable)(res.statusCode)) {
                    resolve({
                        status: 'retryable',
                        error: error,
                        retryInMillis: (0, is_export_retryable_1.parseRetryAfterToMills)(res.headers['retry-after']),
                    });
                }
                else {
                    resolve({
                        status: 'failure',
                        error,
                    });
                }
            });
        });
        req.setTimeout(timeoutMillis, () => {
            req.destroy();
            resolve({
                status: 'retryable',
                error: new Error('Request timed out'),
            });
        });
        req.on('error', (error) => {
            if (isHttpTransportNetworkErrorRetryable(error)) {
                resolve({
                    status: 'retryable',
                    error,
                });
            }
            else {
                resolve({
                    status: 'failure',
                    error,
                });
            }
        });
        compressAndSend(req, compression, data, (error) => {
            resolve({
                status: 'failure',
                error,
            });
        });
    });
}
exports.sendWithHttp = sendWithHttp;
function compressAndSend(req, compression, data, onError) {
    let dataStream = readableFromUint8Array(data);
    if (compression === 'gzip') {
        req.setHeader('Content-Encoding', 'gzip');
        dataStream = dataStream
            .on('error', onError)
            .pipe(zlib.createGzip())
            .on('error', onError);
    }
    dataStream.pipe(req).on('error', onError);
}
exports.compressAndSend = compressAndSend;
function readableFromUint8Array(buff) {
    const readable = new stream_1.Readable();
    readable.push(buff);
    readable.push(null);
    return readable;
}
function isHttpTransportNetworkErrorRetryable(error) {
    const RETRYABLE_NETWORK_ERROR_CODES = new Set([
        'ECONNRESET',
        'ECONNREFUSED',
        'EPIPE',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'ENOTFOUND',
        'ENETUNREACH',
        'EHOSTUNREACH',
    ]);
    if ('code' in error && typeof error.code === 'string') {
        return RETRYABLE_NETWORK_ERROR_CODES.has(error.code);
    }
    return false;
}
//# sourceMappingURL=http-transport-utils.js.map
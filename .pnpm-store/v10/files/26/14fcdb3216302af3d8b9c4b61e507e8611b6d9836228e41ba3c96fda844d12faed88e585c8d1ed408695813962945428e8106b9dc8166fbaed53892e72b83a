"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startS3PutObject = startS3PutObject;
exports.getS3ContentType = getS3ContentType;
const aws4_1 = require("aws4");
const fs = require("fs");
const http = require("http");
const https = require("https");
const mime = require("mime");
const path = require("path");
/**
 * Uploads a file to S3 (or S3-compatible storage) using a single PutObject request.
 * Suitable for files up to 5 GB — the S3 single-part upload limit.
 * Returns the underlying ClientRequest so callers can abort mid-flight.
 * Mirrors the behaviour of the `publish-s3` app-builder subcommand.
 */
function startS3PutObject(params) {
    const stat = fs.statSync(params.file);
    const region = params.region;
    let hostname;
    let rawPath;
    let isHttp = false;
    if (params.endpoint != null) {
        const u = new URL(params.endpoint);
        isHttp = u.protocol === "http:";
        hostname = u.port ? `${u.hostname}:${u.port}` : u.hostname;
        // path-style for custom endpoints (handles buckets whose names contain dots)
        rawPath = `/${params.bucket}/${params.key}`;
    }
    else if (params.forcePathStyle) {
        hostname = `s3.${region}.amazonaws.com`;
        rawPath = `/${params.bucket}/${params.key}`;
    }
    else {
        hostname = `${params.bucket}.s3.${region}.amazonaws.com`;
        rawPath = `/${params.key}`;
    }
    // URL-encode each path segment individually so forward-slashes in keys are preserved
    const urlPath = "/" + rawPath.slice(1).split("/").map(encodeURIComponent).join("/");
    const headers = {
        "Content-Type": params.contentType,
        "Content-Length": String(stat.size),
        // Declare the payload as unsigned so aws4 signs over this literal string
        // rather than defaulting to SHA256("") — which would not match the streamed body.
        "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    };
    if (params.acl != null) {
        headers["x-amz-acl"] = params.acl;
    }
    if (params.storageClass != null) {
        headers["x-amz-storage-class"] = params.storageClass;
    }
    if (params.serverSideEncryption != null) {
        headers["x-amz-server-side-encryption"] = params.serverSideEncryption;
    }
    const signed = (0, aws4_1.sign)({
        service: "s3",
        region,
        method: "PUT",
        host: hostname,
        path: urlPath,
        headers,
    }, params.credentials);
    const transport = isHttp ? http : https;
    let resolvePromise;
    let rejectPromise;
    const done = new Promise((res, rej) => {
        resolvePromise = res;
        rejectPromise = rej;
    });
    const req = transport.request({
        hostname: hostname.split(":")[0],
        port: hostname.includes(":") ? Number(hostname.split(":")[1]) : undefined,
        path: urlPath,
        method: "PUT",
        headers: signed.headers,
    }, res => {
        if (res.statusCode === 200) {
            res.resume();
            res.on("end", resolvePromise);
        }
        else {
            let body = "";
            let bodySize = 0;
            const MAX_ERROR_BODY = 65536;
            res.on("data", (chunk) => {
                bodySize += chunk.length;
                if (bodySize <= MAX_ERROR_BODY) {
                    body += chunk;
                }
            });
            res.on("end", () => rejectPromise(new Error(`S3 PutObject failed (HTTP ${res.statusCode}): ${body.slice(0, 512)}`)));
        }
    });
    req.on("error", rejectPromise);
    const fileStream = fs.createReadStream(params.file);
    fileStream.on("error", rejectPromise);
    req.on("close", () => fileStream.destroy());
    fileStream.pipe(req);
    return { req, done };
}
/**
 * Returns the MIME content-type for an S3 upload key, using explicit overrides
 * for formats that mime databases commonly misidentify. Mirrors the Go binary's
 * getContentType() function in pkg/publisher/s3.go.
 */
function getS3ContentType(file) {
    var _a, _b;
    const ext = path.extname(file).toLowerCase();
    const overrides = {
        ".appimage": "application/vnd.appimage",
        ".blockmap": "application/gzip",
        ".snap": "application/vnd.snap",
    };
    return (_b = (_a = overrides[ext]) !== null && _a !== void 0 ? _a : mime.getType(file)) !== null && _b !== void 0 ? _b : "application/octet-stream";
}
//# sourceMappingURL=s3UploadHelper.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucketLocation = getBucketLocation;
const aws4_1 = require("aws4");
const https_1 = require("https");
const awsCredentials_1 = require("./awsCredentials");
/**
 * Resolves the AWS region for a bucket via the S3 GetBucketLocation API (SigV4-signed).
 * Uses path-style endpoint so dotted bucket names pass TLS hostname validation.
 * Credentials are resolved via the standard provider chain (env vars → ~/.aws/credentials).
 * AWS returns an empty LocationConstraint element for us-east-1 (the implicit default region).
 * Mirrors the behaviour of the `get-bucket-location` app-builder subcommand.
 */
function getBucketLocation(bucket) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn, v) => {
            if (!settled) {
                settled = true;
                fn(v);
            }
        };
        const opts = (0, aws4_1.sign)({
            service: "s3",
            region: "us-east-1",
            method: "GET",
            host: "s3.amazonaws.com",
            path: `/${bucket}?location`,
        }, (0, awsCredentials_1.resolveAwsCredentials)());
        const req = (0, https_1.request)({
            hostname: opts.host,
            path: opts.path,
            method: opts.method,
            headers: opts.headers,
        }, res => {
            let body = "";
            let bodySize = 0;
            const MAX_BODY = 65536;
            res.on("data", (chunk) => {
                bodySize += chunk.length;
                if (bodySize > MAX_BODY) {
                    req.destroy();
                    settle(reject, new Error("GetBucketLocation response too large"));
                    return;
                }
                body += chunk;
            });
            res.on("end", () => {
                if (res.statusCode !== 200) {
                    settle(reject, new Error(`GetBucketLocation failed (HTTP ${res.statusCode}): ${body}`));
                    return;
                }
                // Response: <LocationConstraint>us-west-2</LocationConstraint> or empty element for us-east-1
                const match = body.match(/<LocationConstraint[^>]*>([^<]*)<\/LocationConstraint>/);
                const rawRegion = (match === null || match === void 0 ? void 0 : match[1]) || "";
                // "EU" is the only non-standard token GetBucketLocation ever returns — a legacy alias
                // for eu-west-1 used by buckets created before August 2014. Simple lowercasing is not
                // sufficient because "eu" is not a valid region identifier.
                const region = rawRegion === "EU" ? "eu-west-1" : rawRegion;
                if (region !== "" && !/^[a-z][a-z0-9-]+$/.test(region)) {
                    settle(reject, new Error(`GetBucketLocation returned unexpected region: ${region}`));
                    return;
                }
                settle(resolve, region || "us-east-1");
            });
        });
        req.on("error", e => settle(reject, e));
        req.end();
    });
}
//# sourceMappingURL=bucketLocation.js.map
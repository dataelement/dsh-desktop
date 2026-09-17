"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitlabPublisher = void 0;
const builder_util_1 = require("builder-util");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const promises_2 = require("fs/promises");
const builder_util_runtime_1 = require("builder-util-runtime");
const lazy_val_1 = require("lazy-val");
const mime = require("mime");
const FormData = require("form-data");
const url_1 = require("url");
const httpPublisher_1 = require("./httpPublisher");
const util_1 = require("./util");
class GitlabPublisher extends httpPublisher_1.HttpPublisher {
    constructor(context, info, version, releaseBody, releaseName) {
        super(context, true);
        this.info = info;
        this.version = version;
        this.releaseBody = releaseBody;
        this.releaseName = releaseName;
        this._release = new lazy_val_1.Lazy(() => (this.token === "__test__" ? Promise.resolve(null) : this.getOrCreateRelease()));
        this.providerName = "gitlab";
        this.releaseLogFields = null;
        let token = info.token || null;
        if ((0, builder_util_1.isEmptyOrSpaces)(token)) {
            token = process.env.GITLAB_TOKEN || null;
            if ((0, builder_util_1.isEmptyOrSpaces)(token)) {
                throw new builder_util_1.InvalidConfigurationError(`GitLab Personal Access Token is not set, neither programmatically, nor using env "GITLAB_TOKEN"`);
            }
            token = token.trim();
            if (!(0, builder_util_1.isTokenCharValid)(token)) {
                throw new builder_util_1.InvalidConfigurationError(`GitLab Personal Access Token ${(0, builder_util_runtime_1.hashSensitiveValue)(token)} contains invalid characters, please check env "GITLAB_TOKEN"`);
            }
        }
        this.token = token;
        this.host = info.host || "gitlab.com";
        this.projectId = this.resolveProjectId();
        this.baseApiPath = `https://${this.host}/api/v4`;
        if (version.startsWith("v")) {
            throw new builder_util_1.InvalidConfigurationError(`Version must not start with "v": ${version}`);
        }
        // By default, we prefix the version with "v"
        this.tag = info.vPrefixedTagName === false ? version : `v${version}`;
    }
    async getOrCreateRelease() {
        const logFields = {
            tag: this.tag,
            version: this.version,
        };
        try {
            const existingRelease = await this.getExistingRelease();
            if (existingRelease) {
                return existingRelease;
            }
            // Create new release if it doesn't exist
            return this.createRelease();
        }
        catch (error) {
            const errorInfo = this.categorizeGitlabError(error);
            builder_util_1.log.error({
                ...logFields,
                error: error.message,
                errorType: errorInfo.type,
                statusCode: errorInfo.statusCode,
            }, "Failed to get or create GitLab release");
            throw error;
        }
    }
    async getExistingRelease() {
        const url = this.buildProjectUrl("/releases");
        const releases = await this.gitlabRequest(url);
        for (const release of releases) {
            if (release.tag_name === this.tag) {
                return release;
            }
        }
        return null;
    }
    async getDefaultBranch() {
        try {
            const url = this.buildProjectUrl();
            const project = await this.gitlabRequest(url);
            return project.default_branch || "main";
        }
        catch (error) {
            builder_util_1.log.warn({ error: error.message }, "Failed to get default branch, using 'main' as fallback");
            return "main";
        }
    }
    async createRelease() {
        const defaultName = this.info.vPrefixedTagName === false ? this.version : `v${this.version}`;
        const releaseName = this.releaseName || defaultName;
        const branchName = await this.getDefaultBranch();
        const description = this.releaseBody ? (0, util_1.trimStringWithWarn)(this.releaseBody, 100000, "release body exceeds GitLab limit, truncating") : `Release ${releaseName}`;
        const releaseData = {
            tag_name: this.tag,
            name: releaseName,
            description,
            ref: branchName,
        };
        builder_util_1.log.debug({
            tag: this.tag,
            name: releaseName,
            ref: branchName,
            projectId: this.projectId,
        }, "creating GitLab release");
        const url = this.buildProjectUrl("/releases");
        return this.gitlabRequest(url, releaseData, "POST");
    }
    async doUpload(fileName, arch, dataLength, requestProcessor, filePath) {
        const release = await this._release.value;
        if (release == null) {
            builder_util_1.log.warn({ file: fileName, ...this.releaseLogFields }, "skipped publishing");
            return;
        }
        const logFields = {
            file: fileName,
            arch: builder_util_1.Arch[arch],
            size: dataLength,
            uploadTarget: this.info.uploadTarget || "project_upload",
        };
        try {
            builder_util_1.log.debug(logFields, "starting GitLab upload");
            const assetPath = await this.uploadFileAndReturnAssetPath(fileName, dataLength, requestProcessor, filePath);
            // Add the uploaded file as a release asset link
            if (assetPath) {
                await this.addReleaseAssetLink(fileName, assetPath);
                builder_util_1.log.info({ ...logFields, assetPath }, "GitLab upload completed successfully");
            }
            else {
                builder_util_1.log.warn({ ...logFields }, "No asset URL found for file");
            }
            return assetPath;
        }
        catch (e) {
            const errorInfo = this.categorizeGitlabError(e);
            builder_util_1.log.error({
                ...logFields,
                error: e.message,
                errorType: errorInfo.type,
                statusCode: errorInfo.statusCode,
            }, "GitLab upload failed");
            throw e;
        }
    }
    async uploadFileAndReturnAssetPath(fileName, dataLength, requestProcessor, filePath) {
        // Default to project_upload method
        const uploadTarget = this.info.uploadTarget || "project_upload";
        let assetPath;
        if (uploadTarget === "generic_package") {
            await this.uploadToGenericPackages(fileName, dataLength, requestProcessor);
            // For generic packages, construct the download URL
            const projectId = encodeURIComponent(this.projectId);
            assetPath = `${this.baseApiPath}/projects/${projectId}/packages/generic/releases/${this.version}/${fileName}`;
        }
        else {
            // Default to project_upload
            const uploadResult = await this.uploadToProjectUpload(fileName, filePath);
            // For project uploads, construct full URL from relative path
            assetPath = `https://${this.host}${uploadResult.full_path}`;
        }
        return assetPath;
    }
    async addReleaseAssetLink(fileName, assetUrl) {
        try {
            const linkData = {
                name: fileName,
                url: assetUrl,
                link_type: "other",
            };
            const url = this.buildProjectUrl(`/releases/${this.tag}/assets/links`);
            await this.gitlabRequest(url, linkData, "POST");
            builder_util_1.log.debug({ fileName, assetUrl }, "Successfully linked asset to GitLab release");
        }
        catch (e) {
            builder_util_1.log.warn({ fileName, assetUrl, error: e.message }, "Failed to link asset to GitLab release");
            // Don't throw - the file was uploaded successfully, linking is optional
        }
    }
    async uploadToProjectUpload(fileName, filePath) {
        const uploadUrl = `${this.baseApiPath}/projects/${encodeURIComponent(this.projectId)}/uploads`;
        const parsedUrl = new url_1.URL(uploadUrl);
        // Check file size to determine upload method
        const stats = await (0, promises_1.stat)(filePath);
        const fileSize = stats.size;
        const STREAMING_THRESHOLD = 50 * 1024 * 1024; // 50MB
        const form = new FormData();
        if (fileSize > STREAMING_THRESHOLD) {
            // Use streaming for large files
            builder_util_1.log.debug({ fileName, fileSize }, "using streaming upload for large file");
            const fileStream = (0, fs_1.createReadStream)(filePath);
            form.append("file", fileStream, fileName);
        }
        else {
            // Use buffer for small files
            builder_util_1.log.debug({ fileName, fileSize }, "using buffer upload for small file");
            const fileContent = await (0, promises_2.readFile)(filePath);
            form.append("file", fileContent, fileName);
        }
        const response = await builder_util_1.httpExecutor.doApiRequest((0, builder_util_runtime_1.configureRequestOptions)({
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            headers: { ...form.getHeaders(), ...this.setAuthHeaderForToken(this.token) },
            timeout: this.info.timeout || undefined,
        }, null, "POST"), this.context.cancellationToken, (it) => form.pipe(it));
        // Parse the JSON response string
        return JSON.parse(response);
    }
    async uploadToGenericPackages(fileName, dataLength, requestProcessor) {
        const uploadUrl = `${this.baseApiPath}/projects/${encodeURIComponent(this.projectId)}/packages/generic/releases/${this.version}/${fileName}`;
        const parsedUrl = new url_1.URL(uploadUrl);
        return builder_util_1.httpExecutor.doApiRequest((0, builder_util_runtime_1.configureRequestOptions)({
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            headers: { "Content-Length": dataLength, "Content-Type": mime.getType(fileName) || "application/octet-stream", ...this.setAuthHeaderForToken(this.token) },
            timeout: this.info.timeout || undefined,
        }, null, "PUT"), this.context.cancellationToken, requestProcessor);
    }
    buildProjectUrl(path = "") {
        return new url_1.URL(`${this.baseApiPath}/projects/${encodeURIComponent(this.projectId)}${path}`);
    }
    resolveProjectId() {
        if (this.info.projectId) {
            return String(this.info.projectId);
        }
        throw new builder_util_1.InvalidConfigurationError("GitLab project ID is not specified, please set it in configuration.");
    }
    gitlabRequest(url, data = null, method = "GET") {
        return (0, builder_util_runtime_1.parseJson)(builder_util_1.httpExecutor.request((0, builder_util_runtime_1.configureRequestOptions)({
            port: url.port,
            path: url.pathname,
            protocol: url.protocol,
            hostname: url.hostname,
            headers: { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.token) },
            timeout: this.info.timeout || undefined,
        }, null, method), this.context.cancellationToken, data));
    }
    setAuthHeaderForToken(token) {
        const headers = {};
        if (token != null) {
            // If the token starts with "Bearer", it is an OAuth application secret
            // Note that the original gitlab token would not start with "Bearer"
            // it might start with "gloas-", if so user needs to add "Bearer " prefix to the token
            if (token.startsWith("Bearer")) {
                headers.authorization = token;
            }
            else {
                headers["PRIVATE-TOKEN"] = token;
            }
        }
        return headers;
    }
    categorizeGitlabError(error) {
        if (error instanceof builder_util_runtime_1.HttpError) {
            const statusCode = error.statusCode;
            switch (statusCode) {
                case 401:
                    return { type: "authentication", statusCode };
                case 403:
                    return { type: "authorization", statusCode };
                case 404:
                    return { type: "not_found", statusCode };
                case 409:
                    return { type: "conflict", statusCode };
                case 413:
                    return { type: "file_too_large", statusCode };
                case 422:
                    return { type: "validation_error", statusCode };
                case 429:
                    return { type: "rate_limit", statusCode };
                case 500:
                case 502:
                case 503:
                case 504:
                    return { type: "server_error", statusCode };
                default:
                    return { type: "http_error", statusCode };
            }
        }
        if (error.code === "ECONNRESET" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
            return { type: "network_error" };
        }
        return { type: "unknown_error" };
    }
    toString() {
        return `GitLab (project: ${this.projectId}, version: ${this.version})`;
    }
}
exports.GitlabPublisher = GitlabPublisher;
//# sourceMappingURL=gitlabPublisher.js.map
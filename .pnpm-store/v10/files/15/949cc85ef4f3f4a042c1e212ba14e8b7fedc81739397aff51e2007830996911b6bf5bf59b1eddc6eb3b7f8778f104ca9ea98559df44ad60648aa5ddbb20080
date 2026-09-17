"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsSignToolManager = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const lazy_val_1 = require("lazy-val");
const path = require("path");
const AppxTarget_1 = require("../targets/AppxTarget");
const windows_1 = require("../toolsets/windows");
const resolve_1 = require("../util/resolve");
const certInfo_1 = require("./certInfo");
const vm_1 = require("../vm/vm");
const codesign_1 = require("./codesign");
class WindowsSignToolManager {
    constructor(packager) {
        this.packager = packager;
        this.computedPublisherName = new lazy_val_1.Lazy(async () => {
            var _a;
            const publisherName = (_a = this.platformSpecificBuildOptions.signtoolOptions) === null || _a === void 0 ? void 0 : _a.publisherName;
            if (publisherName === null) {
                return null;
            }
            else if (publisherName != null) {
                return (0, builder_util_1.asArray)(publisherName);
            }
            const certInfo = await this.lazyCertInfo.value;
            return certInfo == null ? null : [certInfo.commonName];
        });
        this.lazyCertInfo = new builder_util_runtime_1.MemoLazy(() => this.cscInfo, async (csc) => {
            const cscInfo = await csc.value;
            if (cscInfo == null) {
                return null;
            }
            if ("subject" in cscInfo) {
                const bloodyMicrosoftSubjectDn = cscInfo.subject;
                return {
                    commonName: (0, builder_util_runtime_1.parseDn)(bloodyMicrosoftSubjectDn).get("CN"),
                    bloodyMicrosoftSubjectDn,
                };
            }
            const cscFile = cscInfo.file;
            if (cscFile == null) {
                return null;
            }
            return await this.getCertInfo(cscFile, cscInfo.password || "");
        });
        this.cscInfo = new builder_util_runtime_1.MemoLazy(() => this.platformSpecificBuildOptions, platformSpecificBuildOptions => {
            var _a, _b, _c;
            const subjectName = (_a = platformSpecificBuildOptions.signtoolOptions) === null || _a === void 0 ? void 0 : _a.certificateSubjectName;
            const shaType = (_b = platformSpecificBuildOptions.signtoolOptions) === null || _b === void 0 ? void 0 : _b.certificateSha1;
            if (subjectName != null || shaType != null) {
                return this.packager.vm.value
                    .then(vm => this.getCertificateFromStoreInfo(platformSpecificBuildOptions, vm))
                    .catch((e) => {
                    var _a;
                    // https://github.com/electron-userland/electron-builder/pull/2397
                    if (((_a = platformSpecificBuildOptions.signtoolOptions) === null || _a === void 0 ? void 0 : _a.sign) == null) {
                        throw e;
                    }
                    else {
                        builder_util_1.log.debug({ error: e }, "getCertificateFromStoreInfo error");
                        return null;
                    }
                });
            }
            const certificateFile = (_c = platformSpecificBuildOptions.signtoolOptions) === null || _c === void 0 ? void 0 : _c.certificateFile;
            if (certificateFile != null) {
                const certificatePassword = this.packager.getCscPassword();
                return Promise.resolve({
                    file: certificateFile,
                    password: certificatePassword == null ? null : certificatePassword.trim(),
                });
            }
            const cscLink = this.packager.getCscLink("WIN_CSC_LINK");
            if (cscLink == null || cscLink === "") {
                return Promise.resolve(null);
            }
            return ((0, codesign_1.importCertificate)(cscLink, this.packager.info.tempDirManager, this.packager.projectDir)
                // before then
                .catch((e) => {
                if (e instanceof builder_util_1.InvalidConfigurationError) {
                    throw new builder_util_1.InvalidConfigurationError(`Env WIN_CSC_LINK is not correct, cannot resolve: ${e.message}`);
                }
                else {
                    throw e;
                }
            })
                .then(path => {
                return {
                    file: path,
                    password: this.packager.getCscPassword(),
                };
            }));
        });
        this.platformSpecificBuildOptions = packager.platformSpecificBuildOptions;
    }
    initialize() {
        return Promise.resolve();
    }
    // https://github.com/electron-userland/electron-builder/issues/2108#issuecomment-333200711
    async computePublisherName(target, publisherName) {
        if (target instanceof AppxTarget_1.default && (await this.cscInfo.value) == null) {
            builder_util_1.log.info({ reason: "Windows Store only build" }, "AppX is not signed");
            return publisherName || "CN=ms";
        }
        const certInfo = await this.lazyCertInfo.value;
        const publisher = publisherName || (certInfo == null ? null : certInfo.bloodyMicrosoftSubjectDn);
        if (publisher == null) {
            throw new Error("Internal error: cannot compute subject using certificate info");
        }
        return publisher;
    }
    async signFile(options) {
        var _a, _b;
        let hashes = (_a = options.options.signtoolOptions) === null || _a === void 0 ? void 0 : _a.signingHashAlgorithms;
        // msi does not support dual-signing
        if (options.path.endsWith(".msi")) {
            hashes = [hashes != null && !hashes.includes("sha1") ? "sha256" : "sha1"];
        }
        else if (options.path.endsWith(".appx")) {
            hashes = ["sha256"];
        }
        else if (hashes == null) {
            hashes = ["sha1", "sha256"];
        }
        else {
            hashes = Array.isArray(hashes) ? hashes : [hashes];
        }
        const name = this.packager.appInfo.productName;
        const site = await this.packager.appInfo.computePackageUrl();
        const customSign = await (0, resolve_1.resolveFunction)(this.packager.appInfo.type, (_b = options.options.signtoolOptions) === null || _b === void 0 ? void 0 : _b.sign, "sign", await this.packager.info.getWorkspaceRoot());
        const cscInfo = await this.cscInfo.value;
        if (cscInfo) {
            let logInfo = {
                file: builder_util_1.log.filePath(options.path),
            };
            if ("file" in cscInfo) {
                logInfo = {
                    ...logInfo,
                    certificateFile: cscInfo.file,
                };
            }
            else {
                logInfo = {
                    ...logInfo,
                    subject: cscInfo.subject,
                    thumbprint: cscInfo.thumbprint,
                    store: cscInfo.store,
                    user: cscInfo.isLocalMachineStore ? "local machine" : "current user",
                };
            }
            builder_util_1.log.info(logInfo, "signing");
        }
        else if (!customSign) {
            builder_util_1.log.debug({ signHook: !!customSign, cscInfo }, "no signing info identified, signing is skipped");
            return false;
        }
        const executor = customSign || ((config, packager) => this.doSign(config, packager));
        let isNest = false;
        for (const hash of hashes) {
            const taskConfiguration = { ...options, name, site, cscInfo, hash, isNest };
            await Promise.resolve(executor({
                ...taskConfiguration,
                computeSignToolArgs: isWin => this.computeSignToolArgs(taskConfiguration, isWin),
            }, this.packager));
            isNest = true;
            if (taskConfiguration.resultOutputPath != null) {
                await (0, fs_extra_1.rename)(taskConfiguration.resultOutputPath, options.path);
            }
        }
        return true;
    }
    async getCertInfo(file, password) {
        const errorMessagePrefix = "Cannot extract publisher name from code signing certificate. As workaround, set win.publisherName. Error: ";
        try {
            return await (0, certInfo_1.readCertInfo)(file, password);
        }
        catch (e) {
            throw new builder_util_1.InvalidConfigurationError(`${errorMessagePrefix}${e.message || e}`);
        }
    }
    // on windows be aware of http://stackoverflow.com/a/32640183/1910191
    computeSignToolArgs(options, isWin, vm = new vm_1.VmManager()) {
        return isWin ? this.computeWindowsSignArgs(options, vm) : this.computeOsslsigncodeArgs(options, vm);
    }
    computeWindowsSignArgs(options, vm) {
        var _a, _b, _c, _d;
        const inputFile = vm.toVmFile(options.path);
        const args = ["sign"];
        // Timestamping
        if (process.env.ELECTRON_BUILDER_OFFLINE !== "true") {
            const isRfc3161 = options.isNest || options.hash === "sha256";
            args.push(isRfc3161 ? "/tr" : "/t");
            const timestampUrl = isRfc3161
                ? ((_a = options.options.signtoolOptions) === null || _a === void 0 ? void 0 : _a.rfc3161TimeStampServer) || "http://timestamp.digicert.com"
                : ((_b = options.options.signtoolOptions) === null || _b === void 0 ? void 0 : _b.timeStampServer) || "http://timestamp.digicert.com";
            args.push(timestampUrl);
        }
        // Certificate
        this.addCertificateArgs(args, options, vm, true);
        // Hash algorithm
        const isLegacyToolset = ((_c = this.packager.config.toolsets) === null || _c === void 0 ? void 0 : _c.winCodeSign) === "0.0.0" || ((_d = this.packager.config.toolsets) === null || _d === void 0 ? void 0 : _d.winCodeSign) == null;
        if (isLegacyToolset) {
            // Legacy || v0.0.0: Only add /fd for non-SHA1 (original behavior)
            if (options.hash !== "sha1") {
                args.push("/fd", options.hash);
                if (process.env.ELECTRON_BUILDER_OFFLINE !== "true") {
                    args.push("/td", "sha256");
                }
            }
        }
        else {
            // Modern: Always add /fd (required by new Windows Kits)
            args.push("/fd", options.hash.toLowerCase());
            // Only add /td for RFC3161 timestamps (incompatible with /t)
            if (process.env.ELECTRON_BUILDER_OFFLINE !== "true" && (options.isNest || options.hash === "sha256")) {
                args.push("/td", "sha256");
            }
        }
        // Optional parameters
        this.addCommonSigningArgs(args, options, vm, true);
        // Windows-specific
        args.push("/debug");
        args.push(inputFile); // Must be last
        return args;
    }
    computeOsslsigncodeArgs(options, vm) {
        var _a;
        const inputFile = vm.toVmFile(options.path);
        const outputPath = this.getOutputPath(inputFile, options.hash);
        options.resultOutputPath = outputPath;
        const args = ["sign", "-in", inputFile, "-out", outputPath];
        // Timestamping
        if (process.env.ELECTRON_BUILDER_OFFLINE !== "true") {
            const timestampUrl = ((_a = options.options.signtoolOptions) === null || _a === void 0 ? void 0 : _a.timeStampServer) || "http://timestamp.digicert.com";
            args.push("-t", timestampUrl);
        }
        // Certificate
        this.addCertificateArgs(args, options, vm, false);
        // Hash algorithm
        args.push("-h", options.hash.toLowerCase());
        // Optional parameters
        this.addCommonSigningArgs(args, options, vm, false);
        // Proxy support
        const httpsProxy = process.env.HTTPS_PROXY;
        if (httpsProxy === null || httpsProxy === void 0 ? void 0 : httpsProxy.length) {
            args.push("-p", httpsProxy);
        }
        return args;
    }
    addCertificateArgs(args, options, vm, isWin) {
        if (options.cscInfo == null) {
            throw new Error("No code signing certificate configured. Provide certificateFile, certificateSha1, or certificateSubjectName.");
        }
        const certificateFile = options.cscInfo.file;
        if (certificateFile == null) {
            // Certificate from store (Windows only)
            if (!isWin) {
                throw new Error("certificateSha1/certificateSubjectName supported only on Windows");
            }
            const cscInfo = options.cscInfo;
            args.push("/sha1", cscInfo.thumbprint);
            args.push("/s", cscInfo.store);
            if (cscInfo.isLocalMachineStore) {
                args.push("/sm");
            }
        }
        else {
            // Certificate file
            const certExtension = path.extname(certificateFile);
            if (certExtension === ".p12" || certExtension === ".pfx") {
                args.push(isWin ? "/f" : "-pkcs12", vm.toVmFile(certificateFile));
            }
            else {
                throw new Error(`Please specify pkcs12 (.p12/.pfx) file, ${certificateFile} is not correct`);
            }
        }
    }
    addCommonSigningArgs(args, options, vm, isWin) {
        var _a, _b;
        if (options.name) {
            args.push(isWin ? "/d" : "-n", options.name);
        }
        if (options.site) {
            args.push(isWin ? "/du" : "-i", options.site);
        }
        if (options.isNest) {
            args.push(isWin ? "/as" : "-nest");
        }
        const password = (_a = options.cscInfo) === null || _a === void 0 ? void 0 : _a.password;
        if (password) {
            args.push(isWin ? "/p" : "-pass", password);
        }
        const additionalCert = (_b = options.options.signtoolOptions) === null || _b === void 0 ? void 0 : _b.additionalCertificateFile;
        if (additionalCert) {
            args.push(isWin ? "/ac" : "-ac", vm.toVmFile(additionalCert));
        }
    }
    getOutputPath(inputPath, hash) {
        const extension = path.extname(inputPath);
        return path.join(path.dirname(inputPath), `${path.basename(inputPath, extension)}-signed-${hash}${extension}`);
    }
    async getCertificateFromStoreInfo(options, vm) {
        var _a, _b, _c;
        const certificateSubjectName = (_a = options.signtoolOptions) === null || _a === void 0 ? void 0 : _a.certificateSubjectName;
        const certificateSha1 = (_c = (_b = options.signtoolOptions) === null || _b === void 0 ? void 0 : _b.certificateSha1) === null || _c === void 0 ? void 0 : _c.toUpperCase();
        const ps = await vm.powershellCommand.value;
        const rawResult = await vm.exec(ps, [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-ChildItem -Recurse Cert: -CodeSigningCert | Select-Object -Property Subject,PSParentPath,Thumbprint | ConvertTo-Json -Compress",
        ]);
        const certList = rawResult.length === 0 ? [] : (0, builder_util_1.asArray)(JSON.parse(rawResult));
        for (const certInfo of certList) {
            if ((certificateSubjectName != null && !certInfo.Subject.includes(certificateSubjectName)) ||
                (certificateSha1 != null && certInfo.Thumbprint.toUpperCase() !== certificateSha1)) {
                continue;
            }
            const parentPath = certInfo.PSParentPath;
            const store = parentPath.substring(parentPath.lastIndexOf("\\") + 1);
            builder_util_1.log.debug({ store, PSParentPath: parentPath }, "auto-detect certificate store");
            // https://github.com/electron-userland/electron-builder/issues/1717
            const isLocalMachineStore = parentPath.includes("Certificate::LocalMachine");
            builder_util_1.log.debug(null, "auto-detect using of LocalMachine store");
            return {
                thumbprint: certInfo.Thumbprint,
                subject: certInfo.Subject,
                store,
                isLocalMachineStore,
            };
        }
        throw new Error(`Cannot find certificate ${certificateSubjectName || certificateSha1}, all certs: ${rawResult}`);
    }
    async getToolPath(isWin = process.platform === "win32") {
        var _a;
        return (0, windows_1.getSignToolPath)((_a = this.packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.winCodeSign, isWin);
    }
    async doSign(configuration, packager) {
        var _a;
        // https://github.com/electron-userland/electron-builder/pull/1944
        const timeout = parseInt(process.env.SIGNTOOL_TIMEOUT, 10) || 10 * 60 * 1000;
        // decide runtime argument by cases
        let args;
        let vm;
        const useVmIfNotOnWin = configuration.path.endsWith(".appx") || !("file" in configuration.cscInfo); /* certificateSubjectName and other such options */
        const isWin = process.platform === "win32" || useVmIfNotOnWin;
        const toolInfo = await (0, windows_1.getSignToolPath)((_a = this.packager.config.toolsets) === null || _a === void 0 ? void 0 : _a.winCodeSign, isWin);
        const tool = toolInfo.path;
        if (useVmIfNotOnWin) {
            vm = await packager.vm.value;
            args = this.computeSignToolArgs(configuration, isWin, vm);
        }
        else {
            vm = new vm_1.VmManager();
            args = configuration.computeSignToolArgs(isWin);
        }
        await (0, builder_util_1.retry)(() => vm.exec(tool, args, { timeout, env: { ...process.env, ...(toolInfo.env || {}) } }), {
            retries: 2,
            interval: 15000,
            backoff: 10000,
            shouldRetry: (e) => {
                if (e.message.includes("The file is being used by another process") ||
                    e.message.includes("The specified timestamp server either could not be reached") ||
                    e.message.includes("No certificates were found that met all the given criteria.")) {
                    builder_util_1.log.warn(`Attempt to code sign failed, another attempt will be made in 15 seconds: ${e.message}`);
                    return true;
                }
                return false;
            },
        });
    }
}
exports.WindowsSignToolManager = WindowsSignToolManager;
//# sourceMappingURL=windowsSignToolManager.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Packager = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const fs_extra_1 = require("fs-extra");
const ci_info_1 = require("ci-info");
const lazy_val_1 = require("lazy-val");
const os_1 = require("os");
const path = require("path");
const appInfo_1 = require("./appInfo");
const asar_1 = require("./asar/asar");
const core_1 = require("./core");
const ElectronFramework_1 = require("./electron/ElectronFramework");
const LibUiFramework_1 = require("./frameworks/LibUiFramework");
const ProtonFramework_1 = require("./ProtonFramework");
const targetFactory_1 = require("./targets/targetFactory");
const config_1 = require("./util/config/config");
const macroExpander_1 = require("./util/macroExpander");
const packageMetadata_1 = require("./util/packageMetadata");
const repositoryInfo_1 = require("./util/repositoryInfo");
const resolve_1 = require("./util/resolve");
const yarn_1 = require("./util/yarn");
const version_1 = require("./version");
const asyncEventEmitter_1 = require("./util/asyncEventEmitter");
const tiny_async_pool_1 = require("tiny-async-pool");
const node_module_collector_1 = require("./node-module-collector");
async function createFrameworkInfo(configuration, packager) {
    let framework = configuration.framework;
    if (framework != null) {
        framework = framework.toLowerCase();
    }
    let nodeVersion = configuration.nodeVersion;
    if (framework === "electron" || framework == null) {
        return await (0, ElectronFramework_1.createElectronFrameworkSupport)(configuration, packager);
    }
    if (nodeVersion == null || nodeVersion === "current") {
        nodeVersion = process.versions.node;
    }
    const isUseLaunchUi = configuration.launchUiVersion !== false;
    if (framework === "proton" || framework === "proton-native") {
        return new ProtonFramework_1.ProtonFramework(nodeVersion, packager.appInfo.productFilename, isUseLaunchUi);
    }
    else if (framework === "libui") {
        return new LibUiFramework_1.LibUiFramework(nodeVersion, packager.appInfo.productFilename, isUseLaunchUi);
    }
    else {
        throw new builder_util_1.InvalidConfigurationError(`Unknown framework: ${framework}`);
    }
}
class Packager {
    get appDir() {
        return this._appDir;
    }
    async getPackageManager() {
        return (await this._packageManager.value).pm;
    }
    async getWorkspaceRoot() {
        return (await (await this._packageManager.value).workspaceRoot) || this.projectDir;
    }
    get metadata() {
        return this._metadata;
    }
    get originalMetadata() {
        return this._originalMetadata;
    }
    /** The "name" field from package.json. */
    get nodePackageName() {
        return this.originalMetadata.name;
    }
    get areNodeModulesHandledExternally() {
        return this._nodeModulesHandledExternally;
    }
    get isPrepackedAppAsar() {
        return this._isPrepackedAppAsar;
    }
    get devMetadata() {
        return this._devMetadata;
    }
    get config() {
        return this._configuration;
    }
    get appInfo() {
        return this._appInfo;
    }
    get repositoryInfo() {
        return this._repositoryInfo.value;
    }
    get buildResourcesDir() {
        let result = this._buildResourcesDir;
        if (result == null) {
            result = path.resolve(this.projectDir, this.relativeBuildResourcesDirname);
            this._buildResourcesDir = result;
        }
        return result;
    }
    get relativeBuildResourcesDirname() {
        return this.config.directories.buildResources;
    }
    get framework() {
        return this._framework;
    }
    disposeOnBuildFinish(disposer) {
        this.toDispose.push(disposer);
    }
    //noinspection JSUnusedGlobalSymbols
    constructor(options, cancellationToken = new builder_util_runtime_1.CancellationToken()) {
        this.cancellationToken = cancellationToken;
        /** Stores original metadata merged with extraMetadata from configuration. */
        this._metadata = null;
        /** Stores original metadata from package.json before merging with extraMetadata. */
        this._originalMetadata = null;
        this._nodeModulesHandledExternally = false;
        this._isPrepackedAppAsar = false;
        this._devMetadata = null;
        this._configuration = null;
        this.isTwoPackageJsonProjectLayoutUsed = false;
        this.eventEmitter = new asyncEventEmitter_1.AsyncEventEmitter();
        this._appInfo = null;
        this.tempDirManager = new builder_util_1.TmpDir("packager");
        this._repositoryInfo = new lazy_val_1.Lazy(() => (0, repositoryInfo_1.getRepositoryInfo)(this.projectDir, this.metadata, this.devMetadata));
        this.debugLogger = new builder_util_1.DebugLogger(builder_util_1.log.isDebugEnabled);
        this.runtimeEnvironmentVariables = {};
        this.stageDirPathCustomizer = (target, packager, arch) => {
            return path.join(target.outDir, `__${target.name}-${(0, builder_util_1.getArtifactArchName)(arch, target.name)}`);
        };
        this._buildResourcesDir = null;
        this._framework = null;
        this.toDispose = [];
        if ("devMetadata" in options) {
            throw new builder_util_1.InvalidConfigurationError("devMetadata in the options is deprecated, please use config instead");
        }
        if ("extraMetadata" in options) {
            throw new builder_util_1.InvalidConfigurationError("extraMetadata in the options is deprecated, please use config.extraMetadata instead");
        }
        const targets = options.targets || new Map();
        if (options.targets == null) {
            options.targets = targets;
        }
        function processTargets(platform, types) {
            function commonArch(currentIfNotSpecified) {
                const result = Array();
                return result.length === 0 && currentIfNotSpecified ? [(0, builder_util_1.archFromString)(process.arch)] : result;
            }
            let archToType = targets.get(platform);
            if (archToType == null) {
                archToType = new Map();
                targets.set(platform, archToType);
            }
            if (types.length === 0) {
                for (const arch of commonArch(false)) {
                    archToType.set(arch, []);
                }
                return;
            }
            for (const type of types) {
                const suffixPos = type.lastIndexOf(":");
                if (suffixPos > 0) {
                    (0, builder_util_1.addValue)(archToType, (0, builder_util_1.archFromString)(type.substring(suffixPos + 1)), type.substring(0, suffixPos));
                }
                else {
                    for (const arch of commonArch(true)) {
                        (0, builder_util_1.addValue)(archToType, arch, type);
                    }
                }
            }
        }
        if (options.mac != null) {
            processTargets(core_1.Platform.MAC, options.mac);
        }
        if (options.linux != null) {
            processTargets(core_1.Platform.LINUX, options.linux);
        }
        if (options.win != null) {
            processTargets(core_1.Platform.WINDOWS, options.win);
        }
        this.projectDir = (0, builder_util_1.sanitizeDirPath)(options.projectDir == null ? process.cwd() : options.projectDir);
        this._appDir = this.projectDir;
        this._packageManager = (0, node_module_collector_1.determinePackageManagerEnv)({ projectDir: this.projectDir, appDir: this.appDir, workspaceRoot: undefined });
        this.options = {
            ...options,
            prepackaged: options.prepackaged == null ? null : (0, builder_util_1.sanitizeDirPath)(path.resolve(this.projectDir, options.prepackaged)),
        };
        builder_util_1.log.info({ version: version_1.PACKAGE_VERSION, os: (0, os_1.release)() }, "electron-builder");
    }
    async addPackagerEventHandlers() {
        const { type } = this.appInfo;
        const root = await this.getWorkspaceRoot();
        this.eventEmitter.on("artifactBuildStarted", await (0, resolve_1.resolveFunction)(type, this.config.artifactBuildStarted, "artifactBuildStarted", root), "user");
        this.eventEmitter.on("artifactBuildCompleted", await (0, resolve_1.resolveFunction)(type, this.config.artifactBuildCompleted, "artifactBuildCompleted", root), "user");
        this.eventEmitter.on("appxManifestCreated", await (0, resolve_1.resolveFunction)(type, this.config.appxManifestCreated, "appxManifestCreated", root), "user");
        this.eventEmitter.on("msiProjectCreated", await (0, resolve_1.resolveFunction)(type, this.config.msiProjectCreated, "msiProjectCreated", root), "user");
        this.eventEmitter.on("beforePack", await (0, resolve_1.resolveFunction)(type, this.config.beforePack, "beforePack", root), "user");
        this.eventEmitter.on("afterExtract", await (0, resolve_1.resolveFunction)(type, this.config.afterExtract, "afterExtract", root), "user");
        this.eventEmitter.on("afterPack", await (0, resolve_1.resolveFunction)(type, this.config.afterPack, "afterPack", root), "user");
        this.eventEmitter.on("afterSign", await (0, resolve_1.resolveFunction)(type, this.config.afterSign, "afterSign", root), "user");
    }
    onAfterPack(handler) {
        this.eventEmitter.on("afterPack", handler);
        return this;
    }
    onArtifactCreated(handler) {
        this.eventEmitter.on("artifactCreated", handler);
        return this;
    }
    filterPackagerEventListeners(event, type) {
        return this.eventEmitter.filterListeners(event, type);
    }
    clearPackagerEventListeners() {
        this.eventEmitter.clear();
    }
    async emitArtifactBuildStarted(event, logFields) {
        builder_util_1.log.info(logFields || {
            target: event.targetPresentableName,
            arch: event.arch == null ? null : builder_util_1.Arch[event.arch],
            file: builder_util_1.log.filePath(event.file),
        }, "building");
        await this.eventEmitter.emit("artifactBuildStarted", event);
    }
    /**
     * Only for sub artifacts (update info), for main artifacts use `callArtifactBuildCompleted`.
     */
    async emitArtifactCreated(event) {
        await this.eventEmitter.emit("artifactCreated", event);
    }
    async emitArtifactBuildCompleted(event) {
        await this.eventEmitter.emit("artifactBuildCompleted", event);
        await this.emitArtifactCreated(event);
    }
    async emitAppxManifestCreated(path) {
        await this.eventEmitter.emit("appxManifestCreated", path);
    }
    async emitMsiProjectCreated(path) {
        await this.eventEmitter.emit("msiProjectCreated", path);
    }
    async emitBeforePack(context) {
        await this.eventEmitter.emit("beforePack", context);
    }
    async emitAfterPack(context) {
        await this.eventEmitter.emit("afterPack", context);
    }
    async emitAfterSign(context) {
        await this.eventEmitter.emit("afterSign", context);
    }
    async emitAfterExtract(context) {
        await this.eventEmitter.emit("afterExtract", context);
    }
    async validateConfig() {
        let configPath = null;
        let configFromOptions = this.options.config;
        if (typeof configFromOptions === "string") {
            // it is a path to config file
            configPath = configFromOptions;
            configFromOptions = null;
        }
        else if (configFromOptions != null && typeof configFromOptions.extends === "string" && configFromOptions.extends.includes(".")) {
            configPath = configFromOptions.extends;
            delete configFromOptions.extends;
        }
        const projectDir = this.projectDir;
        const devPackageFile = path.join(projectDir, "package.json");
        this._devMetadata = await (0, builder_util_1.orNullIfFileNotExist)((0, packageMetadata_1.readPackageJson)(devPackageFile));
        const devMetadata = this.devMetadata;
        const configuration = await (0, config_1.getConfig)(projectDir, configPath, configFromOptions, new lazy_val_1.Lazy(() => Promise.resolve(devMetadata)));
        builder_util_1.log.debug({ config: getSafeEffectiveConfig(configuration) }, "effective config");
        this._appDir = await (0, config_1.computeDefaultAppDirectory)(projectDir, configuration.directories.app);
        this.isTwoPackageJsonProjectLayoutUsed = this._appDir !== projectDir;
        const appPackageFile = this.isTwoPackageJsonProjectLayoutUsed ? path.join(this.appDir, "package.json") : devPackageFile;
        // tslint:disable:prefer-conditional-expression
        if (this.devMetadata != null && !this.isTwoPackageJsonProjectLayoutUsed) {
            this._metadata = this.devMetadata;
        }
        else {
            this._metadata = await this.readProjectMetadataIfTwoPackageStructureOrPrepacked(appPackageFile);
        }
        this._originalMetadata = (0, builder_util_runtime_1.deepAssign)({}, this._metadata);
        (0, builder_util_runtime_1.deepAssign)(this._metadata, configuration.extraMetadata);
        if (this.isTwoPackageJsonProjectLayoutUsed) {
            builder_util_1.log.debug({ devPackageFile, appPackageFile }, "two package.json structure is used");
        }
        (0, packageMetadata_1.checkMetadata)(this.metadata, this.devMetadata, appPackageFile, devPackageFile);
        await (0, config_1.validateConfiguration)(configuration, this.debugLogger);
        this._configuration = configuration;
        this._devMetadata = devMetadata;
    }
    // external caller of this method always uses isTwoPackageJsonProjectLayoutUsed=false and appDir=projectDir, no way (and need) to use another values
    async build(repositoryInfo) {
        await this.validateConfig();
        if (repositoryInfo != null) {
            this._repositoryInfo.value = Promise.resolve(repositoryInfo);
        }
        this._appInfo = new appInfo_1.AppInfo(this, null);
        await this.addPackagerEventHandlers();
        this._framework = await createFrameworkInfo(this.config, this);
        const commonOutDirWithoutPossibleOsMacro = path.resolve(this.projectDir, (0, macroExpander_1.expandMacro)(this.config.directories.output, null, this._appInfo, {
            os: "",
        }));
        if (!ci_info_1.isCI && process.stdout.isTTY) {
            const effectiveConfigFile = path.join(commonOutDirWithoutPossibleOsMacro, "builder-effective-config.yaml");
            builder_util_1.log.info({ file: builder_util_1.log.filePath(effectiveConfigFile) }, "writing effective config");
            await (0, fs_extra_1.outputFile)(effectiveConfigFile, getSafeEffectiveConfig(this.config));
        }
        // because artifact event maybe dispatched several times for different publish providers
        const artifactPaths = new Set();
        this.onArtifactCreated(event => {
            if (event.file != null) {
                artifactPaths.add(event.file);
            }
        });
        this.disposeOnBuildFinish(() => (0, builder_util_runtime_1.retry)(() => this.tempDirManager.cleanup(), {
            retries: 2,
            interval: 2000,
            backoff: 2000,
            cancellationToken: this.cancellationToken,
            shouldRetry: e => {
                const message = (e === null || e === void 0 ? void 0 : e.message) || "";
                const code = e === null || e === void 0 ? void 0 : e.code;
                // windows file locks
                const resourceIsBusy = message.includes("EBUSY") || code === "EBUSY";
                if (resourceIsBusy) {
                    builder_util_1.log.debug({ error: message || code }, "retrying temporary directory cleanup");
                    return true;
                }
                return false;
            },
        }));
        const platformToTargets = await (0, builder_util_1.executeFinally)(this.doBuild(), async () => {
            if (this.debugLogger.isEnabled) {
                await this.debugLogger.save(path.join(commonOutDirWithoutPossibleOsMacro, "builder-debug.yml"));
            }
            const toDispose = this.toDispose.slice();
            this.toDispose.length = 0;
            for (const disposer of toDispose) {
                await disposer().catch((e) => {
                    builder_util_1.log.warn({ error: e }, "cannot dispose");
                });
            }
        });
        return {
            outDir: commonOutDirWithoutPossibleOsMacro,
            artifactPaths: Array.from(artifactPaths),
            platformToTargets,
            configuration: this.config,
        };
    }
    async readProjectMetadataIfTwoPackageStructureOrPrepacked(appPackageFile) {
        let data = await (0, builder_util_1.orNullIfFileNotExist)((0, packageMetadata_1.readPackageJson)(appPackageFile));
        if (data != null) {
            return data;
        }
        data = await (0, builder_util_1.orNullIfFileNotExist)((0, asar_1.readAsarJson)(path.join(this.projectDir, "app.asar"), "package.json"));
        if (data != null) {
            this._isPrepackedAppAsar = true;
            return data;
        }
        throw new Error(`Cannot find package.json in the ${path.dirname(appPackageFile)}`);
    }
    async doBuild() {
        var _a;
        const taskManager = new builder_util_1.AsyncTaskManager(this.cancellationToken);
        const syncTargetsIfAny = [];
        const platformToTarget = new Map();
        const createdOutDirs = new Set();
        for (const [platform, archToType] of this.options.targets) {
            if (this.cancellationToken.cancelled) {
                break;
            }
            if (platform === core_1.Platform.MAC && process.platform === core_1.Platform.WINDOWS.nodeName) {
                throw new builder_util_1.InvalidConfigurationError("Build for macOS is supported only on macOS, please see https://electron.build/multi-platform-build");
            }
            const packager = await this.createHelper(platform);
            const nameToTarget = new Map();
            platformToTarget.set(platform, nameToTarget);
            let poolCount = Math.floor(((_a = packager.config.concurrency) === null || _a === void 0 ? void 0 : _a.jobs) || 1);
            if (poolCount < 1) {
                builder_util_1.log.warn({ concurrency: poolCount }, "concurrency is invalid, overriding with job count: 1");
                poolCount = 1;
            }
            else if (poolCount > builder_util_1.MAX_FILE_REQUESTS) {
                builder_util_1.log.warn({ concurrency: poolCount, MAX_FILE_REQUESTS: builder_util_1.MAX_FILE_REQUESTS }, `job concurrency is greater than recommended MAX_FILE_REQUESTS, this may lead to File Descriptor errors (too many files open). Proceed with caution (e.g. this is an experimental feature)`);
            }
            const packPromises = [];
            for (const [arch, targetNames] of (0, targetFactory_1.computeArchToTargetNamesMap)(archToType, packager, platform)) {
                if (this.cancellationToken.cancelled) {
                    break;
                }
                // support os and arch macro in output value
                const outDir = path.resolve(this.projectDir, packager.expandMacro(this.config.directories.output, builder_util_1.Arch[arch]));
                const targetList = (0, targetFactory_1.createTargets)(nameToTarget, targetNames.length === 0 ? packager.defaultTarget : targetNames, outDir, packager);
                await createOutDirIfNeed(targetList, createdOutDirs);
                const promise = packager.pack(outDir, arch, targetList, taskManager);
                if (poolCount < 2) {
                    await promise;
                }
                else {
                    packPromises.push(promise);
                }
            }
            await (0, tiny_async_pool_1.default)(poolCount, packPromises, async (it) => {
                if (this.cancellationToken.cancelled) {
                    return;
                }
                await it;
            });
            if (this.cancellationToken.cancelled) {
                break;
            }
            for (const target of nameToTarget.values()) {
                if (target.isAsyncSupported) {
                    taskManager.addTask(target.finishBuild());
                }
                else {
                    syncTargetsIfAny.push(target);
                }
            }
        }
        await taskManager.awaitTasks();
        for (const target of syncTargetsIfAny) {
            if (this.cancellationToken.cancelled) {
                break;
            }
            await target.finishBuild();
        }
        return platformToTarget;
    }
    async createHelper(platform) {
        if (this.options.platformPackagerFactory != null) {
            return this.options.platformPackagerFactory(this, platform);
        }
        switch (platform) {
            case core_1.Platform.MAC: {
                const helperClass = (await Promise.resolve().then(() => require("./macPackager"))).MacPackager;
                return new helperClass(this);
            }
            case core_1.Platform.WINDOWS: {
                const helperClass = (await Promise.resolve().then(() => require("./winPackager"))).WinPackager;
                return new helperClass(this);
            }
            case core_1.Platform.LINUX:
                return new (await Promise.resolve().then(() => require("./linuxPackager"))).LinuxPackager(this);
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }
    async installAppDependencies(platform, arch) {
        if (this.options.prepackaged != null || !this.framework.isNpmRebuildRequired) {
            return;
        }
        const frameworkInfo = { version: this.framework.version, useCustomDist: true };
        const config = this.config;
        if (config.nodeGypRebuild === true) {
            await (0, yarn_1.nodeGypRebuild)(platform.nodeName, builder_util_1.Arch[arch], frameworkInfo);
        }
        if (config.npmRebuild === false) {
            builder_util_1.log.info({ reason: "npmRebuild is set to false" }, "skipped dependencies rebuild");
            return;
        }
        const beforeBuild = await (0, resolve_1.resolveFunction)(this.appInfo.type, config.beforeBuild, "beforeBuild", await this.getWorkspaceRoot());
        if (beforeBuild != null) {
            const performDependenciesInstallOrRebuild = await beforeBuild({
                appDir: this.appDir,
                electronVersion: this.config.electronVersion,
                platform,
                arch: builder_util_1.Arch[arch],
            });
            // If beforeBuild resolves to false, it means that handling node_modules is done outside of electron-builder.
            this._nodeModulesHandledExternally = !performDependenciesInstallOrRebuild;
            if (!performDependenciesInstallOrRebuild) {
                return;
            }
        }
        if (config.buildDependenciesFromSource === true && platform.nodeName !== process.platform) {
            builder_util_1.log.info({ reason: "platform is different and buildDependenciesFromSource is set to true" }, "skipped dependencies rebuild");
        }
        else {
            await (0, yarn_1.installOrRebuild)(config, { appDir: this.appDir, projectDir: this.projectDir, workspaceRoot: await this.getWorkspaceRoot() }, {
                frameworkInfo,
                platform: platform.nodeName,
                arch: builder_util_1.Arch[arch],
            }, false, this.runtimeEnvironmentVariables);
        }
    }
}
exports.Packager = Packager;
function createOutDirIfNeed(targetList, createdOutDirs) {
    const ourDirs = new Set();
    for (const target of targetList) {
        // noinspection SuspiciousInstanceOfGuard
        if (target instanceof targetFactory_1.NoOpTarget) {
            continue;
        }
        const outDir = target.outDir;
        if (!createdOutDirs.has(outDir)) {
            ourDirs.add(outDir);
        }
    }
    if (ourDirs.size === 0) {
        return Promise.resolve();
    }
    return Promise.all(Array.from(ourDirs)
        .sort()
        .map(dir => {
        return (0, fs_extra_1.mkdirs)(dir)
            .then(() => (0, fs_extra_1.chmod)(dir, 0o755) /* set explicitly */)
            .then(() => createdOutDirs.add(dir));
    }));
}
function getSafeEffectiveConfig(configuration) {
    const o = JSON.parse((0, builder_util_1.safeStringifyJson)(configuration));
    if (o.cscLink != null) {
        o.cscLink = "<hidden by builder>";
    }
    return (0, builder_util_1.serializeToYaml)(o, true);
}
//# sourceMappingURL=packager.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishManager = void 0;
exports.getAppUpdatePublishConfiguration = getAppUpdatePublishConfiguration;
exports.getPublishConfigsForUpdateInfo = getPublishConfigsForUpdateInfo;
exports.createPublisher = createPublisher;
exports.computeDownloadUrl = computeDownloadUrl;
exports.getPublishConfigs = getPublishConfigs;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const debug_1 = require("debug");
const electron_publish_1 = require("electron-publish");
const multiProgress_1 = require("electron-publish/out/multiProgress");
const promises_1 = require("fs/promises");
const ci_info_1 = require("ci-info");
const path = require("path");
const url = require("url");
const index_1 = require("../index");
const macroExpander_1 = require("../util/macroExpander");
const updateInfoBuilder_1 = require("./updateInfoBuilder");
const resolve_1 = require("../util/resolve");
const pathManager_1 = require("../util/pathManager");
const publishForPrWarning = "There are serious security concerns with PUBLISH_FOR_PULL_REQUEST=true (see the  CircleCI documentation (https://circleci.com/docs/1.0/fork-pr-builds/) for details)" +
    "\nIf you have SSH keys, sensitive env vars or AWS credentials stored in your project settings and untrusted forks can make pull requests against your repo, then this option isn't for you.";
const debug = (0, debug_1.default)("electron-builder:publish");
function checkOptions(publishPolicy) {
    if (publishPolicy != null && publishPolicy !== "onTag" && publishPolicy !== "onTagOrDraft" && publishPolicy !== "always" && publishPolicy !== "never") {
        if (typeof publishPolicy === "string") {
            throw new builder_util_1.InvalidConfigurationError(`Expected one of "onTag", "onTagOrDraft", "always", "never", but got ${JSON.stringify(publishPolicy)}.\nPlease note that publish configuration should be specified under "config"`);
        }
    }
}
class PublishManager {
    constructor(packager, publishOptions, cancellationToken = packager.cancellationToken) {
        this.packager = packager;
        this.publishOptions = publishOptions;
        this.cancellationToken = cancellationToken;
        this.nameToPublisher = new Map();
        this.isPublish = false;
        this.progress = process.stdout.isTTY ? new multiProgress_1.MultiProgress() : null;
        this.updateFileWriteTask = [];
        checkOptions(publishOptions.publish);
        this.taskManager = new builder_util_1.AsyncTaskManager(cancellationToken);
        const forcePublishForPr = process.env.PUBLISH_FOR_PULL_REQUEST === "true";
        if (!(0, builder_util_1.isPullRequest)() || forcePublishForPr) {
            if (publishOptions.publish === undefined) {
                if (process.env.npm_lifecycle_event === "release") {
                    builder_util_1.log.warn("Implicit publishing triggered by npm lifecycle event 'release'. This behavior will be disabled in electron-builder v27. Please use --publish explicitly.");
                    publishOptions.publish = "always";
                }
                else {
                    const tag = (0, electron_publish_1.getCiTag)();
                    if (tag != null) {
                        builder_util_1.log.warn({ tag }, "Implicit publishing triggered by git tag. This behavior will be disabled in electron-builder v27. Please use --publish explicitly.");
                        publishOptions.publish = "onTag";
                    }
                    else if (ci_info_1.isCI) {
                        builder_util_1.log.warn("Implicit publishing triggered by CI detection. This behavior will be disabled in electron-builder v27. Please use --publish explicitly.");
                        publishOptions.publish = "onTagOrDraft";
                    }
                }
            }
            const publishPolicy = publishOptions.publish;
            this.isPublish = publishPolicy != null && publishOptions.publish !== "never" && (publishPolicy !== "onTag" || (0, electron_publish_1.getCiTag)() != null);
            if (this.isPublish && forcePublishForPr) {
                builder_util_1.log.warn(publishForPrWarning);
            }
        }
        else if (publishOptions.publish !== "never") {
            builder_util_1.log.info({
                reason: "current build is a part of pull request",
                solution: `set env PUBLISH_FOR_PULL_REQUEST to true to force code signing\n${publishForPrWarning}`,
            }, "publishing will be skipped");
        }
        packager.onAfterPack(async (event) => {
            const packager = event.packager;
            if (event.electronPlatformName === "darwin") {
                if (!event.targets.some(it => it.name === "dmg" || it.name === "zip")) {
                    return;
                }
            }
            else if (packager.platform === index_1.Platform.WINDOWS) {
                if (!event.targets.some(it => isSuitableWindowsTarget(it))) {
                    return;
                }
            }
            const publishConfig = await getAppUpdatePublishConfiguration(packager, null, event.arch, this.isPublish);
            if (publishConfig != null) {
                await (0, promises_1.writeFile)(path.join(packager.getResourcesDir(event.appOutDir), "app-update.yml"), (0, builder_util_1.serializeToYaml)(publishConfig));
            }
        });
        packager.onArtifactCreated(async (event) => {
            const publishConfiguration = event.publishConfig;
            if (publishConfiguration == null) {
                this.taskManager.addTask(this.artifactCreatedWithoutExplicitPublishConfig(event));
            }
            else if (this.isPublish) {
                if (debug.enabled) {
                    debug(`artifactCreated (isPublish: ${this.isPublish}): ${(0, builder_util_1.safeStringifyJson)(event, new Set(["packager"]))},\n  publishConfig: ${(0, builder_util_1.safeStringifyJson)(publishConfiguration)}`);
                }
                await this.scheduleUpload(publishConfiguration, event, this.getAppInfo(event.packager));
            }
        });
    }
    getAppInfo(platformPackager) {
        return platformPackager == null ? this.packager.appInfo : platformPackager.appInfo;
    }
    async getGlobalPublishConfigurations() {
        const publishers = this.packager.config.publish;
        return await resolvePublishConfigurations(publishers, null, this.packager, null, true);
    }
    async scheduleUpload(publishConfig, event, appInfo) {
        if (publishConfig.provider === "generic") {
            return;
        }
        const publisher = await this.getOrCreatePublisher(publishConfig, appInfo);
        if (publisher == null) {
            builder_util_1.log.debug({
                file: builder_util_1.log.filePath(event.file),
                reason: "publisher is null",
                publishConfig: (0, builder_util_1.safeStringifyJson)(publishConfig),
            }, "not published");
            return;
        }
        const providerName = publisher.providerName;
        if (this.publishOptions.publish === "onTagOrDraft" && (0, electron_publish_1.getCiTag)() == null && providerName !== "bitbucket" && providerName !== "github") {
            builder_util_1.log.info({ file: builder_util_1.log.filePath(event.file), reason: "current build is not for a git tag", publishPolicy: "onTagOrDraft" }, `not published to ${providerName}`);
            return;
        }
        if (publishConfig.timeout) {
            event.timeout = publishConfig.timeout;
        }
        this.taskManager.addTask(publisher.upload(event));
    }
    async artifactCreatedWithoutExplicitPublishConfig(event) {
        const platformPackager = event.packager;
        const target = event.target;
        const publishConfigs = await getPublishConfigs(platformPackager, target == null ? null : target.options, event.arch, this.isPublish);
        if (debug.enabled) {
            debug(`artifactCreated (isPublish: ${this.isPublish}): ${(0, builder_util_1.safeStringifyJson)(event, new Set(["packager"]))},\n  publishConfigs: ${(0, builder_util_1.safeStringifyJson)(publishConfigs)}`);
        }
        const eventFile = event.file;
        if (publishConfigs == null) {
            if (this.isPublish) {
                builder_util_1.log.debug({ file: eventFile, reason: "no publish configs" }, "not published");
            }
            return;
        }
        if (this.isPublish) {
            for (const publishConfig of publishConfigs) {
                if (this.cancellationToken.cancelled) {
                    builder_util_1.log.debug({ file: event.file, reason: "cancelled" }, "not published");
                    break;
                }
                await this.scheduleUpload(publishConfig, event, this.getAppInfo(platformPackager));
            }
        }
        if (event.isWriteUpdateInfo &&
            target != null &&
            eventFile != null &&
            !this.cancellationToken.cancelled &&
            (platformPackager.platform !== index_1.Platform.WINDOWS || isSuitableWindowsTarget(target))) {
            this.taskManager.addTask((0, updateInfoBuilder_1.createUpdateInfoTasks)(event, publishConfigs).then(it => this.updateFileWriteTask.push(...it)));
        }
    }
    async getOrCreatePublisher(publishConfig, appInfo) {
        // to not include token into cache key
        const providerCacheKey = (0, builder_util_1.safeStringifyJson)(publishConfig);
        let publisher = this.nameToPublisher.get(providerCacheKey);
        if (publisher == null) {
            publisher = await createPublisher(this, appInfo.version, publishConfig, this.publishOptions, this.packager);
            this.nameToPublisher.set(providerCacheKey, publisher);
            builder_util_1.log.info({ publisher: publisher.toString() }, "publishing");
        }
        return publisher;
    }
    // noinspection JSUnusedGlobalSymbols
    cancelTasks() {
        this.taskManager.cancelTasks();
        this.nameToPublisher.clear();
    }
    async awaitTasks() {
        await this.taskManager.awaitTasks();
        const updateInfoFileTasks = this.updateFileWriteTask;
        if (this.cancellationToken.cancelled || updateInfoFileTasks.length === 0) {
            return;
        }
        await (0, updateInfoBuilder_1.writeUpdateInfoFiles)(updateInfoFileTasks, this.packager);
        await this.taskManager.awaitTasks();
    }
}
exports.PublishManager = PublishManager;
async function getAppUpdatePublishConfiguration(packager, targetSpecificOptions, arch, errorIfCannot) {
    const publishConfigs = await getPublishConfigsForUpdateInfo(packager, await getPublishConfigs(packager, null, arch, errorIfCannot), arch);
    if (publishConfigs == null || publishConfigs.length === 0) {
        return null;
    }
    const publishConfig = {
        ...publishConfigs[0],
        updaterCacheDirName: packager.appInfo.updaterCacheDirName,
    };
    if (packager.platform === index_1.Platform.WINDOWS && publishConfig.publisherName == null) {
        const winPackager = packager;
        const publisherName = winPackager.isForceCodeSigningVerification ? await (await winPackager.signingManager.value).computedPublisherName.value : undefined;
        if (publisherName != null) {
            publishConfig.publisherName = publisherName;
        }
    }
    return publishConfig;
}
async function getPublishConfigsForUpdateInfo(packager, publishConfigs, arch) {
    if (publishConfigs === null) {
        return null;
    }
    if (publishConfigs.length === 0) {
        builder_util_1.log.debug(null, "getPublishConfigsForUpdateInfo: no publishConfigs, detect using repository info");
        // https://github.com/electron-userland/electron-builder/issues/925#issuecomment-261732378
        // default publish config is github, file should be generated regardless of publish state (user can test installer locally or manage the release process manually)
        const repositoryInfo = await packager.info.repositoryInfo;
        debug(`getPublishConfigsForUpdateInfo: ${(0, builder_util_1.safeStringifyJson)(repositoryInfo)}`);
        if (repositoryInfo != null && repositoryInfo.type === "github") {
            const resolvedPublishConfig = await getResolvedPublishConfig(packager, packager.info, { provider: repositoryInfo.type }, arch, false);
            if (resolvedPublishConfig != null) {
                debug(`getPublishConfigsForUpdateInfo: resolve to publish config ${(0, builder_util_1.safeStringifyJson)(resolvedPublishConfig)}`);
                return [resolvedPublishConfig];
            }
        }
    }
    return publishConfigs;
}
async function resolveReleaseBody(packager) {
    const releaseInfo = packager.config.releaseInfo;
    if (releaseInfo === null || releaseInfo === void 0 ? void 0 : releaseInfo.releaseNotes) {
        return releaseInfo.releaseNotes;
    }
    if (releaseInfo === null || releaseInfo === void 0 ? void 0 : releaseInfo.releaseNotesFile) {
        try {
            return await (0, promises_1.readFile)(path.resolve(packager.projectDir, releaseInfo.releaseNotesFile), "utf-8");
        }
        catch (e) {
            builder_util_1.log.warn({ file: releaseInfo.releaseNotesFile, error: e.message }, "cannot read release notes file");
            return null;
        }
    }
    try {
        return await (0, promises_1.readFile)(path.resolve(packager.projectDir, "release-notes.md"), "utf-8");
    }
    catch {
        return null;
    }
}
async function createPublisher(context, version, publishConfig, options, packager) {
    var _a, _b, _c, _d, _e;
    if (debug.enabled) {
        debug(`Create publisher: ${(0, builder_util_1.safeStringifyJson)(publishConfig)}`);
    }
    const provider = publishConfig.provider;
    switch (provider) {
        case "github": {
            const releaseBody = await resolveReleaseBody(packager);
            const releaseName = (_b = (_a = packager.config.releaseInfo) === null || _a === void 0 ? void 0 : _a.releaseName) !== null && _b !== void 0 ? _b : null;
            return new electron_publish_1.GitHubPublisher(context, publishConfig, version, options, releaseBody, releaseName);
        }
        case "gitlab": {
            const releaseBody = await resolveReleaseBody(packager);
            const releaseName = (_d = (_c = packager.config.releaseInfo) === null || _c === void 0 ? void 0 : _c.releaseName) !== null && _d !== void 0 ? _d : null;
            return new electron_publish_1.GitlabPublisher(context, publishConfig, version, releaseBody, releaseName);
        }
        case "keygen":
            return new electron_publish_1.KeygenPublisher(context, publishConfig, version);
        case "snapStore":
            return new electron_publish_1.SnapStorePublisher(context, publishConfig, { cscLink: (_e = packager.config.snapcraft) === null || _e === void 0 ? void 0 : _e.cscLink, resourcesDir: packager.buildResourcesDir });
        case "generic":
            return null;
        default: {
            const clazz = await requireProviderClass(provider, packager);
            return clazz == null ? null : new clazz(context, publishConfig);
        }
    }
}
async function requireProviderClass(provider, packager) {
    switch (provider) {
        case "github":
            return electron_publish_1.GitHubPublisher;
        case "gitlab":
            return electron_publish_1.GitlabPublisher;
        case "generic":
            return null;
        case "keygen":
            return electron_publish_1.KeygenPublisher;
        case "s3":
            return electron_publish_1.S3Publisher;
        case "snapStore":
            return electron_publish_1.SnapStorePublisher;
        case "spaces":
            return electron_publish_1.SpacesPublisher;
        case "bitbucket":
            return electron_publish_1.BitbucketPublisher;
        default: {
            const extensions = ["mjs", "js", "cjs"];
            const template = `electron-publisher-${provider}`;
            const name = (ext) => `${template}.${ext}`;
            const validPublisherFiles = extensions.map(ext => path.join(packager.buildResourcesDir, name(ext)));
            for (const potentialFile of validPublisherFiles) {
                if (await (0, builder_util_1.exists)(potentialFile)) {
                    const module = await (0, resolve_1.resolveModule)(packager.appInfo.type, potentialFile);
                    return module.default || module;
                }
            }
            builder_util_1.log.error({ path: builder_util_1.log.filePath(packager.buildResourcesDir), template, extensionsChecked: extensions }, "unable to find publish provider in build resources");
            throw new builder_util_1.InvalidConfigurationError(`Cannot find module for publisher "${provider}" with any extension: ${extensions.join(", ")}`);
        }
    }
}
function computeDownloadUrl(publishConfiguration, fileName, packager) {
    if (publishConfiguration.provider === "generic") {
        const baseUrlString = publishConfiguration.url;
        if (fileName == null) {
            return baseUrlString;
        }
        const baseUrl = (0, pathManager_1.parseUrl)(baseUrlString);
        return url.format({ ...baseUrl, pathname: path.posix.resolve((baseUrl === null || baseUrl === void 0 ? void 0 : baseUrl.pathname) || "/", encodeURI(fileName)) });
    }
    let baseUrl;
    if (publishConfiguration.provider === "github") {
        const gh = publishConfiguration;
        baseUrl = `${(0, builder_util_runtime_1.githubUrl)(gh)}/${gh.owner}/${gh.repo}/releases/download/${(0, builder_util_runtime_1.githubTagPrefix)(gh)}${packager.appInfo.version}`;
    }
    else {
        baseUrl = (0, builder_util_runtime_1.getS3LikeProviderBaseUrl)(publishConfiguration);
    }
    if (fileName == null) {
        return baseUrl;
    }
    return `${baseUrl}/${encodeURI(fileName)}`;
}
async function getPublishConfigs(platformPackager, targetSpecificOptions, arch, errorIfCannot) {
    let publishers;
    // check build.nsis (target)
    if (targetSpecificOptions != null) {
        publishers = targetSpecificOptions.publish;
        // if explicitly set to null - do not publish
        if (publishers === null) {
            return null;
        }
    }
    // check build.win (platform)
    if (publishers == null) {
        publishers = platformPackager.platformSpecificBuildOptions.publish;
        if (publishers === null) {
            return null;
        }
    }
    if (publishers == null) {
        publishers = platformPackager.config.publish;
        if (publishers === null) {
            return null;
        }
    }
    return await resolvePublishConfigurations(publishers, platformPackager, platformPackager.info, arch, errorIfCannot);
}
async function resolvePublishConfigurations(publishers, platformPackager, packager, arch, errorIfCannot) {
    if (publishers == null) {
        let serviceName = null;
        if (!(0, builder_util_1.isEmptyOrSpaces)(process.env.GH_TOKEN) || !(0, builder_util_1.isEmptyOrSpaces)(process.env.GITHUB_TOKEN)) {
            serviceName = "github";
        }
        else if (!(0, builder_util_1.isEmptyOrSpaces)(process.env.GITLAB_TOKEN)) {
            serviceName = "gitlab";
        }
        else if (!(0, builder_util_1.isEmptyOrSpaces)(process.env.KEYGEN_TOKEN)) {
            serviceName = "keygen";
        }
        else if (!(0, builder_util_1.isEmptyOrSpaces)(process.env.BITBUCKET_TOKEN)) {
            serviceName = "bitbucket";
        }
        else if (!(0, builder_util_1.isEmptyOrSpaces)(process.env.BT_TOKEN)) {
            throw new Error("Bintray has been sunset and is no longer supported by electron-builder. Ref: https://jfrog.com/blog/into-the-sunset-bintray-jcenter-gocenter-and-chartcenter/");
        }
        if (serviceName != null) {
            builder_util_1.log.debug(null, `detect ${serviceName} as publish provider`);
            return [(await getResolvedPublishConfig(platformPackager, packager, { provider: serviceName }, arch, errorIfCannot))];
        }
    }
    if (publishers == null) {
        return [];
    }
    debug(`Explicit publish provider: ${(0, builder_util_1.safeStringifyJson)(publishers)}`);
    return (await Promise.all((0, builder_util_1.asArray)(publishers).map(it => getResolvedPublishConfig(platformPackager, packager, typeof it === "string" ? { provider: it } : it, arch, errorIfCannot))));
}
function isSuitableWindowsTarget(target) {
    if (target.name === "appx" && target.options != null && target.options.electronUpdaterAware) {
        return true;
    }
    return target.name === "nsis" || target.name.startsWith("nsis-");
}
function expandPublishConfig(options, platformPackager, packager, arch) {
    for (const name of Object.keys(options)) {
        const value = options[name];
        if (typeof value === "string") {
            const archValue = arch == null ? null : builder_util_1.Arch[arch];
            const expanded = platformPackager == null ? (0, macroExpander_1.expandMacro)(value, archValue, packager.appInfo) : platformPackager.expandMacro(value, archValue);
            if (expanded !== value) {
                options[name] = expanded;
            }
        }
    }
}
function isDetectUpdateChannel(platformSpecificConfiguration, configuration) {
    const value = platformSpecificConfiguration == null ? null : platformSpecificConfiguration.detectUpdateChannel;
    return value == null ? configuration.detectUpdateChannel !== false : value;
}
async function getResolvedPublishConfig(platformPackager, packager, options, arch, errorIfCannot) {
    options = { ...options };
    expandPublishConfig(options, platformPackager, packager, arch);
    let channelFromAppVersion = null;
    if (options.channel == null &&
        isDetectUpdateChannel(platformPackager == null ? null : platformPackager.platformSpecificBuildOptions, packager.config)) {
        channelFromAppVersion = packager.appInfo.channel;
    }
    const provider = options.provider;
    if (provider === "generic") {
        const o = options;
        if (o.url == null) {
            throw new builder_util_1.InvalidConfigurationError(`Please specify "url" for "generic" update server`);
        }
        if (channelFromAppVersion != null) {
            ;
            o.channel = channelFromAppVersion;
        }
        return options;
    }
    const providerClass = await requireProviderClass(options.provider, packager);
    if (providerClass != null && providerClass.checkAndResolveOptions != null) {
        await providerClass.checkAndResolveOptions(options, channelFromAppVersion, errorIfCannot);
        return options;
    }
    if (provider === "keygen") {
        return {
            ...options,
            platform: platformPackager === null || platformPackager === void 0 ? void 0 : platformPackager.platform.name,
        };
    }
    const isGithub = provider === "github";
    if (!isGithub && provider !== "bitbucket") {
        return options;
    }
    let owner = isGithub ? options.owner : options.owner;
    let project = isGithub ? options.repo : options.slug;
    if (isGithub && owner == null && project != null) {
        const index = project.indexOf("/");
        if (index > 0) {
            const repo = project;
            project = repo.substring(0, index);
            owner = repo.substring(index + 1);
        }
    }
    async function getInfo() {
        const info = await packager.repositoryInfo;
        if (info != null) {
            return info;
        }
        const message = `Cannot detect repository by .git/config. Please specify "repository" in the package.json (https://docs.npmjs.com/files/package.json#repository).\nPlease see https://electron.build/publish`;
        if (errorIfCannot) {
            throw new Error(message);
        }
        else {
            builder_util_1.log.warn(message);
            return null;
        }
    }
    if (!owner || !project) {
        builder_util_1.log.debug({ reason: "owner or project is not specified explicitly", provider, owner, project }, "calling getInfo");
        const info = await getInfo();
        if (info == null) {
            return null;
        }
        if (!owner) {
            owner = info.user;
        }
        if (!project) {
            project = info.project;
        }
    }
    if (isGithub) {
        if (options.token != null && !options.private) {
            builder_util_1.log.warn('"token" specified in the github publish options. It should be used only for [setFeedURL](module:electron-updater/out/AppUpdater.AppUpdater+setFeedURL).');
        }
        //tslint:disable-next-line:no-object-literal-type-assertion
        return { owner, repo: project, ...options };
    }
    else {
        //tslint:disable-next-line:no-object-literal-type-assertion
        return { owner, slug: project, ...options };
    }
}
//# sourceMappingURL=PublishManager.js.map
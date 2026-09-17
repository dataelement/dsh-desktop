#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePublishCommand = configurePublishCommand;
exports.publish = publish;
exports.publishArtifactsWithOptions = publishArtifactsWithOptions;
const app_builder_lib_1 = require("app-builder-lib");
const platformPackager_1 = require("app-builder-lib/out/platformPackager");
const config_1 = require("app-builder-lib/out/util/config/config");
const builder_util_1 = require("builder-util");
const chalk = require("chalk");
const path = require("path");
const yargs = require("yargs");
const builder_1 = require("./builder");
/** @internal */
function configurePublishCommand(yargs) {
    // https://github.com/yargs/yargs/issues/760
    // demandOption is required to be set
    return yargs
        .version(false)
        .parserConfiguration({
        "camel-case-expansion": false,
    })
        .option("files", {
        alias: "f",
        string: true,
        type: "array",
        requiresArg: true,
        description: "The file(s) to upload to your publisher",
    })
        .option("version", {
        alias: ["v"],
        type: "string",
        description: "The app/build version used when searching for an upload release (used by some Publishers)",
    })
        .option("config", {
        alias: ["c", "configurationFilePath"],
        type: "string",
        description: "The path to an electron-builder config. Defaults to `electron-builder.yml` (or `json`, or `json5`, or `js`, or `ts`), see " + chalk.underline("https://goo.gl/YFRJOM"),
    })
        .option("policy", {
        alias: ["p"],
        type: "string",
        description: `Publish trigger policy, see ${chalk.underline("https://www.electron.build/publish")}`,
        choices: ["onTag", "onTagOrDraft", "always", "never", undefined],
    })
        .demandOption("files");
}
async function publish(args) {
    const uploadTasks = args.files.map(f => {
        return {
            file: path.resolve(f),
            arch: null,
        };
    });
    return publishArtifactsWithOptions(uploadTasks, args.version, args.configurationFilePath, undefined, { publish: args.policy });
}
async function publishArtifactsWithOptions(uploadOptions, buildVersion, configurationFilePath, publishConfiguration, publishOptions) {
    const projectDir = process.cwd();
    const config = await (0, config_1.getConfig)(projectDir, configurationFilePath || null, { publish: publishConfiguration, detectUpdateChannel: false });
    const buildOptions = (0, builder_1.normalizeOptions)({ config, publish: publishOptions === null || publishOptions === void 0 ? void 0 : publishOptions.publish });
    (0, app_builder_lib_1.checkBuildRequestOptions)(buildOptions);
    const uniqueUploads = Array.from(new Set(uploadOptions));
    const tasks = uniqueUploads.map(({ file, arch }) => {
        const filename = path.basename(file);
        return { file, arch: arch ? (0, builder_util_1.archFromString)(arch) : null, safeArtifactName: (0, platformPackager_1.computeSafeArtifactNameIfNeeded)(filename, () => filename) };
    });
    return publishPackageWithTasks(buildOptions, tasks, buildVersion);
}
async function publishPackageWithTasks(options, uploadTasks, buildVersion, cancellationToken = new app_builder_lib_1.CancellationToken(), packager = new app_builder_lib_1.Packager(options, cancellationToken)) {
    await packager.validateConfig();
    const appInfo = new app_builder_lib_1.AppInfo(packager, buildVersion);
    const publishManager = new app_builder_lib_1.PublishManager(packager, options, cancellationToken);
    const sigIntHandler = () => {
        builder_util_1.log.warn("cancelled by SIGINT");
        packager.cancellationToken.cancel();
        publishManager.cancelTasks();
    };
    process.once("SIGINT", sigIntHandler);
    try {
        const publishConfigurations = await publishManager.getGlobalPublishConfigurations();
        if (publishConfigurations == null || publishConfigurations.length === 0) {
            throw new builder_util_1.InvalidConfigurationError("unable to find any publish configuration");
        }
        for (const newArtifact of uploadTasks) {
            for (const publishConfiguration of publishConfigurations) {
                await publishManager.scheduleUpload(publishConfiguration, newArtifact, appInfo);
            }
        }
        await publishManager.awaitTasks();
        return uploadTasks;
    }
    catch (error) {
        packager.cancellationToken.cancel();
        publishManager.cancelTasks();
        process.removeListener("SIGINT", sigIntHandler);
        builder_util_1.log.error({ message: (error.stack || error.message || error).toString() }, "error publishing");
    }
    return null;
}
function main() {
    return publish(configurePublishCommand(yargs).argv);
}
if (require.main === module) {
    builder_util_1.log.warn("please use as subcommand: electron-builder publish");
    main().catch(builder_util_1.printErrorAndExit);
}
//# sourceMappingURL=publish.js.map
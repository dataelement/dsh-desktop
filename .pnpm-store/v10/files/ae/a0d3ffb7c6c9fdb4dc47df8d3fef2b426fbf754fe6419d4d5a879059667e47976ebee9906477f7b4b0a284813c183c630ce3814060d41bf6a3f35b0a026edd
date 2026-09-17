"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STAGE_PACKAGES = exports.SNAPCRAFT_YAML_OPTIONS = void 0;
exports.buildSnap = buildSnap;
const builder_util_1 = require("builder-util");
const childProcess = require("child_process");
const crypto_1 = require("crypto");
const electron_publish_1 = require("electron-publish");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const util = require("util");
const builder_util_runtime_1 = require("builder-util-runtime");
const execAsync = util.promisify(childProcess.exec);
exports.SNAPCRAFT_YAML_OPTIONS = { indent: 2, lineWidth: -1, noRefs: true };
exports.DEFAULT_STAGE_PACKAGES = ["libnspr4", "libnss3", "libxss1", "libappindicator3-1", "libsecret-1-0"];
/**
 * Validates snapcraft.yaml using snapcraft's built-in `expand-extensions` command.
 * Throws on failure. The caller in `buildSnap` catches this and treats it as a non-fatal warning.
 */
async function validateSnapcraftYamlWithCLI(workDir) {
    try {
        const { stdout } = await execAsync("snapcraft expand-extensions", {
            cwd: workDir,
            timeout: 30000,
        });
        builder_util_1.log.debug({ expandedYaml: stdout }, "validated extended snapcraft.yaml");
    }
    catch (error) {
        builder_util_1.log.error({ error: error.message, stderr: error.stderr }, "snapcraft.yaml validation failed");
        throw new Error(`Invalid snapcraft.yaml: ${error.message}\n` +
            `Snapcraft output: ${error.stderr || error.stdout || "No output"}\n` +
            `Run 'snapcraft expand-extensions' in ${workDir} for more details`);
    }
}
/**
 * Validates snapcraft.yaml configuration with basic client-side checks
 * This is a fast pre-check before running the full CLI validation
 */
function validateSnapcraftConfig(config) {
    const errors = [];
    const warnings = [];
    // Required fields
    if (!config.name) {
        errors.push("name is required");
    }
    if (!config.base) {
        errors.push("base is required");
    }
    if (!config.confinement) {
        errors.push("confinement is required");
    }
    if (!config.parts || Object.keys(config.parts).length === 0) {
        errors.push("at least one part is required");
    }
    // Name validation
    if (config.name) {
        if (!/^[a-z0-9-]*$/.test(config.name)) {
            errors.push("name must only contain lowercase letters, numbers, and hyphens");
        }
        if (config.name.length > 40) {
            errors.push("name must be 40 characters or less");
        }
        if (config.name.startsWith("-") || config.name.endsWith("-")) {
            errors.push("name cannot start or end with a hyphen");
        }
    }
    // Parts validation
    Object.entries(config.parts).forEach(([partName, part]) => {
        if (!part.plugin) {
            errors.push(`part '${partName}' missing required 'plugin' field`);
        }
    });
    // Apps validation
    if (config.apps) {
        Object.entries(config.apps).forEach(([appName, app]) => {
            if (!app.command) {
                errors.push(`app '${appName}' missing required 'command' field`);
            }
        });
    }
    // Summary validation
    if (config.summary && config.summary.length > 78) {
        warnings.push(`summary is ${config.summary.length} characters (recommended: 78 or less)`);
    }
    // Log results
    if (errors.length > 0) {
        builder_util_1.log.error({ errors }, "snapcraft.yaml validation failed");
        throw new builder_util_1.InvalidConfigurationError(`Invalid snapcraft.yaml: ${errors.join(", ")}`);
    }
    if (warnings.length > 0) {
        builder_util_1.log.warn({ warnings }, "snapcraft.yaml validation warnings");
    }
}
/**
 * Retry wrapper for operations that may fail transiently
 */
async function executeWithRetry(fn, options = {}) {
    var _a;
    const { maxRetries = 3, retryDelay = 5000, retryableErrors = ["network timeout", "connection refused", "temporary failure", "snap store error"] } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            const errorMessage = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
            const isRetryable = retryableErrors.some(pattern => errorMessage.includes(pattern));
            if (attempt < maxRetries && isRetryable) {
                builder_util_1.log.warn({ attempt, maxRetries, error: error.message, retryIn: retryDelay }, "build failed with retryable error, retrying...");
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            else {
                break;
            }
        }
    }
    throw lastError;
}
/**
 * Cleans up build artifacts
 */
async function cleanupBuildArtifacts(workDir) {
    const artifactsToClean = ["parts", "stage", "prime"];
    for (const artifact of artifactsToClean) {
        const artifactPath = path.join(workDir, artifact);
        try {
            await (0, fs_extra_1.remove)(artifactPath);
            builder_util_1.log.debug({ artifact }, "cleaned build artifact");
        }
        catch (e) {
            builder_util_1.log.debug({ artifact, error: e.message }, "no build artifact to clean");
        }
    }
    try {
        const files = await (0, fs_extra_1.readdir)(workDir);
        for (const file of files) {
            if (file.endsWith(".snap")) {
                await (0, fs_extra_1.remove)(path.join(workDir, file));
                builder_util_1.log.debug({ file }, "cleaned snap file");
            }
        }
    }
    catch (e) {
        builder_util_1.log.debug({ error: e.message }, "no snap files to clean");
    }
}
async function copySnapToArtifactPath(workDir, outputBasename, outputFileName) {
    const snapInWorkDir = path.join(workDir, outputBasename);
    if (snapInWorkDir !== outputFileName) {
        await (0, fs_extra_1.ensureDir)(path.dirname(outputFileName));
        await (0, fs_extra_1.copyFile)(snapInWorkDir, outputFileName);
        builder_util_1.log.debug({ from: snapInWorkDir, to: outputFileName }, "copied snap from build dir to artifact path");
    }
    return outputFileName;
}
/**
 * Builds a snap package from SnapcraftYAML configuration.
 *
 * `SNAPCRAFT_NO_NETWORK` is intentionally **not** forced to `"1"` here.
 * All build modes (destructive-mode, LXD, Multipass, remote) require network
 * access to download stage-packages, the base image, and extensions.
 * To opt into an offline build, set `SNAPCRAFT_NO_NETWORK=1` in your environment.
 */
async function buildSnap(options) {
    const { SNAPCRAFT_NO_NETWORK } = process.env;
    const { snapcraftConfig, artifactPath, remoteBuild, stageDir, useLXD = false, useMultipass = false, useDestructiveMode = false, cscLink } = options;
    const isolatedEnv = {
        ...(SNAPCRAFT_NO_NETWORK != null ? { SNAPCRAFT_NO_NETWORK } : {}),
    };
    if (useDestructiveMode) {
        isolatedEnv.SNAPCRAFT_BUILD_ENVIRONMENT = "host";
    }
    if (useLXD && process.platform !== "linux") {
        throw new builder_util_1.InvalidConfigurationError(`useLXD is only supported on Linux. On ${process.platform}, use useMultipass or remoteBuild instead.`);
    }
    if (useDestructiveMode && process.platform !== "linux") {
        throw new builder_util_1.InvalidConfigurationError(`useDestructiveMode is only supported on Linux (requires Ubuntu 24.04 host for core24). On ${process.platform}, use useMultipass or remoteBuild instead.`);
    }
    // Config validation — throws InvalidConfigurationError, no build artifacts exist yet.
    validateSnapcraftConfig(snapcraftConfig);
    try {
        await validateSnapcraftYamlWithCLI(stageDir);
    }
    catch (validationError) {
        builder_util_1.log.warn({ error: validationError.message }, "snapcraft CLI pre-validation failed (non-fatal), continuing build");
    }
    await ensureSnapcraftInstalled();
    // Inject credentials for all build modes from snapcraft.cscLink / SNAP_CSC_LINK.
    const credEnv = await (0, electron_publish_1.resolveSnapCredentials)(cscLink, options.packager.buildResourcesDir);
    (0, builder_util_runtime_1.deepAssign)(isolatedEnv, credEnv);
    if (remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled) {
        // Remote-build auth does additional checks (interactive session, throws on missing creds)
        // and overrides any credential already set above.
        const authEnv = await ensureRemoteBuildAuthentication(cscLink, options.packager.buildResourcesDir);
        (0, builder_util_runtime_1.deepAssign)(isolatedEnv, authEnv);
    }
    const projectAppDir = path.join(stageDir, "app");
    if (!(await (0, fs_extra_1.pathExists)(projectAppDir))) {
        throw new builder_util_1.InvalidConfigurationError(`snap build failed: expected app directory not found at ${projectAppDir}`);
    }
    builder_util_1.log.debug({ appFiles: (await (0, fs_extra_1.readdir)(projectAppDir)).slice(0, 20) }, "app directory contents (truncated)");
    if (!(remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled) && !useLXD && !useMultipass && !useDestructiveMode && process.platform !== "linux") {
        throw new builder_util_1.InvalidConfigurationError(`No snap build environment specified for ${process.platform}. Set one of: useMultipass, useLXD (Linux only), useDestructiveMode (Linux only), or remoteBuild.enabled`);
    }
    // Actual build — only this step can leave partial artifacts that need cleanup.
    try {
        return await executeWithRetry(() => executeSnapcraftBuild({
            workDir: stageDir,
            remoteBuild,
            outputSnap: artifactPath,
            useLXD,
            useMultipass,
            useDestructiveMode,
            isolatedEnv: isolatedEnv,
        }), { maxRetries: (remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled) ? 3 : 1, retryDelay: 10000 });
    }
    catch (error) {
        builder_util_1.log.error({ error: error.message }, "snap build failed");
        await cleanupBuildArtifacts(stageDir).catch((cleanupError) => {
            builder_util_1.log.warn({ error: cleanupError.message }, "failed to cleanup build artifacts");
        });
        throw error;
    }
}
/**
 * Ensures snapcraft is installed on the system
 */
async function ensureSnapcraftInstalled() {
    try {
        const { stdout } = await execAsync("snapcraft --version");
        builder_util_1.log.info({ version: stdout.trim() }, "snapcraft found");
    }
    catch (error) {
        builder_util_1.log.error({ error: error.message }, "snapcraft is not installed");
        const platform = process.platform;
        if (platform === "linux") {
            builder_util_1.log.error(null, "Install with: sudo snap install snapcraft --classic");
        }
        else if (platform === "darwin") {
            builder_util_1.log.error(null, "Install snapcraft with: pip3 install snapcraft");
            builder_util_1.log.error(null, "On macOS, useMultipass or remoteBuild are the only supported build modes for core24");
        }
        else if (platform === "win32") {
            builder_util_1.log.error(null, "Install snapcraft via WSL2 or use remote-build");
            builder_util_1.log.error(null, "See: https://snapcraft.io/docs/snapcraft-overview");
        }
        throw new builder_util_1.InvalidConfigurationError("snapcraft not found - please install snapcraft to continue");
    }
}
/**
 * Resolves Snapcraft Store authentication for remote builds and returns the credential
 * env entries to inject. Returns an empty map when snapcraft can authenticate itself
 * (interactive session). Throws when no credential source is found.
 */
async function ensureRemoteBuildAuthentication(cscLink, resourcesDir) {
    var _a;
    builder_util_1.log.debug(null, "resolving remote build authentication...");
    // 1. snapcraft.cscLink / SNAP_CSC_LINK — config-level or env credential (base64 or file path).
    // resolveSnapCredentials already ran for all build modes; re-run here so remote-build
    // gets the same result and the interactive-session fallback is only reached when neither is set.
    const credEnv = await (0, electron_publish_1.resolveSnapCredentials)(cscLink, resourcesDir);
    if (Object.keys(credEnv).length > 0) {
        return credEnv;
    }
    // 2. SNAPCRAFT_STORE_CREDENTIALS env var — directly provide the credentials string (not base64-encoded).
    const SNAPCRAFT_STORE_CREDENTIALS = (_a = process.env.SNAPCRAFT_STORE_CREDENTIALS) === null || _a === void 0 ? void 0 : _a.trim();
    if (!(0, builder_util_1.isEmptyOrSpaces)(SNAPCRAFT_STORE_CREDENTIALS)) {
        builder_util_1.log.debug(null, "using SNAPCRAFT_STORE_CREDENTIALS from environment, verbatim");
        return { SNAPCRAFT_STORE_CREDENTIALS };
    }
    // 3. Interactive snapcraft session.
    try {
        const { stdout } = await execAsync("snapcraft whoami");
        if (stdout.includes("email:")) {
            builder_util_1.log.debug({ account: stdout.trim() }, "already authenticated with snapcraft");
            return {};
        }
    }
    catch {
        // Not logged in, fall through to error.
    }
    throw new builder_util_1.InvalidConfigurationError("Snapcraft authentication required for remote build.\n" +
        "Authenticate with one of any:\n" +
        "  1. Set SNAP_CSC_LINK\n" +
        "  2. Set snapcraft.cscLink in your build config\n" +
        "  3. Run: snapcraft login\n" +
        "  4. Set SNAPCRAFT_STORE_CREDENTIALS environment variable directly");
}
/**
 * Executes the snapcraft build command
 */
async function executeSnapcraftBuild(options) {
    const { workDir, outputSnap: outputFileName, remoteBuild, useLXD, useMultipass, useDestructiveMode, isolatedEnv } = options;
    let processedEnv = { ...(0, builder_util_1.stripSensitiveEnvVars)(process.env), ...isolatedEnv };
    // Use a UUID-based temp name as the --output target so the copy below doesn't
    // depend on snapcraft's naming convention (which always uses underscores).
    const tmpSnap = `eb-snap-${(0, crypto_1.randomUUID)().replace(/-/g, "")}.snap`;
    if (useDestructiveMode && !(remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled)) {
        return await runDestructiveBuild(workDir, processedEnv, tmpSnap, outputFileName);
    }
    const command = "snapcraft";
    const args = [];
    if (remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled) {
        const remoteBuildArgs = generateRemoteBuildArgs(remoteBuild, workDir);
        // Remote build on Launchpad (works from any platform)
        args.push(...remoteBuildArgs.args);
        processedEnv = { ...processedEnv, ...remoteBuildArgs.isolatedEnv };
    }
    else {
        // `snapcraft pack` runs the full lifecycle (pull → build → stage → prime → pack).
        // snapcraft 8.x removed --use-multipass entirely; Multipass is now configured
        // via the SNAPCRAFT_BUILD_ENVIRONMENT env var (or auto-selected on macOS).
        // --use-lxd remains a supported CLI flag on `pack`.
        args.push("pack");
        if (useLXD) {
            args.push("--use-lxd");
            builder_util_1.log.debug(null, "using LXD for build");
        }
        else if (useMultipass) {
            processedEnv.SNAPCRAFT_BUILD_ENVIRONMENT = "multipass";
            builder_util_1.log.debug(null, "using Multipass for build (via SNAPCRAFT_BUILD_ENVIRONMENT)");
        }
        else {
            args.push("--output", tmpSnap);
        }
    }
    if (builder_util_1.log.isDebugEnabled) {
        args.push("--verbose");
    }
    builder_util_1.log.info({ workDir: builder_util_1.log.filePath(workDir) }, "executing snapcraft");
    await (0, builder_util_1.spawn)(command, args, {
        cwd: workDir,
        env: processedEnv,
    });
    if ((remoteBuild === null || remoteBuild === void 0 ? void 0 : remoteBuild.enabled) || useLXD || useMultipass) {
        // snapcraft names the output snap itself (e.g. <name>_<version>_<arch>.snap).
        // Each electron-builder build invocation targets exactly one arch, so exactly one snap is expected.
        const files = await (0, fs_extra_1.readdir)(workDir);
        const builtSnap = files.find(f => f.endsWith(".snap"));
        if (!builtSnap) {
            throw new Error(`Build succeeded but no .snap file found in ${workDir}`);
        }
        return copySnapToArtifactPath(workDir, builtSnap, outputFileName);
    }
    return copySnapToArtifactPath(workDir, tmpSnap, outputFileName);
}
function generateRemoteBuildArgs(remoteBuild, workDir) {
    const isolatedEnv = {};
    const args = ["remote-build"];
    builder_util_1.log.debug(null, "using remote-build (Launchpad)");
    // Add remote build specific options
    if (remoteBuild.launchpadUsername) {
        args.push("--user", remoteBuild.launchpadUsername);
    }
    if (remoteBuild.acceptPublicUpload) {
        args.push("--launchpad-accept-public-upload");
    }
    else {
        builder_util_1.log.warn(null, "your project will be publicly uploaded to Launchpad. Use `acceptPublicUpload: true` to suppress this warning");
    }
    if (remoteBuild.privateProject) {
        args.push("--project", remoteBuild.privateProject);
        builder_util_1.log.debug({ project: remoteBuild.privateProject }, "using private Launchpad project");
    }
    if (remoteBuild.buildFor) {
        args.push("--build-for", remoteBuild.buildFor);
        builder_util_1.log.debug({ arch: remoteBuild.buildFor }, "building for architecture");
    }
    if (remoteBuild.recover) {
        args.push("--recover");
        builder_util_1.log.debug(null, "recovering previous build");
    }
    if (remoteBuild.strategy) {
        isolatedEnv.SNAPCRAFT_REMOTE_BUILD_STRATEGY = remoteBuild.strategy;
    }
    if (remoteBuild.timeout) {
        args.push("--timeout", String(remoteBuild.timeout));
        builder_util_1.log.debug({ timeout: `${remoteBuild.timeout}s` }, "build timeout configured");
    }
    // Remote-build downloads the finished snap into workDir.
    // --output-dir (not --output <file>) lets snapcraft name the file itself.
    args.push("--output-dir", workDir);
    return { args, isolatedEnv };
}
// Snapcraft 8 (craft-application) hangs after a successful destructive-mode
// build in containerised environments (Docker/CI without snapd running).
// craft-application's PackageService teardown tries to reach
// /run/snapd-snap.socket (snapctl IPC) which doesn't exist without a live
// snapd daemon — causing an indefinite block.
//
// Work-around: split into two steps:
//   1. `snapcraft prime --destructive-mode`  — runs pull/build/stage/prime,
//      exits cleanly (no post-pack teardown executed).
//   2. `snapcraft pack <primeDir>`  — packs the pre-primed directory without
//      running the full build lifecycle, avoiding the problematic teardown.
async function runDestructiveBuild(workDir, processedEnv, tmpSnap, outputFileName) {
    const primeArgs = ["prime", "--destructive-mode"];
    if (builder_util_1.log.isDebugEnabled) {
        primeArgs.push("--verbose");
    }
    builder_util_1.log.info({ command: `snapcraft ${primeArgs.join(" ")}`, workDir: builder_util_1.log.filePath(workDir) }, "snapcraft prime (1/2)");
    await (0, builder_util_1.spawn)("snapcraft", primeArgs, {
        cwd: workDir,
        env: processedEnv,
    });
    const primeDir = path.join(workDir, "prime");
    const snapcraftPackArgs = ["pack", "--output", tmpSnap, primeDir];
    if (builder_util_1.log.isDebugEnabled) {
        snapcraftPackArgs.push("--verbose");
    }
    builder_util_1.log.info({ command: `snapcraft ${snapcraftPackArgs.join(" ")}`, workDir: builder_util_1.log.filePath(workDir) }, "snapcraft pack prime dir (2/2)");
    await (0, builder_util_1.spawn)("snapcraft", snapcraftPackArgs, {
        cwd: workDir,
        env: processedEnv,
    });
    return copySnapToArtifactPath(workDir, tmpSnap, outputFileName);
}
//# sourceMappingURL=snapcraftBuilder.js.map
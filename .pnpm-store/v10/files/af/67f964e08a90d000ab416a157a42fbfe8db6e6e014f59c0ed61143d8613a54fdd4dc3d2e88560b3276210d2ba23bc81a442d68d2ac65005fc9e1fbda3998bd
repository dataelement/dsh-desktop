"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapCore = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const path = require("path");
const core_1 = require("../../core");
const targetUtil_1 = require("../targetUtil");
/** Abstract base for all snap build strategies (core24, legacy core18/20/22, custom pass-through). */
class SnapCore {
    constructor(packager, helper, options) {
        this.packager = packager;
        this.helper = helper;
        this.options = options;
    }
}
exports.SnapCore = SnapCore;
/** Snap build target — merges `snapcraft` (preferred) and legacy `snap` config, then delegates to the appropriate `SnapCore` strategy. */
class SnapTarget extends core_1.Target {
    constructor(name, packager, helper, outDir) {
        var _a;
        super(name);
        this.packager = packager;
        this.helper = helper;
        this.outDir = outDir;
        const { config: { snapcraft, snap }, platformSpecificBuildOptions, } = packager;
        this.options = (0, builder_util_runtime_1.deepAssign)({}, platformSpecificBuildOptions, (_a = snapcraft !== null && snapcraft !== void 0 ? snapcraft : snap) !== null && _a !== void 0 ? _a : {});
    }
    async build(appOutDir, arch) {
        const packager = this.packager;
        // tslint:disable-next-line:no-invalid-template-strings
        const artifactName = packager.expandArtifactNamePattern(this.options, "snap", arch, "${name}_${version}_${arch}.${ext}", false);
        const artifactPath = path.join(this.outDir, artifactName);
        await packager.info.emitArtifactBuildStarted({
            targetPresentableName: "snap",
            file: artifactPath,
            arch,
        });
        const core = this.helper.getSnapCore();
        const snap = await core.createDescriptor(arch);
        builder_util_1.log.debug({ snap }, "snapcraft.yaml descriptor created");
        await core.buildSnap({
            snap,
            appOutDir,
            stageDir: await (0, targetUtil_1.createStageDirPath)(this, packager, arch),
            snapArch: arch,
            artifactPath,
        });
        const publishConfig = this.findSnapPublishConfig(packager.config);
        await packager.info.emitArtifactBuildCompleted({
            file: artifactPath,
            safeArtifactName: packager.computeSafeArtifactName(artifactName, "snap", arch, false),
            target: this,
            arch,
            packager,
            publishConfig,
        });
    }
    findSnapPublishConfig(config) {
        var _a, _b;
        const fallback = { provider: "snapStore" };
        if (!config) {
            return fallback;
        }
        const snapConfig = (_a = config.snapcraft) !== null && _a !== void 0 ? _a : config.snap;
        if (snapConfig === null || snapConfig === void 0 ? void 0 : snapConfig.publish) {
            return this.findSnapPublishConfigInPublishNode(snapConfig.publish);
        }
        if ((_b = config.linux) === null || _b === void 0 ? void 0 : _b.publish) {
            const configCandidate = this.findSnapPublishConfigInPublishNode(config.linux.publish);
            if (configCandidate) {
                return configCandidate;
            }
        }
        if (config.publish) {
            const configCandidate = this.findSnapPublishConfigInPublishNode(config.publish);
            if (configCandidate) {
                return configCandidate;
            }
        }
        return fallback;
    }
    findSnapPublishConfigInPublishNode(configPublishNode) {
        if (!configPublishNode) {
            return null;
        }
        if (Array.isArray(configPublishNode)) {
            for (const configObj of configPublishNode) {
                if (this.isSnapStoreOptions(configObj)) {
                    return configObj;
                }
            }
        }
        if (typeof configPublishNode === `object` && this.isSnapStoreOptions(configPublishNode)) {
            return configPublishNode;
        }
        return null;
    }
    isSnapStoreOptions(configPublishNode) {
        const snapStoreOptionsCandidate = configPublishNode;
        return (snapStoreOptionsCandidate === null || snapStoreOptionsCandidate === void 0 ? void 0 : snapStoreOptionsCandidate.provider) === `snapStore`;
    }
}
exports.default = SnapTarget;
//# sourceMappingURL=SnapTarget.js.map
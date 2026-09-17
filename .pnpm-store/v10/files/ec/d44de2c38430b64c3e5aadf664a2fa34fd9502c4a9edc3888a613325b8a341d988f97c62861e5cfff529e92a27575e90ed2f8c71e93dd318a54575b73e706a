"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapCoreCustom = void 0;
const builder_util_1 = require("builder-util");
const fs_extra_1 = require("fs-extra");
const yaml = require("js-yaml");
const path = require("path");
const SnapTarget_1 = require("./SnapTarget");
const snapcraftBuilder_1 = require("./snapcraftBuilder");
/**
 * Pass-through snap builder for `base: "custom"`.
 *
 * electron-builder reads the file at `snapcraft.custom.yaml` (or the inline object),
 * writes it into the stage directory, and invokes snapcraft. **Nothing is injected or
 * modified in any way** — no plugs, extensions, organize mappings, desktop files,
 * environment variables, layout entries, or stage packages. `linux.*` configuration
 * is also not cascaded into the descriptor.
 *
 * Because electron-builder exerts no control over the descriptor's content, GitHub
 * issue support for snap runtime problems encountered with custom yaml files is limited.
 * Prefer a structured base (`core24`, `core22`, etc.) for a fully managed build.
 */
class SnapCoreCustom extends SnapTarget_1.SnapCore {
    constructor() {
        super(...arguments);
        this.defaultPlugs = [];
    }
    async createDescriptor(_arch) {
        const { yaml: yamlPath } = this.options;
        if (!yamlPath) {
            throw new builder_util_1.InvalidConfigurationError('snapcraft.base = "custom" requires an entry in snapcraft.custom.yaml (either a path to a snapcraft.yaml file or a SnapcraftYAML object directly in the configuration)');
        }
        if (typeof yamlPath !== "string") {
            return yamlPath; // fully defined SnapcraftYAML object provided directly in configuration, no file reading necessary
        }
        const resolved = path.resolve(this.packager.buildResourcesDir, yamlPath);
        const buildResourcesDir = this.packager.buildResourcesDir;
        if (!resolved.startsWith(buildResourcesDir + path.sep) && resolved !== buildResourcesDir) {
            throw new builder_util_1.InvalidConfigurationError(`snapcraft.custom.yaml must resolve within the build resources directory (got "${resolved}")`);
        }
        const raw = await (0, fs_extra_1.readFile)(resolved, "utf8");
        return yaml.load(raw);
    }
    async buildSnap(params) {
        const { snap, stageDir, artifactPath } = params;
        const snapDirResolved = path.resolve(stageDir, "snap");
        const snapcraftYamlPath = path.join(snapDirResolved, "snapcraft.yaml");
        const yamlContent = yaml.dump(snap, snapcraftBuilder_1.SNAPCRAFT_YAML_OPTIONS);
        await (0, fs_extra_1.outputFile)(snapcraftYamlPath, yamlContent, "utf8");
        builder_util_1.log.debug(snap, "using custom snapcraft.yaml (pass-through, no injection)");
        if (this.packager.packagerOptions.effectiveOptionComputed != null && (await this.packager.packagerOptions.effectiveOptionComputed({ snap }))) {
            return;
        }
        await (0, snapcraftBuilder_1.buildSnap)({
            snapcraftConfig: snap,
            artifactPath,
            stageDir,
            packager: this.packager,
        });
    }
}
exports.SnapCoreCustom = SnapCoreCustom;
//# sourceMappingURL=coreCustom.js.map
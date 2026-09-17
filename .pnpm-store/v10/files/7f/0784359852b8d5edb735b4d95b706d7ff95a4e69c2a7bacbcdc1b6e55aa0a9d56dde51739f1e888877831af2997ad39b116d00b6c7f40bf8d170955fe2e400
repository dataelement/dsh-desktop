"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxPackager = void 0;
exports.toAppImageOrSnapArch = toAppImageOrSnapArch;
const builder_util_1 = require("builder-util");
const filename_1 = require("builder-util/out/filename");
const core_1 = require("./core");
const platformPackager_1 = require("./platformPackager");
const LinuxTargetHelper_1 = require("./targets/LinuxTargetHelper");
const targetFactory_1 = require("./targets/targetFactory");
class LinuxPackager extends platformPackager_1.PlatformPackager {
    constructor(info) {
        var _a;
        super(info, core_1.Platform.LINUX);
        const executableName = (_a = this.platformSpecificBuildOptions.executableName) !== null && _a !== void 0 ? _a : info.config.executableName;
        this.executableName = executableName == null ? this.appInfo.sanitizedName.toLowerCase() : (0, filename_1.sanitizeFileName)(executableName);
    }
    get defaultTarget() {
        return ["snap", "appimage"];
    }
    createTargets(targets, mapper) {
        let helper;
        const getHelper = () => {
            if (helper == null) {
                helper = new LinuxTargetHelper_1.LinuxTargetHelper(this);
            }
            return helper;
        };
        for (const name of targets) {
            if (name === core_1.DIR_TARGET) {
                continue;
            }
            const targetClass = (() => {
                switch (name) {
                    case "appimage":
                        return require("./targets/appimage/AppImageTarget").default;
                    case "snap":
                        return require("./targets/snap/SnapTarget").default;
                    case "flatpak":
                        return require("./targets/FlatpakTarget").default;
                    case "deb":
                    case "rpm":
                    case "sh":
                    case "freebsd":
                    case "pacman":
                    case "apk":
                    case "p5p":
                        return require("./targets/FpmTarget").default;
                    default:
                        return null;
                }
            })();
            mapper(name, outDir => {
                if (targetClass === null) {
                    return (0, targetFactory_1.createCommonTarget)(name, outDir, this);
                }
                return new targetClass(name, this, getHelper(), outDir);
            });
        }
    }
}
exports.LinuxPackager = LinuxPackager;
function toAppImageOrSnapArch(arch) {
    switch (arch) {
        case builder_util_1.Arch.x64:
            return "x86_64";
        case builder_util_1.Arch.ia32:
            return "i386";
        case builder_util_1.Arch.armv7l:
            return "arm";
        case builder_util_1.Arch.arm64:
            return "arm_aarch64";
        default:
            throw new Error(`Unsupported arch ${arch}`);
    }
}
//# sourceMappingURL=linuxPackager.js.map
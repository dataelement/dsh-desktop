"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arch = void 0;
exports.toLinuxArchString = toLinuxArchString;
exports.getArchCliNames = getArchCliNames;
exports.getArchSuffix = getArchSuffix;
exports.archFromString = archFromString;
exports.defaultArchFromString = defaultArchFromString;
exports.getArtifactArchName = getArtifactArchName;
var Arch;
(function (Arch) {
    Arch[Arch["ia32"] = 0] = "ia32";
    Arch[Arch["x64"] = 1] = "x64";
    Arch[Arch["armv7l"] = 2] = "armv7l";
    Arch[Arch["arm64"] = 3] = "arm64";
    Arch[Arch["universal"] = 4] = "universal";
})(Arch || (exports.Arch = Arch = {}));
function toLinuxArchString(arch, targetName) {
    switch (arch) {
        case Arch.x64:
            return targetName === "flatpak" ? "x86_64" : "amd64";
        case Arch.ia32:
            return targetName === "pacman" ? "i686" : "i386";
        case Arch.armv7l:
            return targetName === "snap" || targetName === "deb" ? "armhf" : targetName === "flatpak" ? "arm" : "armv7l";
        case Arch.arm64:
            return targetName === "pacman" || targetName === "rpm" || targetName === "flatpak" ? "aarch64" : "arm64";
        default:
            throw new Error(`Unsupported arch ${arch}`);
    }
}
function getArchCliNames() {
    return [Arch[Arch.ia32], Arch[Arch.x64], Arch[Arch.armv7l], Arch[Arch.arm64]];
}
function getArchSuffix(arch, defaultArch) {
    return arch === defaultArchFromString(defaultArch) ? "" : `-${Arch[arch]}`;
}
function archFromString(name) {
    switch (name) {
        case "x64":
            return Arch.x64;
        case "ia32":
            return Arch.ia32;
        case "arm64":
            return Arch.arm64;
        case "arm":
        case "armv7l":
            return Arch.armv7l;
        case "universal":
            return Arch.universal;
        default:
            throw new Error(`Unsupported arch ${name}`);
    }
}
function defaultArchFromString(name) {
    return name ? archFromString(name) : Arch.x64;
}
function getArtifactArchName(arch, ext) {
    let archName = Arch[arch];
    const isAppImage = ext === "AppImage" || ext === "appimage";
    if (arch === Arch.x64) {
        if (isAppImage || ext === "rpm" || ext === "flatpak") {
            archName = "x86_64";
        }
        else if (ext === "deb" || ext === "snap") {
            archName = "amd64";
        }
    }
    else if (arch === Arch.ia32) {
        if (ext === "deb" || isAppImage || ext === "snap" || ext === "flatpak") {
            archName = "i386";
        }
        else if (ext === "pacman" || ext === "rpm") {
            archName = "i686";
        }
    }
    else if (arch === Arch.armv7l) {
        if (ext === "snap") {
            archName = "armhf";
        }
        else if (ext === "flatpak") {
            archName = "arm";
        }
    }
    else if (arch === Arch.arm64) {
        if (ext === "pacman" || ext === "rpm" || ext === "flatpak") {
            archName = "aarch64";
        }
    }
    return archName;
}
//# sourceMappingURL=arch.js.map
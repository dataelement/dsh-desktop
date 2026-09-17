"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFMPEGInjector = void 0;
const builder_util_1 = require("builder-util");
const fs = require("fs-extra");
const path = require("path");
const core_1 = require("../core");
const electronGet_1 = require("../util/electronGet");
class FFMPEGInjector {
    constructor(options, electronVersion, branding) {
        this.options = options;
        this.electronVersion = electronVersion;
        this.branding = branding;
    }
    async inject() {
        const libPath = this.options.platformName === core_1.Platform.MAC.nodeName
            ? path.join(this.options.appOutDir, `${this.branding.productName}.app`, "Contents", "Frameworks", `${this.branding.productName} Framework.framework`, "Versions", "A", "Libraries")
            : this.options.appOutDir;
        const ffmpegDir = await this.downloadFFMPEG();
        return this.copyFFMPEG(libPath, ffmpegDir);
    }
    async downloadFFMPEG() {
        const ffmpegFileName = `ffmpeg-v${this.electronVersion}-${this.options.platformName}-${this.options.arch}`;
        builder_util_1.log.info({ ffmpegFileName }, "downloading");
        const { packager: { config: { electronDownload }, }, platformName, arch, } = this.options;
        return (0, electronGet_1.downloadElectronArtifact)({
            electronDownload,
            artifactName: "ffmpeg",
            platformName,
            arch,
            version: this.electronVersion,
        });
    }
    async copyFFMPEG(targetPath, sourcePath) {
        let fileName = "ffmpeg.dll";
        if (["darwin", "mas"].includes(this.options.platformName)) {
            fileName = "libffmpeg.dylib";
        }
        else if (this.options.platformName === "linux") {
            fileName = "libffmpeg.so";
        }
        const libPath = path.resolve(sourcePath, fileName);
        const libTargetPath = path.resolve(targetPath, fileName);
        builder_util_1.log.info({ lib: builder_util_1.log.filePath(libPath), target: libTargetPath }, "copying non-proprietary FFMPEG");
        // If the source doesn't exist we have a problem
        if (!fs.existsSync(libPath)) {
            throw new Error(`Failed to find FFMPEG library file at path: ${libPath}`);
        }
        // If we are copying to the source we can stop immediately
        if (libPath !== libTargetPath) {
            await fs.copyFile(libPath, libTargetPath);
        }
        return libTargetPath;
    }
}
exports.FFMPEGInjector = FFMPEGInjector;
//# sourceMappingURL=injectFFMPEG.js.map
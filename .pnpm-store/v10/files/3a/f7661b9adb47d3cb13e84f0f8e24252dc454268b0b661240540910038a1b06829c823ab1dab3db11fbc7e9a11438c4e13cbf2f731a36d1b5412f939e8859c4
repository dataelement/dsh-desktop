"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxUpdater = void 0;
const BaseUpdater_1 = require("./BaseUpdater");
// Matches safe package manager names: alphanumeric, hyphens, underscores only.
// Rejects names with shell metacharacters that could cause command injection.
const SAFE_PM_REGEX = /^[a-zA-Z0-9_-]+$/;
class LinuxUpdater extends BaseUpdater_1.BaseUpdater {
    constructor(options, app) {
        super(options, app);
    }
    /**
     * Returns true if the current process is running as root.
     */
    isRunningAsRoot() {
        var _a;
        return ((_a = process.getuid) === null || _a === void 0 ? void 0 : _a.call(process)) === 0;
    }
    /**
     * Sanitizes the installer path for use with shell:true spawn calls.
     * Backslash-escapes metacharacters that have special meaning in POSIX shell.
     * Note: paths containing single-quotes (') are not supported.
     */
    get installerPath() {
        const raw = super.installerPath;
        if (raw == null) {
            return null;
        }
        return raw
            .replace(/\\/g, "\\\\") // must come first
            .replace(/([`$!" ;|&()<>])/g, "\\$1")
            .replace(/[\n\r]/g, "");
    }
    runCommandWithSudoIfNeeded(commandWithArgs) {
        if (this.isRunningAsRoot()) {
            this._logger.info("Running as root, no need to use sudo");
            return this.spawnSyncLog(commandWithArgs[0], commandWithArgs.slice(1));
        }
        const { name } = this.app;
        // Strip characters that could break shell quoting in the sudo dialog comment string
        const safeName = name.replace(/["`$\\!\n\r;|&<>(){}*?[\]#~]/g, "");
        const installComment = `"${safeName} would like to update"`;
        const sudo = this.sudoWithArgs(installComment);
        this._logger.info(`Running as non-root user, using sudo to install: ${sudo}`);
        let wrapper = `"`;
        // some sudo commands dont want the command to be wrapped in " quotes
        if (/pkexec/i.test(sudo[0]) || sudo[0] === "sudo") {
            wrapper = "";
        }
        return this.spawnSyncLog(sudo[0], [...(sudo.length > 1 ? sudo.slice(1) : []), `${wrapper}/bin/bash`, "-c", `'${commandWithArgs.join(" ")}'${wrapper}`]);
    }
    sudoWithArgs(installComment) {
        const sudo = this.determineSudoCommand();
        const command = [sudo];
        if (/kdesudo/i.test(sudo)) {
            command.push("--comment", installComment);
            command.push("-c");
        }
        else if (/gksudo/i.test(sudo)) {
            command.push("--message", installComment);
        }
        else if (/pkexec/i.test(sudo)) {
            command.push("--disable-internal-agent");
        }
        return command;
    }
    hasCommand(cmd) {
        try {
            this.spawnSyncLog(`command`, ["-v", cmd]);
            return true;
        }
        catch {
            return false;
        }
    }
    determineSudoCommand() {
        const sudos = ["gksudo", "kdesudo", "pkexec", "beesu"];
        for (const sudo of sudos) {
            if (this.hasCommand(sudo)) {
                return sudo;
            }
        }
        return "sudo";
    }
    /**
     * Detects the package manager to use based on the available commands.
     * Allows overriding the default behavior by setting the ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER environment variable.
     * If the environment variable is set, it will be used directly. (This is useful for testing each package manager logic path.)
     * Otherwise, it checks for the presence of the specified package manager commands in the order provided.
     * @param pms - An array of package manager commands to check for, in priority order.
     * @returns The detected package manager command or "unknown" if none are found.
     */
    detectPackageManager(pms) {
        var _a;
        let availablePMs = pms;
        const pmOverride = (_a = process.env.ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER) === null || _a === void 0 ? void 0 : _a.trim();
        if (pmOverride) {
            if (!SAFE_PM_REGEX.test(pmOverride)) {
                this._logger.warn(`ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER "${pmOverride}" contains unsafe characters. Ignoring override.`);
            }
            else {
                availablePMs = [pmOverride];
            }
        }
        // Check for the package manager in the order of priority
        for (const pm of availablePMs) {
            if (this.hasCommand(pm)) {
                return pm;
            }
        }
        // return the first/default package manager in the original list if none are found, this will throw upstream for proper logging
        const searchList = pmOverride ? `ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER override "${pmOverride}", ` : "";
        const defaultPM = pms[0];
        this._logger.warn(`No package manager found in the list: ${searchList}${pms.join(", ")}. Utilizing default: ${defaultPM}`);
        return defaultPM;
    }
}
exports.LinuxUpdater = LinuxUpdater;
//# sourceMappingURL=LinuxUpdater.js.map
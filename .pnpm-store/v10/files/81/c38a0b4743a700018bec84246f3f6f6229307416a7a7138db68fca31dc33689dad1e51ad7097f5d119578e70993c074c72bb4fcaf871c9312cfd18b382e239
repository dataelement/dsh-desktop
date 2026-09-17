"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIsOutdated = checkIsOutdated;
exports.wrap = wrap;
const load_1 = require("app-builder-lib/out/util/config/load");
const builder_util_1 = require("builder-util");
const ci_info_1 = require("ci-info");
const fs_extra_1 = require("fs-extra");
const path = require("path");
async function checkIsOutdated() {
    if (ci_info_1.isCI || process.env.NO_UPDATE_NOTIFIER != null) {
        return;
    }
    const pkg = await (0, fs_extra_1.readJson)(path.join(__dirname, "..", "..", "package.json"));
    if (pkg.version === "0.0.0-semantic-release") {
        return;
    }
    const UpdateNotifier = require("simple-update-notifier");
    await UpdateNotifier({ pkg });
}
function wrap(task) {
    return (args) => {
        checkIsOutdated().catch((e) => builder_util_1.log.warn({ error: e }, "cannot check updates"));
        return (0, load_1.loadEnv)(path.join(process.cwd(), "electron-builder.env"))
            .then(() => task(args))
            .catch(error => {
            process.exitCode = 1;
            // https://github.com/electron-userland/electron-builder/issues/2940
            process.on("exit", () => (process.exitCode = 1));
            if (error instanceof builder_util_1.InvalidConfigurationError) {
                builder_util_1.log.error(null, error.message);
            }
            else if (!(error instanceof builder_util_1.ExecError) || !error.alreadyLogged) {
                builder_util_1.log.error({ failedTask: task.name, stackTrace: error.stack }, error.message);
            }
        });
    };
}
//# sourceMappingURL=cli-util.js.map
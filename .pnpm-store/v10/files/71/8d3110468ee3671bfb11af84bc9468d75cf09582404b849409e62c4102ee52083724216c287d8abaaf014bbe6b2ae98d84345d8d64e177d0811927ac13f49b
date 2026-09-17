#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electronVersion_1 = require("app-builder-lib/out/electron/electronVersion");
const yarn_1 = require("app-builder-lib/out/util/yarn");
const chalk = require("chalk");
const builder_1 = require("../builder");
const publish_1 = require("../publish");
const clear_cache_1 = require("./clear-cache");
const cli_util_1 = require("./cli-util");
const create_self_signed_cert_1 = require("./create-self-signed-cert");
const install_app_deps_1 = require("./install-app-deps");
const start_1 = require("./start");
// tslint:disable:no-unused-expression
void (0, builder_1.createYargs)()
    .command(["build", "*"], "Build", builder_1.configureBuildCommand, (0, cli_util_1.wrap)(builder_1.build))
    .command("install-app-deps", "Install app deps", install_app_deps_1.configureInstallAppDepsCommand, (0, cli_util_1.wrap)(install_app_deps_1.installAppDeps))
    .command("node-gyp-rebuild", "Rebuild own native code", install_app_deps_1.configureInstallAppDepsCommand /* yes, args the same as for install app deps */, (0, cli_util_1.wrap)(rebuildAppNativeCode))
    .command("publish", "Publish a list of artifacts", publish_1.configurePublishCommand, (0, cli_util_1.wrap)(publish_1.publish))
    .command("create-self-signed-cert", "Create self-signed code signing cert for Windows apps", yargs => yargs
    .option("publisher", {
    alias: ["p"],
    type: "string",
    requiresArg: true,
    description: "The publisher name",
})
    .demandOption("publisher"), (0, cli_util_1.wrap)(argv => (0, create_self_signed_cert_1.createSelfSignedCert)(argv.publisher)))
    .command("start", "Run application in a development mode using electron-webpack", yargs => yargs, (0, cli_util_1.wrap)(() => (0, start_1.start)()))
    .command("clear-cache", "Clear the electron-builder default cache directory", yargs => yargs, (0, cli_util_1.wrap)(() => (0, clear_cache_1.clearCache)()))
    .help()
    .epilog(`See ${chalk.underline("https://electron.build")} for more documentation.`)
    .strict()
    .recommendCommands().argv;
async function rebuildAppNativeCode(args) {
    const projectDir = process.cwd();
    // this script must be used only for electron
    return (0, yarn_1.nodeGypRebuild)(args.platform, args.arch, { version: await (0, electronVersion_1.getElectronVersion)(projectDir), useCustomDist: true });
}
//# sourceMappingURL=cli.js.map
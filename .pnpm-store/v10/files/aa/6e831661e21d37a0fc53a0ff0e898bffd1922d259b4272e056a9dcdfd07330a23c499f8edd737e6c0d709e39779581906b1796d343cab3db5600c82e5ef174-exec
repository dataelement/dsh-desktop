#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadLayeredEnv } from "@deepseek-ai/dsh-app-boot";
import { Command, CommanderError } from "commander";
//#region lib/types/args.js
/**
* Commander adapter for the `dsh` command line.
*
* The launcher parses only what it owns — which profile to boot, which extra
* patch overlays to apply, and the config dumps — and hands **everything after
* its own flags** to the booted tree verbatim, where injected app plugins parse
* their own flag families and print their own `--help` (see
* `@deepseek-ai/dsh-cmdline`). Launcher flags therefore come first: the first
* token this parser does not recognize starts the inner arguments, so
* `dsh --profile tui --resume abc` boots the tui profile with `--resume abc`,
* and `dsh --profile web -h` prints the web app's help, not this one's.
*
* `web` is a hardcoded alias for `--profile web`; `plugin` manages a profile's
* plugin dependencies by forwarding to pnpm.
* @module @deepseek-ai/dsh/args
*/
/**
* Repeatable single-value collector: `--patch a.yml --patch b.yml`. Never
* variadic — a variadic `--patch` would swallow the inner arguments.
*/
const collect = (value, previous = []) => [...previous, value];
function rejectElectronProfile(program, profile) {
	if (profile.toLowerCase() === "desktop") program.error("error: profile \"desktop\" is managed exclusively by the Electron application");
}
/** The launcher's own help text; each app prints its own. */
const HELP_EXAMPLES = `
Examples:
  dsh --profile web                          boot the web profile (same as: dsh web)
  dsh --profile rescue --from-default-profile web
                                             create rescue from the shipped web template, then boot it
  dsh --profile headless "run the tests"     answer one task, print the result, and exit
  dsh --profile tui --patch ./extra.yml      boot a custom profile with one extra overlay
  dsh --profile tui --resume <session>       arguments after the launcher flags reach the app
  dsh --profile web --help                   the web app's own flags and help
  dsh plugin --profile tui add <package>     install a plugin into the tui profile
`;
/**
* Resolve a boot or dump invocation from the launcher flags and the leftover
* inner arguments.
* @param program - the command whose options were parsed (the root, or the `web` alias).
* @param profile - the profile these flags boot.
* @param options - the launcher flags commander collected.
* @param args - the leftover arguments, in argv order.
* @returns the resolved invocation.
*/
function resolveBoot(program, profile, options, args) {
	const patches = options.patch ?? [];
	if (patches.includes("")) program.error("error: --patch needs a path");
	if (options.fromDefaultProfile === "") program.error("error: --from-default-profile needs a name");
	if (options.dumpConfig !== true && options.dumpDefaultConfig !== true) return {
		mode: "profile",
		profile,
		fromDefaultProfile: options.fromDefaultProfile,
		patches,
		args
	};
	if (options.dumpConfig === true && options.dumpDefaultConfig === true) program.error("error: --dump-config and --dump-default-config are mutually exclusive");
	if (args.length > 0) program.error(`error: config dumps take no app arguments, got ${args.map((argument) => JSON.stringify(argument)).join(" ")}`);
	const defaultOnly = options.dumpDefaultConfig === true;
	if (defaultOnly && patches.length > 0) program.error("error: --dump-default-config prints the bundle layers and takes no --patch");
	return {
		mode: "dump-config",
		profile,
		fromDefaultProfile: options.fromDefaultProfile,
		defaultOnly,
		patches
	};
}
/**
* Resolve argv into one invocation, or print and exit for help, version, or an
* error.
* @param argv - arguments after the Node binary and script.
* @param version - version string printed by `--version`.
* @returns the resolved invocation.
*/
function parseDshArgs(argv, version) {
	let resolved;
	const program = new Command();
	program.name("dsh").version(version, "-V, --version", "output the version number").description("dsh: boot a DeepSeek Harness profile — an ordered stack of plugin-bundle patch layers under your own overrides.").addHelpText("after", HELP_EXAMPLES).exitOverride().helpOption(false).allowUnknownOption().passThroughOptions().enablePositionalOptions().argument("[args...]", "arguments for the booted profile's app (see: dsh --profile <name> --help)").option("--profile <name>", "the profile under $DSH_HOME/profiles to boot").option("--from-default-profile <name>", "initialize a new custom profile from a shipped profile template").option("--patch <path>", "extra patch-list overlay applied after the profile layer (repeatable)", collect).option("--dump-config", "print the composed profile tree and exit").option("--dump-default-config", "print the profile tree without its user layer or --patch overlays and exit").action((args, options) => {
		if (options.profile === void 0) {
			if (args.some((argument) => argument === "-h" || argument === "--help")) program.help();
			program.error("error: --profile <name> is required");
		}
		const profile = options.profile;
		if (profile === "") program.error("error: --profile needs a name");
		rejectElectronProfile(program, profile);
		resolved = resolveBoot(program, profile, options, args);
	});
	/** Reject parent options supplied before a subcommand. */
	const rejectParentOptions = (command) => {
		const parent = program.opts();
		if (parent.profile !== void 0 || parent.patch !== void 0 || parent.dumpConfig !== void 0 || parent.dumpDefaultConfig !== void 0 || parent.fromDefaultProfile !== void 0) program.error(`error: ${command} takes none of parent --profile, --from-default-profile, --patch, --dump-config, or --dump-default-config`);
	};
	const web = program.command("web").description("boot the web profile (alias of --profile web); the web app's own flags follow");
	web.helpOption(false).allowUnknownOption().passThroughOptions().enablePositionalOptions().argument("[args...]", "arguments for the web app (see: dsh web --help)").option("--patch <path>", "extra patch-list overlay applied after the profile layer (repeatable)", collect).option("--dump-config", "print the composed web-profile tree (with the user layer and any --patch) and exit").option("--dump-default-config", "print the web profile's bundle layers (no user layer) and exit").action((args, options) => {
		rejectParentOptions("web");
		resolved = resolveBoot(web, "web", options, args);
	});
	const plugin = program.command("plugin").description("manage a profile's plugins by forwarding the remaining arguments to pnpm in the profile directory");
	plugin.requiredOption("--profile <name>", "the profile whose plugins to manage (initialized on first use)").allowUnknownOption().argument("[args...]", "pnpm arguments, forwarded verbatim (add <pkg>, remove <pkg>, why <pkg>, ...)").action((args, options) => {
		rejectParentOptions("plugin");
		if (options.profile === "") program.error("error: --profile needs a name");
		rejectElectronProfile(plugin, options.profile);
		if (args.length === 0) program.error("error: plugin needs pnpm arguments to forward (e.g. add <package>)");
		resolved = {
			mode: "plugin",
			profile: options.profile,
			args
		};
	});
	try {
		program.parse(argv, { from: "user" });
	} catch (error) {
		return process.exit(error instanceof CommanderError ? error.exitCode : 1);
	}
	/* v8 ignore next -- an action resolves or Commander throws */
	if (resolved === void 0) throw new Error("dsh: no invocation resolved");
	return resolved;
}
//#endregion
//#region lib/types/bin.js
/**
* Command-line entry for dsh.
* @module @deepseek-ai/dsh/bin
*/
/* v8 ignore file -- built-bin acceptance exercises this self-executing dispatch. */
function readVersion() {
	const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"));
	return typeof manifest.version === "string" ? manifest.version : "0.0.0";
}
/**
* Run the public dsh command-line interface.
* @returns a promise that settles when the selected command mode finishes.
*/
async function runCli() {
	const invocation = parseDshArgs(process.argv.slice(2), readVersion());
	switch (invocation.mode) {
		case "profile": {
			const { runProfile } = await import("./profile-boot-BP_C0vpU.js");
			await runProfile({
				environment: loadLayeredEnv("dsh"),
				profile: invocation.profile,
				fromDefaultProfile: invocation.fromDefaultProfile,
				patchFiles: invocation.patches,
				args: invocation.args
			});
			break;
		}
		case "plugin": {
			const { runPlugin } = await import("./plugin-Ddi42qoW.js");
			process.exit(runPlugin(invocation.profile, invocation.args));
			break;
		}
		case "dump-config": {
			const { runDumpConfig } = await import("./dump-config-lFgMwK8i.js");
			runDumpConfig(invocation.profile, invocation.defaultOnly, invocation.patches, invocation.fromDefaultProfile);
			break;
		}
		default: throw new Error(`dsh: unhandled invocation mode ${JSON.stringify(invocation)}`);
	}
}
if (import.meta.main) await runCli();
//#endregion
export { runCli };

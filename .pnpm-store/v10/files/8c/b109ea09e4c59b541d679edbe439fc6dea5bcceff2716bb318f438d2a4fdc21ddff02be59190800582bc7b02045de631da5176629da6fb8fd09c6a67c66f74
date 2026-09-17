import { dirname, isAbsolute, join } from "node:path";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { launchEnvironmentOf, launchedThroughSsh } from "@deepseek-ai/dsh-launch-environment";
import z from "@deepseek-ai/schemastery";
import { spawn } from "node:child_process";
import { homedir, platform, tmpdir } from "node:os";
import { canOpenNativePath, openNativePath, runNativeCommand } from "@deepseek-ai/dsh-native-command";
import { scrubbedParentEnv } from "@deepseek-ai/dsh-subprocess";
//#region lib/types/catalog.js
/**
* The open-in-app application catalog: a compile-time table of launchable
* applications, each declaring per-platform launcher sources tried in order.
* The table is data only — platform resolution lives in `resolver.ts`, icon
* extraction in `icons.ts`. A platform with no declared entries resolves as
* an empty catalog.
*/
/** Launch-args token carrying the workspace directory (`--cd={path}`). */
const PATH_TOKEN = "{path}";
/** macOS spec checking the known application directories for the named bundles. */
function macApp(...fsNames) {
	return { locators: [{
		kind: "app",
		fsNames
	}] };
}
/** Iconless spec from its locator chain. */
function spec(...locators) {
	return { locators };
}
/** Spec from its locator chain plus the Linux desktop entry owning its icon. */
function desktopSpec(desktopId, ...locators) {
	return {
		locators,
		desktopId
	};
}
/** In-process PATH-name locator launching the resolved executable. */
function cli(name, ...args) {
	return {
		kind: "cli",
		name,
		args
	};
}
/** In-process PATH-name locator that is meaningful only with a desktop session. */
function desktopCli(name, ...args) {
	return {
		kind: "cli",
		name,
		args,
		requiresDesktop: true
	};
}
/** First-existing-file locator launching the matched candidate. */
function file(candidates, ...args) {
	return {
		kind: "file",
		candidates,
		args
	};
}
/** Windows `App Paths` registry locator for one registered executable name. */
function appPaths(exe, ...args) {
	return {
		kind: "app-paths",
		exe,
		args
	};
}
/** Windows Uninstall-record locator verified through the executable it points at. */
function installRecord(displayNamePrefix, relativeLauncher, ...args) {
	return {
		kind: "install-record",
		displayNamePrefix,
		relativeLauncher,
		args
	};
}
/**
* JetBrains product entry: known bundle names on macOS (direct-download and
* Toolbox spellings), the newest versioned `%ProgramFiles%\JetBrains` install
* or a verified Uninstall record on Windows, PATH command or Toolbox shell
* script on Linux.
*/
function jetBrains(id, productName, cliName, winExe, macNames) {
	return {
		id,
		platforms: {
			darwin: macApp(...macNames),
			win32: spec({
				kind: "scan",
				root: "${ProgramFiles}/JetBrains",
				namePrefix: productName,
				relativeLauncher: `bin/${winExe}`,
				args: []
			}, installRecord(productName, `bin/${winExe}`)),
			linux: spec(cli(cliName), file([`~/.local/share/JetBrains/Toolbox/scripts/${cliName}`]))
		}
	};
}
/**
* The launch catalog in menu order: file managers, editors and IDEs, Git
* GUIs, terminals. Finder, Terminal, and Explorer ship with their operating
* systems, so their locators always resolve there. macOS bundle names list
* the common install spellings; a bundle renamed or moved outside
* `/Applications` and `~/Applications` is not detected (README Known
* Limitations).
*/
const OPEN_IN_APP_CATALOG = [
	{
		id: "finder",
		platforms: { darwin: spec({
			kind: "fixed",
			launch: { kind: "shell-open" },
			iconPath: "/System/Library/CoreServices/Finder.app"
		}) }
	},
	{
		id: "explorer",
		platforms: { win32: spec({
			kind: "fixed",
			launch: { kind: "shell-open" },
			iconPath: "${SystemRoot}/explorer.exe"
		}) }
	},
	{
		id: "filemanager",
		platforms: { linux: spec(desktopCli("xdg-open")) }
	},
	{
		id: "cursor",
		platforms: {
			darwin: macApp("Cursor.app"),
			win32: spec(appPaths("Cursor.exe"), installRecord("Cursor"), file(["${LOCALAPPDATA}/Programs/cursor/Cursor.exe"])),
			linux: spec(cli("cursor"))
		}
	},
	{
		id: "vscode",
		platforms: {
			darwin: macApp("Visual Studio Code.app"),
			win32: spec(appPaths("Code.exe"), installRecord("Microsoft Visual Studio Code", "Code.exe"), file(["${LOCALAPPDATA}/Programs/Microsoft VS Code/Code.exe", "${ProgramFiles}/Microsoft VS Code/Code.exe"])),
			linux: desktopSpec("code", cli("code"))
		}
	},
	{
		id: "vscodeinsiders",
		platforms: {
			darwin: macApp("Visual Studio Code - Insiders.app"),
			win32: spec(appPaths("Code - Insiders.exe"), installRecord("Microsoft Visual Studio Code Insiders", "Code - Insiders.exe"), file(["${LOCALAPPDATA}/Programs/Microsoft VS Code Insiders/Code - Insiders.exe"])),
			linux: desktopSpec("code-insiders", cli("code-insiders"))
		}
	},
	{
		id: "windsurf",
		platforms: {
			darwin: macApp("Windsurf.app"),
			win32: spec(appPaths("Windsurf.exe"), installRecord("Windsurf"), file(["${LOCALAPPDATA}/Programs/Windsurf/Windsurf.exe"])),
			linux: spec(cli("windsurf"))
		}
	},
	{
		id: "zed",
		platforms: {
			darwin: macApp("Zed.app", "Zed Preview.app"),
			linux: desktopSpec("dev.zed.Zed", cli("zed"), {
				kind: "desktop",
				desktopId: "dev.zed.Zed",
				args: []
			})
		}
	},
	{
		id: "sublimetext",
		platforms: {
			darwin: macApp("Sublime Text.app"),
			win32: spec(appPaths("sublime_text.exe"), installRecord("Sublime Text"), file(["${ProgramFiles}/Sublime Text/sublime_text.exe"])),
			linux: desktopSpec("sublime_text", cli("subl"))
		}
	},
	{
		id: "xcode",
		platforms: { darwin: spec({ kind: "xcode" }) }
	},
	{
		id: "androidstudio",
		platforms: {
			darwin: macApp("Android Studio.app"),
			win32: spec(installRecord("Android Studio", "bin/studio64.exe"), file(["${ProgramFiles}/Android/Android Studio/bin/studio64.exe"])),
			linux: spec(cli("studio"), file(["~/.local/share/JetBrains/Toolbox/scripts/studio", "/opt/android-studio/bin/studio.sh"]))
		}
	},
	jetBrains("intellij", "IntelliJ IDEA", "idea", "idea64.exe", [
		"IntelliJ IDEA.app",
		"IntelliJ IDEA Ultimate.app",
		"IntelliJ IDEA CE.app"
	]),
	jetBrains("pycharm", "PyCharm", "pycharm", "pycharm64.exe", [
		"PyCharm.app",
		"PyCharm Professional.app",
		"PyCharm CE.app",
		"PyCharm Community.app"
	]),
	jetBrains("webstorm", "WebStorm", "webstorm", "webstorm64.exe", ["WebStorm.app"]),
	jetBrains("phpstorm", "PhpStorm", "phpstorm", "phpstorm64.exe", ["PhpStorm.app"]),
	jetBrains("goland", "GoLand", "goland", "goland64.exe", ["GoLand.app"]),
	jetBrains("rider", "Rider", "rider", "rider64.exe", ["Rider.app", "JetBrains Rider.app"]),
	jetBrains("rustrover", "RustRover", "rustrover", "rustrover64.exe", ["RustRover.app"]),
	{
		id: "fork",
		platforms: {
			darwin: macApp("Fork.app"),
			win32: spec(installRecord("Fork"), file(["${LOCALAPPDATA}/Fork/Fork.exe"]))
		}
	},
	{
		id: "sourcetree",
		platforms: { darwin: macApp("Sourcetree.app") }
	},
	{
		id: "github",
		platforms: {
			darwin: macApp("GitHub Desktop.app"),
			win32: spec({
				kind: "github-desktop",
				root: "${LOCALAPPDATA}/GitHubDesktop"
			})
		}
	},
	{
		id: "tower",
		platforms: { darwin: macApp("Tower.app") }
	},
	{
		id: "gitkraken",
		platforms: { darwin: macApp("GitKraken.app") }
	},
	{
		id: "smartgit",
		platforms: { darwin: macApp("SmartGit.app") }
	},
	{
		id: "sublimemerge",
		platforms: {
			darwin: macApp("Sublime Merge.app"),
			win32: spec(appPaths("sublime_merge.exe"), installRecord("Sublime Merge"), file(["${ProgramFiles}/Sublime Merge/sublime_merge.exe"])),
			linux: desktopSpec("sublime_merge", cli("smerge"))
		}
	},
	{
		id: "ghostty",
		platforms: {
			darwin: macApp("Ghostty.app"),
			linux: desktopSpec("com.mitchellh.ghostty", cli("ghostty", `--working-directory=${PATH_TOKEN}`), {
				kind: "desktop",
				desktopId: "com.mitchellh.ghostty",
				args: [`--working-directory=${PATH_TOKEN}`]
			})
		}
	},
	{
		id: "warp",
		platforms: { darwin: macApp("Warp.app") }
	},
	{
		id: "iterm",
		platforms: { darwin: macApp("iTerm.app") }
	},
	{
		id: "kitty",
		platforms: {
			darwin: macApp("kitty.app"),
			linux: desktopSpec("kitty", cli("kitty", "--directory"), {
				kind: "desktop",
				desktopId: "kitty",
				args: ["--directory"]
			})
		}
	},
	{
		id: "terminal",
		platforms: { darwin: spec({
			kind: "fixed",
			launch: {
				kind: "argv",
				command: "open",
				args: ["-a", "Terminal"]
			},
			iconPath: "/System/Applications/Utilities/Terminal.app"
		}) }
	},
	{
		id: "windowsterminal",
		platforms: { win32: spec(cli("wt", "-d")) }
	},
	{
		id: "gitbash",
		platforms: { win32: spec(installRecord("Git version", "git-bash.exe", `--cd=${PATH_TOKEN}`), file(["${ProgramFiles}/Git/git-bash.exe"], `--cd=${PATH_TOKEN}`)) }
	},
	{
		id: "gnometerminal",
		platforms: { linux: desktopSpec("org.gnome.Terminal", cli("gnome-terminal", `--working-directory=${PATH_TOKEN}`), {
			kind: "desktop",
			desktopId: "org.gnome.Terminal",
			args: [`--working-directory=${PATH_TOKEN}`]
		}) }
	},
	{
		id: "konsole",
		platforms: { linux: desktopSpec("org.kde.konsole", cli("konsole", "--workdir"), {
			kind: "desktop",
			desktopId: "org.kde.konsole",
			args: ["--workdir"]
		}) }
	}
];
//#endregion
//#region lib/types/resolver.js
/**
* Platform resolution for the open-in-app catalog: each entry's locator
* chain resolves to a verified {@link OpenInAppResolvedLaunch} — a
* launcher this host actually holds — and one resolution pass yields the
* map the routes serve and launch from, so a click never re-runs detection.
* PATH names resolve in-process through the injected subprocess capability;
* the remaining host commands (`xcode-select`, `reg.exe`) run through
* `@deepseek-ai/dsh-native-command` (argv, never a shell). Application
* adapters spawn detached with a credential-scrubbed environment and their
* declared Windows visibility policy ({@link launchDetachedApp}); `shell-open`
* launches (the file managers) go through the same package's path opener —
* the OS shell's open verb — instead of a direct spawn.
*/
/**
* Launch one application adapter detached from this process: the child gets a
* credential-scrubbed environment (never the harness's `*KEY*`/`*SECRET*`
* variables) plus the adapter's explicit environment entries, holds no stdio
* pipe, and outlives dsh. Windows GUI processes remain visible unless the
* adapter explicitly hides its own CLI process. Launch success is decoupled
* from process exit — launchers such as kitty or the JetBrains IDEs stay in
* the foreground for their whole window lifetime, so the watch window only
* catches launchers that fail immediately: rejects on a spawn failure and on
* a nonzero exit inside the window; a child still running when the window
* closes is unrefed and counted launched, never killed.
* @param command - executable path or PATH name.
* @param args - argv (never a shell string).
* @param options - watch-window length and adapter-specific process options.
* @returns after the launch is counted successful; rejects on early failure.
*/
const launchDetachedApp = (command, args, options) => new Promise((resolve, reject) => {
	const child = spawn(command, [...args], {
		detached: true,
		stdio: "ignore",
		windowsHide: options.windowsHide,
		env: {
			...scrubbedParentEnv(),
			...options.env
		}
	});
	let settled = false;
	const settle = (outcome) => {
		if (settled) return;
		settled = true;
		clearTimeout(watch);
		child.unref();
		outcome();
	};
	const watch = setTimeout(() => {
		settle(resolve);
	}, options.watchMs);
	child.on("error", (error) => {
		settle(() => {
			reject(error);
		});
	});
	child.on("exit", (code, signalName) => {
		if (code === 0) settle(resolve);
		else settle(() => {
			reject(/* @__PURE__ */ new Error(`launcher exited with code ${String(code)}, signal ${String(signalName)}`));
		});
	});
});
/**
* Resolve the injectable facts against the running host. `resolveExecutable`
* has no host default — the plugin supplies the composition's subprocess
* capability — so a caller that omits it fails loud here rather than
* silently resolving every `cli` locator as missing.
* @param internals - injectable facts.
* @returns the completed facts.
*/
function resolveInternals(internals) {
	const home = internals.home ?? homedir();
	const resolveExecutable = internals.resolveExecutable;
	if (resolveExecutable === void 0) throw new Error("open-in-app: internals.resolveExecutable is required (the subprocess capability provides it)");
	return {
		platform: internals.platform ?? platform(),
		ssh: internals.ssh ?? false,
		applicationRoots: internals.applicationRoots ?? ["/Applications", join(home, "Applications")],
		env: internals.env ?? process.env,
		home,
		run: internals.run ?? runNativeCommand,
		launch: internals.launch ?? launchDetachedApp,
		resolveExecutable
	};
}
/** Closed-union exhaustiveness fence for the catalog's locator kinds. */
/* v8 ignore next 3 -- closed catalog union; only reached if an entry is forged */
function assertNever(value) {
	throw new Error(`unhandled open-in-app catalog kind: ${JSON.stringify(value)}`);
}
/**
* Run one bounded host command.
* @param command - executable path or PATH name.
* @param args - argv (never a shell string).
* @param timeoutMs - command deadline.
* @param internals - completed platform facts.
* @returns stdout on exit 0; null on any failure (spawn, nonzero exit, timeout).
*/
async function output(command, args, timeoutMs, internals) {
	try {
		const { stdout } = await internals.run(command, args, AbortSignal.timeout(timeoutMs));
		return stdout;
	} catch {
		return null;
	}
}
/**
* Probe one path as an existing directory.
* @param path - candidate path.
* @returns true when the path exists and is a directory.
*/
async function isDirectory(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}
/**
* Probe one path as an existing regular file.
* @param path - candidate path.
* @returns true when the path exists and is a regular file.
*/
async function isFile(path) {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}
/**
* Expand `${VAR}` references and a leading `~/`. Expansion is string
* substitution: a candidate keeps its template's `/` separators after the
* expanded prefix, which Win32 path APIs accept.
* @param template - candidate template.
* @param internals - completed platform facts.
* @returns the expanded candidate, or null when a variable is unset.
*/
function expandCandidate(template, internals) {
	const unset = [];
	const expanded = template.replace(/\$\{([^}]+)\}/g, (token, name) => {
		const value = internals.env[name];
		if (value === void 0) unset.push(name);
		return value ?? token;
	});
	if (unset.length > 0) return null;
	return expanded.startsWith("~/") ? join(internals.home, expanded.slice(2)) : expanded;
}
/** Expand `%VAR%` references in a Windows registry value; null when a variable is unset. */
function expandRegistryValue(value, internals) {
	const unset = [];
	const expanded = value.replace(/%([^%]+)%/g, (token, name) => {
		const found = internals.env[name];
		if (found === void 0) unset.push(name);
		return found ?? token;
	});
	return unset.length > 0 ? null : expanded;
}
/** `App Paths` roots, user hive first (per-user installs shadow machine ones). */
const APP_PATHS_ROOTS = ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths", "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths"];
/** Uninstall-record roots: user hive, 64-bit machine hive, 32-bit machine view. */
const UNINSTALL_ROOTS = [
	"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
	"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
	"HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
];
/**
* Parse `reg.exe query <root> /s` output into per-subkey string values.
* `reg.exe` prints one key path line per subkey followed by indented value
* lines; the value-name/type/data columns are matched by the `REG_*` type
* token because the default-value marker localizes (`(Default)`, `(默认)`).
* @param dump - raw `reg.exe` stdout.
* @returns subkey path to its `REG_SZ`/`REG_EXPAND_SZ` values by value name
*   (the default value under the name `(Default)` regardless of locale).
*/
function parseRegistryDump(dump) {
	const keys = /* @__PURE__ */ new Map();
	let current;
	for (const line of dump.split(/\r?\n/)) {
		if (/^HK/.test(line)) {
			current = /* @__PURE__ */ new Map();
			keys.set(line.trim(), current);
			continue;
		}
		const value = /^\s+(.*?)\s+(REG_SZ|REG_EXPAND_SZ)\s+(.*)$/.exec(line);
		if (value === null || current === void 0) continue;
		const [name, data] = [value[1], value[3]];
		current.set(/^\(.*\)$/.test(name) ? "(Default)" : name, data.trim());
	}
	return keys;
}
/**
* Build the Windows registry facts for one resolution pass: the `App Paths`
* table and the Uninstall records, one `reg.exe query /s` per root. A root
* that fails or is absent contributes nothing.
* @param timeoutMs - per-`reg.exe` deadline.
* @param internals - completed platform facts.
* @returns the parsed view.
*/
async function readWindowsRegistryView(timeoutMs, internals) {
	const appPaths = /* @__PURE__ */ new Map();
	const installRecords = [];
	for (const root of APP_PATHS_ROOTS) {
		const dump = await output("reg.exe", [
			"query",
			root,
			"/s"
		], timeoutMs, internals);
		if (dump === null) continue;
		for (const [key, values] of parseRegistryDump(dump)) {
			const exe = key.slice(key.lastIndexOf("\\") + 1).toLowerCase();
			const target = values.get("(Default)");
			if (!exe.endsWith(".exe") || target === void 0 || appPaths.has(exe)) continue;
			const expanded = expandRegistryValue(target.replace(/^"|"$/g, ""), internals);
			if (expanded !== null) appPaths.set(exe, expanded);
		}
	}
	for (const root of UNINSTALL_ROOTS) {
		const dump = await output("reg.exe", [
			"query",
			root,
			"/s"
		], timeoutMs, internals);
		if (dump === null) continue;
		for (const values of parseRegistryDump(dump).values()) {
			const displayName = values.get("DisplayName");
			if (displayName === void 0) continue;
			installRecords.push({
				displayName,
				installLocation: values.get("InstallLocation"),
				displayIcon: values.get("DisplayIcon")
			});
		}
	}
	return {
		appPaths,
		installRecords
	};
}
/** Pass-scoped lazy holder so one detection pass reads the registry at most once. */
var RegistryViewOnce = class {
	timeoutMs;
	internals;
	view;
	constructor(timeoutMs, internals) {
		this.timeoutMs = timeoutMs;
		this.internals = internals;
	}
	/** The pass's registry view, read on first use. */
	read() {
		this.view ??= readWindowsRegistryView(this.timeoutMs, this.internals);
		return this.view;
	}
};
/** The executable a Windows Uninstall record proves, or null when it proves none. */
async function recordLauncher(record, relativeLauncher, internals) {
	if (relativeLauncher !== void 0 && record.installLocation !== void 0 && record.installLocation !== "") {
		const expanded = expandRegistryValue(record.installLocation.replace(/^"|"$/g, ""), internals);
		if (expanded !== null) {
			const candidate = join(expanded, relativeLauncher);
			if (await isFile(candidate)) return candidate;
		}
	}
	if (record.displayIcon !== void 0) {
		const expanded = expandRegistryValue(record.displayIcon.replace(/,-?\d+$/, "").replace(/^"|"$/g, "").trim(), internals);
		if (expanded !== null && expanded.toLowerCase().endsWith(".exe") && await isFile(expanded)) return expanded;
	}
	return null;
}
/**
* Parse the `[Desktop Entry]` section's `Exec`/`TryExec`/`Icon` keys.
* @param text - desktop-entry file text.
* @returns the recognized fields; keys outside the entry section are ignored.
*/
function parseDesktopEntry(text) {
	let inEntry = false;
	const fields = {};
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.startsWith("[")) {
			inEntry = trimmed === "[Desktop Entry]";
			continue;
		}
		if (!inEntry) continue;
		const separator = trimmed.indexOf("=");
		if (separator < 0) continue;
		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		if (key === "Exec") fields.exec = value;
		else if (key === "TryExec") fields.tryExec = value;
		else if (key === "Icon") fields.icon = value;
	}
	return fields;
}
/**
* XDG data directories in precedence order (`XDG_DATA_HOME`, then `XDG_DATA_DIRS`).
* @param internals - completed platform facts.
* @returns the data directories, freedesktop defaults applied.
*/
function xdgDataDirectories(internals) {
	return [internals.env["XDG_DATA_HOME"] ?? join(internals.home, ".local", "share"), ...(internals.env["XDG_DATA_DIRS"] ?? "/usr/local/share:/usr/share").split(":").filter((dir) => dir !== "")];
}
/**
* Read one desktop entry by id from the XDG application directories.
* @param desktopId - entry id without the `.desktop` suffix.
* @param internals - completed platform facts.
* @returns the parsed entry, or null when no directory holds it.
*/
async function findDesktopEntry(desktopId, internals) {
	for (const dataDir of xdgDataDirectories(internals)) {
		const path = join(dataDir, "applications", `${desktopId}.desktop`);
		try {
			return parseDesktopEntry(await readFile(path, "utf8"));
		} catch {}
	}
	return null;
}
/**
* The executable one desktop entry proves: a `TryExec` when present,
* otherwise `Exec`'s first token (quoted or bare); absolute paths verify on
* disk and bare names resolve in-process through the subprocess capability.
*/
async function desktopLauncher(entry, internals) {
	const candidate = entry.tryExec ?? execCommand(entry.exec);
	if (candidate === null || candidate === "") return null;
	if (isAbsolute(candidate)) return await isFile(candidate) ? candidate : null;
	return internals.resolveExecutable(candidate);
}
/**
* First token of an `Exec=` value.
* @param exec - the raw `Exec=` value, when the entry carries one.
* @returns the quoted path or the run up to whitespace; null when absent or blank.
*/
function execCommand(exec) {
	if (exec === void 0) return null;
	const quoted = /^"([^"]+)"/.exec(exec);
	if (quoted?.[1] !== void 0) return quoted[1];
	const bare = /^\S+/.exec(exec);
	return bare === null ? null : bare[0];
}
/**
* The catalog entry's spec for one platform.
* @param app - catalog entry.
* @param platform - host platform.
* @returns the declared spec; undefined off the declared three platforms.
*/
function specFor(app, platform) {
	return platform === "darwin" || platform === "win32" || platform === "linux" ? app.platforms[platform] : void 0;
}
/** Icon source for a resolved executable: Windows extracts from the binary itself. */
function executableIcon(path, internals) {
	return internals.platform === "win32" ? {
		kind: "executable",
		path
	} : void 0;
}
/** Resolve one locator to a verified launch, or null when it proves nothing. */
async function locate(locator, probeTimeoutMs, registry, internals) {
	switch (locator.kind) {
		case "fixed": {
			const iconPath = expandCandidate(locator.iconPath, internals);
			const icon = iconPath === null ? void 0 : internals.platform === "win32" ? {
				kind: "executable",
				path: iconPath
			} : {
				kind: "app-bundle",
				path: iconPath
			};
			return {
				launch: locator.launch,
				icon
			};
		}
		case "app":
			for (const root of internals.applicationRoots) for (const fsName of locator.fsNames) {
				const bundle = join(root, fsName);
				if (await isDirectory(bundle)) return {
					launch: {
						kind: "argv",
						command: "open",
						args: ["-a", bundle]
					},
					icon: {
						kind: "app-bundle",
						path: bundle
					}
				};
			}
			return null;
		case "xcode": {
			const developer = await output("xcode-select", ["-p"], probeTimeoutMs, internals);
			if (developer === null) return null;
			const bundle = dirname(dirname(developer.trim()));
			if (!bundle.endsWith(".app") || !await isDirectory(bundle)) return null;
			return {
				launch: {
					kind: "argv",
					command: "xed",
					args: []
				},
				fallbackLaunch: {
					kind: "argv",
					command: "open",
					args: ["-a", bundle]
				},
				icon: {
					kind: "app-bundle",
					path: bundle
				}
			};
		}
		case "cli": {
			if (locator.requiresDesktop === true && !canOpenNativePath({
				platform: internals.platform,
				env: { ...internals.env }
			})) return null;
			const found = await internals.resolveExecutable(locator.name);
			return found === null ? null : {
				launch: {
					kind: "argv",
					command: found,
					args: locator.args
				},
				icon: executableIcon(found, internals)
			};
		}
		case "file":
			for (const candidate of locator.candidates) {
				const path = expandCandidate(candidate, internals);
				if (path !== null && await isFile(path)) return {
					launch: {
						kind: "argv",
						command: path,
						args: locator.args
					},
					icon: executableIcon(path, internals)
				};
			}
			return null;
		case "scan": {
			const root = expandCandidate(locator.root, internals);
			if (root === null) return null;
			let entries;
			try {
				entries = await readdir(root);
			} catch {
				return null;
			}
			const versions = entries.filter((entry) => entry.startsWith(locator.namePrefix)).sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
			for (const version of versions) {
				const launcher = join(root, version, locator.relativeLauncher);
				if (await isFile(launcher)) return {
					launch: {
						kind: "argv",
						command: launcher,
						args: locator.args
					},
					icon: executableIcon(launcher, internals)
				};
			}
			return null;
		}
		case "app-paths": {
			const target = (await registry.read()).appPaths.get(locator.exe.toLowerCase());
			if (target === void 0 || !await isFile(target)) return null;
			return {
				launch: {
					kind: "argv",
					command: target,
					args: locator.args
				},
				icon: {
					kind: "executable",
					path: target
				}
			};
		}
		case "install-record":
			for (const record of (await registry.read()).installRecords) {
				if (!record.displayName.startsWith(locator.displayNamePrefix)) continue;
				const launcher = await recordLauncher(record, locator.relativeLauncher, internals);
				if (launcher !== null) return {
					launch: {
						kind: "argv",
						command: launcher,
						args: locator.args
					},
					icon: {
						kind: "executable",
						path: launcher
					}
				};
			}
			return null;
		case "github-desktop": {
			const root = expandCandidate(locator.root, internals);
			if (root === null) return null;
			let versions;
			try {
				versions = (await readdir(root)).filter((entry) => entry.startsWith("app-")).sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
			} catch {
				return null;
			}
			for (const version of versions) {
				const directory = join(root, version);
				const executable = join(directory, "GitHubDesktop.exe");
				const cli = join(directory, "resources", "app", "cli.js");
				if (await isFile(executable) && await isFile(cli)) return {
					launch: {
						kind: "argv",
						command: executable,
						args: [cli, "open"],
						env: { ELECTRON_RUN_AS_NODE: "1" },
						windowsHide: true
					},
					icon: {
						kind: "executable",
						path: executable
					}
				};
			}
			return null;
		}
		case "desktop": {
			const entry = await findDesktopEntry(locator.desktopId, internals);
			if (entry === null) return null;
			const launcher = await desktopLauncher(entry, internals);
			return launcher === null ? null : { launch: {
				kind: "argv",
				command: launcher,
				args: locator.args
			} };
		}
		/* v8 ignore next -- closed locator union */
		default: return assertNever(locator);
	}
}
/**
* Resolve one catalog entry on this host: this platform's locators are tried
* in order and the first verified launcher wins.
* @param app - catalog entry.
* @param probeTimeoutMs - per-command deadline for resolution host commands.
* @param internals - platform and runner hooks for deterministic tests.
* @returns the verified launch, or null during SSH launches or when the entry is not installed here.
*/
async function resolveLaunch(app, probeTimeoutMs, internals = {}) {
	const resolved = resolveInternals(internals);
	if (resolved.ssh) return null;
	return resolveWithRegistry(app, probeTimeoutMs, new RegistryViewOnce(probeTimeoutMs, resolved), resolved);
}
/** Resolve one entry against a pass-shared registry view. */
async function resolveWithRegistry(app, probeTimeoutMs, registry, internals) {
	const platformSpec = specFor(app, internals.platform);
	if (platformSpec === void 0) return null;
	for (const locator of platformSpec.locators) {
		const found = await locate(locator, probeTimeoutMs, registry, internals);
		if (found !== null) return found;
	}
	return null;
}
/**
* Resolve the whole catalog once: every entry's verified launcher on this
* host, in menu order. The Windows registry is read at most once per pass.
* The returned map is the mutable authority the caller owns — the routes
* serve its keys and launch from its values, and a stale entry is replaced
* or removed in place after an `ENOENT` launch.
* An SSH launch returns an empty map without probing.
* @param probeTimeoutMs - per-command deadline for resolution host commands.
* @param internals - platform and runner hooks for deterministic tests.
* @returns catalog id to verified launch, in catalog order.
*/
async function resolveOpenInAppApps(probeTimeoutMs, internals = {}) {
	const resolved = resolveInternals(internals);
	if (resolved.ssh) return /* @__PURE__ */ new Map();
	const registry = new RegistryViewOnce(probeTimeoutMs, resolved);
	const entries = await Promise.all(OPEN_IN_APP_CATALOG.map(async (app) => [app.id, await resolveWithRegistry(app, probeTimeoutMs, registry, resolved)]));
	const map = /* @__PURE__ */ new Map();
	for (const [id, launch] of entries) if (launch !== null) map.set(id, launch);
	return map;
}
/**
* Substitute the directory token into one launch argv, appending the
* directory when no arg carries one.
*/
function launchArgs(args, path) {
	return args.some((arg) => arg.includes("{path}")) ? args.map((arg) => arg.replaceAll(PATH_TOKEN, path)) : [...args, path];
}
/** Whether a launch rejection names a missing executable (a stale resolution). */
function isMissingExecutable(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
/**
* Open one directory through the OS shell's open verb under the launch watch
* window: the opener command completing inside the window decides the
* outcome, and an opener still running when it closes counts as launched and
* keeps running (a cold `powershell.exe` start can outlive the window; its
* late settlement is swallowed because the request already answered).
*/
function runShellOpen(path, watchMs, internals) {
	const opening = openNativePath(path, new AbortController().signal, {
		platform: internals.platform,
		run: internals.run,
		env: internals.env
	});
	return new Promise((resolve) => {
		const watch = setTimeout(() => {
			opening.catch(() => {});
			resolve("launched");
		}, watchMs);
		opening.then(() => {
			clearTimeout(watch);
			resolve("launched");
		}, (error) => {
			clearTimeout(watch);
			resolve(isMissingExecutable(error) ? "missing" : "failed");
		});
	});
}
/** Run one launcher and classify how the attempt ended. */
async function runLaunch(launch, path, watchMs, internals) {
	switch (launch.kind) {
		case "shell-open": return runShellOpen(path, watchMs, internals);
		case "argv": try {
			await internals.launch(launch.command, launchArgs(launch.args, path), {
				watchMs,
				...launch.env === void 0 ? {} : { env: launch.env },
				...launch.windowsHide === void 0 ? {} : { windowsHide: launch.windowsHide }
			});
			return "launched";
		} catch (error) {
			return isMissingExecutable(error) ? "missing" : "failed";
		}
		/* v8 ignore next -- closed launch union */
		default: return assertNever(launch);
	}
}
/**
* Launch one resolved application on a directory: the primary launcher, then
* the fallback when the primary fails inside the watch window.
* @param resolved - the entry's verified launchers.
* @param path - absolute workspace directory (already validated by the route).
* @param watchMs - early-failure watch window per launcher (a child still
* running when it closes counts as launched and keeps running).
* @param internals - launcher hook for deterministic tests.
* @returns how the attempt ended; `missing` when a tried launcher's
*   executable is gone, which tells the caller to re-resolve once.
*/
async function launchResolved(resolved, path, watchMs, internals = {}) {
	const completed = resolveInternals(internals);
	const primary = await runLaunch(resolved.launch, path, watchMs, completed);
	if (primary === "launched" || resolved.fallbackLaunch === void 0) return primary;
	const fallback = await runLaunch(resolved.fallbackLaunch, path, watchMs, completed);
	if (fallback === "launched") return "launched";
	return primary === "missing" || fallback === "missing" ? "missing" : "failed";
}
//#endregion
//#region lib/types/icons.js
/**
* Host icon extraction for resolved open-in-app applications, one strategy
* per platform: macOS converts the resolved bundle's `.icns` to a 128px PNG
* (`plutil` + `sips`); Windows extracts the resolved executable's associated
* icon as a 32px PNG through a generated PowerShell script (the largest size
* `ExtractAssociatedIcon` yields without a native addon); Linux follows the
* spec's desktop entry `Icon=` key into the hicolor theme and pixmaps
* directories (PNG or SVG, no subprocess). Every failure resolves null and
* the icon route answers 404, which the browser renders as a generic glyph.
*/
/**
* Extract one bundle's icon as a 128px PNG: read `CFBundleIconFile` from
* Info.plist (`plutil` to JSON; the value may omit the .icns extension), fall
* back to the first `Resources/*.icns`, then convert with `sips` through a
* fresh temp file.
*/
async function extractBundleIconPng(bundlePath, timeoutMs, internals) {
	const resources = join(bundlePath, "Contents", "Resources");
	let iconFile = null;
	const plistJson = await output("plutil", [
		"-convert",
		"json",
		"-o",
		"-",
		join(bundlePath, "Contents", "Info.plist")
	], timeoutMs, internals);
	if (plistJson !== null) try {
		const declared = JSON.parse(plistJson).CFBundleIconFile;
		if (typeof declared === "string" && declared !== "") iconFile = declared.endsWith(".icns") ? declared : `${declared}.icns`;
	} catch {}
	if (iconFile === null) try {
		iconFile = (await readdir(resources)).find((entry) => entry.endsWith(".icns")) ?? null;
	} catch {
		return null;
	}
	if (iconFile === null) return null;
	const icns = join(resources, iconFile);
	try {
		await stat(icns);
	} catch {
		return null;
	}
	const workDir = await mkdtemp(join(tmpdir(), "dsh-open-in-app-"));
	try {
		const outPng = join(workDir, "icon.png");
		if (await output("sips", [
			"-s",
			"format",
			"png",
			"-Z",
			"128",
			icns,
			"--out",
			outPng
		], timeoutMs, internals) === null) return null;
		try {
			return await readFile(outPng);
		} catch {
			return null;
		}
	} finally {
		await rm(workDir, {
			recursive: true,
			force: true
		});
	}
}
/**
* The associated-icon extraction script. `-File` with positional args keeps
* paths out of the command line's parsing (no quoting/escaping surface);
* `ExtractAssociatedIcon` yields 32px, the most the stock .NET surface gives
* without a native addon (README Known Limitations).
*/
const EXTRACT_ICON_PS1 = [
	"param([string]$Source, [string]$Target)",
	"$ErrorActionPreference = \"Stop\"",
	"Add-Type -AssemblyName System.Drawing",
	"$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Source)",
	"if ($null -eq $icon) { exit 1 }",
	"$bitmap = $icon.ToBitmap()",
	"$bitmap.Save($Target, [System.Drawing.Imaging.ImageFormat]::Png)",
	""
].join("\n");
/** Extract one Windows executable's associated icon as a 32px PNG. */
async function extractExecutableIconPng(executablePath, timeoutMs, internals) {
	const workDir = await mkdtemp(join(tmpdir(), "dsh-open-in-app-"));
	try {
		const script = join(workDir, "extract-icon.ps1");
		const outPng = join(workDir, "icon.png");
		await writeFile(script, EXTRACT_ICON_PS1, "utf8");
		if (await output("powershell.exe", [
			"-NoProfile",
			"-NonInteractive",
			"-ExecutionPolicy",
			"Bypass",
			"-File",
			script,
			executablePath,
			outPng
		], timeoutMs, internals) === null) return null;
		try {
			return await readFile(outPng);
		} catch {
			return null;
		}
	} finally {
		await rm(workDir, {
			recursive: true,
			force: true
		});
	}
}
/** Theme sizes searched largest-first; the button renders at 15-18 CSS px. */
const HICOLOR_SIZES = [
	"512x512",
	"256x256",
	"128x128",
	"64x64",
	"48x48",
	"32x32"
];
/** The media type an icon file's extension names. */
function iconContentType(path) {
	if (path.endsWith(".png")) return "image/png";
	if (path.endsWith(".svg")) return "image/svg+xml";
	return null;
}
/** Read one icon file when it exists and carries a servable media type. */
async function readIconFile(path) {
	const contentType = iconContentType(path);
	if (contentType === null || !await isFile(path)) return null;
	return {
		bytes: await readFile(path),
		contentType
	};
}
/**
* Resolve a Linux icon name through the hicolor theme and pixmaps
* directories, largest size first. The user's active icon theme is not
* consulted (README Known Limitations): hicolor is the freedesktop fallback
* every theme inherits from, so the stock icon is found wherever the
* application installed one.
*/
async function findLinuxThemeIcon(name, dataDirs) {
	for (const dataDir of dataDirs) {
		for (const size of HICOLOR_SIZES) for (const extension of ["png", "svg"]) {
			const icon = await readIconFile(join(dataDir, "icons", "hicolor", size, "apps", `${name}.${extension}`));
			if (icon !== null) return icon;
		}
		const scalable = await readIconFile(join(dataDir, "icons", "hicolor", "scalable", "apps", `${name}.svg`));
		if (scalable !== null) return scalable;
		for (const extension of ["png", "svg"]) {
			const pixmap = await readIconFile(join(dataDir, "pixmaps", `${name}.${extension}`));
			if (pixmap !== null) return pixmap;
		}
	}
	return null;
}
/** One Linux application's icon from its desktop entry's `Icon=` key. */
async function extractLinuxIcon(desktopId, internals) {
	const icon = (await findDesktopEntry(desktopId, internals))?.icon;
	if (icon === void 0 || icon === "") return null;
	if (isAbsolute(icon)) return readIconFile(icon);
	return findLinuxThemeIcon(icon, xdgDataDirectories(internals));
}
/**
* Extract one resolved application's icon on this host.
* @param app - catalog entry (its Linux spec names the desktop entry).
* @param resolved - the entry's verified launch (its icon source on macOS/Windows).
* @param timeoutMs - per-command deadline for extraction host commands.
* @param internals - platform and runner hooks for deterministic tests.
* @returns the icon bytes and media type, or null when this host serves none.
*/
async function extractAppIcon(app, resolved, timeoutMs, internals = {}) {
	const completed = resolveInternals(internals);
	if (completed.platform === "linux") {
		const desktopId = specFor(app, completed.platform)?.desktopId;
		return desktopId === void 0 ? null : extractLinuxIcon(desktopId, completed);
	}
	if (resolved.icon === void 0) return null;
	if (resolved.icon.kind === "app-bundle") {
		const bytes = await extractBundleIconPng(resolved.icon.path, timeoutMs, completed);
		return bytes === null ? null : {
			bytes,
			contentType: "image/png"
		};
	}
	const bytes = await extractExecutableIconPng(resolved.icon.path, timeoutMs, completed);
	return bytes === null ? null : {
		bytes,
		contentType: "image/png"
	};
}
//#endregion
//#region lib/types/internals.js
/** Test seams for host facts and process adapters; production keeps the empty defaults. */
/** Injectable catalog facts used by source-level tests before plugin activation. */
const internals = { catalog: {} };
//#endregion
//#region lib/types/shared.js
/**
* Route paths and wire payloads shared verbatim by the host routes and the
* browser package (`@deepseek-ai/dsh-client-ui-open-in-app`), published as
* the `./shared` subpath. Browser-safe: constants and types only.
*/
/** GET route serving the probed application ids. */
const OPEN_IN_APP_APPS_ROUTE = "/open-in-app/apps";
/** GET prefix serving one PNG bundle icon per application id. */
const OPEN_IN_APP_ICON_PREFIX = "/open-in-app/icon";
/** POST route launching one application on one workspace directory. */
const OPEN_IN_APP_OPEN_ROUTE = "/open-in-app/open";
//#endregion
//#region lib/types/index.js
/**
* Host half of open-in-app: three routes on the composition's `webServer`
* serving the resolved application catalog, per-application icons, and the
* launch endpoint the browser split button
* (`@deepseek-ai/dsh-client-ui-open-in-app`) posts to.
*
* Security has one home, here. Every route asks the composition's
* `connection` service for a rejection first (`requestRejection`): its
* Host/Origin fence defeats DNS rebinding and cross-site calls, and its
* browser authentication (the login-token cookie) gates every caller before
* any resolution result, icon, or launch is reachable. On top of that fence
* the open route validates its body at the wire: an `application/json` media
* type, a 64 KiB ceiling, string `app`/`path` fields, a resolved-available
* catalog id, and an absolute path naming an existing directory.
*
* The catalog resolves lazily, once per plugin life, on the first request
* that needs it, into one map of verified launchers: the apps route serves
* its keys and the open route launches its values, so a click, menu open, or
* page reload never re-runs detection. A launch that finds its executable
* gone (`ENOENT`) invalidates that one entry and re-resolves it once.
*/
/** Cordis function-plugin name. */
const name = "open-in-app";
/** The route carrier, the trust fence guarding every route, and the PATH resolver. */
const inject = [
	"webServer",
	"connection",
	"subprocess"
];
const boundedMs = () => z.number().step(1).min(1).max(6e5).required();
const Config = z.object({
	probeTimeoutMs: boundedMs(),
	iconTimeoutMs: boundedMs(),
	launchWatchMs: boundedMs()
});
/** The composition's connection service (typed locally: its package is browser-side). */
function connectionOf(ctx) {
	return Reflect.get(ctx, "connection");
}
/** Open-route request bodies are tiny JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 64 * 1024;
/** JSON response (no-store: availability and launch outcomes are live facts). */
function sendJson(res, status, payload) {
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(JSON.stringify(payload));
}
/** 405 with the route's one supported method. */
function sendMethodNotAllowed(res, allow) {
	res.statusCode = 405;
	res.setHeader("allow", allow);
	res.end();
}
/** Collect a bounded request body as UTF-8 text; null past the ceiling (stream drained). */
async function readBoundedBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.byteLength;
		if (size > MAX_BODY_BYTES) {
			req.resume();
			return null;
		}
		chunks.push(chunk);
	}
	return Buffer.concat(chunks, size).toString("utf8");
}
/** Validate one open-route body at the wire: JSON object with string app/path. */
function parseOpenBody(text) {
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof body !== "object" || body === null) return null;
	const { app, path } = body;
	return typeof app === "string" && typeof path === "string" ? {
		app,
		path
	} : null;
}
/** Register the apps, icon, and open routes behind the connection trust fence. */
function apply(ctx, config) {
	const ssh = launchedThroughSsh(launchEnvironmentOf(ctx));
	/** Test-seam facts completed with the composition's PATH resolver. */
	const catalogInternals = () => ({
		ssh,
		resolveExecutable: async (name) => {
			try {
				return await ctx.subprocess.resolveExecutable(name);
			} catch {
				return null;
			}
		},
		...internals.catalog
	});
	/** Lazy once-per-plugin-life resolution; the map is the mutable authority. */
	let resolutions;
	const availability = () => resolutions ??= resolveOpenInAppApps(config.probeTimeoutMs, catalogInternals());
	/** Per-app icon promise cache (null = resolved as unavailable). */
	const icons = /* @__PURE__ */ new Map();
	const iconOf = (app, resolved) => {
		let cached = icons.get(app.id);
		if (cached === void 0) {
			cached = extractAppIcon(app, resolved, config.iconTimeoutMs, catalogInternals());
			icons.set(app.id, cached);
		}
		return cached;
	};
	/**
	* Replace one stale resolution after a missing-executable launch: the
	* entry (and its icon) re-resolves once; an entry that no longer resolves
	* leaves the map and the next apps read no longer offers it.
	*/
	const refreshResolution = async (app) => {
		const map = await availability();
		const fresh = await resolveLaunch(app, config.probeTimeoutMs, catalogInternals());
		icons.delete(app.id);
		if (fresh === null) {
			map.delete(app.id);
			return;
		}
		map.set(app.id, fresh);
		return fresh;
	};
	/** Answer an untrusted/unauthenticated request; true when it was rejected. */
	const rejected = (req, res) => {
		const rejection = connectionOf(ctx).requestRejection(req);
		if (rejection === void 0) return false;
		res.statusCode = rejection;
		res.end();
		return true;
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: OPEN_IN_APP_APPS_ROUTE,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "GET") {
				sendMethodNotAllowed(res, "GET");
				return;
			}
			sendJson(res, 200, { apps: [...(await availability()).keys()] });
		}
	}), `open-in-app: GET ${OPEN_IN_APP_APPS_ROUTE}`);
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: OPEN_IN_APP_ICON_PREFIX,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "GET") {
				sendMethodNotAllowed(res, "GET");
				return;
			}
			const id = new URL(String(req.url), "http://localhost").pathname.slice(17).replace(/^\//, "");
			const noIcon = () => {
				sendJson(res, 404, {
					code: "not-found",
					message: `no icon for ${id}`
				});
			};
			const app = OPEN_IN_APP_CATALOG.find((entry) => entry.id === id);
			if (app === void 0) {
				noIcon();
				return;
			}
			const resolved = (await availability()).get(app.id);
			if (resolved === void 0) {
				noIcon();
				return;
			}
			const icon = await iconOf(app, resolved);
			if (icon === null) {
				noIcon();
				return;
			}
			res.statusCode = 200;
			res.setHeader("content-type", icon.contentType);
			res.setHeader("cache-control", "public, max-age=3600");
			res.end(icon.bytes);
		}
	}), `open-in-app: GET ${OPEN_IN_APP_ICON_PREFIX}/<id>`);
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: OPEN_IN_APP_OPEN_ROUTE,
		handler: async (req, res) => {
			if (rejected(req, res)) return;
			if (req.method !== "POST") {
				sendMethodNotAllowed(res, "POST");
				return;
			}
			if (String(req.headers["content-type"]).split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
				sendJson(res, 415, {
					code: "unsupported-media-type",
					message: "content-type must be application/json"
				});
				return;
			}
			let text;
			try {
				text = await readBoundedBody(req);
			} catch {
				sendJson(res, 400, {
					code: "bad-request",
					message: "request body unreadable"
				});
				return;
			}
			if (text === null) {
				sendJson(res, 413, {
					code: "payload-too-large",
					message: "request body is too large"
				});
				return;
			}
			const parsed = parseOpenBody(text);
			if (parsed === null) {
				sendJson(res, 400, {
					code: "bad-request",
					message: "request body must be JSON with string \"app\" and \"path\""
				});
				return;
			}
			const app = OPEN_IN_APP_CATALOG.find((entry) => entry.id === parsed.app);
			const resolved = app === void 0 ? void 0 : (await availability()).get(app.id);
			if (app === void 0 || resolved === void 0) {
				sendJson(res, 400, {
					code: "bad-request",
					message: `unknown or unavailable app: ${parsed.app}`
				});
				return;
			}
			if (parsed.path === "" || !isAbsolute(parsed.path)) {
				sendJson(res, 400, {
					code: "bad-request",
					message: "path must be an absolute directory path"
				});
				return;
			}
			let directory;
			try {
				directory = (await stat(parsed.path)).isDirectory();
			} catch {
				directory = false;
			}
			if (!directory) {
				sendJson(res, 404, {
					code: "not-found",
					message: `directory does not exist: ${parsed.path}`
				});
				return;
			}
			let outcome = await launchResolved(resolved, parsed.path, config.launchWatchMs, catalogInternals());
			if (outcome === "missing") {
				const fresh = await refreshResolution(app);
				outcome = fresh === void 0 ? "failed" : await launchResolved(fresh, parsed.path, config.launchWatchMs, catalogInternals());
			}
			if (outcome === "launched") sendJson(res, 200, { ok: true });
			else sendJson(res, 502, {
				code: "launch-failed",
				message: `failed to launch ${app.id}`
			});
		}
	}), `open-in-app: POST ${OPEN_IN_APP_OPEN_ROUTE}`);
}
//#endregion
export { Config, apply, inject, name };

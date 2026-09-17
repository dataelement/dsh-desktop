import { execFile } from "node:child_process";
import { release } from "node:os";
import { dirname, extname } from "node:path";
import { pathToFileURL } from "node:url";
//#region lib/types/runner.js
/**
* Shared no-shell `execFile` runner for host-native OS integrations.
* @module @deepseek-ai/dsh-native-command/runner
*/
/**
* Run a host command with utf8 stdio, abort propagation, and Windows hide.
* @param command - executable path or PATH name.
* @param args - argv (never a shell string).
* @param signal - caller/connection lifetime; abort terminates the child.
* @returns captured stdout/stderr on exit 0.
*/
const runNativeCommand = (command, args, signal) => new Promise((resolve, reject) => {
	execFile(command, [...args], {
		encoding: "utf8",
		signal,
		windowsHide: true
	}, (error, stdout, stderr) => {
		if (error !== null) {
			reject(Object.assign(new Error(error.message, { cause: error }), {
				code: error.code,
				stdout,
				stderr
			}));
			return;
		}
		resolve({
			stdout,
			stderr
		});
	});
});
//#endregion
//#region lib/types/path-opener.js
/**
* Cross-platform native path and text-document openers for Host UI
* integrations.
*
* The default intent prefers the default browser for documents it renders when
* the platform can name one, then falls back to the default application. WSL
* translates every path for the Windows desktop instead of assuming a Linux
* GUI. The text-editor intent never consults the browser.
* @module @deepseek-ai/dsh-native-command/path-opener
*/
/** Documents a browser renders, as opposed to ones an editor merely edits. */
const BROWSER_DOCUMENTS = new Set([
	".html",
	".htm",
	".xhtml",
	".svg"
]);
/**
* The macOS bundle registered for `https` — the default browser, as
* LaunchServices records it. The nested version dict is stripped first
* because it carries its own `LSHandlerRoleAll`.
*/
function macBundleForHttps(plist) {
	const stripped = plist.replace(/LSHandlerPreferredVersions\s*=\s*\{[^}]*\};/g, "");
	const block = /\{[^{}]*LSHandlerURLScheme\s*=\s*"?https"?;[^{}]*\}/.exec(stripped)?.[0];
	if (block === void 0) return void 0;
	return /LSHandlerRoleAll\s*=\s*"?([\w.-]+)"?;/.exec(block)?.[1];
}
/**
* Open one browser-renderable document with the default browser.
* @returns true when a browser took it; false when this platform cannot name
* one, or naming it failed — the caller then uses the default application.
*/
async function openInBrowser(path, signal, platform, run, env) {
	if (platform === "darwin") {
		let bundle;
		try {
			const { stdout } = await run("defaults", ["read", "com.apple.LaunchServices/com.apple.launchservices.secure"], signal);
			bundle = macBundleForHttps(stdout);
		} catch {
			return false;
		}
		if (bundle === void 0) return false;
		await run("open", [
			"-b",
			bundle,
			path
		], signal);
		return true;
	}
	if (platform === "linux") {
		const browser = env.BROWSER;
		if (browser === void 0 || browser === "") return false;
		await run(browser, [path], signal);
		return true;
	}
	return false;
}
/** PowerShell single-quoted literal (doubles embedded quotes). */
function powershellLiteral(path) {
	return `'${path.replace(/'/g, "''")}'`;
}
/** Whether one environment marker is set to a non-empty value. */
function present(value) {
	return value !== void 0 && value !== "";
}
/** Distinguish WSL from desktop Linux using its process and kernel markers. */
function isWsl(internals) {
	const env = internals.env ?? process.env;
	if (present(env.WSL_DISTRO_NAME) || present(env.WSL_INTEROP)) return true;
	return (internals.osRelease ?? release()).toLowerCase().includes("microsoft");
}
/** Open one Windows-resolvable path through its registered desktop application. */
async function openWindowsPath(path, signal, run) {
	await run("powershell.exe", [
		"-NoProfile",
		"-Command",
		`Invoke-Item -LiteralPath ${powershellLiteral(path)}`
	], signal);
}
/** Translate a WSL path before handing it to the Windows desktop. */
async function openWslPath(path, signal, run) {
	const translated = await run("wslpath", ["-w", path], signal);
	signal.throwIfAborted();
	const windowsPath = translated.stdout.replace(/[\r\n]+$/, "");
	if (windowsPath === "") throw new Error("wslpath returned no Windows path");
	await openWindowsPath(windowsPath, signal, run);
}
/** Dispatch one shell-free platform command for the requested open intent. */
async function openNativePathWithIntent(path, signal, intent, internals = {}) {
	const platform = internals.platform ?? process.platform;
	const run = internals.run ?? runNativeCommand;
	const env = internals.env ?? process.env;
	const wsl = platform === "linux" && isWsl(internals);
	if (!wsl && intent === "default" && BROWSER_DOCUMENTS.has(extname(path).toLowerCase()) && await openInBrowser(path, signal, platform, run, env)) return;
	if (platform === "darwin") {
		await run("open", intent === "text-editor" ? ["-t", path] : [path], signal);
		return;
	}
	if (platform === "win32") {
		await openWindowsPath(path, signal, run);
		return;
	}
	if (platform === "linux") {
		if (wsl) {
			await openWslPath(path, signal, run);
			return;
		}
		await run("xdg-open", [path], signal);
		return;
	}
	throw new Error(`native path opener is unsupported on ${platform}`);
}
/**
* Whether {@link openNativePath} plausibly reaches a desktop on this host.
*
* macOS and Windows always carry a desktop opener; Linux does when it is WSL
* (the Windows desktop takes the path) or a display server is announced.
* A headless or containerised Linux host answers false, which is what lets a
* surface show a path as text instead of offering a button that would spawn
* `xdg-open` into nothing.
* @param internals - platform and environment seam for deterministic tests.
* @returns true when handing a path to the native opener can work at all.
*/
function canOpenNativePath(internals = {}) {
	const platform = internals.platform ?? process.platform;
	if (platform === "darwin" || platform === "win32") return true;
	if (platform !== "linux") return false;
	const env = internals.env ?? process.env;
	return isWsl(internals) || present(env.DISPLAY) || present(env.WAYLAND_DISPLAY);
}
/**
* Open a filesystem path with the operating system's default application, or
* with the default browser when the path names a document a browser renders.
* @param path - absolute or host-resolvable path (caller owns resolution).
* @param signal - caller/connection lifetime; abort terminates the native command.
* @param internals - Platform, environment, and runner hooks for deterministic tests.
*/
function openNativePath(path, signal, internals = {}) {
	return openNativePathWithIntent(path, signal, "default", internals);
}
/**
* Open a text document for editing; macOS bypasses the file-type association
* so a YAML association with a browser cannot consume the gesture.
* @param path - absolute or host-resolvable text-document path.
* @param signal - caller/connection lifetime; abort terminates the native command.
* @param internals - Platform and runner hooks for deterministic tests.
*/
function openNativeTextFile(path, signal, internals = {}) {
	return openNativePathWithIntent(path, signal, "text-editor", internals);
}
/**
* Identify the native file-manager action without inspecting the browser's platform.
* @param internals - platform and WSL facts.
* @returns the supported file-manager action, or null on unsupported platforms.
*/
function nativeFileManager(internals = {}) {
	const platform = internals.platform ?? process.platform;
	if (platform === "darwin") return "finder";
	if (platform === "win32" || platform === "linux" && isWsl(internals)) return "explorer";
	return platform === "linux" ? "directory" : null;
}
/**
* Reveal a file in Finder or Explorer, or open its parent in the Linux default file manager.
* @param path - absolute file path already authorized by the caller.
* @param signal - caller lifetime; abort terminates the native command.
* @param internals - platform, environment, and command runner for adapter tests.
* @returns after command completion; Explorer exit 1 is accepted as a delegated handoff, not proof of selection.
*/
async function revealNativePath(path, signal, internals = {}) {
	signal.throwIfAborted();
	const platform = internals.platform ?? process.platform;
	const run = internals.run ?? runNativeCommand;
	const manager = nativeFileManager({
		...internals,
		platform
	});
	if (manager === "finder") {
		await run("open", ["-R", path], signal);
		return;
	}
	if (manager === "explorer") {
		let windowsPath = path;
		if (platform === "linux") {
			const translated = await run("wslpath", ["-w", path], signal);
			signal.throwIfAborted();
			windowsPath = translated.stdout.replace(/[\r\n]+$/, "");
			if (windowsPath === "") throw new Error("wslpath returned no Windows path");
		}
		const target = pathToFileURL(windowsPath, { windows: true }).href.replaceAll(",", "%2C");
		try {
			await run("explorer.exe", ["/select,", target], signal);
		} catch (error) {
			signal.throwIfAborted();
			if (!(error instanceof Error) || !("code" in error) || error.code !== 1) throw error;
		}
		return;
	}
	if (manager === "directory") {
		await run("xdg-open", [dirname(path)], signal);
		return;
	}
	throw new Error(`native file manager is unsupported on ${platform}`);
}
//#endregion
export { canOpenNativePath, nativeFileManager, openNativePath, openNativeTextFile, revealNativePath, runNativeCommand };

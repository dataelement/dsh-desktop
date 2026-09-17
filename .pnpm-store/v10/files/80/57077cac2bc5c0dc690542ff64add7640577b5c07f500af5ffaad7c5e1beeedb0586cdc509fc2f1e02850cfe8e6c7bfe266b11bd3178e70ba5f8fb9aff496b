import process from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import childProcess from 'node:child_process';
import fs, {constants as fsConstants} from 'node:fs/promises';
import {
	isWsl,
	powerShellPath,
	convertWslPathToWindows,
	canAccessPowerShell,
	wslDefaultBrowser,
} from 'wsl-utils';
import {executePowerShell} from 'powershell-utils';
import defineLazyProperty from 'define-lazy-prop';
import defaultBrowser, {_windowsBrowserProgIdMap} from 'default-browser';
import isInsideContainer from 'is-inside-container';
import isInSsh from 'is-in-ssh';

const fallbackAttemptSymbol = Symbol('fallbackAttempt');

// Path to included `xdg-open`.
const __dirname = import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : '';
const localXdgOpenPath = path.join(__dirname, 'xdg-open');

const {platform, arch} = process;

const tryEachApp = async (apps, opener) => {
	if (apps.length === 0) {
		// No app was provided
		return;
	}

	const errors = [];

	for (const app of apps) {
		try {
			return await opener(app); // eslint-disable-line no-await-in-loop
		} catch (error) {
			errors.push(error);
		}
	}

	throw new AggregateError(errors, 'Failed to open in all supported apps');
};

// eslint-disable-next-line complexity
const baseOpen = async options => {
	options = {
		wait: false,
		background: false,
		newInstance: false,
		allowNonzeroExitCode: false,
		...options,
	};

	const isFallbackAttempt = options[fallbackAttemptSymbol] === true;
	delete options[fallbackAttemptSymbol];

	if (Array.isArray(options.app)) {
		return tryEachApp(options.app, singleApp => baseOpen({
			...options,
			app: singleApp,
			[fallbackAttemptSymbol]: true,
		}));
	}

	let {name: app, arguments: appArguments = []} = options.app ?? {};
	appArguments = [...appArguments];

	if (Array.isArray(app)) {
		return tryEachApp(app, appName => baseOpen({
			...options,
			app: {
				name: appName,
				arguments: appArguments,
			},
			[fallbackAttemptSymbol]: true,
		}));
	}

	if (app === 'browser' || app === 'browserPrivate') {
		// IDs from default-browser for macOS and windows are the same.
		// IDs are lowercased to increase chances of a match.
		const ids = {
			'com.google.chrome': 'chrome',
			'google-chrome.desktop': 'chrome',
			'com.brave.browser': 'brave',
			'org.mozilla.firefox': 'firefox',
			'firefox.desktop': 'firefox',
			'com.microsoft.msedge': 'edge',
			'com.microsoft.edge': 'edge',
			'com.microsoft.edgemac': 'edge',
			'microsoft-edge.desktop': 'edge',
			'com.apple.safari': 'safari',
		};

		// Incognito flags for each browser in `apps`.
		const flags = {
			chrome: '--incognito',
			brave: '--incognito',
			firefox: '--private-window',
			edge: '--inPrivate',
			// Safari doesn't support private mode via command line
		};

		let browser;
		if (isWsl) {
			const progId = await wslDefaultBrowser();
			const browserInfo = _windowsBrowserProgIdMap.get(progId);
			browser = browserInfo ?? {};
		} else {
			browser = await defaultBrowser();
		}

		const browserId = browser.id?.toLowerCase();
		if (Object.hasOwn(ids, browserId)) {
			const browserName = ids[browserId];

			if (app === 'browserPrivate') {
				// Safari doesn't support private mode via command line
				if (browserName === 'safari') {
					throw new Error('Safari doesn\'t support opening in private mode via command line');
				}

				appArguments.push(flags[browserName]);
			}

			return baseOpen({
				...options,
				app: {
					name: apps[browserName],
					arguments: appArguments,
				},
			});
		}

		throw new Error(`${browser.name} is not supported as a default browser`);
	}

	let command;
	const cliArguments = [];
	const childProcessOptions = {};

	// Determine if we should use Windows/PowerShell behavior in WSL.
	// We only use Windows integration if PowerShell is actually accessible.
	// This allows the package to work in sandboxed WSL environments where Windows access is restricted.
	let shouldUseWindowsInWsl = false;
	if (isWsl && !isInsideContainer() && !isInSsh && !app) {
		shouldUseWindowsInWsl = await canAccessPowerShell();
	}

	if (platform === 'darwin') {
		command = 'open';

		if (options.wait) {
			cliArguments.push('--wait-apps');
		}

		if (options.background) {
			cliArguments.push('--background');
		}

		if (options.newInstance) {
			cliArguments.push('--new');
		}

		if (app) {
			cliArguments.push('-a', app);
		}
	} else if (platform === 'win32' || shouldUseWindowsInWsl) {
		command = await powerShellPath();

		cliArguments.push(...executePowerShell.argumentsPrefix);

		if (!isWsl) {
			childProcessOptions.windowsVerbatimArguments = true;
		}

		// Convert WSL Linux paths to Windows paths
		if (isWsl && options.target) {
			options.target = await convertWslPathToWindows(options.target);
		}

		// Suppress PowerShell progress messages that are written to stderr
		const encodedArguments = ['$ProgressPreference = \'SilentlyContinue\';', 'Start'];

		if (options.wait) {
			encodedArguments.push('-Wait');
		}

		if (app) {
			encodedArguments.push(executePowerShell.escapeArgument(app));
			if (options.target) {
				appArguments.push(options.target);
			}
		} else if (options.target) {
			encodedArguments.push(executePowerShell.escapeArgument(options.target));
		}

		if (appArguments.length > 0) {
			appArguments = appArguments.map(argument => executePowerShell.escapeArgument(argument));
			encodedArguments.push('-ArgumentList', appArguments.join(','));
		}

		// Using Base64-encoded command, accepted by PowerShell, to allow special characters.
		options.target = executePowerShell.encodeCommand(encodedArguments.join(' '));

		if (!options.wait) {
			// PowerShell will keep the parent process alive unless stdio is ignored.
			childProcessOptions.stdio = 'ignore';
		}

		if (isWsl) {
			// The spawned Windows process inherits the Linux working directory, which WSL exposes to Windows as a `\\wsl.localhost\…` UNC path served by the distro's default user, so a directory that user cannot traverse makes the launch fail. PowerShell's own directory is on the Windows drive, so it always resolves to a plain `C:\…` path. Nothing here uses the working directory as the target is a URL or an absolute Windows path.
			childProcessOptions.cwd = path.dirname(command);
		}
	} else {
		if (app) {
			command = app;
		} else {
			// When bundled by Webpack, there's no actual package file path and no local `xdg-open`.
			const isBundled = !__dirname || __dirname === '/';

			// Check if local `xdg-open` exists and is executable.
			let exeLocalXdgOpen = false;
			try {
				await fs.access(localXdgOpenPath, fsConstants.X_OK);
				exeLocalXdgOpen = true;
			} catch {}

			const useSystemXdgOpen = process.versions.electron
				?? (platform === 'android' || isBundled || !exeLocalXdgOpen);
			command = useSystemXdgOpen ? 'xdg-open' : localXdgOpenPath;
		}

		if (appArguments.length > 0) {
			cliArguments.push(...appArguments);
		}

		if (!options.wait) {
			// `xdg-open` will block the process unless stdio is ignored
			// and it's detached from the parent even if it's unref'd.
			childProcessOptions.stdio = 'ignore';
			childProcessOptions.detached = true;
		}
	}

	if (platform === 'darwin' && appArguments.length > 0) {
		cliArguments.push('--args', ...appArguments);
	}

	// IMPORTANT: On macOS, the target MUST come AFTER '--args'.
	// When using --args, ALL following arguments are passed to the app.
	// Example: open -a "chrome" --args --incognito https://site.com
	// This passes BOTH --incognito AND https://site.com to Chrome.
	// Without this order, Chrome won't open in incognito. See #332.
	if (options.target) {
		cliArguments.push(options.target);
	}

	const subprocess = childProcess.spawn(command, cliArguments, childProcessOptions);

	if (options.wait) {
		return new Promise((resolve, reject) => {
			subprocess.once('error', reject);

			subprocess.once('close', exitCode => {
				if (!options.allowNonzeroExitCode && exitCode !== 0) {
					reject(new Error(`Exited with code ${exitCode}`));
					return;
				}

				resolve(subprocess);
			});
		});
	}

	// When we're in a fallback attempt, we need to detect launch failures before trying the next app.
	// Wait for the close event to check the exit code before unreffing.
	// The launcher (open/xdg-open/PowerShell) exits quickly (~10-30ms) even on success.

	/*
	The PowerShell launcher must ALWAYS be awaited until it closes, even when not waiting for the app. Do not change this to resolve on `spawn`. See #367.

	PowerShell needs a few hundred milliseconds before it runs `Start-Process`, and libuv puts non-detached children in a job object that kills them when the parent exits. So a CLI that exits right after `await open()` silently kills PowerShell before anything opens. The launched app itself survives, since the job object allows breakaway for grandchildren, and `Start-Process` returns as soon as it has launched the app, so this does not wait for the app.

	Before v11, piped stdio kept the parent alive until PowerShell exited, which hid this. Detaching the launcher instead is unverified (PowerShell would get no console), while waiting is what worked before.
	*/
	if (isFallbackAttempt || platform === 'win32' || shouldUseWindowsInWsl) {
		return new Promise((resolve, reject) => {
			subprocess.once('error', reject);

			subprocess.once('spawn', () => {
				// Keep error handler active for post-spawn errors
				subprocess.once('close', exitCode => {
					subprocess.off('error', reject);

					// Only fallback attempts check the exit code, to detect a missing app. Other launches never do when not waiting for the app.
					if (isFallbackAttempt && exitCode !== 0) {
						reject(new Error(`Exited with code ${exitCode}`));
						return;
					}

					subprocess.unref();
					resolve(subprocess);
				});
			});
		});
	}

	subprocess.unref();

	// Handle spawn errors before the caller can attach listeners.
	// This prevents unhandled error events from crashing the process.
	return new Promise((resolve, reject) => {
		subprocess.once('error', reject);

		// Wait for the subprocess to spawn before resolving.
		// This ensures the process is established before the caller continues,
		// preventing issues when process.exit() is called immediately after.
		subprocess.once('spawn', () => {
			subprocess.off('error', reject);
			resolve(subprocess);
		});
	});
};

const open = (target, options) => {
	if (typeof target !== 'string') {
		throw new TypeError('Expected a `target`');
	}

	return baseOpen({
		...options,
		target,
	});
};

export const openApp = (name, options) => {
	if (typeof name !== 'string' && !Array.isArray(name)) {
		throw new TypeError('Expected a valid `name`');
	}

	const {arguments: appArguments = []} = options ?? {};
	if (appArguments !== undefined && appArguments !== null && !Array.isArray(appArguments)) {
		throw new TypeError('Expected `appArguments` as Array type');
	}

	return baseOpen({
		...options,
		app: {
			name,
			arguments: appArguments,
		},
	});
};

function detectArchBinary(binary) {
	if (typeof binary === 'string' || Array.isArray(binary)) {
		return binary;
	}

	const {[arch]: archBinary} = binary;

	if (!archBinary) {
		throw new Error(`${arch} is not supported`);
	}

	return archBinary;
}

function detectPlatformBinary({[platform]: platformBinary}, {wsl} = {}) {
	if (wsl && isWsl) {
		return detectArchBinary(wsl);
	}

	if (!platformBinary) {
		throw new Error(`${platform} is not supported`);
	}

	return detectArchBinary(platformBinary);
}

export const apps = {
	browser: 'browser',
	browserPrivate: 'browserPrivate',
};

defineLazyProperty(apps, 'chrome', () => detectPlatformBinary({
	darwin: 'google chrome',
	win32: 'chrome',
	// `chromium-browser` is the older deb package name used by Ubuntu/Debian before snap.
	linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
}, {
	wsl: {
		ia32: '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
		x64: ['/mnt/c/Program Files/Google/Chrome/Application/chrome.exe', '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'],
	},
}));

defineLazyProperty(apps, 'brave', () => detectPlatformBinary({
	darwin: 'brave browser',
	win32: 'brave',
	linux: ['brave-browser', 'brave'],
}, {
	wsl: {
		ia32: '/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',
		x64: ['/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', '/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe'],
	},
}));

defineLazyProperty(apps, 'firefox', () => detectPlatformBinary({
	darwin: 'firefox',
	win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`,
	linux: 'firefox',
}, {
	wsl: '/mnt/c/Program Files/Mozilla Firefox/firefox.exe',
}));

defineLazyProperty(apps, 'edge', () => detectPlatformBinary({
	darwin: 'microsoft edge',
	win32: 'msedge',
	linux: ['microsoft-edge', 'microsoft-edge-dev'],
}, {
	wsl: '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
}));

defineLazyProperty(apps, 'safari', () => detectPlatformBinary({
	darwin: 'Safari',
}));

export default open;

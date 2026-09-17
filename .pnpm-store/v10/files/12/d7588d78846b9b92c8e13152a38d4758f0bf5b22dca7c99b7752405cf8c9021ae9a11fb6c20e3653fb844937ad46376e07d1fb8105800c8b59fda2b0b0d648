window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-open-in-app",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../host/open-in-app/src/shared.ts
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
		//#region lib/types/client/controller.js
		/** Browser availability/choice state and the launch carrier for the split button. */
		/** Resolve the browser's Host base with the connection carrier's null-origin fallback. */
		function hostBase() {
			const origin = globalThis.location?.origin;
			return origin !== void 0 && origin !== "null" ? origin : "http://dsh.internal";
		}
		/**
		* Owns the once-per-page availability read, the persisted last choice, and
		* the launch POST. Availability and choice publish through uSES-safe sources
		* so every Session header shares one truth.
		*/
		var OpenInAppController = class {
			fetcher;
			/** Installed app ids in host menu order; null until the host answered. */
			apps = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			/** Last chosen app id, or empty before the first choice, shared across sessions and browser restarts. */
			choice = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)("", { persist: { name: "dsh.open-in-app.choice" } });
			loading;
			/**
			* @param fetcher - HTTP carrier for the apps read and the launch POST.
			*/
			constructor(fetcher = (input, init) => fetch(input, init)) {
				this.fetcher = fetcher;
			}
			/**
			* Read availability once per controller life; concurrent calls share the read.
			* A failed read publishes an empty list, which renders no button at all.
			* @returns after availability is published.
			*/
			load() {
				this.loading ??= this.run();
				return this.loading;
			}
			/**
			* Remember one picked app id.
			* @param appId - catalog id from the availability list.
			*/
			choose(appId) {
				this.choice.set(appId);
			}
			/**
			* Launch one installed app on a workspace directory.
			* @param appId - catalog id from the availability list.
			* @param path - the session's absolute workspace directory.
			* @returns after the host acknowledged the launch; rejects on any failure.
			*/
			async launch(appId, path) {
				const body = {
					app: appId,
					path
				};
				const response = await this.fetcher(new URL(OPEN_IN_APP_OPEN_ROUTE, hostBase()), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
				if (!response.ok) throw new Error(`open failed: HTTP ${String(response.status)}`);
			}
			async run() {
				let apps = [];
				try {
					const response = await this.fetcher(new URL(OPEN_IN_APP_APPS_ROUTE, hostBase()), { headers: { accept: "application/json" } });
					if (response.ok) {
						const payload = await response.json();
						if (Array.isArray(payload.apps)) apps = payload.apps.filter((id) => typeof id === "string");
					}
				} catch {}
				this.apps.set(apps);
			}
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-open-in-app/src/client/OpenInAppAction.module.css.mjs
		const css = ".CAgGvG_split{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);height:28px;font-family:var(--dsw-font-family);border-radius:14px;align-items:stretch;display:inline-flex;overflow:hidden}.CAgGvG_main,.CAgGvG_chevron{color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;background:0 0;border:0;align-items:center;gap:5px;font-size:11px;font-weight:400;line-height:16px;display:inline-flex}.CAgGvG_main{padding:5px 6px 5px 7px}.CAgGvG_main:hover:not(:disabled),.CAgGvG_main:focus-visible,.CAgGvG_chevron:hover,.CAgGvG_chevron:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.CAgGvG_main:disabled{color:var(--dsw-alias-label-dimmed);cursor:wait}.CAgGvG_main[data-state=error]{color:var(--dsw-alias-state-error-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-error-primary)}.CAgGvG_chevron{border-left:.5px solid var(--dsw-alias-border-l4);color:var(--dsw-alias-label-secondary);padding:5px 6px 5px 4px}.CAgGvG_icon{flex:none}img.CAgGvG_icon{object-fit:contain;user-select:none;display:block}";
		const tagId = "@deepseek-ai/dsh-client-ui-open-in-app/OpenInAppAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-open-in-app";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var OpenInAppAction_module_css_default = {
			"chevron": "CAgGvG_chevron",
			"icon": "CAgGvG_icon",
			"main": "CAgGvG_main",
			"split": "CAgGvG_split"
		};
		//#endregion
		//#region lib/types/client/OpenInAppAction.js
		/**
		* Label keys per catalog id: the browser renders only ids it can name, so a
		* host catalog extension without a matching dictionary entry stays invisible
		* instead of showing a raw id.
		*/
		const APP_LABEL_KEY = {
			finder: "app.finder",
			explorer: "app.explorer",
			filemanager: "app.filemanager",
			cursor: "app.cursor",
			vscode: "app.vscode",
			vscodeinsiders: "app.vscodeinsiders",
			windsurf: "app.windsurf",
			zed: "app.zed",
			sublimetext: "app.sublimetext",
			xcode: "app.xcode",
			androidstudio: "app.androidstudio",
			intellij: "app.intellij",
			pycharm: "app.pycharm",
			webstorm: "app.webstorm",
			phpstorm: "app.phpstorm",
			goland: "app.goland",
			rider: "app.rider",
			rustrover: "app.rustrover",
			fork: "app.fork",
			sourcetree: "app.sourcetree",
			github: "app.github",
			tower: "app.tower",
			gitkraken: "app.gitkraken",
			smartgit: "app.smartgit",
			sublimemerge: "app.sublimemerge",
			ghostty: "app.ghostty",
			warp: "app.warp",
			iterm: "app.iterm",
			kitty: "app.kitty",
			terminal: "app.terminal",
			windowsterminal: "app.windowsterminal",
			gitbash: "app.gitbash",
			gnometerminal: "app.gnometerminal",
			konsole: "app.konsole"
		};
		/** App ids whose icon image already failed this page; a 404 icon is fetched once, not per menu open. */
		const failedIcons = /* @__PURE__ */ new Set();
		/**
		* One application's real bundle icon (host-served PNG) with an inline generic
		* app-square fallback while the host has none.
		* @param props - catalog id, host icon URL, and rendered size.
		* @returns the icon image or its fallback glyph.
		*/
		function AppIcon({ id, url, size }) {
			const [failed, setFailed] = (0, react.useState)(failedIcons.has(id));
			if (failed) return (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.8,
				className: OpenInAppAction_module_css_default.icon,
				"aria-hidden": true,
				children: (0, react_jsx_runtime.jsx)("rect", {
					x: 3,
					y: 3,
					width: 18,
					height: 18,
					rx: 5
				})
			});
			return (0, react_jsx_runtime.jsx)("img", {
				src: url,
				width: size,
				height: size,
				className: OpenInAppAction_module_css_default.icon,
				alt: "",
				"aria-hidden": true,
				draggable: false,
				onError: () => {
					failedIcons.add(id);
					setFailed(true);
				}
			});
		}
		/**
		* Quick launches settle well under this delay, so their busy dress never
		* paints — the visible dim-and-wait treatment is reserved for launches that
		* are actually taking a while, instead of flashing on every click.
		*/
		const BUSY_DRESS_DELAY_MS = 250;
		/**
		* Session-header split button: the main button opens the session's workspace
		* directory in the remembered application, the chevron opens the menu of
		* every application the host probed as installed. It renders nothing until
		* the host reported at least one nameable application and the session has a
		* known workspace directory, so a host without the capability never grows
		* the control.
		* @param props - session runtime, injected controller face, and localized copy.
		* @returns the split button and its menu, or null when there is nothing to offer.
		*/
		function OpenInAppAction(props) {
			const { sessionId, useSessions, useOpenInAppApps, useOpenInAppChoice, t } = props;
			const cwd = useSessions((state) => state.byId[sessionId]?.cwd);
			const available = useOpenInAppApps((apps) => apps);
			const choice = useOpenInAppChoice((id) => id);
			const [open, setOpen] = (0, react.useState)(false);
			const [phase, setPhase] = (0, react.useState)("idle");
			const inFlight = (0, react.useRef)(false);
			const busyTimer = (0, react.useRef)(void 0);
			const errorTimer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				clearTimeout(busyTimer.current);
				clearTimeout(errorTimer.current);
			}, []);
			const apps = (available ?? []).map((id) => ({
				id,
				labelKey: APP_LABEL_KEY[id]
			})).filter((entry) => entry.labelKey !== void 0);
			const currentEntry = apps.find((entry) => entry.id === choice) ?? apps[0];
			if (currentEntry === void 0 || cwd === void 0 || cwd === "") return null;
			const current = currentEntry.id;
			const currentLabel = t(currentEntry.labelKey);
			const title = phase === "error" ? t("open.error") : t("open.title", { app: currentLabel });
			const launch = (appId) => {
				if (inFlight.current) return;
				inFlight.current = true;
				clearTimeout(errorTimer.current);
				clearTimeout(busyTimer.current);
				busyTimer.current = setTimeout(() => {
					setPhase("busy");
				}, BUSY_DRESS_DELAY_MS);
				props.launch(appId, cwd).then(() => {
					inFlight.current = false;
					clearTimeout(busyTimer.current);
					setPhase("idle");
				}, () => {
					inFlight.current = false;
					clearTimeout(busyTimer.current);
					setPhase("error");
					clearTimeout(errorTimer.current);
					errorTimer.current = setTimeout(() => {
						setPhase("idle");
					}, 2e3);
				});
			};
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				align: "end",
				dense: true,
				selection: "fill",
				onClose: () => {
					setOpen(false);
				},
				items: apps.map((entry) => ({
					id: entry.id,
					label: t(entry.labelKey),
					icon: (0, react_jsx_runtime.jsx)(AppIcon, {
						id: entry.id,
						url: props.iconUrl(entry.id),
						size: 18
					})
				})),
				selectedId: current,
				onSelect: (id) => {
					setOpen(false);
					if (inFlight.current) return;
					props.choose(id);
					launch(id);
				},
				anchor: (0, react_jsx_runtime.jsxs)("div", {
					className: OpenInAppAction_module_css_default.split,
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: phase === "error" ? t("open.error") : t("open.tooltip"),
						side: "bottom",
						children: (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: OpenInAppAction_module_css_default.main,
							"data-state": phase,
							disabled: phase === "busy",
							"aria-label": title,
							onClick: () => {
								launch(current);
							},
							children: (0, react_jsx_runtime.jsx)(AppIcon, {
								id: current,
								url: props.iconUrl(current),
								size: 15
							})
						})
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: OpenInAppAction_module_css_default.chevron,
						"aria-expanded": open,
						"aria-haspopup": "menu",
						title: t("menu.toggle"),
						"aria-label": t("menu.toggle"),
						onClick: () => {
							setOpen((value) => !value);
						},
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 11 })
					})]
				})
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `open-in-app` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "open-in-app";
		/** Application labels shared verbatim by both dictionaries (product names). */
		const PRODUCT_NAMES = {
			"app.cursor": "Cursor",
			"app.vscode": "VS Code",
			"app.vscodeinsiders": "VS Code Insiders",
			"app.windsurf": "Windsurf",
			"app.zed": "Zed",
			"app.sublimetext": "Sublime Text",
			"app.xcode": "Xcode",
			"app.androidstudio": "Android Studio",
			"app.intellij": "IntelliJ IDEA",
			"app.pycharm": "PyCharm",
			"app.webstorm": "WebStorm",
			"app.phpstorm": "PhpStorm",
			"app.goland": "GoLand",
			"app.rider": "Rider",
			"app.rustrover": "RustRover",
			"app.fork": "Fork",
			"app.sourcetree": "Sourcetree",
			"app.github": "GitHub Desktop",
			"app.tower": "Tower",
			"app.gitkraken": "GitKraken",
			"app.smartgit": "SmartGit",
			"app.sublimemerge": "Sublime Merge",
			"app.ghostty": "Ghostty",
			"app.warp": "Warp",
			"app.iterm": "iTerm2",
			"app.kitty": "kitty",
			"app.windowsterminal": "Windows Terminal",
			"app.gitbash": "Git Bash",
			"app.gnometerminal": "GNOME Terminal",
			"app.konsole": "Konsole"
		};
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"open.title": "在 {app} 中打开工作目录",
			"open.tooltip": "在本地打开",
			"open.error": "打开失败",
			"menu.toggle": "选择打开方式",
			"menu.aria": "打开方式",
			...PRODUCT_NAMES,
			"app.finder": "访达",
			"app.explorer": "文件资源管理器",
			"app.filemanager": "文件管理器",
			"app.terminal": "终端"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"open.title": "Open workspace in {app}",
			"open.tooltip": "Open locally",
			"open.error": "Failed to open",
			"menu.toggle": "Choose an app to open in",
			"menu.aria": "Open in",
			...PRODUCT_NAMES,
			"app.finder": "Finder",
			"app.explorer": "File Explorer",
			"app.filemanager": "Files",
			"app.terminal": "Terminal"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Browser half of open-in-app: one Session-header split button opening the
		* session's workspace directory (the summary's `cwd`) in the remembered
		* installed application. Availability arrives once per page from the host
		* apps route; the last choice persists in the browser through the controller's
		* persisted snapshot store.
		*/
		/** Required services for locale registration and the header-slot contribution. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the dictionaries and the header split button.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const controller = new OpenInAppController();
			controller.load();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "open-in-app: dictionaries");
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "open-in-app",
				order: -10,
				locale: NS,
				inject: () => ({
					hooks: {
						openInAppApps: controller.apps,
						openInAppChoice: controller.choice
					},
					launch: (appId, path) => controller.launch(appId, path),
					choose: (appId) => {
						controller.choose(appId);
					},
					iconUrl: (appId) => `${OPEN_IN_APP_ICON_PREFIX}/${appId}`
				})
			}, OpenInAppAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_client_ui_slots = require("@deepseek-ai/dsh-client-ui-slots");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-sidebar/src/client/SidebarRoot.module.css.mjs
		const css = ".hHd-Xa_root{--dsh-sidebar-inline-padding:12px;height:100%;padding:6px var(--dsh-sidebar-inline-padding);box-sizing:border-box;background:var(--dsw-specific-sidebar-fill);color:var(--dsw-alias-label-primary);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;font-size:14px;display:flex}.hHd-Xa_root.hHd-Xa_collapsed{padding:18px 10px 6px}.hHd-Xa_root.hHd-Xa_quietBars{--dsh-scrollbar-thumb:transparent;--dsh-scrollbar-thumb-hover:transparent}.hHd-Xa_fading>*{opacity:0;transition:opacity .15s var(--ds-ease-in-out)}.hHd-Xa_wide{animation:hHd-Xa_wide-in .2s var(--ds-ease-in-out)}@keyframes hHd-Xa_wide-in{0%{opacity:0}}.hHd-Xa_railIn .hHd-Xa_iconButton,.hHd-Xa_railIn .hHd-Xa_newSession,.hHd-Xa_railIn .hHd-Xa_panelList,.hHd-Xa_railIn .hHd-Xa_regionArea{animation:hHd-Xa_rail-in .15s var(--ds-ease-in-out) backwards}.hHd-Xa_railIn .hHd-Xa_footArea{animation:hHd-Xa_rail-fade-in .15s var(--ds-ease-in-out) backwards}@keyframes hHd-Xa_rail-in{0%{opacity:0;transform:translate(49px)}}@keyframes hHd-Xa_rail-fade-in{0%{opacity:0}}.hHd-Xa_logoRow{box-sizing:border-box;flex:none;justify-content:flex-end;align-items:center;gap:8px;height:60px;margin-bottom:8px;padding:8px 0 8px 4px;display:flex;overflow:hidden}.hHd-Xa_collapsed .hHd-Xa_logoRow{justify-content:flex-start;height:36px;margin-bottom:12px;padding:0}.hHd-Xa_brand{min-width:0;color:inherit;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;padding:0;display:inline-flex;overflow:hidden}.hHd-Xa_brandIdentity{align-items:center;gap:8px;min-width:0;height:24px;display:inline-flex}.hHd-Xa_brandMark{flex:none;justify-content:center;align-items:center;display:inline-flex}.hHd-Xa_brandName{letter-spacing:.04em;align-items:center;gap:6px;min-width:0;height:24px;font-size:18px;font-weight:600;line-height:24px;display:inline-flex}.hHd-Xa_fallbackBrandName{letter-spacing:0;white-space:nowrap;font-size:17px}.hHd-Xa_localBuildBrand{white-space:nowrap;flex-direction:column;flex:none;justify-content:center;align-items:flex-start;gap:1px;height:24px;display:inline-flex}.hHd-Xa_localBuildTitle{letter-spacing:0;font-size:12px;line-height:13px}.hHd-Xa_iconButton{corner-shape:round;cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.hHd-Xa_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.hHd-Xa_collapsed .hHd-Xa_iconButton{width:36px;height:36px}.hHd-Xa_collapsed .hHd-Xa_toggle .hHd-Xa_panelIcon{display:none}.hHd-Xa_collapsed .hHd-Xa_toggle:hover .hHd-Xa_panelIcon{display:inline}.hHd-Xa_collapsed .hHd-Xa_toggle:hover .hHd-Xa_railMark{display:none}.hHd-Xa_railMark{justify-content:center;align-items:center;display:inline-flex}.hHd-Xa_collapsed .hHd-Xa_iconButton{color:var(--dsw-alias-label-primary)}.hHd-Xa_buildVersion{height:10px;color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);white-space:nowrap;border-radius:2px;flex:none;align-items:center;padding:0 3px;font-size:6px;font-weight:500;line-height:10px;display:inline-flex}.hHd-Xa_newSession{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-button-elevated-fill);height:38px;color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:12px;flex:none;justify-content:center;align-items:center;gap:6px;margin:0 2px 8px;padding:8px 16px;font-size:14px;font-weight:500;line-height:22px;display:flex;overflow:hidden}.hHd-Xa_newSession:hover{background:var(--dsw-alias-button-floating-hover)}.hHd-Xa_collapsed .hHd-Xa_newSession{background:0 0;border-color:#0000;align-self:flex-start;gap:0;width:36px;height:36px;margin:0 0 12px;padding:0}.hHd-Xa_collapsed .hHd-Xa_newSession:hover{background:var(--dsw-alias-interactive-bg-hover)}.hHd-Xa_newSessionLabel{white-space:nowrap;max-width:200px;overflow:hidden}.hHd-Xa_collapsed .hHd-Xa_newSessionLabel{max-width:0}.hHd-Xa_panelList{flex-direction:column;flex:none;gap:4px;margin-bottom:8px;display:flex}.hHd-Xa_panelRow{box-sizing:border-box;width:100%;min-height:36px;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:7px 8px;line-height:22px;display:flex}.hHd-Xa_panelRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.hHd-Xa_panelRow.hHd-Xa_panelActive{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary);font-weight:500}.hHd-Xa_panelRow:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:-2px}.hHd-Xa_panelGlyph{flex:none;justify-content:center;align-items:center;display:inline-flex}.hHd-Xa_panelTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.hHd-Xa_collapsed .hHd-Xa_panelList{gap:12px;margin-bottom:12px}.hHd-Xa_collapsed .hHd-Xa_panelRow{width:36px;height:36px;color:var(--dsw-alias-label-primary);justify-content:center;padding:0}.hHd-Xa_regionArea{min-height:0;margin-left:-4px;margin-right:calc(-1 * var(--dsh-sidebar-inline-padding));flex-direction:column;flex:1;padding-left:4px;display:flex;overflow:hidden}.hHd-Xa_collapsed .hHd-Xa_regionArea{margin-left:0;margin-right:0;padding-left:0}.hHd-Xa_footArea{flex-direction:column;flex:none;display:flex}.hHd-Xa_settingsArea,.hHd-Xa_footerActions{flex:none;width:100%;min-width:0}.hHd-Xa_footerActions{display:flex}.hHd-Xa_collapsed .hHd-Xa_footArea{align-items:center}.hHd-Xa_collapsed .hHd-Xa_settingsArea,.hHd-Xa_collapsed .hHd-Xa_footerActions{justify-content:center;width:auto;display:flex}@media (prefers-reduced-motion:reduce){.hHd-Xa_wide,.hHd-Xa_fading>*,.hHd-Xa_railIn .hHd-Xa_iconButton,.hHd-Xa_railIn .hHd-Xa_newSession,.hHd-Xa_railIn .hHd-Xa_panelList,.hHd-Xa_railIn .hHd-Xa_footArea,.hHd-Xa_railIn .hHd-Xa_regionArea{transition:none;animation:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-sidebar/SidebarRoot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-sidebar";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SidebarRoot_module_css_default = {
			"brand": "hHd-Xa_brand",
			"brandIdentity": "hHd-Xa_brandIdentity",
			"brandMark": "hHd-Xa_brandMark",
			"brandName": "hHd-Xa_brandName",
			"buildVersion": "hHd-Xa_buildVersion",
			"collapsed": "hHd-Xa_collapsed",
			"fading": "hHd-Xa_fading",
			"fallbackBrandName": "hHd-Xa_fallbackBrandName",
			"footArea": "hHd-Xa_footArea",
			"footerActions": "hHd-Xa_footerActions",
			"iconButton": "hHd-Xa_iconButton",
			"localBuildBrand": "hHd-Xa_localBuildBrand",
			"localBuildTitle": "hHd-Xa_localBuildTitle",
			"logoRow": "hHd-Xa_logoRow",
			"newSession": "hHd-Xa_newSession",
			"newSessionLabel": "hHd-Xa_newSessionLabel",
			"panelActive": "hHd-Xa_panelActive",
			"panelGlyph": "hHd-Xa_panelGlyph",
			"panelIcon": "hHd-Xa_panelIcon",
			"panelList": "hHd-Xa_panelList",
			"panelRow": "hHd-Xa_panelRow",
			"panelTitle": "hHd-Xa_panelTitle",
			"quietBars": "hHd-Xa_quietBars",
			"rail-fade-in": "hHd-Xa_rail-fade-in",
			"rail-in": "hHd-Xa_rail-in",
			"railIn": "hHd-Xa_railIn",
			"railMark": "hHd-Xa_railMark",
			"regionArea": "hHd-Xa_regionArea",
			"root": "hHd-Xa_root",
			"settingsArea": "hHd-Xa_settingsArea",
			"toggle": "hHd-Xa_toggle",
			"wide": "hHd-Xa_wide",
			"wide-in": "hHd-Xa_wide-in"
		};
		//#endregion
		//#region lib/types/client/SidebarRoot.js
		/**
		* Sidebar shell: column geometry and global panel navigation.
		* Collapse is a slide plus crossfade:
		* content freezes at its expanded width (inline style) and fades out in place
		* while the sliding column (AppFrame grid tracks) clips it — nothing reflows
		* mid-slide. At settle the wide-only content unmounts and the upper
		* controls enter the 56px rail from the same horizontal offset (one icon each,
		* same top-down order) on one fade that ends with the slide. The bottom-pinned
		* settings control only fades. The workspace/session browsing region between
		* global panel rows and the foot is the `sidebar.workspaces` registrant's,
		* and the foot holds `sidebar.settings` plus `sidebar.footer.action`; the shell
		* hands them the wide flag (plus an expand request callback for the browser).
		*
		* The column also owns whether the scroll regions nested in it draw a
		* scrollbar at all: the shell tracks the pointer and rebinds ui-theme's
		* scrollbar indirection away while it is elsewhere, so a list the user is not
		* pointing at carries no bar.
		*/
		/** Wide-content unmount delay; matches the 150ms wide-content fade-out. */
		const COLLAPSE_SETTLE_MS = 150;
		/**
		* How long the column's scrollbars stay drawn after the pointer leaves it.
		* The bar is a pointer affordance here, and hiding it on the leave event
		* itself makes it blink out while the pointer is only crossing the column's
		* edge — on the way to the conversation, or around a portalled menu.
		*/
		const SCROLLBAR_LINGER_MS = 2e3;
		/** Format complete-build metadata for the local brand badge. */
		function localBuildVersion() {
			return `0.1.5-rc.2-449af19` + ({}.DSH_CLIENT_GIT_DIRTY === "true" ? "-dirty" : "");
		}
		/** Each panel row subscribes only to its own selection state. */
		function PanelRow({ id, label, wide, usePanelInfo, selectPanel, renderSlot }) {
			const active = usePanelInfo((info) => info.activePanelId === id);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				delayMs: 500,
				disabled: wide,
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: clsx(SidebarRoot_module_css_default.panelRow, active && SidebarRoot_module_css_default.panelActive),
					"aria-label": label,
					"aria-current": active ? "page" : void 0,
					onClick: () => {
						selectPanel(id);
					},
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: SidebarRoot_module_css_default.panelGlyph,
						"aria-hidden": "true",
						children: renderSlot("sidebar.panellist", {
							size: wide ? 16 : 18,
							active
						}, { only: id })
					}), wide && (0, react_jsx_runtime.jsx)("span", {
						className: clsx(SidebarRoot_module_css_default.panelTitle, SidebarRoot_module_css_default.wide),
						children: label
					})]
				})
			});
		}
		/**
		* Render the sidebar column shell.
		* @param props - composed slot props (runtime share + injected callbacks, contract/slots.ts).
		* @returns the sidebar element tree.
		*/
		function SidebarRoot({ collapsed, width, startSession, toggleSidebar, selectPanel, usePanels, usePanelInfo, t, renderSlot }) {
			const panels = usePanels((snapshot) => snapshot);
			const [settled, setSettled] = (0, react.useState)(collapsed);
			(0, react.useEffect)(() => {
				if (!collapsed) {
					setSettled(false);
					return;
				}
				const timer = window.setTimeout(() => {
					setSettled(true);
				}, COLLAPSE_SETTLE_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [collapsed]);
			const wide = !collapsed || !settled;
			const lastWideWidth = (0, react.useRef)(width);
			if (!collapsed) lastWideWidth.current = width;
			const everWide = (0, react.useRef)(!collapsed);
			if (!collapsed) everWide.current = true;
			const column = (0, react.useRef)(null);
			const [pointerInside, setPointerInside] = (0, react.useState)(false);
			const lingerTimer = (0, react.useRef)(void 0);
			const armLinger = () => {
				if (lingerTimer.current !== void 0) return;
				lingerTimer.current = window.setTimeout(() => {
					lingerTimer.current = void 0;
					setPointerInside(false);
				}, SCROLLBAR_LINGER_MS);
			};
			const cancelLinger = () => {
				window.clearTimeout(lingerTimer.current);
				lingerTimer.current = void 0;
			};
			(0, react.useEffect)(() => {
				if (!pointerInside) return;
				const onMove = (event) => {
					const rect = column.current?.getBoundingClientRect();
					/* v8 ignore next -- the listener only exists while the column is mounted and revealed. */
					if (rect === void 0) return;
					if (event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom) cancelLinger();
					else armLinger();
				};
				document.addEventListener("pointermove", onMove);
				return () => {
					document.removeEventListener("pointermove", onMove);
					cancelLinger();
				};
			}, [pointerInside]);
			const buildVersion = localBuildVersion();
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: column,
				className: clsx(SidebarRoot_module_css_default.root, !wide && SidebarRoot_module_css_default.collapsed, !wide && everWide.current && SidebarRoot_module_css_default.railIn, collapsed && wide && SidebarRoot_module_css_default.fading, !pointerInside && SidebarRoot_module_css_default.quietBars),
				style: wide ? { width: collapsed ? lastWideWidth.current : width } : void 0,
				onPointerEnter: () => {
					cancelLinger();
					setPointerInside(true);
				},
				onPointerLeave: () => {
					armLinger();
				},
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: SidebarRoot_module_css_default.logoRow,
						children: [wide && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: clsx(SidebarRoot_module_css_default.brand, SidebarRoot_module_css_default.wide),
							"aria-label": t("session.new.label"),
							onClick: () => {
								startSession();
							},
							children: (0, react_jsx_runtime.jsxs)("span", {
								className: SidebarRoot_module_css_default.brandIdentity,
								"aria-hidden": "true",
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SidebarRoot_module_css_default.brandMark,
									children: renderSlot("sidebar.brand.mark", { size: 24 }, { fallback: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FishLogo, { size: 24 }) })
								}), (0, react_jsx_runtime.jsx)("span", {
									className: SidebarRoot_module_css_default.brandName,
									children: renderSlot("sidebar.brand.name", {}, { fallback: buildVersion === void 0 ? (0, react_jsx_runtime.jsx)("span", {
										className: SidebarRoot_module_css_default.fallbackBrandName,
										children: t("brand.localBuild")
									}) : (0, react_jsx_runtime.jsxs)("span", {
										className: SidebarRoot_module_css_default.localBuildBrand,
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: SidebarRoot_module_css_default.localBuildTitle,
											children: t("brand.localBuild")
										}), (0, react_jsx_runtime.jsx)("span", {
											className: SidebarRoot_module_css_default.buildVersion,
											children: buildVersion
										})]
									}) })
								})]
							})
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: collapsed ? t("toggle.open") : t("toggle.collapse"),
							delayMs: 500,
							children: (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: clsx(SidebarRoot_module_css_default.iconButton, SidebarRoot_module_css_default.toggle),
								"aria-label": collapsed ? t("toggle.open") : t("toggle.collapse"),
								onClick: () => {
									toggleSidebar();
								},
								children: [!wide && (0, react_jsx_runtime.jsx)("span", {
									className: SidebarRoot_module_css_default.railMark,
									"aria-hidden": "true",
									children: renderSlot("sidebar.brand.mark", { size: 24 }, { fallback: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FishLogo, { size: 24 }) })
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {
									className: SidebarRoot_module_css_default.panelIcon,
									size: wide ? 16 : 18
								})]
							})
						})]
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: t("session.new.label"),
						delayMs: 500,
						disabled: wide,
						children: (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: SidebarRoot_module_css_default.newSession,
							"aria-label": t("session.new.label"),
							onClick: () => {
								startSession();
							},
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, { size: wide ? 14 : 18 }), wide && (0, react_jsx_runtime.jsx)("span", {
								className: clsx(SidebarRoot_module_css_default.newSessionLabel, SidebarRoot_module_css_default.wide),
								children: t("session.new")
							})]
						})
					}),
					panels.length > 0 && (0, react_jsx_runtime.jsx)("nav", {
						className: SidebarRoot_module_css_default.panelList,
						"aria-label": t("panels.label"),
						children: panels.map(({ id, label }) => (0, react_jsx_runtime.jsx)(PanelRow, {
							id,
							label,
							wide,
							usePanelInfo,
							selectPanel,
							renderSlot
						}, id))
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: SidebarRoot_module_css_default.regionArea,
						children: renderSlot("sidebar.workspaces", {
							wide,
							expandSidebar: () => {
								if (collapsed) toggleSidebar();
							}
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: SidebarRoot_module_css_default.footArea,
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: SidebarRoot_module_css_default.footerActions,
							children: renderSlot("sidebar.footer.action", { wide })
						}), (0, react_jsx_runtime.jsx)("div", {
							className: SidebarRoot_module_css_default.settingsArea,
							children: renderSlot("sidebar.settings", { wide })
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `sidebar` namespace dictionaries for shell controls and global panels. */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"session.new": "新会话",
			"session.new.label": "新建会话",
			"toggle.open": "打开侧边栏",
			"toggle.collapse": "收起侧边栏",
			"panels.label": "全局面板"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"session.new": "New Session",
			"session.new.label": "New session",
			"toggle.open": "Open sidebar",
			"toggle.collapse": "Collapse sidebar",
			"panels.label": "Global panels"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "sidebar";
		/** Services required by the sidebar plugin. */
		const inject = [
			"slots",
			"layout",
			"uiWorkspace",
			"locale"
		];
		/** Registers the sidebar shell and its service callbacks.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			const workspaceNavigation = ctx.get("uiWorkspace");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-sidebar: dictionaries");
			const panels = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)([]);
			const syncPanels = () => {
				const next = ctx.slots.entriesOfSlot("sidebar.panellist").map(({ options }) => {
					const id = options.id;
					return {
						id,
						order: options.order ?? 0,
						label: (0, _deepseek_ai_dsh_client_ui_slots.resolveSlotLabel)(options.label) ?? id
					};
				}).sort((a, b) => a.order - b.order);
				const previous = panels.getSnapshot();
				if (previous.length === next.length && previous.every((panel, index) => {
					const candidate = next[index];
					return panel.id === candidate.id && panel.order === candidate.order && panel.label === candidate.label;
				})) return;
				panels.set(next);
			};
			ctx.effect(() => ctx.slots.subscribe("sidebar.panellist", syncPanels), "ui-sidebar: panel entries");
			ctx.effect(() => ctx.locale.subscribe(syncPanels), "ui-sidebar: panel labels");
			const injectProps = () => ({
				startSession: (workspaceId) => {
					workspaceNavigation.startSession(workspaceId);
				},
				toggleSidebar: () => {
					ctx.layout.toggleSidebar();
				},
				selectPanel: (id) => {
					ctx.layout.selectPanel(id);
				},
				hooks: { panels }
			});
			ctx.slots.inject("sidebar", () => ctx.slots.register({
				name: "sidebar",
				locale: NS,
				children: {
					"sidebar.brand.mark": {
						kind: "single",
						scope: "root"
					},
					"sidebar.brand.name": {
						kind: "single",
						scope: "root"
					},
					"sidebar.panellist": {
						kind: "list",
						scope: "root"
					},
					"sidebar.workspaces": {
						kind: "single",
						scope: "root"
					},
					"sidebar.settings": {
						kind: "single",
						scope: "root"
					},
					"sidebar.footer.action": {
						kind: "list",
						scope: "root"
					}
				},
				inject: injectProps
			}, SidebarRoot));
			syncPanels();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-settings-plugin-inventory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../preset/agent-presets/src/display.ts
		const BUILT_IN_PRESET_KEYS = {
			standard: {
				name: "presetStandardName",
				description: "presetStandardDescription"
			},
			ptc: {
				name: "presetPtcName",
				description: "presetPtcDescription"
			},
			minimal: {
				name: "presetMinimalName",
				description: "presetMinimalDescription"
			},
			cordis: {
				name: "presetCordisName",
				description: "presetCordisDescription"
			}
		};
		/**
		* Resolve preset display copy without making user-authored metadata translatable.
		* @param preset - roster row whose copy is being rendered.
		* @param t - active locale lookup covering {@link BuiltInPresetCopyKey}.
		* @returns localized copy for a known shipped preset, otherwise file metadata.
		*/
		function presetDisplayText(preset, t) {
			const keys = preset.trust === "system" ? BUILT_IN_PRESET_KEYS[preset.id] : void 0;
			if (keys !== void 0) return {
				name: t(keys.name),
				description: t(keys.description)
			};
			return {
				name: preset.name ?? preset.id,
				...preset.description === void 0 ? {} : { description: preset.description }
			};
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.module.css.mjs
		const css = ".qSYn7G_section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}.qSYn7G_catalogHeading h3,.qSYn7G_status,.qSYn7G_failure p{margin:0}.qSYn7G_status,.qSYn7G_failure{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}.qSYn7G_failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex}.qSYn7G_failure button{border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px}.qSYn7G_catalog{flex-direction:column;gap:12px;display:flex}.qSYn7G_search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}.qSYn7G_search>svg{pointer-events:none;position:absolute;left:12px}.qSYn7G_search input{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:10px;outline:none;padding:0 34px 0 36px;font-size:13px}.qSYn7G_search input::placeholder{color:var(--dsw-alias-label-tertiary)}.qSYn7G_search input:focus-visible{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}.qSYn7G_catalogHeading{align-items:baseline;gap:7px;padding:0 2px;display:flex}.qSYn7G_catalogHeading h3{font-size:13px;font-weight:600;line-height:20px}.qSYn7G_catalogHeading span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:18px}.qSYn7G_cards{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;margin:0;padding:0;list-style:none;display:grid}.qSYn7G_card{min-width:0;box-shadow:var(--dsw-elevation-stroke);background:var(--dsw-alias-bg-layer-3);border:0;border-radius:14px;overflow:hidden}.qSYn7G_card[data-open=true]{--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-panel)}.qSYn7G_cardContent{box-sizing:border-box;width:100%;min-height:52px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;align-items:stretch;padding:12px 14px;display:flex}.qSYn7G_cardContent:hover,.qSYn7G_card[data-open=true]>.qSYn7G_cardContent{background:var(--dsw-alias-interactive-bg-hover)}.qSYn7G_cardContent:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.qSYn7G_cardMainRow{justify-content:space-between;align-items:center;gap:12px;min-width:0;display:flex}.qSYn7G_cardTitle,.qSYn7G_cardIdentity{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.qSYn7G_cardTitle{flex:1;min-width:0;font-size:14px;font-weight:600;line-height:20px}.qSYn7G_cardIdentity{width:100%;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;display:block}.qSYn7G_cardTrailing{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:7px;display:inline-flex}.qSYn7G_phaseDot{flex:none;display:inline-flex}.qSYn7G_group{flex-direction:column;gap:10px;display:flex}.qSYn7G_groupTitleRow{align-items:center;gap:8px;min-height:32px;display:flex}.qSYn7G_group+.qSYn7G_group{border-top:.5px solid var(--dsw-alias-border-l2);padding-top:14px}.qSYn7G_headerEnd{margin-left:auto}.qSYn7G_groupToggle{color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex:none;align-items:center;gap:8px;padding:0;display:flex}.qSYn7G_groupToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.qSYn7G_groupToggle>.qSYn7G_chevron{transform:rotate(-90deg)}.qSYn7G_groupToggle[aria-expanded=true]>.qSYn7G_chevron{transform:none}.qSYn7G_groupTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.qSYn7G_groupSub{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex-wrap:wrap;gap:4px 8px;margin:-6px 0 0 20px;font-size:12px;line-height:18px;display:flex}.qSYn7G_failedCount{color:var(--dsw-alias-state-error-primary)}.qSYn7G_switcher{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);height:36px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border:none;border-radius:18px;flex:none;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}.qSYn7G_switcher:hover{background:var(--dsw-alias-interactive-bg-hover)}.qSYn7G_switcher:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.qSYn7G_switcher>.qSYn7G_chevron{flex:none}.qSYn7G_switcherLabel{text-overflow:ellipsis;max-width:240px;overflow:hidden}.qSYn7G_groupBody{flex-direction:column;gap:10px;display:flex}.qSYn7G_brokenNote{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;white-space:pre-line;border-radius:8px;margin:0;padding:8px 10px;font-size:12.5px;line-height:18px}.qSYn7G_hint{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:0;font-size:12.5px;line-height:18px;display:flex}.qSYn7G_jumpLink{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;font-size:12.5px}.qSYn7G_enabledIn{flex-wrap:wrap;align-items:baseline;gap:4px 10px;display:flex}.qSYn7G_card[data-failed=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}.qSYn7G_chevron{color:var(--dsw-alias-label-tertiary);flex:none}.qSYn7G_card[data-open=true] .qSYn7G_chevron{transform:rotate(180deg)}.qSYn7G_cardDetails{border-top:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:10px 14px 12px}.qSYn7G_entryValue{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;display:block}.qSYn7G_details{grid-template-columns:76px minmax(0,1fr);gap:6px 10px;margin:8px 0 0;display:grid}.qSYn7G_details div{display:contents}.qSYn7G_details dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}.qSYn7G_details dd{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:17px}.qSYn7G_visuallyHidden{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:no-preference){.qSYn7G_chevron{transition:transform .14s var(--ds-ease-in-out)}}@media (width<=680px){.qSYn7G_cards{grid-template-columns:minmax(0,1fr)}}";
		const tagId = "@deepseek-ai/dsh-client-ui-settings-plugin-inventory/PluginInventorySettingsTab.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-settings-plugin-inventory";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PluginInventorySettingsTab_module_css_default = {
			"brokenNote": "qSYn7G_brokenNote",
			"card": "qSYn7G_card",
			"cardContent": "qSYn7G_cardContent",
			"cardDetails": "qSYn7G_cardDetails",
			"cardIdentity": "qSYn7G_cardIdentity",
			"cardMainRow": "qSYn7G_cardMainRow",
			"cardTitle": "qSYn7G_cardTitle",
			"cardTrailing": "qSYn7G_cardTrailing",
			"cards": "qSYn7G_cards",
			"catalog": "qSYn7G_catalog",
			"catalogHeading": "qSYn7G_catalogHeading",
			"chevron": "qSYn7G_chevron",
			"details": "qSYn7G_details",
			"enabledIn": "qSYn7G_enabledIn",
			"entryValue": "qSYn7G_entryValue",
			"failedCount": "qSYn7G_failedCount",
			"failure": "qSYn7G_failure",
			"group": "qSYn7G_group",
			"groupBody": "qSYn7G_groupBody",
			"groupSub": "qSYn7G_groupSub",
			"groupTitle": "qSYn7G_groupTitle",
			"groupTitleRow": "qSYn7G_groupTitleRow",
			"groupToggle": "qSYn7G_groupToggle",
			"headerEnd": "qSYn7G_headerEnd",
			"hint": "qSYn7G_hint",
			"jumpLink": "qSYn7G_jumpLink",
			"phaseDot": "qSYn7G_phaseDot",
			"search": "qSYn7G_search",
			"section": "qSYn7G_section",
			"status": "qSYn7G_status",
			"switcher": "qSYn7G_switcher",
			"switcherLabel": "qSYn7G_switcherLabel",
			"visuallyHidden": "qSYn7G_visuallyHidden"
		};
		//#endregion
		//#region lib/types/client/PluginInventorySettingsTab.js
		const PHASE_KEYS = {
			pending: "pending",
			loading: "loadingPhase",
			active: "active",
			failed: "failed",
			unloading: "unloading"
		};
		/** Localized accessible label for one root Fiber phase. */
		function phaseLabel(phase, t) {
			return phase === null ? t("unobserved") : t(PHASE_KEYS[phase]);
		}
		/** Compact a module specifier without guessing whether its Loader id was generated. */
		function moduleShortName(moduleName) {
			return (moduleName.startsWith("@") ? moduleName.slice(moduleName.indexOf("/") + 1) : moduleName).replace(/^cordis:/, "").replace(/^cordis-plugin-/, "").replace(/^dsh-(?:host-|client-)?/, "");
		}
		/** Display an entry identity without the composition-only `include:` marker. */
		function entrySubtitle(entryId) {
			return entryId.replace(/^include:/, "");
		}
		/** Whether one row's module name or entry id matches the catalog query. */
		function matches(moduleName, entryId, normalizedQuery) {
			if (normalizedQuery.length === 0) return true;
			return [moduleName, ...entryId === null ? [] : [entryId]].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
		}
		/** The roster row shown when the preset switcher has no explicit choice. */
		function fallbackPreset(presets) {
			return presets.find((preset) => preset.isDefault) ?? presets[0];
		}
		/** The switcher's display label for one preset. */
		function presetLabel(preset, t, presetName) {
			const name = presetName(preset);
			if (preset.broken !== void 0) return t("presetOptionBroken", { name });
			if (preset.isDefault) return t("presetOptionDefault", { name });
			return name;
		}
		/** One expandable plugin card; the caller owns the trailing status content. */
		function PluginCard({ rowKey, moduleName, entryId, trailing, ariaLabel, failed, expanded, onToggle, children }) {
			const open = expanded === rowKey;
			const detailId = `plugin-details-${encodeURIComponent(rowKey)}`;
			return (0, react_jsx_runtime.jsxs)("li", {
				className: PluginInventorySettingsTab_module_css_default.card,
				"data-plugin-entry": entryId ?? void 0,
				"data-plugin-module": moduleName,
				"data-failed": failed ? "true" : void 0,
				"data-open": open ? "true" : void 0,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					className: PluginInventorySettingsTab_module_css_default.cardContent,
					type: "button",
					"aria-expanded": open,
					"aria-controls": detailId,
					"aria-label": ariaLabel,
					onClick: () => {
						onToggle(rowKey);
					},
					children: [(0, react_jsx_runtime.jsxs)("span", {
						className: PluginInventorySettingsTab_module_css_default.cardMainRow,
						children: [(0, react_jsx_runtime.jsx)("strong", {
							className: PluginInventorySettingsTab_module_css_default.cardTitle,
							title: moduleName,
							children: moduleShortName(moduleName)
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: PluginInventorySettingsTab_module_css_default.cardTrailing,
							children: [trailing, (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
								className: PluginInventorySettingsTab_module_css_default.chevron,
								size: 12,
								"aria-hidden": "true"
							})]
						})]
					}), entryId === null ? null : (0, react_jsx_runtime.jsx)("code", {
						className: PluginInventorySettingsTab_module_css_default.cardIdentity,
						title: entryId,
						children: entrySubtitle(entryId)
					})]
				}), open ? (0, react_jsx_runtime.jsx)("div", {
					className: PluginInventorySettingsTab_module_css_default.cardDetails,
					id: detailId,
					children
				}) : null]
			});
		}
		/** Detail rows shared by every card: the Loader identity, then labeled facts. */
		function CardFacts({ moduleName, moduleLabel, entryId, facts }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [entryId === null ? null : (0, react_jsx_runtime.jsx)("code", {
				className: PluginInventorySettingsTab_module_css_default.entryValue,
				"data-loader-entry": true,
				children: entryId
			}), (0, react_jsx_runtime.jsxs)("dl", {
				className: PluginInventorySettingsTab_module_css_default.details,
				children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: moduleLabel }), (0, react_jsx_runtime.jsx)("dd", { children: moduleName })] }), facts.map(([label, value]) => (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("dt", { children: label }), (0, react_jsx_runtime.jsx)("dd", { children: value })] }, label))]
			})] });
		}
		const PHASE_DOT_STATES = {
			pending: "idle",
			loading: "ongoing",
			active: "done",
			failed: "error",
			unloading: "ongoing"
		};
		/** Status dot naming a live root-fiber phase; rows with no live fiber show none. */
		function PhaseDot({ phase, t }) {
			const status = phaseLabel(phase, t);
			return (0, react_jsx_runtime.jsx)("span", {
				className: PluginInventorySettingsTab_module_css_default.phaseDot,
				role: "img",
				"aria-label": status,
				title: status,
				children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: PHASE_DOT_STATES[phase] })
			});
		}
		const TAG_TONES = {
			enabled: "success",
			disabled: "neutral",
			conditional: "warning",
			preset: "info",
			failed: "danger"
		};
		/** Enablement tag; `kind` selects the palette. */
		function StateTag({ kind, label }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
				tone: TAG_TONES[kind],
				children: label
			});
		}
		/** Render the read-only plugin inventory: agent presets first, then the global plane. */
		function PluginInventorySettingsTab({ list, presetName, t }) {
			const sectionId = (0, react.useId)();
			const [request, setRequest] = (0, react.useState)(0);
			const [query, setQuery] = (0, react.useState)("");
			const [expanded, setExpanded] = (0, react.useState)(null);
			const [chosenPreset, setChosenPreset] = (0, react.useState)(null);
			const [switcherOpen, setSwitcherOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(null);
			const [globalOpen, setGlobalOpen] = (0, react.useState)(null);
			const [state, setState] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				let current = true;
				Promise.resolve().then(() => list()).then((snapshot) => {
					if (current) setState({
						status: "ready",
						snapshot
					});
				}, () => {
					if (current) setState({ status: "error" });
				});
				return () => {
					current = false;
				};
			}, [list, request]);
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const searching = normalizedQuery.length > 0;
			const snapshot = state.status === "ready" ? state.snapshot : void 0;
			const presets = snapshot?.agentPresets ?? [];
			const selected = presets.find((preset) => preset.id === chosenPreset) ?? fallbackPreset(presets);
			/** Presets that actually enable a module, keyed by module name. */
			const enabledIn = (0, react.useMemo)(() => {
				const found = /* @__PURE__ */ new Map();
				for (const preset of presets) for (const row of preset.rows) {
					if (row.enabled !== true) continue;
					const groups = found.get(row.moduleName);
					if (groups === void 0) found.set(row.moduleName, [preset]);
					else if (!groups.includes(preset)) groups.push(preset);
				}
				return found;
			}, [presets]);
			const entries = snapshot?.entries ?? [];
			const failedEntries = [];
			const regularEntries = [];
			for (const entry of entries) if (entry.fiberPhase === "failed") failedEntries.push(entry);
			else regularEntries.push(entry);
			const entryMatch = (entry) => matches(entry.moduleName, entry.entryId, normalizedQuery);
			const rowMatch = (row) => matches(row.moduleName, row.entryId, normalizedQuery);
			const filteredFailed = failedEntries.filter(entryMatch);
			const filteredRegular = regularEntries.filter(entryMatch);
			const globalCount = filteredFailed.length + filteredRegular.length;
			const selectedRows = selected === void 0 ? [] : selected.rows.filter(rowMatch);
			const otherPresetMatches = searching ? presets.filter((preset) => preset !== selected && preset.rows.some(rowMatch)) : [];
			const otherMatchCount = otherPresetMatches.reduce((total, preset) => total + preset.rows.filter(rowMatch).length, 0);
			const presetEffectiveOpen = searching || (presetOpen ?? true);
			const globalEffectiveOpen = searching || (globalOpen ?? presets.length === 0);
			const nothingMatches = searching && globalCount === 0 && selectedRows.length === 0 && otherPresetMatches.length === 0;
			const retry = () => {
				setState({ status: "loading" });
				setRequest((value) => value + 1);
			};
			const toggleRow = (key) => {
				setExpanded((current) => current === key ? null : key);
			};
			/** Trailing status and detail facts for one row of the selected preset. */
			const presetRowCard = (preset, row, index) => {
				const key = `preset:${preset.id}:${String(index)}`;
				const title = moduleShortName(row.moduleName);
				const failed = row.fiberPhase === "failed";
				const stateText = failed ? t("failedTag") : row.enabled === true ? t("enabledTag") : row.enabled === false ? t("disabledTag") : t("conditionalTag");
				const kind = failed ? "failed" : row.enabled === true ? "enabled" : row.enabled === false ? "disabled" : "conditional";
				return (0, react_jsx_runtime.jsx)(PluginCard, {
					rowKey: key,
					moduleName: row.moduleName,
					entryId: row.entryId,
					failed,
					expanded,
					onToggle: toggleRow,
					ariaLabel: `${title}${row.entryId === null ? "" : `, ${row.entryId}`}, ${stateText}`,
					trailing: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [row.enabled === true && !failed && row.fiberPhase !== null ? (0, react_jsx_runtime.jsx)(PhaseDot, {
						phase: row.fiberPhase,
						t
					}) : null, (0, react_jsx_runtime.jsx)(StateTag, {
						kind,
						label: stateText
					})] }),
					children: (0, react_jsx_runtime.jsx)(CardFacts, {
						moduleName: row.moduleName,
						moduleLabel: t("moduleLabel"),
						entryId: row.entryId,
						facts: [
							[t("fromPreset"), presetName(preset)],
							[t("configuration"), stateText],
							...row.fiberPhase === null ? [] : [[t("runtime"), phaseLabel(row.fiberPhase, t)]],
							...row.condition === void 0 ? [] : [[t("condition"), (0, react_jsx_runtime.jsx)("code", { children: row.condition }, "condition")]]
						]
					})
				}, key);
			};
			/** One global-plane row; a preset-provided row carries the presets that enable it. */
			const globalRowCard = (entry, providers) => {
				const key = `global:${entry.entryId}`;
				const title = moduleShortName(entry.moduleName);
				const failed = entry.fiberPhase === "failed";
				const stateText = failed ? t("failedTag") : providers !== void 0 ? t("presetEnabledTag") : t(entry.enabled ? "enabledTag" : "disabledTag");
				const kind = failed ? "failed" : providers !== void 0 ? "preset" : entry.enabled ? "enabled" : "disabled";
				return (0, react_jsx_runtime.jsx)(PluginCard, {
					rowKey: key,
					moduleName: entry.moduleName,
					entryId: entry.entryId,
					failed,
					expanded,
					onToggle: toggleRow,
					ariaLabel: `${title}, ${entry.entryId}, ${stateText}`,
					trailing: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [entry.enabled && !failed && entry.fiberPhase !== null ? (0, react_jsx_runtime.jsx)(PhaseDot, {
						phase: entry.fiberPhase,
						t
					}) : null, (0, react_jsx_runtime.jsx)(StateTag, {
						kind,
						label: stateText
					})] }),
					children: (0, react_jsx_runtime.jsx)(CardFacts, {
						moduleName: entry.moduleName,
						moduleLabel: t("moduleLabel"),
						entryId: entry.entryId,
						facts: providers !== void 0 ? [[t("configuration"), t("presetProvidedDetail")], [t("enabledIn"), (0, react_jsx_runtime.jsxs)("span", {
							className: PluginInventorySettingsTab_module_css_default.enabledIn,
							children: [(0, react_jsx_runtime.jsx)("span", { children: providers.map((preset) => presetName(preset)).join(" · ") }), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: PluginInventorySettingsTab_module_css_default.jumpLink,
								onClick: () => {
									setChosenPreset(providers[0].id);
								},
								children: t("viewInPreset")
							})]
						})]] : [[t("configuration"), t(entry.enabled ? "enabledTag" : "disabledTag")], ...entry.enabled ? [[t("runtime"), phaseLabel(entry.fiberPhase, t)]] : []]
					})
				}, key);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginInventorySettingsTab_module_css_default.section,
				"aria-busy": state.status === "loading",
				children: [
					state.status === "loading" ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginInventorySettingsTab_module_css_default.status,
						children: t("loading")
					}) : null,
					state.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
						className: PluginInventorySettingsTab_module_css_default.failure,
						children: [(0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							children: t("error")
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: retry,
							children: t("retry")
						})]
					}) : null,
					snapshot !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						className: PluginInventorySettingsTab_module_css_default.catalog,
						children: [
							(0, react_jsx_runtime.jsxs)("label", {
								className: PluginInventorySettingsTab_module_css_default.search,
								children: [
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { "aria-hidden": "true" }),
									(0, react_jsx_runtime.jsx)("span", {
										className: PluginInventorySettingsTab_module_css_default.visuallyHidden,
										children: t("search")
									}),
									(0, react_jsx_runtime.jsx)("input", {
										type: "search",
										value: query,
										placeholder: t("search"),
										"aria-label": t("search"),
										onChange: (event) => {
											setQuery(event.currentTarget.value);
										}
									})
								]
							}),
							entries.length === 0 && presets.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
								className: PluginInventorySettingsTab_module_css_default.status,
								children: t("empty")
							}) : null,
							nothingMatches ? (0, react_jsx_runtime.jsx)("p", {
								className: PluginInventorySettingsTab_module_css_default.status,
								children: t("emptySearch")
							}) : null,
							selected !== void 0 ? (0, react_jsx_runtime.jsxs)("section", {
								className: PluginInventorySettingsTab_module_css_default.group,
								"data-plugin-scope": "preset",
								"data-preset-id": selected.id,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: PluginInventorySettingsTab_module_css_default.groupTitleRow,
										children: [(0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: PluginInventorySettingsTab_module_css_default.groupToggle,
											"aria-expanded": presetEffectiveOpen,
											"aria-controls": `${sectionId}-preset`,
											onClick: () => {
												setPresetOpen(!presetEffectiveOpen);
											},
											children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
												className: PluginInventorySettingsTab_module_css_default.chevron,
												size: 12,
												"aria-hidden": "true"
											}), (0, react_jsx_runtime.jsx)("span", {
												className: PluginInventorySettingsTab_module_css_default.groupTitle,
												children: t("presetTitle")
											})]
										}), (0, react_jsx_runtime.jsx)("div", {
											className: PluginInventorySettingsTab_module_css_default.headerEnd,
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
												open: switcherOpen,
												onClose: () => {
													setSwitcherOpen(false);
												},
												items: presets.map((preset) => ({
													id: preset.id,
													label: presetLabel(preset, t, presetName)
												})),
												selectedId: selected.id,
												onSelect: (id) => {
													setSwitcherOpen(false);
													setChosenPreset(id);
												},
												align: "end",
												portal: true,
												anchor: (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													className: PluginInventorySettingsTab_module_css_default.switcher,
													"aria-haspopup": "menu",
													"aria-expanded": switcherOpen,
													"aria-label": t("switcherLabel"),
													onClick: () => {
														setSwitcherOpen((value) => !value);
													},
													children: [(0, react_jsx_runtime.jsx)("span", {
														className: PluginInventorySettingsTab_module_css_default.switcherLabel,
														children: presetLabel(selected, t, presetName)
													}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
														className: PluginInventorySettingsTab_module_css_default.chevron,
														"aria-hidden": "true"
													})]
												})
											})
										})]
									}),
									(0, react_jsx_runtime.jsxs)("p", {
										className: PluginInventorySettingsTab_module_css_default.groupSub,
										children: [t("presetSubtitle"), (0, react_jsx_runtime.jsx)("span", {
											"data-preset-plugin-count": selectedRows.length,
											children: ` · ${String(selectedRows.length)} ${t("countUnit")}`
										})]
									}),
									presetEffectiveOpen ? (0, react_jsx_runtime.jsxs)("div", {
										id: `${sectionId}-preset`,
										className: PluginInventorySettingsTab_module_css_default.groupBody,
										children: [
											selected.broken !== void 0 ? (0, react_jsx_runtime.jsx)("p", {
												className: PluginInventorySettingsTab_module_css_default.brokenNote,
												role: "alert",
												children: selected.broken
											}) : null,
											selectedRows.length > 0 ? (0, react_jsx_runtime.jsx)("ul", {
												className: PluginInventorySettingsTab_module_css_default.cards,
												children: selectedRows.map((row, index) => presetRowCard(selected, row, index))
											}) : null,
											otherMatchCount > 0 ? (0, react_jsx_runtime.jsxs)("p", {
												className: PluginInventorySettingsTab_module_css_default.hint,
												children: [t("matchesInOtherPresets", { count: String(otherMatchCount) }), otherPresetMatches.map((preset) => (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: PluginInventorySettingsTab_module_css_default.jumpLink,
													onClick: () => {
														setChosenPreset(preset.id);
													},
													children: presetName(preset)
												}, preset.id))]
											}) : null
										]
									}) : null
								]
							}) : null,
							entries.length > 0 ? (0, react_jsx_runtime.jsxs)("section", {
								className: PluginInventorySettingsTab_module_css_default.group,
								"data-plugin-scope": "global",
								children: [
									(0, react_jsx_runtime.jsx)("div", {
										className: PluginInventorySettingsTab_module_css_default.groupTitleRow,
										children: (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: PluginInventorySettingsTab_module_css_default.groupToggle,
											"aria-expanded": globalEffectiveOpen,
											"aria-controls": `${sectionId}-global`,
											onClick: () => {
												setGlobalOpen(!globalEffectiveOpen);
											},
											children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
												className: PluginInventorySettingsTab_module_css_default.chevron,
												size: 12,
												"aria-hidden": "true"
											}), (0, react_jsx_runtime.jsx)("span", {
												className: PluginInventorySettingsTab_module_css_default.groupTitle,
												children: t("globalTitle")
											})]
										})
									}),
									(0, react_jsx_runtime.jsxs)("p", {
										className: PluginInventorySettingsTab_module_css_default.groupSub,
										children: [
											t("globalSubtitle"),
											(0, react_jsx_runtime.jsx)("span", {
												"data-plugin-count": globalCount,
												children: ` · ${String(globalCount)} ${t("countUnit")}`
											}),
											filteredFailed.length > 0 ? (0, react_jsx_runtime.jsxs)("span", {
												className: PluginInventorySettingsTab_module_css_default.failedCount,
												children: [
													filteredFailed.length,
													" ",
													t("failedCountLabel")
												]
											}) : null
										]
									}),
									globalEffectiveOpen && globalCount > 0 ? (0, react_jsx_runtime.jsxs)("ul", {
										className: PluginInventorySettingsTab_module_css_default.cards,
										id: `${sectionId}-global`,
										children: [filteredFailed.map((entry) => globalRowCard(entry)), filteredRegular.map((entry) => globalRowCard(entry, entry.enabled ? void 0 : enabledIn.get(entry.moduleName)))]
									}) : null
								]
							}) : null
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Copy dictionaries for the plugin inventory Settings section. */
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			tab: "插件列表",
			loading: "正在读取插件…",
			error: "暂时无法读取插件。",
			retry: "重试",
			search: "搜索插件",
			empty: "暂无插件。",
			emptySearch: "没有匹配的插件。",
			presetTitle: "会话插件",
			presetSubtitle: "由 Agent 预设按会话组成",
			countUnit: "个",
			switcherLabel: "选择要查看的 Agent 预设",
			presetOptionDefault: "{name}（默认）",
			presetOptionBroken: "{name}（加载失败）",
			globalTitle: "全局插件",
			globalSubtitle: "系统与所有会话共用",
			presetProvidedDetail: "全局已停用，由 Agent 预设按会话提供",
			enabledIn: "启用于",
			viewInPreset: "去预设分组查看",
			matchesInOtherPresets: "其他预设中还有 {count} 个匹配：",
			failedCountLabel: "个失败",
			enabledTag: "已启用",
			disabledTag: "已停用",
			conditionalTag: "条件启用",
			presetEnabledTag: "预设中启用",
			failedTag: "启动失败",
			moduleLabel: "完整名称",
			fromPreset: "来自",
			condition: "禁用条件",
			configuration: "配置状态",
			runtime: "运行状态",
			unobserved: "未运行",
			pending: "等待依赖",
			loadingPhase: "加载中",
			active: "运行中",
			failed: "启动失败",
			unloading: "卸载中"
		};
		/** English dictionary checked against the Chinese key set. */
		const en = {
			tab: "Plugin list",
			loading: "Reading plugins…",
			error: "Plugins are temporarily unavailable.",
			retry: "Retry",
			search: "Search plugins",
			empty: "No plugins are available.",
			emptySearch: "No matching plugins.",
			presetTitle: "Session plugins",
			presetSubtitle: "Composed per session by agent presets",
			countUnit: "plugins",
			switcherLabel: "Choose the agent preset to inspect",
			presetOptionDefault: "{name} (default)",
			presetOptionBroken: "{name} (failed to load)",
			globalTitle: "Global plugins",
			globalSubtitle: "Shared by the system and every session",
			presetProvidedDetail: "Disabled globally; agent presets provide it per session",
			enabledIn: "Enabled in",
			viewInPreset: "View in the preset group",
			matchesInOtherPresets: "{count} more matches in other presets: ",
			failedCountLabel: "failed",
			enabledTag: "Enabled",
			disabledTag: "Disabled",
			conditionalTag: "Conditional",
			presetEnabledTag: "Enabled via presets",
			failedTag: "Failed",
			moduleLabel: "Module",
			fromPreset: "From",
			condition: "Disabled when",
			configuration: "Configuration",
			runtime: "Status",
			unobserved: "Not running",
			pending: "Waiting for dependencies",
			loadingPhase: "Loading",
			active: "Running",
			failed: "Failed to start",
			unloading: "Unloading"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Read-only Host plugin inventory registered into Web Settings. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.pluginInventory";
		/** Services required by the Settings registration and generated Remote face. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.pluginInventory"
		];
		/** Contribute the lazy inventory tab to the Plugins settings section. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-settings-plugin-inventory: dictionaries");
			const t = ctx.locale.bind(NS);
			const list = async () => {
				const result = await ctx.remote.pluginInventory.list();
				if (!result.ok) throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
				return result.value;
			};
			const agentPresetCopy = ctx.locale.bind("settings.agentPreset");
			const presetName = (preset) => presetDisplayText(preset, agentPresetCopy).name;
			const injected = () => ({
				list,
				presetName
			});
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "all",
				order: 10,
				label: () => t("tab"),
				locale: NS,
				inject: injected
			}, PluginInventorySettingsTab));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
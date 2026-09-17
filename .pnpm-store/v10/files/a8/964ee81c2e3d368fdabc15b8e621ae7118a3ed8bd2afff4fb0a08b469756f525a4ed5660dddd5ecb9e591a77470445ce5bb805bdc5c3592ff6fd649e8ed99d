window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-settings-plugins",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_slots = require("@deepseek-ai/dsh-client-ui-slots");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-settings-plugins/src/client/fields.module.css.mjs
		const css$3 = ".At1oFq_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.At1oFq_field+.At1oFq_field{border-top:.5px solid var(--dsw-alias-border-l2)}.At1oFq_head{align-items:center;gap:8px;display:flex}.At1oFq_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.At1oFq_badges{align-items:center;gap:8px;display:inline-flex}.At1oFq_reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.At1oFq_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.At1oFq_reset:disabled{cursor:default}.At1oFq_input{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.At1oFq_input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.At1oFq_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.At1oFq_inputInvalid{border-color:var(--dsw-alias-label-error);}.At1oFq_invalid{color:var(--dsw-alias-label-error);margin:0;font-size:12px;line-height:1.5}.At1oFq_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-settings-plugins/fields.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-settings-plugins";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var fields_module_css_default = {
			"badges": "At1oFq_badges",
			"field": "At1oFq_field",
			"head": "At1oFq_head",
			"hint": "At1oFq_hint",
			"input": "At1oFq_input",
			"inputInvalid": "At1oFq_inputInvalid",
			"invalid": "At1oFq_invalid",
			"label": "At1oFq_label",
			"reset": "At1oFq_reset"
		};
		//#endregion
		//#region lib/types/client/fields.js
		/**
		* Hand-written controls for the plugin configuration forms. Each renders one
		* field's label, its staged text, whether saving would leave an override, and
		* — when one stands — the reset that stages a clear back to the composition
		* layer. Nothing here writes: a control reports what the user typed, and the
		* card's save is the single point where a draft becomes a document mutation.
		*/
		/**
		* A staged value field. `numeric` only hints the keypad: which drafts a field
		* accepts is decided by its spec, so the control never silently rewrites what
		* the user typed.
		* @param props - the field's copy, its staged text, and the edit actions.
		* @returns the labelled control.
		*/
		function ValueField(props) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: fields_module_css_default.field,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: fields_module_css_default.head,
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: fields_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? (0, react_jsx_runtime.jsxs)("span", {
							className: fields_module_css_default.badges,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "neutral",
								children: props.overriddenLabel
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: fields_module_css_default.reset,
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					(0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: props.invalid ? fields_module_css_default.inputInvalid : fields_module_css_default.input,
						type: "text",
						...props.numeric === true ? { inputMode: "numeric" } : {},
						...props.invalid ? { "aria-invalid": true } : {},
						value: props.text,
						placeholder: props.placeholder ?? "",
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: props.invalid ? fields_module_css_default.invalid : fields_module_css_default.hint,
						children: props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		/**
		* A write-only credential control. The value never rides a response, so the
		* control reports only whether one is configured and starts blank; a blank
		* draft writes nothing, which keeps the stored key rather than clearing it.
		* @param props - the field's copy, its staged text, and the configured state.
		* @returns the labelled control.
		*/
		function SecretField(props) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: fields_module_css_default.field,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: fields_module_css_default.head,
						children: [(0, react_jsx_runtime.jsx)("label", {
							className: fields_module_css_default.label,
							htmlFor: props.id,
							children: props.label
						}), (0, react_jsx_runtime.jsx)("span", {
							className: fields_module_css_default.badges,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: props.configured ? "neutral" : "quiet",
								children: props.stateLabel
							})
						})]
					}),
					(0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: fields_module_css_default.input,
						type: "password",
						autoComplete: "off",
						value: props.text,
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: fields_module_css_default.hint,
						children: props.hint
					})
				]
			});
		}
		//#endregion
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
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-settings-plugins/src/client/PluginCard.module.css.mjs
		const css$2 = ".YyYd_a_card{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;list-style:none;transition:border-color .16s,background .16s}.YyYd_a_card:hover{border-color:var(--dsw-alias-label-dimmed)}.YyYd_a_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.YyYd_a_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.YyYd_a_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.YyYd_a_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.YyYd_a_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.YyYd_a_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.YyYd_a_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.YyYd_a_chevronOpen{transform:rotate(180deg)}.YyYd_a_body{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.YyYd_a_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.YyYd_a_pending{flex:none}.YyYd_a_footer{border-top:.5px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.YyYd_a_failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}.YyYd_a_discard,.YyYd_a_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.YyYd_a_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.YyYd_a_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.YyYd_a_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.YyYd_a_discard:disabled,.YyYd_a_save:disabled{opacity:.4;cursor:default}.YyYd_a_discard:focus-visible,.YyYd_a_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-settings-plugins/PluginCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-settings-plugins";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var PluginCard_module_css_default = {
			"body": "YyYd_a_body",
			"card": "YyYd_a_card",
			"cardOpen": "YyYd_a_cardOpen",
			"chevron": "YyYd_a_chevron",
			"chevronOpen": "YyYd_a_chevronOpen",
			"description": "YyYd_a_description",
			"discard": "YyYd_a_discard",
			"failed": "YyYd_a_failed",
			"footer": "YyYd_a_footer",
			"headText": "YyYd_a_headText",
			"header": "YyYd_a_header",
			"name": "YyYd_a_name",
			"pending": "YyYd_a_pending",
			"readOnly": "YyYd_a_readOnly",
			"save": "YyYd_a_save"
		};
		//#endregion
		//#region lib/types/client/PluginCard.js
		/**
		* One plugin's card: a header naming the plugin and what its settings govern,
		* disclosing that plugin's controls in place, with the save that writes them.
		*
		* The header is its own button rather than a shared disclosure row because a
		* card stacks its name over its description, while that row lays the two side
		* by side — the layout, not the behavior, is what differs. Disclosure is
		* card-local state: which card a user has open is a reading gesture, not
		* something the Host or the section has any stake in. Staged edits outlive
		* collapsing, so the header marks a card holding unsaved edits.
		*
		* A card renders nothing while its namespace is unavailable: a deployment that
		* does not compose the owning plugin should show no trace of it, rather than a
		* disabled card the user cannot act on.
		*/
		/**
		* Render one plugin card.
		* @param props - the plugin's copy keys, its form state, and its controls.
		* @returns the card, or nothing when the namespace is unavailable.
		*/
		function PluginCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const saveStarted = (0, react.useRef)(false);
			const { state } = props;
			(0, react.useEffect)(() => {
				if (state.saving) {
					saveStarted.current = true;
					return;
				}
				if (!saveStarted.current) return;
				saveStarted.current = false;
				if (!state.dirty && !state.failed) setOpen(false);
			}, [
				state.dirty,
				state.failed,
				state.saving
			]);
			if (!state.available) return null;
			const title = props.t(props.titleKey);
			const blocked = !state.dirty || state.invalid || state.saving;
			return (0, react_jsx_runtime.jsxs)("li", {
				className: clsx(PluginCard_module_css_default.card, open && PluginCard_module_css_default.cardOpen),
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PluginCard_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "collapse" : "expand")}: ${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						(0, react_jsx_runtime.jsxs)("span", {
							className: PluginCard_module_css_default.headText,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: PluginCard_module_css_default.name,
								children: title
							}), (0, react_jsx_runtime.jsx)("span", {
								className: PluginCard_module_css_default.description,
								children: props.t(props.descriptionKey)
							})]
						}),
						state.dirty ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
							tone: "neutral",
							className: PluginCard_module_css_default.pending,
							children: props.t("unsaved")
						}) : null,
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: clsx(PluginCard_module_css_default.chevron, open && PluginCard_module_css_default.chevronOpen) })
					]
				}), open ? (0, react_jsx_runtime.jsxs)("div", {
					className: PluginCard_module_css_default.body,
					children: [
						!state.writable ? (0, react_jsx_runtime.jsx)("p", {
							className: PluginCard_module_css_default.readOnly,
							role: "status",
							children: props.t("readOnly")
						}) : null,
						props.children,
						(0, react_jsx_runtime.jsxs)("div", {
							className: PluginCard_module_css_default.footer,
							children: [
								state.failed ? (0, react_jsx_runtime.jsx)("p", {
									className: PluginCard_module_css_default.failed,
									role: "status",
									children: props.t("saveFailed")
								}) : null,
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PluginCard_module_css_default.discard,
									disabled: !state.dirty || state.saving,
									onClick: props.onDiscard,
									children: props.t("discard")
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PluginCard_module_css_default.save,
									disabled: blocked,
									onClick: props.onSave,
									children: props.t(state.saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/AgentLoopCard.js
		/**
		* Render the agent-loop card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function AgentLoopCard(props) {
			const { t } = props;
			const state = props.useAgentLoopCard((snapshot) => snapshot);
			return (0, react_jsx_runtime.jsx)(PluginCard, {
				t,
				titleKey: "agentLoopTitle",
				descriptionKey: "agentLoopDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: (0, react_jsx_runtime.jsx)(ValueField, {
					id: "plugin-config-agent-loop-parallel",
					label: t("agentLoopMaxParallel"),
					hint: t("agentLoopMaxParallelHint"),
					overriddenLabel: t("overridden"),
					resetLabel: t("reset"),
					invalidLabel: t("invalidNumber"),
					numeric: true,
					disabled: !state.writable,
					...state.maxParallelToolCalls,
					onEdit: (text) => {
						props.edit("maxParallelToolCalls", text);
					},
					onReset: () => {
						props.resetField("maxParallelToolCalls");
					}
				})
			});
		}
		//#endregion
		//#region lib/types/client/BashCard.js
		/**
		* Render the shell card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function BashCard(props) {
			const { t } = props;
			const state = props.useBashCard((snapshot) => snapshot);
			const disabled = !state.writable;
			return (0, react_jsx_runtime.jsxs)(PluginCard, {
				t,
				titleKey: "bashTitle",
				descriptionKey: "bashDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [(0, react_jsx_runtime.jsx)(ValueField, {
					id: "plugin-config-bash-timeout",
					label: t("bashTimeoutMs"),
					hint: t("bashTimeoutMsHint"),
					overriddenLabel: t("overridden"),
					resetLabel: t("reset"),
					invalidLabel: t("invalidNumber"),
					numeric: true,
					disabled,
					...state.timeoutMs,
					onEdit: (text) => {
						props.edit("timeoutMs", text);
					},
					onReset: () => {
						props.resetField("timeoutMs");
					}
				}), (0, react_jsx_runtime.jsx)(ValueField, {
					id: "plugin-config-bash-output",
					label: t("bashMaxOutputBytes"),
					hint: t("bashMaxOutputBytesHint"),
					overriddenLabel: t("overridden"),
					resetLabel: t("reset"),
					invalidLabel: t("invalidNumber"),
					numeric: true,
					disabled,
					...state.maxOutputBytes,
					onEdit: (text) => {
						props.edit("maxOutputBytes", text);
					},
					onReset: () => {
						props.resetField("maxOutputBytes");
					}
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.module.css.mjs
		const css$1 = ".pbvGtq_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.pbvGtq_heading{margin:0;font-size:18px;font-weight:600}.pbvGtq_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.pbvGtq_tabs{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:flex-end;gap:22px;margin-top:2px;display:flex}.pbvGtq_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;padding:7px 1px 9px;font-size:13px;line-height:20px;position:relative}.pbvGtq_tab:hover,.pbvGtq_tab[data-active=true]{color:var(--dsw-alias-label-primary)}.pbvGtq_tab[data-active=true]:after,.pbvGtq_tab:focus-visible:after{background:var(--dsw-alias-label-primary);content:\"\";border-radius:2px 2px 0 0;height:2px;position:absolute;bottom:-1px;left:0;right:0}.pbvGtq_tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;color:var(--dsw-alias-label-primary);border-radius:2px}.pbvGtq_panel{min-width:0;padding-top:2px}.pbvGtq_cards{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}.pbvGtq_empty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-settings-plugins/PluginsSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-settings-plugins";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var PluginsSettingsSection_module_css_default = {
			"cards": "pbvGtq_cards",
			"empty": "pbvGtq_empty",
			"heading": "pbvGtq_heading",
			"intro": "pbvGtq_intro",
			"panel": "pbvGtq_panel",
			"section": "pbvGtq_section",
			"tab": "pbvGtq_tab",
			"tabs": "pbvGtq_tabs"
		};
		//#endregion
		//#region lib/types/client/ConfigurablePluginsTab.js
		/**
		* Configurable Host plugins contributed to the shared Plugins section.
		*
		* The tab enumerates settings namespaces but never interprets one — a card
		* arrives through `settings.plugin.item` keyed by the namespace it edits, so a
		* plugin that ships a browser half owns its own card and this tab only decides
		* which keys to dispatch.
		*/
		/**
		* Render cards registered by plugins that expose editable settings.
		* @param props - locale copy, slot rendering, and the namespaces to dispatch.
		* @returns the card list, or the empty line once the Host has answered.
		*/
		function ConfigurablePluginsTab(props) {
			const { t, renderSlot } = props;
			const { loaded, namespaces } = props.useConfigurablePlugins((snapshot) => snapshot);
			if (namespaces.length > 0) return (0, react_jsx_runtime.jsx)("ul", {
				className: PluginsSettingsSection_module_css_default.cards,
				children: namespaces.map((ns) => (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderSlot("settings.plugin.item", {}, { entryKey: ns }) }, ns))
			});
			return loaded ? (0, react_jsx_runtime.jsx)("p", {
				className: PluginsSettingsSection_module_css_default.empty,
				children: t("empty")
			}) : null;
		}
		//#endregion
		//#region lib/types/client/PluginsSettingsSection.js
		/** Plugins settings section: localized tabs around feature-owned pages. */
		/** Render one Plugins page whose contents arrive from feature-owned tabs. */
		function PluginsSettingsSection({ t, renderSlot, useTabs }) {
			const tabsId = (0, react.useId)();
			const tabRefs = (0, react.useRef)([]);
			const rows = useTabs((value) => value);
			const [activeId, setActiveId] = (0, react.useState)();
			const [visitedIds, setVisitedIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const active = rows.find((row) => row.id === activeId)?.id ?? rows[0]?.id;
			(0, react.useEffect)(() => {
				if (active === void 0) return;
				setVisitedIds((previous) => {
					if (previous.has(active)) return previous;
					return new Set([...previous, active]);
				});
			}, [active]);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: PluginsSettingsSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: PluginsSettingsSection_module_css_default.heading,
						children: t("title")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: PluginsSettingsSection_module_css_default.intro,
						children: t("intro")
					}),
					rows.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: PluginsSettingsSection_module_css_default.empty,
						children: t("empty")
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("div", {
						className: PluginsSettingsSection_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("tabs"),
						children: rows.map((row, index) => {
							const selected = row.id === active;
							return (0, react_jsx_runtime.jsx)("button", {
								ref: (element) => {
									tabRefs.current[index] = element;
								},
								id: `${tabsId}-tab-${row.id}`,
								type: "button",
								role: "tab",
								className: PluginsSettingsSection_module_css_default.tab,
								"aria-selected": selected,
								"aria-controls": `${tabsId}-panel-${row.id}`,
								"data-active": selected ? "true" : void 0,
								tabIndex: selected ? 0 : -1,
								onClick: () => {
									setActiveId(row.id);
								},
								onKeyDown: (event) => {
									let nextIndex;
									switch (event.key) {
										case "ArrowRight":
											nextIndex = (index + 1) % rows.length;
											break;
										case "ArrowLeft":
											nextIndex = (index - 1 + rows.length) % rows.length;
											break;
										case "Home":
											nextIndex = 0;
											break;
										case "End":
											nextIndex = rows.length - 1;
											break;
										default: return;
									}
									event.preventDefault();
									const nextRow = rows[nextIndex];
									const nextTab = tabRefs.current[nextIndex];
									setActiveId(nextRow.id);
									nextTab.focus();
								},
								children: row.label
							}, row.id);
						})
					}), rows.filter((row) => row.id === active || visitedIds.has(row.id)).map((row) => {
						const selected = row.id === active;
						return (0, react_jsx_runtime.jsx)("div", {
							id: `${tabsId}-panel-${row.id}`,
							className: PluginsSettingsSection_module_css_default.panel,
							role: "tabpanel",
							"aria-labelledby": `${tabsId}-tab-${row.id}`,
							hidden: !selected,
							children: renderSlot("settings.plugins.tab", {}, { only: row.id })
						}, row.id);
					})] })
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-settings-plugins/src/client/SubagentModelSelectionCard.module.css.mjs
		const css = ".vCGm7G_permission{gap:6px;padding:12px 0;display:grid}.vCGm7G_toggleRow{color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;line-height:1.5;display:flex}.vCGm7G_toggleLabel{flex:1;min-width:0}.vCGm7G_selection{gap:10px;display:grid}.vCGm7G_hint,.vCGm7G_notice,.vCGm7G_invalid,.vCGm7G_conflict{margin:0;font-size:12px;line-height:1.5}.vCGm7G_hint,.vCGm7G_notice{color:var(--dsw-alias-label-tertiary)}.vCGm7G_invalid,.vCGm7G_conflict{color:var(--dsw-alias-label-error)}.vCGm7G_catalogError{color:var(--dsw-alias-label-error);justify-content:space-between;align-items:center;gap:12px;font-size:12px;display:flex}.vCGm7G_catalogError button{color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:0;padding:0}.vCGm7G_models{border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;gap:6px;min-width:0;max-height:280px;margin:0;padding:10px;display:grid;overflow:auto}.vCGm7G_models legend{color:var(--dsw-alias-label-secondary);padding:0 4px;font-size:12px}.vCGm7G_modelGroup{gap:6px;display:grid}.vCGm7G_modelGroup+.vCGm7G_modelGroup{border-top:.5px solid var(--dsw-alias-border-l3);margin-top:4px;padding-top:10px}.vCGm7G_providerName{color:var(--dsw-alias-label-tertiary);padding:0 6px;font-size:11px;font-weight:500}.vCGm7G_model{cursor:pointer;border-radius:6px;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0;padding:6px;display:grid}.vCGm7G_model:hover{background:var(--dsw-alias-bg-layer-4)}.vCGm7G_modelName,.vCGm7G_route{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.vCGm7G_modelName{color:var(--dsw-alias-label-primary);font-size:13px}.vCGm7G_route{color:var(--dsw-alias-label-tertiary);margin-top:2px;font-size:11px}.vCGm7G_unavailable{color:var(--dsw-alias-label-tertiary);font-size:11px}";
		const tagId = "@deepseek-ai/dsh-client-ui-settings-plugins/SubagentModelSelectionCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-settings-plugins";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SubagentModelSelectionCard_module_css_default = {
			"catalogError": "vCGm7G_catalogError",
			"conflict": "vCGm7G_conflict",
			"hint": "vCGm7G_hint",
			"invalid": "vCGm7G_invalid",
			"model": "vCGm7G_model",
			"modelGroup": "vCGm7G_modelGroup",
			"modelName": "vCGm7G_modelName",
			"models": "vCGm7G_models",
			"notice": "vCGm7G_notice",
			"permission": "vCGm7G_permission",
			"providerName": "vCGm7G_providerName",
			"route": "vCGm7G_route",
			"selection": "vCGm7G_selection",
			"toggleLabel": "vCGm7G_toggleLabel",
			"toggleRow": "vCGm7G_toggleRow",
			"unavailable": "vCGm7G_unavailable"
		};
		//#endregion
		//#region lib/types/client/SubagentModelSelectionCard.js
		/** User control for model-selectable subagent delegation in new sessions. */
		/**
		* Render the default-off preference and its exact adapter-route choices.
		* @param props - locale copy, the card snapshot, and its toggle action.
		* @returns the preference card, or nothing when the namespace is unavailable.
		*/
		function SubagentModelSelectionCard(props) {
			const { t } = props;
			const state = props.useSubagentModelSelectionCard((snapshot) => snapshot);
			const availableGroups = /* @__PURE__ */ new Map();
			const unavailable = [];
			for (const candidate of state.candidates) {
				if (!candidate.available) {
					unavailable.push(candidate);
					continue;
				}
				const group = availableGroups.get(candidate.provider);
				if (group === void 0) availableGroups.set(candidate.provider, {
					providerName: candidate.providerName,
					candidates: [candidate]
				});
				else group.candidates.push(candidate);
			}
			const renderCandidate = (candidate) => (0, react_jsx_runtime.jsxs)("label", {
				className: SubagentModelSelectionCard_module_css_default.model,
				children: [
					(0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: candidate.selected,
						disabled: !state.writable || state.saving,
						onChange: () => {
							props.toggleModel(candidate.key);
						}
					}),
					(0, react_jsx_runtime.jsxs)("span", { children: [(0, react_jsx_runtime.jsx)("span", {
						className: SubagentModelSelectionCard_module_css_default.modelName,
						children: candidate.modelName
					}), (0, react_jsx_runtime.jsx)("span", {
						className: SubagentModelSelectionCard_module_css_default.route,
						children: `${candidate.providerName} · ${candidate.provider}/${candidate.model}`
					})] }),
					!candidate.available ? (0, react_jsx_runtime.jsx)("span", {
						className: SubagentModelSelectionCard_module_css_default.unavailable,
						children: t("subagentModelSelectionUnavailable")
					}) : null
				]
			}, candidate.key);
			return (0, react_jsx_runtime.jsxs)(PluginCard, {
				t,
				titleKey: "subagentModelSelectionTitle",
				descriptionKey: "subagentModelSelectionDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: SubagentModelSelectionCard_module_css_default.permission,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: SubagentModelSelectionCard_module_css_default.toggleRow,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: SubagentModelSelectionCard_module_css_default.toggleLabel,
								children: t("subagentModelSelectionToggle")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
								checked: state.enabled,
								label: t("subagentModelSelectionToggle"),
								disabled: !state.writable || state.saving,
								onChange: props.toggleEnabled
							})]
						}), (0, react_jsx_runtime.jsx)("p", {
							className: SubagentModelSelectionCard_module_css_default.hint,
							children: t(state.enabled ? "subagentModelSelectionChoose" : "subagentModelSelectionOff")
						})]
					}),
					state.enabled ? (0, react_jsx_runtime.jsxs)("div", {
						className: SubagentModelSelectionCard_module_css_default.selection,
						children: [
							state.catalogStatus === "loading" ? (0, react_jsx_runtime.jsx)("p", {
								className: SubagentModelSelectionCard_module_css_default.notice,
								role: "status",
								children: t("subagentModelSelectionLoading")
							}) : null,
							state.catalogStatus === "error" ? (0, react_jsx_runtime.jsxs)("div", {
								className: SubagentModelSelectionCard_module_css_default.catalogError,
								role: "alert",
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("subagentModelSelectionLoadFailed") }), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: state.saving,
									onClick: props.retryCatalog,
									children: t("subagentModelSelectionRetry")
								})]
							}) : null,
							state.catalogPartial ? (0, react_jsx_runtime.jsx)("p", {
								className: SubagentModelSelectionCard_module_css_default.notice,
								children: t("subagentModelSelectionPartial")
							}) : null,
							state.candidates.length > 0 ? (0, react_jsx_runtime.jsxs)("fieldset", {
								className: SubagentModelSelectionCard_module_css_default.models,
								children: [
									(0, react_jsx_runtime.jsx)("legend", { children: t("subagentModelSelectionAllowed") }),
									[...availableGroups].map(([provider, group]) => (0, react_jsx_runtime.jsxs)("div", {
										className: SubagentModelSelectionCard_module_css_default.modelGroup,
										children: [(0, react_jsx_runtime.jsx)("div", {
											className: SubagentModelSelectionCard_module_css_default.providerName,
											children: group.providerName
										}), group.candidates.map(renderCandidate)]
									}, provider)),
									unavailable.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
										className: SubagentModelSelectionCard_module_css_default.modelGroup,
										children: [(0, react_jsx_runtime.jsx)("div", {
											className: SubagentModelSelectionCard_module_css_default.providerName,
											children: t("subagentModelSelectionUnavailableGroup")
										}), unavailable.map(renderCandidate)]
									}) : null
								]
							}) : state.catalogStatus === "ready" ? (0, react_jsx_runtime.jsx)("p", {
								className: SubagentModelSelectionCard_module_css_default.notice,
								children: t("subagentModelSelectionEmpty")
							}) : null,
							state.invalid ? (0, react_jsx_runtime.jsx)("p", {
								className: SubagentModelSelectionCard_module_css_default.invalid,
								children: t("subagentModelSelectionRequired")
							}) : null
						]
					}) : null,
					state.conflicted ? (0, react_jsx_runtime.jsx)("p", {
						className: SubagentModelSelectionCard_module_css_default.conflict,
						role: "status",
						children: t("subagentModelSelectionConflict")
					}) : null
				]
			});
		}
		//#endregion
		//#region lib/types/client/WebSearchCard.js
		/**
		* Render the web-search card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function WebSearchCard(props) {
			const { t } = props;
			const state = props.useWebSearchCard((snapshot) => snapshot);
			const disabled = !state.writable;
			return (0, react_jsx_runtime.jsxs)(PluginCard, {
				t,
				titleKey: "webSearchTitle",
				descriptionKey: "webSearchDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					(0, react_jsx_runtime.jsx)(SecretField, {
						id: "plugin-config-web-search-key",
						label: t("webSearchApiKey"),
						hint: t("webSearchApiKeyHint"),
						disabled: !state.apiKeyWritable,
						text: state.apiKey.text,
						configured: state.apiKeyConfigured,
						stateLabel: state.apiKeyConfigured ? t("webSearchApiKeySet") : t("webSearchApiKeyUnset"),
						onEdit: (text) => {
							props.edit("apiKey", text);
						}
					}),
					(0, react_jsx_runtime.jsx)(ValueField, {
						id: "plugin-config-web-search-endpoint",
						label: t("webSearchBaseUrl"),
						hint: t("webSearchBaseUrlHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						disabled,
						...state.baseURL,
						onEdit: (text) => {
							props.edit("baseURL", text);
						},
						onReset: () => {
							props.resetField("baseURL");
						}
					}),
					(0, react_jsx_runtime.jsx)(ValueField, {
						id: "plugin-config-web-search-max-uses",
						label: t("webSearchMaxUses"),
						hint: t("webSearchMaxUsesHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.maxUses,
						onEdit: (text) => {
							props.edit("maxUses", text);
						},
						onReset: () => {
							props.resetField("maxUses");
						}
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/card-form.js
		/**
		* Shared form model behind every plugin card.
		*
		* A card stages what the user types and writes it only when they save. Each
		* settings write is a durable, revision-fenced document mutation, so a control
		* that committed as it settled turned one edit into a write the user never
		* asked for and could not preview; staged text makes what is on screen exactly
		* what a save would store.
		*
		* A field shows its effective value — the user layer over the composition
		* layer over the schema default — and whether the user layer carries it. That
		* presence, not a value comparison, is what marks a field overridden: an
		* override equal to the composition default is still an override.
		*/
		/**
		* A whole-number field. An empty draft clears the field; any other draft that
		* is not a finite number blocks the save.
		* @param field - field name inside the namespace section.
		* @returns the field's conversion spec.
		*/
		function numberField(field) {
			return {
				field,
				format: (value) => typeof value === "number" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					return Number.isFinite(parsed) ? {
						kind: "set",
						value: parsed
					} : void 0;
				}
			};
		}
		/**
		* A free-text field. An empty draft clears the field, so emptying the control
		* and saving is the same gesture as resetting it.
		* @param field - field name inside the namespace section.
		* @returns the field's conversion spec.
		*/
		function textField(field) {
			return {
				field,
				format: (value) => typeof value === "string" ? value : "",
				parse: (text) => {
					const trimmed = text.trim();
					return trimmed === "" ? { kind: "clear" } : {
						kind: "set",
						value: trimmed
					};
				}
			};
		}
		/**
		* Stages one card's edits over one settings namespace and writes them on save.
		*
		* The form publishes through a snapshot store because slot components read
		* through a snapshot selector, while both the scope and the local drafts
		* change underneath; every projection is rebuilt from the two together.
		*/
		var CardForm = class {
			scope;
			specs;
			secretSpecs;
			staged = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			saving = false;
			failed = false;
			/**
			* @param scope - the bound settings scope for this card's namespace.
			* @param specs - the section fields this card edits.
			* @param secrets - the card's write-only controls, written outside the section.
			*/
			constructor(scope, specs, secrets = []) {
				this.scope = scope;
				this.specs = new Map(specs.map((spec) => [spec.field, spec]));
				this.secretSpecs = new Map(secrets.map((spec) => [spec.field, spec]));
				scope.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Publish a projection of this form, rebuilt whenever the scope or a draft changes.
			* @param project - build the card's state from the form's current reads.
			* @returns the store the card's component reads through its bound selector.
			*/
			bind(project) {
				const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(project());
				this.listeners.add(() => {
					store.set(project());
				});
				return store;
			}
			/**
			* Read the card-level state: what the Host serves, and what a save would do.
			* @returns the form state every card shares.
			*/
			shell() {
				const snapshot = this.scope.getSnapshot();
				const plan = this.plan();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: plan.length > 0,
					invalid: plan.some((item) => item.run === void 0),
					saving: this.saving,
					failed: this.failed
				};
			}
			/**
			* Read one control's state.
			* @param field - field name of a section field or of a write-only control.
			* @returns the draft text, whether a save would leave an override, and whether it is invalid.
			*/
			field(field) {
				const staged = this.staged.get(field);
				if (this.secretSpecs.has(field)) return {
					text: staged?.text ?? "",
					overridden: false,
					invalid: false
				};
				const spec = this.spec(field);
				if (staged === void 0) return {
					text: spec.format(this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			/**
			* Build the edit, reset, save, and discard actions bound to this form.
			* @returns the actions a card's slot entry injects.
			*/
			actions() {
				return {
					edit: (field, text) => {
						this.stage(field, {
							text,
							clear: false
						});
					},
					resetField: (field) => {
						this.stage(field, {
							text: this.spec(field).format(this.baseValue(field)),
							clear: true
						});
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.publish();
					}
				};
			}
			/**
			* Write every staged edit, then re-seed from what the Host accepted.
			*
			* The Host is the only authority on whether a value was accepted — its
			* validators own the constraints no schema can express — so the outcome is
			* read back from the section rather than predicted here. A save that did not
			* land keeps its drafts, so the user can correct them instead of retyping.
			* @returns settlement after every write and the read-back.
			*/
			async save() {
				const plan = this.plan();
				const writes = plan.flatMap((item) => item.run === void 0 ? [] : [item.run]);
				if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				let landed = true;
				for (const write of writes) landed = await write() && landed;
				if (landed) this.staged.clear();
				this.saving = false;
				this.failed = !landed;
				this.publish();
			}
			/**
			* Every staged edit a save would write. An entry whose draft is not a value
			* its field accepts carries no write: the form is still dirty, and the save
			* refuses rather than dropping the edit.
			* @returns the planned writes, in the order the fields were staged.
			*/
			plan() {
				const plan = [];
				for (const [field, staged] of this.staged) {
					const secret = this.secretSpecs.get(field);
					if (secret !== void 0) {
						const value = staged.text.trim();
						if (value !== "") plan.push({
							field,
							run: () => secret.write(value)
						});
						continue;
					}
					const spec = this.spec(field);
					if (staged.clear) {
						if (this.stored(field)) plan.push({
							field,
							run: () => this.clear(field)
						});
						continue;
					}
					if (staged.text === spec.format(this.sectionValue(field))) continue;
					const write = spec.parse(staged.text);
					if (write === void 0) plan.push({
						field,
						run: void 0
					});
					else if (write.kind === "clear") plan.push({
						field,
						run: () => this.clear(field)
					});
					else plan.push({
						field,
						run: () => this.store(field, write.value)
					});
				}
				return plan;
			}
			async clear(field) {
				await this.scope.unset(field);
				return !this.stored(field);
			}
			async store(field, value) {
				await this.scope.set(field, value);
				return this.userLayer()?.[field] === value;
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				this.publish();
			}
			spec(field) {
				const spec = this.specs.get(field);
				if (spec === void 0) throw new Error(`plugin card has no field ${field}`);
				return spec;
			}
			snapshotOf() {
				return this.scope.getSnapshot();
			}
			sectionValue(field) {
				return this.snapshotOf().value?.[field];
			}
			baseValue(field) {
				return this.snapshotOf().base?.[field];
			}
			userLayer() {
				return this.snapshotOf().user;
			}
			stored(field) {
				const user = this.userLayer();
				return user !== void 0 && Object.hasOwn(user, field);
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region lib/types/client/agent-loop-card-controller.js
		/** The agent-loop card's staged form over the `agent-loop` settings namespace. */
		/**
		* Namespace of the agent loop's user-owned settings. Spelled here rather than
		* imported: a client package must not depend on a Host package.
		*/
		const AGENT_LOOP_NS = "agent-loop";
		/** Bridges the `agent-loop` scope onto the card's staged form. */
		var AgentLoopCardController = class {
			form;
			store;
			/** @param scope - the bound settings scope for the `agent-loop` namespace. */
			constructor(scope) {
				this.form = new CardForm(scope, [numberField("maxParallelToolCalls")]);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					maxParallelToolCalls: this.form.field("maxParallelToolCalls")
				};
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { agentLoopCard: this.store },
					...this.form.actions()
				};
			}
		};
		//#endregion
		//#region lib/types/client/bash-card-controller.js
		/** The shell card's staged form over the `bash` settings namespace. */
		/**
		* Namespace of the shell capability. Spelled here rather than imported: a
		* client package must not depend on a Host package, and the executor families
		* that own it spell the same value.
		*/
		const SHELL_NS = "shell";
		/** Bridges the `bash` scope onto the shell card's staged form. */
		var BashCardController = class {
			form;
			store;
			/** @param scope - the bound settings scope for the `bash` namespace. */
			constructor(scope) {
				this.form = new CardForm(scope, [numberField("timeoutMs"), numberField("maxOutputBytes")]);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					timeoutMs: this.form.field("timeoutMs"),
					maxOutputBytes: this.form.field("maxOutputBytes")
				};
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { bashCard: this.store },
					...this.form.actions()
				};
			}
		};
		//#endregion
		//#region lib/types/client/tab-store.js
		/**
		* The configurable-plugins tab's card list.
		*
		* The tab dispatches its slot by settings namespace, so what it renders is
		* the intersection of two ledgers: the namespaces the Host serves and the
		* cards registered into `settings.plugin.item`. A served namespace no card
		* claims renders nothing — another surface owns it, or this deployment ships
		* no browser half for it — and a card whose namespace the Host does not serve
		* is never dispatched, so a plugin this deployment did not compose leaves no
		* trace and does not count toward the empty line.
		*/
		/** Derives the served namespaces from the shared describe mirror and pairs them with the cards that claim them. */
		var ConfigurablePluginsTabController = class {
			describeFace;
			entries;
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				loaded: false,
				namespaces: []
			});
			disposed = false;
			unsubscribe;
			/**
			* @param describeFace - the shared mirror's describe face; its refreshes
			* (document commits, reconnects) are what keep the served set current.
			* @param entries - reads the cards currently registered into the section's slot.
			*/
			constructor(describeFace, entries) {
				this.describeFace = describeFace;
				this.entries = entries;
				this.unsubscribe = describeFace.subscribe(() => {
					this.publish();
				});
				describeFace.ensure();
				this.publish();
			}
			/** Republish after the slot ledger changed; a card registered late joins here. */
			refresh() {
				if (this.disposed) return;
				this.publish();
			}
			/** Stop publishing and stop following the mirror. */
			dispose() {
				this.disposed = true;
				this.unsubscribe();
			}
			/**
			* Build the face the tab's slot registration injects.
			* @returns the tab's snapshot source.
			*/
			inject() {
				return { hooks: { configurablePlugins: this.store } };
			}
			publish() {
				if (this.disposed) return;
				const mirrored = this.describeFace.getSnapshot();
				const loaded = mirrored.view !== void 0;
				const served = new Set(mirrored.view?.namespaces.map((view) => view.ns) ?? []);
				const namespaces = this.entries().flatMap((entry) => entry.options.key !== void 0 && served.has(entry.options.key) ? [entry.options.key] : []);
				const previous = this.store.getSnapshot();
				if (previous.loaded === loaded && previous.namespaces.length === namespaces.length && previous.namespaces.every((ns, index) => ns === namespaces[index])) return;
				this.store.set({
					loaded,
					namespaces
				});
			}
		};
		//#endregion
		//#region lib/types/client/subagent-model-selection-card-controller.js
		/** Staged editor for the Host-owned subagent model allowlist. */
		/** Namespace of the Host-owned subagent model-selection preference. */
		const SUBAGENT_MODEL_SELECTION_NS = "subagent-model-selection";
		/**
		* Stable identity for one exact route; callers resolve it by lookup and never parse it.
		* @param route - Provider/model route to identify.
		* @returns Opaque key for lookup within the card.
		*/
		function subagentModelKey(route) {
			return `${route.provider}\0${route.model}`;
		}
		/**
		* Join live adapter metadata with stored routes that remain removable after disappearance.
		* @param groups - Current model directory grouped by provider.
		* @param stored - Routes in the effective settings value.
		* @param selected - Opaque route keys selected in the current draft.
		* @returns Candidate rows for the card.
		*/
		function subagentModelCandidates(groups, stored, selected) {
			const storedByKey = new Map(stored.map((route) => [subagentModelKey(route), route]));
			const candidates = groups.flatMap((group) => group.models.map((model) => {
				const route = {
					provider: group.id,
					model: model.id
				};
				const key = subagentModelKey(route);
				storedByKey.delete(key);
				return {
					...route,
					key,
					providerName: group.name,
					modelName: model.name,
					available: true,
					selected: selected.has(key)
				};
			}));
			for (const route of storedByKey.values()) {
				const key = subagentModelKey(route);
				candidates.push({
					...route,
					key,
					providerName: route.provider,
					modelName: route.model,
					available: false,
					selected: selected.has(key)
				});
			}
			return candidates;
		}
		function sameRoutes(left, right) {
			if (left.length !== right.length) return false;
			const rightKeys = new Set(right.map(subagentModelKey));
			return left.every((route) => rightKeys.has(subagentModelKey(route)));
		}
		/** Bridges one settings scope and the live adapter directory onto a staged card. */
		var SubagentModelSelectionCardController = class {
			scope;
			ctx;
			catalogGroups = [];
			catalogPartial = false;
			catalogStatus = "idle";
			draftEnabled;
			draftRoutes;
			draftRevision;
			saving = false;
			failed = false;
			conflicted = false;
			disposed = false;
			saveGeneration = 0;
			catalogGeneration = 0;
			store;
			unsubscribe;
			/**
			* @param scope - bound `subagent-model-selection` settings scope.
			* @param ctx - the card plugin's context, whose `remote.session` namespace
			* answers the Host model catalog.
			*/
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = scope.subscribe(() => {
					if (!this.saving && this.draftRoutes !== void 0 && this.scope.getSnapshot().revision !== this.draftRevision) if (this.currentEnabled() === this.enabled() && sameRoutes(this.currentRoutes(), this.desiredRoutes())) this.clearDraft();
					else this.conflicted = true;
					if (this.enabled() && this.catalogStatus === "idle") this.loadCatalog();
					this.publish();
				});
				if (this.enabled() && this.catalogStatus === "idle") this.loadCatalog();
			}
			/** Stop observing settings and suppress late directory/write settlements. */
			dispose() {
				this.disposed = true;
				this.saveGeneration += 1;
				this.catalogGeneration += 1;
				this.unsubscribe();
			}
			/**
			* Build the renderer face for this card.
			* @returns The snapshot and staged card actions injected into the renderer.
			*/
			inject() {
				return {
					hooks: { subagentModelSelectionCard: this.store },
					toggleEnabled: () => {
						this.toggleEnabled();
					},
					toggleModel: (key) => {
						this.toggleModel(key);
					},
					retryCatalog: () => {
						this.loadCatalog();
					},
					save: () => {
						this.save();
					},
					discard: () => {
						this.discard();
					}
				};
			}
			currentRoutes() {
				return this.scope.getSnapshot().value?.allowedModels.map((route) => ({ ...route })) ?? [];
			}
			currentEnabled() {
				return this.scope.getSnapshot().value?.enabled ?? false;
			}
			selected() {
				return new Set(this.draftRoutes?.keys() ?? this.currentRoutes().map(subagentModelKey));
			}
			enabled() {
				return this.draftEnabled ?? this.currentEnabled();
			}
			beginDraft() {
				if (this.draftRoutes === void 0) {
					const snapshot = this.scope.getSnapshot();
					this.draftEnabled = snapshot.value?.enabled ?? false;
					this.draftRoutes = new Map(snapshot.value?.allowedModels.map((route) => [subagentModelKey(route), { ...route }]) ?? []);
					this.draftRevision = snapshot.revision;
				}
				return this.draftRoutes;
			}
			toggleEnabled() {
				const snapshot = this.scope.getSnapshot();
				if (this.disposed || snapshot.status !== "ready" || !snapshot.writable || this.saving) return;
				this.beginDraft();
				this.draftEnabled = !this.draftEnabled;
				this.failed = false;
				if (this.draftEnabled && this.catalogStatus === "idle") this.loadCatalog();
				this.publish();
			}
			toggleModel(key) {
				if (!this.enabled() || this.saving || !this.scope.getSnapshot().writable) return;
				const candidate = this.candidates().find((candidate) => candidate.key === key);
				if (candidate === void 0) return;
				const routes = this.beginDraft();
				if (routes.has(key)) routes.delete(key);
				else routes.set(key, {
					provider: candidate.provider,
					model: candidate.model
				});
				this.failed = false;
				this.publish();
			}
			clearDraft() {
				this.draftEnabled = void 0;
				this.draftRoutes = void 0;
				this.draftRevision = void 0;
				this.failed = false;
				this.conflicted = false;
			}
			discard() {
				if (this.saving) return;
				this.clearDraft();
				this.publish();
			}
			candidates() {
				const retained = new Map(this.currentRoutes().map((route) => [subagentModelKey(route), route]));
				for (const [key, route] of this.draftRoutes ?? []) retained.set(key, route);
				return subagentModelCandidates(this.catalogGroups, [...retained.values()], this.selected());
			}
			desiredRoutes() {
				return [...this.draftRoutes?.values() ?? this.currentRoutes()].map((route) => ({ ...route }));
			}
			async save() {
				const snapshot = this.scope.getSnapshot();
				const desiredEnabled = this.enabled();
				const desired = this.desiredRoutes();
				if (this.disposed || snapshot.status !== "ready" || !snapshot.writable || this.saving || this.currentEnabled() === desiredEnabled && sameRoutes(this.currentRoutes(), desired) || desiredEnabled && desired.length === 0) return;
				if (this.draftRoutes !== void 0 && snapshot.revision !== this.draftRevision) {
					this.conflicted = true;
					this.publish();
					return;
				}
				const generation = this.saveGeneration;
				this.saving = true;
				this.failed = false;
				this.conflicted = false;
				this.publish();
				await this.scope.mutate([{
					op: "set",
					path: ["enabled"],
					value: desiredEnabled
				}, {
					op: "set",
					path: ["allowedModels"],
					value: desired.map((route) => ({
						provider: route.provider,
						model: route.model
					}))
				}], this.draftRevision);
				if (generation !== this.saveGeneration) return;
				const landed = this.currentEnabled() === desiredEnabled && sameRoutes(this.currentRoutes(), desired);
				this.saving = false;
				this.failed = !landed;
				if (landed) this.clearDraft();
				this.publish();
			}
			/** Invalidate and reload model candidates after a Host model input changes. */
			refreshCatalog() {
				if (this.disposed) return;
				this.catalogGeneration += 1;
				this.catalogStatus = "idle";
				this.catalogPartial = false;
				if (this.enabled()) this.loadCatalog();
				else this.publish();
			}
			/** Drop Host-specific candidates and drafts, then reload after reconnecting. */
			resetConnection() {
				if (this.disposed) return;
				this.saveGeneration += 1;
				this.saving = false;
				this.clearDraft();
				this.catalogGroups = [];
				this.refreshCatalog();
			}
			async loadCatalog() {
				if (this.disposed || this.catalogStatus === "loading") return;
				const generation = this.catalogGeneration;
				this.catalogStatus = "loading";
				this.catalogPartial = false;
				this.publish();
				const response = await this.ctx.remote.session.modelCatalog();
				if (generation !== this.catalogGeneration) return;
				if (response.ok) {
					this.catalogGroups = response.value.groups;
					this.catalogPartial = response.value.failures.length > 0;
					this.catalogStatus = "ready";
				} else this.catalogStatus = "error";
				this.publish();
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				const current = this.currentRoutes();
				const desired = this.desiredRoutes();
				const enabled = this.enabled();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: this.currentEnabled() !== enabled || !sameRoutes(current, desired),
					invalid: enabled && desired.length === 0,
					saving: this.saving,
					failed: this.failed,
					enabled,
					candidates: this.candidates(),
					catalogStatus: this.catalogStatus,
					catalogPartial: this.catalogPartial,
					conflicted: this.conflicted
				};
			}
			publish() {
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region lib/types/client/web-search-card-controller.js
		/**
		* The web-search card's staged form over the `web-search-deepseek` settings
		* namespace.
		*
		* The key is the one control that does not live in the section: its literal
		* never rides a response, so the card learns only whether one is configured
		* and writes it through the credentials domain, addressed by the reference the
		* section names. It is still staged with the rest of the form, so one save
		* covers everything the card shows.
		*/
		/**
		* Namespace of the DeepSeek search provider. Spelled here rather than
		* imported: a client package must not depend on a Host package.
		*/
		const WEB_SEARCH_NS = "web-search-deepseek";
		/** Credential reference the provider resolves when the section names none. */
		const DEFAULT_API_KEY_REF = "DEEPSEEK_API_KEY";
		/** Form field the credential control stages under. */
		const API_KEY_FIELD = "apiKey";
		/** Bridges the `web-search-deepseek` scope and the credentials domain onto the card. */
		var WebSearchCardController = class {
			scope;
			ctx;
			form;
			store;
			credential = {
				ref: "",
				configured: false,
				writable: true
			};
			/**
			* @param scope - the bound settings scope for the `web-search-deepseek` namespace.
			* @param ctx - the card plugin's context, whose `remote.credentials` namespace
			* answers for the credential the section references.
			*/
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.form = new CardForm(scope, [textField("baseURL"), numberField("maxUses")], [{
					field: API_KEY_FIELD,
					write: (text) => this.writeKey(text)
				}]);
				this.store = this.form.bind(() => this.projection());
				scope.subscribe(() => {
					this.readCredential();
				});
				this.readCredential();
			}
			projection() {
				return {
					...this.form.shell(),
					baseURL: this.form.field("baseURL"),
					maxUses: this.form.field("maxUses"),
					apiKey: this.form.field(API_KEY_FIELD),
					apiKeyConfigured: this.credential.configured,
					apiKeyWritable: this.credential.writable
				};
			}
			/**
			* Ask the credentials domain about the reference the section currently names.
			*
			* The answer is stored with the reference it describes: `apiKeyEnv` can
			* change between the request and its response, and two reads can settle out
			* of order, so a response is published only while it still answers for the
			* reference in force.
			*/
			async readCredential() {
				const ref = refOf(this.scope.getSnapshot());
				if (ref !== this.credential.ref) {
					this.credential = {
						ref,
						configured: false,
						writable: true
					};
					this.store.set(this.projection());
				}
				const response = await this.ctx.remote.credentials.describe([ref]);
				if (!response.ok || ref !== refOf(this.scope.getSnapshot())) return;
				const view = response.value[ref];
				const next = {
					ref,
					configured: view?.configured ?? false,
					writable: view?.writable ?? true
				};
				if (next.configured === this.credential.configured && next.writable === this.credential.writable) return;
				this.credential = next;
				this.store.set(this.projection());
			}
			/**
			* Re-read after the Host reports a change to the reference this card watches.
			*
			* A key can be written from somewhere else — the Models page addresses the
			* same reference — and the settings section does not change when it is, so
			* without this the badge keeps reporting a state the Host already replaced.
			* @param ref - the reference the Host reports as changed.
			*/
			refreshCredential(ref) {
				if (ref !== this.credential.ref) return;
				this.readCredential();
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { webSearchCard: this.store },
					...this.form.actions()
				};
			}
			/**
			* Write the staged key, then re-read whether the Host now holds one.
			* @param value - the staged credential literal.
			* @returns whether the Host reports a configured credential afterwards.
			*/
			async writeKey(value) {
				await this.ctx.remote.credentials.set(refOf(this.scope.getSnapshot()), value);
				await this.readCredential();
				return this.credential.configured;
			}
		};
		/**
		* The credential reference the section names, or the provider's default.
		* @param snapshot - the current scope snapshot.
		* @returns the reference to address.
		*/
		function refOf(snapshot) {
			const declared = snapshot.value?.apiKeyEnv;
			return declared !== void 0 && declared.length > 0 ? declared : DEFAULT_API_KEY_REF;
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Locale bundles for the plugin configuration section and its plugin cards. */
		/** English copy. */
		const en = {
			nav: "Plugins",
			title: "Plugins",
			intro: "Configure and inspect the plugins installed in this deployment.",
			tabs: "Plugin views",
			configurableTab: "Plugin configuration",
			empty: "This deployment exposes no plugin settings.",
			overridden: "Overridden",
			reset: "Reset to default",
			readOnly: "This deployment stores settings read-only.",
			expand: "Show settings",
			collapse: "Hide settings",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			unsaved: "Unsaved",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			invalidNumber: "Enter a number, or leave blank to use the default.",
			bashTitle: "Shell",
			bashDescription: "Limits every command the agent runs.",
			bashTimeoutMs: "Command timeout (ms)",
			bashTimeoutMsHint: "How long one command may run before it is terminated.",
			bashMaxOutputBytes: "Output cap per stream (bytes)",
			bashMaxOutputBytesHint: "Output beyond this spills to a temporary file rather than being lost.",
			agentLoopTitle: "Agent loop",
			agentLoopDescription: "How the agent dispatches tool calls.",
			agentLoopMaxParallel: "Parallel tool calls",
			agentLoopMaxParallelHint: "Upper bound on parallel-safe calls running at once within one step.",
			webSearchTitle: "Web search",
			webSearchDescription: "The DeepSeek search provider.",
			webSearchApiKey: "API key",
			webSearchApiKeyHint: "Stored outside the settings file. Leave blank to keep the current key.",
			webSearchApiKeySet: "A key is configured.",
			webSearchApiKeyUnset: "No key is configured; search is unavailable until one is.",
			webSearchBaseUrl: "Endpoint",
			webSearchBaseUrlHint: "Leave blank to use the provider default.",
			webSearchMaxUses: "Max searches per request",
			webSearchMaxUsesHint: "How many times one request may search before it must answer.",
			subagentModelSelectionTitle: "Subagent",
			subagentModelSelectionDescription: "Control which models agents may choose for subagents.",
			subagentModelSelectionToggle: "Allow agents to choose models for subagents",
			subagentModelSelectionChoose: "When enabled, agents can choose a provider, model, and reasoning effort for each subagent from the authorized models below. Applies only to new sessions.",
			subagentModelSelectionAllowed: "Models agents may choose",
			subagentModelSelectionLoading: "Loading models…",
			subagentModelSelectionLoadFailed: "Models could not be loaded.",
			subagentModelSelectionRetry: "Retry",
			subagentModelSelectionPartial: "Some model providers could not be loaded; saved choices remain removable.",
			subagentModelSelectionUnavailable: "Currently unavailable",
			subagentModelSelectionUnavailableGroup: "Saved but currently unavailable",
			subagentModelSelectionEmpty: "No model provider currently advertises a model.",
			subagentModelSelectionRequired: "Select at least one model before saving.",
			subagentModelSelectionConflict: "Settings changed elsewhere. Discard your draft and try again.",
			subagentModelSelectionOff: "Subagents use configured defaults or inherit the parent agent's model. Saved model choices are retained."
		};
		/** Simplified Chinese copy. */
		const zh = {
			nav: "插件",
			title: "插件",
			intro: "配置和查看本部署已安装的插件。",
			tabs: "插件视图",
			configurableTab: "插件配置",
			empty: "本部署没有开放任何插件设置。",
			overridden: "已覆盖",
			reset: "恢复默认",
			readOnly: "本部署的设置为只读。",
			expand: "展开设置",
			collapse: "收起设置",
			save: "保存",
			saving: "保存中…",
			discard: "放弃修改",
			unsaved: "未保存",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			invalidNumber: "请填数字；留空表示使用默认值。",
			bashTitle: "终端",
			bashDescription: "限制 agent 运行的每一条命令。",
			bashTimeoutMs: "命令超时（毫秒）",
			bashTimeoutMsHint: "单条命令允许运行多久，超时即终止。",
			bashMaxOutputBytes: "单流输出上限（字节）",
			bashMaxOutputBytesHint: "超出部分会转存到临时文件，而不是被丢弃。",
			agentLoopTitle: "Agent 循环",
			agentLoopDescription: "Agent 如何派发工具调用。",
			agentLoopMaxParallel: "并行工具调用数",
			agentLoopMaxParallelHint: "同一步内最多同时运行多少个可并行的调用。",
			webSearchTitle: "网页搜索",
			webSearchDescription: "DeepSeek 搜索提供方。",
			webSearchApiKey: "API Key",
			webSearchApiKeyHint: "不写入设置文件。留空表示保持当前密钥。",
			webSearchApiKeySet: "已配置密钥。",
			webSearchApiKeyUnset: "未配置密钥；配置之前搜索不可用。",
			webSearchBaseUrl: "接口地址",
			webSearchBaseUrlHint: "留空则使用提供方默认地址。",
			webSearchMaxUses: "单次请求最多搜索次数",
			webSearchMaxUsesHint: "一次请求在必须作答前最多可以搜索多少次。",
			subagentModelSelectionTitle: "Subagent",
			subagentModelSelectionDescription: "控制 Agent 为 Subagent 选择模型的权限。",
			subagentModelSelectionToggle: "允许 Agent 为 Subagent 选择模型",
			subagentModelSelectionChoose: "开启后，Agent 可以从下方授权模型中，为每个 Subagent 选择提供方、模型和推理强度。仅影响新会话。",
			subagentModelSelectionAllowed: "Agent 可选择的模型",
			subagentModelSelectionLoading: "正在加载模型…",
			subagentModelSelectionLoadFailed: "无法加载模型。",
			subagentModelSelectionRetry: "重试",
			subagentModelSelectionPartial: "部分模型提供方暂时无法加载；已保存的选择仍可移除。",
			subagentModelSelectionUnavailable: "当前不可用",
			subagentModelSelectionUnavailableGroup: "已保存但当前不可用",
			subagentModelSelectionEmpty: "当前没有模型提供方公布模型。",
			subagentModelSelectionRequired: "保存前请至少选择一个模型。",
			subagentModelSelectionConflict: "设置已在其他位置更新。请放弃修改后重试。",
			subagentModelSelectionOff: "关闭后，Subagent 使用配置的默认模型或继承父 Agent 的模型；已选模型会保留。"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Plugins settings surface, browser half — one section whose feature-owned
		* tabs include configurable Host plugin cards and read-only inventory.
		*
		* The section declares `settings.plugins.tab`; its own `configurable` tab then
		* declares `settings.plugin.item` and renders whatever cards were registered
		* into it. The cards this package ships are the host-plane sections the
		* deployment already exposes; each binds its namespace through the client
		* settings scope, which keeps them unaware of one another and of other tabs.
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.plugins";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.credentials",
			"remote.session",
			"settingsScope"
		];
		/**
		* Mount the plugin configuration section and the cards this package ships.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-settings-plugins: section dictionaries");
			const bash = new BashCardController(ctx.settingsScope.bind({ namespace: SHELL_NS }));
			const agentLoop = new AgentLoopCardController(ctx.settingsScope.bind({ namespace: AGENT_LOOP_NS }));
			const webSearch = new WebSearchCardController(ctx.settingsScope.bind({ namespace: WEB_SEARCH_NS }), ctx);
			const subagentModelSelection = new SubagentModelSelectionCardController(ctx.settingsScope.bind({ namespace: SUBAGENT_MODEL_SELECTION_NS }), ctx);
			ctx.effect(() => ctx.remote.$on("credentials/reference-updated", (ref) => {
				webSearch.refreshCredential(ref);
			}), "ui-settings-plugins: credential invalidations");
			ctx.effect(() => ctx.remote.$on("llm/adapters-updated", () => {
				subagentModelSelection.refreshCatalog();
			}), "ui-settings-plugins: subagent adapter invalidations");
			ctx.effect(() => ctx.remote.$on("settings/document-updated", () => {
				subagentModelSelection.refreshCatalog();
			}), "ui-settings-plugins: subagent settings invalidations");
			ctx.effect(() => ctx.on("connection/reset", () => {
				subagentModelSelection.resetConnection();
			}), "ui-settings-plugins: subagent connection generation");
			ctx.effect(() => () => {
				subagentModelSelection.dispose();
			}, "ui-settings-plugins: subagent preference");
			const configurable = new ConfigurablePluginsTabController(ctx.settingsScope.describe(), () => ctx.slots.entries("settings.plugin.item"));
			ctx.effect(() => () => {
				configurable.dispose();
			}, "ui-settings-plugins: tab directory");
			ctx.effect(() => ctx.slots.subscribe("settings.plugin.item", () => {
				configurable.refresh();
			}), "ui-settings-plugins: card ledger");
			let tabsVersion = -1;
			let tabsRevision = -1;
			let tabs = [];
			const sectionInjected = () => ({ hooks: { tabs: {
				getSnapshot: () => {
					const version = ctx.slots.getVersion("settings.plugins.tab");
					const revision = ctx.locale.getSnapshot().revision;
					if (version !== tabsVersion || revision !== tabsRevision) {
						tabsVersion = version;
						tabsRevision = revision;
						tabs = ctx.slots.entries("settings.plugins.tab").map((entry) => ({
							/* v8 ignore next -- list-slot registration requires id */
							id: entry.options.id ?? "",
							order: entry.options.order ?? 0,
							label: (0, _deepseek_ai_dsh_client_ui_slots.resolveSlotLabel)(entry.options.label) ?? ""
						})).sort((a, b) => a.order - b.order);
					}
					return tabs;
				},
				subscribe: (listener) => {
					const offLedger = ctx.slots.subscribe("settings.plugins.tab", listener);
					const offLocale = ctx.locale.subscribe(listener);
					return () => {
						offLedger();
						offLocale();
					};
				}
			} } });
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "plugins",
				order: 15,
				label: () => t("nav"),
				locale: NS,
				inject: sectionInjected,
				children: { "settings.plugins.tab": {
					kind: "list",
					scope: "root"
				} }
			}, PluginsSettingsSection));
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "configurable",
				order: 0,
				label: () => t("configurableTab"),
				locale: NS,
				inject: () => configurable.inject(),
				children: { "settings.plugin.item": {
					kind: "keyed",
					scope: "root"
				} }
			}, ConfigurablePluginsTab));
			ctx.slots.inject("settings.plugin.item", function* () {
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: SHELL_NS,
					locale: NS,
					inject: () => bash.inject()
				}, BashCard);
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: AGENT_LOOP_NS,
					locale: NS,
					inject: () => agentLoop.inject()
				}, AgentLoopCard);
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: SUBAGENT_MODEL_SELECTION_NS,
					locale: NS,
					inject: () => subagentModelSelection.inject()
				}, SubagentModelSelectionCard);
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: WEB_SEARCH_NS,
					locale: NS,
					inject: () => webSearch.inject()
				}, WebSearchCard);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
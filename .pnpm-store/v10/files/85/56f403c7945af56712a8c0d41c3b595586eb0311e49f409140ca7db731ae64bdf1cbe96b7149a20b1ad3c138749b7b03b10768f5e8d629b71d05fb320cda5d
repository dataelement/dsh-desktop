window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-cordis",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		//#region lib/types/client/card-model.js
		/** Replay-stable view models for Cordis lifecycle Tool calls. */
		function firstLine(text) {
			const newline = text.indexOf("\n");
			return newline === -1 ? text : text.slice(0, newline);
		}
		function stringAt(source, key) {
			const value = source[key];
			return typeof value === "string" && value !== "" ? value : null;
		}
		function objectAt(source, key) {
			const value = source[key];
			return typeof value === "object" && value !== null ? value : null;
		}
		function parseArgs(argsRaw) {
			try {
				const parsed = JSON.parse(argsRaw);
				return typeof parsed === "object" && parsed !== null ? parsed : null;
			} catch {
				return null;
			}
		}
		function resultText(block) {
			const text = block.content.map((item) => item.type === "text" ? item.text : JSON.stringify(item, null, 2)).join("\n");
			if (text !== "") return text;
			return block.error === void 0 ? null : `${block.error.name}: ${block.error.code}`;
		}
		function stateOf(block) {
			if (!("kind" in block)) return "running";
			if (block.error?.code === "interrupted") return "stopped";
			return block.isError ? "error" : "ok";
		}
		function metaObject(block) {
			if (!("kind" in block) || block.isError || typeof block.meta !== "object" || block.meta === null) return null;
			return block.meta;
		}
		/**
		* Derive one Define card from its frozen call/result slice.
		* @param block - active or settled tool-call block.
		* @returns normalized Define card fields.
		*/
		function cordisDefineCard(block) {
			const settled = "kind" in block;
			const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
			const args = parseArgs(argsRaw);
			const code = args === null ? null : objectAt(args, "code");
			const state = stateOf(block);
			const output = settled ? resultText(block) : null;
			const meta = metaObject(block);
			const rawName = argsRaw === "" ? null : firstLine(argsRaw);
			return {
				pluginId: meta === null ? null : stringAt(meta, "pluginId"),
				packageId: meta === null ? null : stringAt(meta, "packageId"),
				name: args === null ? rawName : stringAt(args, "name") ?? rawName,
				purpose: args === null ? null : stringAt(args, "purpose"),
				hostCode: code === null ? null : stringAt(code, "host"),
				clientCode: code === null ? null : stringAt(code, "client"),
				output,
				errorSummary: state === "error" && output !== null ? firstLine(output) : null,
				state
			};
		}
		/**
		* Derive one Run card and its successful activation metadata.
		* @param block - active or settled tool-call block.
		* @returns normalized Run card fields.
		*/
		function cordisRunCard(block) {
			const settled = "kind" in block;
			const args = parseArgs((settled ? block.call?.argsRaw : block.argsRaw) ?? "");
			const meta = metaObject(block);
			const state = stateOf(block);
			const output = settled ? resultText(block) : null;
			const rawMode = args === null ? null : stringAt(args, "mode");
			const argsPluginId = args === null ? null : stringAt(args, "pluginId");
			const argsPackageId = args === null ? null : stringAt(args, "packageId");
			return {
				pluginId: meta === null ? argsPluginId : stringAt(meta, "pluginId") ?? argsPluginId,
				packageId: meta === null ? argsPackageId : stringAt(meta, "packageId") ?? argsPackageId,
				pluginRunId: meta === null ? null : stringAt(meta, "pluginRunId"),
				mode: rawMode === "run" || rawMode === "update" ? rawMode : null,
				seq: settled ? block.seq : null,
				output,
				errorSummary: state === "error" && output !== null ? firstLine(output) : null,
				state
			};
		}
		/**
		* Derive one Stop or Remove card from its frozen call/result slice.
		* @param block - active or settled tool-call block.
		* @returns normalized lifecycle-action card fields.
		*/
		function cordisActionCard(block) {
			const settled = "kind" in block;
			const args = parseArgs((settled ? block.call?.argsRaw : block.argsRaw) ?? "");
			const state = stateOf(block);
			const output = settled ? resultText(block) : null;
			return {
				pluginId: args === null ? null : stringAt(args, "pluginId") ?? stringAt(args, "id"),
				output,
				errorSummary: state === "error" && output !== null ? firstLine(output) : null,
				state
			};
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/extensions/ui-cordis/src/client/CordisRunRow.module.css.mjs
		const css$2 = ".cvtE3a_card{flex-direction:column;gap:8px;display:flex}.cvtE3a_row{align-items:center;min-height:32px;display:flex}.cvtE3a_icon{color:var(--dsw-alias-state-business-primary);flex:none;margin-right:8px;display:inline-flex}.cvtE3a_title{color:var(--dsw-alias-state-business-primary);flex:none;font-size:14px;font-weight:500;line-height:24px}.cvtE3a_separator{corner-shape:round;background:var(--dsw-alias-state-business-primary);border-radius:50%;flex:none;width:2px;height:2px;margin:0 8px}.cvtE3a_summary,.cvtE3a_error{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;line-height:24px;overflow:hidden}.cvtE3a_error{color:var(--dsw-alias-state-error-primary)}.cvtE3a_status{color:var(--dsw-alias-label-caption);flex:none;margin-left:8px;font-size:12px;line-height:24px}.cvtE3a_card[data-cordis-status=awaiting-approval] .cvtE3a_status,.cvtE3a_card[data-cordis-status=client-pending] .cvtE3a_status{color:var(--dsw-alias-state-warn-label)}.cvtE3a_card[data-cordis-status=running] .cvtE3a_status{color:var(--dsw-alias-state-success-primary)}.cvtE3a_card[data-cordis-status=failed] .cvtE3a_status{color:var(--dsw-alias-state-error-primary)}.cvtE3a_inspect{corner-shape:round;width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;opacity:0;background:0 0;border:none;border-radius:999px;justify-content:center;align-items:center;margin-left:4px;padding:0;display:inline-flex}.cvtE3a_card:hover .cvtE3a_inspect,.cvtE3a_inspect:focus-visible{opacity:1}.cvtE3a_inspect:hover{background:var(--dsw-alias-interactive-bg-hover)}.cvtE3a_message{background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-tertiary);border-radius:8px;padding:8px 12px;font-size:12px;line-height:18px}.cvtE3a_business{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-base);border-radius:12px;min-width:0;overflow:hidden}.cvtE3a_output{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-markdown-code-block-small);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:8px;margin:0;padding:10px 12px;overflow:auto}.cvtE3a_business .cvtE3a_output{border:none;border-radius:0}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-cordis/CordisRunRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-cordis";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var CordisRunRow_module_css_default = {
			"business": "cvtE3a_business",
			"card": "cvtE3a_card",
			"error": "cvtE3a_error",
			"icon": "cvtE3a_icon",
			"inspect": "cvtE3a_inspect",
			"message": "cvtE3a_message",
			"output": "cvtE3a_output",
			"row": "cvtE3a_row",
			"separator": "cvtE3a_separator",
			"status": "cvtE3a_status",
			"summary": "cvtE3a_summary",
			"title": "cvtE3a_title"
		};
		//#endregion
		//#region lib/types/client/CordisActionRow.js
		/** Localized cards for `cordis_stop` and `cordis_undefine`. */
		/** Render one Stop or Remove call with Cordis-owned localized copy. */
		function CordisActionRow({ callId, toolName, block, inspect, t }) {
			const card = cordisActionCard(block);
			const remove = toolName === "cordis_undefine";
			const summary = card.errorSummary ?? card.pluginId ?? callId;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: CordisRunRow_module_css_default.card,
				"data-tool": toolName,
				"data-state": card.state,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: CordisRunRow_module_css_default.row,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: CordisRunRow_module_css_default.icon,
							children: card.state === "error" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }) : card.state === "stopped" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" }) : remove ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFill16, { size: 14 })
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: CordisRunRow_module_css_default.title,
							children: t(remove ? "row.removeTitle" : "row.stopTitle")
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: CordisRunRow_module_css_default.separator,
							"aria-hidden": true
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: card.errorSummary === null ? CordisRunRow_module_css_default.summary : CordisRunRow_module_css_default.error,
							children: summary
						}),
						inspect !== void 0 && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: CordisRunRow_module_css_default.inspect,
							"aria-label": t("action.inspect"),
							onClick: inspect,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {})
						})
					]
				}), card.output !== null && (0, react_jsx_runtime.jsx)("pre", {
					className: CordisRunRow_module_css_default.output,
					children: card.output
				})]
			});
		}
		//#endregion
		//#region lib/types/client/status.js
		/** Shared status derivation over Host inventory and this page's Client live set. */
		/**
		* Locate one immutable Package inside a Plugin row.
		* @param row - owning Plugin inventory row.
		* @param packageId - immutable Package identity to locate.
		* @returns the matching Package metadata, or `undefined` when absent.
		*/
		function packageOf(row, packageId) {
			return row.packages.find((pkg) => pkg.packageId === packageId);
		}
		/**
		* Derive the visible state of one Package.
		* @param row - owning Plugin inventory row.
		* @param packageId - Package being described.
		* @param loaded - Client activations loaded in this page.
		* @returns idle, Host-running/Client-pending, or fully running.
		*/
		function cordisVisibleStatus(row, packageId, loaded) {
			const run = row.activeRun;
			if (run === void 0 || run.packageId !== packageId) return "idle";
			if (packageOf(row, packageId)?.hasClientHalf !== true) return "running";
			return loaded.some((live) => live.pluginId === row.pluginId && live.packageId === packageId && live.pluginRunId === run.pluginRunId) ? "running" : "client-pending";
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/extensions/ui-cordis/src/client/CordisDefineRow.module.css.mjs
		const css$1 = ".gNWCoW_card{flex-direction:column;display:flex}.gNWCoW_card .gNWCoW_title,.gNWCoW_card .gNWCoW_chevron{color:var(--dsw-alias-state-business-primary)}.gNWCoW_title{flex:none;font-size:14px;font-weight:500;line-height:24px}.gNWCoW_row{gap:0}.gNWCoW_separator{background:var(--dsw-alias-state-business-primary);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.gNWCoW_name{text-overflow:ellipsis;white-space:nowrap;max-width:40%;color:var(--dsw-alias-label-secondary);flex:none;font-size:14px;line-height:24px;overflow:hidden}.gNWCoW_purpose{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;margin-left:8px;font-size:13px;line-height:24px;overflow:hidden}.gNWCoW_errorSummary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-state-error-primary);flex:auto;font-size:14px;line-height:24px;overflow:hidden}.gNWCoW_requestError{text-overflow:ellipsis;white-space:nowrap;max-width:40%;color:var(--dsw-alias-state-error-primary);flex:none;margin-left:8px;font-size:12px;line-height:24px;overflow:hidden}.gNWCoW_readout{flex:none;align-items:center;margin-left:8px;display:inline-flex}.gNWCoW_panelHint{color:var(--dsw-alias-label-caption);margin:4px 0 2px 4px;font-size:11px;line-height:16px}.gNWCoW_statusLabel{color:var(--dsw-alias-label-caption);font-size:12px;line-height:24px}.gNWCoW_approvalPrompt{text-overflow:ellipsis;white-space:nowrap;max-width:40%;color:var(--dsw-alias-label-secondary);flex:none;margin-left:8px;font-size:12px;line-height:24px;overflow:hidden}.gNWCoW_notice{text-overflow:ellipsis;white-space:nowrap;max-width:40%;color:var(--dsw-alias-label-caption);flex:none;margin-left:8px;font-size:12px;line-height:24px;overflow:hidden}.gNWCoW_switch{height:22px;padding:0 8px;font-size:12px}.gNWCoW_card[data-terminal] .gNWCoW_title,.gNWCoW_card[data-terminal] .gNWCoW_name,.gNWCoW_card[data-terminal] .gNWCoW_purpose,.gNWCoW_card[data-terminal] .gNWCoW_statusLabel{color:var(--dsw-alias-label-caption)}.gNWCoW_card[data-terminal] .gNWCoW_separator{background:var(--dsw-alias-label-caption)}.gNWCoW_bodyWrap{flex-direction:column;display:flex}.gNWCoW_sourceCard{flex-direction:column;margin:4px 0 4px 4px;display:flex}.gNWCoW_sourceTabs{border-bottom:.5px solid var(--dsw-alias-border-l2);height:32px;display:flex}.gNWCoW_sourceTab{color:var(--dsw-alias-label-tertiary);cursor:pointer;font:var(--dsw-font-xs-13);background:0 0;border:0;padding:0 10px;position:relative}.gNWCoW_sourceTab:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.gNWCoW_sourceTab:disabled{cursor:default;opacity:.4}.gNWCoW_sourceTabActive{color:var(--dsw-alias-state-business-primary)}.gNWCoW_sourceTabActive:after{background:var(--dsw-alias-state-business-primary);content:\"\";border-radius:1px 1px 0 0;height:2px;position:absolute;bottom:0;left:10px;right:10px}.gNWCoW_sourceTab:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}.gNWCoW_sourcePanel{max-height:260px;overflow:auto}.gNWCoW_sourceCode{margin:0}.gNWCoW_codeSection{flex-direction:column;max-height:260px;margin:4px 0 4px 4px;display:flex;overflow:auto}.gNWCoW_sectionLabel{color:var(--dsw-alias-label-caption);text-transform:uppercase;letter-spacing:.04em;flex:none;padding:2px 0;font-size:11px;font-weight:500;line-height:16px}.gNWCoW_output{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);white-space:pre-wrap;overflow-wrap:anywhere;font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-secondary);border-radius:8px;margin:0;padding:8px 10px}.gNWCoW_output[data-error]{color:var(--dsw-alias-state-error-primary)}.gNWCoW_inspectButton{border:.5px solid var(--dsw-alias-border-l4);corner-shape:round;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;border-radius:999px;align-self:flex-start;align-items:center;gap:4px;margin:4px 0 2px 4px;padding:2px 8px;font-size:11px;line-height:16px;transition:opacity .1s;display:inline-flex}.gNWCoW_card:hover .gNWCoW_inspectButton,.gNWCoW_inspectButton:focus-visible{opacity:1}.gNWCoW_inspectButton:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.gNWCoW_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:reduce){.gNWCoW_inspectButton{transition:none}}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-cordis/CordisDefineRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-cordis";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var CordisDefineRow_module_css_default = {
			"approvalPrompt": "gNWCoW_approvalPrompt",
			"bodyWrap": "gNWCoW_bodyWrap",
			"card": "gNWCoW_card",
			"chevron": "gNWCoW_chevron",
			"codeSection": "gNWCoW_codeSection",
			"errorSummary": "gNWCoW_errorSummary",
			"inspectButton": "gNWCoW_inspectButton",
			"name": "gNWCoW_name",
			"notice": "gNWCoW_notice",
			"output": "gNWCoW_output",
			"panelHint": "gNWCoW_panelHint",
			"purpose": "gNWCoW_purpose",
			"readout": "gNWCoW_readout",
			"requestError": "gNWCoW_requestError",
			"row": "gNWCoW_row",
			"sectionLabel": "gNWCoW_sectionLabel",
			"separator": "gNWCoW_separator",
			"sourceCard": "gNWCoW_sourceCard",
			"sourceCode": "gNWCoW_sourceCode",
			"sourcePanel": "gNWCoW_sourcePanel",
			"sourceTab": "gNWCoW_sourceTab",
			"sourceTabActive": "gNWCoW_sourceTabActive",
			"sourceTabs": "gNWCoW_sourceTabs",
			"statusLabel": "gNWCoW_statusLabel",
			"switch": "gNWCoW_switch",
			"title": "gNWCoW_title",
			"visuallyHidden": "gNWCoW_visuallyHidden"
		};
		//#endregion
		//#region lib/types/client/CordisDefineRow.js
		/** Read-only `cordis_define` card with Host and Client source tabs. */
		const READING_LABELS$1 = {
			idle: "status.idle",
			"client-pending": "status.clientPending",
			running: "status.running",
			removed: "status.removed"
		};
		function stateStatus(state) {
			switch (state) {
				case "running": return "a11y.defining";
				case "error": return "a11y.failed";
				case "stopped": return "a11y.stopped";
				default: return null;
			}
		}
		function leadingFor(state) {
			switch (state) {
				case "error": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
				case "stopped": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
				default: return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 });
			}
		}
		/** Render one immutable Package definition. */
		function CordisDefineRow({ callId, block, inspect, useInventory, useLoaded, t }) {
			const card = cordisDefineCard(block);
			const inventory = useInventory((snapshot) => snapshot);
			const loaded = useLoaded((snapshot) => snapshot);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [selectedSource, setSelectedSource] = (0, react.useState)(card.clientCode !== null ? "client" : "host");
			const sourcePanelId = (0, react.useId)();
			const row = card.pluginId === null ? void 0 : inventory.rows.find((candidate) => candidate.pluginId === card.pluginId);
			const reading = card.pluginId !== null && inventory.removed.has(card.pluginId) ? "removed" : row !== void 0 && card.packageId !== null ? cordisVisibleStatus(row, card.packageId, loaded) : "idle";
			const name = card.name ?? callId;
			const expandable = card.hostCode !== null || card.clientCode !== null || card.output !== null;
			const open = expanded && expandable;
			const a11yState = stateStatus(card.state);
			const hasSource = card.clientCode !== null || card.hostCode !== null;
			const activeSource = selectedSource === "client" && card.clientCode !== null ? "client" : selectedSource === "host" && card.hostCode !== null ? "host" : card.clientCode !== null ? "client" : "host";
			const activeCode = activeSource === "client" ? card.clientCode : card.hostCode;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: CordisDefineRow_module_css_default.card,
				"data-tool": "cordis_define",
				"data-state": card.state,
				"data-terminal": reading === "removed" || void 0,
				"data-cordis-plugin-id": card.pluginId ?? void 0,
				"data-cordis-package-id": card.packageId ?? void 0,
				"data-cordis-status": reading,
				children: [a11yState !== null && (0, react_jsx_runtime.jsx)("span", {
					className: CordisDefineRow_module_css_default.visuallyHidden,
					children: t(a11yState)
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					rowClassName: CordisDefineRow_module_css_default.row,
					titleClassName: CordisDefineRow_module_css_default.title,
					chevronClassName: CordisDefineRow_module_css_default.chevron,
					icon: leadingFor(card.state),
					title: t("row.defineTitle"),
					open,
					expandable,
					expandOnRowClick: true,
					keepContentWhenOpen: true,
					onToggle: () => {
						setExpanded((value) => !value);
					},
					collapsedContent: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: CordisDefineRow_module_css_default.separator,
							"aria-hidden": true
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: card.errorSummary === null ? CordisDefineRow_module_css_default.name : CordisDefineRow_module_css_default.errorSummary,
							children: card.errorSummary ?? name
						}),
						card.errorSummary === null && (0, react_jsx_runtime.jsx)("span", {
							className: CordisDefineRow_module_css_default.purpose,
							children: card.purpose ?? t("purpose.missing")
						}),
						card.pluginId !== null && (0, react_jsx_runtime.jsx)("span", {
							className: CordisDefineRow_module_css_default.readout,
							children: (0, react_jsx_runtime.jsx)("span", {
								className: CordisDefineRow_module_css_default.statusLabel,
								children: t(READING_LABELS$1[reading])
							})
						})
					] }),
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: CordisDefineRow_module_css_default.bodyWrap,
						children: [
							hasSource && activeCode !== null && (0, react_jsx_runtime.jsxs)("section", {
								className: CordisDefineRow_module_css_default.sourceCard,
								children: [(0, react_jsx_runtime.jsx)("div", {
									className: CordisDefineRow_module_css_default.sourceTabs,
									role: "tablist",
									"aria-label": t("body.source"),
									children: ["client", "host"].map((source) => {
										const available = source === "client" ? card.clientCode !== null : card.hostCode !== null;
										return (0, react_jsx_runtime.jsx)("button", {
											id: `${sourcePanelId}-${source}`,
											type: "button",
											role: "tab",
											"aria-controls": sourcePanelId,
											"aria-selected": activeSource === source,
											className: activeSource === source ? `${CordisDefineRow_module_css_default.sourceTab} ${CordisDefineRow_module_css_default.sourceTabActive}` : CordisDefineRow_module_css_default.sourceTab,
											disabled: !available,
											onClick: () => {
												setSelectedSource(source);
											},
											children: t(source === "client" ? "body.clientCode" : "body.hostCode")
										}, source);
									})
								}), (0, react_jsx_runtime.jsx)("div", {
									id: sourcePanelId,
									className: CordisDefineRow_module_css_default.sourcePanel,
									role: "tabpanel",
									"aria-labelledby": `${sourcePanelId}-${activeSource}`,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.CodeBlock, {
										code: activeCode,
										lang: "javascript",
										copyLabel: t("body.copy"),
										copiedLabel: t("body.copied"),
										className: CordisDefineRow_module_css_default.sourceCode
									})
								})]
							}),
							card.output !== null && (0, react_jsx_runtime.jsxs)("section", {
								className: CordisDefineRow_module_css_default.codeSection,
								children: [(0, react_jsx_runtime.jsx)("div", {
									className: CordisDefineRow_module_css_default.sectionLabel,
									children: t("body.output")
								}), (0, react_jsx_runtime.jsx)("pre", {
									className: CordisDefineRow_module_css_default.output,
									"data-error": card.state === "error" || void 0,
									children: card.output
								})]
							}),
							card.pluginId !== null && (0, react_jsx_runtime.jsx)("div", {
								className: CordisDefineRow_module_css_default.panelHint,
								children: t("panel.hint")
							}),
							inspect !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: CordisDefineRow_module_css_default.inspectButton,
								onClick: inspect,
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {}), t("action.inspect")]
							})
						]
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/run-card-index.js
		/** Session-local ownership index for Package business views on `cordis_run` cards. */
		function createStore() {
			const pointers = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			let cache;
			return {
				getSnapshot: () => cache ??= new Map(pointers),
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				observe: (pointer) => {
					const current = pointers.get(pointer.key);
					if (current !== void 0 && current.seq >= pointer.seq) return;
					pointers.set(pointer.key, pointer);
					cache = void 0;
					for (const listener of [...listeners]) listener();
				}
			};
		}
		/** Page-lifetime registry that gives all cards of one session the same Store. */
		var CordisRunCardRegistry = class {
			sessions = /* @__PURE__ */ new Map();
			/**
			* Return the persistent page-local Store for a session.
			* @param sessionId - session whose cards share supersession state.
			* @returns the page-local Store retained for that session.
			*/
			forSession(sessionId) {
				let store = this.sessions.get(sessionId);
				if (store === void 0) {
					store = createStore();
					this.sessions.set(sessionId, store);
				}
				return store;
			}
		};
		/**
		* Build the Package business-view key shared by registrations and Run cards.
		* @param pluginId - stable Plugin identity.
		* @param packageId - immutable Package identity.
		* @returns the shared business-view key.
		*/
		function cordisToolViewKey(pluginId, packageId) {
			return `${pluginId}.${packageId}`;
		}
		//#endregion
		//#region lib/types/client/CordisRunRow.js
		/** `cordis_run` card and the host seat for Package-owned interactive UI. */
		const READING_LABELS = {
			idle: "status.idle",
			"awaiting-approval": "status.awaitingApproval",
			failed: "status.failed",
			"client-pending": "status.clientPending",
			running: "status.running",
			removed: "status.removed",
			superseded: "status.superseded"
		};
		/** Render one activation result and, when eligible, its Package-owned view. */
		function CordisRunRow({ callId, block, inspect, renderSlot, useInventory, useLoaded, useRunCards, useActiveRuns, onObserveRunCard, t }) {
			const card = cordisRunCard(block);
			const inventory = useInventory((snapshot) => snapshot);
			const loaded = useLoaded((snapshot) => snapshot);
			const latest = useRunCards((snapshot) => snapshot);
			const activeRuns = useActiveRuns((snapshot) => snapshot);
			const key = card.state === "ok" && card.pluginId !== null && card.packageId !== null && card.pluginRunId !== null && card.seq !== null ? cordisToolViewKey(card.pluginId, card.packageId) : null;
			(0, react.useEffect)(() => {
				if (key === null || card.seq === null || card.pluginRunId === null) return;
				onObserveRunCard({
					key,
					callId,
					seq: card.seq,
					pluginRunId: card.pluginRunId
				});
			}, [
				callId,
				card.pluginRunId,
				card.seq,
				key,
				onObserveRunCard
			]);
			const row = card.pluginId === null ? void 0 : inventory.rows.find((candidate) => candidate.pluginId === card.pluginId);
			const pointer = key === null ? void 0 : latest.get(key);
			const superseded = pointer !== void 0 && pointer.callId !== callId && pointer.seq >= (card.seq ?? -1);
			const activity = card.pluginId === null ? void 0 : activeRuns.get(card.pluginId);
			const attempt = card.pluginRunId !== null && row?.latestRun?.pluginRunId === card.pluginRunId ? row.latestRun : void 0;
			const awaitingApproval = attempt?.status === "awaiting-approval" || card.packageId !== null && activity?.phase === "awaiting-approval" && activity.packageId === card.packageId && (card.mode === null || activity.mode === card.mode);
			const reading = card.pluginId !== null && inventory.removed.has(card.pluginId) ? "removed" : superseded ? "superseded" : awaitingApproval ? "awaiting-approval" : attempt?.status === "failed" ? "failed" : row !== void 0 && card.packageId !== null ? cordisVisibleStatus(row, card.packageId, loaded) : "idle";
			const status = t(READING_LABELS[reading]);
			const summary = card.errorSummary ?? (card.pluginId === null ? callId : `${card.pluginId}${card.packageId === null ? "" : ` · ${card.packageId}`}`);
			const showBusiness = reading === "running" && key !== null;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: CordisRunRow_module_css_default.card,
				"data-tool": "cordis_run",
				"data-state": card.state,
				"data-cordis-plugin-id": card.pluginId ?? void 0,
				"data-cordis-package-id": card.packageId ?? void 0,
				"data-cordis-run-id": card.pluginRunId ?? void 0,
				"data-cordis-status": reading,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: CordisRunRow_module_css_default.row,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: CordisRunRow_module_css_default.icon,
								children: card.state === "error" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }) : card.state === "stopped" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 })
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: CordisRunRow_module_css_default.title,
								children: t(card.mode === "update" ? "row.updateTitle" : "row.runTitle")
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: CordisRunRow_module_css_default.separator,
								"aria-hidden": true
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: card.errorSummary === null ? CordisRunRow_module_css_default.summary : CordisRunRow_module_css_default.error,
								children: summary
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: CordisRunRow_module_css_default.status,
								children: status
							}),
							inspect !== void 0 && (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: CordisRunRow_module_css_default.inspect,
								"aria-label": t("action.inspect"),
								onClick: inspect,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {})
							})
						]
					}),
					reading === "removed" && (0, react_jsx_runtime.jsx)("div", {
						className: CordisRunRow_module_css_default.message,
						children: t("run.removed")
					}),
					reading === "superseded" && (0, react_jsx_runtime.jsx)("div", {
						className: CordisRunRow_module_css_default.message,
						children: t("run.superseded")
					}),
					reading === "failed" && attempt?.error !== void 0 && (0, react_jsx_runtime.jsx)("div", {
						className: CordisRunRow_module_css_default.message,
						children: attempt.error.message
					}),
					showBusiness && card.pluginId !== null && card.packageId !== null && card.pluginRunId !== null && (0, react_jsx_runtime.jsx)("div", {
						className: CordisRunRow_module_css_default.business,
						"data-cordis-business-view": key,
						children: renderSlot("tool.view.cordis", {
							pluginId: card.pluginId,
							packageId: card.packageId,
							pluginRunId: card.pluginRunId
						}, {
							entryKey: key,
							fallback: card.output === null ? null : (0, react_jsx_runtime.jsx)("pre", {
								className: CordisRunRow_module_css_default.output,
								children: card.output
							})
						})
					}),
					!showBusiness && reading !== "removed" && reading !== "superseded" && card.output !== null && (0, react_jsx_runtime.jsx)("pre", {
						className: CordisRunRow_module_css_default.output,
						children: card.output
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/extensions/ui-cordis/src/client/CordisPanel.module.css.mjs
		const css = ".Nqubda_layer{flex:none;align-items:center;width:100%;height:42px;margin:8px 0 0;display:flex;position:relative}.Nqubda_footerButtons{align-items:center;width:100%;display:flex}.Nqubda_badge{width:calc(100% + 4px);height:42px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;margin:0 -2px;padding:0 10px 0 8px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden}.Nqubda_badge:hover,.Nqubda_badge[data-active]{background:var(--dsw-alias-interactive-bg-hover)}.Nqubda_badgeLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.Nqubda_badgeCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:12px;line-height:16px}.Nqubda_layer.Nqubda_rail{width:36px;height:36px;margin:0}.Nqubda_rail .Nqubda_badge{corner-shape:round;border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0}.Nqubda_rail .Nqubda_footerButtons{flex-direction:column;gap:2px}.Nqubda_panel{z-index:30;background:var(--dsw-specific-menu);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:420px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-elevation-prominent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;border-radius:12px;flex-direction:column;display:flex;position:fixed;overflow:hidden}.Nqubda_header{box-sizing:border-box;flex:none;justify-content:space-between;align-items:center;min-height:44px;padding:10px 12px;display:flex}.Nqubda_body{flex:1;min-height:0;padding:0 12px 12px;overflow-y:auto}.Nqubda_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:20px}.Nqubda_note,.Nqubda_readError{color:var(--dsw-alias-label-tertiary);margin:4px 0;font-size:12px;line-height:18px}.Nqubda_readError{color:var(--dsw-alias-state-error-primary)}.Nqubda_group{color:var(--dsw-alias-label-caption);text-transform:uppercase;letter-spacing:.04em;margin:8px 0;font-size:11px;font-weight:500;line-height:16px}.Nqubda_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.Nqubda_row{border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;flex-direction:column;gap:8px;padding:14px 12px 10px;display:flex}.Nqubda_row[data-cordis-awaiting]{border-color:var(--dsw-alias-state-business-primary)}.Nqubda_rowHead{align-items:center;gap:8px;display:flex}.Nqubda_rowId{color:var(--dsw-alias-label-tertiary);font-family:var(--dsh-font-mono,monospace);flex:none;font-size:11px;line-height:20px}.Nqubda_rowName{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;font-weight:500;line-height:20px;overflow:hidden}.Nqubda_rowStatus{background:var(--dsw-alias-button-ghost-active-fill);height:20px;color:var(--dsw-alias-label-caption);border-radius:10px;flex:none;align-items:center;padding:0 6px;font-size:11px;line-height:20px;display:inline-flex}.Nqubda_row[data-cordis-status=idle] .Nqubda_rowStatus{background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-caption)}.Nqubda_row[data-cordis-status=awaiting-approval] .Nqubda_rowStatus,.Nqubda_row[data-cordis-status=client-pending] .Nqubda_rowStatus{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-label)}.Nqubda_row[data-cordis-status=failed] .Nqubda_rowStatus{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.Nqubda_row[data-cordis-status=running] .Nqubda_rowStatus{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}.Nqubda_rowDetail{align-items:center;gap:8px;min-height:28px;display:flex}.Nqubda_versionPicker{color:var(--dsw-alias-label-caption);align-items:center;gap:8px;font-size:11px;line-height:18px;display:flex}.Nqubda_versionPicker select{border:.5px solid var(--dsw-alias-border-l3);min-width:0;height:26px;color:var(--dsw-alias-label-secondary);font:inherit;background:0 0;border-radius:7px;flex:1;padding:0 8px}.Nqubda_rowPurpose{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.Nqubda_rowError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.Nqubda_rowActions{flex:none;align-items:center;gap:10px;display:flex}.Nqubda_transition{min-width:0;color:var(--dsw-alias-label-caption);align-items:center;gap:8px;font-size:11px;line-height:18px;display:flex}.Nqubda_transitionActions{gap:6px;margin-left:auto;display:flex}.Nqubda_transitionActions button{border:.5px solid var(--dsw-alias-border-l3);corner-shape:round;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:2px 8px}.Nqubda_transitionActions button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Nqubda_transitionActions button:disabled{opacity:.4;cursor:default}.Nqubda_activeVersion{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}.Nqubda_actionButton{corner-shape:round;width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;justify-content:center;align-items:center;padding:0;display:inline-flex}.Nqubda_actionButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.Nqubda_actionButton:disabled{opacity:.4;cursor:default}.Nqubda_doubleCheck{width:17px;height:14px;display:inline-block;position:relative}.Nqubda_doubleCheck svg{position:absolute;top:1px}.Nqubda_doubleCheck svg:first-child{opacity:.7;left:0}.Nqubda_doubleCheck svg:last-child{left:5px}";
		const tagId = "@deepseek-ai/dsh-client-ui-cordis/CordisPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-cordis";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var CordisPanel_module_css_default = {
			"actionButton": "Nqubda_actionButton",
			"activeVersion": "Nqubda_activeVersion",
			"badge": "Nqubda_badge",
			"badgeCount": "Nqubda_badgeCount",
			"badgeLabel": "Nqubda_badgeLabel",
			"body": "Nqubda_body",
			"doubleCheck": "Nqubda_doubleCheck",
			"footerButtons": "Nqubda_footerButtons",
			"group": "Nqubda_group",
			"header": "Nqubda_header",
			"layer": "Nqubda_layer",
			"note": "Nqubda_note",
			"panel": "Nqubda_panel",
			"rail": "Nqubda_rail",
			"readError": "Nqubda_readError",
			"row": "Nqubda_row",
			"rowActions": "Nqubda_rowActions",
			"rowDetail": "Nqubda_rowDetail",
			"rowError": "Nqubda_rowError",
			"rowHead": "Nqubda_rowHead",
			"rowId": "Nqubda_rowId",
			"rowName": "Nqubda_rowName",
			"rowPurpose": "Nqubda_rowPurpose",
			"rowStatus": "Nqubda_rowStatus",
			"rows": "Nqubda_rows",
			"title": "Nqubda_title",
			"transition": "Nqubda_transition",
			"transitionActions": "Nqubda_transitionActions",
			"versionPicker": "Nqubda_versionPicker"
		};
		//#endregion
		//#region lib/types/client/CordisPanel.js
		/** Frame-wide dynamic Plugin inventory, approvals, versions, and lifecycle actions. */
		const STATUS_LABELS = {
			idle: "status.idle",
			"awaiting-approval": "status.awaitingApproval",
			"client-pending": "status.clientPending",
			running: "status.running",
			failed: "status.failed"
		};
		const RENDER_FAILURE_LABELS = {
			abdicated: "render.failedAbdicated",
			held: "render.failedHeld"
		};
		function selectedPackageIdOf({ pluginId, listed, activity }, selected) {
			const selectedPackageId = selected[pluginId];
			if (selectedPackageId !== void 0 && listed?.packages.some((pkg) => pkg.packageId === selectedPackageId)) return selectedPackageId;
			return listed?.nextPackageId ?? listed?.currentPackageId ?? listed?.packages.at(-1)?.packageId ?? activity?.packageId;
		}
		function visiblePanelStatus(view, selectedPackageId, loaded) {
			const { listed, activity } = view;
			const latest = listed?.latestRun;
			if (activity?.phase === "awaiting-approval" || latest?.status === "awaiting-approval") return "awaiting-approval";
			if (latest?.status === "failed" && latest.packageId === selectedPackageId) return "failed";
			if (listed?.activeRun === void 0) return "idle";
			return cordisVisibleStatus(listed, listed.activeRun.packageId, loaded);
		}
		function blockingFirst(rows) {
			return [...rows.filter((row) => row.activity?.phase === "awaiting-approval"), ...rows.filter((row) => row.activity?.phase !== "awaiting-approval")];
		}
		function RowAction({ label, children, ...props }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: "bottom",
				delayMs: 500,
				children: (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: CordisPanel_module_css_default.actionButton,
					"aria-label": label,
					...props,
					children
				})
			});
		}
		function DoubleCheckIcon() {
			return (0, react_jsx_runtime.jsxs)("span", {
				className: CordisPanel_module_css_default.doubleCheck,
				"aria-hidden": true,
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 12 }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 12 })]
			});
		}
		/** Render the inventory panel and its unified footer action. */
		function CordisPanel({ wide, useSessions, useInventory, useActiveRuns, useRunErrors, useLoaded, useRenderFailures, onApprove, onDecline, onRun, onStop, onRemove, onRefresh, t }) {
			const inventory = useInventory((snapshot) => snapshot);
			const activeRuns = useActiveRuns((snapshot) => snapshot);
			const errors = useRunErrors((snapshot) => snapshot);
			const loaded = useLoaded((snapshot) => snapshot);
			const renderFailures = useRenderFailures((snapshot) => snapshot);
			const current = useSessions((state) => state.current);
			const [open, setOpen] = (0, react.useState)(false);
			const [selected, setSelected] = (0, react.useState)({});
			const [pending, setPending] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [actionErrors, setActionErrors] = (0, react.useState)(/* @__PURE__ */ new Map());
			const visibleRequests = (0, react.useRef)(/* @__PURE__ */ new Set());
			const rootRef = (0, react.useRef)(null);
			const [anchor, setAnchor] = (0, react.useState)();
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				const place = () => {
					const rect = rootRef.current?.getBoundingClientRect();
					if (rect !== void 0) setAnchor({
						left: rect.left,
						bottom: window.innerHeight - rect.top + 8
					});
				};
				place();
				window.addEventListener("resize", place);
				return () => {
					window.removeEventListener("resize", place);
				};
			}, [open]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen);
			(0, react.useEffect)(() => {
				const now = /* @__PURE__ */ new Set();
				for (const activity of activeRuns.values()) if (activity.phase === "awaiting-approval") now.add(activity.requestId);
				const discovered = [...now].some((requestId) => !visibleRequests.current.has(requestId));
				visibleRequests.current = now;
				if (discovered) setOpen(true);
			}, [activeRuns]);
			(0, react.useEffect)(() => {
				onRefresh();
			}, [onRefresh]);
			(0, react.useEffect)(() => {
				if (open) onRefresh();
			}, [onRefresh, open]);
			const byPlugin = /* @__PURE__ */ new Map();
			for (const listed of inventory.rows) {
				const activity = activeRuns.get(listed.pluginId);
				byPlugin.set(listed.pluginId, {
					pluginId: listed.pluginId,
					agentId: activity?.agentId ?? listed.agentId,
					listed,
					...activity === void 0 ? {} : { activity }
				});
			}
			for (const [pluginId, activity] of activeRuns) {
				if (byPlugin.has(pluginId)) continue;
				byPlugin.set(pluginId, {
					pluginId,
					agentId: activity.agentId,
					activity
				});
			}
			const all = [...byPlugin.values()];
			const mine = blockingFirst(all.filter((row) => current !== void 0 && row.agentId === current));
			const theirs = blockingFirst(all.filter((row) => current === void 0 || row.agentId !== current));
			const approvals = [...activeRuns.values()].filter((activity) => activity.phase === "awaiting-approval").length;
			const running = all.filter((view) => visiblePanelStatus(view, selectedPackageIdOf(view, selected), loaded) === "running").length;
			if (all.length === 0) return null;
			const runAction = async (pluginId, action) => {
				if (pending.has(pluginId)) return;
				setPending((currentPending) => new Set(currentPending).add(pluginId));
				setActionErrors((currentErrors) => {
					const next = new Map(currentErrors);
					next.delete(pluginId);
					return next;
				});
				try {
					const result = await action();
					if (result !== void 0 && !result.ok) setActionErrors((currentErrors) => new Map(currentErrors).set(pluginId, result.message ?? "operation failed"));
				} catch (error) {
					setActionErrors((currentErrors) => new Map(currentErrors).set(pluginId, error instanceof Error ? error.message : String(error)));
				} finally {
					setPending((currentPending) => {
						const next = new Set(currentPending);
						next.delete(pluginId);
						return next;
					});
					onRefresh();
				}
			};
			const renderRow = (view) => {
				const { pluginId, listed, activity } = view;
				const selectedPackageId = selectedPackageIdOf(view, selected);
				const selectedPackage = listed !== void 0 && selectedPackageId !== void 0 ? packageOf(listed, selectedPackageId) : void 0;
				const activePackage = listed?.activeRun === void 0 ? void 0 : packageOf(listed, listed.activeRun.packageId);
				const name = selectedPackage?.name ?? (activity?.phase === "awaiting-approval" ? activity.name : pluginId);
				const purpose = selectedPackage?.purpose ?? (activity?.phase === "awaiting-approval" ? activity.purpose : "");
				const latest = listed?.latestRun;
				const awaiting = activity?.phase === "awaiting-approval" ? activity.requestId : latest?.status === "awaiting-approval" ? latest.approvalRequestId : void 0;
				const status = visiblePanelStatus(view, selectedPackageId, loaded);
				const busy = pending.has(pluginId) || activity?.phase === "orchestrating";
				const failure = errors.get(pluginId);
				const hostFailure = latest?.status === "failed" ? latest.error : void 0;
				const renderFailure = renderFailures.get(pluginId);
				const actionError = actionErrors.get(pluginId);
				const nextPackageId = listed?.nextPackageId !== void 0 && listed.nextPackageId !== listed.currentPackageId ? listed.nextPackageId : void 0;
				const currentPackageId = listed?.currentPackageId;
				const runMode = listed?.currentPackageId !== void 0 && selectedPackageId !== listed.currentPackageId ? "update" : "run";
				return (0, react_jsx_runtime.jsxs)("li", {
					className: CordisPanel_module_css_default.row,
					"data-cordis-row": pluginId,
					"data-cordis-status": status,
					"data-cordis-awaiting": awaiting !== void 0 || void 0,
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: CordisPanel_module_css_default.rowHead,
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: CordisPanel_module_css_default.rowId,
									children: pluginId
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: CordisPanel_module_css_default.rowName,
									children: name
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: CordisPanel_module_css_default.rowStatus,
									children: t(STATUS_LABELS[status])
								})
							]
						}),
						listed !== void 0 && listed.packages.length > 1 && selectedPackageId !== void 0 && (0, react_jsx_runtime.jsxs)("label", {
							className: CordisPanel_module_css_default.versionPicker,
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("panel.version") }), (0, react_jsx_runtime.jsx)("select", {
								value: selectedPackageId,
								disabled: busy,
								onChange: (event) => {
									setSelected((currentSelected) => ({
										...currentSelected,
										[pluginId]: event.target.value
									}));
								},
								children: listed.packages.map((pkg) => (0, react_jsx_runtime.jsx)("option", {
									value: pkg.packageId,
									children: `${pkg.name} · ${pkg.packageId}`
								}, pkg.packageId))
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: CordisPanel_module_css_default.rowDetail,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: CordisPanel_module_css_default.rowPurpose,
								children: purpose
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: CordisPanel_module_css_default.rowActions,
								children: [
									awaiting !== void 0 && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(0, react_jsx_runtime.jsx)(RowAction, {
											label: t("action.approveOnce"),
											"data-cordis-approve": awaiting,
											disabled: busy,
											onClick: () => {
												runAction(pluginId, async () => {
													await onApprove(awaiting, false);
													setOpen(false);
												});
											},
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 })
										}),
										(0, react_jsx_runtime.jsx)(RowAction, {
											label: t("action.approvePlugin"),
											"data-cordis-approve-plugin": awaiting,
											disabled: busy,
											onClick: () => {
												runAction(pluginId, async () => {
													await onApprove(awaiting, true);
													setOpen(false);
												});
											},
											children: (0, react_jsx_runtime.jsx)(DoubleCheckIcon, {})
										}),
										(0, react_jsx_runtime.jsx)(RowAction, {
											label: t("action.decline"),
											"data-cordis-decline": awaiting,
											disabled: busy,
											onClick: () => {
												runAction(pluginId, async () => {
													await onDecline(awaiting);
													setOpen(false);
												});
											},
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
										})
									] }),
									awaiting === void 0 && listed !== void 0 && selectedPackageId !== void 0 && listed.activeRun === void 0 && (0, react_jsx_runtime.jsx)(RowAction, {
										label: t("action.run"),
										"data-cordis-switch": "run",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRun({
												agentId: listed.agentId,
												pluginId,
												packageId: selectedPackageId,
												mode: runMode,
												hasClientHalf: selectedPackage?.hasClientHalf === true
											}));
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16, { size: 14 })
									}),
									awaiting === void 0 && listed !== void 0 && listed.activeRun !== void 0 && selectedPackageId !== listed.activeRun.packageId && selectedPackage !== void 0 && (0, react_jsx_runtime.jsx)(RowAction, {
										label: t("action.run"),
										"data-cordis-switch": "run",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRun({
												agentId: listed.agentId,
												pluginId,
												packageId: selectedPackage.packageId,
												mode: runMode,
												hasClientHalf: selectedPackage.hasClientHalf
											}));
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16, { size: 14 })
									}),
									awaiting === void 0 && listed !== void 0 && listed.activeRun !== void 0 && status === "client-pending" && activePackage !== void 0 && selectedPackageId === listed.activeRun.packageId && (0, react_jsx_runtime.jsx)(RowAction, {
										label: t("action.run"),
										"data-cordis-switch": "run",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRun({
												agentId: listed.agentId,
												pluginId,
												packageId: activePackage.packageId,
												mode: "run",
												hasClientHalf: true
											}));
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutline16, { size: 14 })
									}),
									awaiting === void 0 && listed !== void 0 && listed.activeRun !== void 0 && (0, react_jsx_runtime.jsx)(RowAction, {
										label: t("action.stop"),
										"data-cordis-switch": "stop",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onStop(listed.agentId, pluginId));
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFill16, { size: 14 })
									}),
									awaiting === void 0 && listed !== void 0 && (0, react_jsx_runtime.jsx)(RowAction, {
										label: t("action.remove"),
										"data-cordis-remove": pluginId,
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRemove(listed.agentId, pluginId));
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
									})
								]
							})]
						}),
						awaiting === void 0 && nextPackageId !== void 0 && listed !== void 0 && (0, react_jsx_runtime.jsxs)("div", {
							className: CordisPanel_module_css_default.transition,
							children: [
								(0, react_jsx_runtime.jsx)("span", { children: currentPackageId === void 0 ? "" : t("panel.current", { packageId: currentPackageId }) }),
								(0, react_jsx_runtime.jsx)("span", { children: t("panel.next", { packageId: nextPackageId }) }),
								(0, react_jsx_runtime.jsxs)("div", {
									className: CordisPanel_module_css_default.transitionActions,
									children: [(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRun({
												agentId: listed.agentId,
												pluginId,
												packageId: nextPackageId,
												mode: currentPackageId === void 0 ? "run" : "update",
												hasClientHalf: packageOf(listed, nextPackageId)?.hasClientHalf === true
											}));
										},
										children: t("action.retry")
									}), currentPackageId !== void 0 && (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										onClick: () => {
											runAction(pluginId, () => onRun({
												agentId: listed.agentId,
												pluginId,
												packageId: currentPackageId,
												mode: "run",
												hasClientHalf: packageOf(listed, currentPackageId)?.hasClientHalf === true
											}));
										},
										children: t("action.rollback")
									})]
								})
							]
						}),
						failure !== void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: CordisPanel_module_css_default.rowError,
							role: "alert",
							children: `${failure.message} (${failure.reason})`
						}),
						failure === void 0 && hostFailure !== void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: CordisPanel_module_css_default.rowError,
							role: "alert",
							children: `${hostFailure.message} (${hostFailure.phase})`
						}),
						actionError !== void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: CordisPanel_module_css_default.rowError,
							role: "alert",
							children: actionError
						}),
						renderFailure !== void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: CordisPanel_module_css_default.rowError,
							role: "alert",
							"data-cordis-render-failure": renderFailure.slot,
							"data-cordis-render-abdicated": renderFailure.abdicated || void 0,
							children: `${t(RENDER_FAILURE_LABELS[renderFailure.abdicated ? "abdicated" : "held"], { slot: renderFailure.slot })} ${renderFailure.message}`
						}),
						activePackage !== void 0 && activePackage.packageId !== selectedPackageId && (0, react_jsx_runtime.jsx)("span", {
							className: CordisPanel_module_css_default.activeVersion,
							children: `${t("status.running")}: ${activePackage.name} · ${activePackage.packageId}`
						})
					]
				}, pluginId);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: wide ? CordisPanel_module_css_default.layer : `${CordisPanel_module_css_default.layer} ${CordisPanel_module_css_default.rail}`,
				children: [open && anchor !== void 0 && (0, react_jsx_runtime.jsxs)("section", {
					className: CordisPanel_module_css_default.panel,
					style: anchor,
					"data-cordis-panel": true,
					"aria-label": t("panel.title"),
					children: [(0, react_jsx_runtime.jsx)("header", {
						className: CordisPanel_module_css_default.header,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: CordisPanel_module_css_default.title,
							children: t("panel.title")
						})
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: CordisPanel_module_css_default.body,
						children: [
							inventory.error !== void 0 && (0, react_jsx_runtime.jsx)("p", {
								className: CordisPanel_module_css_default.readError,
								role: "alert",
								children: t("panel.readFailed", { message: inventory.error })
							}),
							!inventory.read && inventory.error === void 0 && (0, react_jsx_runtime.jsx)("p", {
								className: CordisPanel_module_css_default.note,
								children: t("panel.loading")
							}),
							inventory.read && all.length === 0 && (0, react_jsx_runtime.jsx)("p", {
								className: CordisPanel_module_css_default.note,
								children: t("panel.empty")
							}),
							mine.length > 0 && (0, react_jsx_runtime.jsxs)("section", { children: [(0, react_jsx_runtime.jsx)("h3", {
								className: CordisPanel_module_css_default.group,
								children: t("panel.group.current")
							}), (0, react_jsx_runtime.jsx)("ul", {
								className: CordisPanel_module_css_default.rows,
								children: mine.map(renderRow)
							})] }),
							theirs.length > 0 && (0, react_jsx_runtime.jsxs)("section", { children: [(0, react_jsx_runtime.jsx)("h3", {
								className: CordisPanel_module_css_default.group,
								children: t("panel.group.others")
							}), (0, react_jsx_runtime.jsx)("ul", {
								className: CordisPanel_module_css_default.rows,
								children: theirs.map(renderRow)
							})] })
						]
					})]
				}), (0, react_jsx_runtime.jsx)("div", {
					className: CordisPanel_module_css_default.footerButtons,
					children: (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: CordisPanel_module_css_default.badge,
						"data-cordis-badge": all.length,
						"data-cordis-approval-badge": approvals,
						"data-active": approvals > 0 || void 0,
						"aria-label": t("panel.plugins.aria"),
						"aria-expanded": open,
						onClick: () => {
							setOpen((value) => !value);
						},
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: wide ? 16 : 18 }), wide && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
							className: CordisPanel_module_css_default.badgeLabel,
							children: t("panel.trigger")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: CordisPanel_module_css_default.badgeCount,
							children: t("panel.runningCount", { count: running })
						})] })]
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/inventory.js
		/**
		* The host's definition registry as this page last read it, owned by the
		* plugin's apply closure.
		*
		* The panel is a frame-wide surface, so it cannot derive this from any session:
		* the registry is global and the read is a single global call. The rows are
		* re-read rather than patched, because the wire announcements
		* (`cordis/dynamic-package` / `/retract`) carry no labels and a definition
		* can appear or disappear between them — a patch-in-place cache would drift into
		* showing definitions the host no longer holds.
		*
		* Reads are single-flight: several announcements settling at once, or a badge
		* opening while a reconnect re-reads, must not multiply the call. Single-flight
		* alone would be wrong across a reconnect, though — the in-flight read belongs to
		* the previous connection, so a reset both discards its answer and frees the slot
		* for a fresh one. Without that, a reconnect either loses its re-read to the old
		* call or has the old host's rows published on top of it.
		*/
		/**
		* Create the inventory source.
		* @param port - the RPC seam the read goes through.
		* @param onError - reporter for a failed read (console in production, captured in specs).
		* @returns the inventory observable and its read trigger.
		*/
		function createCordisInventory(port, onError) {
			const listeners = /* @__PURE__ */ new Set();
			let snapshot = {
				rows: [],
				removed: /* @__PURE__ */ new Set(),
				read: false
			};
			let inFlight;
			let generation = 0;
			const publish = (next) => {
				snapshot = next;
				for (const listener of [...listeners]) listener();
			};
			return {
				getSnapshot: () => snapshot,
				subscribe: (fn) => {
					listeners.add(fn);
					return () => {
						listeners.delete(fn);
					};
				},
				refresh: () => {
					if (inFlight !== void 0) return;
					const issued = generation;
					inFlight = port.inventory().then((rows) => {
						if (issued !== generation) return;
						const removed = new Set(snapshot.removed);
						const live = new Set(rows.map((row) => row.pluginId));
						for (const previous of snapshot.rows) if (!live.has(previous.pluginId)) removed.add(previous.pluginId);
						publish({
							rows,
							removed,
							read: true
						});
					}, (error) => {
						if (issued !== generation) return;
						onError(error);
						publish({
							rows: snapshot.rows,
							removed: snapshot.removed,
							read: snapshot.read,
							error: error instanceof Error ? error.message : "reading the cordis inventory failed"
						});
					}).then(() => {
						if (issued === generation) inFlight = void 0;
					});
				},
				retire: (pluginId) => {
					const removed = new Set(snapshot.removed);
					removed.add(pluginId);
					publish({
						...snapshot,
						rows: snapshot.rows.filter((row) => row.pluginId !== pluginId),
						removed
					});
				},
				reset: () => {
					generation += 1;
					inFlight = void 0;
					publish({
						rows: [],
						removed: snapshot.removed,
						read: false
					});
				}
			};
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Cordis dynamic-plugin UI dictionaries. */
		const NS = "cordis";
		/** Simplified Chinese Cordis UI messages. */
		const zh = {
			"row.defineTitle": "注册 Cordis 插件",
			"row.runTitle": "运行 Cordis 插件",
			"row.updateTitle": "更新 Cordis 插件",
			"row.stopTitle": "停止 Cordis 插件",
			"row.removeTitle": "移除 Cordis 插件",
			"purpose.missing": "(未填写用途)",
			"status.idle": "待激活",
			"status.awaitingApproval": "待审批",
			"status.failed": "运行失败",
			"status.clientPending": "Client 待激活",
			"status.running": "运行中",
			"status.removed": "已移除",
			"status.superseded": "已有更新",
			"run.removed": "包已不存在",
			"run.superseded": "已有更新的运行卡片，请查看下方",
			"panel.hint": "运行控制在左下角设置上方的 Cordis 面板",
			"panel.plugins.aria": "Cordis 插件",
			"panel.approvals.aria": "Cordis 审批",
			"panel.trigger": "Cordis Plugin",
			"panel.runningCount": "{count} running",
			"panel.title": "Cordis 插件",
			"panel.empty": "还没有定义任何插件",
			"panel.loading": "读取中…",
			"panel.readFailed": "读取插件清单失败：{message}",
			"panel.group.current": "当前会话",
			"panel.group.others": "其他会话",
			"panel.version": "版本",
			"panel.current": "当前：{packageId}",
			"panel.next": "待切换：{packageId}",
			"action.approve": "允许",
			"action.approveOnce": "仅允许此版本",
			"action.approvePlugin": "允许此插件的后续版本",
			"action.decline": "拒绝",
			"action.run": "运行",
			"action.stop": "停止",
			"action.remove": "移除",
			"action.retry": "重试",
			"action.rollback": "回退",
			"action.inspect": "查看",
			"render.failedAbdicated": "{slot} 渲染失败，已恢复默认界面：",
			"render.failedHeld": "{slot} 渲染失败：",
			"a11y.defining": "正在定义插件",
			"a11y.failed": "定义失败",
			"a11y.stopped": "定义已中断",
			"body.source": "插件代码",
			"body.hostCode": "Host",
			"body.clientCode": "Client",
			"body.output": "结果",
			"body.copy": "复制",
			"body.copied": "已复制"
		};
		/** English Cordis UI messages. */
		const en = {
			"row.defineTitle": "Register Cordis Plugin",
			"row.runTitle": "Run Cordis Plugin",
			"row.updateTitle": "Update Cordis Plugin",
			"row.stopTitle": "Stop Cordis Plugin",
			"row.removeTitle": "Remove Cordis Plugin",
			"purpose.missing": "(no purpose given)",
			"status.idle": "Ready",
			"status.awaitingApproval": "Awaiting approval",
			"status.failed": "Run failed",
			"status.clientPending": "Client ready to activate",
			"status.running": "Running",
			"status.removed": "Removed",
			"status.superseded": "Newer run available",
			"run.removed": "This package no longer exists",
			"run.superseded": "A newer run card is available below",
			"panel.hint": "Run controls live in the Cordis panel above Settings",
			"panel.plugins.aria": "Cordis plugins",
			"panel.approvals.aria": "Cordis approvals",
			"panel.trigger": "Cordis Plugin",
			"panel.runningCount": "{count} running",
			"panel.title": "Cordis plugins",
			"panel.empty": "No plugins defined yet",
			"panel.loading": "Reading…",
			"panel.readFailed": "Reading the plugin inventory failed: {message}",
			"panel.group.current": "This session",
			"panel.group.others": "Other sessions",
			"panel.version": "Version",
			"panel.current": "Current: {packageId}",
			"panel.next": "Next: {packageId}",
			"action.approve": "Allow",
			"action.approveOnce": "Allow this version only",
			"action.approvePlugin": "Allow future versions of this plugin",
			"action.decline": "Decline",
			"action.run": "Run",
			"action.stop": "Stop",
			"action.remove": "Remove",
			"action.retry": "Retry",
			"action.rollback": "Roll back",
			"action.inspect": "Inspect",
			"render.failedAbdicated": "Rendering failed in {slot}; the default UI was restored:",
			"render.failedHeld": "Rendering failed in {slot}:",
			"a11y.defining": "Defining the plugin",
			"a11y.failed": "Definition failed",
			"a11y.stopped": "Definition interrupted",
			"body.source": "Plugin source",
			"body.hostCode": "Host",
			"body.clientCode": "Client",
			"body.output": "Result",
			"body.copy": "Copy",
			"body.copied": "Copied"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Cordis dynamic-plugin cards, inventory panel, business-view host, and `@pluginId` source. */
		/** Required services for the two Tool cards, panel, Remote lifecycle, and Slash source. */
		const inject = [
			"slots",
			"locale",
			"inputTriggers",
			"remote",
			"remote.dynamicCordisRunner",
			"dynamicCordisRunner"
		];
		/** Mount every Cordis browser surface over the shared Host inventory. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-cordis: dictionaries");
			const port = {
				stop: async (sessionId, pluginId) => {
					const answered = await ctx.remote.dynamicCordisRunner.stopFromPanel(sessionId, pluginId);
					if (!answered.ok) return {
						ok: false,
						message: `${answered.error.code}: ${answered.error.message}`
					};
					if (answered.value.ok || answered.value.reason === "not-running") return { ok: true };
					return {
						ok: false,
						message: answered.value.message
					};
				},
				remove: async (sessionId, pluginId) => {
					const answered = await ctx.remote.dynamicCordisRunner.undefineFromPanel(sessionId, pluginId);
					if (!answered.ok) return {
						ok: false,
						message: `${answered.error.code}: ${answered.error.message}`
					};
					return answered.value.ok ? { ok: true } : {
						ok: false,
						message: answered.value.message
					};
				},
				inventory: async () => {
					const answered = await ctx.remote.dynamicCordisRunner.inventory();
					if (!answered.ok) throw new Error(`${answered.error.code}: ${answered.error.message}`);
					return answered.value;
				}
			};
			const inventory = createCordisInventory(port, (error) => {
				console.error("[ui-cordis] reading the Cordis inventory failed:", error);
			});
			const runner = ctx.dynamicCordisRunner;
			const loaded = {
				getSnapshot: () => runner.getSnapshot(),
				subscribe: (fn) => runner.subscribe(fn)
			};
			const runCards = new CordisRunCardRegistry();
			ctx.effect(() => inventory.subscribe(() => {
				const snapshot = inventory.getSnapshot();
				if (snapshot.read) runner.reconcileApprovals(snapshot.rows);
			}), "ui-cordis: reconcile pending approvals");
			ctx.remote.$on("cordis/dynamic-package", () => {
				inventory.refresh();
			});
			ctx.remote.$on("cordis/dynamic-retract", () => {
				inventory.refresh();
			});
			ctx.remote.$on("cordis/request-run", (request) => {
				if (!inventory.getSnapshot().rows.some((row) => row.pluginId === request.pluginId)) inventory.refresh();
			});
			ctx.remote.$on("cordis/request-run-resolved", () => {
				inventory.refresh();
			});
			ctx.on("connection/reset", () => {
				inventory.reset();
				inventory.refresh();
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "cordis-panel",
				locale: NS,
				inject: () => ({
					hooks: {
						inventory,
						activeRuns: runner.activeRuns,
						runErrors: runner.lastRunError,
						loaded,
						renderFailures: runner.renderFailures
					},
					onApprove: (requestId, approveFutureVersions) => runner.approve(requestId, approveFutureVersions),
					onDecline: (requestId) => runner.decline(requestId),
					onRun: (request) => runner.startUserRun(request),
					onStop: async (sessionId, pluginId) => {
						const result = await port.stop(sessionId, pluginId);
						inventory.refresh();
						return result;
					},
					onRemove: async (sessionId, pluginId) => {
						const result = await port.remove(sessionId, pluginId);
						if (result.ok) inventory.retire(pluginId);
						inventory.refresh();
						return result;
					},
					onRefresh: () => {
						inventory.refresh();
					}
				})
			}, CordisPanel));
			const cardFace = () => ({ hooks: {
				inventory,
				loaded
			} });
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "cordis_define",
				locale: NS,
				inject: cardFace
			}, CordisDefineRow));
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "cordis_run",
				locale: NS,
				children: { "tool.view.cordis": {
					kind: "keyed",
					scope: "session"
				} },
				inject: (sessionId) => {
					const store = runCards.forSession(sessionId);
					return {
						hooks: {
							inventory,
							loaded,
							runCards: store,
							activeRuns: runner.activeRuns
						},
						onObserveRunCard: (pointer) => {
							store.observe(pointer);
						}
					};
				}
			}, CordisRunRow));
			ctx.slots.inject("tool.call.toolview", function* () {
				yield ctx.slots.register({
					name: "tool.call.toolview",
					key: "cordis_stop",
					locale: NS
				}, CordisActionRow);
				yield ctx.slots.register({
					name: "tool.call.toolview",
					key: "cordis_undefine",
					locale: NS
				}, CordisActionRow);
			});
			const rowsOf = (sessionId, query) => inventory.getSnapshot().rows.filter((row) => row.agentId === sessionId && String(row.pluginId).includes(query));
			const source = {
				trigger: "@",
				name: "cordis",
				order: 1,
				candidates(session, { query }) {
					const rows = rowsOf(session.sessionId, query);
					return Promise.resolve(rows.map((row) => {
						const packageId = row.nextPackageId ?? row.currentPackageId ?? row.packages.at(-1)?.packageId;
						const pkg = packageId === void 0 ? void 0 : row.packages.find((candidate) => candidate.packageId === packageId);
						return {
							name: String(row.pluginId),
							...pkg === void 0 ? {} : { description: pkg.purpose }
						};
					}));
				},
				warm() {
					inventory.refresh();
				},
				lexicon(session) {
					return rowsOf(session.sessionId, "").map((row) => String(row.pluginId));
				},
				subscribeLexicon(_session, listener) {
					return inventory.subscribe(listener);
				},
				onPick({ candidate }) {
					return { text: `@${candidate.name} ` };
				}
			};
			const slash = ctx.get("inputTriggers");
			ctx.effect(() => slash.registerSource(source), "ui-cordis: @pluginId source");
			inventory.refresh();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
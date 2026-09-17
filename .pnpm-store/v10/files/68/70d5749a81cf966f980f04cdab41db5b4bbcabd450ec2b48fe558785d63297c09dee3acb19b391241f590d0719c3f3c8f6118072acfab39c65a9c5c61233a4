window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-skill",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-skill/src/client/SkillRow.module.css.mjs
		const css = ".iWrAna_card{flex-direction:column;display:flex}.iWrAna_row{align-items:center;min-width:0;height:24px;display:flex;position:relative;overflow:hidden}.iWrAna_row[data-expandable]{cursor:pointer}.iWrAna_card[data-state=running] .iWrAna_row:after{content:\"\";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite iWrAna_dsh-skill-row-sweep;position:absolute;inset:0 auto 0 0}@keyframes iWrAna_dsh-skill-row-sweep{0%{left:-300px}90%,to{left:100%}}.iWrAna_leading{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex;position:relative}.iWrAna_chevron{color:var(--dsw-alias-label-secondary)}.iWrAna_iconIdle{opacity:1;transition:opacity .1s;display:inline-flex}.iWrAna_chevronHover{opacity:0;margin:auto;transition:opacity .1s;position:absolute;inset:0}.iWrAna_row:hover .iWrAna_iconIdle{opacity:0}.iWrAna_row:hover .iWrAna_chevronHover{opacity:1}.iWrAna_title{color:var(--dsw-alias-label-secondary);flex:none;font-size:14px;line-height:24px}.iWrAna_separator{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.iWrAna_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:14px;line-height:24px;overflow:hidden}.iWrAna_errorSummary{color:var(--dsw-alias-state-error-primary)}.iWrAna_bodyWrap{flex-direction:column;display:flex}.iWrAna_instructionsCard{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);border-radius:12px;flex-direction:column;max-height:260px;margin:4px 0 4px 4px;display:flex;overflow:hidden}.iWrAna_instructionsHeader{border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-caption);text-transform:uppercase;letter-spacing:.04em;flex:none;padding:8px 12px;font-size:11px;font-weight:500;line-height:16px}.iWrAna_instructions{white-space:pre-wrap;overflow-wrap:anywhere;min-height:0;font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-secondary);margin:0;padding:10px 12px 12px;overflow:auto}.iWrAna_instructions[data-error]{color:var(--dsw-alias-state-error-primary)}.iWrAna_instructions::-webkit-scrollbar-thumb{background-clip:padding-box;border:2px solid #0000;border-radius:6px}.iWrAna_instructions::-webkit-scrollbar-track{margin:6px 0}.iWrAna_inspectButton{border:.5px solid var(--dsw-alias-border-l4);corner-shape:round;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;border-radius:999px;align-self:flex-start;align-items:center;gap:4px;margin:4px 0 2px 4px;padding:2px 8px;font-size:11px;line-height:16px;transition:opacity .1s;display:inline-flex}.iWrAna_card:hover .iWrAna_inspectButton,.iWrAna_inspectButton:focus-visible{opacity:1}.iWrAna_inspectButton:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.iWrAna_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:reduce){.iWrAna_card[data-state=running] .iWrAna_row:after{animation:none;display:none}.iWrAna_iconIdle,.iWrAna_chevronHover,.iWrAna_inspectButton{transition:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-skill/SkillRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-skill";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SkillRow_module_css_default = {
			"bodyWrap": "iWrAna_bodyWrap",
			"card": "iWrAna_card",
			"chevron": "iWrAna_chevron",
			"chevronHover": "iWrAna_chevronHover",
			"dsh-skill-row-sweep": "iWrAna_dsh-skill-row-sweep",
			"errorSummary": "iWrAna_errorSummary",
			"iconIdle": "iWrAna_iconIdle",
			"inspectButton": "iWrAna_inspectButton",
			"instructions": "iWrAna_instructions",
			"instructionsCard": "iWrAna_instructionsCard",
			"instructionsHeader": "iWrAna_instructionsHeader",
			"leading": "iWrAna_leading",
			"row": "iWrAna_row",
			"separator": "iWrAna_separator",
			"summary": "iWrAna_summary",
			"title": "iWrAna_title",
			"visuallyHidden": "iWrAna_visuallyHidden"
		};
		//#endregion
		//#region lib/types/client/SkillRow.js
		/** First physical line for the collapsed error summary and malformed-args fallback. */
		function firstLine(text) {
			const newline = text.indexOf("\n");
			return newline === -1 ? text : text.slice(0, newline);
		}
		/** Skill names are the only call argument the compact row presents. */
		function skillName(argsRaw, callId) {
			try {
				const parsed = JSON.parse(argsRaw);
				if (typeof parsed === "object" && parsed !== null) {
					const name = parsed.name;
					if (typeof name === "string" && name !== "") return firstLine(name);
				}
			} catch {}
			return argsRaw === "" ? callId : firstLine(argsRaw);
		}
		/** Flatten durable result blocks under the generic Tool-row text contract.
		*  Keep aligned with ui-tool's models/tool-call-model.ts `resultText`. */
		function resultText(block) {
			if (!("kind" in block)) return null;
			const parts = [];
			for (const item of block.content) parts.push(item.type === "text" ? item.text : JSON.stringify(item, null, 2));
			if (parts.length === 0 && block.error !== void 0) parts.push(`${block.error.name}: ${block.error.code}`);
			return parts.join("\n") || null;
		}
		/** Derive display state without consulting the live skill catalog. */
		function skillRowModel(block) {
			const settled = "kind" in block;
			const argsRaw = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !settled ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const output = resultText(block);
			return {
				name: skillName(argsRaw, block.callId),
				output,
				errorSummary: state === "error" && output !== null ? firstLine(output) : null,
				state
			};
		}
		/** State substitution for the collapsed leading slot. */
		function leadingFor(state) {
			switch (state) {
				case "error": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
				case "stopped": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
				default: return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutline16, { size: 14 });
			}
		}
		/** Leading disclosure slot: state icon at rest, chevron on hover or while open. */
		function disclosureLeading(state, open, expandable) {
			if (open) return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: SkillRow_module_css_default.chevron });
			const icon = leadingFor(state);
			if (!expandable) return icon;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
				className: SkillRow_module_css_default.iconIdle,
				children: icon
			}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: `${SkillRow_module_css_default.chevron} ${SkillRow_module_css_default.chevronHover}` })] });
		}
		/** Visually hidden state copy for the colour-only lifecycle cues. */
		function stateStatus(state, t) {
			switch (state) {
				case "running": return t("row.running");
				case "error": return t("row.failed");
				case "stopped": return t("row.stopped");
				default: return null;
			}
		}
		/**
		* Render one `skill` tool call as an accent summary and instructions disclosure.
		* @param props - keyed toolview payload plus the skill locale seat.
		* @returns the dedicated skill row.
		*/
		function SkillRow({ block, inspect, t }) {
			const model = skillRowModel(block);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const expandable = model.output !== null;
			const open = expanded && expandable;
			const status = stateStatus(model.state, t);
			const summary = model.errorSummary ?? model.name;
			const toggleExpand = () => {
				setExpanded((value) => !value);
			};
			const toggleFromKeyboard = (event) => {
				if (!expandable || event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				toggleExpand();
			};
			const disclosureProps = expandable ? {
				role: "button",
				tabIndex: 0,
				"aria-expanded": open,
				onClick: toggleExpand,
				onKeyDown: toggleFromKeyboard
			} : {};
			const leading = disclosureLeading(model.state, open, expandable);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: SkillRow_module_css_default.card,
				"data-tool": "skill",
				"data-state": model.state,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: SkillRow_module_css_default.row,
					"data-expandable": expandable || void 0,
					...disclosureProps,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: SkillRow_module_css_default.leading,
							children: leading
						}),
						status !== null ? (0, react_jsx_runtime.jsx)("span", {
							className: SkillRow_module_css_default.visuallyHidden,
							children: status
						}) : null,
						(0, react_jsx_runtime.jsx)("span", {
							className: SkillRow_module_css_default.title,
							children: t("row.title")
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: SkillRow_module_css_default.separator,
							"aria-hidden": true
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: model.errorSummary === null ? SkillRow_module_css_default.summary : `${SkillRow_module_css_default.summary} ${SkillRow_module_css_default.errorSummary}`,
							children: summary
						})
					]
				}), open ? (0, react_jsx_runtime.jsxs)("div", {
					className: SkillRow_module_css_default.bodyWrap,
					children: [(0, react_jsx_runtime.jsxs)("section", {
						className: SkillRow_module_css_default.instructionsCard,
						"aria-label": t("row.instructions"),
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: SkillRow_module_css_default.instructionsHeader,
							children: t("row.instructions")
						}), (0, react_jsx_runtime.jsx)("pre", {
							className: SkillRow_module_css_default.instructions,
							"data-error": model.state === "error" || void 0,
							children: model.output
						})]
					}), inspect !== void 0 ? (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SkillRow_module_css_default.inspectButton,
						onClick: inspect,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {}), t("row.inspect")]
					}) : null]
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `skill` namespace dictionaries for the dedicated tool row. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "skill";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"row.title": "Skill",
			"row.running": "正在加载 skill",
			"row.failed": "skill 加载失败",
			"row.stopped": "skill 加载已中止",
			"row.instructions": "说明",
			"row.inspect": "查看",
			"menu.userOnly": "仅用户"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"row.title": "Skill",
			"row.running": "Loading skill",
			"row.failed": "Skill load failed",
			"row.stopped": "Skill load stopped",
			"row.instructions": "Instructions",
			"row.inspect": "Inspect",
			"menu.userOnly": "user-only"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services: reference source faces plus the tool-row and locale registries. */
		const inject = [
			"inputTriggers",
			"sessions",
			"slots",
			"locale",
			"remote",
			"remote.skills"
		];
		/**
		* Client plugin body: register the '/' source, dictionaries, and keyed tool row.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-skill: dictionaries");
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "skill",
				locale: NS
			}, SkillRow));
			const skills = ctx.remote.skills;
			const sessions = ctx.sessions;
			const fetches = /* @__PURE__ */ new Map();
			const lexiconListeners = /* @__PURE__ */ new Map();
			const notifyLexicon = (sessionId) => {
				for (const listener of [...lexiconListeners.get(sessionId) ?? []]) try {
					listener();
				} catch (error) {
					console.error("[ui-skill] lexicon listener failed:", error);
				}
			};
			const fetchCatalog = (sessionId) => {
				if (sessions.subagentAddress(sessionId) !== void 0) return Promise.resolve([]);
				const existing = fetches.get(sessionId);
				if (existing !== void 0) return existing.promise;
				const abort = new AbortController();
				const promise = (async () => {
					const result = await skills.list({ sessionId }, abort.signal);
					if (!result.ok) throw new Error(`skills/list failed: ${result.error.code}: ${result.error.message}`);
					return result.value.skills;
				})();
				const entry = {
					promise,
					abort
				};
				fetches.set(sessionId, entry);
				promise.then((skills) => {
					entry.settled = skills;
					notifyLexicon(sessionId);
				}, () => {
					if (fetches.get(sessionId) === entry) fetches.delete(sessionId);
				});
				return promise;
			};
			const invalidate = (key) => {
				const entry = fetches.get(key);
				if (entry === void 0) return;
				fetches.delete(key);
				entry.abort.abort();
				notifyLexicon(key);
			};
			const clearAll = () => {
				for (const key of [...fetches.keys()]) invalidate(key);
			};
			const t = ctx.locale.bind(NS);
			const source = {
				trigger: "/",
				name: "skill",
				order: 2,
				async candidates(session, { query, signal }) {
					const skills = await fetchCatalog(session.sessionId);
					if (signal.aborted) return [];
					return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(skills, query).map((skill) => ({
						name: skill.name,
						description: skill.modelInvocable ? skill.description : `${t("menu.userOnly")} · ${skill.description}`
					}));
				},
				warm(session) {
					fetchCatalog(session.sessionId).catch(() => {});
				},
				lexicon(session) {
					return fetches.get(session.sessionId)?.settled?.map((skill) => skill.name);
				},
				subscribeLexicon(session, listener) {
					const key = session.sessionId;
					const listeners = lexiconListeners.get(key) ?? /* @__PURE__ */ new Set();
					listeners.add(listener);
					lexiconListeners.set(key, listeners);
					return () => {
						listeners.delete(listener);
						if (listeners.size === 0) lexiconListeners.delete(key);
					};
				},
				onPick({ candidate }) {
					return { text: `/${candidate.name} ` };
				}
			};
			const inputTriggers = ctx.get("inputTriggers");
			ctx.remote.$on("agent-preset/selected", invalidate);
			ctx.on("connection/reset", clearAll);
			ctx.effect(() => {
				const unregister = inputTriggers.registerSource(source);
				return () => {
					unregister();
					clearAll();
				};
			}, "ui-skill: source");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
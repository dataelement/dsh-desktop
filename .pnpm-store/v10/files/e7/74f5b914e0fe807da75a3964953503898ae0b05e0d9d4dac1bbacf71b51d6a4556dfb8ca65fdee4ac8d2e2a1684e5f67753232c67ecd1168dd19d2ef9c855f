window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-agent-preset",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
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
		//#region lib/types/client/locales.js
		/** Locale bundles for the agent-preset hero chip, header label, and management section. */
		/** English copy. */
		const en = {
			error: "Could not load agent presets.",
			userTrust: "Custom",
			seatHint: "Agent preset for the session you are about to start",
			headerHint: "The agent preset this session runs, fixed when it started",
			nav: "Agent presets",
			sectionIntro: "A preset is the plugin composition one session's agent runs — its tools, prompt, and capabilities. Duplicate an existing one and make it yours, or let the agent draft one for you in Creator mode.",
			builtIn: "Built-in",
			setDefault: "Set as default",
			view: "View",
			presetStandardName: "Standard mode",
			presetStandardDescription: "Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.",
			presetPtcName: "PTC mode",
			presetPtcDescription: "Full coding agent without the workflow tool; other tools are exposed through the PTC mode SDK so the model can combine multi-step operations in one TypeScript program.",
			presetMinimalName: "Minimal mode",
			presetMinimalDescription: "Single-tool coding agent with a persistent shell.",
			presetCordisName: "Creator mode",
			presetCordisDescription: "Built for creating custom agent presets, with all Standard mode capabilities plus runtime inspection, plugin experiments, and preset-authoring guidance.",
			duplicate: "Duplicate",
			duplicateUnavailable: "This deployment has no writable preset directory",
			delete: "Delete",
			presetId: "Identifier",
			presetIdPlaceholder: "my-agent",
			displayName: "Name",
			displayNamePlaceholder: "Shown in the picker; defaults to the identifier",
			inUse: "In use",
			builtInGroup: "Built-in",
			customGroup: "Custom",
			noDescription: "No description.",
			brokenBadge: "Failed to load",
			brokenNoCopy: "A preset that failed to load cannot be duplicated",
			switchRefused: "Could not switch to {name}: {reason}",
			copyOf: "Copied from",
			composition: "Composition (agent.cordis.yml)",
			cancel: "Cancel",
			close: "Close",
			retry: "Retry",
			copyTitle: "Duplicate preset",
			copyIntro: "The whole preset is copied on this machine. The identifier becomes its directory name and cannot be changed later; everything else is edited in the preset's own files.",
			create: "Create",
			creating: "Creating…",
			creatorDraft: "Draft a custom preset with Creator mode",
			openLocation: "Open folder",
			showLocation: "Show location",
			revealedPathLabel: "Preset files:",
			idRequired: "Give the preset an identifier.",
			idInvalid: "Use lowercase letters, digits, and hyphens, starting with a letter or digit.",
			idTaken: "A preset with this identifier already exists.",
			deleteTitle: "Delete this preset?",
			deleteDescription: "The preset directory is deleted. Sessions already running on it keep working; new sessions cannot select it.",
			deleteConfirm: "Delete",
			deleting: "Deleting…"
		};
		/** Simplified Chinese copy. */
		const zh = {
			error: "无法加载 Agent 预设。",
			userTrust: "自定义",
			seatHint: "即将开始的这个会话所用的 Agent 预设",
			headerHint: "本会话运行的 Agent 预设，开始时即固定",
			nav: "Agent 预设",
			sectionIntro: "预设即一个会话的 Agent 所运行的插件组装 —— 它的工具、提示词与能力。复制一份既有预设改成自己的，或用「创造模式」让 Agent 帮你创建。",
			builtIn: "内置",
			setDefault: "设为默认",
			view: "查看",
			presetStandardName: "标准模式",
			presetStandardDescription: "功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。",
			presetPtcName: "PTC 模式",
			presetPtcDescription: "功能完整的编码 Agent，但默认不提供 workflow 工具；其他工具通过 PTC 模式 SDK 呈现，让模型用一个 TypeScript 程序组合多步操作。",
			presetMinimalName: "极简模式",
			presetMinimalDescription: "仅提供持久 shell 的单工具编码 Agent。",
			presetCordisName: "创造模式",
			presetCordisDescription: "用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。",
			duplicate: "复制",
			duplicateUnavailable: "此部署未配置可写的预设目录",
			delete: "删除",
			presetId: "标识符",
			presetIdPlaceholder: "my-agent",
			displayName: "名称",
			displayNamePlaceholder: "选择器中显示的名字，缺省用标识符",
			inUse: "当前使用",
			builtInGroup: "内置",
			customGroup: "自定义",
			noDescription: "暂无描述。",
			brokenBadge: "加载失败",
			brokenNoCopy: "预设加载失败，不能复制",
			switchRefused: "无法切换到「{name}」：{reason}",
			copyOf: "复制自",
			composition: "组装（agent.cordis.yml）",
			cancel: "取消",
			close: "关闭",
			retry: "重试",
			copyTitle: "复制预设",
			copyIntro: "整个预设会在本机复制一份。标识符将成为目录名，事后无法更改；其余内容之后直接在预设自己的文件里编辑。",
			create: "创建",
			creating: "正在创建…",
			creatorDraft: "用「创造模式」创作自定义预设",
			openLocation: "打开目录",
			showLocation: "查看路径",
			revealedPathLabel: "预设文件：",
			idRequired: "请填写标识符。",
			idInvalid: "只能使用小写字母、数字与连字符，且以字母或数字开头。",
			idTaken: "该标识符已被占用。",
			deleteTitle: "删除该预设？",
			deleteDescription: "预设目录将被删除。已在其上运行的会话不受影响；新会话将无法再选择它。",
			deleteConfirm: "删除",
			deleting: "正在删除…"
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-agent-preset/src/client/AgentPresetLabel.module.css.mjs
		const css$2 = ".SVAs4q_label{background:var(--dsw-alias-fill-tsp-secondary);max-width:180px;height:22px;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;border-radius:6px;align-items:center;gap:4px;padding:0 2px 0 0;font-size:12px;line-height:22px;display:inline-flex;overflow:hidden}.SVAs4q_icon{opacity:.7;flex:none}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetLabel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var AgentPresetLabel_module_css_default = {
			"icon": "SVAs4q_icon",
			"label": "SVAs4q_label"
		};
		//#endregion
		//#region lib/types/client/AgentPresetLabel.js
		/**
		* The session header's agent-preset label.
		*
		* Read-only by construction: a session's composition is fixed once its
		* conversation starts, and a header is only worth reading after that. Offering
		* a control here would promise a switch the host refuses; naming what the
		* session runs is the honest affordance, and the choice itself lives on the
		* new-session screen ({@link AgentPresetSeat}).
		*/
		/**
		* Render this session's agent-preset name beside its title.
		* @param props - composed slot props.
		* @returns the label, or null when the session records no preset.
		*/
		function AgentPresetLabel({ sessionId, useSessions, useAgentPresets, load, t }) {
			const preset = useSessions((state) => {
				const value = state.byId[sessionId]?.projectionValues?.agentPreset;
				return typeof value === "string" ? value : void 0;
			});
			const options = useAgentPresets((state) => state.options);
			(0, react.useEffect)(() => {
				if (preset !== void 0) load();
			}, [preset, load]);
			if (preset === void 0) return null;
			const option = options.find((entry) => entry.id === preset);
			const text = option === void 0 ? void 0 : presetDisplayText(option, t);
			return (0, react_jsx_runtime.jsxs)("span", {
				className: AgentPresetLabel_module_css_default.label,
				title: text?.description ?? t("headerHint"),
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {
					size: 14,
					className: AgentPresetLabel_module_css_default.icon
				}), text?.name ?? preset]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-agent-preset/src/client/AgentPresetSeat.module.css.mjs
		const css$1 = ".cubgiG_menuAnchor{min-width:54px;max-width:100%}.cubgiG_seat{min-width:0;max-width:min(100%,240px);min-height:28px;color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:16px;align-items:center;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.cubgiG_seat:not(:disabled):hover,.cubgiG_seat[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.cubgiG_seat:disabled{cursor:default;color:var(--dsw-alias-label-quaternary)}.cubgiG_seatIcon{color:var(--dsw-alias-label-primary);flex:none}.cubgiG_seatLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.cubgiG_introIcon{animation:.15s cubic-bezier(.16,1,.3,1) both cubgiG_seat-icon-in}@keyframes cubgiG_seat-icon-in{0%{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}.cubgiG_introText{white-space:pre;display:inline-block}.cubgiG_introChar{white-space:pre;opacity:0;animation:.4s ease-out forwards cubgiG_seat-char-in;display:inline-block}@keyframes cubgiG_seat-char-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.cubgiG_introIcon,.cubgiG_introChar{opacity:1;animation:none}}.cubgiG_chevron{color:var(--dsw-alias-label-caption);flex:none}.cubgiG_item{flex-direction:column;gap:2px;max-width:280px;display:flex}.cubgiG_itemName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.cubgiG_itemDesc{color:var(--dsw-alias-label-caption);white-space:normal;font-size:12px;line-height:16px}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetSeat.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var AgentPresetSeat_module_css_default = {
			"chevron": "cubgiG_chevron",
			"introChar": "cubgiG_introChar",
			"introIcon": "cubgiG_introIcon",
			"introText": "cubgiG_introText",
			"item": "cubgiG_item",
			"itemDesc": "cubgiG_itemDesc",
			"itemName": "cubgiG_itemName",
			"menuAnchor": "cubgiG_menuAnchor",
			"seat": "cubgiG_seat",
			"seat-char-in": "cubgiG_seat-char-in",
			"seat-icon-in": "cubgiG_seat-icon-in",
			"seatIcon": "cubgiG_seatIcon",
			"seatLabel": "cubgiG_seatLabel"
		};
		//#endregion
		//#region lib/types/client/AgentPresetSeat.js
		/**
		* The agent-preset chip on the new-session screen, beside the workspace
		* picker.
		*
		* It lives here rather than in the composer because the choice is only
		* available before a conversation starts: once a turn has run, the session's
		* history was produced under that preset's tools and the host refuses to swap
		* them. A control that spends most of its life disabled belongs on the screen
		* where it still works.
		*
		* The menu opens on the staged choice, which starts as the deployment default.
		* Picking stages; the choice reaches a session when one becomes current.
		*/
		const INTRO_TEXT_DELAY_MS = 150;
		const INTRO_CHAR_STAGGER_MS = 40;
		const INTRO_TEXT_REVEAL_MS = 200;
		const INTRO_CHAR_FADE_MS = 400;
		/**
		* How long a refused switch holds before fading.
		*
		* Longer than the primitive's default because this banner is the only place
		* the refusal appears. The chip's label has already snapped back to the
		* preset the session still runs, and a preset the host refuses to MOUNT is
		* one discovery reported healthy — its row on the settings page carries no
		* reason to go back and read, because there was nothing to see until the
		* rows actually ran.
		*/
		const REFUSAL_HOLD_MS = 8e3;
		/**
		* Per-character start offset for the introduce reveal.
		* @param count - character count of the shown preset name.
		* @returns milliseconds between successive character starts.
		*/
		function introStaggerMs(count) {
			if (count <= 1) return 0;
			return Math.min(INTRO_CHAR_STAGGER_MS, INTRO_TEXT_REVEAL_MS / (count - 1));
		}
		/**
		* Render the new-session agent-preset chip.
		* @param props - composed slot props.
		* @returns the chip, or null when the deployment composes no presets.
		*/
		function AgentPresetSeat({ load, select, introduced, useAgentPresetSeat, t }) {
			const state = useAgentPresetSeat((snapshot) => snapshot);
			const [open, setOpen] = (0, react.useState)(false);
			const toastSeq = (0, react.useRef)(0);
			const [toast, setToast] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const chosen = state.options.find((option) => option.id === state.current);
			const label = (chosen === void 0 ? void 0 : presetDisplayText(chosen, t))?.name ?? state.current;
			const ready = state.options.length > 0 && state.current !== "";
			const [introducing, setIntroducing] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!state.introduce || !ready) return;
				const characters = Array.from(label);
				if (characters.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
					introduced();
					return;
				}
				setIntroducing(true);
				const done = window.setTimeout(() => {
					setIntroducing(false);
					introduced();
				}, INTRO_TEXT_DELAY_MS + (characters.length - 1) * introStaggerMs(characters.length) + INTRO_CHAR_FADE_MS);
				return () => {
					window.clearTimeout(done);
				};
			}, [
				state.introduce,
				ready,
				label,
				introduced
			]);
			if (!ready) return null;
			const characters = Array.from(label);
			const stagger = introStaggerMs(characters.length);
			const shownLabel = introducing ? (0, react_jsx_runtime.jsx)("span", {
				className: AgentPresetSeat_module_css_default.introText,
				children: characters.map((character, index) => (0, react_jsx_runtime.jsx)("span", {
					className: AgentPresetSeat_module_css_default.introChar,
					style: { animationDelay: `${INTRO_TEXT_DELAY_MS + index * stagger}ms` },
					children: character
				}, index))
			}) : label;
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: state.options.map((option) => {
					const text = presetDisplayText(option, t);
					return {
						id: option.id,
						label: (0, react_jsx_runtime.jsxs)("span", {
							className: AgentPresetSeat_module_css_default.item,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSeat_module_css_default.itemName,
								children: text.name
							}), (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSeat_module_css_default.itemDesc,
								children: text.description ?? t("noDescription")
							})]
						})
					};
				}),
				selectedId: state.current,
				onSelect: (id) => {
					setOpen(false);
					const picked = state.options.find((option) => option.id === id);
					/* v8 ignore next */
					const name = picked === void 0 ? id : presetDisplayText(picked, t).name;
					select(id).then((refusal) => {
						if (refusal === void 0) return;
						toastSeq.current += 1;
						setToast({
							seq: toastSeq.current,
							text: t("switchRefused", {
								name,
								reason: refusal
							})
						});
					});
				},
				align: "start",
				portal: true,
				className: AgentPresetSeat_module_css_default.menuAnchor,
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: AgentPresetSeat_module_css_default.seat,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					title: state.error ?? t("seatHint"),
					disabled: state.busy,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { className: introducing ? `${AgentPresetSeat_module_css_default.seatIcon} ${AgentPresetSeat_module_css_default.introIcon}` : AgentPresetSeat_module_css_default.seatIcon }),
						(0, react_jsx_runtime.jsx)("span", {
							className: AgentPresetSeat_module_css_default.seatLabel,
							children: shownLabel
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: AgentPresetSeat_module_css_default.chevron })
					]
				})
			}), toast !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: toast.text,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
				holdMs: REFUSAL_HOLD_MS,
				anchor: document.querySelector("[data-composer-card]"),
				onDone: () => {
					setToast(null);
				}
			}, toast.seq)] });
		}
		//#endregion
		//#region lib/types/client/settings-store.js
		/**
		* Agent-preset roster store shared by the display surfaces.
		*
		* Options come from one `agentPresets.list` call. Writes target the settings
		* namespace's `default` field, which is what the host resolves at creation;
		* the management section is the surface that writes it.
		*/
		/** The agent-preset settings namespace on the host wire. */
		const AGENT_PRESET_SETTINGS_NS = "agent-presets";
		/**
		* Persist one preset as the default for sessions created later.
		*
		* The default is a settings field rather than a preset property; the
		* management section writes it here — one home for which namespace and field
		* the host resolves at session creation.
		* @param ctx - the browser plugin context carrying the Remote namespaces.
		* @param id - the preset to make default.
		* @returns the failure message, or undefined once the write landed.
		*/
		async function writeDefaultPreset(ctx, id) {
			const response = await ctx.remote.settings.update(AGENT_PRESET_SETTINGS_NS, { default: id }, void 0);
			return response.ok ? void 0 : response.error.message;
		}
		const EMPTY_ROSTER = {
			presets: [],
			authorable: false
		};
		/**
		* Read the roster, turning a refusal into the message every surface shows.
		* @param ctx - the browser plugin context carrying the Remote namespaces.
		* @returns the roster, or the message to show in its place.
		*/
		async function readRoster(ctx) {
			const result = await ctx.remote.agentPresets.list();
			if (result.ok) return {
				ok: true,
				value: result.value
			};
			if (result.error.code === "gateway/invocation-unavailable") return {
				ok: true,
				value: EMPTY_ROSTER
			};
			return {
				ok: false,
				error: result.error.message
			};
		}
		/**
		* The opening move every roster-backed surface makes: refuse a read that is
		* already in flight, mark the store loading, then read.
		*
		* A surface that gets `undefined` returns without touching its snapshot
		* further — either another read owns it, or this one already wrote the
		* failure. What differs between surfaces starts after this.
		* @param ctx - the browser plugin context carrying the Remote namespaces.
		* @param store - the surface's own snapshot store.
		* @returns the roster, or undefined when the caller should return.
		*/
		async function beginRosterRead(ctx, store) {
			const before = store.getSnapshot();
			if (before.status === "loading") return void 0;
			store.set({
				...before,
				status: "loading",
				error: null
			});
			const roster = await readRoster(ctx);
			if (roster.ok) return roster.value;
			store.set({
				...store.getSnapshot(),
				status: "error",
				error: roster.error
			});
		}
		/**
		* The roster entries as the pickers render them: healthy presets only.
		*
		* The chip exists to choose the NEXT session's composition, and a broken
		* preset cannot compose one — offering it would defer the discovery of that
		* fact to a failed session start. The management section renders the full
		* roster (broken rows included) from its own store instead.
		*
		* The chip, the header label, and the management section all show the same
		* facts, and `exactOptionalPropertyTypes` makes "absent" and "present as
		* undefined" different shapes — so the spread dance belongs in one place rather than
		* once per store.
		* @param presets - the roster the host answered with.
		* @returns one option per selectable preset, in roster order.
		*/
		function presetOptions(presets) {
			return presets.filter((preset) => preset.broken === void 0).map((preset) => ({
				id: preset.id,
				trust: preset.trust,
				...preset.name === void 0 ? {} : { name: preset.name },
				...preset.description === void 0 ? {} : { description: preset.description }
			}));
		}
		const INITIAL$2 = {
			status: "idle",
			error: null,
			options: []
		};
		/** Reads the roster for the surfaces that only display it. */
		var AgentPresetSettingsController = class {
			ctx;
			/** Roster snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL$2);
			/**
			* @param ctx - the browser plugin context (the roster read).
			*/
			constructor(ctx) {
				this.ctx = ctx;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/**
			* Load the roster. An empty roster means the deployment composes no
			* presets, which is a valid deployment rather than a failure — the
			* surfaces report `unavailable` and render nothing.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const roster = await beginRosterRead(this.ctx, this.store);
				if (roster === void 0) return;
				const { presets } = roster;
				if (presets.length === 0) {
					this.set({
						status: "unavailable",
						options: []
					});
					return;
				}
				this.set({
					status: "ready",
					error: null,
					options: presetOptions(presets)
				});
			}
		};
		//#endregion
		//#region lib/types/client/section-store.js
		/**
		* Agent-preset management controller: the roster as a list, a copy dialog as
		* the only way a preset is created, and a read-only viewer over the shipped
		* compositions.
		*
		* The browser edits no composition text. A new preset is a host-side copy of
		* an existing one (`{ from, id, name? }` is all that crosses the wire), and
		* everything after creation happens in the preset's own files — which is why
		* the page's other job is getting the user TO those files: open the directory
		* where the host has a desktop, show its path where it does not.
		*
		* The host stays the single fact source. Every mutation writes through the
		* wire and the page re-reads the roster afterwards, because a copy changes
		* more than the row it targeted.
		*/
		/** Ids a preset directory may be named, mirroring the host's own rule. */
		const PRESET_ID = /^[a-z0-9][a-z0-9-]*$/;
		const INITIAL$1 = {
			status: "idle",
			error: null,
			authorable: false,
			hasDocument: false,
			rows: [],
			copy: null,
			view: null,
			pendingDelete: null,
			deleting: false,
			revealedPaths: {}
		};
		/**
		* Why this copy cannot be submitted yet, as a locale key, or undefined when
		* it can. Client-side only: the host re-checks the id and its answer is what
		* the dialog reports on failure.
		* @param draft - the open copy dialog.
		* @param rows - the roster, for the collision check.
		* @returns the blocking reason's locale key, or undefined when submittable.
		*/
		function draftBlocker(draft, rows) {
			if (draft.id === "") return "idRequired";
			if (!PRESET_ID.test(draft.id)) return "idInvalid";
			if (rows.some((row) => row.id === draft.id)) return "idTaken";
		}
		/** Reads the roster and drives the copy dialog, viewer, and location reveals. */
		var AgentPresetSectionController = class {
			ctx;
			rosterChanged;
			/** Page snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL$1);
			constructor(ctx, rosterChanged = () => {}) {
				this.ctx = ctx;
				this.rosterChanged = rosterChanged;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			patchCopy(patch) {
				const { copy } = this.store.getSnapshot();
				if (copy === null) return;
				this.set({ copy: {
					...copy,
					...patch
				} });
			}
			/**
			* Load the roster. An empty roster means the deployment composes no
			* presets, which is a valid deployment rather than a failure — the section
			* reports `unavailable` and renders nothing.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const opener = this.ctx.remote.settings.canOpenAgentPresetDirectory();
				const roster = await beginRosterRead(this.ctx, this.store);
				const described = await opener;
				if (roster === void 0) return;
				const { presets, authorable } = roster;
				const hasDocument = described.ok && described.value;
				if (presets.length === 0) {
					this.set({
						status: "unavailable",
						rows: [],
						authorable,
						hasDocument,
						copy: null,
						view: null
					});
					return;
				}
				const revealed = this.store.getSnapshot().revealedPaths;
				const kept = Object.fromEntries(Object.entries(revealed).filter(([id]) => presets.some((preset) => preset.id === id)));
				this.set({
					status: "ready",
					error: null,
					authorable,
					hasDocument,
					rows: presets.map((preset) => ({ ...preset })),
					revealedPaths: kept
				});
			}
			/**
			* Open one shipped preset's composition in the read-only viewer.
			* @param id - the preset to view.
			* @returns once the composition loaded or the failure is on the page.
			*/
			async view(id) {
				this.set({ error: null });
				const result = await this.ctx.remote.agentPresets.read(id);
				if (!result.ok) {
					this.set({ error: result.error.message });
					return;
				}
				const { name, content } = result.value;
				this.set({ view: {
					id,
					title: name ?? id,
					content
				} });
			}
			/** Close the read-only viewer. */
			closeView() {
				this.set({ view: null });
			}
			/**
			* Open the copy dialog over one preset.
			* @param from - the preset the copy will start from.
			*/
			beginCopy(from) {
				const row = this.store.getSnapshot().rows.find((candidate) => candidate.id === from);
				this.set({
					error: null,
					copy: {
						from,
						fromTitle: row?.name ?? from,
						id: "",
						name: "",
						saving: false,
						error: null
					}
				});
			}
			/** Close the copy dialog, discarding whatever was typed. */
			cancelCopy() {
				this.set({ copy: null });
			}
			/**
			* Name the preset the copy creates.
			* @param id - the id typed into the dialog.
			*/
			setCopyId(id) {
				this.patchCopy({
					id,
					error: null
				});
			}
			/**
			* Name the copy's display name.
			* @param name - the display name typed into the dialog.
			*/
			setCopyName(name) {
				this.patchCopy({
					name,
					error: null
				});
			}
			/**
			* Submit the copy, re-read the roster, then take the user to the new
			* preset's files — the directory opens where the host has a desktop, and
			* its path appears on the new row where it does not.
			* @returns once the copy settled and the page reflects it.
			*/
			async confirmCopy() {
				const draft = this.store.getSnapshot().copy;
				if (draft === null || draft.saving) return;
				if (draftBlocker(draft, this.store.getSnapshot().rows) !== void 0) return;
				this.patchCopy({
					saving: true,
					error: null
				});
				const name = draft.name.trim();
				const result = await this.ctx.remote.agentPresets.copy(draft.from, draft.id, name === "" ? void 0 : name);
				if (!result.ok) {
					this.patchCopy({
						saving: false,
						error: result.error.message
					});
					return;
				}
				this.set({ copy: null });
				await this.load();
				this.rosterChanged();
				await this.openLocation(draft.id);
			}
			/**
			* Open one preset's directory on the host desktop, or reveal its path on
			* the row where the deployment has no opener to hand it to.
			* @param id - the preset whose files the user wants.
			* @returns once the host answered and the page reflects it.
			*/
			async openLocation(id) {
				const result = await this.ctx.remote.settings.openAgentPresetDirectory(id);
				if (!result.ok) {
					this.set({ error: result.error.message });
					return;
				}
				if (result.value.opened) return;
				const { path } = result.value;
				this.set({ revealedPaths: {
					...this.store.getSnapshot().revealedPaths,
					[id]: path
				} });
			}
			/**
			* Ask for confirmation before deleting one preset.
			* @param id - the preset to delete, or null to dismiss the confirmation.
			*/
			confirmDelete(id) {
				if (this.store.getSnapshot().deleting) return;
				this.set({ pendingDelete: id });
			}
			/**
			* Delete the preset awaiting confirmation, then re-read the roster.
			*
			* A session already composed from it keeps running: its composition was
			* mounted at creation and nothing re-reads the file.
			* @returns once the delete settled and the page reflects it.
			*/
			async remove() {
				const { pendingDelete, deleting } = this.store.getSnapshot();
				if (pendingDelete === null || deleting) return;
				this.set({
					deleting: true,
					error: null
				});
				const result = await this.ctx.remote.agentPresets.deletePreset(pendingDelete);
				if (!result.ok) {
					this.set({
						deleting: false,
						pendingDelete: null,
						error: result.error.message
					});
					return;
				}
				this.set({
					deleting: false,
					pendingDelete: null
				});
				await this.load();
				this.rosterChanged();
			}
			/**
			* Make one preset the default for sessions created later. Running sessions
			* keep the composition they began with, so this never disturbs work.
			* @param id - the preset to make default.
			* @returns once the write settled and the roster was re-read.
			*/
			async makeDefault(id) {
				const failure = await writeDefaultPreset(this.ctx, id);
				if (failure !== void 0) {
					this.set({ error: failure });
					return;
				}
				await this.load();
			}
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-agent-preset/src/client/AgentPresetSection.module.css.mjs
		const css = ".rtSEdW_section{max-width:720px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.rtSEdW_title{margin:0;font-size:18px;font-weight:600}.rtSEdW_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.rtSEdW_group{flex-direction:column;gap:10px;display:flex}.rtSEdW_group+.rtSEdW_group{margin-top:20px}.rtSEdW_groupHead{letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;font-weight:600}.rtSEdW_cards{grid-template-columns:repeat(auto-fill,minmax(268px,1fr));grid-auto-rows:1fr;gap:12px;margin:0;padding:0;list-style:none;display:grid}.rtSEdW_card{border:.5px solid var(--dsw-alias-border-l4);background:0 0;border-radius:20px;flex-direction:column;transition:border-color .16s,background .16s;display:flex}.rtSEdW_card:hover:not(.rtSEdW_cardActive){background:var(--dsw-alias-interactive-bg-hover)}.rtSEdW_cardActive{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}.rtSEdW_cardBroken,.rtSEdW_cardBroken:hover{border-color:var(--dsw-alias-state-error-primary)}.rtSEdW_brokenBadge{corner-shape:round;white-space:nowrap;background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-bg-layer-3);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.rtSEdW_brokenTip{z-index:1;background:var(--dsw-alias-label-primary);width:max-content;max-width:100%;color:var(--dsw-alias-bg-layer-3);text-align:left;white-space:pre-line;overflow-wrap:anywhere;opacity:0;pointer-events:none;border-radius:6px;padding:6px 8px;font-size:11px;font-weight:400;line-height:1.5;transition:opacity .12s;position:absolute;top:calc(100% + 6px);left:0}.rtSEdW_brokenBadge:hover .rtSEdW_brokenTip,.rtSEdW_cardMain:focus-visible .rtSEdW_brokenTip{opacity:1}.rtSEdW_cardMain[aria-disabled=true]{cursor:default}.rtSEdW_cardBrokenReason{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.rtSEdW_cardMain{appearance:none;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px 12px 0 0;flex-direction:column;flex:1;gap:8px;padding:14px 16px 12px;display:flex}.rtSEdW_cardMain:disabled{cursor:default}.rtSEdW_cardMain:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.rtSEdW_cardHead{align-items:center;gap:8px;display:flex;position:relative}.rtSEdW_cardName{font-size:15px;font-weight:600;line-height:1.4}.rtSEdW_inUse{margin-left:auto}.rtSEdW_cardDesc{color:var(--dsw-alias-label-secondary);-webkit-line-clamp:4;overflow-wrap:anywhere;-webkit-box-orient:vertical;min-height:42px;font-size:13px;line-height:1.55;display:-webkit-box;overflow:hidden}.rtSEdW_cardId{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsw-alias-label-tertiary);margin-top:auto;font-size:11px}.rtSEdW_cardFoot{border-top:.5px solid var(--dsw-alias-border-l2);justify-content:flex-end;gap:2px;padding:6px 10px;display:flex}.rtSEdW_iconButton{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:7px;align-items:center;padding:6px;display:inline-flex;position:relative}.rtSEdW_iconButton:disabled{opacity:.4;cursor:default}.rtSEdW_iconButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.rtSEdW_iconButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}.rtSEdW_iconButton:after{content:attr(data-tip);background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);white-space:nowrap;opacity:0;pointer-events:none;border-radius:6px;padding:3px 8px;font-size:11px;line-height:17px;transition:opacity .12s;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translate(-50%)}.rtSEdW_iconButton:hover:after,.rtSEdW_iconButton:focus-visible:after{opacity:1}.rtSEdW_iconDanger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.rtSEdW_revealedPath{color:var(--dsw-alias-label-tertiary);align-items:baseline;gap:6px;margin:0;padding:6px 16px 10px;font-size:11px;display:flex}.rtSEdW_revealedPath code{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);color:var(--dsw-alias-label-secondary);user-select:all;overflow-wrap:anywhere}.rtSEdW_revealedPathLabel{white-space:nowrap}.rtSEdW_secondaryButton{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:7px;padding:5px 8px;font-size:12.5px}.rtSEdW_secondaryButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}.rtSEdW_secondaryButton:disabled{opacity:.5;cursor:default}.rtSEdW_field{flex-direction:column;gap:6px;display:flex}.rtSEdW_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}.rtSEdW_input{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);font:inherit;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:10px;padding:9px 12px;font-size:13px}.rtSEdW_input:focus{border-color:var(--dsw-alias-brand-primary);outline:none}.rtSEdW_input::placeholder{color:var(--dsw-alias-label-dimmed)}.rtSEdW_dialog{width:min(560px,100%)}.rtSEdW_dialogFields{flex-direction:column;gap:12px;display:flex}.rtSEdW_viewerCode{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-2);max-height:min(52vh,480px);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);white-space:pre;tab-size:2;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:10px;margin:0;padding:12px;font-size:12.5px;line-height:1.5;overflow:auto}.rtSEdW_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px}.rtSEdW_deleteDialog{width:min(480px,100%)}.rtSEdW_deleteConfirm:not(:disabled){border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}.rtSEdW_deleteConfirm:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.rtSEdW_creatorButton{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l3);height:44px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:20px;justify-content:center;align-self:stretch;align-items:center;gap:6px;font-size:14px;line-height:22px;display:flex}.rtSEdW_creatorButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.rtSEdW_creatorButton:disabled{opacity:.4;cursor:default}";
		const tagId = "@deepseek-ai/dsh-client-ui-agent-preset/AgentPresetSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-agent-preset";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AgentPresetSection_module_css_default = {
			"brokenBadge": "rtSEdW_brokenBadge",
			"brokenTip": "rtSEdW_brokenTip",
			"card": "rtSEdW_card",
			"cardActive": "rtSEdW_cardActive",
			"cardBroken": "rtSEdW_cardBroken",
			"cardBrokenReason": "rtSEdW_cardBrokenReason",
			"cardDesc": "rtSEdW_cardDesc",
			"cardFoot": "rtSEdW_cardFoot",
			"cardHead": "rtSEdW_cardHead",
			"cardId": "rtSEdW_cardId",
			"cardMain": "rtSEdW_cardMain",
			"cardName": "rtSEdW_cardName",
			"cards": "rtSEdW_cards",
			"creatorButton": "rtSEdW_creatorButton",
			"deleteConfirm": "rtSEdW_deleteConfirm",
			"deleteDialog": "rtSEdW_deleteDialog",
			"dialog": "rtSEdW_dialog",
			"dialogFields": "rtSEdW_dialogFields",
			"error": "rtSEdW_error",
			"field": "rtSEdW_field",
			"fieldLabel": "rtSEdW_fieldLabel",
			"group": "rtSEdW_group",
			"groupHead": "rtSEdW_groupHead",
			"iconButton": "rtSEdW_iconButton",
			"iconDanger": "rtSEdW_iconDanger",
			"inUse": "rtSEdW_inUse",
			"input": "rtSEdW_input",
			"intro": "rtSEdW_intro",
			"revealedPath": "rtSEdW_revealedPath",
			"revealedPathLabel": "rtSEdW_revealedPathLabel",
			"secondaryButton": "rtSEdW_secondaryButton",
			"section": "rtSEdW_section",
			"title": "rtSEdW_title",
			"viewerCode": "rtSEdW_viewerCode"
		};
		//#endregion
		//#region lib/types/client/AgentPresetSection.js
		/**
		* Agent-presets settings section: the roster as cards, a copy dialog as the
		* only way a preset is created, and a read-only viewer over the shipped
		* compositions.
		*
		* The browser edits no composition text — a shipped preset opens read-only to
		* be READ (it is the known-good composition a copy starts from), and a custom
		* preset is edited in its own files, which is what the location action leads
		* to. Deleting a preset leaves running sessions alone: a composition is
		* mounted once at session creation and nothing re-reads the file.
		*/
		function CopyDialog({ state, t, actions }) {
			const draft = state.copy;
			const blocker = draft === null ? void 0 : draftBlocker(draft, state.rows);
			const message = draft === null ? null : draft.error ?? (blocker === void 0 ? null : t(blocker));
			const source = draft === null ? void 0 : state.rows.find((row) => row.id === draft.from);
			const sourceTitle = source === void 0 ? draft?.fromTitle : presetDisplayText(source, t).name;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: draft !== null,
				onClose: () => {
					actions.cancelCopy();
				},
				title: draft === null ? t("copyTitle") : `${t("copyTitle")} · ${t("copyOf")} ${sourceTitle}`,
				closeLabel: t("close"),
				description: t("copyIntro"),
				className: AgentPresetSection_module_css_default.dialog,
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: draft?.saving === true,
					onClick: () => {
						actions.cancelCopy();
					},
					children: t("cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					disabled: draft === null || draft.saving || blocker !== void 0,
					onClick: () => {
						actions.confirmCopy();
					},
					children: draft?.saving === true ? t("creating") : t("create")
				})] }),
				children: draft === null ? null : (0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetSection_module_css_default.dialogFields,
					children: [
						(0, react_jsx_runtime.jsxs)("label", {
							className: AgentPresetSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSection_module_css_default.fieldLabel,
								children: t("presetId")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: AgentPresetSection_module_css_default.input,
								value: draft.id,
								autoFocus: true,
								spellCheck: false,
								placeholder: t("presetIdPlaceholder"),
								onChange: (event) => {
									actions.setCopyId(event.target.value);
								}
							})]
						}),
						(0, react_jsx_runtime.jsxs)("label", {
							className: AgentPresetSection_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSection_module_css_default.fieldLabel,
								children: t("displayName")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: AgentPresetSection_module_css_default.input,
								value: draft.name,
								spellCheck: false,
								placeholder: t("displayNamePlaceholder"),
								onChange: (event) => {
									actions.setCopyName(event.target.value);
								}
							})]
						}),
						message === null ? null : (0, react_jsx_runtime.jsx)("p", {
							className: AgentPresetSection_module_css_default.error,
							role: "alert",
							children: message
						})
					]
				})
			});
		}
		/**
		* Render one card's description, clamped by CSS and offered in full on hover.
		* The tooltip is attached only while the text is actually cut off, so a short
		* description does not answer a hover with a bubble repeating the card.
		* @param props.text - the description as rendered, already localized.
		* @returns the description element, tooltip-anchored while it overflows.
		*/
		function CardDescription({ text }) {
			const ref = (0, react.useRef)(null);
			const [truncated, setTruncated] = (0, react.useState)(false);
			(0, react.useLayoutEffect)(() => {
				const el = ref.current;
				/* v8 ignore next -- the ref is attached before layout effects run. */
				if (el === null) return;
				const measure = () => {
					setTruncated(el.scrollHeight > el.clientHeight);
				};
				measure();
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver(measure);
				observer.observe(el);
				return () => {
					observer.disconnect();
				};
			}, [text]);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: text,
				side: "bottom",
				delayMs: 400,
				disabled: !truncated,
				maxWidth: 360,
				children: (0, react_jsx_runtime.jsx)("span", {
					ref,
					className: AgentPresetSection_module_css_default.cardDesc,
					title: "",
					children: text
				})
			});
		}
		/**
		* Render the Agent presets section content column.
		* @param props - composed slot props.
		* @returns the section, or null when the deployment composes no presets.
		*/
		function AgentPresetSection(props) {
			const { useAgentPresetSection, t, load } = props;
			const state = useAgentPresetSection((snapshot) => snapshot);
			const viewedId = state.view?.id;
			const viewedRow = viewedId === void 0 ? void 0 : state.rows.find((row) => row.id === viewedId);
			const viewedTitle = state.view === null ? "" : viewedRow === void 0 ? state.view.title : presetDisplayText(viewedRow, t).name;
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			if (state.status === "unavailable") return null;
			if (state.status === "error") {
				/* v8 ignore next -- an error status always carries text; the fallback satisfies the nullable type */
				const detail = state.error ?? "";
				return (0, react_jsx_runtime.jsxs)("div", {
					className: AgentPresetSection_module_css_default.section,
					children: [(0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.error,
						role: "alert",
						children: `${t("error")} ${detail}`
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: AgentPresetSection_module_css_default.secondaryButton,
						onClick: () => {
							load();
						},
						children: t("retry")
					})]
				});
			}
			const creatorButton = props.startCreatorDraft !== void 0 && state.rows.some((row) => row.id === "cordis") ? (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: AgentPresetSection_module_css_default.creatorButton,
				disabled: !state.authorable,
				title: state.authorable ? void 0 : t("duplicateUnavailable"),
				onClick: () => {
					props.startCreatorDraft?.();
					props.close();
				},
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), t("creatorDraft")]
			}) : null;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: AgentPresetSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: AgentPresetSection_module_css_default.title,
						children: t("nav")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.intro,
						children: t("sectionIntro")
					}),
					state.error === null ? null : (0, react_jsx_runtime.jsx)("p", {
						className: AgentPresetSection_module_css_default.error,
						role: "alert",
						children: state.error
					}),
					[["system", t("builtInGroup")], ["user", t("customGroup")]].map(([trust, heading]) => {
						const group = state.rows.filter((row) => row.trust === trust).map((row) => ({
							row,
							text: presetDisplayText(row, t)
						}));
						const tail = trust === "user" ? creatorButton : null;
						if (group.length === 0 && tail === null) return null;
						return (0, react_jsx_runtime.jsxs)("section", {
							className: AgentPresetSection_module_css_default.group,
							children: [
								(0, react_jsx_runtime.jsx)("h3", {
									className: AgentPresetSection_module_css_default.groupHead,
									children: heading
								}),
								group.length === 0 ? null : (0, react_jsx_runtime.jsx)("ul", {
									className: AgentPresetSection_module_css_default.cards,
									children: group.map(({ row, text }) => (0, react_jsx_runtime.jsxs)("li", {
										className: row.broken !== void 0 ? `${AgentPresetSection_module_css_default.card} ${AgentPresetSection_module_css_default.cardBroken}` : row.isDefault ? `${AgentPresetSection_module_css_default.card} ${AgentPresetSection_module_css_default.cardActive}` : AgentPresetSection_module_css_default.card,
										children: [
											(0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: AgentPresetSection_module_css_default.cardMain,
												"aria-pressed": row.isDefault,
												disabled: row.isDefault,
												"aria-disabled": row.broken !== void 0,
												"aria-label": `${row.broken !== void 0 ? t("brokenBadge") : row.isDefault ? t("inUse") : t("setDefault")}: ${text.name}`,
												title: row.broken !== void 0 ? t("brokenBadge") : row.isDefault ? t("inUse") : t("setDefault"),
												onClick: () => {
													if (row.broken !== void 0) return;
													props.makeDefault(row.id);
												},
												children: [
													(0, react_jsx_runtime.jsxs)("span", {
														className: AgentPresetSection_module_css_default.cardHead,
														children: [
															(0, react_jsx_runtime.jsx)("span", {
																className: AgentPresetSection_module_css_default.cardName,
																children: text.name
															}),
															row.broken !== void 0 ? (0, react_jsx_runtime.jsxs)("span", {
																className: AgentPresetSection_module_css_default.brokenBadge,
																children: [t("brokenBadge"), (0, react_jsx_runtime.jsx)("span", {
																	className: AgentPresetSection_module_css_default.brokenTip,
																	"aria-hidden": "true",
																	children: row.broken
																})]
															}) : null,
															(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, { children: row.trust === "user" ? t("userTrust") : t("builtIn") }),
															row.isDefault ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
																tone: "solid",
																className: AgentPresetSection_module_css_default.inUse,
																children: t("inUse")
															}) : null
														]
													}),
													(0, react_jsx_runtime.jsx)(CardDescription, { text: text.description ?? t("noDescription") }),
													row.broken === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
														className: AgentPresetSection_module_css_default.cardBrokenReason,
														role: "alert",
														children: row.broken
													}),
													(0, react_jsx_runtime.jsx)("code", {
														className: AgentPresetSection_module_css_default.cardId,
														children: row.id
													})
												]
											}),
											(0, react_jsx_runtime.jsxs)("div", {
												className: AgentPresetSection_module_css_default.cardFoot,
												children: [
													row.trust === "system" ? row.broken === void 0 ? (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														"data-tip": t("view"),
														"aria-label": `${t("view")}: ${text.name}`,
														onClick: () => {
															props.view(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {})
													}) : null : (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														"data-tip": state.hasDocument ? t("openLocation") : t("showLocation"),
														"aria-label": `${state.hasDocument ? t("openLocation") : t("showLocation")}: ${text.name}`,
														onClick: () => {
															props.openLocation(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {})
													}),
													(0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: AgentPresetSection_module_css_default.iconButton,
														disabled: !state.authorable || row.broken !== void 0,
														"data-tip": row.broken !== void 0 ? t("brokenNoCopy") : state.authorable ? t("duplicate") : t("duplicateUnavailable"),
														"aria-label": `${t("duplicate")}: ${text.name}`,
														onClick: () => {
															props.beginCopy(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {})
													}),
													row.trust === "user" ? (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: `${AgentPresetSection_module_css_default.iconButton} ${AgentPresetSection_module_css_default.iconDanger}`,
														"data-tip": t("delete"),
														"aria-label": `${t("delete")}: ${text.name}`,
														onClick: () => {
															props.confirmDelete(row.id);
														},
														children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
													}) : null
												]
											}),
											state.revealedPaths[row.id] === void 0 ? null : (0, react_jsx_runtime.jsxs)("p", {
												className: AgentPresetSection_module_css_default.revealedPath,
												children: [(0, react_jsx_runtime.jsx)("span", {
													className: AgentPresetSection_module_css_default.revealedPathLabel,
													children: t("revealedPathLabel")
												}), (0, react_jsx_runtime.jsx)("code", { children: state.revealedPaths[row.id] })]
											})
										]
									}, row.id))
								}),
								tail
							]
						}, trust);
					}),
					(0, react_jsx_runtime.jsx)(CopyDialog, {
						state,
						t,
						actions: {
							cancelCopy: props.cancelCopy,
							confirmCopy: props.confirmCopy,
							setCopyId: props.setCopyId,
							setCopyName: props.setCopyName
						}
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: state.view !== null,
						onClose: () => {
							props.closeView();
						},
						title: state.view === null ? "" : `${t("view")} · ${viewedTitle}`,
						closeLabel: t("close"),
						description: t("composition"),
						className: AgentPresetSection_module_css_default.dialog,
						footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							autoFocus: true,
							onClick: () => {
								props.closeView();
							},
							children: t("close")
						}),
						children: state.view === null ? null : (0, react_jsx_runtime.jsx)("pre", {
							className: AgentPresetSection_module_css_default.viewerCode,
							children: state.view.content
						})
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: state.pendingDelete !== null,
						onClose: () => {
							props.confirmDelete(null);
						},
						title: t("deleteTitle"),
						closeLabel: t("close"),
						description: t("deleteDescription"),
						className: AgentPresetSection_module_css_default.deleteDialog,
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							autoFocus: true,
							disabled: state.deleting,
							onClick: () => {
								props.confirmDelete(null);
							},
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: AgentPresetSection_module_css_default.deleteConfirm,
							disabled: state.deleting,
							onClick: () => {
								props.remove();
							},
							children: state.deleting ? t("deleting") : t("deleteConfirm")
						})] })
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/seat-store.js
		/**
		* Hero-chip controller: which preset the NEXT session gets.
		*
		* The new-session screen has no session, so a pick is staged rather than
		* applied. It reaches a session when one becomes current and is still blank —
		* whether the workspace connect created it or reused an existing blank one,
		* which is why staging cannot simply ride along on `sessions.create`.
		*
		* The stage is forgotten once applied: the next new session starts from the
		* deployment default again, matching the workspace picker beside it.
		*/
		const INITIAL = {
			options: [],
			current: "",
			error: null,
			busy: false,
			introduce: false
		};
		/** Stages the next session's preset and applies it when one appears. */
		var AgentPresetSeatController = class {
			ctx;
			currentSession;
			/** Chip snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL);
			/**
			* The deployment default, so a consumed stage can fall back to it without
			* re-reading the roster.
			*/
			fallback = "";
			/** Set while a pick is waiting for a session; cleared once applied. */
			staged;
			constructor(ctx, currentSession) {
				this.ctx = ctx;
				this.currentSession = currentSession;
			}
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
			/**
			* Read the roster and open the chip on the deployment default.
			* @returns once the snapshot reflects the host.
			*/
			async load() {
				const roster = await readRoster(this.ctx);
				if (!roster.ok) {
					this.set({ error: roster.error });
					return;
				}
				const { presets } = roster.value;
				this.fallback = presets.find((preset) => preset.isDefault)?.id ?? presets[0]?.id ?? "";
				const session = this.currentSession();
				this.set({
					options: presetOptions(presets),
					current: this.staged ?? (session === void 0 ? this.fallback : presetOf(session) ?? ""),
					error: null
				});
			}
			/**
			* Stage one preset for the next session, applying it immediately when a
			* blank session is already current.
			*
			* The refusal is returned as well as stored, because the two readers need
			* different things from it: the chip's own label carries the standing state,
			* while the caller that made this pick is the one that has to say why the
			* label came back — and only it knows the pick was a person's, not the
			* applier catching up with a session that just became current.
			* @param id - the preset to stage.
			* @returns the refusal text, or undefined once the pick settled.
			*/
			async select(id) {
				if (this.store.getSnapshot().busy) return void 0;
				this.stage(id);
				await this.apply();
				return this.store.getSnapshot().error ?? void 0;
			}
			/**
			* Stage a pick WITHOUT the immediate apply, for a flow that starts the
			* receiving session after the pick (the settings section's creator entry).
			* `select()`'s immediate apply would meet the still-current running session
			* and drop the stage as unservable; staging alone leaves it for the
			* list-change applier, which fires when the started session becomes
			* current.
			* @param id - the preset to stage.
			* @param introduce - true when the stage came from another screen and the
			* chip should announce itself on the session it lands on.
			*/
			stage(id, introduce = false) {
				this.staged = id;
				this.set({
					current: id,
					error: null,
					introduce
				});
			}
			/** Acknowledge the introduction cue once the chip has played it. */
			introduced() {
				if (!this.store.getSnapshot().introduce) return;
				this.set({ introduce: false });
			}
			/**
			* Hand the staged choice to the current session, if there is one to take it.
			*
			* Called both by `select()` and by whoever observes the current session
			* changing, because the session may appear either before or after the pick.
			* @returns once the switch settled, or immediately when there is nothing to do.
			*/
			async apply() {
				const staged = this.staged;
				const session = this.currentSession();
				if (staged === void 0) {
					const current = session === void 0 ? this.fallback : presetOf(session) ?? "";
					if (current !== this.store.getSnapshot().current) this.set({ current });
					return;
				}
				if (session === void 0) return;
				if (!session.blank || presetOf(session) === staged) {
					this.staged = void 0;
					return;
				}
				this.set({
					busy: true,
					error: null
				});
				const result = await this.ctx.remote.agentPresets.select(session.id, staged);
				this.staged = void 0;
				if (!result.ok) {
					const { error } = result;
					this.set({
						busy: false,
						error: "reason" in error.details && typeof error.details.reason === "string" ? error.details.reason : error.message,
						current: presetOf(session) ?? ""
					});
					return;
				}
				this.set({
					busy: false,
					current: result.value
				});
			}
		};
		function presetOf(session) {
			const value = session?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : void 0;
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Agent-preset surface plugin, browser half — three surfaces over one roster:
		* a chip on the new-session screen for the session about to start, a
		* read-only label in the session header, and a settings section that manages
		* the roster (copy, delete, default, and the way into a preset's own files).
		*
		* A running session keeps the composition it began with (the host refuses to
		* adopt an existing session under a different preset). That is what splits
		* the choice from the display: the hero chip is before-the-fact, while the
		* header only reports what a session already runs. The default preset is
		* edited where the roster is visible — the settings section's "make default"
		* — so General settings carries no duplicate control for the same field.
		*/
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.agentPresets",
			"remote.settings"
		];
		/**
		* Mount the roster surfaces: hero chip, session-header label, settings section.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const controller = new AgentPresetSettingsController(ctx);
			const rosterReaders = /* @__PURE__ */ new Set();
			const section = new AgentPresetSectionController(ctx, () => {
				controller.load();
				for (const read of rosterReaders) read();
			});
			ctx.effect(() => ctx.locale.register("settings.agentPreset", {
				zh,
				en
			}), "ui-agent-preset: settings row dictionaries");
			ctx.effect(() => {
				const refresh = () => {
					controller.load();
					if (section.store.getSnapshot().status !== "idle") section.load();
				};
				const disposers = [ctx.remote.$on("settings/document-updated", (ns) => {
					if (ns !== "agent-presets") return;
					refresh();
				}), ctx.on("connection/reset", () => {
					refresh();
				})];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "ui-agent-preset: settings refresh");
			let creatorDraft;
			ctx.inject([
				"slots",
				"conversation",
				"sessions",
				"uiWorkspace"
			], (scope) => {
				const seat = new AgentPresetSeatController(scope, () => {
					const state = scope.sessions.list.getSnapshot();
					return state.current === void 0 ? void 0 : state.byId[state.current];
				});
				const seatInjected = () => ({
					hooks: { agentPresetSeat: seat.store },
					load: () => seat.load(),
					select: (id) => seat.select(id),
					introduced: () => {
						seat.introduced();
					}
				});
				const labelInjected = () => ({
					hooks: { agentPresets: controller.store },
					load: () => controller.load()
				});
				scope.effect(() => {
					const stop = scope.sessions.list.subscribe(() => {
						seat.apply();
					});
					const settingsMoved = scope.remote.$on("settings/document-updated", (ns) => {
						if (ns !== "agent-presets") return;
						seat.load();
					});
					const readRoster = () => {
						seat.load();
					};
					rosterReaders.add(readRoster);
					creatorDraft = () => {
						seat.stage("cordis", true);
						scope.uiWorkspace.startSession();
					};
					const chip = scope.slots.register({
						name: "conversation.hero.agentPreset",
						locale: "settings.agentPreset",
						inject: seatInjected
					}, AgentPresetSeat);
					const label = scope.slots.register({
						name: "conversation.session.header.actions",
						id: "agent-preset",
						order: -10,
						locale: "settings.agentPreset",
						inject: labelInjected
					}, AgentPresetLabel);
					return () => {
						stop();
						settingsMoved();
						rosterReaders.delete(readRoster);
						creatorDraft = void 0;
						chip();
						label();
					};
				}, "ui-agent-preset: new-session chip and header label");
			});
			const sectionInjected = () => ({
				hooks: { agentPresetSection: section.store },
				load: () => section.load(),
				view: (id) => section.view(id),
				closeView: () => {
					section.closeView();
				},
				beginCopy: (from) => {
					section.beginCopy(from);
				},
				cancelCopy: () => {
					section.cancelCopy();
				},
				setCopyId: (id) => {
					section.setCopyId(id);
				},
				setCopyName: (name) => {
					section.setCopyName(name);
				},
				confirmCopy: () => section.confirmCopy(),
				openLocation: (id) => section.openLocation(id),
				...creatorDraft === void 0 ? {} : { startCreatorDraft: creatorDraft },
				confirmDelete: (id) => {
					section.confirmDelete(id);
				},
				remove: () => section.remove(),
				makeDefault: (id) => section.makeDefault(id)
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "agent-presets",
				order: 20,
				label: () => ctx.locale.bind("settings.agentPreset")("nav"),
				locale: "settings.agentPreset",
				inject: sectionInjected
			}, AgentPresetSection));
		}
		//#endregion
		exports.AGENT_PRESET_SETTINGS_NS = AGENT_PRESET_SETTINGS_NS;
		exports.apply = apply;
		exports.draftBlocker = draftBlocker;
		exports.inject = inject;
		exports.writeDefaultPreset = writeDefaultPreset;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
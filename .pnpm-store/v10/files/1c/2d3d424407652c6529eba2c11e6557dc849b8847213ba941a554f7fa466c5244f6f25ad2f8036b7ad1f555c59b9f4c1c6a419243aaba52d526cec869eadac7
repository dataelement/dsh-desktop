window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-plan",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-plan/src/client/PlanModeControl.module.css.mjs
		const css = ".rS3zOq_wrap{align-items:center;gap:6px;display:inline-flex}.rS3zOq_chip{corner-shape:round;background:var(--dsw-alias-state-warn-tertiary);min-width:34px;color:var(--dsw-alias-state-warn-label);cursor:pointer;border:none;border-radius:999px;align-items:center;gap:4px;padding:2px 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.rS3zOq_chip:hover:not(:disabled){color:var(--dsw-alias-state-warn-primary)}.rS3zOq_chip:focus-visible{outline:2px solid var(--dsw-alias-state-warn-label);outline-offset:2px}.rS3zOq_chip:disabled{opacity:.6;cursor:default}.rS3zOq_close{color:currentColor;align-items:center;display:inline-flex}.rS3zOq_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}";
		const tagId = "@deepseek-ai/dsh-client-ui-plan/PlanModeControl.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-plan";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PlanModeControl_module_css_default = {
			"chip": "rS3zOq_chip",
			"close": "rS3zOq_close",
			"error": "rS3zOq_error",
			"wrap": "rS3zOq_wrap"
		};
		//#endregion
		//#region lib/types/client/PlanModeControl.js
		/**
		* Plan-mode status over the host-computed `plan` projection. The chip renders
		* only while the effective target is plan mode (`pending ? !active : active`
		* — a folded host value, not client optimism) and executes /plan off.
		*/
		function PlanChip({ useProjection, locked, exitPlanMode, t }) {
			const plan = useProjection("plan");
			const [leaving, setLeaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const aliveRef = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				aliveRef.current = true;
				return () => {
					aliveRef.current = false;
				};
			}, []);
			if (plan === void 0) return null;
			if (!(plan.pending ? !plan.active : plan.active)) return null;
			const off = () => {
				setLeaving(true);
				setError(null);
				exitPlanMode().then((failure) => {
					if (!aliveRef.current) return;
					setLeaving(false);
					setError(failure);
				}, (reason) => {
					if (!aliveRef.current) return;
					setLeaving(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return (0, react_jsx_runtime.jsxs)("span", {
				className: PlanModeControl_module_css_default.wrap,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PlanModeControl_module_css_default.chip,
					"aria-label": t("chip.on.aria"),
					title: t("chip.on.title"),
					disabled: locked || leaving,
					onClick: off,
					children: [t("chip.label"), (0, react_jsx_runtime.jsx)("span", {
						className: PlanModeControl_module_css_default.close,
						"aria-hidden": true,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, { size: 12 })
					})]
				}), error !== null && (0, react_jsx_runtime.jsx)("span", {
					className: PlanModeControl_module_css_default.error,
					role: "status",
					title: error,
					children: t("chip.exitFailed")
				})]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `plan` namespace dictionaries (the composer plan chip's copy). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"chip.label": "Plan",
			"chip.on.aria": "plan mode 已开启，按下关闭",
			"chip.on.title": "plan mode 已开启 — 点击关闭（/plan off）",
			"chip.off.aria": "plan mode 已关闭，按下开启",
			"chip.off.title": "plan mode 已关闭 — 点击开启（/plan）",
			"chip.exitFailed": "退出 plan mode 失败"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"chip.label": "Plan",
			"chip.on.aria": "Plan mode on, press to turn off",
			"chip.on.title": "Plan mode on — click to turn off (/plan off)",
			"chip.off.aria": "Plan mode off, press to turn on",
			"chip.off.title": "Plan mode off — click to turn on (/plan)",
			"chip.exitFailed": "Failed to exit plan mode"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "plan";
		/** Required services: the seat's slot registry, commands Remote, and locale registry. */
		const inject = [
			"slots",
			"remote",
			"remote.commands",
			"locale"
		];
		/**
		* Client plugin body: register the plan chip over the command channel.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-plan: dictionaries");
			ctx.slots.inject("conversation.input.plan", () => ctx.slots.register({
				name: "conversation.input.plan",
				locale: NS,
				inject: (sessionId) => ({ exitPlanMode: async () => {
					const result = await ctx.remote.commands.execute(sessionId, "/plan off", []);
					if (!result.ok) return `${result.error.message} (${result.error.code})`;
					if (result.value === void 0) return "unknown command: /plan off";
					return null;
				} })
			}, PlanChip));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
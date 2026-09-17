window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-jobs",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-jobs/src/client/JobListAction.module.css.mjs
		const css = ".QsffPG_root{position:relative}.QsffPG_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:3px;padding:3px 2px;font-size:12px;line-height:18px;display:inline-flex}.QsffPG_trigger:hover,.QsffPG_trigger:focus-visible{color:var(--dsw-alias-label-secondary)}.QsffPG_trigger svg{transition:transform .12s}.QsffPG_triggerOpen{transform:rotate(180deg)}.QsffPG_triggerDot{flex:none}.QsffPG_count{margin:0 5px}.QsffPG_menu{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:336px;max-width:min(400px,100vw - 32px);max-height:min(420px,100vh - 140px);box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:20px;flex-direction:column;gap:1px;margin:0;padding:4px;list-style:none;display:flex;position:absolute;top:calc(100% + 5px);left:0;overflow:auto}.QsffPG_row{box-sizing:border-box;width:100%;min-height:32px;color:var(--dsw-alias-label-primary);border-radius:8px;align-items:center;gap:8px;padding:6px 8px;font-size:13px;line-height:18px;display:flex}.QsffPG_rowSettled{color:var(--dsw-alias-label-tertiary)}.QsffPG_rowDot{flex:none}.QsffPG_kind{background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary);border-radius:5px;flex:none;padding:0 6px;font-size:11px;line-height:18px}.QsffPG_label{min-width:0;font-family:var(--dsw-font-mono);white-space:nowrap;text-overflow:ellipsis;flex:1;overflow:hidden}.QsffPG_status,.QsffPG_duration{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;line-height:18px}.QsffPG_status{white-space:nowrap;text-overflow:ellipsis;max-width:40%;overflow:hidden}.QsffPG_duration{font-variant-numeric:tabular-nums}";
		const tagId = "@deepseek-ai/dsh-client-ui-jobs/JobListAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-jobs";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var JobListAction_module_css_default = {
			"count": "QsffPG_count",
			"duration": "QsffPG_duration",
			"kind": "QsffPG_kind",
			"label": "QsffPG_label",
			"menu": "QsffPG_menu",
			"root": "QsffPG_root",
			"row": "QsffPG_row",
			"rowDot": "QsffPG_rowDot",
			"rowSettled": "QsffPG_rowSettled",
			"status": "QsffPG_status",
			"trigger": "QsffPG_trigger",
			"triggerDot": "QsffPG_triggerDot",
			"triggerOpen": "QsffPG_triggerOpen"
		};
		//#endregion
		//#region lib/types/client/JobListAction.js
		/** Stable empty list so a session with no jobs keeps one array identity. */
		const NO_TASKS = [];
		/** A job the registry still holds open, and whose duration therefore ticks. */
		function isLive(job) {
			return job.status === "running" || job.status === "stopping";
		}
		/** Closed-union exhaustiveness fence for the wire status set. */
		/* v8 ignore next 3 -- closed-union backstop; only reached if a status is forged */
		function assertNever(value) {
			throw new Error(`unhandled job status: ${JSON.stringify(value)}`);
		}
		/**
		* Status marker semantics. `stopping` and `killed` share the attention color:
		* both mean the work ended (or is ending) on request rather than on its own.
		*/
		function dotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "stopping": return "warning";
				case "completed": return "done";
				case "killed": return "warning";
				case "failed": return "error";
				/* v8 ignore next -- closed wire status union */
				default: return assertNever(status);
			}
		}
		/** Human status word for the row and its accessible name. */
		function statusLabel(status, t) {
			switch (status) {
				case "running": return t("status.running");
				case "stopping": return t("status.stopping");
				case "completed": return t("status.completed");
				case "killed": return t("status.killed");
				case "failed": return t("status.failed");
				/* v8 ignore next -- closed wire status union */
				default: return assertNever(status);
			}
		}
		/**
		* Elapsed time in at most two adjacent units. A background job that outlives
		* an hour is already exceptional, so hours is the widest unit — beyond that the
		* figure stays in hours rather than growing a day/month vocabulary no producer
		* currently reaches.
		*/
		function formatDuration(elapsedMs, t) {
			const total = Math.max(0, Math.floor(elapsedMs / 1e3));
			const seconds = total % 60;
			const minutes = Math.floor(total / 60) % 60;
			const hours = Math.floor(total / 3600);
			if (hours > 0) return t("duration.hours", {
				hours,
				minutes
			});
			if (minutes > 0) return t("duration.minutes", {
				minutes,
				seconds
			});
			return t("duration.seconds", { seconds });
		}
		/**
		* Live rows first in start order, then settled rows newest-first. Two jobs
		* that settled in the same millisecond fall back to start order, so the sort
		* never depends on the host's map iteration.
		*/
		function ordered(jobs) {
			return [...jobs].sort((left, right) => {
				const liveLeft = isLive(left);
				if (liveLeft !== isLive(right)) return liveLeft ? -1 : 1;
				if (liveLeft) return left.startedAt - right.startedAt;
				const finished = (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt);
				return finished !== 0 ? finished : left.startedAt - right.startedAt;
			});
		}
		/**
		* Session-header entry point for this session's background jobs. It renders
		* nothing at all until the session has at least one job, so an ordinary
		* conversation never grows a control for a capability it is not using.
		* @param props - runtime slot currency plus the namespace translator.
		* @returns the trigger and its popover list, or null when there is nothing to show.
		*/
		function JobListAction({ sessionId, useSessions, t }) {
			const jobs = useSessions((state) => state.jobsBySession[sessionId]) ?? NO_TASKS;
			const [open, setOpen] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const rows = (0, react.useMemo)(() => ordered(jobs), [jobs]);
			const liveCount = (0, react.useMemo)(() => jobs.filter(isLive).length, [jobs]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen);
			(0, react.useEffect)(() => {
				if (!open || liveCount === 0) return;
				setNow(Date.now());
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [open, liveCount]);
			(0, react.useEffect)(() => {
				if (jobs.length === 0 && open) setOpen(false);
			}, [jobs.length, open]);
			if (jobs.length === 0) return null;
			const countLabel = t(liveCount > 0 ? liveCount === 1 ? "count.live.one" : "count.live.other" : jobs.length === 1 ? "count.idle.one" : "count.idle.other", { count: liveCount > 0 ? liveCount : jobs.length });
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open) return;
				event.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: JobListAction_module_css_default.root,
				onKeyDown,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: JobListAction_module_css_default.trigger,
					"aria-expanded": open,
					"aria-label": countLabel,
					onClick: () => {
						setNow(Date.now());
						setOpen((current) => !current);
					},
					children: [
						liveCount > 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state: "ongoing",
							className: JobListAction_module_css_default.triggerDot
						}) : null,
						(0, react_jsx_runtime.jsx)("span", {
							className: JobListAction_module_css_default.count,
							children: countLabel
						}),
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? JobListAction_module_css_default.triggerOpen : void 0 })
					]
				}), open ? (0, react_jsx_runtime.jsx)("ul", {
					className: JobListAction_module_css_default.menu,
					"aria-label": t("list.aria"),
					children: rows.map((job) => {
						const live = isLive(job);
						const duration = formatDuration(live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt, t);
						const status = statusLabel(job.status, t);
						return (0, react_jsx_runtime.jsxs)("li", {
							className: live ? JobListAction_module_css_default.row : `${JobListAction_module_css_default.row} ${JobListAction_module_css_default.rowSettled}`,
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: dotState(job.status),
									className: JobListAction_module_css_default.rowDot
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: JobListAction_module_css_default.kind,
									children: job.kind
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: JobListAction_module_css_default.label,
									title: job.label,
									children: job.label
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: JobListAction_module_css_default.status,
									title: job.detail ?? status,
									children: job.detail ?? status
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: JobListAction_module_css_default.duration,
									title: t(live ? "duration.title.live" : "duration.title.done", { duration }),
									children: duration
								})
							]
						}, job.id);
					})
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"count.live.one": "{count} 个后台任务运行中",
			"count.live.other": "{count} 个后台任务运行中",
			"count.idle.one": "{count} 个后台任务",
			"count.idle.other": "{count} 个后台任务",
			"list.aria": "后台任务",
			"status.running": "运行中",
			"status.stopping": "正在停止",
			"status.completed": "已完成",
			"status.killed": "已取消",
			"status.failed": "已失败",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"duration.hours": "{hours}小时{minutes}分",
			"duration.title.live": "已运行 {duration}",
			"duration.title.done": "耗时 {duration}"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"count.live.one": "{count} background job running",
			"count.live.other": "{count} background jobs running",
			"count.idle.one": "{count} background job",
			"count.idle.other": "{count} background jobs",
			"list.aria": "Background jobs",
			"status.running": "running",
			"status.stopping": "stopping",
			"status.completed": "completed",
			"status.killed": "cancelled",
			"status.failed": "failed",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"duration.hours": "{hours}h {minutes}m",
			"duration.title.live": "Running for {duration}",
			"duration.title.done": "Took {duration}"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for locale registration and header-slot contribution. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the dictionaries and the header action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("job", {
				zh,
				en
			}), "ui-job: dictionaries");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "job-list",
				order: 20,
				locale: "job"
			}, JobListAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
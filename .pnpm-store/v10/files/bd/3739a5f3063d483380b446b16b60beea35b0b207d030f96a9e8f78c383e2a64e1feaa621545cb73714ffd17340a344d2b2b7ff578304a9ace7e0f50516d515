window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-schedule",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-schedule/src/client/ScheduleCatalogAction.module.css.mjs
		const css = ".-\\34 LnlG_root{position:relative}.-\\34 LnlG_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:4px;padding:3px 2px;font-size:12px;line-height:18px;display:inline-flex}.-\\34 LnlG_trigger:hover,.-\\34 LnlG_trigger:focus-visible{color:var(--dsw-alias-label-secondary)}.-\\34 LnlG_trigger svg{flex:none}.-\\34 LnlG_trigger>svg:last-child{transition:transform .12s}.-\\34 LnlG_triggerOpen{transform:rotate(180deg)}.-\\34 LnlG_count{margin-left:2px}.-\\34 LnlG_menu{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:336px;max-width:min(336px,100vw - 32px);max-height:min(420px,100vh - 140px);box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:20px;flex-direction:column;gap:2px;margin:0;padding:4px;list-style:none;display:flex;position:fixed;overflow:auto}.-\\34 LnlG_row{box-sizing:border-box;width:100%;min-height:54px;color:var(--dsw-alias-label-primary);border-radius:8px;flex-direction:column;flex-shrink:0;gap:3px;padding:8px 10px;display:flex}.-\\34 LnlG_rowOverdue{background:var(--dsw-alias-state-warn-tertiary)}.-\\34 LnlG_status{color:var(--dsw-alias-label-tertiary);align-items:center;gap:5px;font-size:11px;line-height:16px;display:inline-flex}.-\\34 LnlG_statusDot{corner-shape:round;background:var(--dsw-alias-state-business-primary);border-radius:50%;flex:none;width:8px;height:8px}.-\\34 LnlG_rowOverdue .-\\34 LnlG_status{color:var(--dsw-alias-state-warn-label)}.-\\34 LnlG_rowOverdue .-\\34 LnlG_statusDot{background:var(--dsw-alias-state-warn-primary)}.-\\34 LnlG_prompt{overflow-wrap:anywhere;white-space:normal;font-size:13px;line-height:18px}.-\\34 LnlG_metadata{min-width:0;color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;align-items:center;gap:5px;font-size:11px;line-height:16px;display:flex}.-\\34 LnlG_relativeOverdue{color:var(--dsw-alias-state-warn-label)}";
		const tagId = "@deepseek-ai/dsh-client-ui-schedule/ScheduleCatalogAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-schedule";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ScheduleCatalogAction_module_css_default = {
			"count": "-4LnlG_count",
			"menu": "-4LnlG_menu",
			"metadata": "-4LnlG_metadata",
			"prompt": "-4LnlG_prompt",
			"relativeOverdue": "-4LnlG_relativeOverdue",
			"root": "-4LnlG_root",
			"row": "-4LnlG_row",
			"rowOverdue": "-4LnlG_rowOverdue",
			"status": "-4LnlG_status",
			"statusDot": "-4LnlG_statusDot",
			"trigger": "-4LnlG_trigger",
			"triggerOpen": "-4LnlG_triggerOpen"
		};
		//#endregion
		//#region lib/types/client/ScheduleCatalogAction.js
		const EMPTY_RECORDS = [];
		const SECOND_MS = 1e3;
		const SECOND_UNIT = {
			unit: "second",
			seconds: 1
		};
		const MEASURE_STYLE = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		const UNIT_SECONDS = [
			{
				unit: "day",
				seconds: 86400
			},
			{
				unit: "hour",
				seconds: 3600
			},
			{
				unit: "minute",
				seconds: 60
			},
			SECOND_UNIT
		];
		/** Localized unit word for one integral magnitude. */
		function unitLabel(unit, value, t) {
			const pair = {
				day: ["unit.day.one", "unit.day.other"],
				hour: ["unit.hour.one", "unit.hour.other"],
				minute: ["unit.minute.one", "unit.minute.other"],
				second: ["unit.second.one", "unit.second.other"]
			}[unit];
			return t(value === 1 ? pair[0] : pair[1], { count: value });
		}
		/** Pick the largest exact whole unit without rounding the durable interval. */
		function formatScheduleFrequency(record, t) {
			if (record.kind !== "every") return t("frequency.once");
			let selected = SECOND_UNIT;
			for (const candidate of UNIT_SECONDS) {
				if (record.everySeconds % candidate.seconds !== 0) continue;
				selected = candidate;
				break;
			}
			const value = record.everySeconds / selected.seconds;
			return t("frequency.every", {
				value,
				unit: unitLabel(selected.unit, value, t)
			});
		}
		/** Format the durable UTC target in the browser's current locale and time zone. */
		function formatScheduleLocalTime(scheduledAt, locale) {
			return new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
				timeStyle: "short"
			}).format(Date.parse(scheduledAt));
		}
		/** Human relative target using the largest natural clock unit. */
		function formatScheduleRelative(scheduledAt, now, t) {
			const difference = Date.parse(scheduledAt) - now;
			if (difference === 0) return t("relative.now");
			const absoluteSeconds = Math.abs(difference) / SECOND_MS;
			const selected = UNIT_SECONDS.find((candidate) => absoluteSeconds >= candidate.seconds) ?? SECOND_UNIT;
			const value = Math.max(1, difference > 0 ? Math.ceil(absoluteSeconds / selected.seconds) : Math.floor(absoluteSeconds / selected.seconds));
			const unit = unitLabel(selected.unit, value, t);
			return t(difference > 0 ? "relative.future" : "relative.overdue", {
				value,
				unit
			});
		}
		/** Overdue records first, then ascending target time; exact ties stay stable. */
		function orderScheduleRecords(records, now) {
			return records.map((record, index) => ({
				record,
				index
			})).sort((left, right) => {
				const leftTime = Date.parse(left.record.scheduledAt);
				const rightTime = Date.parse(right.record.scheduledAt);
				const leftOverdue = leftTime <= now;
				const rightOverdue = rightTime <= now;
				if (leftOverdue !== rightOverdue) return Number(rightOverdue) - Number(leftOverdue);
				return leftTime - rightTime || left.index - right.index;
			}).map(({ record }) => record);
		}
		/** Read-only current-Session active reminder catalog. */
		function ScheduleCatalogAction({ useSession, useProjection, t }) {
			const openState = useSession((snapshot) => snapshot.openState);
			const records = useProjection("schedule") ?? EMPTY_RECORDS;
			const visible = openState === "open" && records.length > 0;
			const [open, setOpen] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const catalogRef = (0, react.useRef)(null);
			const catalogPosition = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef: catalogRef,
				side: "bottom",
				gap: 5,
				margin: 16
			});
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen, catalogRef);
			(0, react.useEffect)(() => {
				if (!open) return;
				setNow(Date.now());
				const timer = setInterval(() => {
					setNow(Date.now());
				}, SECOND_MS);
				return () => {
					clearInterval(timer);
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (visible || !open) return;
				setOpen(false);
			}, [visible, open]);
			const rows = (0, react.useMemo)(() => orderScheduleRecords(records, now), [records, now]);
			if (!visible) return null;
			const countLabel = t(records.length === 1 ? "trigger.one" : "trigger.other", { count: records.length });
			const toggleCatalog = () => {
				setNow(Date.now());
				setOpen((current) => !current);
			};
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open) return;
				event.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
			};
			const trigger = (0, react_jsx_runtime.jsxs)("button", {
				ref: triggerRef,
				type: "button",
				className: ScheduleCatalogAction_module_css_default.trigger,
				"aria-expanded": open,
				"aria-label": countLabel,
				onClick: toggleCatalog,
				children: [
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAlarmClockOutline16, { size: 14 }),
					(0, react_jsx_runtime.jsx)("span", {
						className: ScheduleCatalogAction_module_css_default.count,
						children: countLabel
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? ScheduleCatalogAction_module_css_default.triggerOpen : void 0 })
				]
			});
			const catalog = open ? (0, react_dom.createPortal)((0, react_jsx_runtime.jsx)("ul", {
				ref: catalogRef,
				className: ScheduleCatalogAction_module_css_default.menu,
				style: catalogPosition ?? MEASURE_STYLE,
				"aria-label": t("list.aria"),
				children: rows.map((record) => {
					const overdue = Date.parse(record.scheduledAt) <= now;
					return (0, react_jsx_runtime.jsxs)("li", {
						className: overdue ? `${ScheduleCatalogAction_module_css_default.row} ${ScheduleCatalogAction_module_css_default.rowOverdue}` : ScheduleCatalogAction_module_css_default.row,
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: ScheduleCatalogAction_module_css_default.status,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: ScheduleCatalogAction_module_css_default.statusDot,
									"aria-hidden": "true"
								}), (0, react_jsx_runtime.jsx)("span", { children: t(overdue ? "status.overdue" : "status.scheduled") })]
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: ScheduleCatalogAction_module_css_default.prompt,
								children: record.prompt
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: ScheduleCatalogAction_module_css_default.metadata,
								children: [
									(0, react_jsx_runtime.jsx)("span", { children: formatScheduleFrequency(record, t) }),
									(0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "·"
									}),
									(0, react_jsx_runtime.jsx)("span", { children: formatScheduleLocalTime(record.scheduledAt, document.documentElement.lang) }),
									(0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "·"
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: overdue ? ScheduleCatalogAction_module_css_default.relativeOverdue : void 0,
										children: formatScheduleRelative(record.scheduledAt, now, t)
									})
								]
							})
						]
					}, record.id);
				})
			}), document.body) : null;
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: ScheduleCatalogAction_module_css_default.root,
				onKeyDown,
				children: [trigger, catalog]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `schedule.catalog` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "schedule.catalog";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"trigger.one": "{count} 个提醒",
			"trigger.other": "{count} 个提醒",
			"list.aria": "活动提醒",
			"status.scheduled": "等待中",
			"status.overdue": "已逾期",
			"frequency.once": "单次",
			"frequency.every": "{value}{unit}一次",
			"unit.day.one": "天",
			"unit.day.other": "天",
			"unit.hour.one": "小时",
			"unit.hour.other": "小时",
			"unit.minute.one": "分钟",
			"unit.minute.other": "分钟",
			"unit.second.one": "秒",
			"unit.second.other": "秒",
			"relative.now": "现在到期",
			"relative.future": "{value}{unit}后",
			"relative.overdue": "已逾期 {value}{unit}"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"trigger.one": "{count} reminder",
			"trigger.other": "{count} reminders",
			"list.aria": "Active reminders",
			"status.scheduled": "Scheduled",
			"status.overdue": "Overdue",
			"frequency.once": "Once",
			"frequency.every": "Every {value} {unit}",
			"unit.day.one": "day",
			"unit.day.other": "days",
			"unit.hour.one": "hour",
			"unit.hour.other": "hours",
			"unit.minute.one": "minute",
			"unit.minute.other": "minutes",
			"unit.second.one": "second",
			"unit.second.other": "seconds",
			"relative.now": "Due now",
			"relative.future": "in {value} {unit}",
			"relative.overdue": "{value} {unit} overdue"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Browser half of the read-only Schedule catalog. */
		/** Required services for locale registration and header-slot contribution. */
		const inject = ["slots", "locale"];
		/** Register the dictionaries and Session-header catalog action. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-schedule: dictionaries");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "schedule-catalog",
				order: 10,
				locale: NS
			}, ScheduleCatalogAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-approval",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-approval/src/client/ApprovalPanel.module.css.mjs
		const css = ".mna1RW_root{padding:8px calc(var(--dsh-composer-side-clearance) + 16px) 12px;flex-direction:column;align-items:center;display:flex}.mna1RW_card{width:100%;max-width:var(--dsh-chat-content-width);border:1px solid var(--dsw-alias-state-warn-secondary);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:20px;overflow:hidden}.mna1RW_strip{background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);align-items:center;gap:8px;padding:10px 16px;font-size:13px;line-height:18px;display:flex}.mna1RW_dot{corner-shape:round;background:var(--dsw-alias-state-warn-primary);border-radius:50%;width:8px;height:8px}.mna1RW_body{box-sizing:border-box;max-height:var(--dsh-composer-text-max-height);flex-direction:column;gap:6px;padding:12px 16px 0;display:flex;overflow-y:auto}.mna1RW_headline{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:500;line-height:24px}.mna1RW_command{color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);word-break:break-all;font-size:13px;line-height:20px}.mna1RW_actionRow{justify-content:flex-end;gap:8px;padding:14px 16px;display:flex}.mna1RW_reject:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);border-color:#0000}";
		const tagId = "@deepseek-ai/dsh-client-ui-approval/ApprovalPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-approval";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ApprovalPanel_module_css_default = {
			"actionRow": "mna1RW_actionRow",
			"body": "mna1RW_body",
			"card": "mna1RW_card",
			"command": "mna1RW_command",
			"dot": "mna1RW_dot",
			"headline": "mna1RW_headline",
			"reject": "mna1RW_reject",
			"root": "mna1RW_root",
			"strip": "mna1RW_strip"
		};
		//#endregion
		//#region lib/types/client/ApprovalPanel.js
		/** Composer takeover for one pending approval waterfall. */
		/**
		* Render one pending approval and its optional Tool-owned detail.
		* @param props - selector-matched request and standard Slot props.
		* @returns The approval composer takeover.
		*/
		function ApprovalPanel(props) {
			const approval = props.matched;
			return (0, react_jsx_runtime.jsx)(ApprovalFlow, {
				pending: approval,
				detail: approval.callId === void 0 ? null : props.renderSlot("conversation.approval.detail", { callId: approval.callId }),
				t: props.t
			}, approval.key);
		}
		function ApprovalFlow({ pending, detail, t }) {
			const [answered, setAnswered] = (0, react.useState)(false);
			const answer = (outcome) => {
				setAnswered(true);
				pending.answer(outcome).catch(() => {
					setAnswered(false);
				});
			};
			return (0, react_jsx_runtime.jsx)("div", {
				className: ApprovalPanel_module_css_default.root,
				"data-approval-key": pending.key,
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: ApprovalPanel_module_css_default.card,
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: ApprovalPanel_module_css_default.strip,
							children: [(0, react_jsx_runtime.jsx)("span", { className: ApprovalPanel_module_css_default.dot }), t("waiting")]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: ApprovalPanel_module_css_default.body,
							"data-approval-scroll": "",
							tabIndex: 0,
							role: "group",
							"aria-label": t("detail.aria"),
							children: [(0, react_jsx_runtime.jsx)("div", {
								className: ApprovalPanel_module_css_default.headline,
								children: pending.reason ?? t("escalation", { toolName: pending.toolName })
							}), detail !== null && (0, react_jsx_runtime.jsx)("div", {
								className: ApprovalPanel_module_css_default.command,
								children: detail
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: ApprovalPanel_module_css_default.actionRow,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: ApprovalPanel_module_css_default.reject,
								disabled: answered,
								onClick: () => {
									answer("rejected");
								},
								children: t("reject")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: answered,
								onClick: () => {
									answer("allowed-once");
								},
								children: t("allowOnce")
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region lib/types/client/contract/slots.js
		function settlePendingComposer(settle, failureMessage) {
			try {
				settle();
				return Promise.resolve();
			} catch (error) {
				return Promise.reject(error instanceof Error ? error : new Error(failureMessage, { cause: error }));
			}
		}
		let nextApprovalKey = 0;
		/** One answerable Client presentation of a pending Host waterfall. */
		var PendingApproval = class {
			sessionId;
			/** Domain discriminator used by Session pending-interaction consumers. */
			kind;
			/** Opaque render identity and one-shot remount axis. */
			key;
			/** Tool requesting the decision. */
			toolName;
			/** Correlated Tool call, when supplied by the asker. */
			callId;
			/** Human-readable reason supplied by the asker. */
			reason;
			/** Result returned by the Remote Event listener to the Host waterfall. */
			result;
			#resolve;
			#reject;
			#signal;
			#onAbort;
			#delegated = Symbol("pending approval delegated");
			#settled = false;
			/**
			* @param sessionId - Agent/Session identity owning the scoped request.
			* @param request - Host approval request projected through the Remote Event.
			*/
			constructor(sessionId, request) {
				this.sessionId = sessionId;
				this.kind = "approval";
				nextApprovalKey += 1;
				this.key = `approval:${String(nextApprovalKey)}`;
				this.toolName = request.toolName;
				this.callId = request.callId;
				this.reason = request.reason;
				const completion = Promise.withResolvers();
				this.result = completion.promise;
				this.#resolve = completion.resolve;
				this.#reject = completion.reject;
				this.#signal = request.signal;
				if (request.signal === void 0) {
					this.#onAbort = void 0;
					return;
				}
				const onAbort = () => {
					this.abort(request.signal?.reason ?? /* @__PURE__ */ new Error("approval request was aborted"));
				};
				this.#onAbort = onAbort;
				request.signal.addEventListener("abort", onAbort, { once: true });
				if (request.signal.aborted) onAbort();
			}
			/**
			* Resolve the Host waterfall with the user's decision.
			* @param outcome - supported interactive decision.
			*/
			answer(outcome) {
				return settlePendingComposer(() => {
					this.finish(() => {
						this.#resolve(outcome);
					});
				}, "pending approval settlement failed");
			}
			/** Delegate an unanswered request to the next waterfall listener. */
			delegate() {
				if (this.#settled) return;
				this.finish(() => {
					this.#reject(this.#delegated);
				});
			}
			/**
			* Test whether a rejection requests waterfall delegation.
			* @param reason - rejection received from {@link PendingApproval.result}.
			* @returns whether {@link PendingApproval.delegate} produced it.
			*/
			isDelegation(reason) {
				return reason === this.#delegated;
			}
			/**
			* End an unanswered presentation when its transport, scope, or plugin lifetime ends.
			* @param reason - rejection exposed to the waiting Remote Event listener.
			*/
			abort(reason) {
				if (this.#settled) return;
				this.finish(() => {
					this.#reject(reason);
				});
			}
			finish(settle) {
				if (this.#settled) throw new Error(`pending approval ${this.key} is already settled`);
				this.#settled = true;
				if (this.#signal !== void 0 && this.#onAbort !== void 0) this.#signal.removeEventListener("abort", this.#onAbort);
				settle();
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		/** `approval` namespace dictionaries. */
		/** Simplified Chinese dictionary and key-set source of truth. */
		const zh = {
			waiting: "等待审批",
			"detail.aria": "审批详情",
			escalation: "工具 {toolName} 请求越权执行",
			reject: "拒绝",
			allowOnce: "允许一次"
		};
		/** English dictionary, checked against the Chinese key set. */
		const en = {
			waiting: "Waiting for approval",
			"detail.aria": "Approval details",
			escalation: "Tool {toolName} requests privileged execution",
			reject: "Reject",
			allowOnce: "Allow once"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services: Agent scopes, Remote Events, Session UI, Slot registry, and copy. */
		const inject = [
			"sessions",
			"remote",
			"uiSession",
			"slots",
			"locale"
		];
		const NS = "approval";
		/** Present one request until the user answers or its lifetime ends. */
		async function answerApproval(ctx, owner, request, next, registerPendingInteraction) {
			const sessionId = ctx.sessions.scopeOf(owner);
			if (sessionId === void 0) return next();
			const pending = new PendingApproval(sessionId, {
				toolName: request.toolName,
				...request.callId === void 0 ? {} : { callId: request.callId },
				...request.reason === void 0 ? {} : { reason: request.reason },
				...request.signal === void 0 ? {} : { signal: request.signal }
			});
			const completed = Promise.withResolvers();
			const remove = registerPendingInteraction(pending, async () => {
				pending.delegate();
				await completed.promise;
			});
			try {
				try {
					return await pending.result;
				} catch (error) {
					if (pending.isDelegation(error)) return await next();
					throw error;
				}
			} finally {
				remove();
				completed.resolve();
			}
		}
		/**
		* Install approval copy and the scoped waterfall consumer.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-approval: dictionaries");
			const registerPendingInteraction = ctx.uiSession.registerPendingInteraction(() => 0);
			ctx.slots.inject("conversation.composer", () => ctx.slots.register({
				name: "conversation.composer",
				priority: 1,
				select: ({ pendingInteraction }) => pendingInteraction instanceof PendingApproval ? pendingInteraction : null,
				locale: NS,
				children: { "conversation.approval.detail": {
					kind: "single",
					scope: "session"
				} }
			}, ApprovalPanel));
			ctx.remote.$on("approval/request", function(request, next) {
				return answerApproval(ctx, this, request, next, registerPendingInteraction);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
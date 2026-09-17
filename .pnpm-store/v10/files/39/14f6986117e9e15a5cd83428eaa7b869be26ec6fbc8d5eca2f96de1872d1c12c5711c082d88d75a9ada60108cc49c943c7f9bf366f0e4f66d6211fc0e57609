window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-message-feedback",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-message-feedback/src/client/FeedbackDialog.module.css.mjs
		const css$1 = "._6_jNJa_dialog._6_jNJa_dialog{border-radius:18px;gap:38px;width:min(488px,100%)}._6_jNJa_categories{flex-wrap:wrap;gap:8px;margin-top:-14px;display:flex}._6_jNJa_chip{border:.5px solid var(--dsw-alias-border-l4);corner-shape:round;height:28px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:14px;padding:0 12px;font-size:13px;line-height:18px;transition:background-color .12s,border-color .12s,color .12s}._6_jNJa_chip:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._6_jNJa_chip:disabled{cursor:default;opacity:.4}._6_jNJa_chip:focus-visible{outline:2px solid var(--dsw-alias-button-primary-fill);outline-offset:2px}._6_jNJa_chipActive,._6_jNJa_chipActive:hover:not(:disabled){border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}._6_jNJa_detail{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:116px;max-height:280px;color:var(--dsw-alias-label-primary);font:inherit;field-sizing:content;resize:none;border-radius:16px;margin-top:18px;padding:12px 14px;font-size:14px;line-height:22px;transition:border-color .12s,box-shadow .12s;display:block}._6_jNJa_detail::placeholder{color:var(--dsw-alias-label-caption)}._6_jNJa_detail:focus{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 1px var(--dsw-alias-border-l3);outline:none}._6_jNJa_submit{border-radius:18px;width:100%;height:44px;font-size:14px;font-weight:500}._6_jNJa_toastIcon{border:1.5px solid var(--dsw-alias-state-success-primary);corner-shape:round;width:18px;height:18px;color:var(--dsw-alias-state-success-primary);border-radius:50%;place-items:center;display:grid}@media (prefers-reduced-motion:reduce){._6_jNJa_chip,._6_jNJa_detail{transition:none}}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-message-feedback/FeedbackDialog.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-message-feedback";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var FeedbackDialog_module_css_default = {
			"categories": "_6_jNJa_categories",
			"chip": "_6_jNJa_chip",
			"chipActive": "_6_jNJa_chipActive",
			"detail": "_6_jNJa_detail",
			"dialog": "_6_jNJa_dialog",
			"submit": "_6_jNJa_submit",
			"toastIcon": "_6_jNJa_toastIcon"
		};
		//#endregion
		//#region lib/types/client/FeedbackDialog.js
		/**
		* The feedback dialog and its acknowledgement and failure toasts, rendered as one entry
		* of `conversation.input.overlay` so each Session owns exactly one of each.
		* The Modal and the Toast both portal to `document.body`; the overlay slot
		* only supplies the per-session controller and the composer card the toast
		* centers over.
		* @module @deepseek-ai/dsh-client-ui-message-feedback/client/FeedbackDialog
		*/
		const CATEGORIES = Object.keys({
			"task-result": true,
			"instruction-following": true,
			"product-interaction": true,
			"service-stability": true,
			"resource-cost": true,
			"security-privacy-permission": true,
			"other": true
		});
		/** Failure codes with their own copy; every other code reads the generic line. */
		const FAILURE_COPY = {
			"version-conflict": "error.conflict",
			"note-too-large": "error.noteTooLarge"
		};
		/**
		* Render one Session's feedback dialog and toast.
		* @param props - the dialog hook, the draft verbs, and the locale seat.
		* @returns the modal while a target is open and either toast while it is showing.
		*/
		function FeedbackDialog({ useDialog, edit, submit, dismiss, dismissFailure, dismissToast, t }) {
			const state = useDialog((s) => s);
			const probeRef = (0, react.useRef)(null);
			const [card, setCard] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => {
				setCard(probeRef.current?.closest("[data-composer-card]") ?? null);
			}, []);
			const toast = state.toast;
			const onToastDone = (0, react.useCallback)(() => {
				dismissToast(toast);
			}, [dismissToast, toast]);
			(0, react.useEffect)(() => () => {
				dismissToast(toast);
			}, [dismissToast, toast]);
			const failureCode = state.failure;
			const failure = failureCode === null ? null : t(FAILURE_COPY[failureCode] ?? "error.generic");
			const onFailureDone = (0, react.useCallback)(() => {
				dismissFailure();
			}, [dismissFailure]);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)("span", {
					ref: probeRef,
					hidden: true
				}),
				toast > 0 && failure === null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: t("toast.recorded"),
					icon: (0, react_jsx_runtime.jsx)("span", {
						className: FeedbackDialog_module_css_default.toastIcon,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 12 })
					}),
					anchor: card,
					onDone: onToastDone
				}, toast),
				failure !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: failure,
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
					anchor: card,
					holdMs: 6e3,
					onDone: onFailureDone
				}, `failure-${failureCode}`),
				(0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: state.target !== null,
					title: t("dialog.title"),
					closeLabel: t("close"),
					onClose: dismiss,
					className: FeedbackDialog_module_css_default.dialog,
					footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						className: FeedbackDialog_module_css_default.submit,
						disabled: state.submitting,
						onClick: () => {
							submit();
						},
						children: state.submitting ? t("submitting") : t("submit")
					}),
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: FeedbackDialog_module_css_default.categories,
						role: "group",
						"aria-label": t("dialog.categories"),
						children: CATEGORIES.map((category) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: state.category === category ? `${FeedbackDialog_module_css_default.chip} ${FeedbackDialog_module_css_default.chipActive}` : FeedbackDialog_module_css_default.chip,
							"aria-pressed": state.category === category,
							disabled: state.submitting,
							onClick: () => {
								edit({ category: state.category === category ? null : category });
							},
							children: t(`category.${category}`)
						}, category))
					}), (0, react_jsx_runtime.jsx)("textarea", {
						className: FeedbackDialog_module_css_default.detail,
						"aria-label": t("dialog.detail"),
						placeholder: t("dialog.hint"),
						value: state.text,
						readOnly: state.submitting,
						onChange: (event) => {
							edit({ text: event.target.value });
						}
					})]
				})
			] });
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-message-feedback/src/client/MessageFeedbackActions.module.css.mjs
		const css = "._8_XoUG_action{width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:28px;justify-content:center;align-items:center;padding:6px;display:inline-flex}._8_XoUG_action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}._8_XoUG_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}._8_XoUG_action:disabled{cursor:default;opacity:.4}._8_XoUG_action[data-active]{color:var(--dsw-alias-label-tertiary)}._8_XoUG_failure{color:var(--dsw-alias-label-tertiary);padding-left:4px;font-size:13px;line-height:20px}";
		const tagId = "@deepseek-ai/dsh-client-ui-message-feedback/MessageFeedbackActions.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-message-feedback";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var MessageFeedbackActions_module_css_default = {
			"action": "_8_XoUG_action",
			"failure": "_8_XoUG_failure"
		};
		//#endregion
		//#region lib/types/client/MessageFeedbackActions.js
		/**
		* Per-message feedback controls: the Like/Dislike pair inside the assistant
		* message's IconActions row, between copy and branch. Either rating opens the
		* Session's feedback dialog, whose submission records that judgment with its
		* category and text. Clicking the recorded rating retracts it. A recorded rating
		* shows the filled glyph so the signal survives a pointer leaving the row.
		* @module @deepseek-ai/dsh-client-ui-message-feedback/client/MessageFeedbackActions
		*/
		/**
		* One message's feedback controls.
		* @param props - the owner's message identity, the injected verbs, and the
		* shared feedback hook.
		* @returns the rating buttons with any failure notice beside them.
		*/
		function MessageFeedbackActions({ messageId, ensure, current, retract, openDialog, useFeedback, t }) {
			const item = useFeedback((view) => view.items.get(messageId));
			const loadFailed = useFeedback((view) => view.status === "error");
			const rating = item?.rating;
			const [pending, setPending] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(null);
			const seeded = (0, react.useRef)(false);
			const seed = (0, react.useCallback)(() => {
				if (seeded.current) return;
				seeded.current = true;
				ensure();
			}, [ensure]);
			const alive = (0, react.useRef)(true);
			(0, react.useEffect)(() => () => {
				alive.current = false;
			}, []);
			const errorCopy = (0, react.useCallback)((result) => {
				return result.error.code === "version-conflict" ? t("error.conflict") : t("error.generic");
			}, [t]);
			const choose = (0, react.useCallback)((nextRating) => {
				setPending(true);
				setFailure(null);
				ensure().then((loaded) => {
					if (!alive.current) return;
					if (!loaded.ok || current(messageId)?.rating !== nextRating) {
						setPending(false);
						openDialog(messageId, nextRating);
						return;
					}
					retract(messageId, nextRating).then((result) => {
						if (!alive.current) return;
						setPending(false);
						if (!result.ok) setFailure(errorCopy(result));
					});
				});
			}, [
				current,
				ensure,
				errorCopy,
				messageId,
				openDialog,
				retract
			]);
			const onLike = (0, react.useCallback)(() => {
				choose("positive");
			}, [choose]);
			const onDislike = (0, react.useCallback)(() => {
				choose("negative");
			}, [choose]);
			const likeLabel = rating === "positive" ? t("action.likeActive") : t("action.like");
			const dislikeLabel = rating === "negative" ? t("action.dislikeActive") : t("action.dislike");
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: likeLabel,
					side: "bottom",
					children: (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: MessageFeedbackActions_module_css_default.action,
						"aria-label": likeLabel,
						"aria-pressed": rating === "positive",
						"data-active": rating === "positive" || void 0,
						disabled: pending,
						onFocus: seed,
						onPointerEnter: seed,
						onClick: onLike,
						children: rating === "positive" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLikeFill16, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLikeOutline16, {})
					})
				}),
				(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: dislikeLabel,
					side: "bottom",
					children: (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: MessageFeedbackActions_module_css_default.action,
						"aria-label": dislikeLabel,
						"aria-pressed": rating === "negative",
						"data-active": rating === "negative" || void 0,
						disabled: pending,
						onFocus: seed,
						onPointerEnter: seed,
						onClick: onDislike,
						children: rating === "negative" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDislikeFill16, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDislikeOutline16, {})
					})
				}),
				failure === null && loadFailed && (0, react_jsx_runtime.jsx)("span", {
					className: MessageFeedbackActions_module_css_default.failure,
					role: "status",
					children: t("error.load")
				}),
				failure !== null && (0, react_jsx_runtime.jsx)("span", {
					className: MessageFeedbackActions_module_css_default.failure,
					role: "status",
					children: failure
				})
			] });
		}
		//#endregion
		//#region lib/types/client/controller.js
		const INITIAL_VIEW = Object.freeze({
			status: "cold",
			items: /* @__PURE__ */ new Map(),
			error: null
		});
		const OK = Object.freeze({ ok: true });
		const DISPOSED = Object.freeze({
			ok: false,
			error: Object.freeze({
				code: "disposed",
				message: "feedback controller is disposed"
			})
		});
		/**
		* Human-readable text for one business failure code.
		* @param code - the Host's business failure code.
		* @returns the developer-facing description carried in the failure branch.
		*/
		function describe(code) {
			switch (code) {
				case "session-not-found": return "this session is no longer persisted";
				case "target-not-found": return "this message is not a persisted assistant message";
				case "version-conflict": return "feedback changed elsewhere";
				case "note-blank": return "a note must contain a non-whitespace character";
				case "note-too-large": return "the note is too long";
				default: return code;
			}
		}
		/** Build the rejected branch for one business failure code. */
		function fail(code) {
			return {
				ok: false,
				error: {
					code,
					message: describe(code)
				}
			};
		}
		/** Carrier failure rendered with the Host-supplied code and message. */
		function carrierFailure(error) {
			return {
				ok: false,
				error: {
					code: error.code,
					message: error.message
				}
			};
		}
		/**
		* Per-session feedback object layer. One instance backs every per-message
		* control in that Session, so a single list read seeds them all.
		*/
		var MessageFeedbackController = class {
			ctx;
			sessionId;
			view = INITIAL_VIEW;
			listeners = /* @__PURE__ */ new Set();
			loadPromise = null;
			operationTail = Promise.resolve();
			disposed = false;
			/**
			* @param ctx - the browser plugin context carrying the messageFeedback Remote namespace.
			* @param sessionId - Session owning every addressed assistant message.
			*/
			constructor(ctx, sessionId) {
				this.ctx = ctx;
				this.sessionId = sessionId;
			}
			/** Return the cached immutable view. */
			getSnapshot = () => this.view;
			/** Subscribe to view replacement. */
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/**
			* Load once; a failed load stays retryable.
			* @returns the settled load result, shared by concurrent callers.
			*/
			ensure() {
				if (this.view.status === "ready") return Promise.resolve(OK);
				return this.refresh();
			}
			/**
			* Re-read the authoritative list, collapsing concurrent callers onto one
			* in-flight read.
			*
			* This is the unserialized read used to seed a cold controller, where no
			* mutation can be in flight yet. A reconnect must use {@link resync} instead:
			* an unserialized list response can otherwise arrive after a newer mutation's
			* reply and overwrite the version that mutation just committed.
			* @returns the settled reload result.
			*/
			refresh() {
				if (this.loadPromise !== null) return this.loadPromise;
				this.publish({
					status: "loading",
					items: this.view.items,
					error: null
				});
				const pending = this.load();
				this.loadPromise = pending;
				return pending.finally(() => {
					this.loadPromise = null;
				});
			}
			/**
			* Re-read the list behind this Session's queued mutations, so a reconnect
			* cannot resurrect a version an in-flight mutation already replaced.
			* @returns the settled reload result.
			*/
			resync() {
				return this.mutate(() => this.refresh(), { seed: false });
			}
			/**
			* Create or replace feedback for one message, comparing against the version
			* this controller last observed. The item stores exactly `entry`: an entry
			* without a note or category replaces whatever the stored item carried.
			* @param messageId - target assistant message.
			* @param rating - desired judgment.
			* @param entry - explanation and category to store with the judgment.
			* @returns the settled mutation result.
			*/
			rate(messageId, rating, entry = {}) {
				return this.mutate(async () => {
					const observed = this.view.items.get(messageId);
					return await this.putCommitted(messageId, rating, entry, observed);
				});
			}
			/**
			* Retract one message's matching committed rating. The serialized operation
			* rechecks the current item and becomes a no-op if another operation already
			* changed or removed it, so a stale retraction can never record a bare rating.
			* @param messageId - target assistant message.
			* @param rating - judgment the human asked to retract.
			* @returns the settled mutation result.
			*/
			retract(messageId, rating) {
				return this.mutate(async () => {
					const observed = this.view.items.get(messageId);
					return observed?.rating === rating ? await this.deleteCommitted(messageId, observed) : OK;
				});
			}
			/** Commit one put against the observed version and reconcile a conflict. */
			async putCommitted(messageId, rating, entry, observed) {
				const carried = await this.ctx.remote.messageFeedback.put({
					sessionId: this.sessionId,
					messageId,
					rating,
					...entry.text === void 0 ? {} : { note: entry.text },
					...entry.category === void 0 ? {} : { category: entry.category },
					ifVersion: observed?.version ?? null
				});
				if (!carried.ok) return carrierFailure(carried.error);
				const result = carried.value;
				if (result.ok) {
					this.commit(messageId, result.value);
					return OK;
				}
				if (result.error.code === "version-conflict") this.commit(messageId, result.error.current);
				return fail(result.error.code);
			}
			/** Commit one delete against the observed version and reconcile a conflict. */
			async deleteCommitted(messageId, observed) {
				const carried = await this.ctx.remote.messageFeedback.delete({
					sessionId: this.sessionId,
					messageId,
					ifVersion: observed.version
				});
				if (!carried.ok) return carrierFailure(carried.error);
				const result = carried.value;
				if (result.ok) {
					this.commit(messageId, null);
					return OK;
				}
				if (result.error.code === "version-conflict") this.commit(messageId, result.error.current);
				return fail(result.error.code);
			}
			/** Drop subscribers and refuse further work when the owning fiber unloads. */
			dispose() {
				this.disposed = true;
				this.listeners.clear();
			}
			/** Fetch the whole sidecar and publish it as the seeded view. */
			async load() {
				const carried = await this.ctx.remote.messageFeedback.list({ sessionId: this.sessionId });
				if (this.disposed) return OK;
				if (!carried.ok) {
					this.publish({
						status: "error",
						items: this.view.items,
						error: carried.error.message
					});
					return carrierFailure(carried.error);
				}
				const result = carried.value;
				if (!result.ok) {
					this.publish({
						status: "error",
						items: this.view.items,
						error: describe(result.error.code)
					});
					return fail(result.error.code);
				}
				const items = /* @__PURE__ */ new Map();
				for (const item of result.value.items) items.set(item.messageId, item);
				this.publish({
					status: "ready",
					items,
					error: null
				});
				return OK;
			}
			/**
			* Serialize one mutation behind this Session's prior mutation so queued
			* operations always compare against the committed version.
			*/
			mutate(operation, options = {}) {
				const guarded = async () => {
					if (this.disposed) return DISPOSED;
					if (options.seed !== false) {
						const loaded = await this.ensure();
						if (!loaded.ok) return loaded;
						if (this.disposed) return DISPOSED;
					}
					return await operation();
				};
				const result = this.operationTail.then(guarded, guarded);
				this.operationTail = result.then(() => void 0);
				return result;
			}
			/**
			* Replace one message's entry, keeping every other entry's identity. Only a
			* `mutate` operation reaches this, and `mutate` refuses admission once the
			* controller is disposed, so no disposal guard belongs here; `publish` is
			* the single place that stops notifying after listeners are dropped.
			*/
			commit(messageId, item) {
				const items = new Map(this.view.items);
				if (item === null) items.delete(messageId);
				else items.set(messageId, item);
				this.publish({
					status: "ready",
					items,
					error: null
				});
			}
			/** Replace the view and contain subscriber failures at the observable boundary. */
			publish(view) {
				this.view = Object.freeze(view);
				for (const listener of this.listeners) try {
					listener();
				} catch (error) {
					console.error("[ui-message-feedback] subscriber threw:", error);
				}
			}
		};
		//#endregion
		//#region lib/types/client/dialog.js
		/**
		* Headless state of one Session's feedback dialog and its acknowledgement and
		* failure toasts. One form serves two targets: the Session itself (a bare `/feedback`)
		* and one assistant message (Like or Dislike). The overlay view renders from
		* the store and raises the acknowledgement after a successful submission.
		* @module @deepseek-ai/dsh-client-ui-message-feedback/client/dialog
		*/
		const CLOSED = {
			target: null,
			category: null,
			text: "",
			submitting: false,
			failure: null
		};
		/** Per-session dialog controller; one instance backs the overlay entry and every message control. */
		var FeedbackDialogController = class {
			submit;
			/** Dialog state store (the overlay entry subscribes here). */
			state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				...CLOSED,
				toast: 0
			});
			/** Bumped by every open, dismiss, and dispose so a late settlement can tell its draft is gone. */
			generation = 0;
			toastSeq = 0;
			/**
			* @param submit - records one submission; the owner routes it by target.
			*/
			constructor(submit) {
				this.submit = submit;
			}
			/**
			* Open the dialog with an empty draft, replacing any open draft.
			* @param target - what the submission records against.
			*/
			open(target) {
				this.generation += 1;
				this.state.set({
					...CLOSED,
					target,
					toast: this.state.getSnapshot().toast
				});
			}
			/** Close the dialog and discard the draft; a toast on screen stays. */
			dismiss() {
				this.generation += 1;
				this.state.set({
					...CLOSED,
					toast: this.state.getSnapshot().toast
				});
			}
			/**
			* Replace part of the draft while it is editable.
			* @param draft - the category (null clears it) or the text as typed.
			*/
			edit(draft) {
				const s = this.state.getSnapshot();
				if (s.target === null || s.submitting) return;
				this.state.set({
					...s,
					...draft
				});
			}
			/**
			* Submit the draft; an empty draft is a valid submission. Success closes the
			* dialog and raises the acknowledgement toast; a failure keeps the dialog
			* open and publishes its code for the failure toast.
			* @returns after the submission settles.
			*/
			async submitDraft() {
				const s = this.state.getSnapshot();
				if (s.target === null || s.submitting) return;
				const generation = this.generation;
				this.state.set({
					...s,
					submitting: true,
					failure: null
				});
				const text = s.text.trim();
				const result = await this.submit(s.target, {
					...text.length === 0 ? {} : { text },
					...s.category === null ? {} : { category: s.category }
				});
				if (result.ok) {
					if (generation === this.generation) this.dismiss();
					this.acknowledge();
					return;
				}
				if (generation !== this.generation) return;
				this.state.set({
					...this.state.getSnapshot(),
					submitting: false,
					failure: result.error.code,
					toast: 0
				});
			}
			/** Clear the current failure toast without closing its draft. */
			dismissFailure() {
				const s = this.state.getSnapshot();
				this.state.set({
					...s,
					failure: null
				});
			}
			/** Show the acknowledgement toast; a toast already on screen restarts. */
			acknowledge() {
				this.toastSeq += 1;
				this.state.set({
					...this.state.getSnapshot(),
					toast: this.toastSeq
				});
			}
			/**
			* Retire one toast after its fade; a newer toast is left alone.
			* @param seq - the toast sequence the view finished showing.
			*/
			dismissToast(seq) {
				const s = this.state.getSnapshot();
				if (s.toast === seq) this.state.set({
					...s,
					toast: 0
				});
			}
			/** Scope-teardown disposer: drop the draft and the toast, orphan in-flight work. */
			dispose() {
				this.generation += 1;
				this.state.set({
					...CLOSED,
					toast: 0
				});
			}
		};
		//#endregion
		//#region lib/types/client/surface.js
		/**
		* One Session's feedback surface: the message-feedback object layer and the
		* dialog controller, plus the routing between them. A message target puts a
		* selected judgment through the message controller; the Session target records
		* through the `sessionFeedback` Remote.
		* @module @deepseek-ai/dsh-client-ui-message-feedback/client/surface
		*/
		/** The per-session pair behind every entry of one Session. */
		var FeedbackSurface = class {
			ctx;
			sessionId;
			/** The Session's message-feedback object layer, shared by every message control. */
			feedback;
			/** The Session's dialog and toast state, shared by the overlay entry and the message controls. */
			dialog;
			/**
			* @param ctx - the browser plugin context carrying both feedback Remotes.
			* @param sessionId - Session owning the transcript and the remark.
			*/
			constructor(ctx, sessionId) {
				this.ctx = ctx;
				this.sessionId = sessionId;
				this.feedback = new MessageFeedbackController(ctx, sessionId);
				this.dialog = new FeedbackDialogController((target, entry) => target.kind === "message" ? this.feedback.rate(target.messageId, target.rating, entry) : this.recordSession(entry));
			}
			/** Record one Session-level remark through the sessionFeedback Remote. */
			async recordSession(entry) {
				const carried = await this.ctx.remote.sessionFeedback.record({
					sessionId: this.sessionId,
					...entry
				});
				if (!carried.ok) return {
					ok: false,
					error: {
						code: carried.error.code,
						message: carried.error.message
					}
				};
				if (carried.value.ok) return { ok: true };
				return {
					ok: false,
					error: {
						code: carried.value.error.code,
						message: describe(carried.value.error.code)
					}
				};
			}
			/** Drop both controllers when the owning fiber unloads. */
			dispose() {
				this.feedback.dispose();
				this.dialog.dispose();
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		/** `feedback` namespace dictionaries. */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"action.like": "好的回答",
			"action.likeActive": "取消标记",
			"action.dislike": "有问题的回答",
			"action.dislikeActive": "取消标记",
			"dialog.title": "提交反馈",
			"dialog.categories": "反馈分类",
			"dialog.detail": "反馈详情",
			"dialog.hint": "填写详情以帮助我们改进体验，提交内容会包括当前对话的日志",
			"category.task-result": "任务结果",
			"category.instruction-following": "指令理解与遵循",
			"category.product-interaction": "产品功能与交互",
			"category.service-stability": "稳定性和速度",
			"category.resource-cost": "资源使用与费用",
			"category.security-privacy-permission": "安全隐私与权限",
			"category.other": "其他",
			"toast.recorded": "感谢你的反馈",
			"error.conflict": "这条反馈已在别处改动，已显示最新状态",
			"error.load": "反馈状态加载失败",
			"error.generic": "反馈保存失败",
			"error.noteTooLarge": "描述太长，请缩短后再提交"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"action.like": "Good response",
			"action.likeActive": "Remove rating",
			"action.dislike": "Bad response",
			"action.dislikeActive": "Remove rating",
			"dialog.title": "Submit feedback",
			"dialog.categories": "Feedback category",
			"dialog.detail": "Feedback details",
			"dialog.hint": "Add details to help us improve. Your submission will include the current conversation log.",
			"category.task-result": "Task result",
			"category.instruction-following": "Instruction understanding and following",
			"category.product-interaction": "Product features and interaction",
			"category.service-stability": "Stability and speed",
			"category.resource-cost": "Resource usage and cost",
			"category.security-privacy-permission": "Security, privacy, and permissions",
			"category.other": "Other",
			"toast.recorded": "Thanks for your feedback",
			"error.conflict": "This feedback changed elsewhere; the latest state is shown",
			"error.load": "Could not load feedback",
			"error.generic": "Could not save feedback",
			"error.noteTooLarge": "The description is too long; shorten it and submit again"
		};
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Feedback surface plugin, browser half: the Like/Dislike entry in the
		* conversation.chat.assistant-actions strip, the feedback dialog and its
		* acknowledgement and failure toasts in conversation.input.overlay, and the `/feedback`
		* decoration that opens the dialog from the composer menu or a bare typed
		* command. One FeedbackSurface per Session backs every entry in that Session.
		* @module @deepseek-ai/dsh-client-ui-message-feedback/client
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "feedback";
		/** Required services: the slot registry, the two Remote namespaces, and the copy. */
		const inject = [
			"slots",
			"remote",
			"remote.messageFeedback",
			"remote.sessionFeedback",
			"locale"
		];
		/**
		* Client plugin body: the per-message feedback entry, the Session's dialog
		* entry, the `/feedback` decoration, and their per-session surfaces.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-message-feedback: dictionaries");
			const surfaces = /* @__PURE__ */ new Map();
			const surfaceFor = (sessionId) => {
				let surface = surfaces.get(sessionId);
				if (surface === void 0) {
					surface = new FeedbackSurface(ctx, sessionId);
					surfaces.set(sessionId, surface);
				}
				return surface;
			};
			ctx.effect(() => () => {
				for (const surface of surfaces.values()) surface.dispose();
				surfaces.clear();
			}, "ui-message-feedback: per-session surfaces");
			ctx.on("connection/reset", () => {
				for (const { feedback } of surfaces.values()) if (feedback.getSnapshot().status !== "cold") feedback.resync();
			});
			ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
				name: "conversation.chat.assistant-actions",
				id: "feedback",
				order: 10,
				locale: NS,
				inject: (sessionId) => {
					const { feedback, dialog } = surfaceFor(sessionId);
					return {
						hooks: { feedback },
						ensure: () => feedback.ensure(),
						current: (messageId) => feedback.getSnapshot().items.get(messageId),
						retract: (messageId, rating) => feedback.retract(messageId, rating),
						openDialog: (messageId, rating) => {
							dialog.open({
								kind: "message",
								messageId,
								rating
							});
						}
					};
				}
			}, MessageFeedbackActions));
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "feedback-dialog",
				order: 2,
				locale: NS,
				inject: (sessionId) => {
					const { dialog } = surfaceFor(sessionId);
					return {
						hooks: { dialog: dialog.state },
						edit: (draft) => {
							dialog.edit(draft);
						},
						submit: () => dialog.submitDraft(),
						dismiss: () => {
							dialog.dismiss();
						},
						dismissFailure: () => {
							dialog.dismissFailure();
						},
						dismissToast: (seq) => {
							dialog.dismissToast(seq);
						}
					};
				}
			}, FeedbackDialog));
			ctx.inject(["commandUi"], (scope) => {
				scope.effect(() => scope.commandUi.decorate({
					name: "feedback",
					available: () => true,
					ui: {
						kind: "action",
						run: (session) => {
							surfaceFor(session.sessionId).dialog.open({ kind: "session" });
						}
					}
				}), "ui-message-feedback: /feedback decoration");
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-commands",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/directory.js
		/** One session key's cache cell. */
		var Entry = class {
			state = "cold";
			commands = [];
			/** Bumped at each pull start; only the latest pull may publish its outcome. */
			epoch = 0;
			lastError;
			waiters = [];
		};
		/** The session-keyed directory cache. Plain class — the owning service wires events and RPC. */
		var CommandDirectory = class {
			fetchCommands;
			entries = /* @__PURE__ */ new Map();
			constructor(fetchCommands) {
				this.fetchCommands = fetchCommands;
			}
			/**
			* Current cache status for one session.
			* @param sessionId - session key.
			* @returns the entry status (cold when never touched).
			*/
			status(sessionId) {
				return this.entries.get(sessionId)?.state ?? "cold";
			}
			/**
			* Synchronous exact-name lookup over one session's hot snapshot.
			* @param sessionId - session key.
			* @param name - command name without the leading slash.
			* @returns the descriptor, or undefined when absent or the entry is not ready.
			*/
			resolve(sessionId, name) {
				const entry = this.entries.get(sessionId);
				if (entry === void 0 || entry.state !== "ready") return void 0;
				return entry.commands.find((c) => c.name === name);
			}
			/** Soft invalidation (commands-changed): background repull on every touched key; ready snapshots keep serving. */
			invalidateAll() {
				for (const key of this.entries.keys()) this.refresh(key);
			}
			/**
			* Drop one Session's obsolete composition-specific snapshot and prewarm its replacement.
			* @param sessionId - Session whose effective command composition changed.
			*/
			resetSession(sessionId) {
				const entry = this.entry(sessionId);
				entry.state = "cold";
				entry.commands = [];
				entry.lastError = void 0;
				this.refresh(sessionId);
			}
			/**
			* Hard reset on reconnect: every entry drops its snapshot (the agent world
			* may have changed shape across the generation) and prewarms.
			*/
			resetConnected() {
				for (const [key, entry] of this.entries) {
					entry.state = "cold";
					entry.commands = [];
					this.refresh(key);
				}
			}
			/**
			* Fire-and-forget prewarm of one session (the command source's scope-birth
			* warm hook lands here).
			* @param sessionId - session key.
			*/
			warm(sessionId) {
				const entry = this.entry(sessionId);
				if (entry.state === "cold" || entry.state === "failed") this.refresh(sessionId);
			}
			/**
			* Start one pull for one session. Publishes ready/failed only while it is
			* still the key's latest pull (epoch guard); a ready snapshot is not
			* demoted while the pull flies.
			* @param sessionId - session key.
			* @returns settled when this pull's outcome is published or discarded.
			*/
			async refresh(sessionId) {
				const entry = this.entry(sessionId);
				const epoch = ++entry.epoch;
				if (entry.state !== "ready") entry.state = "pending";
				try {
					const commands = await this.fetchCommands(sessionId);
					if (epoch !== entry.epoch) return;
					entry.commands = commands;
					entry.state = "ready";
					entry.lastError = void 0;
				} catch (error) {
					if (epoch !== entry.epoch) return;
					entry.commands = [];
					entry.state = "failed";
					entry.lastError = error;
				} finally {
					if (epoch === entry.epoch) notifyWaiters(entry);
				}
			}
			/**
			* Strong-wait until one session's catalog is servable (the enter-
			* adjudication "directory must be reached" rule): ready returns at once;
			* cold/failed launch a fresh pull; pending joins the flying one. Rejects
			* when the awaited pull fails or the signal aborts.
			* @param sessionId - session key.
			* @param signal - attempt-scoped abort (the SubmitAttempt signal).
			* @returns the hot command snapshot.
			*/
			async ensureReady(sessionId, signal) {
				const entry = this.entry(sessionId);
				while (true) {
					if (entry.state === "ready") return entry.commands;
					if (entry.state !== "pending") this.refresh(sessionId);
					await settled(entry, signal);
					if (entry.state === "failed") throw new Error(`command directory warmup failed: ${entry.lastError instanceof Error ? entry.lastError.message : String(entry.lastError)}`);
				}
			}
			entry(sessionId) {
				let entry = this.entries.get(sessionId);
				if (entry === void 0) {
					entry = new Entry();
					this.entries.set(sessionId, entry);
				}
				return entry;
			}
		};
		/** One settlement tick for one entry: resolves at the next winning publish, rejects on abort. */
		function settled(entry, signal) {
			if (signal.aborted) return Promise.reject(abortReason(signal));
			return new Promise((resolve, reject) => {
				const waiter = () => {
					signal.removeEventListener("abort", onAbort);
					resolve();
				};
				const onAbort = () => {
					entry.waiters = entry.waiters.filter((w) => w !== waiter);
					reject(abortReason(signal));
				};
				signal.addEventListener("abort", onAbort, { once: true });
				entry.waiters.push(waiter);
			});
		}
		function notifyWaiters(entry) {
			const woken = entry.waiters;
			entry.waiters = [];
			for (const wake of woken) wake();
		}
		/** Normalize an abort into an Error rejection. */
		function abortReason(signal) {
			return signal.reason instanceof Error ? signal.reason : /* @__PURE__ */ new Error("command directory wait aborted");
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `command` namespace dictionaries (the popupSelect shell's copy). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"description.compact": "压缩以上对话内容",
			"description.export": "将当前会话内容导出为 ZIP",
			"description.feedback": "发送关于当前会话的反馈",
			"description.goal": "设置或查看长期任务目标",
			"description.permission": "切换权限预设（沙箱模式与审批策略）",
			"description.plan": "进入或退出计划模式",
			"search.placeholder": "搜索…",
			"search.aria": "筛选选项",
			"status.loading": "正在加载选项…",
			"status.applying": "正在应用…",
			"status.empty": "无选项",
			"overlay.aria": "/{command} 选项",
			"listbox.aria": "/{command} 匹配项",
			"notice.attachmentsUnsupported": "/{command} 不接受附件，请先移除附件"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"description.compact": "Compact older conversation history",
			"description.export": "Download this Session log as a ZIP archive",
			"description.feedback": "record feedback about this session",
			"description.goal": "set or view the goal for a long-running task",
			"description.permission": "Switch the permission preset (sandbox mode + approval policy)",
			"description.plan": "Enter or leave plan mode",
			"search.placeholder": "Search…",
			"search.aria": "Filter options",
			"status.loading": "Loading options…",
			"status.applying": "Applying…",
			"status.empty": "No options",
			"overlay.aria": "/{command} options",
			"listbox.aria": "/{command} matches",
			"notice.attachmentsUnsupported": "/{command} does not accept attachments; remove them first"
		};
		//#endregion
		//#region lib/types/client/popup.js
		/**
		* Headless popupSelect shell state: one controller per client
		* session, owned by CommandUiRuntime's per-session map and torn down by the
		* session scope disposer. The shell is a transient layer (never in the input
		* state machine): it loads options once, filters them locally against the
		* shell's own search text, and settles a selection through the context
		* captured at open time. Draft consumption and composer focus are injected
		* callbacks — the session wiring dispatches the consume-token event (the
		* Input side owns the span/bare-token CAS guard) and focuses the composer;
		* the controller never touches the input machine.
		*/
		const CLOSED = {
			open: false,
			command: null,
			status: "pending",
			options: [],
			search: "",
			active: 0,
			submitting: false,
			confirming: null,
			acknowledged: false,
			error: null
		};
		/**
		* Filter option rows against the shell's local search text (case-insensitive
		* substring over label and detail; blank search keeps every row).
		* @param options - the loaded rows.
		* @param search - the shell's search text.
		* @returns the rows the shell shows and highlights over.
		*/
		function filterOptions(options, search) {
			const query = search.trim().toLowerCase();
			if (query === "") return options;
			return options.filter((o) => o.label.toLowerCase().includes(query) || (o.detail?.toLowerCase().includes(query) ?? false));
		}
		/** The shell's error-strip line for a settlement failure. */
		function errorText(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* Headless controller of one session's popupSelect shell. Late settlements
		* lose their write rights through binding identity: dismiss/dispose/reopen
		* swap the binding, so a settling options fetch or onSelect that no longer
		* matches writes nothing and consumes nothing.
		*/
		var PopupSelectController = class {
			deps;
			/** Shell state store (the overlay component subscribes here). */
			state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(CLOSED);
			binding = null;
			/**
			* @param deps - session-wiring callbacks (token consumption + composer focus).
			*/
			constructor(deps) {
				this.deps = deps;
			}
			/**
			* Open the shell for one command: publish pending state and fetch options
			* once through the business spec. A reopen supersedes the previous shell
			* (its options fetch is aborted, its late settlements are dropped).
			* @param command - command name the shell serves.
			* @param spec - the registered popupSelect spec.
			* @param context - open-time context snapshot, handed verbatim to options/onSelect.
			* @param segment - open-time token segment snapshot for post-select consumption.
			*/
			open(command, spec, context, segment) {
				this.binding?.abort.abort();
				const binding = {
					command,
					spec,
					context,
					segment,
					abort: new AbortController()
				};
				this.binding = binding;
				this.state.set({
					...CLOSED,
					open: true,
					command
				});
				this.load(binding);
			}
			/** Run the one options fetch of a binding; settlement rights die with the binding. */
			load(binding) {
				binding.spec.options(binding.context, binding.abort.signal).then((options) => {
					if (this.binding !== binding) return;
					this.state.set({
						...this.state.getSnapshot(),
						status: "ready",
						options,
						active: 0,
						error: null
					});
				}, (error) => {
					if (this.binding !== binding) return;
					console.error(`[ui-commands] popupSelect options failed for /${binding.command}:`, error);
					this.state.set({
						...this.state.getSnapshot(),
						status: "failed",
						options: [],
						active: 0,
						error: errorText(error)
					});
				});
			}
			/** Re-run a failed options fetch (search survives; no-op unless status is 'failed'). */
			retry() {
				const binding = this.binding;
				const s = this.state.getSnapshot();
				if (binding === null || !s.open || s.status !== "failed") return;
				this.state.set({
					...s,
					status: "pending",
					error: null
				});
				this.load(binding);
			}
			/**
			* Replace the local search text (pure local filter — the provider is never
			* re-queried) and rebase the highlight onto the new filtered list.
			* @param search - the shell search input's text.
			*/
			setSearch(search) {
				const s = this.state.getSnapshot();
				if (!s.open || s.submitting || s.confirming !== null || search === s.search) return;
				this.state.set({
					...s,
					search,
					active: 0
				});
			}
			/**
			* Move the highlight across the filtered rows (wraps around; no-op unless
			* options are ready and no selection is in flight).
			* @param dir - +1 down, -1 up.
			*/
			move(dir) {
				const s = this.state.getSnapshot();
				if (!s.open || s.status !== "ready" || s.submitting || s.confirming !== null) return;
				const rows = filterOptions(s.options, s.search);
				if (rows.length === 0) return;
				const active = (s.active + dir + rows.length) % rows.length;
				this.state.set({
					...s,
					active
				});
			}
			/**
			* Set the highlight directly (pointer hover; no-op unless ready, idle, and
			* in filtered range).
			* @param index - filtered-row index.
			*/
			highlight(index) {
				const s = this.state.getSnapshot();
				if (!s.open || s.status !== "ready" || s.submitting || s.confirming !== null) return;
				if (index < 0 || index >= filterOptions(s.options, s.search).length || index === s.active) return;
				this.state.set({
					...s,
					active: index
				});
			}
			/**
			* Select one filtered row: single-flight — the first call enters
			* `submitting` and later calls no-op until it settles. Success consumes the
			* open-time token segment (a false CAS answer is benign), closes, and
			* returns focus to the composer. Failure keeps the shell open with search,
			* highlight, and token intact, surfaces the error, and re-arms select as
			* the retry.
			* @param index - filtered-row index (callers pass the highlight or the clicked row).
			* @returns settled when the attempt has closed the shell or surfaced its failure.
			*/
			async select(index) {
				const binding = this.binding;
				const s = this.state.getSnapshot();
				if (binding === null || !s.open || s.status !== "ready" || s.submitting || s.confirming !== null) return;
				const option = filterOptions(s.options, s.search)[index];
				if (option === void 0) return;
				if (option.confirmation !== void 0) {
					this.state.set({
						...s,
						confirming: option,
						acknowledged: false,
						error: null
					});
					return;
				}
				await this.settle(binding, option);
			}
			/**
			* Update the explicit checkbox for the currently pending risk gate.
			* @param acknowledged - whether the user has acknowledged the displayed risk.
			*/
			acknowledge(acknowledged) {
				const s = this.state.getSnapshot();
				if (!s.open || s.submitting || s.confirming === null || s.acknowledged === acknowledged) return;
				this.state.set({
					...s,
					acknowledged
				});
			}
			/** Cancel only the risk gate and return to the still-open option picker. */
			cancelConfirmation() {
				const s = this.state.getSnapshot();
				if (!s.open || s.submitting || s.confirming === null) return;
				this.state.set({
					...s,
					confirming: null,
					acknowledged: false
				});
			}
			/** Settle the gated option only after the checkbox is acknowledged. */
			async confirm() {
				const binding = this.binding;
				const s = this.state.getSnapshot();
				if (binding === null || !s.open || s.submitting || s.confirming === null || !s.acknowledged) return;
				await this.settle(binding, s.confirming);
			}
			/** Run the business settlement for an already admitted option. */
			async settle(binding, option) {
				const s = this.state.getSnapshot();
				if (this.binding !== binding || !s.open || s.submitting) return;
				this.state.set({
					...s,
					submitting: true,
					confirming: null,
					acknowledged: false,
					error: null
				});
				try {
					await binding.spec.onSelect(option, binding.context);
				} catch (error) {
					console.error(`[ui-commands] popupSelect onSelect failed for /${binding.command}:`, error);
					if (this.binding !== binding) return;
					this.state.set({
						...this.state.getSnapshot(),
						submitting: false,
						error: errorText(error)
					});
					return;
				}
				if (this.binding !== binding) return;
				this.deps.consume(binding.segment);
				this.binding = null;
				this.state.set(CLOSED);
				this.deps.focusComposer();
			}
			/**
			* Close the shell; aborts a flying options fetch and revokes settlement
			* rights. An outside pointer interaction dismisses plainly (the click's own
			* target takes focus); Escape passes focusComposer to return focus explicitly.
			* @param opts - focusComposer: also restore composer focus (Escape path).
			*/
			dismiss(opts) {
				if (this.binding === null) return;
				this.binding.abort.abort();
				this.binding = null;
				this.state.set(CLOSED);
				if (opts?.focusComposer === true) this.deps.focusComposer();
			}
			/** Scope-teardown disposer: abort in-flight work and clear state (no focus side effect). */
			dispose() {
				this.binding?.abort.abort();
				this.binding = null;
				this.state.set(CLOSED);
			}
		};
		//#endregion
		//#region lib/types/client/service.js
		/**
		* CommandUiRuntime (`ctx.commandUi`): the '/' command source over the
		* session-keyed directory, the client-contribution registry, and the
		* per-session popupSelect controllers. Candidate synthesis merges the host
		* catalog with contributions by availability, then position filtering and
		* the `/` menu's shared name ranking (ui-primitives `rankByName`); a
		* host/contribution name collision fails loud. Every execute
		* addresses the session's agent by sessionId — sessions are always
		* agent-backed.
		*/
		/** Recover the command name from a line the Host confirmed as executed. */
		function submittedCommandName(line) {
			const trimmed = line.trim();
			const separator = trimmed.search(/\s/u);
			return (separator === -1 ? trimmed : trimmed.slice(0, separator)).slice(1);
		}
		/** Locale keys for the canonical first-party Host command descriptions. */
		const HOST_DESCRIPTION_KEYS = new Map([
			["compact", "description.compact"],
			["export", "description.export"],
			["feedback", "description.feedback"],
			["goal", "description.goal"],
			["permission", "description.permission"],
			["plan", "description.plan"]
		]);
		/** Command surface: session-keyed directory + '/' source + contribution registry + per-session popups. */
		var CommandUiRuntime = class extends _deepseek_ai_cordis.Service {
			static inject = [
				"inputTriggers",
				"sessions",
				"remote",
				"remote.commands"
			];
			directory;
			live = {
				contributions: /* @__PURE__ */ new Map(),
				decorations: /* @__PURE__ */ new Map(),
				popups: /* @__PURE__ */ new Map()
			};
			/** `command`-namespace translator (composer refusal notices). */
			t;
			/**
			* @param ctx - owning root context (plugin fiber; the service registers
			* itself as `command` and follows that fiber's lifetime).
			*/
			constructor(ctx) {
				super(ctx, "commandUi");
				const locale = ctx.get("locale");
				if (locale === void 0) throw new Error("ui-commands: locale service unavailable");
				this.t = locale.bind("command");
				this.directory = new CommandDirectory(async (sessionId) => {
					if (this.sessions().subagentAddress(sessionId) !== void 0) return [];
					const result = await ctx.remote.commands.list(sessionId);
					if (!result.ok) throw new Error(`command.list failed: ${result.error.code}: ${result.error.message}`);
					return result.value;
				});
				const inputTriggers = ctx.get("inputTriggers");
				if (inputTriggers === void 0) throw new Error("ui-commands: slash service unavailable");
				ctx.effect(() => inputTriggers.registerSource({
					trigger: "/",
					name: "command",
					candidates: (session, req) => this.candidates(session, req),
					onPick: (pick) => this.dispatch(pick),
					matchSpace: (session, token) => this.matchSpace(session, token),
					matchEnter: (session, line, signal, envelope) => this.matchEnter(session, line, signal, envelope),
					warm: (session) => {
						this.directory.warm(session.sessionId);
					}
				}), "command: slash source");
				ctx.remote.$on("commands/change", () => {
					this.directory.invalidateAll();
				});
				ctx.remote.$on("agent-preset/selected", (sessionId) => {
					this.directory.resetSession(sessionId);
				});
				ctx.on("connection/reset", () => {
					this.directory.resetConnected();
				});
			}
			/**
			* Register one client command contribution; effect disposer (rides the
			* caller's fiber). Duplicate names throw.
			* @param contribution - the contribution (descriptor + availability + popup spec).
			* @returns the disposer removing the registration.
			*/
			register(contribution) {
				const dispose = this.ctx.effect(() => {
					const { contributions } = this.live;
					if (contributions.has(contribution.name)) throw new Error(`ui-commands: duplicate contribution for /${contribution.name}`);
					contributions.set(contribution.name, contribution);
					return () => {
						contributions.delete(contribution.name);
					};
				}, "command.register()");
				return () => {
					dispose();
				};
			}
			/**
			* Hang a bare-invocation decoration on one host command; effect disposer
			* (rides the caller's fiber). Duplicate names throw.
			* @param decoration - host command name + availability + popup spec.
			* @returns the disposer removing the registration.
			*/
			decorate(decoration) {
				const dispose = this.ctx.effect(() => {
					const { decorations } = this.live;
					if (decorations.has(decoration.name)) throw new Error(`ui-commands: duplicate decoration for /${decoration.name}`);
					decorations.set(decoration.name, decoration);
					return () => {
						decorations.delete(decoration.name);
					};
				}, "command.decorate()");
				return () => {
					dispose();
				};
			}
			/**
			* Resolve the per-session popup controller (lazy; dies with the session
			* scope). The controller's consume callback dispatches the scoped
			* consume-token event back to this session; focusComposer reaches the
			* composer through the overlay slot currency.
			* @param actx - session-scope ctx.
			* @returns the resident controller.
			*/
			popupFor(actx) {
				const id = this.sessions().scopeOf(actx);
				if (id === void 0) throw new Error("command.popupFor requires a session scope");
				const { popups } = this.live;
				const existing = popups.get(id);
				if (existing !== void 0) return existing;
				const controller = new PopupSelectController({
					consume: (segment) => actx.bail(actx, "slash/input-consume-token", { guard: segment.via === "menu" ? {
						kind: "span",
						span: segment.span
					} : {
						kind: "bare-token",
						token: segment.token
					} }) === true,
					focusComposer: () => {
						this.focusHooks.get(id)?.();
					}
				});
				popups.set(id, controller);
				actx.effect(() => () => {
					controller.dispose();
					popups.delete(id);
					this.focusHooks.delete(id);
				}, "command: session popup");
				return controller;
			}
			/** Composer focus hooks by session (the overlay wiring binds the textarea focus here). */
			focusHooks = /* @__PURE__ */ new Map();
			/**
			* Bind one session's composer-focus hook (overlay slot wiring; unbind on unmount).
			* @param id - session id.
			* @param focus - textarea focus callback.
			* @returns the unbind disposer.
			*/
			bindComposerFocus(id, focus) {
				this.focusHooks.set(id, focus);
				return () => {
					if (this.focusHooks.get(id) === focus) this.focusHooks.delete(id);
				};
			}
			/** Menu candidates: host catalog + contribution availability, then position filtering and the shared name ranking. */
			async candidates(session, req) {
				const list = await this.directory.ensureReady(session.sessionId, req.signal);
				const rows = [];
				const seen = /* @__PURE__ */ new Set();
				for (const c of list) {
					seen.add(c.name);
					rows.push({
						name: c.name,
						description: this.hostDescription(c),
						...c.input !== void 0 ? { hint: c.input.hint } : {}
					});
				}
				for (const contribution of this.live.contributions.values()) {
					if (!contribution.available(session)) continue;
					if (seen.has(contribution.name)) throw new Error(`ui-commands: contribution /${contribution.name} collides with a host command`);
					rows.push({
						name: contribution.name,
						description: contribution.description()
					});
				}
				return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(rows.filter((c) => req.position === "leading" || c.hint === void 0), req.query);
			}
			/** Translate exact built-in Host copy while preserving scoped or third-party descriptors verbatim. */
			hostDescription(command) {
				const key = HOST_DESCRIPTION_KEYS.get(command.name);
				return key !== void 0 && command.description === en[key] ? this.t(key) : command.description;
			}
			/** Decision table, menu column: contribution/decorated-host → popup or action; host input → claim; host bare → detached execute. */
			dispatch(pick) {
				const name = pick.candidate.name;
				const contribution = this.live.contributions.get(name);
				if (contribution !== void 0 && contribution.available(pick.session)) {
					this.invoke(name, contribution.ui, pick.session, {
						via: "menu",
						span: pick.span
					});
					return "handled";
				}
				const desc = this.directory.resolve(pick.session.sessionId, name);
				if (desc === void 0) return void 0;
				const decoration = this.live.decorations.get(name);
				if (decoration !== void 0 && decoration.available(pick.session)) {
					this.invoke(name, decoration.ui, pick.session, {
						via: "menu",
						span: pick.span
					});
					return "handled";
				}
				if (desc.input !== void 0) return { claim: this.leadingClaim(desc, pick.session) };
				this.consumeVia(pick.session.sessionId, {
					via: "menu",
					span: pick.span
				});
				this.runDetached(desc, pick.session, `/${name}`);
				return "handled";
			}
			/** Decision table, space column: hot-key sync check; only host leadingInput claims. */
			matchSpace(session, token) {
				if (!token.startsWith("/")) return void 0;
				const name = token.slice(1);
				if (this.live.contributions.has(name)) return void 0;
				const desc = this.directory.resolve(session.sessionId, name);
				if (desc === void 0 || desc.input === void 0) return void 0;
				return { claim: this.leadingClaim(desc, session) };
			}
			/**
			* Decision table, enter column. Strong-waits the session's catalog (a
			* warmup failure rejects — never a silent downgrade). Contributions and
			* bare host commands act on the bare token only; leadingInput claims
			* args-tolerant.
			*
			* Envelope policy: an enter submission carrying attachments resolves only
			* through a command declaring attachment acceptance. Every other submitting
			* route — popup, non-accepting claim, bare detached execute — throws the
			* refusal so the machine surfaces one composer notice and the draft and
			* attachments stay in place; nothing executes and nothing is dropped. An
			* action submits nothing and runs regardless.
			*/
			async matchEnter(session, line, signal, envelope) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("/")) return void 0;
				const ws = trimmed.search(/\s/);
				const token = ws === -1 ? trimmed : trimmed.slice(0, ws);
				const bare = ws === -1;
				const name = token.slice(1);
				if (name === "") return void 0;
				const refuseAttachments = () => {
					throw new Error(this.t("notice.attachmentsUnsupported", { command: name }));
				};
				const contribution = this.live.contributions.get(name);
				if (contribution !== void 0 && contribution.available(session)) {
					if (!bare) return void 0;
					if (envelope.attachments > 0 && contribution.ui.kind !== "action") refuseAttachments();
					this.invoke(name, contribution.ui, session, {
						via: "enter",
						token
					});
					return "handled";
				}
				await this.directory.ensureReady(session.sessionId, signal);
				const desc = this.directory.resolve(session.sessionId, name);
				if (desc === void 0) return void 0;
				if (bare) {
					const decoration = this.live.decorations.get(name);
					if (decoration !== void 0 && decoration.available(session)) {
						if (envelope.attachments > 0 && decoration.ui.kind !== "action") refuseAttachments();
						this.invoke(name, decoration.ui, session, {
							via: "enter",
							token
						});
						return "handled";
					}
				}
				if (desc.input !== void 0) {
					if (envelope.attachments > 0 && desc.input.attachments !== true) refuseAttachments();
					return { claim: this.leadingClaim(desc, session) };
				}
				if (!bare) return void 0;
				if (envelope.attachments > 0) refuseAttachments();
				this.consumeVia(session.sessionId, {
					via: "enter",
					token
				});
				this.runDetached(desc, session, trimmed);
				return "handled";
			}
			/**
			* Invoke one contribution or decoration (menu pick / bare enter): open the
			* session's popup, or consume the token and run the action.
			*/
			invoke(name, ui, session, segment) {
				if (ui.kind === "action") {
					this.consumeVia(session.sessionId, segment);
					ui.run(session);
					return;
				}
				const actx = this.scopeFor(session.sessionId);
				if (actx === void 0) return;
				this.popupFor(actx).open(name, ui, session, segment);
			}
			/** Build the leadingInput claim: token `/name ` + the command.execute submit transaction. */
			leadingClaim(desc, session) {
				const token = `/${desc.name} `;
				return {
					token,
					...desc.input !== void 0 ? { hint: desc.input.hint } : {},
					...desc.input?.attachments === true ? { attachments: true } : {},
					submit: (args, _actx, attachments) => this.execute(session, token + args, attachments)
				};
			}
			/**
			* The command.execute transaction, addressed to the session's agent — pure
			* admission semantics. An unmatched line reports an error outcome (the
			* composer's immediate admission feedback); an admitted command reports
			* plain success regardless of its handler outcome, because the host
			* executor durably logged the lifecycle (`command/run`/`command/done`) and
			* the outcome renders as a persistent flow node — the composer never
			* echoes it. A handler error result reports an error outcome so the
			* composer keeps the draft and attachments for correction.
			* A refused call throws.
			*/
			async execute(session, line, attachments = []) {
				const result = await this.ctx.remote.commands.execute(session.sessionId, line, attachments);
				if (!result.ok) throw new Error(`command.execute failed: ${result.error.code}: ${result.error.message}`);
				if (result.value === void 0) return {
					kind: "error",
					text: `unknown or malformed command: ${line}`
				};
				this.notifyExecuted(session.sessionId, submittedCommandName(line), result.value.result);
				if (attachments.length > 0 && result.value.result.kind === "error") return {
					kind: "error",
					text: result.value.result.text
				};
				return { kind: "success" };
			}
			/** Publish the local acknowledgment without letting an observer change command admission. */
			notifyExecuted(sessionId, name, result) {
				const args = [
					"command/executed",
					sessionId,
					name,
					result
				];
				for (const listener of this.ctx.events.dispatch("emit", args)) try {
					const returned = listener(sessionId, name, result);
					if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
						this.warnExecutedListenerFailure(name, error);
					});
				} catch (error) {
					this.warnExecutedListenerFailure(name, error);
				}
			}
			/** Log one contained `command/executed` observer failure. */
			warnExecutedListenerFailure(name, error) {
				this.ctx.logger.warn("client command: a command/executed listener for \"%s\" failed", name);
				this.ctx.logger.warn(error);
			}
			/**
			* Fire-and-forget execute for the internal ('handled') paths. Outcomes are
			* NOT surfaced here: the host executor durably logs the command lifecycle
			* (`command/run`/`command/done`), and the mux-broadcast events render as a
			* persistent flow node on every tab. Only an admission failure — which never
			* entered a handler and therefore never logged — falls back to the composer
			* notice as immediate feedback.
			*/
			runDetached(desc, session, line) {
				this.execute(session, line).then((outcome) => {
					if (outcome.kind === "error") this.noticeFor(session.sessionId, "error", outcome.text ?? `/${desc.name} failed`);
				}, (error) => {
					this.noticeFor(session.sessionId, "error", error instanceof Error ? error.message : String(error));
				});
			}
			/** Dispatch a consume-token event to one session (menu-pick / bare-enter execute paths). */
			consumeVia(id, segment) {
				const actx = this.scopeFor(id);
				if (actx === void 0) return;
				actx.bail(actx, "slash/input-consume-token", { guard: segment.via === "menu" ? {
					kind: "span",
					span: segment.span
				} : {
					kind: "bare-token",
					token: segment.token
				} });
			}
			/** Route an admission failure to the session's composer notice channel (scope gone = attempt died with it). */
			noticeFor(id, level, text) {
				const actx = this.scopeFor(id);
				if (actx === void 0) return;
				const conversation = actx.get("conversation");
				if (conversation === void 0) return;
				conversation.input.for(actx).notify(level, text);
			}
			/** id → actx interchange (registered exchange point: this service coordinates for projection-only sources). */
			scopeFor(id) {
				return this.sessions().scope(id);
			}
			sessions() {
				const sessions = this.ctx.get("sessions");
				if (sessions === void 0) throw new Error("ui-commands: sessions service unavailable");
				return sessions;
			}
		};
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
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-commands/src/client/PopupSelectView.module.css.mjs
		const css = ".mufS8W_card{z-index:100;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);background:var(--dsw-specific-menu);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);min-width:min(220px,100%);max-width:100%;max-height:320px;box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:20px;outline:none;flex-direction:column;padding:4px;display:flex;position:absolute;bottom:calc(100% + 4px);left:0;overflow:hidden}.mufS8W_viewport{flex-direction:column;min-height:0;display:flex;overflow-y:auto}.mufS8W_row{cursor:pointer;color:var(--dsw-alias-label-primary);border-radius:8px;align-items:center;gap:8px;padding:6px 8px;font-size:13px;display:flex}.mufS8W_rowActive{background:var(--dsw-alias-interactive-bg-hover)}.mufS8W_label{white-space:nowrap;text-overflow:ellipsis;flex:auto;min-width:0;overflow:hidden}.mufS8W_detail{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:12px;overflow:hidden}.mufS8W_check{color:var(--dsw-alias-label-primary);flex:none;display:inline-flex}.mufS8W_status{color:var(--dsw-alias-label-tertiary);padding:8px 10px;font-size:13px}.mufS8W_search{border:.5px solid var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);background:0 0;border-radius:8px;outline:none;margin:2px 2px 4px;padding:6px 8px;font-size:13px}.mufS8W_error{color:var(--dsw-alias-state-error-primary);align-items:center;gap:8px;padding:6px 8px;font-size:12px;display:flex}.mufS8W_errorText{text-overflow:ellipsis;flex:1;overflow:hidden}.mufS8W_retry{border:.5px solid var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:6px;padding:2px 8px;font-size:12px}";
		const tagId = "@deepseek-ai/dsh-client-ui-commands/PopupSelectView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-commands";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PopupSelectView_module_css_default = {
			"card": "mufS8W_card",
			"check": "mufS8W_check",
			"detail": "mufS8W_detail",
			"error": "mufS8W_error",
			"errorText": "mufS8W_errorText",
			"label": "mufS8W_label",
			"retry": "mufS8W_retry",
			"row": "mufS8W_row",
			"rowActive": "mufS8W_rowActive",
			"search": "mufS8W_search",
			"status": "mufS8W_status",
			"viewport": "mufS8W_viewport"
		};
		//#endregion
		//#region lib/types/client/PopupSelectView.js
		/**
		* Official popupSelect shell: renders one session's PopupSelectController
		* store into the conversation.input.overlay anchor. Unlike the slash menu
		* (combobox — textarea keeps focus), this shell HOLDS focus while open: the
		* inner search input takes focus, plain typing filters the loaded options
		* locally, Enter/↑↓ drive the filtered highlight (scrolled into view), Escape
		* dismisses back to the composer, and ←→ keep the search input's native
		* caret. Any pointer interaction outside the box dismisses (the click's own
		* target takes focus). Closed state renders null; the overlay slot stays
		* mounted. The card height clamps to the space above the composer.
		*/
		/** Design cap on the card height (same MenuDropdown family as the slash menu). */
		const MAX_HEIGHT = 320;
		/**
		* Render the popupSelect shell overlay entry.
		* @param props - injected face: the session's shell controller; `t` rides the standard locale seat.
		* @returns the select card while open; null while closed.
		*/
		function PopupSelectView({ popup, t }) {
			const state = (0, react.useSyncExternalStore)((fn) => popup.state.subscribe(fn), () => popup.state.getSnapshot());
			const cardRef = (0, react.useRef)(null);
			const searchRef = (0, react.useRef)(null);
			const maxHeight = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredMaxHeight)(cardRef, MAX_HEIGHT, state);
			const active = state.open ? state.active : null;
			(0, react.useEffect)(() => {
				if (active === null) return;
				cardRef.current?.querySelector("[aria-selected=\"true\"]")?.scrollIntoView({ block: "nearest" });
			}, [active]);
			(0, react.useEffect)(() => {
				if (!state.open || state.confirming !== null) return;
				const onPointerDown = (ev) => {
					if (cardRef.current !== null && ev.target instanceof Node && cardRef.current.contains(ev.target)) return;
					popup.dismiss();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, [
				state.open,
				state.confirming,
				popup
			]);
			(0, react.useEffect)(() => {
				if (state.open && state.confirming === null) searchRef.current?.focus();
			}, [state.open, state.confirming]);
			if (!state.open) return null;
			const rows = filterOptions(state.options, state.search);
			const confirmation = state.confirming?.confirmation;
			const onKeyDown = (ev) => {
				switch (ev.key) {
					case "ArrowDown":
						ev.preventDefault();
						popup.move(1);
						return;
					case "ArrowUp":
						ev.preventDefault();
						popup.move(-1);
						return;
					case "Enter":
						ev.preventDefault();
						popup.select(state.active);
						return;
					case "Escape":
						ev.preventDefault();
						popup.dismiss({ focusComposer: true });
						return;
					default:
				}
			};
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.confirming === null && (0, react_jsx_runtime.jsxs)("div", {
				ref: cardRef,
				className: PopupSelectView_module_css_default.card,
				style: { maxHeight },
				"aria-label": t("overlay.aria", { command: String(state.command) }),
				onKeyDown,
				children: [
					(0, react_jsx_runtime.jsx)("input", {
						ref: searchRef,
						className: PopupSelectView_module_css_default.search,
						type: "text",
						placeholder: t("search.placeholder"),
						"aria-label": t("search.aria"),
						value: state.search,
						readOnly: state.submitting,
						onChange: (ev) => {
							popup.setSearch(ev.currentTarget.value);
						}
					}),
					state.error !== null && (0, react_jsx_runtime.jsxs)("div", {
						className: PopupSelectView_module_css_default.error,
						role: "alert",
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: PopupSelectView_module_css_default.errorText,
							children: state.error
						}), state.status === "failed" && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: PopupSelectView_module_css_default.retry,
							onClick: () => {
								popup.retry();
							},
							children: t("retry")
						})]
					}),
					state.status === "pending" && (0, react_jsx_runtime.jsx)("div", {
						className: PopupSelectView_module_css_default.status,
						children: t("status.loading")
					}),
					state.submitting && (0, react_jsx_runtime.jsx)("div", {
						className: PopupSelectView_module_css_default.status,
						children: t("status.applying")
					}),
					state.status === "ready" && rows.length === 0 && (0, react_jsx_runtime.jsx)("div", {
						className: PopupSelectView_module_css_default.status,
						children: t("status.empty")
					}),
					state.status === "ready" && (0, react_jsx_runtime.jsx)("div", {
						role: "listbox",
						"aria-label": t("listbox.aria", { command: String(state.command) }),
						className: PopupSelectView_module_css_default.viewport,
						children: rows.map((option, index) => (0, react_jsx_runtime.jsxs)("div", {
							role: "option",
							"aria-selected": index === state.active,
							className: clsx(PopupSelectView_module_css_default.row, index === state.active && PopupSelectView_module_css_default.rowActive),
							onClick: () => {
								popup.select(index);
							},
							onMouseEnter: () => {
								popup.highlight(index);
							},
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: PopupSelectView_module_css_default.label,
									children: option.label
								}),
								option.detail !== void 0 && (0, react_jsx_runtime.jsx)("span", {
									className: PopupSelectView_module_css_default.detail,
									children: option.detail
								}),
								option.active === true && (0, react_jsx_runtime.jsx)("span", {
									className: PopupSelectView_module_css_default.check,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {})
								})
							]
						}, option.id))
					})
				]
			}), confirmation !== void 0 && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
				open: true,
				title: confirmation.title,
				description: confirmation.description,
				acknowledgeLabel: confirmation.acknowledgeLabel,
				cancelLabel: confirmation.cancelLabel,
				closeLabel: t("close"),
				confirmLabel: confirmation.confirmLabel,
				acknowledged: state.acknowledged,
				onAcknowledgedChange: (value) => {
					popup.acknowledge(value);
				},
				onCancel: () => {
					popup.cancelConfirmation();
				},
				onConfirm: () => {
					popup.confirm();
				}
			})] });
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "command";
		/** Required services: the '/' source registry, session scopes, commands Remote, and locale registry. */
		const inject = [
			"inputTriggers",
			"sessions",
			"remote",
			"remote.commands",
			"locale"
		];
		/**
		* Client plugin body: mount the service, then register the popupSelect shell
		* into the input overlay once its declarer is up.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-commands: dictionaries");
			ctx.plugin(CommandUiRuntime);
			ctx.inject([
				"slots",
				"commandUi",
				"sessions"
			], (scope) => {
				const command = scope.commandUi;
				const sessions = scope.get("sessions");
				scope.slots.inject("conversation.input.overlay", () => scope.slots.register({
					name: "conversation.input.overlay",
					id: "command-popup",
					order: 1,
					locale: NS,
					inject: (sessionId) => {
						const actx = sessions.scope(sessionId);
						if (actx === void 0) throw new Error(`ui-commands: session "${String(sessionId)}" resolved no scope`);
						return { popup: command.popupFor(actx) };
					}
				}, PopupSelectView));
			});
		}
		//#endregion
		exports.CommandDirectory = CommandDirectory;
		exports.CommandUiRuntime = CommandUiRuntime;
		exports.PopupSelectController = PopupSelectController;
		exports.apply = apply;
		exports.filterOptions = filterOptions;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
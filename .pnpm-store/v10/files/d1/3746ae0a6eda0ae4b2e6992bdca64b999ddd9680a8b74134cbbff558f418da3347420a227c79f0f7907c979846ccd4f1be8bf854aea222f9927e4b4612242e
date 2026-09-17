window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-session",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_client_ui_slots = require("@deepseek-ai/dsh-client-ui-slots");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/session-provider.js
		/** Session-owned rendering semantics for the standard SessionProvider seat. */
		/**
		* Render the selected Session body or its empty branch.
		* @param binding - current Session scope binding.
		* @param props - standard Session area render props.
		* @returns the selected Session subtree, keyed by Session identity.
		*/
		function renderSessionArea(binding, { empty, children }) {
			const sessionId = binding.key;
			if (sessionId === void 0) return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: empty?.() ?? null });
			return (0, react_jsx_runtime.jsx)(react.Fragment, { children }, sessionId);
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Session Controller adapter for React selector hooks and Slot scope data. */
		var PendingInteractionDomain = class {
			precedence;
			changed;
			values = /* @__PURE__ */ new Map();
			constructor(precedence, changed) {
				this.precedence = precedence;
				this.changed = changed;
			}
			valuesSnapshot() {
				return [...this.values.values()].map((entry) => entry.interaction);
			}
			publish(interaction, delegate) {
				if (this.values.has(interaction.key)) throw new Error(`ui-session: duplicate pending interaction key '${interaction.key}'`);
				this.values.set(interaction.key, {
					interaction,
					delegate
				});
				this.changed();
				let active = true;
				return () => {
					if (!active) return;
					active = false;
					if (!this.values.delete(interaction.key)) return;
					this.changed();
				};
			}
			/** Remove every pending value and return the operations that settle their owners. */
			release() {
				const delegates = [...this.values.values()].map((entry) => entry.delegate);
				this.values.clear();
				return delegates;
			}
		};
		const BUILTIN_SOURCE = {
			hooks: ["session"],
			keyedHooks: ["projection"],
			props: ["sessionId"],
			resolve: (binding) => ({
				hooks: { session: binding.session },
				keyedHooks: { projection: (key) => binding.session.projections.faceOf(key) },
				props: { sessionId: binding.sessionId }
			})
		};
		/** Session-scoped source roster and renderer adapter. */
		var UiSession = class extends _deepseek_ai_cordis.Service {
			sessions;
			descriptors = [BUILTIN_SOURCE];
			bindings = /* @__PURE__ */ new Map();
			absent;
			currentBinding;
			currentListeners = /* @__PURE__ */ new Set();
			pendingDomains = [];
			pendingSnapshot = /* @__PURE__ */ new Map();
			pendingListeners = /* @__PURE__ */ new Set();
			/** Root source of pending UI interactions, independent from Controller snapshots. */
			pendingInteractions = {
				getSnapshot: () => this.pendingSnapshot,
				subscribe: (listener) => {
					this.pendingListeners.add(listener);
					return () => {
						this.pendingListeners.delete(listener);
					};
				}
			};
			/** Renderer-facing adapter for `session` and `session-maybe` scopes. */
			adapter;
			/**
			* @param ctx - Client root context.
			* @param sessions - Controller-owned Session object layer.
			*/
			constructor(ctx, sessions) {
				super(ctx, "uiSession");
				this.sessions = sessions;
				this.absent = this.materializeAbsent();
				this.currentBinding = this.resolveCurrent();
				this.adapter = {
					current: {
						getSnapshot: () => this.currentBinding,
						subscribe: (listener) => {
							this.currentListeners.add(listener);
							return () => {
								this.currentListeners.delete(listener);
							};
						}
					},
					resolve: (key) => this.resolve(key),
					renderArea: renderSessionArea
				};
				ctx.effect(() => {
					const disposeList = sessions.list.subscribe(() => {
						this.publishCurrent();
					});
					return () => {
						disposeList();
						const records = [...this.bindings.values()];
						this.bindings.clear();
						for (const record of records) record.release();
					};
				}, "ui-session: Session binding projection");
			}
			/**
			* Register one Session-scoped standard-source contribution.
			* @param descriptor - static member roster and per-binding resolver.
			* @returns disposer owned by the caller's Cordis fiber.
			*/
			provide(descriptor) {
				const runtimeDescriptor = descriptor;
				const dispose = this.ctx.effect(() => {
					this.descriptors.push(runtimeDescriptor);
					try {
						this.rebuildBindings();
					} catch (error) {
						this.descriptors.pop();
						throw error;
					}
					return () => {
						const index = this.descriptors.indexOf(runtimeDescriptor);
						this.descriptors.splice(index, 1);
						this.rebuildBindings();
					};
				}, "uiSession.provide()");
				return () => {
					dispose();
				};
			}
			/**
			* Register one pending-interaction domain and return its publication function.
			* Domain teardown first removes its visible values, then delegates and awaits
			* every still-active owner request.
			* @param precedence - deterministic cross-domain precedence; larger values win.
			* @returns a function that publishes one interaction and its teardown delegation.
			*/
			registerPendingInteraction(precedence) {
				const domain = new PendingInteractionDomain(precedence, () => {
					this.publishPendingInteractions();
				});
				const runtimeDomain = domain;
				this.ctx.effect(() => {
					this.pendingDomains.push(runtimeDomain);
					this.publishPendingInteractions();
					return async () => {
						const delegates = domain.release();
						const index = this.pendingDomains.indexOf(runtimeDomain);
						this.pendingDomains.splice(index, 1);
						this.publishPendingInteractions();
						await Promise.allSettled(delegates.map((delegate) => Promise.resolve().then(delegate)));
					};
				}, "uiSession.registerPendingInteraction()");
				return (interaction, delegate) => domain.publish(interaction, delegate);
			}
			rebuildBindings() {
				const absent = this.materializeAbsent();
				const bindings = /* @__PURE__ */ new Map();
				try {
					for (const [sessionId, cached] of this.bindings) bindings.set(sessionId, this.createMaterializedBinding(cached.owner));
				} catch (error) {
					for (const record of bindings.values()) record.release();
					throw error;
				}
				const previous = this.bindings;
				this.absent = absent;
				this.bindings = bindings;
				for (const record of previous.values()) record.release();
				this.publishCurrent();
			}
			resolve(key) {
				const owner = this.sessions.binding(key);
				if (owner === void 0) return void 0;
				const cached = this.bindings.get(key);
				if (cached?.owner === owner) return cached.value;
				const record = this.createMaterializedBinding(owner);
				this.bindings.set(key, record);
				cached?.release();
				return record.value;
			}
			resolveCurrent() {
				const current = this.sessions.list.getSnapshot().current;
				return current === void 0 ? this.absent : this.resolve(current) ?? this.absent;
			}
			publishCurrent() {
				const next = this.resolveCurrent();
				if (next === this.currentBinding) return;
				this.currentBinding = next;
				(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.currentListeners, "[ui-session] current binding");
			}
			publishPendingInteractions() {
				const next = /* @__PURE__ */ new Map();
				for (const domain of this.pendingDomains) for (const interaction of domain.valuesSnapshot()) {
					const precedence = domain.precedence(interaction);
					const previous = next.get(interaction.sessionId);
					if (previous === void 0 || precedence >= previous.precedence) next.set(interaction.sessionId, {
						interaction,
						precedence
					});
				}
				const projected = new Map([...next].map(([sessionId, value]) => [sessionId, value.interaction]));
				if (samePendingInteractions(this.pendingSnapshot, projected)) return;
				this.pendingSnapshot = projected;
				(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.pendingListeners, "[ui-session] pending interactions");
			}
			createMaterializedBinding(owner) {
				const value = this.materialize(owner);
				const releaseEffect = owner.ctx.effect(() => () => {
					if (this.bindings.get(owner.sessionId) !== record) return;
					this.bindings.delete(owner.sessionId);
					if (this.currentBinding !== value) return;
					this.currentBinding = this.absent;
					(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.currentListeners, "[ui-session] current binding");
				}, `ui-session: binding ${owner.sessionId}`);
				const record = {
					owner,
					value,
					release: () => {
						releaseEffect();
					}
				};
				return record;
			}
			materialize(binding) {
				const hooks = {};
				const keyedHooks = {};
				const props = {};
				const finalProps = /* @__PURE__ */ new Set();
				for (const descriptor of this.descriptors) {
					const contribution = descriptor.resolve(binding);
					validateContribution(descriptor, contribution);
					copyDeclared("hook", hooks, descriptor.hooks, contribution.hooks, finalProps);
					copyDeclared("keyed hook", keyedHooks, descriptor.keyedHooks, contribution.keyedHooks, finalProps);
					copyDeclared("prop", props, descriptor.props, contribution.props, finalProps);
				}
				const value = {
					key: binding.sessionId,
					ctx: binding.ctx,
					hooks,
					keyedHooks,
					props
				};
				this.ctx.slots.bindStoreScope(value);
				return value;
			}
			materializeAbsent() {
				const hooks = {};
				const keyedHooks = {};
				const props = {};
				const finalProps = /* @__PURE__ */ new Set();
				for (const descriptor of this.descriptors) {
					declareAbsent("hook", hooks, descriptor.hooks, finalProps);
					declareAbsent("keyed hook", keyedHooks, descriptor.keyedHooks, finalProps);
					declareAbsent("prop", props, descriptor.props, finalProps);
				}
				return {
					key: void 0,
					hooks,
					keyedHooks,
					props
				};
			}
		};
		function validateContribution(descriptor, contribution) {
			rejectUndeclared("hook", descriptor.hooks, contribution.hooks);
			rejectUndeclared("keyed hook", descriptor.keyedHooks, contribution.keyedHooks);
			rejectUndeclared("prop", descriptor.props, contribution.props);
		}
		function rejectUndeclared(kind, declared, values) {
			for (const name of Object.keys(values ?? {})) if (!(declared ?? []).includes(name)) throw new Error(`uiSession.provide: undeclared ${kind} '${name}'`);
		}
		function copyDeclared(kind, target, declared, values, finalProps) {
			for (const name of declared ?? []) {
				claimStandardProp(kind, name, finalProps);
				const value = values?.[name];
				if (value === void 0) throw new Error(`uiSession.provide: missing ${kind} '${name}'`);
				target[name] = value;
			}
		}
		function declareAbsent(kind, target, declared, finalProps) {
			for (const name of declared ?? []) {
				claimStandardProp(kind, name, finalProps);
				target[name] = void 0;
			}
		}
		function claimStandardProp(kind, name, finalProps) {
			const propName = kind === "prop" ? name : (0, _deepseek_ai_dsh_client_ui_slots.standardHookPropName)(name);
			if (finalProps.has(propName)) throw new Error(`uiSession.provide: duplicate ${kind} '${name}' at prop '${propName}'`);
			finalProps.add(propName);
		}
		/** Required Controller and renderer services. */
		const inject = ["sessions", "slots"];
		/**
		* Install the Session root source and scoped adapter.
		* @param ctx - Client Cordis context.
		*/
		function apply(ctx) {
			const service = new UiSession(ctx, ctx.sessions);
			ctx.slots.provideRoot({ hooks: {
				sessions: ctx.sessions.list,
				sessionPendingInteraction: service.pendingInteractions
			} });
			ctx.slots.installScope("session", service.adapter);
		}
		function samePendingInteractions(left, right) {
			if (left.size !== right.size) return false;
			for (const [sessionId, interaction] of left) if (right.get(sessionId) !== interaction) return false;
			return true;
		}
		//#endregion
		exports.UiSession = UiSession;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
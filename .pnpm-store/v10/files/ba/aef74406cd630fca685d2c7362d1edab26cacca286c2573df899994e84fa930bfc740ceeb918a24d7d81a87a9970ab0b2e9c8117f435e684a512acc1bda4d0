window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-resources",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		/**
		* The protocol key of one address: the host of a `dsh-resource://` URL, as the
		* URL parser reads it (lower-cased). Any other string — another scheme, or one
		* the URL parser rejects — names no protocol and is treated like an address
		* whose protocol has no provider.
		* @param address - the full address.
		* @returns the protocol key, or `undefined` when the address is not a resource address.
		*/
		function protocolOf(address) {
			let parsed;
			try {
				parsed = new URL(address);
			} catch {
				return;
			}
			if (parsed.protocol !== `dsh-resource:`) return void 0;
			return parsed.hostname === "" ? void 0 : parsed.hostname.toLowerCase();
		}
		function idle(status) {
			return {
				status,
				value: void 0,
				failure: void 0
			};
		}
		/** The `ctx.resources` implementation. */
		var ResourceRegistry = class {
			ctx;
			providers = /* @__PURE__ */ new Map();
			records = /* @__PURE__ */ new Map();
			/** @param ctx - Context whose effects own the registered providers. */
			constructor(ctx) {
				this.ctx = ctx;
			}
			register(provider) {
				const runtime = provider;
				const { protocol } = runtime;
				if (this.providers.has(protocol)) throw new Error(`resources: protocol "${protocol}" already has a provider`);
				const dispose = this.ctx.effect(() => {
					this.providers.set(protocol, runtime);
					for (const record of this.recordsOf(protocol)) this.attach(record);
					return () => {
						this.providers.delete(protocol);
						for (const record of this.recordsOf(protocol)) this.detach(record);
					};
				}, `resources.register(${JSON.stringify(protocol)})`);
				return () => {
					dispose();
				};
			}
			pin(address, signal) {
				if (signal.aborted) return;
				const record = this.record(address);
				this.hold(record);
				signal.addEventListener("abort", () => {
					this.release(record);
				}, { once: true });
			}
			source(address) {
				return this.record(address).source;
			}
			record(address) {
				let record = this.records.get(address);
				if (record === void 0) {
					record = this.create(address);
					this.records.set(address, record);
				}
				return record;
			}
			create(address) {
				const protocol = protocolOf(address);
				const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(idle(this.providerOf(protocol) === void 0 ? "none" : "loading"));
				const record = {
					address,
					protocol,
					store,
					holders: 0,
					controller: void 0,
					source: {
						getSnapshot: () => store.getSnapshot(),
						subscribe: (listener) => {
							const unsubscribe = store.subscribe(listener);
							this.hold(record);
							let active = true;
							return () => {
								if (!active) return;
								active = false;
								unsubscribe();
								this.release(record);
							};
						}
					}
				};
				return record;
			}
			providerOf(protocol) {
				return protocol === void 0 ? void 0 : this.providers.get(protocol);
			}
			*recordsOf(protocol) {
				for (const record of this.records.values()) if (record.protocol === protocol) yield record;
			}
			hold(record) {
				record.holders += 1;
				if (record.holders === 1) this.start(record);
			}
			release(record) {
				record.holders -= 1;
				if (record.holders > 0) return;
				this.stop(record);
				record.store.set(idle(this.providerOf(record.protocol) === void 0 ? "none" : "loading"));
			}
			/** The provider arrived: a held record opens its stream, an idle one turns `loading`. */
			attach(record) {
				if (record.holders > 0) {
					this.start(record);
					return;
				}
				record.store.set(idle("loading"));
			}
			/** The provider left: the stream ends and the record reports `none`. */
			detach(record) {
				this.stop(record);
				record.store.set(idle("none"));
			}
			start(record) {
				const provider = this.providerOf(record.protocol);
				if (provider === void 0) return;
				const controller = new AbortController();
				record.controller = controller;
				if (record.store.getSnapshot().status !== "loading") record.store.set(idle("loading"));
				this.consume(record, provider, controller.signal);
			}
			stop(record) {
				record.controller?.abort();
				record.controller = void 0;
			}
			/** Failures arrive as frames; a throw inside the stream is left to surface. */
			async consume(record, provider, signal) {
				const stream = provider.open(record.address, { signal });
				for await (const frame of stream) {
					if (signal.aborted) break;
					record.store.set(frame.ok ? {
						status: "live",
						value: frame.value,
						failure: void 0
					} : {
						status: "failed",
						value: record.store.getSnapshot().value,
						failure: frame.error
					});
				}
			}
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required browser services. */
		const inject = ["slots"];
		/**
		* Client plugin body: provide `ctx.resources` and contribute the `resource`
		* root keyed hook that reaches every slot component as `useResource`.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const resources = new ResourceRegistry(ctx);
			const disposeService = ctx.reflect.provide("resources", resources);
			ctx.effect(() => () => {
				disposeService();
			}, "client-resources: service face");
			ctx.slots.provideRoot({ keyedHooks: { resource: (address) => resources.source(address) } });
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
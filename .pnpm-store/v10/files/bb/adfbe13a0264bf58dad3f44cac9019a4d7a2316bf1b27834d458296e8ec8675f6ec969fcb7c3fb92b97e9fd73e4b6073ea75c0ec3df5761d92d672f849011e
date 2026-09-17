import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { freeze, produce } from "immer";
//#region lib/types/index.js
/**
* React-free snapshot store engine (zustand vanilla + immer + subscribeWithSelector +
* rafFlush middleware + opt-in persist + dev freeze) plus the declarative
* shell over it: {@link defineStore} bakes an init/persist/actions literal
* into a {@link StoreHandle}, the registration-side store seat of slot
* terminals. Engine products are bare observables — subscribe/getSnapshot/
* update/set, NO selector hook. Hook synthesis is ui-renderer's (the one
* uSES bridge, cached per source at the binding site).
*/
/**
* Notify an observer set without allowing one callback to starve the rest.
* @param listeners - current observer callbacks; copied before dispatch.
* @param label - diagnostic owner prefix.
* @param args - callback arguments.
*/
function notifySubscribers(listeners, label, ...args) {
	for (const listener of [...listeners]) try {
		listener(...args);
	} catch (error) {
		console.error(`${label} subscriber failed:`, error);
	}
}
/**
* Shallow equality for selector slices (zustand/shallow semantics; travels
* with the engine so hook consumers need no zustand dependency).
* @param a - left value.
* @param b - right value.
* @returns whether the values are shallowly equal.
*/
function shallowEqual(a, b) {
	return shallow(a, b);
}
/** Batches subscriber notification into one flush per animation frame. */
function rafBatch(notify) {
	const schedule = typeof requestAnimationFrame === "function" ? (fn) => {
		requestAnimationFrame(() => {
			fn();
		});
	} : (fn) => {
		queueMicrotask(fn);
	};
	let scheduled = false;
	return () => {
		if (scheduled) return;
		scheduled = true;
		schedule(() => {
			scheduled = false;
			notify();
		});
	};
}
/**
* Create a snapshot store.
*
* Flush default is 'sync' (controlled inputs need same-tick echo); frame-driven
* stores opt into 'raf', where a frame's worth of updates coalesces into one
* notification. Known raf-mode tradeoff: a component mounting mid-frame reads
* fresh state while existing subscribers hear it next flush — transient
* frame-level skew, same nature as the object layer's microtask batching.
*
* @param init - initial state.
* @param opts - flush mode and opt-in persistence (localStorage, keyed by name).
* @returns the store.
*/
function createSnapshotStore(init, opts) {
	const withSelector = subscribeWithSelector(() => init);
	const api = createStore()(withSelector);
	if (opts?.persist) attachPersistence(api, opts.persist.name);
	let subscribe = (fn) => api.subscribe(() => {
		notifySubscribers([fn], "[client-store]");
	});
	if (opts?.flush === "raf") {
		const listeners = /* @__PURE__ */ new Set();
		const flush = rafBatch(() => {
			notifySubscribers(listeners, "[client-store]");
		});
		api.subscribe(flush);
		subscribe = (fn) => {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		};
	}
	return {
		getSnapshot: () => api.getState(),
		subscribe: (fn) => subscribe(fn),
		update: (mutator) => {
			api.setState(produce(api.getState(), (draft) => {
				mutator(draft);
			}), true);
		},
		set: (next) => {
			api.setState(devFreeze(next), true);
		}
	};
}
/**
* Whole-value JSON persistence to localStorage. Hand-rolled instead of the
* zustand persist middleware: its write path spreads state into an object
* (`partialize({ ...get() })`), exploding primitive state (a persisted string
* draft becomes {0:'h',1:'e',...}) — not fixable via merge/deserialize options
* because the corruption happens before serialization. Storage failures
* (quota, private mode) only disable persistence, never break the store.
*/
function attachPersistence(api, name) {
	if (typeof localStorage === "undefined") return;
	try {
		const raw = localStorage.getItem(name);
		if (raw !== null) api.setState(devFreeze(JSON.parse(raw)), true);
	} catch (error) {
		console.error(`snapshot store '${name}' rehydration failed:`, error);
	}
	api.subscribe((state) => {
		try {
			localStorage.setItem(name, JSON.stringify(state));
		} catch (error) {
			console.error(`snapshot store '${name}' persistence failed:`, error);
		}
	});
}
/** Deep-freeze draftable wholesale-set state outside production: set() bypasses immer's freeze. */
function devFreeze(value) {
	return freeze(value, true);
}
/**
* Declare a store: initial state, optional persistence, and the full write
* set as pure draft mutators. The returned handle is the registration
* currency of the store seat — its identity keys instance sharing. Satisfies
* ui-slots' DefineStore contract (the handle/instance are the engine-extended
* subtypes).
*
* The `A & ActionsDecl<T>` actions position is load-bearing: T resolves from
* `init` in the first inference round, and the intersection then contextually
* types each mutator's draft parameter (context-sensitive functions defer),
* so call sites write `(d, x: X) => { ... }` with no draft annotation. If a
* future TS version breaks this single-literal inference, the design's
* documented fallback is currying (`defineStore(init).actions({...})`).
* @param decl - init lambda (fresh state per instance), optional persist key, actions table.
* @returns the store handle.
*/
function defineStore(decl) {
	return {
		spec: decl,
		create(scopeKey) {
			const persistKey = decl.persist === void 0 ? void 0 : scopeKey === void 0 ? decl.persist : `${decl.persist}.${scopeKey}`;
			const store = createSnapshotStore(decl.init(), persistKey !== void 0 ? { persist: { name: persistKey } } : void 0);
			const actions = {};
			for (const key of Object.keys(decl.actions)) {
				const mutate = decl.actions[key];
				actions[key] = (...params) => {
					store.update((draft) => {
						mutate(draft, ...params);
					});
				};
			}
			return {
				actions,
				getSnapshot: () => store.getSnapshot(),
				subscribe: (fn) => store.subscribe(fn),
				store,
				clearPersisted: () => {
					if (persistKey === void 0 || typeof localStorage === "undefined") return;
					try {
						localStorage.removeItem(persistKey);
					} catch {}
				}
			};
		}
	};
}
//#endregion
export { createSnapshotStore, defineStore, notifySubscribers, shallowEqual };

//# sourceMappingURL=index.js.map
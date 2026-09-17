import { Service } from "@deepseek-ai/cordis";
//#region lib/types/error.js
/**
* Error vocabulary for the storage hub and its backends.
* @module @deepseek-ai/dsh-storage/src/error
*/
/**
* Error thrown by the hub and by backend implementations. The `code` is the
* stable contract consumers may switch on; `message` is diagnostic prose.
*/
var StorageError = class extends Error {
	code;
	name = "StorageError";
	/**
	* @param code - Stable discriminant for the failure class.
	* @param message - Human-readable diagnostic detail.
	* @param options - Standard error options (`cause`).
	*/
	constructor(code, message, options) {
		super(message, options);
		this.code = code;
	}
};
//#endregion
//#region lib/types/registry.js
/**
* Named backend registry of the storage hub.
* @module @deepseek-ai/dsh-storage/src/registry
*/
/**
* Mutable name → backend table. Multiple backends stay mounted side by side;
* which backend serves which consumer is the consumer's configuration
* (e.g. the domain layer's route table), never a hub-global choice.
*/
var BackendRegistry = class {
	backends = /* @__PURE__ */ new Map();
	/**
	* Register a named backend. Registration is an effect: the returned
	* disposer removes the name. Disposal does NOT close the backend — the
	* owning plugin closes it after unregistering.
	* @param name - Backend name, e.g. `json` or `sqlite`.
	* @param backend - The backend instance.
	* @returns the disposer that unregisters the name.
	*/
	register(name, backend) {
		if (this.backends.has(name)) throw new StorageError("duplicate-backend", `storage backend '${name}' is already registered`);
		this.backends.set(name, backend);
		return () => {
			if (this.backends.get(name) === backend) this.backends.delete(name);
		};
	}
	/**
	* Resolve a backend by name.
	* @param name - Registered backend name.
	* @returns the backend.
	*/
	get(name) {
		const backend = this.backends.get(name);
		if (!backend) throw new StorageError("backend-not-found", `storage backend '${name}' is not registered (registered: ${[...this.backends.keys()].join(", ") || "none"})`);
		return backend;
	}
	/**
	* Registered backend names, for diagnostics.
	* @returns a snapshot array of names.
	*/
	names() {
		return [...this.backends.keys()];
	}
};
//#endregion
//#region lib/types/backend.js
/**
* Backend-facing vocabulary of the storage hub: a backend owns one medium
* (a file-tree root, a database file) and exposes operation groups over it.
* This module defines the normative contract text for backend implementers; the shared
* conformance suite in `tests/contract.ts` checks every rule.
* @module @deepseek-ai/dsh-storage/src/backend
*/
/** Allowed format for unit and table names: safe as a file name and as a SQL identifier segment without escaping. */
const UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/;
//#endregion
//#region lib/types/index.js
/**
* Storage hub (`ctx.storage`): a named backend registry plus mounted
* data-form facilities. The hub itself performs no IO — backends own media,
* data forms (the domain layer first) own semantics.
* @module @deepseek-ai/dsh-storage
*/
/**
* Derive the Cordis lifecycle service that one named backend plugin provides.
* Domain-form providers inject these keys so activation cannot race backend
* registration even though callers continue resolving backends through the
* storage registry.
* @param name - Backend registry name.
* @returns the corresponding lifecycle-only service key.
*/
function storageBackendServiceKey(name) {
	return `storage.backend.${name}`;
}
/**
* The storage hub service. Backends register under `backend`; data forms
* mount under their `StorageForms` key and are reached as `ctx.storage.<form>`.
*/
var Storage = class extends Service {
	/** Named backend table; multiple backends stay mounted side by side. */
	backend = new BackendRegistry();
	forms = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "storage");
	}
	/**
	* Mount a data-form facility on the hub. Mounting is an effect: the
	* returned disposer unmounts the form.
	* @param form - Form key declared in {@link StorageForms}.
	* @param facility - The facility instance to expose.
	* @returns the disposer that unmounts the form.
	*/
	mount(form, facility) {
		if (this.forms.has(form)) throw new StorageError("duplicate-mount", `storage form '${String(form)}' is already mounted`);
		this.forms.set(form, facility);
		return () => {
			if (this.forms.get(form) === facility) this.forms.delete(form);
		};
	}
	/**
	* Resolve a mounted data form.
	* @param form - Form key declared in {@link StorageForms}.
	* @returns the mounted facility.
	*/
	form(form) {
		if (!this.forms.has(form)) throw new StorageError("form-not-mounted", `storage form '${String(form)}' is not mounted`);
		return this.forms.get(form);
	}
	/** Domain data form; present once the domain layer plugin is loaded. */
	get domain() {
		return this.form("domain");
	}
};
//#endregion
export { BackendRegistry, Storage, Storage as default, StorageError, UNIT_NAME_RE, storageBackendServiceKey };

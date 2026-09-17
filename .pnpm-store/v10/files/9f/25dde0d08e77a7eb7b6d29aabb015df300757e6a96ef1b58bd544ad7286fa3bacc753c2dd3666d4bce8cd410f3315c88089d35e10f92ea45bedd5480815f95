import { Service } from "@deepseek-ai/cordis";
import { HarnessError } from "@deepseek-ai/dsh-llm";
//#region lib/types/types.js
/**
* Vocabulary for the filesystem Service Definition (`ctx.fs`): the opaque target/version
* identities, the metadata `stat` returns, the write-intent and outcome shapes, the
* literal-edit request/outcome, and the typed error taxonomy.
* @module @deepseek-ai/dsh-fs/types
*/
/**
* Brand a string as an {@link FsTargetKey}. For backend use only — a consumer
* never manufactures a key, it receives one from `resolve()`.
* @param key - the backend's raw key string (the local backend passes a realpath).
* @returns the same string, branded; no validation is performed.
*/
function FsTargetKey(key) {
	return key;
}
/**
* Brand a string as an {@link FsVersion}. For backend use only — a consumer
* never manufactures a version, it receives one from `stat`/write/edit outcomes.
* @param v - the backend's raw version string.
* @returns the same string, branded; no validation is performed.
*/
function FsVersion(v) {
	return v;
}
/**
* Typed filesystem error. Extends {@link HarnessError} so it carries a stable
* {@link FsErrorCode} and chains `cause`. `dsh-fs` owns this vocabulary so
* backends and the policy layer raise the same codes instead of each inventing
* message strings.
*/
var FsError = class extends HarnessError {
	code;
	constructor(message, code, options) {
		super(message, code, options);
		this.code = code;
	}
};
//#endregion
//#region lib/types/index.js
/**
* Filesystem Service Definition for one execution world. Backends own stable target
* identity, process paths and file URIs, containment, text reads, decoding,
* binary rejection, and atomic mutations. Read windows and
* observed-state policy stay in consumer and policy plugins; `editText`
* remains here so version check, literal match, and rewrite share one critical
* section.
* @module @deepseek-ai/dsh-fs
*/
/**
* Abstract filesystem provider. Targets must preserve identity across aliases;
* reads expose regular UTF-8 text or typed errors, listings are stable and
* content-free, and mutations are atomic. Optional guards add stale protection
* without changing the unguarded provider contract.
*/
var FileSystem = class extends Service {
	constructor(ctx) {
		super(ctx, "fs");
	}
	/**
	* The sandbox mode this backend enforces on mutations BY DEFAULT, or
	* `undefined` when it does not confine at all — the capability fact the tool
	* layer reads to advertise the escalation fields honestly (mirrors
	* `ShellExecutor.sandboxMode`). The base class and the bare local backend
	* report `undefined`; a sandboxing backend (`@deepseek-ai/dsh-fs-sandbox`)
	* overrides it with the deployment default. A session override may make the
	* effective mode narrower or wider, so strict escalation widening is checked
	* per call rather than encoded in this default-relative fact.
	* @returns the configured default mode of a sandboxing backend; `undefined`
	*   for a backend that never confines.
	*/
	get sandboxMode() {}
	/**
	* Map an absolute path from the harness host into this filesystem's
	* execution world when both paths identify the same file. The base provider
	* exposes no mapping; host-backed or explicitly shared backends override it.
	* @param hostPath - absolute path in the harness host filesystem.
	* @returns the process path for the same file, or undefined when this
	*   execution world cannot read that host file.
	*/
	processPathFromHostPath(hostPath) {}
};
//#endregion
export { FileSystem, FileSystem as default, FsError, FsTargetKey, FsVersion };

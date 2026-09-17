import { Service } from "@deepseek-ai/cordis";
import { brandString } from "@deepseek-ai/dsh-brand";
//#region lib/types/index.js
/**
* Service Definition for the credential-reference capability seam (`ctx.credentials`). Settings and composition files carry
* *references* to secrets — environment-variable names — while providers own
* the actual values and their storage. Consumers resolve a reference once per
* operation, so a changed credential reaches the next operation without any
* plugin restart, and configuration surfaces describe a reference without
* ever seeing its value.
* @module @deepseek-ai/dsh-credentials
*/
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Both halves of a {@link CredentialKey}; the `/` between them is what keeps it out of {@link REF_PATTERN}. */
const KEY_SEGMENT_PATTERN = /^[a-z][a-z0-9-]*$/;
/**
* Brand a raw string as a {@link CredentialRef}.
* @param value - candidate reference; a POSIX shell identifier such as `DEEPSEEK_API_KEY`.
* @returns the branded reference.
*/
function credentialRef(value) {
	if (!isCredentialRefName(value)) throw new TypeError(`credential ref "${value}" must match ${String(REF_PATTERN)}`);
	return brandString(value);
}
/**
* Whether a raw string could name a reference at all. Consumers that receive
* environment-variable names from somewhere else — a provider library's own
* ambient discovery, a hook payload — ask this before resolving, because a name
* outside the grammar has no reference to miss and should read as "not set"
* rather than as a thrown error.
* @param value - candidate reference.
* @returns true when {@link credentialRef} would accept it.
*/
function isCredentialRefName(value) {
	return REF_PATTERN.test(value);
}
/**
* Whether a raw string could be a {@link credentialKey} segment at all.
* Consumers whose addressing units come from somewhere else — a settings dict
* key, a library's own provider id — ask this before building a key, because a
* unit outside the grammar can never have stored a record and should read as
* "nothing stored" rather than as a thrown error.
* @param value - candidate segment.
* @returns true when {@link credentialKey} would accept it as either segment.
*/
function isCredentialKeySegment(value) {
	return KEY_SEGMENT_PATTERN.test(value);
}
/**
* Brand a scope and an id as a {@link CredentialKey}.
* @param scope - the owning plugin's registered name, such as `llm-pi-ai`.
* @param id - that plugin's own addressing unit, such as a provider route key.
* @returns the branded key.
* @throws TypeError when either segment is not a lowercase hyphenated identifier.
*/
function credentialKey(scope, id) {
	for (const segment of [scope, id]) if (!KEY_SEGMENT_PATTERN.test(segment)) throw new TypeError(`credential key segment "${segment}" must match ${String(KEY_SEGMENT_PATTERN)}`);
	return brandString(`${scope}/${id}`);
}
/**
* Brand a stored `<scope>/<id>` string as a {@link CredentialKey}. This is the
* read half of {@link credentialKey}, for a provider admitting keys off disk.
* @param value - candidate key in its joined form.
* @returns the branded key.
* @throws TypeError when the value is not exactly two valid segments.
*/
function parseCredentialKey(value) {
	const segments = value.split("/");
	const [scope, id] = segments;
	if (segments.length !== 2 || scope === void 0 || id === void 0) throw new TypeError(`credential key "${value}" must be "<scope>/<id>"`);
	return credentialKey(scope, id);
}
/**
* The owning plugin's name for one key. A record whose scope names no
* currently registered owner is an orphan, which a configuration surface must
* report as such rather than as a working credential.
* @param key - the key to read.
* @returns the scope segment.
*/
function credentialKeyScope(key) {
	return key.slice(0, key.indexOf("/"));
}
/**
* The owning plugin's own addressing unit for one key — the half that plugin
* chose, such as a provider route.
* @param key - the key to read.
* @returns the id segment.
*/
function credentialKeyId(key) {
	return key.slice(key.indexOf("/") + 1);
}
/**
* Abstract credential service over two key spaces that answer two questions.
*
* A {@link CredentialRef} answers "what is behind this environment-variable
* name", layered over the process environment, the provider-managed store, and
* `.env` files. One seam-wide rule binds that half: an empty stored value is
* absent everywhere — `resolve` skips it, `describe` reports it unconfigured —
* so a blank never masquerades as a configured secret.
*
* A {@link CredentialKey} answers "what credential does this plugin hold for
* this id". Nothing can layer here — an authorization grant has no
* environment to be read from — so presence of the record is the whole fact,
* and {@link modifyRecord} is the only write path because a correct write
* depends on the current value (a token refresh is read-decide-replace under
* one lock).
*/
var CredentialProvider = class extends Service {
	constructor(ctx) {
		super(ctx, "credentials");
	}
	/**
	* Fan `credentials/reference-updated` out with contained listener failures: every
	* listener runs, and a sync throw or async rejection is logged without
	* changing the committed operation's outcome — except `INVARIANT`-coded
	* failures, which rethrow after every listener ran (the rethrow reaches the
	* caller only from synchronous listeners, so invariant checks on this event
	* must not be async functions). Providers call this only after the write or
	* reload actually committed, so a broken observer can never make a durable
	* change look failed.
	* @param ref - the reference whose stored value changed.
	*/
	notifyUpdated(ref) {
		this.fanOut("credentials/reference-updated", ref);
	}
	/**
	* Fan `credentials/record-updated` out on exactly the terms
	* {@link notifyUpdated} documents, for the record half of the seam.
	* @param key - the record whose stored value changed.
	*/
	notifyRecordUpdated(key) {
		this.fanOut("credentials/record-updated", key);
	}
	/** The contained dispatch both notifications run through; see {@link notifyUpdated}. */
	fanOut(event, subject) {
		let invariantFailure;
		const args = [event, subject];
		for (const listener of this.ctx.events.dispatch("emit", args)) try {
			const returned = listener(subject);
			if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
				this.warnListenerFailure(event, subject, error);
			});
		} catch (error) {
			if (error?.code === "INVARIANT") {
				invariantFailure ??= error;
				continue;
			}
			this.warnListenerFailure(event, subject, error);
		}
		if (invariantFailure !== void 0) throw invariantFailure;
	}
	/** Contained-listener diagnostic shared by the sync and async failure paths. */
	warnListenerFailure(event, subject, error) {
		this.ctx.logger.warn("credentials: a %s listener for \"%s\" failed", event, subject);
		this.ctx.logger.warn(error);
	}
};
//#endregion
export { CredentialProvider, CredentialProvider as default, credentialKey, credentialKeyId, credentialKeyScope, credentialRef, isCredentialKeySegment, isCredentialRefName, parseCredentialKey };

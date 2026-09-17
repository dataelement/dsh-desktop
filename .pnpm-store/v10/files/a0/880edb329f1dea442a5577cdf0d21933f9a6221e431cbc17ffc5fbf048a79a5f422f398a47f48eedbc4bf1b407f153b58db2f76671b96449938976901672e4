//#region lib/types/index.js
/**
* A dependency-light **retention** library: bounded model-facing output for
* tools that must cap how much context they return. A caller feeds items or
* text chunks into a bounded object, then gets the retained content plus exact
* omission metadata ({@link RetainedItems} / {@link RetainedText}).
*
* The library owns ONLY the mechanical question "what did we keep, what did we
* omit?". Tool-specific code still owns
* business semantics: file grouping, line numbering, exit codes, provider error
* states, per-line preview truncation, spill files, and the model-facing prose.
* In particular {@link RetainedText.truncated}/{@link RetainedItems.truncated}
* means "the retainer omitted otherwise-available content because of a budget" —
* NOT "the upstream was incomplete". Permission failures, skipped binaries,
* provider partial failures, and unreadable candidates stay in tool-domain
* fields, never folded into `truncated`.
*
* This is deliberately a library, not a cordis service or plugin: it takes no
* `ctx`, registers nothing, and emits no events. The two retainers are the only
* stateful pieces and their state is per-instance (one accumulation), never
* cross-call. Tool packages import it directly when they need bounded output.
*
* The two retainers differ in resource model, which is why they are two names
* rather than one generic collector:
* - {@link ItemRetainer} bounds ordered logical units (paths, grep matches,
*   search sources). `head` retention only in v1.
* - {@link TextRetainer} bounds byte-oriented text streams (bash stdout/stderr,
*   web bodies). `head` / `tail` / `headTail`, preserving UTF-8 boundaries at
*   {@link TextRetainer.finish}.
*
* @module @deepseek-ai/dsh-output-retention
*/
/** Assert a budget field is a non-negative integer (the retainer request contract). */
function assertBudget(value, name) {
	if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
}
/**
* Bounds an ordered stream of logical units, keeping the first `maxItems`
* ({@link ItemRetentionStrategy} `head`). `push()` reports, per unit, whether it
* was kept and whether the retained result is now truncated.
*
* Grouping, sorting, path mapping, per-unit preview truncation, and any
* `incomplete` state stay OUTSIDE the retainer: it counts and keeps, nothing
* more. The caller pushes prepared logical units and, after {@link finish},
* groups/sorts the retained subset itself.
*/
var ItemRetainer = class {
	maxItems;
	items = [];
	seen = 0;
	omittedCount = 0;
	/** @param strategy Head strategy: `maxItems` (non-negative integer). */
	constructor(strategy) {
		assertBudget(strategy.maxItems, "maxItems");
		this.maxItems = strategy.maxItems;
	}
	/**
	* Offer one unit. Kept when the retainer is below `maxItems`; otherwise dropped
	* and counted as omitted. Callers keep pushing all observed units, so the final
	* {@link Omitted} count is exact.
	*
	* @param item The prepared logical unit (path, flat match, source).
	* @returns The per-push {@link PushDecision}.
	*/
	push(item) {
		this.seen++;
		if (this.items.length < this.maxItems) {
			this.items.push(item);
			return {
				kept: true,
				truncated: false
			};
		}
		this.omittedCount++;
		return {
			kept: false,
			truncated: true
		};
	}
	/**
	* Finalize and report what was kept and omitted.
	*
	* @returns The {@link RetainedItems} snapshot (safe to group/sort downstream).
	*/
	finish() {
		const truncated = this.omittedCount > 0;
		return {
			items: this.items,
			truncated,
			seen: this.seen,
			kept: this.items.length,
			omitted: truncated ? {
				kind: "exact",
				count: this.omittedCount
			} : { kind: "none" }
		};
	}
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
/**
* Drop a trailing incomplete UTF-8 sequence so a prefix cut never emits a
* replacement char at the boundary. Walks back over continuation bytes
* (`10xxxxxx`) to the lead byte; if fewer bytes follow it than the lead byte's
* length declares, the sequence is incomplete and is trimmed. A complete tail,
* or a run too long/short to be a valid lead, is returned untouched (any
* genuinely malformed interior is left for the decoder to replace).
*/
function trimTrailingPartialUtf8(bytes) {
	let i = bytes.length - 1;
	while (i >= 0 && (bytes[i] & 192) === 128 && bytes.length - i <= 3) i--;
	if (i < 0) return bytes;
	const lead = bytes[i];
	const expected = lead < 128 ? 1 : lead < 224 ? 2 : lead < 240 ? 3 : lead < 248 ? 4 : 0;
	if (expected === 0) return bytes;
	return bytes.length - i < expected ? bytes.subarray(0, i) : bytes;
}
/**
* Drop leading continuation bytes (`10xxxxxx`) so a suffix cut starts on a
* lead/ASCII byte instead of mid-codepoint.
*/
function trimLeadingContinuationUtf8(bytes) {
	let i = 0;
	while (i < bytes.length && (bytes[i] & 192) === 128) i++;
	return bytes.subarray(i);
}
/**
* Bounds a byte-oriented text stream, keeping a prefix, a suffix, or both
* ({@link TextRetentionStrategy}). All three strategies share one prefix/suffix
* accumulator: `head` is prefix-only, `tail` is suffix-only, `headTail` is both.
*
* Bytes, not characters: caps and `omittedBytes` are byte counts for process/
* body safety. Chunks that straddle a codepoint are handled — {@link finish}
* trims a partial codepoint at each cut so the returned text never introduces a
* replacement char at the boundary. The retainer holds at most
* `prefixCap + tailBytes + one chunk` in memory (old suffix chunks are dropped
* as they slide out), so a large stream does not accumulate unbounded.
*/
var TextRetainer = class {
	prefixCap;
	suffixCap;
	prefixChunks = [];
	prefixHeld = 0;
	suffixChunks = [];
	suffixHeld = 0;
	total = 0;
	/** @param strategy One {@link TextRetentionStrategy} variant; byte budgets must be non-negative integers. */
	constructor(strategy) {
		switch (strategy.kind) {
			case "head":
				assertBudget(strategy.maxBytes, "maxBytes");
				this.prefixCap = strategy.maxBytes;
				this.suffixCap = 0;
				break;
			case "tail":
				assertBudget(strategy.maxBytes, "maxBytes");
				this.prefixCap = 0;
				this.suffixCap = strategy.maxBytes;
				break;
			case "headTail":
				assertBudget(strategy.headBytes, "headBytes");
				assertBudget(strategy.tailBytes, "tailBytes");
				this.prefixCap = strategy.headBytes;
				this.suffixCap = strategy.tailBytes;
				break;
		}
	}
	/**
	* Offer one chunk (a `Uint8Array`, or a `string` encoded as UTF-8). Prefix
	* bytes fill up to the prefix cap then stop; suffix bytes roll so only the
	* last `suffixCap` bytes are retained. `kept` is `true` only when no byte of
	* this chunk was dropped.
	*
	* @param chunk The next bytes of the stream (`Uint8Array` or UTF-8 `string`).
	* @returns The per-push {@link PushDecision}.
	*/
	push(chunk) {
		const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
		const before = this.total;
		this.total += bytes.length;
		const room = this.prefixCap - this.prefixHeld;
		const take = Math.max(0, Math.min(room, bytes.length));
		if (take > 0) {
			this.prefixChunks.push(bytes.subarray(0, take));
			this.prefixHeld += take;
		}
		if (this.suffixCap > 0) {
			this.suffixChunks.push(bytes);
			this.suffixHeld += bytes.length;
			let head = this.suffixChunks[0];
			while (head !== void 0 && this.suffixHeld - head.length >= this.suffixCap) {
				this.suffixChunks.shift();
				this.suffixHeld -= head.length;
				head = this.suffixChunks[0];
			}
			if (head !== void 0 && this.suffixHeld > this.suffixCap) {
				const excess = this.suffixHeld - this.suffixCap;
				this.suffixChunks[0] = head.subarray(excess);
				this.suffixHeld -= excess;
			}
		}
		return {
			kept: !(this.omittedAt(this.total) > this.omittedAt(before)),
			truncated: this.omittedAt(this.total) > 0
		};
	}
	/** Bytes omitted once `total` bytes have been seen: `total − keptPrefix − keptSuffix`. */
	omittedAt(total) {
		const prefixLen = Math.min(total, this.prefixCap);
		const suffixLen = Math.min(total - prefixLen, this.suffixCap);
		return total - prefixLen - suffixLen;
	}
	/**
	* Finalize: decode the retained prefix and suffix (each trimmed to a UTF-8
	* boundary at its cut) and report the exact omitted byte count.
	*
	* @returns The {@link RetainedText} snapshot (safe to hand to a formatter).
	*/
	finish() {
		const prefixLen = Math.min(this.total, this.prefixCap);
		const suffixLen = Math.min(this.total - prefixLen, this.suffixCap);
		const prefix = concat(this.prefixChunks);
		const suffix = concat(this.suffixChunks).subarray(this.suffixHeld - suffixLen);
		const budgetOmitted = this.omittedAt(this.total);
		const [keptPrefix, keptSuffix] = budgetOmitted > 0 ? [trimTrailingPartialUtf8(prefix), trimLeadingContinuationUtf8(suffix)] : [prefix, suffix];
		const text = budgetOmitted > 0 ? decoder.decode(keptPrefix) + decoder.decode(keptSuffix) : decoder.decode(concat([prefix, suffix]));
		const omitted = this.total - keptPrefix.length - keptSuffix.length;
		const truncated = omitted > 0;
		return {
			text,
			truncated,
			omittedBytes: truncated ? {
				kind: "exact",
				count: omitted
			} : { kind: "none" }
		};
	}
};
/** Concatenate chunks into one contiguous buffer (their exact total length). */
function concat(chunks) {
	let length = 0;
	for (const chunk of chunks) length += chunk.length;
	const out = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.length;
	}
	return out;
}
/**
* Standardized, false-precision-safe wording for one {@link Omitted} value —
* the "may standardize omission wording" half the library owns. `exact` prints
* the count (`Omitted 3 items`); `unknown` prints NO count because the caller
* did not provide one. `none` is the empty string.
*
* @param omitted The omission metadata from a retainer result.
* @param unit The noun for the omitted quantity (`items`, `bytes`, `chars`, `lines`).
* @returns A neutral clause (no trailing space), or `''` when nothing was omitted.
*/
function describeOmitted(omitted, unit) {
	switch (omitted.kind) {
		case "none": return "";
		case "exact": return `Omitted ${omitted.count} ${unit}.`;
		case "unknown": return `More ${unit} were omitted.`;
	}
}
/**
* Turn a {@link RetentionNotice} into a one-line footer: the library-owned
* standardized omission clause ({@link describeOmitted}) followed by the tool's
* own recovery guidance. The library never owns recovery words — only the tool
* knows the action ("narrow the pattern", "fetch a more specific URL", "read the
* spill file") — so `recovery` supplies them and receives the full notice to
* phrase from (`kept`, `limit`, `omitted`, …). Either half may be empty; the two
* are joined with a single space.
*
* @param notice The neutral retention outcome.
* @param recovery Tool-supplied guidance builder; receives the notice, returns a sentence (or `''`).
* @returns The combined footer line.
*/
function formatRetentionNotice(notice, recovery) {
	return [describeOmitted(notice.omitted, notice.unit), recovery(notice)].filter((part) => part.length > 0).join(" ");
}
//#endregion
export { ItemRetainer, TextRetainer, describeOmitted, formatRetentionNotice };

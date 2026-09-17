import { Service } from "@deepseek-ai/cordis";
//#region lib/types/types.js
/**
* Vocabulary for the spill storage Service Definition. Types only — the abstract service
* lives in `./index.ts`, implementations in sibling packages
* (`@deepseek-ai/dsh-spill-local` first).
*
* @module @deepseek-ai/dsh-spill/types
*/
/**
* Brand a string as a {@link SpillLocator}.
*
* @param locator The backend-produced locator string to brand.
* @returns The branded spill locator.
*/
function SpillLocator(locator) {
	return locator;
}
//#endregion
//#region lib/types/index.js
/**
* Service Definition for the spill storage capability seam (`ctx.spillStore`): an abstract service defining WHAT a
* spill backend does — persist oversized text and return a model-facing
* locator plus retrieval guidance — without saying HOW. Implementations
* subclass {@link SpillStore} and register as the `spillStore` service;
* `@deepseek-ai/dsh-spill-local` (host filesystem) is the first.
*
* The Service Definition is deliberately minimal: `saveText` and nothing else. It owns NO
* retention policy (that is `@deepseek-ai/dsh-output-retention`), NO tool-result
* replacement (that is `@deepseek-ai/dsh-spill-policy`), and NO retrieval or
* search API. The backend supplies the locator and retrieval hint appropriate
* for its storage substrate.
*
* @module @deepseek-ai/dsh-spill
*/
/**
* Abstract spill storage service. Subclass, implement {@link saveText}, and load
* the subclass as a plugin — it registers as `ctx.spillStore` (one
* implementation per context; loading a second throws, cordis' standard
* duplicate-service behavior).
*
* Semantics every implementation must honor:
* - {@link saveText} persists the FULL `content` verbatim and returns an opaque
*   locator, exact byte length, and model-facing retrieval guidance.
* - Storage is scoped by the request's {@link SaveTextSpill.owner} session; the
*   backend chooses a private (not world-readable) location and a collision-free
*   name derived from — never equal to — the caller's `suggestedName`.
* - `saveText` REJECTS on a real storage failure (permissions, ENOSPC, backend
*   unavailable); the caller decides how to degrade (the spill policy treats a
*   rejection as best-effort and keeps the inline result).
*/
var SpillStore = class extends Service {
	constructor(ctx) {
		super(ctx, "spillStore");
	}
};
//#endregion
export { SpillLocator, SpillStore, SpillStore as default };

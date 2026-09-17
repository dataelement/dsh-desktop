import { Service } from "@deepseek-ai/cordis";
//#region lib/types/grammar.js
/**
* Browser-safe `@file` token grammar shared by terminal and web clients.
*
* @module @deepseek-ai/dsh-file-reference/grammar
*/
/**
* Extract an `@path` or `@"path with spaces` token at the cursor. An `@`
* inside another token, such as an email address, is not a completion trigger.
* @param line - current editor line.
* @param cursorCol - cursor column within that line.
* @returns the active token, or `undefined` outside an `@` token.
*/
function activeAtToken(line, cursorCol) {
	const beforeCursor = line.slice(0, cursorCol);
	const quoted = /(?:^|\s)(@"([^"]*))$/u.exec(beforeCursor);
	if (quoted?.[1] !== void 0 && quoted[2] !== void 0) return {
		prefix: quoted[1],
		query: quoted[2],
		quoted: true
	};
	const plain = /(?:^|\s)(@([^\s]*))$/u.exec(beforeCursor);
	if (plain?.[1] === void 0 || plain[2] === void 0) return void 0;
	return {
		prefix: plain[1],
		query: plain[2],
		quoted: false
	};
}
/**
* Format a selected path as prompt text. Whitespace uses the quoted
* `@"path"` grammar; a quoted directory keeps that quote open after its
* trailing slash so completion can descend another level.
* @param candidate - selected file or directory.
* @param preserveQuote - retain an explicitly opened quote even when unnecessary.
* @returns the insertion value, or `undefined` for a path the editor grammar cannot represent safely.
*/
function formatFileMention(candidate, preserveQuote) {
	const path = candidate.kind === "directory" ? `${candidate.path}/` : candidate.path;
	if (/[\u0000-\u001f\u007f-\u009f"]/u.test(path)) return void 0;
	if (!(preserveQuote || /\s/u.test(path))) return `@${path}`;
	if (candidate.kind === "directory") return `@"${path}`;
	return `@"${path}"`;
}
//#endregion
//#region lib/types/index.js
/**
* File-reference discovery seam shared by host-backed user interfaces.
*
* @module @deepseek-ai/dsh-file-reference
*/
/** Model guidance for path-only references selected by a user interface. */
const FILE_REFERENCE_PROMPT = "Tokens prefixed with @ are workspace paths the user explicitly referenced, relative to the workspace root. A trailing slash marks a directory: list it when its contents matter. Anything else is a file: use the read tool when its contents are needed, and do not claim to have inspected it before reading. @\"...\" quotes a path containing spaces.";
/** Host capability for cancellable file-reference discovery. */
var FileReferenceService = class extends Service {
	constructor(ctx) {
		super(ctx, "fileReferences");
	}
};
//#endregion
export { FILE_REFERENCE_PROMPT, FileReferenceService, FileReferenceService as default, activeAtToken, formatFileMention };

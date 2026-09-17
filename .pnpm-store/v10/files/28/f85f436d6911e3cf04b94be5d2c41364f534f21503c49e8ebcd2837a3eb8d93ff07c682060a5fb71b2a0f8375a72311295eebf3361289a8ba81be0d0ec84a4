import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { FsError } from "@deepseek-ai/dsh-fs";
import { ESCALATION_TARGETS, approveEscalation, canonicalPath, escalationHintMarker, sandboxDenialMarker, validateEscalationArgs } from "@deepseek-ai/dsh-sandbox";
import { structuredPatch } from "diff";
import { basename, extname } from "node:path";
import { AttachmentError, AttachmentId } from "@deepseek-ai/dsh-attachment";
//#region lib/types/read-render.js
/**
* Pure read presentation: turn provider-decoded text into a bounded, line-numbered window and
* model-facing envelope. Chunk scanning caps the current line, so even one newline-free giant
* line cannot grow memory without bound.
* @module @deepseek-ai/dsh-tool-fs/read-render
*/
/** Default maximum characters returned for a single line (the `readMaxLineLength` config). */
const READ_MAX_LINE_LENGTH = 2e3;
/** Default maximum bytes returned for selected file lines (the `readMaxBytes` config). */
const READ_MAX_BYTES = 50 * 1024;
function newAccumulator() {
	return {
		lines: [],
		totalLines: 0,
		outputBytes: 0,
		truncatedByBytes: false
	};
}
function truncateLine(line, maxLineLength) {
	return line.length > maxLineLength ? `${line.substring(0, maxLineLength)}... (line truncated to ${maxLineLength} chars)` : line;
}
function lineByteSize(line, currentLineCount) {
	return Buffer.byteLength(line, "utf8") + (currentLineCount > 0 ? 1 : 0);
}
function consumeLine(acc, rawLine, request) {
	acc.totalLines += 1;
	if (acc.truncatedByBytes || acc.totalLines < request.offset || acc.lines.length >= request.limit) return;
	const text = truncateLine(rawLine, request.maxLineLength);
	const bytes = lineByteSize(text, acc.lines.length);
	if (acc.outputBytes + bytes > request.maxBytes) {
		acc.truncatedByBytes = true;
		return;
	}
	acc.outputBytes += bytes;
	acc.lines.push({
		number: acc.totalLines,
		text
	});
}
function stripCarriageReturn(line) {
	return line.endsWith("\r") ? line.slice(0, -1) : line;
}
function finish(acc, request, displayPath) {
	if (!acc.truncatedByBytes && request.offset > acc.totalLines && !(acc.totalLines === 0 && request.offset === 1)) throw new FsError(`offset ${request.offset} is out of range for "${displayPath}" (${acc.totalLines} lines)`, "FS_NOT_FOUND");
	return {
		lines: acc.lines,
		totalLines: acc.totalLines,
		truncatedByBytes: acc.truncatedByBytes
	};
}
/**
* Build one window from streamed or whole-file chunks, enforcing line and byte caps while still
* scanning to an exact total line count, and throwing `FS_NOT_FOUND` when the requested offset is
* past EOF.
* @param chunks - decoded text chunks in file order; chunk boundaries carry no meaning.
* @param request - the resolved window; the caller has already applied its defaults and caps.
* @param displayPath - the caller-facing path used in the offset-out-of-range error.
* @returns the numbered window lines, the total line count seen, and the byte-cap truncation flag.
*/
async function buildWindow(chunks, request, displayPath) {
	const acc = newAccumulator();
	const lineBufferCap = request.maxLineLength + 1;
	let lineBuffer = "";
	function appendToLineBuffer(segment) {
		if (lineBuffer.length >= lineBufferCap) return;
		lineBuffer += segment;
		if (lineBuffer.length > lineBufferCap) lineBuffer = lineBuffer.slice(0, lineBufferCap);
	}
	function flushLine() {
		consumeLine(acc, stripCarriageReturn(lineBuffer), request);
		lineBuffer = "";
	}
	for await (const chunk of chunks) {
		let startPos = 0;
		let newlinePos;
		while ((newlinePos = chunk.indexOf("\n", startPos)) !== -1) {
			appendToLineBuffer(chunk.slice(startPos, newlinePos));
			flushLine();
			startPos = newlinePos + 1;
		}
		appendToLineBuffer(chunk.slice(startPos));
	}
	if (lineBuffer.length > 0) flushLine();
	return finish(acc, request, displayPath);
}
/**
* Format a read outcome as one OpenCode-style line-numbered text block body.
* @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
* @param outcome - the windowed read to render.
* @returns the model-facing envelope: numbered lines plus a continuation or end-of-file footer.
*/
function formatReadOutput(displayPath, outcome) {
	const endLine = outcome.lines.at(-1)?.number ?? Math.max(0, outcome.offset - 1);
	let footer;
	if (outcome.truncatedByBytes) footer = `(Output capped. Showing lines ${outcome.offset}-${endLine}. Use offset=${endLine + 1} to continue.)`;
	else if (endLine < outcome.totalLines) footer = `(Showing lines ${outcome.offset}-${endLine} of ${outcome.totalLines}. Use offset=${endLine + 1} to continue.)`;
	else footer = `(End of file - total ${outcome.totalLines} lines)`;
	return `<path>${displayPath}</path>
<type>file</type>
<content>
${outcome.lines.length > 0 ? `${outcome.lines.map((line) => `${line.number}: ${line.text}`).join("\n")}\n\n${footer}` : footer}
</content>`;
}
/**
* Lowercased file-extension to syntax-highlighting language hint. Keys are the
* extension without its dot; a UI treats an absent key as plain text. The map is
* intentionally small — common source, config, and markup extensions a
* line-numbered code view benefits from highlighting — not an exhaustive registry.
*/
const LANG_BY_EXTENSION = {
	ts: "ts",
	tsx: "tsx",
	mts: "ts",
	cts: "ts",
	js: "js",
	jsx: "jsx",
	mjs: "js",
	cjs: "js",
	json: "json",
	jsonc: "json",
	py: "py",
	rb: "rb",
	go: "go",
	rs: "rs",
	java: "java",
	c: "c",
	h: "c",
	cc: "cpp",
	cpp: "cpp",
	hpp: "cpp",
	cxx: "cpp",
	cs: "cs",
	kt: "kotlin",
	swift: "swift",
	php: "php",
	sh: "sh",
	bash: "sh",
	zsh: "sh",
	yaml: "yaml",
	yml: "yaml",
	toml: "toml",
	ini: "ini",
	md: "md",
	markdown: "md",
	mdx: "mdx",
	html: "html",
	htm: "html",
	css: "css",
	scss: "scss",
	less: "less",
	sql: "sql",
	xml: "xml",
	lua: "lua"
};
/**
* Derive a syntax-highlighting language hint from a read path's file extension.
* Pure and case-insensitive on the extension; a dotfile with no extension
* (`.gitignore`) and an unknown extension both yield `undefined`.
* @param path - the model-facing path the read reported.
* @returns the language hint for {@link LANG_BY_EXTENSION}, or `undefined` when the extension maps to none.
*/
function langFromPath(path) {
	const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
	const dot = base.lastIndexOf(".");
	if (dot <= 0) return void 0;
	const ext = base.slice(dot + 1).toLowerCase();
	return Object.hasOwn(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : void 0;
}
/**
* Whether `value` is a valid {@link FileTextLine} (defensive narrowing from
* opaque `meta`). `number` must be a 1-based integer line number, since a card
* rendered from a zero, fractional, or non-finite line number would violate the
* 1-based numbering contract the read window promises.
*/
function isFileTextLine(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { number, text } = value;
	return typeof number === "number" && Number.isInteger(number) && number >= 1 && typeof text === "string";
}
/**
* Narrow opaque live or replayed result metadata to a structured read window.
* Malformed metadata returns `undefined` so presentation can fall back to the
* generic text card instead of throwing during replay. Beyond shape, the
* semantic contract of a read window is enforced against replayed JSON that is
* well-typed but out of range: `offset` must be a 1-based integer, `totalLines`
* must be a non-negative integer, each line number must be a 1-based integer no
* less than `offset`, the line numbers must strictly increase, and no line number
* may exceed `totalLines`. Any violation declines to the generic fallback rather
* than emitting a card that misnumbers or overcounts.
* @param meta - result metadata.
* @returns the validated read window, or `undefined` for absent, malformed, or semantically invalid data.
*/
function readMetaFromMeta(meta) {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return void 0;
	const { path, offset, lines, totalLines, lang } = meta;
	if (typeof path !== "string" || typeof totalLines !== "number" || typeof offset !== "number") return void 0;
	if (!Number.isInteger(offset) || offset < 1) return void 0;
	if (!Number.isInteger(totalLines) || totalLines < 0) return void 0;
	if (!Array.isArray(lines) || !lines.every(isFileTextLine)) return void 0;
	if (lang !== void 0 && typeof lang !== "string") return void 0;
	let previous = offset - 1;
	for (const { number } of lines) {
		if (number <= previous || number > totalLines) return void 0;
		previous = number;
	}
	return {
		path,
		offset,
		lines,
		totalLines,
		...lang === void 0 ? {} : { lang }
	};
}
//#endregion
//#region lib/types/session-cwd.js
/**
* Derive the working directory a filesystem tool resolves relative paths against: the calling
* agent's per-session workspace (`exec.agent.session.header.cwd`), so each session's
* `read`/`write`/`edit` act on its workspace, not the server's launch directory.
* Non-agent calls return `undefined`, leaving the fallback in the provider rather than reading
* `process.cwd()` at the tool boundary.
* @module @deepseek-ai/dsh-tool-fs/session-cwd
*/
const PARENT_PATH_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
/**
* The session workspace cwd for this call, or `undefined` when none applies.
* @param exec - the tool-execution context; only its optional `agent` is read.
* @param requestedPath - the path the provider will resolve; parent traversal
*   makes a symlinked cwd's filesystem identity observable.
* @returns the calling agent's session cwd, or undefined for a non-agent caller (the backend then applies its own default).
*/
function sessionCwd(exec, requestedPath) {
	const cwd = exec.agent?.session.header.cwd;
	if (cwd === void 0 || !PARENT_PATH_SEGMENT.test(cwd) && !PARENT_PATH_SEGMENT.test(requestedPath)) return cwd;
	return canonicalPath(cwd);
}
/**
* Resolution options shared by all model-facing filesystem tools.
* @param exec - the tool-execution context supplying session cwd and cancellation.
* @param requestedPath - the path the provider will resolve.
* @param policyWorkspaceRoot - resolved per-call root, when a mutation carries sandbox policy.
* @returns provider resolution options for the current tool call.
*/
function sessionResolveOptions(exec, requestedPath, policyWorkspaceRoot) {
	const cwd = policyWorkspaceRoot ?? sessionCwd(exec, requestedPath);
	return {
		...cwd !== void 0 ? { cwd } : {},
		signal: exec.signal
	};
}
//#endregion
//#region lib/types/read-target.js
/**
* Shared path resolution and regular-file validation for model-facing read tools.
* @module @deepseek-ai/dsh-tool-fs/src/read-target
*/
/**
* Resolve a model-supplied path, observe absence, and require a regular file.
* @param ctx - the plugin context providing filesystem resolution and observation events.
* @param exec - the current tool execution, including session cwd and cancellation.
* @param requestedPath - the raw path supplied to the tool.
* @returns the resolved target and its single stat result.
*/
async function resolveRegularReadTarget(ctx, exec, requestedPath) {
	const target = await ctx.fs.resolve(requestedPath, sessionResolveOptions(exec, requestedPath));
	const info = await ctx.fs.stat(target, exec.signal);
	if (info === void 0) {
		ctx.emit("fs/observed", target, { kind: "absent" }, exec);
		throw new FsError(`cannot read "${target.displayPath}": not found`, "FS_NOT_FOUND");
	}
	if (info.type !== "file") throw new FsError(`cannot read "${target.displayPath}": not a regular file`, "FS_NOT_REGULAR_FILE");
	return {
		target,
		info
	};
}
//#endregion
//#region lib/types/read.js
/**
* Model-facing UTF-8 read. It performs one provider stat for type, routing, and observed version,
* streams large or size-unknown files, renders a bounded window, then emits the observation.
* @module @deepseek-ai/dsh-tool-fs/src/read
*/
/** Default and maximum number of lines returned by one `read` call (the `readLimit` config). */
const READ_LIMIT = 2e3;
/**
* Default streaming threshold (the `readStreamMinSize` config): files at or
* above this size stream; smaller files read whole into memory.
*/
const STREAM_MIN_SIZE = 10 * 1024 * 1024;
function parsePositiveInteger(value, name) {
	if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
	return value;
}
/**
* Validate value constraints the schema DSL can't express. `maxLimit` is the deployment's line cap.
* @param args - the schema-validated raw tool arguments; `offset`/`limit` must be positive integers when given.
* @param maxLimit - the configured line cap: both the default `limit` and the largest one accepted.
* @returns the validated input with `offset` defaulted to 1 and `limit` to `maxLimit`.
*/
function parseReadArgs(args, maxLimit) {
	if (args.file_path.trim().length === 0) throw new Error("file_path must be a non-empty string");
	const offset = args.offset === void 0 ? 1 : parsePositiveInteger(args.offset, "offset");
	const limit = args.limit === void 0 ? maxLimit : parsePositiveInteger(args.limit, "limit");
	if (limit > maxLimit) throw new Error(`limit must be less than or equal to ${maxLimit}`);
	return {
		filePath: args.file_path,
		offset,
		limit
	};
}
/**
* Register the `read` tool and its scope-aware system-prompt guidance.
* @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
* @param caps - the deployment's resolved read caps (plugin config after defaulting).
*/
function applyReadTool(ctx, caps) {
	ctx.systemPrompt.section({
		name: "tool:read",
		order: ctx.systemPrompt.getSectionOrder("TOOL_READ"),
		text: ({ scope }) => ctx.tools.get("read", scope) === void 0 ? "" : "Use the read tool — not shell commands like cat — to inspect text files. Results include line numbers. Use offset and limit to continue reading large files."
	});
	ctx.tools.register(defineTool({
		name: "read",
		description: "Read a UTF-8 text file and return line-numbered content.",
		parameters: {
			file_path: {
				type: "string",
				required: true,
				description: "Path to read, resolved by the filesystem backend."
			},
			offset: {
				type: "number",
				description: "1-based first line to return. Defaults to 1."
			},
			limit: {
				type: "number",
				description: `Maximum number of lines to return. Defaults to ${caps.limit}.`
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true
					},
					offset: {
						type: "integer",
						required: true
					},
					lines: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								number: {
									type: "integer",
									required: true
								},
								text: {
									type: "string",
									required: true
								}
							}
						}
					},
					totalLines: {
						type: "integer",
						required: true
					}
				}
			},
			render: (args, value) => {
				const input = parseReadArgs(args, caps.limit);
				const endLine = value.lines.at(-1)?.number ?? Math.max(0, value.offset - 1);
				const truncatedByBytes = value.lines.length < input.limit && endLine < value.totalLines;
				return [{
					type: "text",
					text: formatReadOutput(value.path, {
						offset: value.offset,
						lines: value.lines,
						totalLines: value.totalLines,
						...truncatedByBytes ? { truncatedByBytes: true } : {}
					})
				}];
			},
			presentationMeta: (_args, value) => {
				const lang = langFromPath(value.path);
				return {
					path: value.path,
					offset: value.offset,
					lines: value.lines.map(({ number, text }) => ({
						number,
						text
					})),
					totalLines: value.totalLines,
					...lang === void 0 ? {} : { lang }
				};
			}
		},
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			const input = parseReadArgs(args, caps.limit);
			const { target, info } = await resolveRegularReadTarget(ctx, exec, input.filePath);
			const window = await buildWindow(info.size === void 0 || info.size >= caps.streamMinSize ? await ctx.fs.streamText(target, exec.signal) : [await ctx.fs.readText(target, exec.signal)], {
				offset: input.offset,
				limit: input.limit,
				maxLineLength: caps.maxLineLength,
				maxBytes: caps.maxBytes
			}, target.displayPath);
			const outcome = {
				path: target.displayPath,
				offset: input.offset,
				lines: window.lines,
				totalLines: window.totalLines
			};
			ctx.emit("fs/observed", target, {
				kind: "present",
				version: info.version
			}, exec);
			return outcome;
		},
		presentResult(_args, result) {
			if (result.isError) return void 0;
			const meta = readMetaFromMeta(result.meta);
			if (meta === void 0) return void 0;
			const only = result.content.length === 1 ? result.content[0] : void 0;
			const text = only?.type === "text" ? only.text : void 0;
			if (text === void 0) return void 0;
			const body = /^<path>[^\n]*<\/path>\n<type>file<\/type>\n<content>\n([\s\S]*)\n<\/content>$/u.exec(text)?.[1];
			if (body === void 0) return void 0;
			return {
				card: "read",
				path: meta.path,
				offset: meta.offset,
				lines: meta.lines,
				totalLines: meta.totalLines,
				...meta.lang === void 0 ? {} : { lang: meta.lang },
				content: [{
					type: "text",
					text: body
				}]
			};
		},
		presentCall(args) {
			const { offset, limit } = args;
			const window = limit !== void 0 && limit > 0 ? ` (${offset ?? 1} - ${(offset ?? 1) + limit - 1})` : offset !== void 0 ? ` (from line ${offset})` : "";
			return {
				card: "generic",
				title: `Read ${args.file_path}${window}`,
				kind: "read",
				locations: [{
					path: args.file_path,
					line: offset ?? 1
				}]
			};
		}
	}));
}
/**
* Compute one {@link FileDiff} per hunk between `before` and `after`, each carrying the
* applied change plus {@link DIFF_CONTEXT} context lines. Pure insertions use `oldText: null`,
* patch-only no-newline markers are omitted, and scattered replacements remain separate hunks.
*
* @param path - the path stamped on every produced diff (the model-facing `file_path`; the
*   bridge relativizes it).
* @param before - the file text before the change (the backend's LF-normalized diff basis).
* @param after - the file text after the change, on the same basis.
* @returns one diff per applied hunk, in file order; empty when the texts are identical.
*/
function computeHunkDiffs(path, before, after) {
	const patch = structuredPatch("", "", before, after, void 0, void 0, { context: 3 });
	const diffs = [];
	for (const hunk of patch.hunks) {
		const oldLines = [];
		const newLines = [];
		for (const line of hunk.lines) {
			if (line.startsWith("\\")) continue;
			const text = line.slice(1);
			if (line.startsWith("-")) oldLines.push(text);
			else if (line.startsWith("+")) newLines.push(text);
			else {
				oldLines.push(text);
				newLines.push(text);
			}
		}
		diffs.push({
			path,
			oldText: oldLines.length > 0 ? oldLines.join("\n") : null,
			newText: newLines.join("\n")
		});
	}
	return diffs;
}
/** Whether `value` is a valid {@link FileDiff} (defensive narrowing from opaque `meta`). */
function isFileDiff(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { path, oldText, newText } = value;
	return typeof path === "string" && (oldText === null || typeof oldText === "string") && typeof newText === "string";
}
/**
* Narrow opaque live or replayed result metadata to non-empty file diffs. Malformed metadata
* returns `undefined` so presentation can fall back instead of throwing during replay.
* @param meta - result metadata.
* @returns validated hunks, or `undefined` for absent or malformed data.
*/
function diffsFromMeta(meta) {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return void 0;
	const diffs = meta.diffs;
	if (!Array.isArray(diffs) || diffs.length === 0 || !diffs.every(isFileDiff)) return void 0;
	return diffs;
}
//#endregion
//#region lib/types/error.js
/**
* Model-facing diagnostics for guarded-mutation failures. Providers and
* policies retain operation-specific causes, while this package owns the
* stable message shown to the model.
* @module @deepseek-ai/dsh-tool-fs/src/error
*/
/**
* Render the stable model-facing diagnostic for a guarded-mutation failure.
* `FS_STALE_VERSION` keeps the provider's reason and appends its re-read
* remedy. `FS_NOT_OBSERVED` replaces operation-specific policy/provider text
* with one path-aware reason and read remedy. The original error remains the
* cause, and both diagnostics preserve its code for machine routing. Anything
* else passes through untouched.
* @param error - the caught value from a write/edit execution.
* @param displayPath - the resolved target path shown to the model.
* @returns a remediated `FsError` for the two guarded-mutation codes, else the original value.
*/
function remediateFsError(error, displayPath) {
	if (!(error instanceof FsError)) return error;
	if (error.code === "FS_NOT_OBSERVED") return new FsError(`cannot modify "${displayPath}": file has not been read — read the file, then retry`, error.code, { cause: error });
	if (error.code === "FS_STALE_VERSION") return new FsError(`${error.message} — re-read the file, then retry`, error.code, { cause: error });
	return error;
}
//#endregion
//#region lib/types/write.js
/**
* Model-facing full-file write. It obtains an optional intent from the single policy slot, calls
* `ctx.fs.writeText` without a stat, then records the resulting version; no policy means an
* unconditional atomic create-or-overwrite.
* @module @deepseek-ai/dsh-tool-fs/src/write
*/
/**
* Validate value constraints the schema DSL can't express: only a non-blank
* `file_path` — an empty `content` is legitimate (it writes an empty file).
* @param args - the schema-validated raw tool arguments.
* @returns the camelCased input; `content` passes through untouched.
*/
function parseWriteArgs(args) {
	if (args.file_path.trim().length === 0) throw new Error("file_path must be a non-empty string");
	return {
		filePath: args.file_path,
		content: args.content
	};
}
/**
* Format a write outcome as one model-facing text block body.
* @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
* @param outcome - the write outcome; its `operation` selects the Created/Updated wording.
* @returns the model-facing confirmation envelope (no file content is echoed back).
*/
function formatWriteOutput(displayPath, outcome) {
	return `<path>${displayPath}</path>
<type>file</type>
<content>
${outcome.operation === "create" ? "Created" : "Updated"} file
</content>`;
}
/**
* Register the `write` tool and its scope-aware system-prompt guidance.
* @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
* @param sandbox - the shared sandbox-escalation API (advertisement, mode stamping, denial mapping).
*/
function applyWriteTool(ctx, sandbox) {
	ctx.systemPrompt.section({
		name: "tool:write",
		order: ctx.systemPrompt.getSectionOrder("TOOL_WRITE"),
		text: ({ scope }) => ctx.tools.get("write", scope) === void 0 ? "" : "Use the write tool to create files or completely replace file contents. Existing files are overwritten, so read an existing file first (the default fs-observation-policy requires it)" + (ctx.tools.get("edit", scope) === void 0 ? "" : " and prefer edit for targeted changes") + "."
	});
	ctx.tools.register(defineTool({
		name: "write",
		description: "Create or fully replace a UTF-8 text file.",
		parameters: {
			file_path: {
				type: "string",
				required: true,
				description: "Path to write, resolved by the filesystem backend."
			},
			content: {
				type: "string",
				required: true,
				description: "Full UTF-8 text content to write."
			},
			...sandbox.escalationModes.length > 0 ? sandbox.schemaFields() : {}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true
					},
					operation: {
						type: "string",
						required: true,
						enum: ["create", "update"]
					},
					before: {
						required: true,
						oneOf: [{ type: "string" }, { type: "null" }]
					},
					after: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: formatWriteOutput(value.path, value)
			}],
			presentationMeta: (args, value) => ({ diffs: value.before === null ? [] : computeHunkDiffs(args.file_path, value.before, value.after).map(({ path, oldText, newText }) => ({
				path,
				oldText,
				newText
			})) })
		},
		async execute(args, exec) {
			const input = parseWriteArgs(args);
			const sandboxPolicy = await sandbox.resolvePolicy("write", args, exec);
			const target = await ctx.fs.resolve(input.filePath, sessionResolveOptions(exec, input.filePath, sandboxPolicy?.workspaceRoot));
			const intent = await ctx.waterfall("fs/write-intent", target, exec, () => void 0);
			let outcome;
			try {
				outcome = await ctx.fs.writeText(target, input.content, intent, exec.signal, sandboxPolicy);
			} catch (error) {
				throw remediateFsError(sandbox.mapError(error, sandboxPolicy), target.displayPath);
			}
			ctx.emit("fs/observed", target, {
				kind: "present",
				version: outcome.version
			}, exec);
			return {
				path: target.displayPath,
				operation: outcome.operation,
				before: outcome.before,
				after: outcome.after
			};
		},
		presentCall(args) {
			return {
				card: "diff",
				title: `Write ${args.file_path}`,
				diffs: [{
					path: args.file_path,
					oldText: null,
					newText: args.content
				}],
				locations: [{ path: args.file_path }]
			};
		},
		presentResult(args, result) {
			if (result.isError) return void 0;
			const diffs = diffsFromMeta(result.meta) ?? [{
				path: args.file_path,
				oldText: null,
				newText: args.content
			}];
			return {
				card: "diff",
				title: `Write ${args.file_path}`,
				diffs
			};
		}
	}));
}
//#endregion
//#region lib/types/edit.js
/**
* Model-facing literal edit, unique-match by default. It obtains an optional guard from the
* single intent slot, calls `ctx.fs.editText` without a separate stat, then records the observed
* version; no policy means an unconditional atomic edit.
* @module @deepseek-ai/dsh-tool-fs/src/edit
*/
/**
* Validate value constraints the schema DSL can't express: a non-blank
* `file_path`, a non-empty `old_string`, and `old_string !== new_string`
* (an equal pair would be a guaranteed no-op edit).
* @param args - the schema-validated raw tool arguments.
* @returns the camelCased input with `replace_all` defaulted to false.
*/
function parseEditArgs(args) {
	if (args.file_path.trim().length === 0) throw new Error("file_path must be a non-empty string");
	if (args.old_string.length === 0) throw new Error("old_string must be a non-empty string");
	if (args.old_string === args.new_string) throw new Error("old_string and new_string must differ");
	return {
		filePath: args.file_path,
		oldString: args.old_string,
		newString: args.new_string,
		replaceAll: args.replace_all ?? false
	};
}
/**
* Format an edit success (single-match or replace-all) as a Claude-style model-facing message.
* @param displayPath - the backend-resolved path shown to the model.
* @param replaceAll - selects the all-occurrences wording over the single-replacement one.
* @returns the confirmation sentence the model sees as the tool result.
*/
function formatEditOutput(displayPath, replaceAll) {
	return replaceAll ? `The file ${displayPath} has been updated. All occurrences were successfully replaced.` : `The file ${displayPath} has been updated successfully.`;
}
/**
* Register the `edit` tool and its scope-aware system-prompt guidance.
* @param ctx - the plugin context; registrations are effects scoped to it, and execution uses its `fs` service.
* @param sandbox - the shared sandbox-escalation API (advertisement, mode stamping, denial mapping).
*/
function applyEditTool(ctx, sandbox) {
	ctx.systemPrompt.section({
		name: "tool:edit",
		order: ctx.systemPrompt.getSectionOrder("TOOL_EDIT"),
		text: ({ scope }) => ctx.tools.get("edit", scope) === void 0 ? "" : "Use the edit tool for targeted changes to existing UTF-8 text files. It replaces literal old_string with new_string; by default old_string must appear exactly once. If old_string appears multiple times, provide a more specific old_string or set replace_all to true. Read the file first (the default fs-observation-policy requires it), unless you just created or edited it in this session."
	});
	ctx.tools.register(defineTool({
		name: "edit",
		description: "Edit an existing UTF-8 text file by replacing literal text.",
		parameters: {
			file_path: {
				type: "string",
				required: true,
				description: "Path to edit, resolved by the filesystem backend."
			},
			old_string: {
				type: "string",
				required: true,
				description: "Literal text to replace. Must match exactly."
			},
			new_string: {
				type: "string",
				required: true,
				description: "Literal replacement text. Use an empty string to delete the match."
			},
			replace_all: {
				type: "boolean",
				description: "Replace all matches. Defaults to false; when false, old_string must appear exactly once."
			},
			...sandbox.escalationModes.length > 0 ? sandbox.schemaFields() : {}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true
					},
					before: {
						type: "string",
						required: true
					},
					after: {
						type: "string",
						required: true
					}
				}
			},
			render: (args, value) => [{
				type: "text",
				text: formatEditOutput(value.path, args.replace_all ?? false)
			}],
			presentationMeta: (args, value) => ({ diffs: computeHunkDiffs(args.file_path, value.before, value.after).map(({ path, oldText, newText }) => ({
				path,
				oldText,
				newText
			})) })
		},
		async execute(args, exec) {
			const input = parseEditArgs(args);
			const sandboxPolicy = await sandbox.resolvePolicy("edit", args, exec);
			const target = await ctx.fs.resolve(input.filePath, sessionResolveOptions(exec, input.filePath, sandboxPolicy?.workspaceRoot));
			let outcome;
			try {
				const intent = await ctx.waterfall("fs/edit-intent", target, exec, () => void 0);
				outcome = await ctx.fs.editText(target, {
					oldString: input.oldString,
					newString: input.newString,
					replaceAll: input.replaceAll
				}, intent, exec.signal, sandboxPolicy);
			} catch (error) {
				throw remediateFsError(sandbox.mapError(error, sandboxPolicy), target.displayPath);
			}
			ctx.emit("fs/observed", target, {
				kind: "present",
				version: outcome.version
			}, exec);
			return {
				path: target.displayPath,
				before: outcome.before,
				after: outcome.after
			};
		},
		presentCall(args) {
			return {
				card: "diff",
				title: `Edit ${args.file_path}`,
				diffs: [{
					path: args.file_path,
					oldText: args.old_string || null,
					newText: args.new_string
				}],
				locations: [{ path: args.file_path }]
			};
		},
		presentResult(args, result) {
			if (result.isError) return void 0;
			const diffs = diffsFromMeta(result.meta);
			if (diffs === void 0) return void 0;
			return {
				card: "diff",
				title: `Edit ${args.file_path}`,
				diffs
			};
		}
	}));
}
//#endregion
//#region lib/types/read-image.js
/**
* The model-facing `read_image` tool commits a PNG/JPEG/WebP/GIF file. A path
* without a file extension is identified from its file signature, while the
* attachment service's full decode stays authoritative. The mounted `ctx.fs`
* backend owns path resolution and read access; names only declare media type.
*
* The route gate is deliberately stricter than the host upload preflight. An
* image-reading tool is useful only when the exact calling route can inspect
* its result, so unknown capability refuses instead of relying on an adapter
* failure after filesystem and attachment work.
* @module @deepseek-ai/dsh-tool-fs/src/read-image
*/
/** Extensions `read_image` accepts; magic-byte validation at the attachment service stays authoritative. */
const IMAGE_EXTENSIONS = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
const PNG_SIGNATURE = [
	137,
	80,
	78,
	71,
	13,
	10,
	26,
	10
];
const JPEG_SIGNATURE = [
	255,
	216,
	255
];
function matchesBytes(data, offset, expected) {
	if (data.byteLength < offset + expected.length) return false;
	return expected.every((byte, index) => data[offset + index] === byte);
}
function matchesAscii(data, offset, value) {
	if (data.byteLength < offset + value.length) return false;
	for (let index = 0; index < value.length; index += 1) if (data[offset + index] !== value.charCodeAt(index)) return false;
	return true;
}
/**
* Identify the media type declared by a supported image file signature.
* @param data - file bytes read through the current filesystem backend.
* @returns the detected supported media type, or undefined for other bytes.
*/
function sniffImageMediaType(data) {
	if (matchesBytes(data, 0, PNG_SIGNATURE)) return "image/png";
	if (matchesBytes(data, 0, JPEG_SIGNATURE)) return "image/jpeg";
	if (matchesAscii(data, 0, "GIF87a") || matchesAscii(data, 0, "GIF89a")) return "image/gif";
	if (matchesAscii(data, 0, "RIFF") && matchesAscii(data, 8, "WEBP")) return "image/webp";
}
const IMAGE_VALUE_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: true,
	properties: {
		attachmentId: {
			type: "string",
			required: true
		},
		mediaType: {
			type: "string",
			enum: [
				"image/png",
				"image/jpeg",
				"image/webp",
				"image/gif"
			],
			required: true
		},
		bytes: {
			type: "integer",
			required: true
		},
		width: {
			type: "integer",
			required: true
		},
		height: {
			type: "integer",
			required: true
		},
		name: { type: "string" },
		originalDimensions: {
			type: "object",
			additionalProperties: false,
			properties: {
				width: {
					type: "integer",
					required: true
				},
				height: {
					type: "integer",
					required: true
				}
			}
		}
	}
};
/**
* Map a model-supplied path to its declared image media type by extension.
* @param filePath - the raw `file_path` argument (not yet resolved).
* @returns the declared media type, or undefined when the path does not claim an image.
*/
function imageMediaTypeForPath(filePath) {
	return IMAGE_EXTENSIONS[extname(filePath).toLowerCase()];
}
/**
* Enforce the strict image-capability gate for the calling route. Resolves the
* session's latest routed provider/model (request header config, then agent
* options) and requires the exact resolved route to declare `image` input explicitly.
* @param ctx - the plugin context used to resolve the optional `llm` service.
* @param exec - the tool-execution context supplying the calling agent.
* @param requestedPath - the raw, not-yet-resolved path rendered in refusal messages.
*/
async function assertImageCapableRoute(ctx, exec, requestedPath) {
	const routed = exec.agent?.session.requestHeader()?.config;
	const provider = routed?.provider ?? exec.agent?.options.provider;
	const model = routed?.model ?? exec.agent?.options.model;
	const llm = ctx.get("llm");
	if (provider === void 0 || model === void 0 || llm === void 0) throw new Error(`cannot read "${requestedPath}" as an image: the current model route could not be resolved`);
	const active = await llm.resolveModelInfo(provider, model, exec.signal);
	if (active.inputModalities === void 0 || !active.inputModalities.includes("image")) throw new Error(`cannot read "${requestedPath}" as an image: model "${model}" does not declare image input; switch to an image-capable model to read images`);
}
/** Refuse a media type outside the deployment's accepted set, naming the offending path. */
function assertDeploymentAccepts(attachments, mediaType, displayPath) {
	if (!attachments.imageLimits.mediaTypes.includes(mediaType)) throw new Error(`cannot read "${displayPath}": ${mediaType} images are not accepted by this deployment`);
}
/**
* Re-brand a structured image outcome into the durable attachment reference an
* `ImageBlock` carries.
* @param image - the image metadata from the output schema.
* @returns the branded attachment reference.
*/
function imageRefFromValue(image) {
	return {
		attachmentId: AttachmentId(image.attachmentId),
		mediaType: image.mediaType,
		bytes: image.bytes,
		width: image.width,
		height: image.height,
		...image.name === void 0 ? {} : { name: image.name },
		...image.originalDimensions === void 0 ? {} : { originalDimensions: { ...image.originalDimensions } }
	};
}
/**
* Format an image read as the model-facing envelope beside its image block.
* A downscaled read names the on-disk dimensions and the multiplier that maps
* coordinates measured on the attached image back onto the original file.
* @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
* @param image - the image metadata to summarize.
* @returns the model-facing envelope; the image itself rides the adjacent image block.
*/
function formatImageReadOutput(displayPath, image) {
	let scaled = "";
	if (image.originalDimensions !== void 0) {
		const x = (image.originalDimensions.width / image.width).toFixed(2);
		const y = (image.originalDimensions.height / image.height).toFixed(2);
		const advice = x === y ? `multiply coordinates by ${x}` : `multiply x coordinates by ${x} and y coordinates by ${y}`;
		scaled = ` (downscaled from ${image.originalDimensions.width}x${image.originalDimensions.height} px; ${advice} to locate features in the original file)`;
	}
	return `<path>${displayPath}</path>
<type>image</type>
<content>
${image.mediaType} image, ${image.width}x${image.height} px, ${image.bytes} bytes${scaled}
</content>`;
}
/**
* Project one structured image read into its model-facing envelope and image.
* @param value - the image-read outcome.
* @returns the two content blocks used by native and nested dispatches.
*/
function imageReadContent(value) {
	return [{
		type: "text",
		text: formatImageReadOutput(value.path, value.image)
	}, {
		type: "image",
		attachment: imageRefFromValue(value.image)
	}];
}
/**
* Register the `read_image` tool into the given context. The composing plugin
* owns the attachments gate: `src/index.ts` calls this inside
* `ctx.inject(['attachments'], …)` so the tool exists only while a durable
* store is mounted. Execution still re-checks `ctx.get('attachments')` for
* direct callers and gates on the calling route's declared image input.
* @param ctx - the registration scope; execution uses its `fs` service plus
*   the optional `attachments`/`llm` services.
*/
function applyReadImageTool(ctx) {
	ctx.tools.register(defineTool({
		name: "read_image",
		description: "Read a PNG/JPEG/WebP/GIF file and return the image itself. A path without a file extension is accepted; the format is detected from the file content, so normalized attachment paths can be passed directly without copying or renaming. Harness validates and downscales large supported images before the next model request, so use this tool directly instead of installing image libraries or creating thumbnails merely to inspect an image. Independent files may be read concurrently in small batches. Requires the current model to accept image input.",
		parameters: { file_path: {
			type: "string",
			required: true,
			description: "Path to the image file, resolved by the filesystem backend."
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					path: {
						type: "string",
						required: true
					},
					image: IMAGE_VALUE_SCHEMA
				}
			},
			render: (_args, value) => imageReadContent(value),
			presentationMeta: (_args, value) => ({ path: value.path })
		},
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			if (args.file_path.trim().length === 0) throw new Error("file_path must be a non-empty string");
			const extension = extname(args.file_path).toLowerCase();
			const declared = imageMediaTypeForPath(args.file_path);
			if (declared === void 0 && extension !== "") throw new Error(`cannot read "${args.file_path}": the ${extension} extension does not declare a supported image format; read_image accepts PNG/JPEG/WebP/GIF files, including extension-less files in those formats`);
			const attachments = ctx.get("attachments");
			if (attachments === void 0) throw new Error(`cannot read "${args.file_path}" as an image: no attachment service is mounted`);
			if (declared !== void 0) assertDeploymentAccepts(attachments, declared, args.file_path);
			await assertImageCapableRoute(ctx, exec, args.file_path);
			const { target, info } = await resolveRegularReadTarget(ctx, exec, args.file_path);
			const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes);
			const data = await ctx.fs.readBytes(target, exec.signal, byteCap);
			const mediaType = declared ?? sniffImageMediaType(data);
			if (mediaType === void 0) throw new Error(`cannot read "${target.displayPath}": the file content is not a supported image format; read_image accepts PNG/JPEG/WebP/GIF`);
			if (declared === void 0) assertDeploymentAccepts(attachments, mediaType, target.displayPath);
			let ref;
			try {
				ref = await attachments.saveImage({
					data,
					mediaType,
					name: basename(target.displayPath)
				});
			} catch (error) {
				if (!(error instanceof AttachmentError)) throw error;
				if (error.code === "IMAGE_DIMENSION_TOO_LARGE") throw new Error(`cannot read "${target.displayPath}": at least one image side exceeds the ${attachments.imageLimits.maxImageDimension}px limit; downscale the image and read the smaller copy`, { cause: error });
				if (error.code === "IMAGE_TOO_MANY_PIXELS") throw new Error(`cannot read "${target.displayPath}": the image exceeds the ${attachments.imageLimits.maxImagePixels}-pixel decoded-size limit; downscale the image and read the smaller copy`, { cause: error });
				if (error.code === "IMAGE_TOO_LARGE") throw new Error(`cannot read "${target.displayPath}": the image cannot be stored within the deployment's byte limits; downscale the image and read the smaller copy`, { cause: error });
				if (error.code === "ATTACHMENT_WRITE_FAILED" && /16-bit PNG/iu.test(error.message)) throw new Error(`cannot read "${target.displayPath}": the 16-bit PNG could not be converted to the normalized 8-bit sRGB form; convert it to an 8-bit PNG/JPEG/WebP and retry`, { cause: error });
				if (error.code === "INVALID_IMAGE" && declared === void 0) throw new Error(`cannot read "${target.displayPath}": the bytes do not decode as a supported PNG/JPEG/WebP/GIF image; the file may be truncated or corrupt`, { cause: error });
				if (error.code !== "IMAGE_TYPE_MISMATCH") throw error;
				if (declared === void 0) throw new Error(`cannot read "${target.displayPath}": the file signature claims ${mediaType}, but the bytes decode as a different image format; the file may be corrupt`, { cause: error });
				throw new Error(`cannot read "${target.displayPath}": the ${extension} extension declares ${mediaType}, but the bytes use a different image format; rename the file to match its actual format if it is PNG/JPEG/WebP/GIF, or convert it to one of those formats`, { cause: error });
			}
			ctx.emit("fs/observed", target, {
				kind: "present",
				version: info.version
			}, exec);
			return {
				path: target.displayPath,
				image: {
					attachmentId: ref.attachmentId,
					mediaType: ref.mediaType,
					bytes: ref.bytes,
					width: ref.width,
					height: ref.height,
					...ref.name === void 0 ? {} : { name: ref.name },
					...ref.originalDimensions === void 0 ? {} : { originalDimensions: { ...ref.originalDimensions } }
				}
			};
		},
		presentCall(args) {
			return {
				card: "generic",
				title: `Read image ${args.file_path}`,
				kind: "read",
				locations: [{ path: args.file_path }]
			};
		}
	}));
}
//#endregion
//#region lib/types/sandbox.js
/**
* The sandbox-escalation API shared by the `write` and `edit` tools: the
* per-call policy resolution, the advertised escalation fields, and the denial-marker
* mapping — all delegating the vocabulary and the fail-closed approval
* sequence to `@deepseek-ai/dsh-sandbox` (the same pieces `@deepseek-ai/dsh-tool-bash`
* uses), so bash and fs escalate identically. Built ONCE per plugin from
* `ctx.fs.sandboxMode` (the capability fact — is a confining backend mounted?)
* and shared by both mutating tools.
*
* @module @deepseek-ai/dsh-tool-fs/sandbox
*/
/**
* The filesystem escalation API: advertisement gating, per-call policy
* resolution, the one-approved wider retry, and denial-marker mapping. A pure
* product of `ctx` at plugin apply time.
*/
var FsSandboxController = class {
	ctx;
	/** The escalation targets this composition advertises (`[]` when no confining backend is mounted). */
	escalationModes;
	/** Shared per-session policy resolver, required by a confining backend. */
	policy;
	constructor(ctx) {
		this.ctx = ctx;
		const defaultMode = ctx.fs.sandboxMode;
		this.escalationModes = defaultMode === void 0 ? [] : ESCALATION_TARGETS;
		this.policy = defaultMode === void 0 ? void 0 : ctx.get("sandboxPolicy");
		if (defaultMode !== void 0 && this.policy === void 0) throw new Error("tool-fs: the mounted filesystem confines but ctx.sandboxPolicy is missing");
	}
	/**
	* The escalation schema fields for a mutating tool's `parameters`. Call it
	* only under a confining backend (guard on {@link escalationModes}); the
	* enum pins the closed target vocabulary, the strict-wider check happens per
	* call at execution.
	* @returns the two escalation parameter specs.
	*/
	schemaFields() {
		return {
			sandbox_permissions: {
				type: "string",
				enum: [...this.escalationModes],
				description: "The wider sandbox mode this file operation needs. Only valid as a one-shot retry of an operation the sandbox just denied; requires justification and user approval."
			},
			justification: {
				type: "string",
				description: "Required with sandbox_permissions: one sentence for the user explaining why this exact file operation needs the wider access."
			}
		};
	}
	/**
	* The policy to stamp onto this mutation: an approved escalation grant (a
	* strictly wider retry resolved through `ctx.approval` before anything
	* executes), else the session's standing mode. The calling session's cwd is
	* always carried as the workspace root. Validates the escalation argument
	* pairing first.
	* @param toolName - the mutating tool's name, for the approval audit trail.
	* @param args - the call's escalation arguments.
	* @param exec - the tool-execution context (agent, callId, signal).
	* @returns the policy to pass to the mutation, or undefined for an
	*   unsandboxed backend.
	*/
	async resolvePolicy(toolName, args, exec) {
		validateEscalationArgs(args.sandbox_permissions, args.justification);
		const standingPolicy = this.policy?.resolve({ ...exec.agent ? { session: exec.agent.session } : {} });
		if (args.sandbox_permissions === void 0 || args.justification === void 0) return standingPolicy;
		if (this.escalationModes.length === 0) throw new Error("sandbox_permissions is not available in this composition (no sandboxing filesystem to escalate)");
		const policy = standingPolicy;
		const approvedMode = await approveEscalation({
			requestedMode: args.sandbox_permissions,
			justification: args.justification,
			effectiveMode: policy.mode,
			subject: "operation"
		}, {
			approver: this.ctx.get("approval"),
			agent: exec.agent,
			callId: exec.callId,
			toolName,
			signal: exec.signal
		});
		return {
			...policy,
			mode: approvedMode
		};
	}
	/**
	* Map a thrown provider error for the model: a `FS_SANDBOX_DENIED` becomes a
	* `FsError` whose text is the shared `[sandbox: …]` denial marker plus the
	* same-turn escalation hint, so a policy denial reads identically to bash's
	* WHILE keeping the structured `FS_SANDBOX_DENIED` code — `ToolRuntime`
	* populates `result.error` only for `HarnessError` instances, so a plain
	* `Error` would strip the code retry/observers key off. Any other error
	* passes through unchanged. A `FS_SANDBOX_DENIED` only arises under a
	* confining backend, which always advertises the escalation fields, so the
	* hint always applies here.
	* @param error - the error thrown by the mutation.
	* @param policy - the policy stamped onto the call (names the mode in the marker).
	* @returns the error to throw — the marker `FsError` for a sandbox denial, else the original.
	*/
	mapError(error, policy) {
		if (!(error instanceof FsError) || error.code !== "FS_SANDBOX_DENIED") return error;
		const mode = policy.mode;
		return new FsError(`${sandboxDenialMarker(mode)}\n${escalationHintMarker("operation")}`, "FS_SANDBOX_DENIED", { cause: error });
	}
};
//#endregion
//#region lib/types/index.js
/**
* Model-facing read, read_image, write, and edit tools over `ctx.fs`. This package owns schemas, validation,
* read windows, formatting, and observation events, never a concrete provider. An optional
* event policy supplies mutation guards; without one the tools use unconditional provider calls.
* @module @deepseek-ai/dsh-tool-fs
*/
/** Cordis plugin name used by loader diagnostics. */
const name = "tool-fs";
/** Services required by the filesystem tool suite. */
const inject = [
	"tools",
	"fs",
	"systemPrompt"
];
const Config = z.object({
	readLimit: z.number().default(READ_LIMIT),
	readMaxLineLength: z.number().default(READ_MAX_LINE_LENGTH),
	readMaxBytes: z.number().default(READ_MAX_BYTES),
	readStreamMinSize: z.number().default(STREAM_MIN_SIZE)
});
/** Every read cap counts lines/chars/bytes — a positive integer, or windowing arithmetic misbehaves silently. */
function assertPositiveInteger(name, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`tool-fs: ${name} must be a positive integer`);
}
/** Register the full `read`/`write`/`edit` filesystem tool suite, plus `read_image` while `attachments` is mounted. */
function apply(ctx, config) {
	const resolved = config;
	assertPositiveInteger("readLimit", resolved.readLimit);
	assertPositiveInteger("readMaxLineLength", resolved.readMaxLineLength);
	assertPositiveInteger("readMaxBytes", resolved.readMaxBytes);
	assertPositiveInteger("readStreamMinSize", resolved.readStreamMinSize);
	applyReadTool(ctx, {
		limit: resolved.readLimit,
		maxLineLength: resolved.readMaxLineLength,
		maxBytes: resolved.readMaxBytes,
		streamMinSize: resolved.readStreamMinSize
	});
	ctx.inject(["attachments"], (imageCtx) => {
		applyReadImageTool(imageCtx);
	});
	const sandbox = new FsSandboxController(ctx);
	applyWriteTool(ctx, sandbox);
	applyEditTool(ctx, sandbox);
}
//#endregion
export { Config, apply, inject, name };

window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-tool",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../util/workspace-path/src/index.ts
		/** Whether a path uses a Windows drive or UNC prefix. */
		function isWindowsStylePath(value) {
			return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
		}
		/**
		* Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`) or Windows drive or UNC.
		* @param path - the path to classify.
		* @returns `true` for an absolute path; `false` for a Workspace-relative one.
		*/
		function isAbsoluteWorkspacePath(path) {
			return path.startsWith("/") || isWindowsStylePath(path);
		}
		/**
		* Resolve a Workspace-relative path into the Host-facing spelling used by path operations.
		* @param cwd - Session Workspace root, when known.
		* @param path - Absolute or Workspace-relative path.
		* @returns an absolute path when a Workspace root is available, otherwise the original path.
		*/
		function resolveWorkspacePath(cwd, path) {
			if (isAbsoluteWorkspacePath(path)) return path;
			if (cwd === void 0 || cwd === "") return path;
			const separator = isWindowsStylePath(cwd) && cwd.includes("\\") ? "\\" : "/";
			return `${cwd.replace(/[/\\]+$/, "")}${separator}${path.replace(/^[/\\]+/, "")}`;
		}
		/**
		* Abbreviate a POSIX home directory for display.
		* @param path - Absolute or already-short display path.
		* @param home - Host account home; absent skips abbreviation.
		* @returns `~` or `~/…` for the POSIX home and its descendants, otherwise `path`.
		*/
		function abbreviateHomePath(path, home) {
			if (home === void 0 || home === "") return path;
			if (isWindowsStylePath(path) || isWindowsStylePath(home)) return path;
			const root = home.replace(/\/+$/, "");
			if (root === "" || root === "/") return path;
			if (path.replace(/\/+$/, "") === root) return "~";
			if (path.startsWith(`${root}/`)) return `~${path.slice(root.length)}`;
			return path;
		}
		/**
		* Strip the workspace root from a workspace-rooted absolute path (display only).
		* @param text - the path to shorten.
		* @param cwd - session workspace root; absent or empty leaves the path unchanged.
		* @returns the path relative to the workspace root, or unchanged when it is not rooted there.
		*/
		function relativizeToCwd(text, cwd) {
			if (cwd === void 0 || cwd === "") return text;
			const root = cwd.replace(/[/\\]+$/, "");
			if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1);
			return text;
		}
		//#endregion
		//#region lib/types/client/tool/models/raw-tool-call.js
		const parsedCalls = /* @__PURE__ */ new WeakMap();
		/**
		* Parse the call head paired with one immutable Tool block.
		* @param block - running or settled Tool block.
		* @returns the Tool name and object arguments, or null when the call head or valid JSON object is unavailable.
		*/
		function parsedToolCall(block) {
			const cached = parsedCalls.get(block);
			if (cached !== void 0 || parsedCalls.has(block)) return cached ?? null;
			const call = "kind" in block ? block.call : block;
			if (call === null) {
				parsedCalls.set(block, null);
				return null;
			}
			let value;
			try {
				value = JSON.parse(call.argsRaw);
			} catch {
				parsedCalls.set(block, null);
				return null;
			}
			if (typeof value !== "object" || value === null || Array.isArray(value)) {
				parsedCalls.set(block, null);
				return null;
			}
			const parsed = {
				name: call.name,
				args: value
			};
			parsedCalls.set(block, parsed);
			return parsed;
		}
		/**
		* Read the exact single text block consumed by first-party card derivations.
		* @param block - settled Tool result.
		* @returns its text, or undefined for any other content layout.
		*/
		function singleResultText(block) {
			if (block.content.length !== 1) return void 0;
			const only = block.content[0];
			return only?.type === "text" ? only.text : void 0;
		}
		/**
		* Validate the optional escalation pair shared by first-party shell and file
		* mutation tools.
		* @param args - parsed open-root Tool arguments.
		* @returns whether the declared escalation fields form a valid pair.
		*/
		function validEscalationFields(args) {
			const permission = args.sandbox_permissions;
			const justification = args.justification;
			if (permission === void 0 && justification === void 0) return true;
			if (permission !== "workspace-write" && permission !== "danger-full-access") return false;
			return typeof justification === "string" && justification.trim() !== "";
		}
		//#endregion
		//#region lib/types/client/tool/models/read-card-model.js
		/** Whether a model-supplied argument is a 1-based line position or count: an integer of at least 1. */
		function positiveInteger$1(value) {
			return typeof value === "number" && Number.isInteger(value) && value >= 1;
		}
		function validReadCall(block) {
			const call = parsedToolCall(block);
			if (call?.name !== "read") return false;
			const { file_path: path, offset, limit } = call.args;
			if (typeof path !== "string" || path.trim() === "") return false;
			if (offset !== void 0 && !positiveInteger$1(offset)) return false;
			if (limit !== void 0 && !positiveInteger$1(limit)) return false;
			return true;
		}
		function readMeta(meta) {
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const { path, offset, lines, totalLines, lang } = meta;
			if (typeof path !== "string" || typeof offset !== "number" || !Number.isInteger(offset) || offset < 1) return null;
			if (typeof totalLines !== "number" || !Number.isInteger(totalLines) || totalLines < 0 || !Array.isArray(lines)) return null;
			if (lang !== void 0 && typeof lang !== "string") return null;
			const narrowed = [];
			let previous = offset - 1;
			for (const line of lines) {
				if (typeof line !== "object" || line === null || Array.isArray(line)) return null;
				const { number, text } = line;
				if (typeof number !== "number" || !Number.isInteger(number) || number < 1 || number <= previous) return null;
				if (number > totalLines || typeof text !== "string") return null;
				previous = number;
				narrowed.push({
					number,
					text
				});
			}
			return {
				path,
				offset,
				lines: narrowed,
				totalLines,
				...lang === void 0 ? {} : { lang }
			};
		}
		/**
		* The line one `read` call was about, from its arguments.
		*
		* `offset` is the read tool's own 1-based start line, so opening the path can
		* land where the model looked. Available while the call is still running,
		* unlike the persisted metadata, because the arguments carry it. The arguments
		* are model-produced JSON: only an integer of at least 1 is a line, and a call
		* whose `offset` is anything else names none.
		* @param block - running or settled Tool block.
		* @returns the 1-based line, or undefined when the call named none.
		*/
		function readCallLine(block) {
			if (!validReadCall(block)) return void 0;
			const { offset } = parsedToolCall(block)?.args ?? {};
			return positiveInteger$1(offset) ? offset : void 0;
		}
		/**
		* Derive a settled root read card after validating its persisted metadata and
		* model-facing read envelope.
		* @param block - running or settled Tool block.
		* @param sessionCwd - the session workspace root; a workspace-rooted absolute
		*   path label displays relative to it. Absent leaves the path as authored.
		* @param home - host account home; a leftover POSIX home path displays as `~`.
		* @returns the read-card props, or null for the generic path.
		*/
		function readCardModel(block, sessionCwd, home) {
			if (block.parentCallId !== void 0 || !("kind" in block) || block.isError) return null;
			if (!validReadCall(block)) return null;
			const meta = readMeta(block.meta);
			if (meta === null) return null;
			const text = singleResultText(block);
			if (text === void 0) return null;
			if (/^<path>[^\n]*<\/path>\n<type>file<\/type>\n<content>\n([\s\S]*)\n<\/content>$/u.exec(text)?.[1] === void 0) return null;
			return {
				label: abbreviateHomePath(relativizeToCwd(meta.path, sessionCwd), home),
				lines: meta.lines,
				totalLines: meta.totalLines,
				lang: meta.lang
			};
		}
		//#endregion
		//#region lib/types/client/tool/models/diff-card-model.js
		/**
		* Narrow opaque result metadata's `diffs` to well-formed hunks.
		* @param diffs - the metadata field to validate.
		* @returns the validated hunks, or null when the payload is not usable.
		*/
		function narrowDiffs(diffs) {
			if (!Array.isArray(diffs) || diffs.length === 0) return null;
			const out = [];
			for (const hunk of diffs) {
				if (typeof hunk !== "object" || hunk === null) return null;
				const { path, oldText, newText } = hunk;
				if (typeof path !== "string") return null;
				if (oldText !== null && typeof oldText !== "string") return null;
				if (typeof newText !== "string") return null;
				out.push({
					path,
					oldText,
					newText
				});
			}
			return out;
		}
		function intendedDiff(block) {
			const parsed = parsedToolCall(block);
			if (parsed === null) return null;
			if (parsed.name === "str_replace_editor") {
				const { command, path, file_text: fileText, old_str: oldText, new_str: newText } = parsed.args;
				if (typeof path !== "string" || path.trim() === "") return null;
				if (command === "create") {
					if (fileText !== void 0 && typeof fileText !== "string") return null;
					return {
						tool: "str_replace_editor",
						diff: {
							path,
							oldText: null,
							newText: fileText ?? ""
						}
					};
				}
				if (command === "str_replace") {
					if (oldText !== void 0 && typeof oldText !== "string") return null;
					if (newText !== void 0 && typeof newText !== "string") return null;
					return {
						tool: "str_replace_editor",
						diff: {
							path,
							oldText: oldText ?? null,
							newText: newText ?? ""
						}
					};
				}
				return null;
			}
			const { file_path: path } = parsed.args;
			if (typeof path !== "string" || path.trim() === "") return null;
			if (!validEscalationFields(parsed.args)) return null;
			if (parsed.name === "write") {
				const { content } = parsed.args;
				return typeof content === "string" ? {
					tool: "write",
					diff: {
						path,
						oldText: null,
						newText: content
					}
				} : null;
			}
			if (parsed.name !== "edit") return null;
			const { old_string: oldText, new_string: newText, replace_all: replaceAll } = parsed.args;
			if (typeof oldText !== "string" || typeof newText !== "string") return null;
			if (replaceAll !== void 0 && typeof replaceAll !== "boolean") return null;
			return {
				tool: "edit",
				diff: {
					path,
					oldText: oldText || null,
					newText
				}
			};
		}
		function appliedDiffs(meta) {
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const diffs = meta.diffs;
			if (!Array.isArray(diffs)) return null;
			if (diffs.length === 0) return "empty";
			return narrowDiffs(diffs);
		}
		/**
		* Derive running diffs for root write/edit and `str_replace_editor`
		* create/replace calls, plus applied settled diffs for root write/edit calls.
		* A successful write with valid empty metadata uses its argument-derived
		* whole-file diff, matching create and identical-overwrite presentation;
		* `str_replace_editor` settles through Generic because it has no result view.
		* @param block - running or settled Tool block.
		* @returns the diff-card props, or null for the generic path.
		*/
		function diffCardModel(block) {
			if (block.parentCallId !== void 0) return null;
			const intended = intendedDiff(block);
			if (intended === null) return null;
			if (!("kind" in block)) return { card: { diffs: [intended.diff] } };
			if (intended.tool === "str_replace_editor") return null;
			if (block.isError) return null;
			const applied = appliedDiffs(block.meta);
			if (applied === null || applied === "empty") return intended.tool === "write" ? { card: { diffs: [intended.diff] } } : null;
			return { card: { diffs: applied } };
		}
		//#endregion
		//#region lib/types/client/tool/models/search-card-model.js
		function validSearchCall(block) {
			const call = parsedToolCall(block);
			if (call === null) return null;
			const { pattern, path } = call.args;
			if (typeof pattern !== "string") return null;
			if (call.name === "grep" && pattern === "") return null;
			if (call.name === "glob" && pattern.trim() === "") return null;
			if (call.name !== "grep" && call.name !== "glob") return null;
			if (path !== void 0 && (typeof path !== "string" || path.trim() === "")) return null;
			if (call.name === "grep") {
				const { include } = call.args;
				if (include !== void 0 && (typeof include !== "string" || !validInclude(include))) return null;
			}
			return call.name;
		}
		function validInclude(include) {
			if (include.trim() === "" || include.startsWith("!")) return false;
			let braceDepth = 0;
			for (const character of include) if (character === "{") braceDepth += 1;
			else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
			else if (character === "," && braceDepth === 0) return false;
			return true;
		}
		function searchFiles(value) {
			if (!Array.isArray(value)) return null;
			const files = [];
			for (const file of value) {
				if (typeof file !== "object" || file === null || Array.isArray(file)) return null;
				const { path, matches } = file;
				if (typeof path !== "string" || !Array.isArray(matches)) return null;
				const narrowed = [];
				for (const match of matches) {
					if (typeof match !== "object" || match === null || Array.isArray(match)) return null;
					const { lineNumber, line } = match;
					if (typeof lineNumber !== "number" || !Number.isInteger(lineNumber) || lineNumber < 1) return null;
					if (typeof line !== "string") return null;
					narrowed.push({
						lineNumber,
						line
					});
				}
				files.push({
					path,
					matches: narrowed
				});
			}
			return files;
		}
		function flattenContent(content) {
			const text = content.filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n");
			return text === "" ? void 0 : text;
		}
		/**
		* Derive a settled root grep/glob card from persisted metadata.
		* @param block - running or settled Tool block.
		* @returns search-card props, or null for the generic path.
		*/
		function searchCardModel(block) {
			if (block.parentCallId !== void 0 || !("kind" in block) || block.isError) return null;
			const tool = validSearchCall(block);
			if (tool === null) return null;
			if (typeof block.meta !== "object" || block.meta === null || Array.isArray(block.meta)) return null;
			const meta = block.meta;
			if (typeof meta.truncated !== "boolean") return null;
			if (typeof meta.total !== "number" || !Number.isInteger(meta.total) || meta.total < 0) return null;
			const common = {
				truncated: meta.truncated,
				total: meta.total
			};
			const recovery = meta.truncated ? flattenContent(block.content) : void 0;
			if (tool === "grep") {
				if (meta.shape !== "matches") return null;
				const files = searchFiles(meta.files);
				return files === null ? null : {
					recovery,
					card: {
						kind: "matches",
						files,
						...common
					}
				};
			}
			if (meta.shape !== "paths" || !Array.isArray(meta.paths)) return null;
			if (!meta.paths.every((path) => typeof path === "string")) return null;
			return {
				recovery,
				card: {
					kind: "paths",
					paths: [...meta.paths],
					...common
				}
			};
		}
		new TextEncoder();
		new TextDecoder();
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
		//#endregion
		//#region ../../spill/spill-policy/src/notice.ts
		/** Browser-safe formatting and recognition of persisted spill-policy notices. */
		const OPEN = "(";
		const CLOSE = ")";
		const LOCATION = " Full formatted result stored at: ";
		const GUIDANCE_SEPARATOR = ". ";
		const SEPARATOR = "\n\n";
		const EXACT_OMISSION = describeOmitted({
			kind: "exact",
			count: 0
		}, "bytes");
		const COUNT_OFFSET = EXACT_OMISSION.indexOf("0");
		const COUNT_SUFFIX = EXACT_OMISSION.slice(COUNT_OFFSET + 1);
		function isOmission(text) {
			if (text === describeOmitted({ kind: "none" }, "bytes") || text === describeOmitted({ kind: "unknown" }, "bytes")) return true;
			const count = Number(text.slice(COUNT_OFFSET, text.length - COUNT_SUFFIX.length));
			return Number.isSafeInteger(count) && count >= 0 && text === describeOmitted({
				kind: "exact",
				count
			}, "bytes");
		}
		/**
		* Recognize a final spill-policy notice in persisted text, including notice-only output.
		* This identifies the text convention, not authenticated provenance of tool output.
		* @param text - complete recorded text result.
		* @returns whether a complete notice occupies the end of the result.
		*/
		function hasSpillNotice(text) {
			if (!text.endsWith(CLOSE)) return false;
			let start = 0;
			while (true) {
				const next = text.indexOf(`${SEPARATOR}${OPEN}`, start);
				const candidate = text.slice(start, next < 0 ? -1 : next);
				const location = candidate.indexOf(LOCATION, 1);
				if (candidate.startsWith(OPEN) && location >= 0 && isOmission(candidate.slice(1, location))) return text.indexOf(GUIDANCE_SEPARATOR, start + location + 34) >= 0;
				if (next < 0) return false;
				start = next + 2;
			}
		}
		//#endregion
		//#region lib/types/client/tool/models/terminal-card-model.js
		/**
		* Build the TerminalBlock display copy from the conversation locale seat —
		* the one place the primitive's label surface pairs with this package's
		* dictionary, shared by every terminal render site (chat row, bash row,
		* details panel).
		* @param t - the render site's conversation locale seat.
		* @returns the full label set for {@link TerminalBlockProps}'s `labels`.
		*/
		function terminalBlockLabels(t) {
			return {
				signal: (signal) => t("terminal.signal", { signal }),
				exitCode: (code) => t("terminal.exitCode", { code }),
				running: t("terminal.running"),
				failed: t("terminal.failed"),
				done: t("terminal.done"),
				copy: t("copy"),
				copied: t("copied"),
				noOutput: t("terminal.noOutput"),
				collapseAria: t("terminal.collapseAria"),
				collapse: t("collapse"),
				expandAria: (hidden) => t("terminal.expandAria", { n: hidden }),
				expand: (hidden) => t("terminal.expandRest", { n: hidden })
			};
		}
		/**
		* Resolve locale-owned `terminal_send` copy while preserving Tool-authored
		* shell commands and descriptions verbatim.
		* @param model - locale-neutral terminal card data.
		* @param t - the render site's conversation locale seat.
		* @returns terminal props and description ready for rendering.
		*/
		function localizeTerminalCardModel(model, t) {
			if (model.copy.kind === "shell") return {
				card: {
					command: model.copy.command,
					...model.card
				},
				description: model.copy.description
			};
			return {
				card: {
					command: model.copy.text === "" ? t("terminal.sendInput") : model.copy.text,
					...model.card
				},
				description: t("terminal.session", { sessionId: model.copy.sessionId })
			};
		}
		/**
		* True when a settled terminal card reports a failing exit — a non-zero code
		* or a terminating signal. The bash tool settles a failing command as a
		* completed call (`isError` stays false: the exit status is result data), so
		* this is the collapsed row's only failure signal; without it the red exit
		* pill would be visible only after expanding the card.
		* @param model - a derived terminal card.
		* @returns whether the card's exit status is a failure.
		*/
		function terminalFailed(model) {
			const { exitCode, signal, running } = model.card;
			return running !== true && (exitCode !== void 0 && exitCode !== 0 || signal !== void 0);
		}
		/**
		* Resolve a shell call's workdir for display: an absolute path is used as-is,
		* a relative one joins under the session workspace, and an omitted one is the
		* session workspace. Without a session cwd, a relative path stays as authored
		* and an omitted one stays absent.
		* @param workdir - the raw call's workdir, if any.
		* @param sessionCwd - the session workspace root, if the caller knows it.
		* @returns the working directory for the prompt label, or undefined.
		*/
		function resolveTerminalCwd(workdir, sessionCwd) {
			if (workdir === void 0 || workdir === "") return sessionCwd;
			if (sessionCwd === void 0 || sessionCwd === "") return normalizeSegments(workdir);
			return normalizeSegments(resolveWorkspacePath(sessionCwd, workdir));
		}
		/**
		* Collapse `.` and `..` segments so the prompt label names the directory the
		* command actually ran in. The bash executor resolves the workdir before
		* running, so a joined `/w/app/..` must display as `w`, not as `..`. Separators
		* are preserved as authored (a Windows path keeps its backslashes) because this
		* value is only ever displayed; a `..` that would climb past the root is
		* dropped, which is what a filesystem does with it. A UNC path's `server` and
		* `share` are part of its root, not poppable segments: Windows cannot climb
		* above a share, so `\\\\server\\share` with a `..` stays there.
		* @param path - a joined or absolute path, possibly carrying `.`/`..` segments.
		* @returns the same path with those segments resolved.
		*/
		function normalizeSegments(path) {
			if (!/(?:^|[/\\])\.\.?(?:[/\\]|$)/.test(path)) return path;
			const unc = /^[/\\]{2}([^/\\]+)[/\\]+([^/\\]+)/.exec(path);
			if (unc !== null) {
				const [matched, server, share] = unc;
				const root = `\\\\${String(server)}\\${String(share)}`;
				const rest = collapse(path.slice(matched.length), true);
				return rest === "" ? root : `${root}\\${rest}`;
			}
			const separator = path.includes("\\") && !path.includes("/") ? "\\" : "/";
			const rooted = /^[/\\]/.test(path);
			const drive = /^[A-Za-z]:/.exec(path)?.[0] ?? "";
			const body = collapse(path.slice(drive.length), rooted || drive !== "", separator);
			const leading = rooted ? separator : "";
			return drive === "" ? `${leading}${body}` : `${drive}${rooted ? leading : separator}${body}`;
		}
		/**
		* Collapse the `.`/`..` segments of a path body against a known root state.
		* @param body - the path after any drive letter or UNC root.
		* @param rooted - the body hangs off a root, so a `..` at its top is dropped
		*   the way a filesystem drops one; without a root the `..` is kept, since it
		*   stays meaningful against a cwd this function cannot see.
		* @param separator - separator to rejoin with (default `/`).
		* @returns the collapsed body, without leading or trailing separators.
		*/
		function collapse(body, rooted, separator = "/") {
			const kept = [];
			for (const segment of body.split(/[/\\]/)) {
				if (segment === "" || segment === ".") continue;
				if (segment === "..") {
					if (kept.length > 0 && kept[kept.length - 1] !== "..") kept.pop();
					else if (!rooted) kept.push(segment);
					continue;
				}
				kept.push(segment);
			}
			return kept.join(separator);
		}
		function shellCall(name, args) {
			if (name !== "bash" && name !== "pwsh") return null;
			const { command, description, timeoutMs, workdir, run_in_background: background } = args;
			if (typeof command !== "string" || command.trim() === "") return null;
			if (timeoutMs !== void 0 && (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0)) return null;
			if (workdir !== void 0 && typeof workdir !== "string") return null;
			if (background !== void 0 && typeof background !== "boolean") return null;
			if (!validEscalationFields(args)) return null;
			if (description === void 0) return {
				kind: "shell",
				command,
				description: void 0,
				workdir: void 0,
				persistent: true,
				background: false
			};
			if (typeof description !== "string" || description.trim() === "") return null;
			return {
				kind: "shell",
				command,
				description,
				workdir,
				persistent: false,
				background: background === true
			};
		}
		/**
		* Identify a settled root call from the persistent Bash or PowerShell tool.
		* Its result stays on the generic input/output path because the persistent
		* shell can report resets and partial output without one process exit status.
		* @param block - running or settled Tool block.
		* @returns whether the block is a settled persistent-shell call.
		*/
		function isSettledPersistentShellCall(block) {
			if (!("kind" in block) || block.parentCallId !== void 0) return false;
			const parsed = parsedToolCall(block);
			if (parsed === null) return false;
			return shellCall(parsed.name, parsed.args)?.persistent === true;
		}
		/**
		* Identify a settled foreground shell preview whose spill footer can hide the exit marker.
		* @param block - running or settled Tool block.
		* @returns whether the shell output must remain generic without an inferred exit status.
		*/
		function isSpilledShellCall(block) {
			if (!("kind" in block)) return false;
			const parsed = parsedToolCall(block);
			if (parsed === null) return false;
			const call = shellCall(parsed.name, parsed.args);
			if (call === null || call.background) return false;
			const output = singleResultText(block);
			return output !== void 0 && hasSpillNotice(output);
		}
		function terminalSendCall(name, args) {
			if (name !== "terminal_send") return null;
			const { sessionId, text, submit, run_in_background: background } = args;
			if (typeof sessionId !== "string" || sessionId === "" || typeof text !== "string") return null;
			if (submit !== void 0 && typeof submit !== "boolean") return null;
			if (background !== void 0 && typeof background !== "boolean") return null;
			return {
				kind: "terminal-send",
				text,
				sessionId,
				background: background === true
			};
		}
		/**
		* Parse the marker literals owned by `@deepseek-ai/dsh-shell/render` without
		* importing that Host-only package into the Client dependency graph.
		* @param text - rendered shell result text.
		* @returns output with a trailing exit-code or signal marker extracted.
		*/
		function parseExitStatus(text) {
			const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text);
			if (signal?.[1] !== void 0) return {
				output: text.slice(0, signal.index),
				signal: signal[1]
			};
			const exit = /\n\[exit code: (\d+)\]$/.exec(text);
			if (exit?.[1] !== void 0) return {
				output: text.slice(0, exit.index),
				exitCode: Number(exit[1])
			};
			return {
				output: text,
				exitCode: 0
			};
		}
		/**
		* Derive terminal props for supported shell and terminal-send calls, including
		* nested Code Dispatch calls. Standard shell results parse their final status
		* marker; persistent shell results, spill previews, background calls, errors,
		* and malformed input use the generic path. {@link isSettledPersistentShellCall} lets that generic
		* persistent result remain expandable without inventing one process status.
		* @param block - running or settled Tool block.
		* @param sessionCwd - session workspace root used to resolve workdir.
		* @returns locale-neutral terminal-card data, or null for the generic path.
		*/
		function terminalCardModel(block, sessionCwd) {
			const parsed = parsedToolCall(block);
			if (parsed === null) return null;
			const call = shellCall(parsed.name, parsed.args) ?? terminalSendCall(parsed.name, parsed.args);
			if (call === null || call.background) return null;
			const copy = call.kind === "shell" ? {
				kind: "shell",
				command: call.command,
				description: call.description
			} : {
				kind: "terminal-send",
				text: call.text,
				sessionId: call.sessionId
			};
			const cwd = resolveTerminalCwd(call.kind === "shell" ? call.workdir : void 0, sessionCwd);
			if (!("kind" in block)) return {
				copy,
				card: {
					cwd,
					output: void 0,
					exitCode: void 0,
					signal: void 0,
					running: true
				}
			};
			if (block.isError || call.kind === "shell" && call.persistent || isSpilledShellCall(block)) return null;
			const output = singleResultText(block);
			if (output === void 0) return null;
			const status = call.kind === "terminal-send" ? { output } : parseExitStatus(output);
			return {
				copy,
				card: {
					cwd,
					output: status.output,
					exitCode: status.exitCode,
					signal: status.signal,
					running: false
				}
			};
		}
		//#endregion
		//#region lib/types/client/tool/models/web-card-model.js
		function validWebCall(block) {
			const call = parsedToolCall(block);
			if (call === null) return null;
			if (call.name === "web_search") {
				const { queries } = call.args;
				if (!Array.isArray(queries) || queries.length === 0) return null;
				return queries.every((query) => typeof query === "string" && query.trim() !== "") ? call.name : null;
			}
			if (call.name === "web_fetch") {
				const { url } = call.args;
				return typeof url === "string" && url.trim() !== "" ? call.name : null;
			}
			return null;
		}
		function webSources(value) {
			if (!Array.isArray(value)) return null;
			const sources = [];
			for (const source of value) {
				if (typeof source !== "object" || source === null || Array.isArray(source)) return null;
				const { url, title, snippet, publishedAt } = source;
				if (typeof url !== "string") return null;
				if (title !== void 0 && typeof title !== "string") return null;
				if (snippet !== void 0 && typeof snippet !== "string") return null;
				if (publishedAt !== void 0 && typeof publishedAt !== "string") return null;
				sources.push({
					url,
					...title === void 0 ? {} : { title },
					...snippet === void 0 ? {} : { snippet },
					...publishedAt === void 0 ? {} : { publishedAt }
				});
			}
			return sources;
		}
		/**
		* Derive a settled root web-search or web-fetch card from persisted metadata.
		* @param block - running or settled Tool block.
		* @returns web-card props, or null for the generic path.
		*/
		function webCardModel(block) {
			if (block.parentCallId !== void 0 || !("kind" in block) || block.isError) return null;
			const tool = validWebCall(block);
			if (tool === null || typeof block.meta !== "object" || block.meta === null || Array.isArray(block.meta)) return null;
			const meta = block.meta;
			if (typeof meta.truncated !== "boolean") return null;
			if (tool === "web_search") {
				const sources = webSources(meta.sources);
				if (sources === null || meta.answer !== void 0 && typeof meta.answer !== "string") return null;
				return {
					kind: "search",
					answer: meta.answer,
					sources,
					truncated: meta.truncated
				};
			}
			if (typeof meta.url !== "string") return null;
			if (typeof meta.statusCode !== "number" || !Number.isInteger(meta.statusCode)) return null;
			return {
				kind: "fetch",
				url: meta.url,
				statusCode: meta.statusCode,
				truncated: meta.truncated
			};
		}
		//#endregion
		//#region lib/types/client/tool/models/tool-call-model.js
		/** Locale key per generic row variant. */
		const VARIANT_TITLE_KEYS = {
			search: "tool.title.search",
			read: "tool.title.read",
			bash: "tool.title.bash",
			write: "tool.title.write",
			edit: "tool.title.edit",
			code: "tool.title.code",
			others: "tool.title.generic"
		};
		/**
		* Known tool name -> variant.
		*
		* `cordis_define` is deliberately absent: ui-cordis registers a keyed
		* `tool.call.toolview` entry for it, and a keyed hit REPLACES the generic row
		* (this table is only reached through GenericToolCard, the dispatch fallback in
		* ToolCallTree). An entry here would be unreachable, and a second title for the
		* same call would be a second answer to a question the card already owns.
		*/
		const TOOL_VARIANTS = {
			bash: "bash",
			pwsh: "bash",
			read: "read",
			read_image: "read",
			web_fetch: "read",
			web_search: "search",
			grep: "search",
			glob: "search",
			write: "write",
			edit: "edit",
			run_code: "code",
			cordis_package_inspect: "read",
			cordis_runtime_inspect: "read",
			cordis_run: "others",
			cordis_stop: "others",
			cordis_undefine: "others"
		};
		/** Tool-owned titles that refine a generic row variant without replacing it. */
		const TOOL_TITLE_KEYS = {
			cordis_package_inspect: "tool.title.inspect",
			cordis_runtime_inspect: "tool.title.inspect",
			cordis_run: "tool.title.runCordis",
			cordis_stop: "tool.title.stopCordis",
			cordis_undefine: "tool.title.removeCordis",
			pwsh: "tool.title.pwsh",
			read_image: "tool.title.readImage"
		};
		/**
		* Classify a tool name into its row variant.
		* @param toolName - wire tool name.
		* @returns matching variant, others when unknown.
		*/
		function classifyTool(toolName) {
			return TOOL_VARIANTS[toolName] ?? "others";
		}
		/**
		* Flatten a settled result's content blocks to display text: text blocks
		* verbatim, other block shapes as pretty JSON. Empty content on a failed call
		* falls back to the structured error's `name: code` line.
		* @param node - the settled result node.
		* @returns the flattened result text (may be empty).
		*/
		function resultText(node) {
			const parts = [];
			for (const block of node.content) if (block.type === "text") parts.push(block.text);
			else parts.push(JSON.stringify(block, null, 2));
			if (parts.length === 0 && node.error !== void 0) parts.push(`${node.error.name}: ${node.error.code}`);
			return parts.join("\n");
		}
		function parseArgs(argsRaw) {
			try {
				return JSON.parse(argsRaw);
			} catch {
				return;
			}
		}
		function firstLine(text) {
			const nl = text.indexOf("\n");
			return nl === -1 ? text : text.slice(0, nl);
		}
		function pickString(args, keys) {
			for (const key of keys) {
				const v = args[key];
				if (typeof v === "string" && v !== "") return v;
			}
		}
		/** Summary key preference per variant (args-derived; result-derived summaries are a ledger item). */
		const SUMMARY_KEYS = {
			bash: ["description", "command"],
			read: [
				"path",
				"file_path",
				"url"
			],
			search: [
				"query",
				"pattern",
				"url"
			],
			write: ["path", "file_path"],
			edit: ["path", "file_path"],
			code: ["description"],
			others: []
		};
		function deriveSummary(variant, argsRaw) {
			const parsed = parseArgs(argsRaw);
			if (typeof parsed !== "object" || parsed === null) return firstLine(argsRaw);
			const args = parsed;
			if (variant === "search" && Array.isArray(args.queries)) {
				const queries = args.queries.filter((query) => typeof query === "string" && query !== "");
				if (queries.length > 0) return queries.map(firstLine).join(", ");
			}
			const picked = pickString(args, SUMMARY_KEYS[variant]);
			if (picked !== void 0) return firstLine(picked);
			for (const v of Object.values(args)) if (typeof v === "string" && v !== "") return firstLine(v);
			return firstLine(argsRaw);
		}
		/** Path keys only — never `url` (web_fetch lands on the read variant). */
		const FILE_PATH_KEYS = ["path", "file_path"];
		/** File-tool variants whose summary may be an openable workspace path. */
		const FILE_PATH_VARIANTS = new Set([
			"read",
			"write",
			"edit"
		]);
		function deriveFilePath(variant, argsRaw) {
			if (!FILE_PATH_VARIANTS.has(variant)) return void 0;
			const parsed = parseArgs(argsRaw);
			if (typeof parsed !== "object" || parsed === null) return void 0;
			const picked = pickString(parsed, FILE_PATH_KEYS);
			return picked === void 0 ? void 0 : firstLine(picked);
		}
		/**
		* Format one argument payload when its generic input body becomes visible.
		* @param variant - row presentation selected for the Tool name.
		* @param argsRaw - original argument JSON or incomplete raw text.
		* @returns display body, or null for empty input.
		*/
		function formatToolBody(variant, argsRaw) {
			if (argsRaw === "") return null;
			const parsed = parseArgs(argsRaw);
			if (parsed === void 0) return argsRaw;
			if (variant === "code" && typeof parsed === "object" && parsed !== null) {
				const code = parsed.code;
				if (typeof code === "string" && code !== "") return code;
			}
			return JSON.stringify(parsed, null, 2);
		}
		/**
		* Derive the full row model from a frozen call slice.
		* @param toolName - wire tool name (dispatch-supplied; survives windowless results).
		* @param block - RunningToolCall or ToolResultNode off the snapshot caches.
		* @param cwd - session workspace root; workspace-rooted path summaries display relative to it.
		* @param home - host account home; a leftover POSIX home path displays as `~`.
		* @returns the row model.
		*/
		function toolRowModel(toolName, block, cwd, home) {
			const variant = classifyTool(toolName);
			const done = "kind" in block;
			const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const base = argsRaw === "" ? block.callId : abbreviateHomePath(relativizeToCwd(deriveSummary(variant, argsRaw), cwd), home);
			const toolTitleKey = TOOL_TITLE_KEYS[toolName];
			const summary = variant === "others" && toolName !== "" && toolTitleKey === void 0 ? `${toolName} · ${base}` : base;
			const output = done ? resultText(block) || null : null;
			const errorSummary = state === "error" && output !== null ? firstLine(output) : null;
			const bodyRaw = argsRaw === "" ? null : argsRaw;
			return {
				variant,
				titleKey: toolTitleKey ?? VARIANT_TITLE_KEYS[variant],
				summary,
				filePath: deriveFilePath(variant, argsRaw),
				bodyRaw,
				output,
				errorSummary,
				state
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region lib/types/client/tool/models/primitive-labels.js
		/** Localized copy adapters for Cordis-free UI primitives used by Tool cards. */
		/**
		* Build localized Markdown chrome labels.
		* @param t - Conversation locale seat.
		* @returns Markdown chrome labels.
		*/
		function markdownLabels(t) {
			return {
				code: {
					copyLabel: t("copy"),
					copiedLabel: t("copied")
				},
				footnotes: t("markdown.footnotes")
			};
		}
		/**
		* Build localized diff-card chrome labels.
		* @param t - Conversation locale seat.
		* @returns Diff-card chrome labels.
		*/
		function diffBlockLabels(t) {
			return {
				copy: t("copy"),
				copied: t("copied"),
				collapseAria: t("diff.collapseAria"),
				expandAria: (count) => t("diff.expandAria", { count }),
				collapse: t("collapse"),
				expand: (count) => t("diff.expandRest", { count }),
				files: (count) => t(count === 1 ? "diff.files.one" : "diff.files.other", { count })
			};
		}
		/**
		* Build localized read-card chrome labels.
		* @param t - Conversation locale seat.
		* @returns Read-card chrome labels.
		*/
		function readBlockLabels(t) {
			return {
				window: (shown, total) => t("read.window", {
					shown,
					total
				}),
				copy: t("copy"),
				copied: t("copied"),
				collapseAria: t("read.collapseAria"),
				expandAria: (count) => t("read.expandAria", { count }),
				collapse: t("collapse"),
				expand: (count) => t("read.expandRest", { count })
			};
		}
		/**
		* Build localized search-card chrome labels.
		* @param t - Conversation locale seat.
		* @returns Search-card chrome labels.
		*/
		function searchBlockLabels(t) {
			return {
				pathsSummary: (shown, total, truncated) => t(truncated ? "search.paths.truncated" : "search.paths", {
					shown,
					total
				}),
				matchesSummary: (shown, total, files, truncated) => t(truncated ? "search.matches.truncated" : "search.matches", {
					shown,
					total,
					files
				}),
				copy: t("copy"),
				copied: t("copied"),
				noResults: t("search.noResults"),
				collapseAria: t("search.collapseAria"),
				expandAria: (count) => t("search.expandAria", { count }),
				collapse: t("collapse"),
				expand: (count) => t("search.expandRest", { count })
			};
		}
		/**
		* Build localized web-card chrome labels.
		* @param t - Conversation locale seat.
		* @returns Web-card chrome labels.
		*/
		function webBlockLabels(t) {
			return {
				noResults: t("web.noResults"),
				sourcesTruncated: t("web.sourcesTruncated"),
				http: t("web.http"),
				contentTruncated: t("web.contentTruncated"),
				markdown: markdownLabels(t)
			};
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-tool/src/client/tool/components/AskQuestionCard.module.css.mjs
		const css$3 = ".fsXYAq_card{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);border-radius:12px;flex-direction:column;gap:16px;max-height:360px;margin:4px 0 4px 4px;padding:16px 20px;display:flex;overflow-y:auto}.fsXYAq_item{flex-direction:column;gap:2px;min-width:0;display:flex}.fsXYAq_question,.fsXYAq_answer{white-space:pre-wrap;overflow-wrap:anywhere;font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));margin:0}.fsXYAq_question{color:var(--dsw-alias-label-tertiary)}.fsXYAq_answer{color:var(--dsw-alias-label-primary)}.fsXYAq_answerLine{display:block}.fsXYAq_skipped{color:var(--dsw-alias-label-tertiary)}.fsXYAq_verdict{color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));margin:0}.fsXYAq_questionList{flex-direction:column;gap:8px;margin:0;padding-left:20px;display:flex}.fsXYAq_unansweredQuestion{color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;overflow-wrap:anywhere;font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px))}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-tool/AskQuestionCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-tool";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var AskQuestionCard_module_css_default = {
			"answer": "fsXYAq_answer",
			"answerLine": "fsXYAq_answerLine",
			"card": "fsXYAq_card",
			"item": "fsXYAq_item",
			"question": "fsXYAq_question",
			"questionList": "fsXYAq_questionList",
			"skipped": "fsXYAq_skipped",
			"unansweredQuestion": "fsXYAq_unansweredQuestion",
			"verdict": "fsXYAq_verdict"
		};
		//#endregion
		//#region lib/types/client/tool/components/AskQuestionCard.js
		/**
		* Render a validated ask-user transcript from plain card data.
		* @param props - Localized transcript card data.
		* @returns the readable answered or unanswered question list.
		*/
		function AskQuestionCard({ card }) {
			if (card.kind === "unanswered") return (0, react_jsx_runtime.jsxs)("div", {
				className: AskQuestionCard_module_css_default.card,
				children: [(0, react_jsx_runtime.jsx)("p", {
					className: AskQuestionCard_module_css_default.verdict,
					children: card.verdict
				}), (0, react_jsx_runtime.jsx)("ul", {
					className: AskQuestionCard_module_css_default.questionList,
					children: card.questions.map((question) => (0, react_jsx_runtime.jsx)("li", {
						className: AskQuestionCard_module_css_default.unansweredQuestion,
						children: question.question
					}, question.id))
				})]
			});
			return (0, react_jsx_runtime.jsx)("dl", {
				className: AskQuestionCard_module_css_default.card,
				children: card.questions.map((question) => (0, react_jsx_runtime.jsxs)("div", {
					className: AskQuestionCard_module_css_default.item,
					children: [(0, react_jsx_runtime.jsx)("dt", {
						className: AskQuestionCard_module_css_default.question,
						children: question.question
					}), (0, react_jsx_runtime.jsx)("dd", {
						className: AskQuestionCard_module_css_default.answer,
						children: question.answers.length === 0 ? (0, react_jsx_runtime.jsx)("span", {
							className: AskQuestionCard_module_css_default.skipped,
							children: card.skippedLabel
						}) : question.answers.map((answer, index) => (0, react_jsx_runtime.jsx)("span", {
							className: AskQuestionCard_module_css_default.answerLine,
							children: answer
						}, `${question.id}-${String(index)}`))
					})]
				}, question.id))
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-tool/src/client/tool/components/ToolRow.module.css.mjs
		const css$2 = ".o3BgMG_root{flex-direction:column;display:flex}.o3BgMG_row{position:relative;overflow:hidden}.o3BgMG_root[data-state=running] .o3BgMG_row:after{content:\"\";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite o3BgMG_dsh-tool-row-sweep;position:absolute;top:0;bottom:0;left:0}@keyframes o3BgMG_dsh-tool-row-sweep{0%{left:-300px}90%,to{left:100%}}.o3BgMG_leading{flex-shrink:0}.o3BgMG_root[data-tool^=cordis_] .o3BgMG_leading,.o3BgMG_root[data-tool^=cordis_] .o3BgMG_title{color:var(--dsw-alias-state-business-primary)}.o3BgMG_root[data-tool^=cordis_] .o3BgMG_title{font-weight:500}.o3BgMG_root[data-tool^=cordis_] .o3BgMG_sep{background:var(--dsw-alias-state-business-primary)}.o3BgMG_chevron{color:var(--dsw-alias-label-secondary)}.o3BgMG_title{font-weight:400}.o3BgMG_sep{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.o3BgMG_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);flex:auto;overflow:hidden}.o3BgMG_summarySuffix{white-space:nowrap;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);flex:none;margin-left:4px}.o3BgMG_diffStat{font-family:var(--ds-font-family-code);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 2px);color:var(--dsw-alias-label-caption);margin-left:10px;transform:translateY(.5px)}.o3BgMG_fileLink{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:inherit;text-align:left;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-secondary);text-decoration:underline dotted;text-decoration-color:var(--dsw-alias-label-tertiary);text-underline-offset:3px;cursor:pointer;background:0 0;border:none;flex:0 auto;margin:0;padding:0;text-decoration-thickness:1px;overflow:hidden}.o3BgMG_fileLink:hover{color:var(--dsw-alias-label-primary);text-decoration-color:currentColor}.o3BgMG_errorSummary{color:var(--dsw-alias-state-error-primary)}.o3BgMG_bodyWrap{flex-direction:column;display:flex}.o3BgMG_inspectButton{border:.5px solid var(--dsw-alias-border-l3);corner-shape:round;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;border-radius:999px;align-self:flex-start;align-items:center;gap:4px;margin:4px 0 2px 4px;padding:2px 8px;font-size:11px;line-height:16px;transition:opacity .1s;display:inline-flex}.o3BgMG_root:hover .o3BgMG_inspectButton,.o3BgMG_inspectButton:focus-visible{opacity:1}.o3BgMG_inspectButton:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.o3BgMG_bodyScroll{max-height:260px;overflow-y:auto}.o3BgMG_ioCard{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);font:var(--dsw-font-markdown-code-block-small);border-radius:12px;flex-direction:column;margin:4px 0 4px 4px;display:flex}.o3BgMG_ioSection{grid-template-columns:max-content 1fr;align-items:baseline;column-gap:14px;max-height:150px;padding:12px 16px;display:grid;overflow-y:auto}.o3BgMG_ioSection::-webkit-scrollbar-thumb{background-clip:padding-box;border:2px solid #0000;border-radius:6px}.o3BgMG_ioSection::-webkit-scrollbar-track{margin:6px 0}.o3BgMG_ioLabel{color:var(--dsw-alias-label-caption);align-self:start;position:sticky;top:0}.o3BgMG_ioDivider{background:var(--dsw-alias-border-l2);flex:none;height:.5px}.o3BgMG_ioText{white-space:pre-wrap;word-break:break-word;min-width:0;color:var(--dsw-alias-label-secondary)}.o3BgMG_ioText[data-error]{color:var(--dsw-alias-state-error-primary)}.o3BgMG_codeBody,.o3BgMG_terminalBody,.o3BgMG_diffBody,.o3BgMG_readBody,.o3BgMG_imageBody,.o3BgMG_searchBody,.o3BgMG_webBody{margin:4px 0 4px 4px}.o3BgMG_searchRecovery{white-space:pre-wrap;overflow-wrap:anywhere;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);margin:4px 0 4px 4px}.o3BgMG_imageLabel{overflow-wrap:anywhere;font:var(--dsw-font-sm-13);color:var(--dsw-alias-label-secondary);margin-bottom:4px}.o3BgMG_imageMeta{white-space:pre-wrap;overflow-wrap:anywhere;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary)}.o3BgMG_codeBody{--dsl-code-block-content-font:var(--dsw-font-markdown-code-block-small)}.o3BgMG_terminalBody{--dsl-terminal-font:var(--dsw-font-markdown-code-block-small);--dsl-terminal-line-height:18px;--dsl-terminal-output-max-height:224px;border:.5px solid var(--dsw-alias-border-l1)}.o3BgMG_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-tool/ToolRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-tool";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var ToolRow_module_css_default = {
			"bodyScroll": "o3BgMG_bodyScroll",
			"bodyWrap": "o3BgMG_bodyWrap",
			"chevron": "o3BgMG_chevron",
			"codeBody": "o3BgMG_codeBody",
			"diffBody": "o3BgMG_diffBody",
			"diffStat": "o3BgMG_diffStat",
			"dsh-tool-row-sweep": "o3BgMG_dsh-tool-row-sweep",
			"errorSummary": "o3BgMG_errorSummary",
			"fileLink": "o3BgMG_fileLink",
			"imageBody": "o3BgMG_imageBody",
			"imageLabel": "o3BgMG_imageLabel",
			"imageMeta": "o3BgMG_imageMeta",
			"inspectButton": "o3BgMG_inspectButton",
			"ioCard": "o3BgMG_ioCard",
			"ioDivider": "o3BgMG_ioDivider",
			"ioLabel": "o3BgMG_ioLabel",
			"ioSection": "o3BgMG_ioSection",
			"ioText": "o3BgMG_ioText",
			"leading": "o3BgMG_leading",
			"readBody": "o3BgMG_readBody",
			"root": "o3BgMG_root",
			"row": "o3BgMG_row",
			"searchBody": "o3BgMG_searchBody",
			"searchRecovery": "o3BgMG_searchRecovery",
			"sep": "o3BgMG_sep",
			"summary": "o3BgMG_summary",
			"summarySuffix": "o3BgMG_summarySuffix",
			"terminalBody": "o3BgMG_terminalBody",
			"title": "o3BgMG_title",
			"visuallyHidden": "o3BgMG_visuallyHidden",
			"webBody": "o3BgMG_webBody"
		};
		//#endregion
		//#region lib/types/client/tool/components/ToolRow.js
		function leadingFor$1(state, icon) {
			switch (state) {
				case "error": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
				case "stopped": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
				default: return icon;
			}
		}
		/** Visually hidden run-state label: the StateDot and the CSS sweep are both
		*  aria-hidden / colour-only, so assistive technology needs this text to know a
		*  row is running, failed, or interrupted. null in the ok state (the icon and
		*  summary already describe a settled row). */
		function stateStatus$1(state, t) {
			switch (state) {
				case "running": return t("row.running");
				case "error": return t("row.failed");
				case "stopped": return t("row.stopped");
				default: return null;
			}
		}
		function ToolRow({ t, variant, toolName, icon, title, summary, summarySuffix, bodyRaw, output, askQuestion, errorSummary, terminal, diff, read, image, renderSlot, loadImage, search, web, state, filePath, filePathLine, onOpenFile, inspect }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const terminalLabels = (0, react.useMemo)(() => terminalBlockLabels(t), [t]);
			const diffLabels = (0, react.useMemo)(() => diffBlockLabels(t), [t]);
			const readLabels = (0, react.useMemo)(() => readBlockLabels(t), [t]);
			const searchLabels = (0, react.useMemo)(() => searchBlockLabels(t), [t]);
			const webLabels = (0, react.useMemo)(() => webBlockLabels(t), [t]);
			const terminalBody = terminal === void 0 || terminal === null ? null : localizeTerminalCardModel(terminal, t);
			const diffBody = diff ?? null;
			const readBody = read ?? null;
			const imageBody = image !== void 0 && image !== null && renderSlot !== void 0 && loadImage !== void 0 ? image : null;
			const searchBody = search ?? null;
			const webBody = web ?? null;
			const askQuestionBody = askQuestion ?? null;
			const outputText = output ?? null;
			const card = askQuestionBody ?? terminalBody ?? diffBody ?? readBody ?? imageBody ?? searchBody ?? webBody;
			const expandable = bodyRaw != null || outputText !== null || card !== null;
			const open = expanded && expandable;
			const bodyText = (0, react.useMemo)(() => open && card === null && bodyRaw != null ? formatToolBody(variant, bodyRaw) : null, [
				bodyRaw,
				card,
				open,
				variant
			]);
			const status = stateStatus$1(state, t);
			const failureLine = state === "error" ? errorSummary ?? null : null;
			const summaryText = failureLine ?? terminalBody?.description ?? summary;
			const diffStat = (0, react.useMemo)(() => {
				if (diffBody === null) return null;
				const { added, removed } = (0, _deepseek_ai_dsh_client_ui_primitives.diffTotals)(diffBody.card.diffs);
				return `+${added} -${removed}`;
			}, [diffBody]);
			const suffix = failureLine === null ? summarySuffix ?? diffStat : null;
			const fileLink = filePath !== void 0 && onOpenFile !== void 0 && failureLine === null;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
			const openFile = (event) => {
				event.stopPropagation();
				if (filePath === void 0 || onOpenFile === void 0) return;
				if (filePathLine === void 0) onOpenFile(filePath);
				else onOpenFile(filePath, { line: filePathLine });
			};
			const fileLinkKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") event.stopPropagation();
			};
			const cardBody = variant === "code" ? null : bodyText;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ToolRow_module_css_default.root,
				"data-variant": variant,
				"data-tool": toolName,
				"data-state": state,
				children: [status !== null && (0, react_jsx_runtime.jsx)("span", {
					className: ToolRow_module_css_default.visuallyHidden,
					children: status
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					rowClassName: ToolRow_module_css_default.row,
					leadingClassName: ToolRow_module_css_default.leading,
					titleClassName: ToolRow_module_css_default.title,
					chevronClassName: ToolRow_module_css_default.chevron,
					icon: leadingFor$1(state, icon),
					title,
					open,
					expandable,
					expandOnRowClick: true,
					keepContentWhenOpen: true,
					onToggle: toggleExpand,
					collapsedContent: summaryText !== "" && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: ToolRow_module_css_default.sep,
							"aria-hidden": true
						}),
						fileLink ? (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ToolRow_module_css_default.fileLink,
							onClick: openFile,
							onKeyDown: fileLinkKeyDown,
							children: summaryText
						}) : (0, react_jsx_runtime.jsx)("span", {
							className: clsx(ToolRow_module_css_default.summary, failureLine !== null && ToolRow_module_css_default.errorSummary),
							children: summaryText
						}),
						suffix !== null && (0, react_jsx_runtime.jsx)("span", {
							className: clsx(ToolRow_module_css_default.summarySuffix, suffix === diffStat && ToolRow_module_css_default.diffStat),
							children: suffix
						})
					] }),
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: ToolRow_module_css_default.bodyWrap,
						children: [askQuestionBody !== null ? (0, react_jsx_runtime.jsx)(AskQuestionCard, { card: askQuestionBody }) : terminalBody !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
							...terminalBody.card,
							maxLines: Infinity,
							labels: terminalLabels,
							className: ToolRow_module_css_default.terminalBody
						}) : diffBody !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
							...diffBody.card,
							labels: diffLabels,
							maxLines: 8,
							className: ToolRow_module_css_default.diffBody
						}) : readBody !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReadBlock, {
							...readBody,
							labels: readLabels,
							maxLines: 8,
							className: ToolRow_module_css_default.readBody
						}) : imageBody !== null ? (0, react_jsx_runtime.jsxs)("div", {
							className: ToolRow_module_css_default.imageBody,
							children: [
								(0, react_jsx_runtime.jsx)("div", {
									className: ToolRow_module_css_default.imageLabel,
									children: imageBody.label
								}),
								renderSlot !== void 0 && loadImage !== void 0 && renderSlot("tool.call.images", {
									images: imageBody.images,
									loadImage,
									align: "start"
								}),
								(0, react_jsx_runtime.jsx)("div", {
									className: ToolRow_module_css_default.imageMeta,
									children: imageBody.text
								})
							]
						}) : searchBody !== null ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SearchBlock, {
							...searchBody.card,
							labels: searchLabels,
							maxLines: 8,
							className: ToolRow_module_css_default.searchBody
						}), searchBody.recovery !== void 0 && (0, react_jsx_runtime.jsx)("div", {
							className: ToolRow_module_css_default.searchRecovery,
							children: searchBody.recovery
						})] }) : webBody !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.WebBlock, {
							...webBody,
							labels: webLabels,
							className: ToolRow_module_css_default.webBody
						}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [variant === "code" && bodyText !== null && (0, react_jsx_runtime.jsx)("div", {
							className: ToolRow_module_css_default.bodyScroll,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.CodeBlock, {
								code: bodyText,
								lang: "typescript",
								copyLabel: t("copy"),
								copiedLabel: t("copied"),
								className: ToolRow_module_css_default.codeBody
							})
						}), (cardBody !== null || outputText !== null) && (0, react_jsx_runtime.jsxs)("div", {
							className: ToolRow_module_css_default.ioCard,
							children: [
								cardBody !== null && (0, react_jsx_runtime.jsxs)("div", {
									className: ToolRow_module_css_default.ioSection,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: ToolRow_module_css_default.ioLabel,
										children: t("row.input")
									}), (0, react_jsx_runtime.jsx)("span", {
										className: ToolRow_module_css_default.ioText,
										children: cardBody
									})]
								}),
								cardBody !== null && outputText !== null && (0, react_jsx_runtime.jsx)("span", {
									className: ToolRow_module_css_default.ioDivider,
									"aria-hidden": true
								}),
								outputText !== null && (0, react_jsx_runtime.jsxs)("div", {
									className: ToolRow_module_css_default.ioSection,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: ToolRow_module_css_default.ioLabel,
										children: t("row.output")
									}), (0, react_jsx_runtime.jsx)("span", {
										className: ToolRow_module_css_default.ioText,
										"data-error": state === "error" || void 0,
										children: outputText
									})]
								})
							]
						})] }), inspect !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ToolRow_module_css_default.inspectButton,
							onClick: inspect,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {}), t("row.inspect")]
						})]
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/tool/toolviews/GenericToolCard.js
		/** Variant leading icons (figma table); all glyphs render at 14 inside the 16px leading box. */
		const VARIANT_ICONS = {
			search: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
			read: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }),
			bash: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 14 }),
			write: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 }),
			edit: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 }),
			code: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 }),
			others: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 })
		};
		function GenericToolCard({ toolName, block, cwd, home, openFile, inspect, t }) {
			const model = toolRowModel(toolName, block, cwd, home);
			const terminal = terminalCardModel(block, cwd);
			const read = readCardModel(block, cwd, home);
			const diff = diffCardModel(block);
			const search = searchCardModel(block);
			const web = webCardModel(block);
			const state = model.state === "ok" && terminal !== null && terminalFailed(terminal) ? "error" : model.state;
			const singleFile = model.filePath !== void 0;
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: VARIANT_ICONS[model.variant],
				title: t(model.titleKey),
				summary: model.summary,
				bodyRaw: singleFile ? null : model.bodyRaw,
				output: model.output,
				errorSummary: model.errorSummary,
				terminal,
				diff,
				read,
				search,
				web,
				state,
				filePath: model.filePath,
				onOpenFile: singleFile ? openFile : void 0,
				inspect
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-tool/src/client/tool/ToolCallTree.module.css.mjs
		const css$1 = ".ztWv_q_callRow{border-radius:6px}.ztWv_q_subCalls{border-left:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:4px;margin:4px 0 2px 22px;padding-left:8px;display:flex}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-tool/ToolCallTree.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-tool";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ToolCallTree_module_css_default = {
			"callRow": "ztWv_q_callRow",
			"subCalls": "ztWv_q_subCalls"
		};
		//#endregion
		//#region lib/types/client/tool/ToolCallTree.js
		/** Root/subcall Tool composition with one keyed atomic dispatch path. */
		/** Resolve a Tool call's wire name from either lifecycle form. */
		function callName(node) {
			return "kind" in node ? node.call?.name ?? "" : node.name;
		}
		/** One atomic call dispatched through the Tool-owned keyed slot. */
		const ToolCall = (0, react.memo)(function ToolCall({ renderSlot, callId, toolName, block, openFile, cwd, home, inspectCall, loadImage, t, children }) {
			const owner = (0, react.useMemo)(() => ({
				callId,
				toolName,
				block,
				openFile,
				cwd,
				home,
				loadImage,
				inspect: () => {
					inspectCall(callId);
				}
			}), [
				callId,
				toolName,
				block,
				openFile,
				cwd,
				home,
				loadImage,
				inspectCall
			]);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ToolCallTree_module_css_default.callRow,
				"data-chat-anchor-key": `call:${callId}`,
				"data-chat-call-id": callId,
				children: [renderSlot("tool.call.toolview", owner, {
					entryKey: toolName,
					fallback: (0, react_jsx_runtime.jsx)(GenericToolCard, {
						...owner,
						t
					})
				}), children]
			});
		});
		const ToolCallBranch = (0, react.memo)(function ToolCallBranch({ renderSlot, block, cwd, home, openFile, inspectCall, loadImage, t }) {
			return (0, react_jsx_runtime.jsx)(ToolCall, {
				renderSlot,
				callId: block.callId,
				toolName: callName(block),
				block,
				openFile,
				cwd,
				home,
				inspectCall,
				loadImage,
				t,
				children: block.subCalls.length > 0 ? (0, react_jsx_runtime.jsx)("div", {
					className: ToolCallTree_module_css_default.subCalls,
					"data-subcalls": true,
					children: block.subCalls.map((child) => (0, react_jsx_runtime.jsx)(ToolCallBranch, {
						renderSlot,
						block: child,
						cwd,
						home,
						openFile,
						inspectCall,
						loadImage,
						t
					}, child.callId))
				}) : null
			});
		});
		/**
		* Render one root Tool call and its recursive children through the same
		* atomic keyed dispatch.
		* @param props - whole-Tool owner data and the Tool-owned child-slot share.
		* @returns the Tool call tree.
		*/
		function ToolCallTree({ renderSlot, node, cwd, openFile, inspectCall, loadImage, useHostInfo, t }) {
			const home = useHostInfo((info) => info.home);
			const block = node.data.root;
			return (0, react_jsx_runtime.jsx)(ToolCallBranch, {
				renderSlot,
				block,
				cwd,
				home,
				openFile,
				inspectCall,
				loadImage,
				t
			});
		}
		//#endregion
		//#region lib/types/client/locale.js
		/** Locale namespace supplied by the conversation owner to Tool renderers. */
		const CONVERSATION_NS = "conversation";
		//#endregion
		//#region lib/types/client/tool/toolviews/ask-question-row.js
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function parseJson(text) {
			try {
				return JSON.parse(text);
			} catch {
				return;
			}
		}
		/** Answer records from the result JSON; null when the result is malformed. */
		function answerEntries(text) {
			const parsed = parseJson(text);
			if (!isRecord(parsed)) return null;
			const answers = parsed.answers;
			if (!Array.isArray(answers) || !answers.every(isRecord)) return null;
			const entries = [];
			for (const answer of answers) {
				if (typeof answer.id !== "string" || !Array.isArray(answer.selected) || !answer.selected.every((item) => typeof item === "string") || answer.custom !== void 0 && typeof answer.custom !== "string") return null;
				entries.push({
					id: answer.id,
					selected: answer.selected,
					...answer.custom === void 0 ? {} : { custom: answer.custom }
				});
			}
			return entries;
		}
		/** Questions from call JSON; null when pairing with answers would be ambiguous. */
		function questionEntries(argsRaw) {
			const parsed = parseJson(argsRaw);
			if (!isRecord(parsed) || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
			const questions = [];
			const ids = /* @__PURE__ */ new Set();
			for (const question of parsed.questions) {
				if (!isRecord(question) || typeof question.id !== "string" || typeof question.question !== "string" || ids.has(question.id)) return null;
				ids.add(question.id);
				questions.push({
					id: question.id,
					question: question.question
				});
			}
			return questions;
		}
		/** Pair questions with result entries by their echoed stable ids. */
		function pairAnswers(argsRaw, answers) {
			const questions = questionEntries(argsRaw);
			if (questions === null || questions.length !== answers.length) return null;
			const byId = /* @__PURE__ */ new Map();
			for (const answer of answers) {
				if (byId.has(answer.id)) return null;
				byId.set(answer.id, answer);
			}
			const paired = [];
			for (const question of questions) {
				const answer = byId.get(question.id);
				if (answer === void 0) return null;
				paired.push({
					...question,
					answers: [...answer.selected, ...answer.custom === void 0 || answer.custom === "" ? [] : [answer.custom]]
				});
			}
			return paired;
		}
		/** Answer summary plus structured transcript content from the two wire JSON documents. */
		function answeredPresentation(argsRaw, text, t) {
			const answers = answerEntries(text);
			if (answers === null) return null;
			const answered = answers.filter((answer) => answer.selected.length > 0 || (answer.custom ?? "") !== "").length;
			return {
				summary: t("ask.answered", {
					answered,
					total: answers.length
				}),
				questions: pairAnswers(argsRaw, answers)
			};
		}
		/** Best-effort answered-count summary when strict transcript pairing fails. */
		function answeredSummary(text, t) {
			const parsed = parseJson(text);
			if (!isRecord(parsed)) return null;
			const answers = parsed.answers;
			if (!Array.isArray(answers) || !answers.every(isRecord)) return null;
			const answered = answers.filter((a) => Array.isArray(a.selected) && a.selected.length > 0 || typeof a.custom === "string" && a.custom !== "").length;
			return t("ask.answered", {
				answered,
				total: answers.length
			});
		}
		/** Summarizes a pending, answered, cancelled, or interrupted question set. */
		function AskQuestionRow({ toolName, block, inspect, t }) {
			const model = toolRowModel(toolName, block);
			const code = "kind" in block ? block.error?.code : void 0;
			const argsRaw = ("kind" in block ? block.call?.argsRaw : block.argsRaw) ?? "";
			let summary = model.summary;
			let state = model.state;
			let transcript = null;
			if (code === "ASK_CANCELLED") {
				summary = t("ask.cancelled");
				state = "ok";
				const questions = questionEntries(argsRaw);
				if (questions !== null) transcript = {
					kind: "unanswered",
					questions,
					verdict: t("ask.cancelledDetail")
				};
			} else if (code === "ASK_ABORTED") {
				summary = t("ask.interrupted");
				state = "stopped";
				const questions = questionEntries(argsRaw);
				if (questions !== null) transcript = {
					kind: "unanswered",
					questions,
					verdict: t("ask.interruptedDetail")
				};
			} else if (model.state === "running") summary = t("ask.waiting");
			else if ("kind" in block && model.state === "ok") {
				const text = singleResultText(block);
				if (text !== void 0) {
					const presentation = answeredPresentation(argsRaw, text, t);
					summary = presentation?.summary ?? answeredSummary(text, t) ?? model.summary;
					if (presentation?.questions !== null && presentation?.questions !== void 0) transcript = {
						kind: "answered",
						questions: presentation.questions,
						skippedLabel: t("ask.skipped")
					};
				}
			}
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, {}),
				title: t("ask.rowTitle"),
				summary,
				bodyRaw: transcript === null ? model.bodyRaw : null,
				output: transcript === null ? model.output : null,
				askQuestion: transcript,
				state,
				inspect
			});
		}
		/** Registers the ask-user-question conversation row. */
		const askQuestionToolview = {
			name: "ask-question-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: "ask_user_question",
					locale: CONVERSATION_NS
				}, AskQuestionRow));
			}
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-tool/src/client/tool/toolviews/bash-sample.module.css.mjs
		const css = ".CY-8Ka_card{flex-direction:column;display:flex}.CY-8Ka_terminal{--dsl-terminal-font:var(--dsw-font-markdown-code-block-small);--dsl-terminal-line-height:18px;--dsl-terminal-output-max-height:224px;border:.5px solid var(--dsw-alias-border-l1);margin:4px 0 4px 4px}.CY-8Ka_ioCard{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);font:var(--dsw-font-markdown-code-block-small);border-radius:12px;flex-direction:column;margin:4px 0 4px 4px;display:flex}.CY-8Ka_ioSection{grid-template-columns:max-content 1fr;align-items:baseline;column-gap:14px;max-height:150px;padding:12px 16px;display:grid;overflow-y:auto}.CY-8Ka_ioSection::-webkit-scrollbar-thumb{background-clip:padding-box;border:2px solid #0000;border-radius:6px}.CY-8Ka_ioSection::-webkit-scrollbar-track{margin:6px 0}.CY-8Ka_ioLabel{color:var(--dsw-alias-label-caption);align-self:start;position:sticky;top:0}.CY-8Ka_ioDivider{background:var(--dsw-alias-border-l2);flex:none;height:.5px}.CY-8Ka_ioText{white-space:pre-wrap;word-break:break-word;min-width:0;color:var(--dsw-alias-label-secondary)}.CY-8Ka_ioText[data-error]{color:var(--dsw-alias-state-error-primary)}.CY-8Ka_root[data-expandable]{cursor:pointer}.CY-8Ka_root{height:calc(24px + var(--dsh-content-font-delta,0px));align-items:center;min-width:0;display:flex;position:relative;overflow:hidden}.CY-8Ka_root[data-state=running]:after{content:\"\";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite CY-8Ka_dsh-bash-row-sweep;position:absolute;top:0;bottom:0;left:0}@keyframes CY-8Ka_dsh-bash-row-sweep{0%{left:-300px}90%,to{left:100%}}.CY-8Ka_leading{width:calc(16px + var(--dsh-content-font-delta,0px));height:calc(16px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex;position:relative}.CY-8Ka_leading svg:not([data-state]){width:calc(14px + var(--dsh-content-font-delta,0px));height:calc(14px + var(--dsh-content-font-delta,0px))}.CY-8Ka_chevron{color:var(--dsw-alias-label-secondary)}.CY-8Ka_iconIdle{opacity:1;transition:opacity .1s;display:inline-flex}.CY-8Ka_chevronHover{opacity:0;margin:auto;transition:opacity .1s;position:absolute;inset:0}.CY-8Ka_root:hover .CY-8Ka_iconIdle{opacity:0}.CY-8Ka_root:hover .CY-8Ka_chevronHover{opacity:1}.CY-8Ka_title{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-secondary);flex:none}.CY-8Ka_sep{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.CY-8Ka_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);flex:auto;overflow:hidden}.CY-8Ka_errorSummary{color:var(--dsw-alias-state-error-primary)}.CY-8Ka_bodyWrap{flex-direction:column;display:flex}.CY-8Ka_inspectButton{border:.5px solid var(--dsw-alias-border-l4);corner-shape:round;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;border-radius:999px;align-self:flex-start;align-items:center;gap:4px;margin:4px 0 2px 4px;padding:2px 8px;font-size:11px;line-height:16px;transition:opacity .1s;display:inline-flex}.CY-8Ka_card:hover .CY-8Ka_inspectButton,.CY-8Ka_inspectButton:focus-visible{opacity:1}.CY-8Ka_inspectButton:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.CY-8Ka_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}";
		const tagId = "@deepseek-ai/dsh-client-ui-tool/bash-sample.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-tool";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var bash_sample_module_css_default = {
			"bodyWrap": "CY-8Ka_bodyWrap",
			"card": "CY-8Ka_card",
			"chevron": "CY-8Ka_chevron",
			"chevronHover": "CY-8Ka_chevronHover",
			"dsh-bash-row-sweep": "CY-8Ka_dsh-bash-row-sweep",
			"errorSummary": "CY-8Ka_errorSummary",
			"iconIdle": "CY-8Ka_iconIdle",
			"inspectButton": "CY-8Ka_inspectButton",
			"ioCard": "CY-8Ka_ioCard",
			"ioDivider": "CY-8Ka_ioDivider",
			"ioLabel": "CY-8Ka_ioLabel",
			"ioSection": "CY-8Ka_ioSection",
			"ioText": "CY-8Ka_ioText",
			"leading": "CY-8Ka_leading",
			"root": "CY-8Ka_root",
			"sep": "CY-8Ka_sep",
			"summary": "CY-8Ka_summary",
			"terminal": "CY-8Ka_terminal",
			"title": "CY-8Ka_title",
			"visuallyHidden": "CY-8Ka_visuallyHidden"
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/bash-sample.js
		function leadingFor(state) {
			switch (state) {
				case "error": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
				case "stopped": return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
				default: return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 14 });
			}
		}
		/** Visually hidden status — StateDot is aria-hidden; AT needs a text label. */
		function stateStatus(state, t) {
			switch (state) {
				case "running": return t("bash.running");
				case "error": return t("bash.failed");
				case "stopped": return t("bash.stopped");
				default: return null;
			}
		}
		/** Renders expandable Bash output with an accessible lifecycle label. */
		function BashRow({ toolName, block, sessionId, useSessions, inspect, t }) {
			const model = toolRowModel(toolName, block);
			const terminalModel = terminalCardModel(block, useSessions((list) => list.byId[sessionId]?.cwd));
			const terminal = terminalModel === null ? null : localizeTerminalCardModel(terminalModel, t);
			const state = model.state === "ok" && terminalModel !== null && terminalFailed(terminalModel) ? "error" : model.state;
			const status = stateStatus(state, t);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const genericBody = terminal === null && (model.state === "error" || isSettledPersistentShellCall(block) || isSpilledShellCall(block)) && (model.bodyRaw !== null || model.output !== null);
			const expandable = terminal !== null || genericBody;
			const open = expanded && expandable;
			const body = (0, react.useMemo)(() => open && genericBody && model.bodyRaw !== null ? formatToolBody(model.variant, model.bodyRaw) : null, [
				genericBody,
				model.bodyRaw,
				model.variant,
				open
			]);
			const failureLine = model.state === "error" ? model.errorSummary : null;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
			const toggleFromKeyboard = (event) => {
				if (!expandable || event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				toggleExpand();
			};
			const leading = open ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: bash_sample_module_css_default.chevron }) : expandable ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
				className: bash_sample_module_css_default.iconIdle,
				children: leadingFor(state)
			}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: clsx(bash_sample_module_css_default.chevron, bash_sample_module_css_default.chevronHover) })] }) : leadingFor(state);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: bash_sample_module_css_default.card,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: bash_sample_module_css_default.root,
					"data-sample": "bash",
					"data-variant": "bash",
					"data-state": state,
					"data-expandable": expandable || void 0,
					role: expandable ? "button" : void 0,
					tabIndex: expandable ? 0 : void 0,
					"aria-expanded": expandable ? open : void 0,
					onClick: expandable ? toggleExpand : void 0,
					onKeyDown: expandable ? toggleFromKeyboard : void 0,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: bash_sample_module_css_default.leading,
							children: leading
						}),
						status !== null && (0, react_jsx_runtime.jsx)("span", {
							className: bash_sample_module_css_default.visuallyHidden,
							children: status
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: bash_sample_module_css_default.title,
							children: t(model.titleKey)
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: bash_sample_module_css_default.sep,
							"aria-hidden": true
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: clsx(bash_sample_module_css_default.summary, failureLine !== null && bash_sample_module_css_default.errorSummary),
							children: failureLine ?? terminal?.description ?? model.summary
						})
					]
				}), open && (0, react_jsx_runtime.jsxs)("div", {
					className: bash_sample_module_css_default.bodyWrap,
					children: [terminal !== null ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
						...terminal.card,
						maxLines: Infinity,
						labels: terminalBlockLabels(t),
						className: bash_sample_module_css_default.terminal
					}) : (0, react_jsx_runtime.jsxs)("div", {
						className: bash_sample_module_css_default.ioCard,
						children: [
							body !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: bash_sample_module_css_default.ioSection,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: bash_sample_module_css_default.ioLabel,
									children: t("row.input")
								}), (0, react_jsx_runtime.jsx)("span", {
									className: bash_sample_module_css_default.ioText,
									children: body
								})]
							}),
							body !== null && model.output !== null && (0, react_jsx_runtime.jsx)("span", {
								className: bash_sample_module_css_default.ioDivider,
								"aria-hidden": true
							}),
							model.output !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: bash_sample_module_css_default.ioSection,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: bash_sample_module_css_default.ioLabel,
									children: t("row.output")
								}), (0, react_jsx_runtime.jsx)("span", {
									className: bash_sample_module_css_default.ioText,
									"data-error": state === "error" || void 0,
									children: model.output
								})]
							})
						]
					}), inspect !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: bash_sample_module_css_default.inspectButton,
						onClick: inspect,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {}), t("row.inspect")]
					})]
				})]
			});
		}
		/** Registers the standalone Bash conversation-row sample. */
		const bashToolviewSample = {
			name: "bash-toolview-sample",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: "bash",
					locale: CONVERSATION_NS
				}, BashRow));
			}
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/file-mutation-row.js
		/**
		* Lets users expand an applied file diff and open the reported path.
		*/
		function FileMutationRow({ toolName, block, cwd, home, openFile, inspect, t }) {
			const model = toolRowModel(toolName, block, cwd, home);
			const diff = diffCardModel(block);
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 }),
				title: t(model.titleKey),
				summary: model.summary,
				output: model.output,
				errorSummary: model.errorSummary,
				diff,
				state: model.state,
				filePath: model.filePath,
				onOpenFile: openFile,
				inspect
			});
		}
		/** Registers the edit and write conversation rows. */
		const fileMutationToolview = {
			name: "file-mutation-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", function* () {
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "edit",
						locale: CONVERSATION_NS
					}, FileMutationRow);
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "write",
						locale: CONVERSATION_NS
					}, FileMutationRow);
				});
			}
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/read-family-row.js
		/**
		* Compose a read-family row: the shared chrome and model-derived fields, plus the
		* caller's card material.
		* @param props - the toolview runtime share and locale seat.
		* @param card - the card props this row owns.
		* @returns the assembled ToolRow.
		*/
		function readFamilyRow({ toolName, block, cwd, home, openFile, inspect, t }, card) {
			const model = toolRowModel(toolName, block, cwd, home);
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }),
				title: t(model.titleKey),
				summary: model.summary,
				bodyRaw: null,
				output: model.output,
				errorSummary: model.errorSummary,
				...card,
				state: model.state,
				filePath: model.filePath,
				onOpenFile: openFile,
				inspect
			});
		}
		//#endregion
		//#region lib/types/client/tool/toolviews/read-row.js
		/**
		* Lets users expand a completed read result and open its reported path at the
		* line the call started from.
		*/
		function ReadRow(props) {
			const { block, cwd, home } = props;
			return readFamilyRow(props, {
				read: readCardModel(block, cwd, home),
				filePathLine: readCallLine(block)
			});
		}
		/** Registers the read tool's conversation row. */
		const readToolview = {
			name: "read-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: "read",
					locale: CONVERSATION_NS
				}, ReadRow));
			}
		};
		//#endregion
		//#region lib/types/client/tool/models/image-card-model.js
		/**
		* Whether a wire value is a usable pixel or byte measure.
		* @param value - unvalidated wire value.
		* @returns true when it is a positive integer.
		*/
		function positiveInteger(value) {
			return typeof value === "number" && Number.isInteger(value) && value > 0;
		}
		/** The envelope `formatImageReadOutput` writes, matched by shape. */
		const IMAGE_ENVELOPE = /^<path>[^\n]*<\/path>\n<type>image<\/type>\n<content>\n[\s\S]*\n<\/content>$/u;
		/** The media types a durable image block may claim; anything else declines.
		*  Hand-written mirror of `ImageMediaType` from dsh-attachment — the wire
		*  boundary needs a runtime check and feature plugins must not import values
		*  from each other; a new member added there must be added here too, or the
		*  decline point below silently degrades that image to the generic card. */
		const IMAGE_MEDIA_TYPES = new Set([
			"image/png",
			"image/jpeg",
			"image/webp",
			"image/gif"
		]);
		/** Runtime membership check; the cast is safe because the set holds exactly the four members. */
		function isImageMediaType(value) {
			return IMAGE_MEDIA_TYPES.has(value);
		}
		/**
		* Narrow the persisted metadata, defensively. Every field arrives unvalidated on
		* replay (an obsolete or hand-edited log reaches here), so any mismatch declines
		* to the generic card rather than throwing. An absent `meta` (a nested call
		* persists none) leaves the path to the call's own `file_path` argument.
		*
		* The attachment id is checked for existence only: it is opaque and
		* provider-owned, and consumers must not parse that representation, so
		* pattern-matching the local content-address form would reject a legitimate id
		* minted by an alternative store.
		* @param meta - persisted presentation metadata of unknown shape.
		* @returns the narrowed path, or null when it does not match.
		*/
		function imageMeta(meta) {
			if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return null;
			const { path } = meta;
			if (typeof path !== "string" || path === "") return null;
			return { path };
		}
		/**
		* Narrow every attachment reference carried by the result's image blocks, in
		* order.
		*
		* The content is the single source of truth for the references: it is what the
		* tool actually returned and what a post-execute hook would replace together
		* with the rest of the content. Every field arrives unvalidated over the wire,
		* so any malformed image block declines to the generic card rather than
		* rendering a partial gallery.
		*
		* The attachment id is checked for existence only — it is opaque and
		* provider-owned, so pattern-matching the local content-address form would reject
		* a legitimate id minted by an alternative store.
		* @param content - the settled result's content blocks.
		* @returns the narrowed references, or null when no valid image block is present.
		*/
		function imageReferences(content) {
			const refs = [];
			for (const part of content) {
				if (typeof part !== "object" || part === null) continue;
				const { type, attachment } = part;
				if (type !== "image") continue;
				if (typeof attachment !== "object" || attachment === null || Array.isArray(attachment)) return null;
				const { attachmentId, mediaType, bytes, width, height, name, originalDimensions } = attachment;
				if (typeof attachmentId !== "string" || attachmentId === "") return null;
				if (typeof mediaType !== "string" || !isImageMediaType(mediaType)) return null;
				if (!positiveInteger(bytes) || !positiveInteger(width) || !positiveInteger(height)) return null;
				if (name !== void 0 && typeof name !== "string") return null;
				let inputDimensions;
				if (originalDimensions !== void 0) {
					if (typeof originalDimensions !== "object" || originalDimensions === null || Array.isArray(originalDimensions)) return null;
					const { width: inputWidth, height: inputHeight } = originalDimensions;
					if (!positiveInteger(inputWidth) || !positiveInteger(inputHeight)) return null;
					inputDimensions = {
						width: inputWidth,
						height: inputHeight
					};
				}
				refs.push({
					attachmentId,
					mediaType,
					bytes,
					width,
					height,
					...name === void 0 ? {} : { name },
					...inputDimensions === void 0 ? {} : { originalDimensions: inputDimensions }
				});
			}
			return refs.length > 0 ? refs : null;
		}
		/**
		* Read the text of every text block of a settled image result, joined in order.
		*
		* The envelope is one of them; a post-execute hook that appends further text
		* blocks keeps them visible under the gallery instead of being dropped. The
		* envelope shape is still the recognition gate: a result without it is not a
		* well-formed image read and declines.
		* @param content - the settled result's content blocks.
		* @returns the joined text, or null when no envelope-shaped block is present.
		*/
		function imageTexts(content) {
			const parts = [];
			let sawEnvelope = false;
			for (const part of content) {
				if (part.type !== "text" || typeof part.text !== "string") continue;
				if (IMAGE_ENVELOPE.test(part.text)) sawEnvelope = true;
				parts.push(part.text);
			}
			return sawEnvelope && parts.length > 0 ? parts.join("\n") : null;
		}
		/**
		* Whether the content carries only blocks the card consumes.
		*
		* `ContentBlock` is a merge-extensible union, so a post-execute hook could
		* append a block of a type this card does not render (reasoning, an extension
		* type, or a non-object). Rendering the card anyway would silently hide that
		* block, so anything beyond a well-formed text or image object declines to the
		* generic card, which shows the flattened content.
		* @param content - the settled result's content blocks.
		* @returns true when every block is a text or image object with usable fields.
		*/
		function fullyRendered(content) {
			return content.every((part) => {
				if (typeof part !== "object" || part === null) return false;
				const { type, text } = part;
				return type === "image" || type === "text" && typeof text === "string";
			});
		}
		/**
		* Derive a settled image card after validating the call head, persisted
		* metadata (or its argument fallback), and the model-facing image envelope.
		*
		* The card is result-side only: a call carries no content until `execute`
		* returns, so a running `read_image` has none and this returns null for it.
		* Both root and nested calls settle as ToolResultNode; the nested one (a
		* read_image dispatched from inside run_code) persists no presentationMeta, so
		* its label falls back to the call's own `file_path` argument.
		* @param block - running or settled Tool block.
		* @param sessionCwd - the session workspace root; a workspace-rooted absolute
		*   path label displays relative to it. Absent leaves the path as authored.
		* @param home - host account home; a leftover POSIX home path displays as `~`.
		* @returns the image-card props, or null for the generic path.
		*/
		function imageCardModel(block, sessionCwd, home) {
			if (!("kind" in block) || block.isError) return null;
			const call = parsedToolCall(block);
			if (call?.name !== "read_image") return null;
			const { file_path: filePath } = call.args;
			if (typeof filePath !== "string" || filePath.trim() === "") return null;
			const path = imageMeta(block.meta)?.path ?? (block.parentCallId !== void 0 ? filePath : null);
			if (path === null) return null;
			if (!fullyRendered(block.content)) return null;
			const refs = imageReferences(block.content);
			if (refs === null) return null;
			const text = imageTexts(block.content);
			if (text === null) return null;
			return {
				label: abbreviateHomePath(relativizeToCwd(path, sessionCwd), home),
				images: refs.map((ref) => ({ attachment: ref })),
				text
			};
		}
		//#endregion
		//#region lib/types/client/tool/toolviews/read-image-row.js
		/**
		* read_image row: the read-family chrome with the durably committed image as the
		* row's collapsed-by-default card body, rendered through the `tool.call.images`
		* slot this entry declares.
		*/
		function ReadImageRow(props) {
			const { block, cwd, home, renderSlot, loadImage } = props;
			return readFamilyRow(props, {
				image: imageCardModel(block, cwd, home),
				renderSlot,
				loadImage
			});
		}
		/**
		* The read_image row as a plain registrant plugin following the atomic Tool-view
		* declaration across independent activation and reload lifetimes. Declaring
		* `tool.call.images` as a child slot authorizes this entry's `renderSlot` to
		* dispatch the gallery.
		*/
		const readImageToolview = {
			name: "read-image-toolview",
			inject: ["slots"],
			/**
			* Register the read_image row into the Tool-owned keyed view slot.
			* @param ctx - registrant context (disposal rides ctx.effect inside slots.register).
			*/
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: "read_image",
					locale: CONVERSATION_NS,
					children: { "tool.call.images": {
						kind: "single",
						scope: "session"
					} }
				}, ReadImageRow));
			}
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/search-row.js
		const SEARCH_TITLE_KEYS = {
			grep: "tool.title.grep",
			glob: "tool.title.glob"
		};
		/** Lets users expand grep or glob results and recover capped searches. */
		function SearchRow({ toolName, block, inspect, t }) {
			const model = toolRowModel(toolName, block);
			const search = searchCardModel(block);
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
				title: t(toolName === "grep" ? SEARCH_TITLE_KEYS.grep : toolName === "glob" ? SEARCH_TITLE_KEYS.glob : model.titleKey),
				summary: model.summary,
				output: model.output,
				errorSummary: model.errorSummary,
				search,
				state: model.state,
				inspect
			});
		}
		/** Registers the grep and glob conversation rows. */
		const searchToolview = {
			name: "search-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", function* () {
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "grep",
						locale: CONVERSATION_NS
					}, SearchRow);
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "glob",
						locale: CONVERSATION_NS
					}, SearchRow);
				});
			}
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/plan-summary.js
		/**
		* Pure plan derivation for the todo_write row's one-line summary. Several items
		* may be `in_progress` at once — parallel work runs concurrent tasks, so a
		* summary built from one active item would silently drop the rest. The plan
		* strip header derives its own counts inline and shares nothing with this, so
		* this stays inside the toolviews domain rather than in `contract/` (the
		* inter-domain face).
		* @module
		*/
		/**
		* Derive the counts and the active summary from a whole-list snapshot. It names
		* the first `in_progress` item and counts the remaining active ones, so a
		* parallel plan reports how many tasks are running rather than naming one and
		* hiding the others. `activeContent` is null when nothing is in progress, or
		* when the first active item's content is missing, mistyped, or blank once
		* trimmed — the tool's own rule for usable content, applied here because a
		* rejected call keeps its args verbatim. The row then renders the counts alone
		* rather than falling back to the generic tool summary: the counts are already
		* known to be good, and the active-item clause is the only part an unusable
		* name costs.
		* @param todos - the whole list, in model order.
		* @returns the done/total counts and the two summary halves.
		*/
		function planSummary(todos) {
			const active = todos.filter((t) => t.status === "in_progress");
			const first = active[0]?.content;
			const named = typeof first === "string" && first.trim() !== "";
			return {
				done: todos.filter((t) => t.status === "completed").length,
				total: todos.length,
				activeContent: named ? first : null,
				activeExtra: named ? active.length - 1 : 0
			};
		}
		//#endregion
		//#region lib/types/client/tool/toolviews/todo-row.js
		function isItem(value) {
			return typeof value === "object" && value !== null;
		}
		function summarize(argsRaw, t) {
			let parsed;
			try {
				parsed = JSON.parse(argsRaw);
			} catch {
				return null;
			}
			if (typeof parsed !== "object" || parsed === null) return null;
			const todos = parsed.todos;
			if (!Array.isArray(todos) || !todos.every(isItem)) return null;
			const { done, total, activeContent, activeExtra } = planSummary(todos);
			const head = t("todo.completed", {
				done,
				total
			});
			return {
				text: activeContent === null ? head : `${head} · ${activeContent}`,
				extra: activeExtra
			};
		}
		/** Summarizes a plan update without presenting a cancelled call as completed. */
		function TodoRow({ toolName, block, inspect, t }) {
			const model = toolRowModel(toolName, block);
			const summary = summarize(("kind" in block ? block.call?.argsRaw : block.argsRaw) ?? "", t) ?? {
				text: model.summary,
				extra: 0
			};
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, {}),
				title: t("todo.rowTitle"),
				summary: summary.text,
				summarySuffix: summary.extra > 0 ? `+${summary.extra}` : null,
				bodyRaw: model.bodyRaw,
				output: model.output,
				errorSummary: model.errorSummary,
				state: model.state,
				inspect
			});
		}
		/** Registers the todo conversation row. */
		const todoToolview = {
			name: "todo-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: "todo_write",
					locale: CONVERSATION_NS
				}, TodoRow));
			}
		};
		//#endregion
		//#region lib/types/client/tool/toolviews/web-row.js
		const WEB_TITLE_KEYS = {
			web_search: "tool.title.webSearch",
			web_fetch: "tool.title.webFetch"
		};
		/** Lets users expand a completed web search or fetch result. */
		function WebRow({ toolName, block, inspect, t }) {
			const model = toolRowModel(toolName, block);
			const web = webCardModel(block);
			const icon = toolName === "web_fetch" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGlobeOutline14, { size: 14 });
			return (0, react_jsx_runtime.jsx)(ToolRow, {
				t,
				variant: model.variant,
				toolName,
				icon,
				title: t(toolName === "web_search" ? WEB_TITLE_KEYS.web_search : toolName === "web_fetch" ? WEB_TITLE_KEYS.web_fetch : model.titleKey),
				summary: model.summary,
				output: model.output,
				errorSummary: model.errorSummary,
				web,
				state: model.state,
				inspect
			});
		}
		/** Registers the web search and fetch conversation rows. */
		const webToolview = {
			name: "web-toolview",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("tool.call.toolview", function* () {
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "web_search",
						locale: CONVERSATION_NS
					}, WebRow);
					yield ctx.slots.register({
						name: "tool.call.toolview",
						key: "web_fetch",
						locale: CONVERSATION_NS
					}, WebRow);
				});
			}
		};
		//#endregion
		//#region lib/types/client/apply.js
		/** Required services: the slot registry and the Remote face carrying the Host home used for POSIX `~`. */
		const inject = ["slots", "remote"];
		/**
		* Mount the whole-Tool renderers and built-in atomic Tool registrations.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			const hostInfo = {
				getSnapshot: () => ctx.remote.$host,
				subscribe: (listener) => ctx.on("connection/reset", listener)
			};
			const toolInject = () => ({ hooks: { hostInfo } });
			ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
				name: "conversation.chat.node",
				key: "tool-call",
				locale: CONVERSATION_NS,
				children: { "tool.call.toolview": {
					kind: "keyed",
					scope: "session"
				} },
				inject: toolInject
			}, ToolCallTree));
			ctx.plugin(bashToolviewSample);
			ctx.plugin(readToolview);
			ctx.plugin(readImageToolview);
			ctx.plugin(fileMutationToolview);
			ctx.plugin(searchToolview);
			ctx.plugin(webToolview);
			ctx.plugin(todoToolview);
			ctx.plugin(askQuestionToolview);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-reference",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../context/file-reference/src/grammar.ts
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
		//#region ../../util/workspace-path/src/index.ts
		/** Whether a path uses a Windows drive or UNC prefix. */
		function isWindowsStylePath(value) {
			return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
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
		//#endregion
		//#region lib/types/client/locales.js
		/** `reference` namespace dictionaries for the unified `@` source. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "reference";
		/**
		* Simplified Chinese dictionary (the key-set source of truth).
		*
		* The `time.*` bucket words are this namespace's own copy of the session-row
		* vocabulary: locale-owned copy keeps the words per plugin, while the
		* bucketing they name is the one shared {@link relativeTime} in ui-primitives.
		*/
		const zh = {
			"section.files": "文件与文件夹",
			"section.sessions": "对话",
			"candidate.noCwd": "（无工作目录）",
			"crumb.root": "工作区",
			"time.now": "刚刚",
			"time.minutes": "{n}分钟",
			"time.hours": "{n}小时",
			"time.days": "{n}天",
			"time.months": "{n}个月",
			"time.years": "{n}年"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"section.files": "Files & folders",
			"section.sessions": "Sessions",
			"candidate.noCwd": "(no cwd)",
			"crumb.root": "Workspace",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services: the trigger registry, the Remote namespaces, and the copy. */
		const inject = [
			"inputTriggers",
			"locale",
			"sessions",
			"remote",
			"remote.fileReferences",
			"remote.sessionReferenceResolver"
		];
		/**
		* Register the combined `@file` / `@session` source.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-reference: dictionaries");
			const t = ctx.locale.bind(NS);
			const sessions = ctx.get("sessions");
			const source = {
				trigger: "@",
				name: "reference",
				showGroupTitle: false,
				async candidates(session, { query, quoted, drilled, signal }) {
					const fileLookup = ctx.remote.fileReferences.list(session.sessionId, query, signal).then((result) => result.ok ? result.value : []);
					const sessionLookup = quoted === true ? Promise.resolve([]) : ctx.remote.sessionReferenceResolver.candidates(session.sessionId, query, signal).then((result) => result.ok ? result.value : []);
					const [fileItems, sessionItems] = await Promise.all([fileLookup, sessionLookup]);
					if (signal.aborted) return [];
					const withLocation = crumbsFor(query, quoted === true, drilled, t) === void 0;
					const now = Date.now();
					const home = ctx.remote.$host.home;
					const listed = sessions.list.getSnapshot().byId;
					return [...fileItems.flatMap((candidate) => fileCandidate(candidate, quoted === true, withLocation, t)), ...sessionItems.map((candidate) => sessionCandidate(candidate, listed[candidate.sessionId]?.updatedAt ?? candidate.createdAt, now, home, t))];
				},
				header(_session, req) {
					return crumbsFor(req.query, req.quoted === true, req.drilled, t);
				},
				onPick({ candidate, action }) {
					const value = parseCandidate(candidate.value);
					if (value?.kind === "file") {
						if (value.fileKind === "directory" && action === "drill") return {
							text: value.mention,
							continue: true
						};
						return { insert: {
							source: "reference",
							ref: value.mention,
							label: value.fileKind === "directory" ? `${value.label}/` : value.label,
							appearance: value.fileKind === "directory" ? "folder" : "file",
							clipboardText: value.mention
						} };
					}
					if (value?.kind === "session") return { insert: {
						source: "reference",
						ref: value.mention,
						label: value.label,
						appearance: "session",
						clipboardText: value.mention
					} };
				},
				codec: {
					clipboardText: (ref) => ref,
					serialize: (ref) => Promise.resolve(ref)
				}
			};
			const inputTriggers = ctx.get("inputTriggers");
			ctx.effect(() => inputTriggers.registerSource(source), "ui-reference: @ source");
		}
		/**
		* The breadcrumb of a drilled directory listing, from the workspace root down
		* to the directory being listed.
		*
		* Only a drill produces one: a path the user typed carries its own context in
		* the draft, while a drill replaced the text they were reading with a deeper
		* one and owes them the way back.
		* @param query - the live query, path text following `@` or `@"`.
		* @param quoted - whether the active token is an open quoted path.
		* @param drilled - whether a drill pick, rather than typing, produced the query.
		* @param t - the reference dictionary.
		* @returns the crumbs, or undefined when this listing needs no header.
		*/
		function crumbsFor(query, quoted, drilled, t) {
			if (!drilled) return void 0;
			const slash = query.lastIndexOf("/");
			if (slash < 0) return void 0;
			const segments = query.slice(0, slash).split("/").filter((segment) => segment !== "");
			const crumbs = [{
				label: t("crumb.root"),
				value: directoryValue(t("crumb.root"), quoted ? "@\"" : "@")
			}];
			for (const [index, segment] of segments.entries()) {
				const mention = formatFileMention({
					path: segments.slice(0, index + 1).join("/"),
					kind: "directory"
				}, quoted);
				if (mention === void 0) return void 0;
				crumbs.push({
					label: segment,
					value: directoryValue(segment, mention),
					...index === segments.length - 1 ? { current: true } : {}
				});
			}
			return crumbs;
		}
		/** Project one directory destination as the drill payload `onPick` already understands. */
		function directoryValue(label, mention) {
			return JSON.stringify({
				kind: "file",
				fileKind: "directory",
				label,
				mention
			});
		}
		function fileCandidate(candidate, preserveQuote, withLocation, t) {
			const mention = formatFileMention(candidate, preserveQuote);
			if (mention === void 0) return [];
			const slash = candidate.path.lastIndexOf("/");
			const name = candidate.path.slice(slash + 1);
			const parent = slash < 0 ? "" : candidate.path.slice(0, slash);
			const directory = candidate.kind === "directory";
			const value = {
				kind: "file",
				fileKind: candidate.kind,
				label: name,
				mention
			};
			return [{
				name: `${name}${directory ? "/" : ""}`,
				...withLocation && parent !== "" ? { description: parent } : {},
				icon: directory ? "folder" : "file",
				section: t("section.files"),
				value: JSON.stringify(value),
				...directory ? { drill: true } : {}
			}];
		}
		function sessionCandidate(candidate, updatedAt, now, home, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, now);
			const age = unit === "now" ? t("time.now") : t(`time.${unit}`, { n });
			const location = candidate.sameWorkspace ? void 0 : candidate.cwd === void 0 ? t("candidate.noCwd") : abbreviateHomePath(candidate.cwd, home);
			const value = {
				kind: "session",
				label: candidate.label,
				mention: candidate.mention
			};
			return {
				name: candidate.label,
				description: location === void 0 ? age : `${location} · ${age}`,
				icon: "session",
				section: t("section.sessions"),
				value: JSON.stringify(value)
			};
		}
		function parseCandidate(value) {
			if (value === void 0) return void 0;
			return JSON.parse(value);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
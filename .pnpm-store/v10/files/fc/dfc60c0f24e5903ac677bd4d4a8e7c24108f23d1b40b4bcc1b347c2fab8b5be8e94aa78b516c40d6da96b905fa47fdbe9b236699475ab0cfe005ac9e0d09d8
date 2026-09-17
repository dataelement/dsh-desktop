window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-deliverables",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/presented.js
		/** Authenticated POST route for opening a workspace file on the Host desktop. */
		const PRESENT_OPEN_PATH = "/api/present.open";
		/** Authenticated desktop availability and destination metadata. */
		const PRESENT_HOST_PATH = "/api/present.host";
		/**
		* Validate desktop metadata received over HTTP.
		* @param value - decoded response.
		* @returns whether all displayed and actionable fields are supported.
		*/
		function isPresentedHost(value) {
			if (typeof value !== "object" || value === null) return false;
			const host = value;
			return typeof host.name === "string" && typeof host.available === "boolean" && (host.fileManager === null || host.fileManager === "finder" || host.fileManager === "explorer" || host.fileManager === "directory");
		}
		/**
		* Validate a file declaration read from a Session log.
		* @param value - decoded durable data.
		* @returns whether the declaration contains a path and optional description.
		*/
		function isPresentedFile(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const { path, description } = value;
			return typeof path === "string" && path.trim().length > 0 && (description === void 0 || typeof description === "string");
		}
		/**
		* Build authenticated coordinates for a declared file.
		* @param sessionId - owning Session.
		* @param seq - deliverables/presented event sequence.
		* @param index - original index in the event's files array.
		* @returns same-origin file action URL.
		*/
		function presentedFileUrl(sessionId, seq, index) {
			return `${PRESENT_OPEN_PATH}?${new URLSearchParams({
				sessionId,
				seq: String(seq),
				index: String(index)
			})}`;
		}
		/**
		* Validate a delivery event before reading its turn or file declarations.
		* @param value - decoded durable event data.
		* @returns whether the event identifies a turn, call, and file list.
		*/
		function isPresentedData(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const { turn, callId, files } = value;
			return typeof turn === "number" && Number.isSafeInteger(turn) && turn >= 1 && typeof callId === "string" && callId.length > 0 && Array.isArray(files);
		}
		/**
		* Trailing path segment, the part that identifies the file at a glance.
		* @param path - Slash- or backslash-separated path.
		* @returns The final segment, or the whole string when separator-free.
		*/
		function basename(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		//#endregion
		//#region lib/types/client/present-open.js
		/** Shared native-open status for delivery cards and closing-message file mentions. */
		/** One browser plugin's file-open requests, cancelled when that plugin is disposed. */
		var PresentedOpenController = class {
			/** File action URLs key the state across Sessions, turns, and both clickable surfaces. */
			state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({});
			/** Native destination metadata, or a retryable read failure. */
			host = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			loading;
			metadata = new AbortController();
			lifetime = new AbortController();
			pending = /* @__PURE__ */ new Set();
			/**
			* Open a declared file once while a request for the same coordinates is pending.
			* Failures remain visible on the card and a later gesture retries them.
			* @param sessionId - viewed Session, including a fork's own identity.
			* @param seq - durable delivery event sequence.
			* @param index - original file index within that event.
			* @param action - default application open or file-manager reveal.
			* @returns after the Host acknowledges opening or the error state is published.
			*/
			async open(sessionId, seq, index, action = "open") {
				const url = presentedFileUrl(sessionId, seq, index);
				const phase = this.state.getSnapshot()[url];
				if (this.lifetime.signal.aborted || phase === "opening" || phase === "revealing") return;
				this.state.update((state) => {
					state[url] = action === "open" ? "opening" : "revealing";
				});
				const task = this.request(url, action);
				this.pending.add(task);
				try {
					await task;
				} finally {
					this.pending.delete(task);
				}
			}
			/**
			* Read the serving desktop metadata, coalescing concurrent reads; a later call retries failure.
			* @returns after metadata or a retryable error is published.
			*/
			async loadHost() {
				if (this.lifetime.signal.aborted) return;
				if (this.loading !== void 0) return this.loading;
				this.host.set(null);
				const task = this.readHost(AbortSignal.any([this.lifetime.signal, this.metadata.signal]));
				this.loading = task;
				this.pending.add(task);
				try {
					await task;
				} finally {
					if (this.loading === task) this.loading = void 0;
					this.pending.delete(task);
				}
			}
			/** Invalidate desktop metadata on connection replacement; mounted cards request the new Host. */
			resetHost() {
				const wasLoading = this.loading !== void 0;
				this.metadata.abort();
				this.metadata = new AbortController();
				this.loading = void 0;
				this.host.set(null);
				if (wasLoading) this.loadHost();
			}
			async readHost(signal) {
				let host = "error";
				try {
					const response = await fetch(PRESENT_HOST_PATH, { signal });
					if (response.ok) {
						const value = await response.json();
						if (isPresentedHost(value)) host = value;
					}
				} catch {
					host = "error";
				}
				if (!signal.aborted) this.host.set(host);
			}
			/** Cancel outstanding requests and wait until no request can publish state. */
			async dispose() {
				this.lifetime.abort();
				await Promise.all(this.pending);
			}
			async request(url, action) {
				const failure = action === "open" ? "error" : "revealError";
				let phase = action === "open" ? "opened" : "revealed";
				try {
					const response = await fetch(action === "open" ? url : `${url}&action=reveal`, {
						method: "POST",
						signal: this.lifetime.signal
					});
					if (!response.ok) phase = response.status === 422 ? "nativeUnavailable" : failure;
				} catch {
					phase = failure;
				}
				if (!this.lifetime.signal.aborted) this.state.update((state) => {
					state[url] = phase;
				});
			}
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-deliverables/src/client/PresentRow.module.css.mjs
		const css$2 = "._93YTAG_summary{min-width:0;color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;margin-left:8px;font-size:12px;display:flex}._93YTAG_summary>:first-child{flex-shrink:0}._93YTAG_paths{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._93YTAG_output{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:8px;margin:8px 0;padding:12px;font-size:12px}._93YTAG_inspect{color:var(--dsw-alias-link);font:inherit;cursor:pointer;background:0 0;border:none;align-self:flex-start;padding:4px 0;font-size:12px}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-deliverables/PresentRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-deliverables";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var PresentRow_module_css_default = {
			"inspect": "_93YTAG_inspect",
			"output": "_93YTAG_output",
			"paths": "_93YTAG_paths",
			"summary": "_93YTAG_summary"
		};
		//#endregion
		//#region lib/types/client/PresentRow.js
		/** Present call status and expandable durable result text. */
		/** Raw arguments can be partial while a call is streaming. */
		function fileNames(raw) {
			let args;
			try {
				args = JSON.parse(raw);
			} catch {
				return raw;
			}
			if (typeof args !== "object" || args === null || !("files" in args) || !Array.isArray(args.files)) return raw;
			return args.files.flatMap((file) => typeof file === "object" && file !== null && "path" in file && typeof file.path === "string" ? [file.path] : []).join(", ");
		}
		/**
		* Render a present call using its recorded arguments and result.
		* @param props - tool call and localized status copy.
		* @returns a status row with a result disclosure.
		*/
		function PresentRow({ block, inspect, t }) {
			const settled = "kind" in block;
			const state = !settled ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const args = (settled ? block.call?.argsRaw : block.argsRaw) ?? "";
			const details = (settled ? block.content.map((item) => item.type === "text" ? item.text : JSON.stringify(item)).join("\n") : "") || (settled && block.error ? `${block.error.name}: ${block.error.code}` : "");
			const [expanded, setExpanded] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsx)("div", {
				"data-tool": "present",
				"data-state": state,
				children: (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					title: t("row.title"),
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: state === "running" ? "ongoing" : state === "ok" ? "done" : state === "stopped" ? "warning" : "error" }),
					open: expanded && details !== "",
					expandable: details !== "",
					expandOnRowClick: true,
					keepContentWhenOpen: true,
					onToggle: () => {
						setExpanded((value) => !value);
					},
					collapsedContent: (0, react_jsx_runtime.jsxs)("span", {
						className: PresentRow_module_css_default.summary,
						children: [(0, react_jsx_runtime.jsx)("span", { children: t(`row.${state}`) }), (0, react_jsx_runtime.jsx)("span", {
							className: PresentRow_module_css_default.paths,
							children: fileNames(args)
						})]
					}),
					children: [(0, react_jsx_runtime.jsx)("pre", {
						className: PresentRow_module_css_default.output,
						children: details
					}), inspect && (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: PresentRow_module_css_default.inspect,
						onClick: inspect,
						children: t("row.inspect")
					})]
				})
			});
		}
		//#endregion
		//#region ../../core/session/lib/types/surface.js
		/** Runtime counterpart of the message-producing event union. */
		const SURFACE_EVENT_TYPES = new Set([
			"system/message",
			"user/message",
			"assistant/message",
			"tool/result"
		]);
		/**
		* Narrow an event to a surface-eligible event carrying its required marker.
		* @param event - event to test.
		* @returns true when both the type and marker identify a surface event.
		*/
		function isSurfaceEvent(event) {
			if (!SURFACE_EVENT_TYPES.has(event.type)) return false;
			return event.surfaceOp !== void 0;
		}
		/**
		* Narrow an event to an append-origin surface event: one that entered the
		* surface at its own log position and was never itself a replacement copy.
		*
		* The model-visible surface deliberately shadows replaced ranges, so it is the
		* wrong source for a human transcript — a landed replacement would erase
		* conversation the user already saw. Append-origin events are that transcript's
		* durable source material; replacement copies stay model-only.
		* @param event - event to test.
		* @returns true when the event appended to the surface tail.
		*/
		function isAppendSurfaceEvent(event) {
			return isSurfaceEvent(event) && event.surfaceOp === "append";
		}
		//#endregion
		//#region lib/types/client/turn-deliverables.js
		/**
		* Turn-scoped produced-file Definition and readers. Client-only and
		* model-free: the vocabulary comes from successful first-party mutation
		* calls, never presentation data or the closing prose.
		*/
		/**
		* Extract the path from a supported first-party mutation call. Session
		* `tool/call` events are root calls; Code Dispatch children do not enter this
		* Definition independently.
		* @param name - wire tool name.
		* @param argsRaw - model-produced JSON arguments.
		* @returns the mutation path, or null when the call is not a supported mutation.
		*/
		function mutationPath(name, argsRaw) {
			let args;
			try {
				args = JSON.parse(argsRaw);
			} catch {
				return null;
			}
			if (!isRecord(args)) return null;
			switch (name) {
				case "write": return typeof args.content === "string" ? pathValue(args.file_path) : null;
				case "edit": return validEditArgs(args) ? pathValue(args.file_path) : null;
				case "str_replace_editor": return editorMutationPath(args);
				default: return null;
			}
		}
		/** Validate the fields that an `edit` execution requires. */
		function validEditArgs(args) {
			return typeof args.old_string === "string" && args.old_string.length > 0 && typeof args.new_string === "string" && args.old_string !== args.new_string && (args.replace_all === void 0 || typeof args.replace_all === "boolean");
		}
		/** Extract a path only from a complete mutating editor command. */
		function editorMutationPath(args) {
			const path = pathValue(args.path);
			if (path === null) return null;
			switch (args.command) {
				case "create": return typeof args.file_text === "string" ? path : null;
				case "str_replace": return typeof args.old_str === "string" && args.old_str.length > 0 && (args.new_str === void 0 || typeof args.new_str === "string") ? path : null;
				case "insert": return typeof args.insert_line === "number" && Number.isInteger(args.insert_line) && args.insert_line >= 0 && typeof args.new_str === "string" ? path : null;
				default: return null;
			}
		}
		/** A non-blank path preserves the exact spelling supplied to the tool. */
		function pathValue(value) {
			return typeof value === "string" && value.trim().length > 0 ? value : null;
		}
		/** Narrow parsed JSON to an argument object. */
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/**
		* Files produced by one Turn data value.
		*
		* The source is the arguments of successful `write`, `edit`, and mutating
		* `str_replace_editor` calls, not the closing prose: a produced file must be
		* listed whether or not the model remembered to name it. Reads, unsupported
		* tools, malformed calls, and failed results contribute nothing. Paths keep
		* first-seen order and appear once, so a file written and then edited in the
		* same turn is one entry.
		*
		* The Conversation Location index owns turn membership before this function
		* runs, so paths cannot spill across turns and this derivation does not infer
		* boundaries from neighboring presentation Nodes.
		* @param data - engine-published Deliverables data for one Turn.
		* @param seq - closing Assistant seq; later Tool settlements are excluded.
		* @returns Produced paths in first-seen order; empty when the turn wrote nothing.
		*/
		function producedForClosing(data, seq = Number.POSITIVE_INFINITY) {
			if (data === void 0) return [];
			const paths = [];
			const seen = /* @__PURE__ */ new Set();
			for (const produced of data.produced) {
				if (produced.seq > seq || seen.has(produced.path)) continue;
				seen.add(produced.path);
				paths.push(produced.path);
			}
			return paths;
		}
		/**
		* Claim the turn-tail chain only when its closing turn produced files.
		* @param owner - Turn-tail owner currency for the closing assistant.
		* @returns Produced paths as the component's match, or null to decline before mount.
		*/
		function selectProducedFiles(owner) {
			const paths = producedForClosing(owner.turn.data.get("deliverables"), owner.seq);
			return paths.length === 0 ? null : paths;
		}
		/** Turn-local successful mutation accumulator; it publishes no view Node. */
		const deliverablesDefinition = {
			kind: "deliverables",
			match: (event) => {
				if (event.type === "turn/start") return {
					id: String(event.data.turn),
					role: "start"
				};
				if (event.type === "tool/call") return {
					id: String(event.data.turn),
					role: "update"
				};
				if (event.type === "deliverables/presented") return isPresentedData(event.data) ? {
					id: String(event.data.turn),
					role: "update"
				} : null;
				if (event.type === "tool/result" && isAppendSurfaceEvent(event)) return {
					id: String(event.data.turn),
					role: "update"
				};
				return null;
			},
			start: (_context, match) => {
				if (match.event.type !== "turn/start") throw new Error("deliverables start requires turn/start");
				return {
					turn: match.event.data.turn,
					calls: /* @__PURE__ */ new Map(),
					produced: []
				};
			},
			update: (context, match) => {
				if (match.event.type === "deliverables/presented") {
					const { files } = match.event.data;
					const seq = match.event.seq;
					const presented = [];
					for (let index = 0; index < files.length; index += 1) {
						const file = files[index];
						if (isPresentedFile(file)) presented.push({
							...file,
							seq,
							index
						});
					}
					if (presented.length === 0) return context.state;
					return {
						...context.state,
						presented: [...context.state.presented ?? [], ...presented]
					};
				}
				if (match.event.type === "tool/call") {
					const calls = new Map(context.state.calls);
					calls.set(String(match.event.data.callId), mutationPath(match.event.data.name, match.event.data.arguments));
					return {
						...context.state,
						calls
					};
				}
				if (match.event.type !== "tool/result") return context.state;
				if (match.event.data.message.content[0].isError === true) return context.state;
				const callId = String(match.event.data.message.source.callId);
				const path = context.state.calls.get(callId);
				return path === null || path === void 0 ? context.state : {
					...context.state,
					produced: [...context.state.produced, {
						seq: match.event.seq,
						path
					}]
				};
			},
			buildLocationData: (context, scope, previous) => {
				if (scope !== "turn" || context.state === void 0) return null;
				if (previous?.kind === "turn" && previous.turn === context.state.turn && previous.key === "deliverables" && previous.value.produced === context.state.produced && previous.value.presented === context.state.presented) return previous;
				return {
					kind: "turn",
					turn: context.state.turn,
					key: "deliverables",
					value: {
						produced: context.state.produced,
						...context.state.presented === void 0 ? {} : { presented: context.state.presented }
					}
				};
			}
		};
		/**
		* Select the latest declaration of each path before the closing reply.
		* @param owner - closing turn and sequence.
		* @returns replayable deliveries in first-seen path order.
		*/
		function presentedForClosing(owner) {
			const files = /* @__PURE__ */ new Map();
			for (const file of owner.turn.data.get("deliverables")?.presented ?? []) if (file.seq < owner.seq) files.set(file.path, file);
			return [...files.values()];
		}
		/**
		* File-mention vocabulary over one turn's produced paths, for the closing
		* message's prose: an inline-code token opens the file it names. A token
		* resolves by exact path, or by being exactly the basename of exactly one
		* produced path — a basename two paths share stays inert rather than
		* guessing, so a mention link can never open the wrong file or 404.
		* @param paths - The turn's produced paths (tool order, already deduped).
		* @param openFile - The chat view's file opener.
		* @param label - Localizes the accessible open-label for a resolved path.
		* @returns The resolver MarkdownText consumes; the full path rides `title`,
		* the same disambiguator the row's chips carry.
		*/
		function producedFileMentions(paths, openFile, label) {
			return { resolve(value) {
				const path = paths.includes(value) ? value : onlyPathWithBasename(paths, value);
				if (path === void 0) return void 0;
				return {
					open: () => {
						openFile(path);
					},
					label: label(path),
					title: path
				};
			} };
		}
		/** The single produced path whose basename is exactly `value`, else undefined. */
		function onlyPathWithBasename(paths, value) {
			const matches = paths.filter((path) => basename(path) === value);
			return matches.length === 1 ? matches[0] : void 0;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-deliverables/src/client/ProducedFiles.module.css.mjs
		const css$1 = ".P4kPIW_root{grid-template-columns:max-content minmax(0,1fr);align-items:start;column-gap:8px;margin-top:4px;font-size:13px;line-height:22px;display:grid}.P4kPIW_label{color:var(--dsw-alias-label-tertiary);grid-area:1/1}.P4kPIW_lane{--produced-file-gap:8px;grid-area:1/2;row-gap:6px;min-width:0;display:grid;container-type:inline-size}.P4kPIW_row{align-items:center;gap:var(--produced-file-gap);flex-wrap:nowrap;min-width:0;display:flex;overflow:hidden}.P4kPIW_file{box-sizing:border-box;min-width:0;color:var(--dsw-alias-link);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;flex:0 auto;align-items:center;gap:5px;margin:0;padding:0;font-weight:500;text-decoration:none;display:inline-flex}.P4kPIW_fileIcon{flex:none;width:1.1em;height:1.1em;position:relative;top:1.2px}.P4kPIW_fileName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.P4kPIW_file:hover,.P4kPIW_file:focus-visible{text-underline-offset:3px;text-decoration:underline dotted}.P4kPIW_file:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-border-l3);outline:none}.P4kPIW_more{white-space:nowrap;color:var(--dsw-alias-label-tertiary);flex:none;display:none}.P4kPIW_more[data-shown=\"6\"]{display:inline}@container (width<=687px){.P4kPIW_file:nth-of-type(6),.P4kPIW_more[data-shown=\"6\"]{display:none}.P4kPIW_more[data-shown=\"5\"]{display:inline}}@container (width<=583px){.P4kPIW_file:nth-of-type(5),.P4kPIW_more[data-shown=\"5\"]{display:none}.P4kPIW_more[data-shown=\"4\"]{display:inline}}@container (width<=479px){.P4kPIW_file:nth-of-type(4),.P4kPIW_more[data-shown=\"4\"]{display:none}.P4kPIW_more[data-shown=\"3\"]{display:inline}}@container (width<=375px){.P4kPIW_file:nth-of-type(3),.P4kPIW_more[data-shown=\"3\"]{display:none}.P4kPIW_more[data-shown=\"2\"]{display:inline}}@container (width<=271px){.P4kPIW_file:nth-of-type(2),.P4kPIW_more[data-shown=\"2\"]{display:none}.P4kPIW_more[data-shown=\"1\"]{display:inline}}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-deliverables/ProducedFiles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-deliverables";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ProducedFiles_module_css_default = {
			"file": "P4kPIW_file",
			"fileIcon": "P4kPIW_fileIcon",
			"fileName": "P4kPIW_fileName",
			"label": "P4kPIW_label",
			"lane": "P4kPIW_lane",
			"more": "P4kPIW_more",
			"root": "P4kPIW_root",
			"row": "P4kPIW_row"
		};
		//#endregion
		//#region lib/types/client/ProducedFiles.js
		/** Maximum number of file chips rendered before the remainder counter. */
		const SHOWN_LIMIT = 6;
		function moreLabel(t, count) {
			return count === 1 ? t("produced.moreOne") : t("produced.more", { count: String(count) });
		}
		/**
		* Render one turn's produced files as openable chips.
		* @param props - selector-matched paths, the chat view's file opener, and the locale seat.
		* @returns The produced-files row.
		*/
		function ProducedFiles({ matched: paths, openFile, t }) {
			const shown = paths.slice(0, SHOWN_LIMIT);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ProducedFiles_module_css_default.root,
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: ProducedFiles_module_css_default.label,
					children: t("produced.label")
				}), (0, react_jsx_runtime.jsx)("div", {
					className: ProducedFiles_module_css_default.lane,
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: ProducedFiles_module_css_default.row,
						"data-produced-files-row": true,
						children: [shown.map((path) => (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ProducedFiles_module_css_default.file,
							title: path,
							"aria-label": t("produced.open", { name: path }),
							onClick: () => {
								openFile(path);
							},
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.LinkIcon, {
								kind: (0, _deepseek_ai_dsh_client_ui_primitives.classifyLinkPath)(path),
								className: ProducedFiles_module_css_default.fileIcon
							}), (0, react_jsx_runtime.jsx)("span", {
								className: ProducedFiles_module_css_default.fileName,
								children: basename(path)
							})]
						}, path)), shown.map((_, index) => {
							const shownCount = index + 1;
							const remainder = paths.length - shownCount;
							if (remainder <= 0) return null;
							return (0, react_jsx_runtime.jsx)("span", {
								className: ProducedFiles_module_css_default.more,
								"data-shown": shownCount,
								children: moreLabel(t, remainder)
							}, shownCount);
						})]
					})
				})]
			});
		}
		//#endregion
		//#region ../../util/workspace-path/lib/index.js
		/**
		* Browser-safe Workspace path and display helpers.
		* @module @deepseek-ai/dsh-util-workspace-path
		*/
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
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-deliverables/src/client/Deliverables.module.css.mjs
		const css = ".nyYjTG_root{--deliverable-fill:var(--dsw-static-neutral-50);--deliverable-hover:var(--dsw-static-neutral-100);flex-direction:column;gap:16px;min-width:0;margin-top:4px;display:flex;container-type:inline-size}.nyYjTG_root[data-after-produced-files=true]{margin-top:0}body[data-ds-dark-theme] .nyYjTG_root{--deliverable-fill:var(--dsw-static-neutral-850);--deliverable-hover:var(--dsw-static-neutral-800)}.nyYjTG_hostStatus{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.nyYjTG_presented{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0;display:grid}.nyYjTG_presented[data-single=true]{grid-template-columns:minmax(0,1fr)}.nyYjTG_file{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l1);background:var(--deliverable-fill);min-width:0;height:60px;color:var(--dsw-alias-label-primary);border-radius:18px;align-items:center;gap:10px;padding:8px 10px;transition:background-color .12s;display:flex;position:relative;overflow:hidden}.nyYjTG_file:hover{background:var(--deliverable-hover)}.nyYjTG_cardPreview{z-index:1;border-radius:inherit;cursor:pointer;background:0 0;border:0;width:100%;padding:0;position:absolute;inset:0}.nyYjTG_cardPreview:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary);outline:none}.nyYjTG_fileIcon{z-index:2;box-sizing:border-box;pointer-events:none;border:.5px solid var(--dsw-alias-border-l1);background:var(--deliverable-fill);width:40px;height:40px;color:var(--dsw-alias-link);border-radius:10px;flex:none;place-items:center;display:grid;position:relative;overflow:hidden}.nyYjTG_fileBody{z-index:2;pointer-events:none;flex:1;justify-content:space-between;align-items:center;gap:12px;min-width:0;display:flex;position:relative}.nyYjTG_details{flex-direction:column;flex:1;justify-content:center;gap:2px;min-width:0;display:flex}.nyYjTG_fileName{text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500;line-height:20px;overflow:hidden}.nyYjTG_description{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:400;line-height:16px;overflow:hidden}.nyYjTG_description[data-error=true]{color:var(--dsw-alias-state-error-primary)}.nyYjTG_previewHint,.nyYjTG_file:hover .nyYjTG_secondaryText{display:none}.nyYjTG_file:hover .nyYjTG_previewHint{display:inline}.nyYjTG_split{box-sizing:border-box;pointer-events:auto;border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-button-floating-fill);border-radius:10px;flex:none;align-items:stretch;height:28px;display:inline-flex;overflow:hidden}.nyYjTG_menuAnchor{align-self:stretch}.nyYjTG_open,.nyYjTG_chevron{color:var(--dsw-alias-label-primary);cursor:pointer;font-family:var(--dsw-font-family);background:0 0;border:0;justify-content:center;align-items:center;display:inline-flex}.nyYjTG_open{padding:4px 8px;font-size:12px;line-height:18px}.nyYjTG_chevron{border-left:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);padding:4px 5px}.nyYjTG_open:hover,.nyYjTG_open:focus-visible,.nyYjTG_chevron:hover:not(:disabled),.nyYjTG_chevron:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.nyYjTG_chevron:disabled{color:var(--dsw-alias-label-dimmed);cursor:not-allowed}.nyYjTG_menuActionIcon{width:16px;height:16px;display:block}.nyYjTG_toggle{min-width:0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;background:0 0;border:0;border-radius:8px;align-self:center;align-items:center;gap:4px;padding:1px 11px;font-size:12px;line-height:18px;display:inline-flex}.nyYjTG_toggle:hover{background:var(--dsw-alias-interactive-bg-hover)}.nyYjTG_toggle svg{flex:none;width:14px;height:14px}@container (width<=620px){.nyYjTG_presented{grid-template-columns:minmax(0,1fr)}}@media (pointer:coarse){.nyYjTG_split{min-height:44px}.nyYjTG_open,.nyYjTG_chevron{min-width:44px}}";
		const tagId = "@deepseek-ai/dsh-client-ui-deliverables/Deliverables.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-deliverables";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var Deliverables_module_css_default = {
			"cardPreview": "nyYjTG_cardPreview",
			"chevron": "nyYjTG_chevron",
			"description": "nyYjTG_description",
			"details": "nyYjTG_details",
			"file": "nyYjTG_file",
			"fileBody": "nyYjTG_fileBody",
			"fileIcon": "nyYjTG_fileIcon",
			"fileName": "nyYjTG_fileName",
			"hostStatus": "nyYjTG_hostStatus",
			"menuActionIcon": "nyYjTG_menuActionIcon",
			"menuAnchor": "nyYjTG_menuAnchor",
			"open": "nyYjTG_open",
			"presented": "nyYjTG_presented",
			"previewHint": "nyYjTG_previewHint",
			"root": "nyYjTG_root",
			"secondaryText": "nyYjTG_secondaryText",
			"split": "nyYjTG_split",
			"toggle": "nyYjTG_toggle"
		};
		//#endregion
		//#region lib/types/client/PresentedFileCard.js
		/** File identity and explicit default-app or file-manager actions for one delivery. */
		function cardDescription(description, fallback) {
			const trimmed = description?.replace(/\s*(?:\([^()]*\)|（[^（）]*）)\s*$/u, "").trim();
			return trimmed === void 0 || trimmed === "" ? fallback : trimmed;
		}
		/**
		* Render independent file actions without nesting buttons inside a clickable card.
		* @param props - durable file metadata, Sidebar preview, Host capabilities, gesture status, and localized copy.
		* @returns the file card and its anchored action menu.
		*/
		function PresentedFileCard({ file, cwd, phase, host, onPreview, onAction, t }) {
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const previewRef = (0, react.useRef)(null);
			const menuDisabled = phase === "opening" || phase === "revealing" || host === null || !host.available;
			if (menuDisabled && menuOpen) setMenuOpen(false);
			const reveal = host?.fileManager ?? "directory";
			const act = (action) => {
				setMenuOpen(false);
				previewRef.current?.focus();
				onAction(action);
			};
			const name = basename(file.path);
			const metadata = (0, _deepseek_ai_dsh_client_ui_primitives.fileExtension)(name).toUpperCase() || t("presented.file");
			const status = phase === void 0 ? cardDescription(file.description, metadata) : t(reveal === "directory" && phase === "revealed" ? "presented.directoryOpened" : reveal === "directory" && phase === "revealing" ? "presented.directoryOpening" : reveal === "directory" && phase === "revealError" ? "presented.directoryError" : `presented.${phase}`);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: Deliverables_module_css_default.file,
				"data-presented-file": true,
				children: [
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: Deliverables_module_css_default.cardPreview,
						title: resolveWorkspacePath(cwd, file.path),
						"aria-label": t("presented.previewCard", { name: file.path }),
						onClick: onPreview
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: Deliverables_module_css_default.fileIcon,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
							path: file.path,
							size: 20
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: Deliverables_module_css_default.fileBody,
						children: [(0, react_jsx_runtime.jsxs)("div", {
							className: Deliverables_module_css_default.details,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: Deliverables_module_css_default.fileName,
								children: name
							}), (0, react_jsx_runtime.jsxs)("span", {
								className: Deliverables_module_css_default.description,
								role: phase === void 0 ? void 0 : "status",
								"data-error": phase === "error" || phase === "revealError" || phase === "nativeUnavailable" ? true : void 0,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: Deliverables_module_css_default.secondaryText,
									children: status
								}), (0, react_jsx_runtime.jsx)("span", {
									className: Deliverables_module_css_default.previewHint,
									children: t("presented.preview")
								})]
							})]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: Deliverables_module_css_default.split,
							children: [(0, react_jsx_runtime.jsx)("button", {
								ref: previewRef,
								type: "button",
								className: Deliverables_module_css_default.open,
								"aria-label": t("presented.previewButton", { name: file.path }),
								onClick: onPreview,
								children: t("presented.action")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								className: Deliverables_module_css_default.menuAnchor,
								open: menuOpen && !menuDisabled,
								autoFocus: true,
								portal: true,
								align: "end",
								onClose: () => {
									setMenuOpen(false);
								},
								anchor: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Deliverables_module_css_default.chevron,
									disabled: menuDisabled,
									"aria-haspopup": "menu",
									"aria-expanded": menuOpen && !menuDisabled,
									"aria-label": t("presented.more", { name: file.path }),
									onClick: () => {
										setMenuOpen((value) => !value);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 11 })
								}),
								items: [{
									id: "open",
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutline16, {
										size: 16,
										className: Deliverables_module_css_default.menuActionIcon
									}),
									label: t("presented.defaultApp")
								}, {
									id: "reveal",
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
									label: t(`presented.${reveal}`)
								}],
								onSelect: (id) => {
									act(id === "reveal" ? "reveal" : "open");
								}
							})]
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/Deliverables.js
		/** Existing changed-file chips and explicitly declared files for a closing turn. */
		const COLLAPSED_PRESENTED_COUNT = 4;
		/**
		* Claim turns containing modified paths or declared files.
		* @param owner - closing turn.
		* @returns matched files, or null for an empty turn.
		*/
		function selectDeliverables(owner) {
			const produced = selectProducedFiles(owner) ?? [];
			const presented = presentedForClosing(owner);
			return produced.length + presented.length === 0 ? null : {
				produced,
				presented
			};
		}
		/**
		* Render workspace file actions and default-application buttons for declared files.
		* @param props - matched files, workspace opener, and localized copy.
		* @returns the closing turn's file rows.
		*/
		function Deliverables({ matched, openFile, t, sessionId, useSessions, openPresented, usePresentedOpen, usePresentedHost, reloadPresentedHost }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const cwd = useSessions((state) => state.byId[sessionId]?.cwd);
			const states = usePresentedOpen((value) => value);
			const host = usePresentedHost((value) => value);
			const collapsible = matched.presented.length > COLLAPSED_PRESENTED_COUNT;
			const presented = collapsible && !expanded ? matched.presented.slice(0, COLLAPSED_PRESENTED_COUNT) : matched.presented;
			(0, react.useEffect)(() => {
				if (matched.presented.length > 0 && host === null) reloadPresentedHost();
			}, [
				matched.presented.length,
				host,
				reloadPresentedHost
			]);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [matched.produced.length > 0 && (0, react_jsx_runtime.jsx)(ProducedFiles, {
				matched: matched.produced,
				openFile,
				t
			}), matched.presented.length > 0 && (0, react_jsx_runtime.jsxs)("div", {
				className: Deliverables_module_css_default.root,
				"data-after-produced-files": matched.produced.length > 0 || void 0,
				children: [
					host === "error" && (0, react_jsx_runtime.jsxs)("div", {
						className: Deliverables_module_css_default.hostStatus,
						children: [(0, react_jsx_runtime.jsx)("span", { children: t("presented.hostError") }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							onClick: () => {
								reloadPresentedHost();
							},
							children: t("presented.retry")
						})]
					}),
					host !== null && host !== "error" && !host.available && (0, react_jsx_runtime.jsx)("span", {
						className: Deliverables_module_css_default.hostStatus,
						children: t("presented.unavailable")
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: Deliverables_module_css_default.presented,
						"data-presented-files-row": true,
						"data-single": matched.presented.length === 1 ? true : void 0,
						children: presented.map((file) => (0, react_jsx_runtime.jsx)(PresentedFileCard, {
							file,
							cwd,
							phase: states[presentedFileUrl(sessionId, file.seq, file.index)],
							host: host === "error" ? null : host,
							t,
							onPreview: () => {
								openFile(file.path);
							},
							onAction: (action) => {
								openPresented(sessionId, file.seq, file.index, action);
							}
						}, `${file.seq}:${file.index}`))
					}),
					collapsible && (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: Deliverables_module_css_default.toggle,
						"aria-expanded": expanded,
						"aria-label": t(expanded ? "presented.collapseAria" : "presented.expandAria", { count: matched.presented.length }),
						onClick: () => {
							setExpanded((value) => !value);
						},
						children: [(0, react_jsx_runtime.jsx)("span", { children: t(expanded ? "presented.collapse" : "presented.all", { count: matched.presented.length }) }), expanded ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})]
					})
				]
			})] });
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `deliverables` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "deliverables";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"presented.nativeUnavailable": "此文件没有可用的主机路径，请在侧边栏预览",
			"presented.revealError": "无法在文件管理器中显示，请重试",
			"presented.directoryError": "无法打开所在文件夹，请重试",
			"presented.directoryOpening": "正在打开所在文件夹…",
			"presented.directoryOpened": "已请求打开所在文件夹",
			"presented.revealed": "已请求在文件管理器中显示",
			"presented.revealing": "正在文件管理器中显示…",
			"presented.unavailable": "此主机没有可用的桌面，无法打开文件或文件夹",
			"presented.retry": "重试",
			"presented.hostError": "无法读取主机桌面信息",
			"presented.directory": "打开所在文件夹",
			"presented.explorer": "在文件资源管理器中显示",
			"presented.finder": "在 Finder 中显示",
			"presented.defaultApp": "用默认应用打开",
			"presented.more": "{name} 的更多文件操作",
			"presented.action": "打开",
			"presented.preview": "在侧边栏预览",
			"presented.previewButton": "在侧边栏打开 {name}",
			"presented.previewCard": "在侧边栏预览 {name}",
			"presented.all": "全部 {count} 个文件",
			"presented.expandAria": "展开全部 {count} 个交付文件",
			"presented.collapse": "收起",
			"presented.collapseAria": "收起交付文件列表",
			"presented.opening": "正在打开…",
			"presented.opened": "已在默认程序中打开",
			"presented.error": "打开失败，点击重试",
			"presented.file": "文件",
			"row.title": "交付文件",
			"row.running": "正在交付",
			"row.ok": "已交付",
			"row.error": "交付失败",
			"row.stopped": "已中断",
			"row.inspect": "查看调用",
			"presented.open": "在默认程序中打开 {name}",
			"produced.label": "本轮文件改动",
			"produced.moreOne": "+ 1 个文件",
			"produced.more": "+ {count} 个文件",
			"produced.open": "打开 {name}"
		};
		/** English dictionary (same key set). */
		const en = {
			"presented.nativeUnavailable": "This file has no available Host path. Preview it in the sidebar.",
			"presented.revealError": "Could not show in file manager. Try again.",
			"presented.directoryError": "Could not open containing folder. Try again.",
			"presented.directoryOpening": "Opening containing folder…",
			"presented.directoryOpened": "Requested opening containing folder",
			"presented.revealed": "Requested display in file manager",
			"presented.revealing": "Showing in file manager…",
			"presented.unavailable": "This Host has no desktop available to open files or folders",
			"presented.retry": "Retry",
			"presented.hostError": "Could not read the Host desktop information",
			"presented.directory": "Open containing folder",
			"presented.explorer": "Show in File Explorer",
			"presented.finder": "Show in Finder",
			"presented.defaultApp": "Open in default app",
			"presented.more": "More file actions for {name}",
			"presented.action": "Open",
			"presented.preview": "Preview in sidebar",
			"presented.previewButton": "Open {name} in sidebar",
			"presented.previewCard": "Preview {name} in sidebar",
			"presented.all": "All {count} files",
			"presented.expandAria": "Show all {count} delivered files",
			"presented.collapse": "Collapse",
			"presented.collapseAria": "Collapse delivered files",
			"presented.opening": "Opening…",
			"presented.opened": "Opened in default app",
			"presented.error": "Could not open. Click to retry.",
			"presented.file": "File",
			"row.title": "Present files",
			"row.running": "Delivering",
			"row.ok": "Delivered",
			"row.error": "Delivery failed",
			"row.stopped": "Interrupted",
			"row.inspect": "Inspect call",
			"presented.open": "Open {name} in default app",
			"produced.label": "Files changed",
			"produced.moreOne": "+ 1 file",
			"produced.more": "+ {count} files",
			"produced.open": "Open {name}"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for the tail-slot registration and its dictionaries. */
		const inject = [
			"slots",
			"locale",
			"uiConversation",
			"remote",
			"remote.session"
		];
		/**
		* Client plugin body: register the dictionaries and the turn-tail entry.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const opener = new PresentedOpenController();
			ctx.effect(() => () => opener.dispose());
			ctx.on("connection/reset", () => {
				opener.resetHost();
			});
			ctx.uiConversation.events.register(deliverablesDefinition);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-deliverables: dictionaries");
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				select: selectDeliverables,
				locale: NS,
				inject: () => ({
					hooks: {
						presentedOpen: opener.state,
						presentedHost: opener.host
					},
					reloadPresentedHost: () => opener.loadHost(),
					openPresented: (sessionId, seq, index, action) => opener.open(sessionId, seq, index, action)
				})
			}, Deliverables));
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "present",
				locale: NS
			}, PresentRow));
			const t = ctx.locale.bind(NS);
			ctx.provide("chatFileMentions", { forClosing(owner, sessionId) {
				const paths = selectProducedFiles(owner);
				const presented = presentedForClosing(owner);
				if (paths === null && presented.length === 0) return void 0;
				const deliveries = new Map(presented.map((file) => [file.path, file]));
				return producedFileMentions([...new Set([...paths ?? [], ...deliveries.keys()])], (path) => {
					const file = deliveries.get(path);
					if (file === void 0) owner.openFile(path);
					else opener.open(sessionId, file.seq, file.index);
				}, (path) => t(deliveries.has(path) ? "presented.open" : "produced.open", { name: path }));
			} });
		}
		//#endregion
		exports.ProducedFiles = ProducedFiles;
		exports.apply = apply;
		exports.inject = inject;
		exports.producedForClosing = producedForClosing;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
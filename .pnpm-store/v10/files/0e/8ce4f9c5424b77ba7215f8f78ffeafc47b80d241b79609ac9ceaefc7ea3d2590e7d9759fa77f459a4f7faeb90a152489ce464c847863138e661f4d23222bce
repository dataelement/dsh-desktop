window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-sidebar-files",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region lib/types/client/definition.js
		/** The tab kind this package owns. */
		const FILES_KIND = "files";
		/** This implementation's identity in the tab system, and the key its body registers under. */
		const FILES_ID = "@deepseek-ai/dsh-client-ui-sidebar-files";
		/** The type's coloured folder sheet at the guide capsule's glyph size, as the chip title draws it. */
		function FolderSheetGlyph({ size, className }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
				kind: "folder",
				size,
				className
			});
		}
		/**
		* The files type's registry definition.
		* @param t - namespace-bound translate, read fresh on every label call.
		* @returns the definition to register.
		*/
		function filesDefinition(t) {
			return {
				id: FILES_ID,
				kind: FILES_KIND,
				priority: "builtin",
				title: () => t("type.label"),
				guide: [{
					order: 10,
					title: () => t("guide.title"),
					description: () => t("guide.description"),
					icon: FolderSheetGlyph
				}]
			};
		}
		//#endregion
		//#region lib/types/client/face.js
		/**
		* Bind the listing to one Remote face, keeping only what the tree stores.
		* @param remote - the Client Remote face carrying the `workspaceFiles` namespace.
		* @returns the listing the tree's face performs.
		*/
		function createList(remote) {
			return async (sessionId, path, signal) => {
				const result = await remote.workspaceFiles.list(sessionId, path, signal);
				if (!result.ok) return result;
				return {
					ok: true,
					value: {
						entries: result.value.entries,
						truncated: result.value.truncated
					}
				};
			};
		}
		/**
		* The absolute path of one child entry.
		*
		* Joined with `/` whatever the parent's separators: the Host resolves mixed
		* separators, and the tree only needs a stable key.
		* @param parent - absolute path of the listed directory.
		* @param name - the entry's basename.
		* @returns the child's absolute path.
		*/
		function childPath(parent, name) {
			return `${parent.replace(/[/\\]+$/, "")}/${name}`;
		}
		/**
		* Bind the tree's face to one directory listing.
		* @param list - the bound `workspaceFiles.list` call.
		* @returns the Slot `inject` factory: session and bound actions in, face out.
		*/
		function filesFace(list) {
			return (sessionId, actions) => {
				/** Per tab, per absolute path: the listing generation a settlement must match; the latest request wins. */
				const generations = /* @__PURE__ */ new Map();
				const nextGeneration = (tabId, path) => {
					const byPath = generations.get(tabId) ?? /* @__PURE__ */ new Map();
					generations.set(tabId, byPath);
					const generation = (byPath.get(path) ?? 0) + 1;
					byPath.set(path, generation);
					return generation;
				};
				const load = (tabId, path, signal) => {
					if (signal.aborted) return;
					const generation = nextGeneration(tabId, path);
					actions.loading(tabId, path);
					list(sessionId, path, signal).then((result) => {
						if (generations.get(tabId)?.get(path) !== generation) return;
						if (result.ok) actions.loaded(tabId, path, result.value);
						else actions.failed(tabId, path, result.error);
					});
				};
				return {
					start(tabId, root, signal) {
						actions.start(tabId, root);
						signal.addEventListener("abort", () => {
							generations.delete(tabId);
							actions.forget(tabId);
						}, { once: true });
						load(tabId, root, signal);
					},
					load,
					toggle(tabId, path, loaded, signal) {
						actions.toggled(tabId, path);
						if (!loaded) load(tabId, path, signal);
					}
				};
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
		//#region ../../util/workspace-path/src/file-address.ts
		/** The scheme and type every file address opens with. */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
		/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
		function encodeSegment(segment) {
			return encodeURIComponent(segment).replace(/%3A/gi, ":");
		}
		/** Encode a `/`-separated path segment by segment. */
		function encodePath(path) {
			return path.split("/").map(encodeSegment).join("/");
		}
		/**
		* Build the address of a file read through one Session.
		* @param sessionId - the Session whose Host workspace resolves the path.
		* @param path - absolute or workspace-relative path; backslashes are normalized to `/`, and leading `./` prefixes are dropped.
		* @returns the `dsh-resource://file/session/<sessionId>/<path>` address.
		*/
		function sessionFileAddress(sessionId, path) {
			const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
			return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
		}
		//#endregion
		//#region ../../util/workspace-path/src/index.ts
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
		* Split a path for display: the directories through their last separator, and
		* the final segment after it. Both `/` and `\` separate, so a Windows path
		* splits where its own segments end; trailing separators are dropped first, so
		* a directory path names its own last segment. A path with no separator, or a
		* separator-only path, is all name.
		* @param path - file or directory path using POSIX or Windows separators.
		* @returns the directory prefix (possibly empty) and the final segment.
		*/
		function pathPartsOf(path) {
			const trimmed = path.replace(/[/\\]+$/, "");
			if (trimmed === "") return {
				directory: "",
				name: path
			};
			const cut = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\")) + 1;
			return {
				directory: trimmed.slice(0, cut),
				name: trimmed.slice(cut)
			};
		}
		/**
		* The address for a path as a caller holds it: a relative path, or an absolute
		* path inside the Session's workspace, becomes a `session`-scoped address; an
		* absolute path outside it, or one whose workspace root is unknown, keeps its
		* absolute path in that Session's address.
		* @param sessionId - the Session the path is read in.
		* @param cwd - that Session's workspace root, when known.
		* @param path - absolute or workspace-relative path, in either separator spelling.
		* @returns the `dsh-resource://file/…` address.
		*/
		function fileAddressFor(sessionId, cwd, path) {
			const normalized = path.replace(/\\/g, "/");
			if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized);
			const root = cwd === void 0 ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "");
			if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
			if (root !== "" && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
			return sessionFileAddress(sessionId, normalized);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-sidebar-files/src/client/FilesBody.module.css.mjs
		const css = ".k-1LKG_root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size-secondary,13px);flex-direction:column;flex:auto;line-height:1.5;display:flex}.k-1LKG_header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:0 6px 0 16px;display:flex}.k-1LKG_path{white-space:nowrap;flex:auto;justify-content:flex-end;min-width:0;margin-right:12px;font-size:12px;display:flex;overflow:hidden}.k-1LKG_path[data-files-path-clipped]{mask-image:linear-gradient(90deg,#0000,#000 28px)}.k-1LKG_pathText{flex:none;margin-right:auto}.k-1LKG_pathDirectory{color:var(--dsw-alias-label-tertiary)}.k-1LKG_pathName{color:var(--dsw-alias-label-primary)}.k-1LKG_body{scrollbar-gutter:stable;flex:auto;min-height:0;margin-right:2px;padding:8px 0 8px 8px;overflow:auto}.k-1LKG_body::-webkit-scrollbar-track{margin:2px}.k-1LKG_level{margin:0;padding:0;list-style:none}.k-1LKG_level .k-1LKG_level{padding-left:18px}.k-1LKG_item{margin:0;padding:0}.k-1LKG_row{width:100%;min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:10px;align-items:center;gap:6px;padding:5px 10px;display:flex}.k-1LKG_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.k-1LKG_icon{color:var(--dsw-alias-label-tertiary);flex:none}.k-1LKG_fileIcon{flex:none}.k-1LKG_name{white-space:nowrap;text-overflow:ellipsis;min-width:0;overflow:hidden}.k-1LKG_other{color:var(--dsw-alias-label-tertiary);cursor:default}.k-1LKG_other:hover{background:0 0}.k-1LKG_note{color:var(--dsw-alias-label-tertiary);margin:0;padding:3px 10px;font-size:12px}.k-1LKG_status{flex-direction:column;padding:12px 10px;display:flex}.k-1LKG_statusLine{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);margin:0;line-height:1.6}.k-1LKG_tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:28px;flex:none;justify-content:center;align-items:center;padding:6px;line-height:1;display:inline-flex}.k-1LKG_tool svg{width:15px;height:15px}.k-1LKG_tool:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.k-1LKG_titleIcon{flex:none}";
		const tagId = "@deepseek-ai/dsh-client-ui-sidebar-files/FilesBody.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-sidebar-files";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var FilesBody_module_css_default = {
			"body": "k-1LKG_body",
			"fileIcon": "k-1LKG_fileIcon",
			"header": "k-1LKG_header",
			"icon": "k-1LKG_icon",
			"item": "k-1LKG_item",
			"level": "k-1LKG_level",
			"name": "k-1LKG_name",
			"note": "k-1LKG_note",
			"other": "k-1LKG_other",
			"path": "k-1LKG_path",
			"pathDirectory": "k-1LKG_pathDirectory",
			"pathName": "k-1LKG_pathName",
			"pathText": "k-1LKG_pathText",
			"root": "k-1LKG_root",
			"row": "k-1LKG_row",
			"status": "k-1LKG_status",
			"statusLine": "k-1LKG_statusLine",
			"titleIcon": "k-1LKG_titleIcon",
			"tool": "k-1LKG_tool"
		};
		//#endregion
		//#region lib/types/client/FilesBody.js
		/**
		* The file tree's body: the session's workspace root, listed one level at a time.
		*
		* Everything the tree keeps lives in its store, keyed by tab; everything it asks
		* for goes through its injected face. The component itself only decides what to
		* draw for each absolute path and what a click means: a directory toggles, a
		* file opens through the owner's `tabActions` for a `file:` viewer to claim, and
		* anything else is shown but refuses to open. The header row is the text
		* preview's: the root's path, directories greyed and the last segment in full
		* ink, then the one control at its end, reload, which drops every listed level
		* and asks again for the expanded ones.
		*/
		/** Natural, case-insensitive name order, so `file2` precedes `file10`. */
		const byName = new Intl.Collator(void 0, {
			numeric: true,
			sensitivity: "base"
		});
		/**
		* Order one level's entries for display: directories first, then everything
		* else, each group by name. The endpoint's order is a listing fact; this is the
		* reader's.
		* @param entries - the listing as the endpoint returned it.
		* @returns a new array, directories first, then by name within each group.
		*/
		function orderEntries(entries) {
			return [...entries].sort((left, right) => {
				const group = Number(right.type === "directory") - Number(left.type === "directory");
				return group !== 0 ? group : byName.compare(left.name, right.name);
			});
		}
		/**
		* Say why a directory could not be listed, in terms of the directory.
		* @param t - namespace-bound translate.
		* @param failure - the settled Remote failure.
		* @returns the line to show under the directory.
		*/
		function failureLine(t, failure) {
			switch (failure.code) {
				case "workspace-file/not-found": return t("error.notFound");
				case "workspace-file/outside-workspace": return t("error.outsideWorkspace");
				case "workspace-file/not-directory": return t("error.notDirectory");
				default: return t("error.unavailable", { message: failure.message });
			}
		}
		/**
		* Keep the path row's `data-files-path-clipped` current: set while the path's
		* text is wider than its box, so the stylesheet fades the clipped start. Read
		* after each commit that can change the path or mount the header, and whenever
		* either box resizes; written to the DOM directly because it changes only how
		* the stylesheet fades what is already rendered.
		*/
		function usePathClipped(box, text, path) {
			(0, react.useLayoutEffect)(() => {
				const outer = box.current;
				const inner = text.current;
				if (outer === null || inner === null) return void 0;
				const apply = () => {
					if (inner.offsetWidth > outer.clientWidth) outer.dataset.filesPathClipped = "";
					else delete outer.dataset.filesPathClipped;
				};
				apply();
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(apply);
				observer?.observe(outer);
				observer?.observe(inner);
				return () => {
					observer?.disconnect();
				};
			}, [
				box,
				text,
				path
			]);
		}
		/** One entry's row, and its children when it is an expanded directory. */
		function Entry({ parent, entry, tree }) {
			const path = childPath(parent, entry.name);
			if (entry.type === "directory") {
				const expanded = tree.state.expanded.includes(path);
				return (0, react_jsx_runtime.jsxs)("li", {
					className: FilesBody_module_css_default.item,
					"data-files-entry": "directory",
					"data-files-path": path,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: FilesBody_module_css_default.row,
						"aria-expanded": expanded,
						onClick: () => {
							tree.onToggle(path);
						},
						children: [expanded ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { className: FilesBody_module_css_default.icon }) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { className: FilesBody_module_css_default.icon }), (0, react_jsx_runtime.jsx)("span", {
							className: FilesBody_module_css_default.name,
							children: entry.name
						})]
					}), expanded && (0, react_jsx_runtime.jsx)("ul", {
						className: FilesBody_module_css_default.level,
						children: (0, react_jsx_runtime.jsx)(Level, {
							path,
							tree
						})
					})]
				});
			}
			if (entry.type === "file") return (0, react_jsx_runtime.jsx)("li", {
				className: FilesBody_module_css_default.item,
				"data-files-entry": "file",
				"data-files-path": path,
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: FilesBody_module_css_default.row,
					onClick: () => {
						tree.onOpen(path);
					},
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
						kind: (0, _deepseek_ai_dsh_client_ui_primitives.classifyFileType)(entry.name),
						size: 16,
						className: FilesBody_module_css_default.fileIcon
					}), (0, react_jsx_runtime.jsx)("span", {
						className: FilesBody_module_css_default.name,
						children: entry.name
					})]
				})
			});
			return (0, react_jsx_runtime.jsx)("li", {
				className: FilesBody_module_css_default.item,
				"data-files-entry": "other",
				"data-files-path": path,
				children: (0, react_jsx_runtime.jsx)("span", {
					className: clsx(FilesBody_module_css_default.row, FilesBody_module_css_default.other),
					"aria-disabled": "true",
					title: tree.t("entry.other"),
					children: (0, react_jsx_runtime.jsx)("span", {
						className: FilesBody_module_css_default.name,
						children: entry.name
					})
				})
			});
		}
		/** One directory's rows: its state while listing, its entries once listed. */
		function Level({ path, tree }) {
			const { state, t } = tree;
			const level = state.levels[path];
			if (level === void 0 || level.kind === "loading") return (0, react_jsx_runtime.jsx)("li", {
				className: FilesBody_module_css_default.note,
				"data-files-row": "loading",
				children: t("loading")
			});
			if (level.kind === "failed") return (0, react_jsx_runtime.jsx)("li", {
				className: FilesBody_module_css_default.note,
				"data-files-row": "failed",
				"data-files-code": level.failure.code,
				children: failureLine(t, level.failure)
			});
			const entries = orderEntries(level.level.entries);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				entries.length === 0 && (0, react_jsx_runtime.jsx)("li", {
					className: FilesBody_module_css_default.note,
					"data-files-row": "empty",
					children: t("empty")
				}),
				entries.map((entry) => (0, react_jsx_runtime.jsx)(Entry, {
					parent: path,
					entry,
					tree
				}, entry.name)),
				level.level.truncated && (0, react_jsx_runtime.jsx)("li", {
					className: FilesBody_module_css_default.note,
					"data-files-row": "truncated",
					children: t("truncated")
				})
			] });
		}
		/** The file tree's body: the workspace root and whatever the reader has opened under it. */
		function FilesBody({ useTabInfo, sessionId, useSessions, useStore, actions, start, load, toggle, t }) {
			const { tab } = useTabInfo();
			const { signal, actions: tabActions } = tab;
			const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd);
			const state = useStore((store) => store.byTab[tab.id]);
			const pathRef = (0, react.useRef)(null);
			const pathTextRef = (0, react.useRef)(null);
			usePathClipped(pathRef, pathTextRef, state?.root);
			(0, react.useEffect)(() => {
				if (state !== void 0 || cwd === void 0 || signal.aborted) return;
				start(tab.id, cwd, signal);
			}, [
				state,
				cwd,
				tab.id,
				signal,
				start
			]);
			if (cwd === void 0) return (0, react_jsx_runtime.jsx)("div", {
				className: FilesBody_module_css_default.status,
				"data-files-state": "no-workspace",
				children: (0, react_jsx_runtime.jsx)("p", {
					className: FilesBody_module_css_default.statusLine,
					children: t("noWorkspace")
				})
			});
			if (state === void 0) return null;
			const tree = {
				state,
				onToggle: (path) => {
					toggle(tab.id, path, state.levels[path] !== void 0, signal);
				},
				onOpen: (path) => {
					tabActions.openResource(fileAddressFor(sessionId, state.root, path));
				},
				t
			};
			const reload = () => {
				actions.reset(tab.id);
				for (const path of state.expanded) load(tab.id, path, signal);
			};
			const { directory, name } = pathPartsOf(state.root);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: FilesBody_module_css_default.root,
				"data-files-state": "tree",
				"data-files-root": state.root,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: FilesBody_module_css_default.header,
					children: [(0, react_jsx_runtime.jsx)("div", {
						ref: pathRef,
						className: FilesBody_module_css_default.path,
						title: state.root,
						"data-files-path": true,
						children: (0, react_jsx_runtime.jsxs)("span", {
							ref: pathTextRef,
							className: FilesBody_module_css_default.pathText,
							children: [directory !== "" && (0, react_jsx_runtime.jsx)("span", {
								className: FilesBody_module_css_default.pathDirectory,
								children: directory
							}), (0, react_jsx_runtime.jsx)("span", {
								className: FilesBody_module_css_default.pathName,
								children: name
							})]
						})
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: FilesBody_module_css_default.tool,
						"aria-label": t("reload"),
						title: t("reload"),
						"data-files-reload": true,
						onClick: reload,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {})
					})]
				}), (0, react_jsx_runtime.jsx)("div", {
					className: FilesBody_module_css_default.body,
					children: (0, react_jsx_runtime.jsx)("ul", {
						className: FilesBody_module_css_default.level,
						children: (0, react_jsx_runtime.jsx)(Level, {
							path: state.root,
							tree
						})
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/FilesTitle.js
		/**
		* The title as the chip and a floating panel's header show it.
		* @param props - the tab information hook.
		* @returns the folder sheet followed by the tab's title text.
		*/
		function FilesTitle({ useTabInfo }) {
			const { tab } = useTabInfo();
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
				kind: "folder",
				size: 16,
				className: FilesBody_module_css_default.titleIcon
			}), tab.title] });
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Simplified Chinese dictionary and key-set source of truth. */
		const zh = {
			"type.label": "文件",
			"guide.title": "工作区文件",
			"guide.description": "浏览会话工作区的文件",
			loading: "正在读取…",
			empty: "空目录",
			truncated: "条目太多，只显示了一部分。",
			noWorkspace: "这个会话没有工作区目录。",
			reload: "重新读取",
			"entry.other": "这不是文件或目录，没法打开。",
			"error.notFound": "这个目录不在了。可能已被移动或删除。",
			"error.outsideWorkspace": "这个目录在工作区之外，侧栏不会读取它。",
			"error.notDirectory": "这不是一个目录。",
			"error.unavailable": "读取失败：{message}"
		};
		/** English dictionary, checked against the Chinese key set. */
		const en = {
			"type.label": "Files",
			"guide.title": "Workspace files",
			"guide.description": "Browse files in this session's workspace",
			loading: "Reading…",
			empty: "Empty directory",
			truncated: "Too many entries, showing only some of them.",
			noWorkspace: "This session has no workspace directory.",
			reload: "Reload",
			"entry.other": "Not a file or a directory, so it cannot be opened.",
			"error.notFound": "That directory is gone. It may have been moved or deleted.",
			"error.outsideWorkspace": "That directory is outside the workspace, so the sidebar will not read it.",
			"error.notDirectory": "That is not a directory.",
			"error.unavailable": "Read failed: {message}"
		};
		//#endregion
		//#region lib/types/client/store.js
		/**
		* The file tree's view state: which directories are expanded, and what each
		* loaded level contains.
		*
		* The tree is not one resource. A directory listing per level, expanded lazily,
		* is state the type owns — so it lives in a Slot-standard exclusive store
		* (one instance per session), bucketed by tab id because two tabs of this kind
		* in one session expand independently.
		*
		* Writers run between `start` and `forget`: the owner's `signal` is what ends a
		* bucket's life, and the face stops dispatching once it aborts.
		*/
		/**
		* One tab's bucket, which every writer after `start` relies on: the face only
		* dispatches while the record's signal is live, and `forget` runs on its abort.
		* @param state - the draft.
		* @param tabId - the tab being written.
		* @returns the tab's tree.
		*/
		function bucket(state, tabId) {
			const tree = state.byTab[tabId];
			if (tree === void 0) throw new Error(`ui-sidebar-files: no tree for tab "${tabId}"`);
			return tree;
		}
		/**
		* Declare the file tree's store.
		*
		* A factory rather than a shared handle: the registration declares it as an
		* exclusive store, so the framework mints one instance per session.
		* @returns the store handle to declare on the registration.
		*/
		function createFilesStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({ byTab: {} }),
				actions: {
					/**
					* Seed one tab's tree at its workspace root, with the root expanded.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					* @param root - absolute path of the workspace root.
					*/
					start: (d, tabId, root) => {
						d.byTab[tabId] = {
							root,
							levels: {},
							expanded: [root]
						};
					},
					/**
					* Mark one directory as being listed.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					* @param path - absolute directory path.
					*/
					loading: (d, tabId, path) => {
						bucket(d, tabId).levels[path] = { kind: "loading" };
					},
					/**
					* Record one directory's contents.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					* @param path - absolute directory path.
					* @param level - the listing to show under it.
					*/
					loaded: (d, tabId, path, level) => {
						bucket(d, tabId).levels[path] = {
							kind: "ready",
							level
						};
					},
					/**
					* Record why one directory could not be listed.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					* @param path - absolute directory path.
					* @param failure - the settled Remote failure.
					*/
					failed: (d, tabId, path, failure) => {
						bucket(d, tabId).levels[path] = {
							kind: "failed",
							failure
						};
					},
					/**
					* Open a collapsed directory, or collapse an open one.
					*
					* A collapsed level keeps what it loaded, so reopening it draws at once.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					* @param path - absolute directory path.
					*/
					toggled: (d, tabId, path) => {
						const state = bucket(d, tabId);
						const at = state.expanded.indexOf(path);
						if (at >= 0) state.expanded.splice(at, 1);
						else state.expanded.push(path);
					},
					/**
					* Drop every loaded level, keeping what is expanded.
					*
					* This is the reload gesture's first half: the expanded set says which
					* levels to fetch again.
					* @param d - draft state.
					* @param tabId - the tab being drawn.
					*/
					reset: (d, tabId) => {
						bucket(d, tabId).levels = {};
					},
					/**
					* Forget one tab's tree, for a tab record that is gone.
					* @param d - draft state.
					* @param tabId - the tab that went away.
					*/
					forget: (d, tabId) => {
						d.byTab = Object.fromEntries(Object.entries(d.byTab).filter(([id]) => id !== tabId));
					}
				}
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/** This package's copy namespace. */
		const NS = "sidebarFiles";
		/**
		* Required browser services: the tab registry, the keyed seat, the Remote
		* carrier and its namespace, and copy.
		*/
		const inject = [
			"slots",
			"locale",
			"sidebarRightTabs",
			"remote",
			"remote.workspaceFiles"
		];
		/**
		* Client plugin body: register the type, its dictionaries, its body, and its chip title.
		* @param ctx - client root context carrying the registry, the slots, and the Remote face.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.sidebarRightTabs.register(filesDefinition(t)), "ui-sidebar-files: files type");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-sidebar-files: dictionaries");
			const store = createFilesStore();
			const inject = filesFace(createList(ctx.remote));
			ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
				name: "sidebar.right.pane.tab",
				key: FILES_ID,
				locale: NS,
				store,
				inject
			}, FilesBody)), "ui-sidebar-files: files tab body");
			ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
				name: "sidebar.right.pane.tab.title",
				key: FILES_ID
			}, FilesTitle)), "ui-sidebar-files: files tab title");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-directory-picker-browse",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
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
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-directory-picker-browse/src/client/DirectoryBrowser.module.css.mjs
		const css = ".ZuhsRW_dialog.ZuhsRW_dialog{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);gap:0;width:min(680px,100%);height:min(500px,100dvh - 32px);padding:0}.ZuhsRW_editorScope{display:contents}.ZuhsRW_header{border-bottom:.5px solid var(--dsw-alias-border-l3);flex-direction:column;flex:none;gap:8px;padding:16px 14px 8px 24px;display:flex}.ZuhsRW_title{min-height:28px;color:var(--dsw-alias-label-primary);align-items:flex-end;margin:0;font-size:16px;font-weight:510;line-height:24px;display:flex}.ZuhsRW_crumbBar{box-sizing:border-box;border:1px solid #0000;border-radius:8px;align-items:center;gap:4px;min-height:24px;margin-left:-9px;padding:0 8px;display:flex}.ZuhsRW_crumbBar:has(.ZuhsRW_crumbEditZone:enabled:hover),.ZuhsRW_crumbBar:has(.ZuhsRW_crumbEditZone:focus-visible),.ZuhsRW_crumbBar:has(.ZuhsRW_pathInput){border-color:var(--dsw-alias-border-l2)}.ZuhsRW_millerRow{scrollbar-width:none;flex:1 1 0;align-items:stretch;gap:12px;min-height:0;display:flex;overflow-x:auto}.ZuhsRW_crumbTrail{scrollbar-width:none;flex:0 auto;align-items:center;gap:4px;min-width:0;display:flex;overflow-x:auto}.ZuhsRW_crumbSeat{flex:none;align-items:center;gap:4px;min-width:0;display:inline-flex}.ZuhsRW_crumb{text-overflow:ellipsis;white-space:nowrap;max-width:160px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0;font-size:13px;font-weight:500;line-height:20px;overflow:hidden}.ZuhsRW_crumb:hover{color:var(--dsw-alias-label-primary)}.ZuhsRW_crumbChevron{color:var(--dsw-alias-label-tertiary);flex:none}.ZuhsRW_crumbEditZone{cursor:text;background:0 0;border:none;outline:none;flex:1 0 34px;justify-content:flex-end;align-items:center;min-width:34px;height:22px;padding:0;display:flex}.ZuhsRW_crumbEditGlyph{color:var(--dsw-alias-label-tertiary);flex:none}.ZuhsRW_crumbEditZone:enabled:hover .ZuhsRW_crumbEditGlyph,.ZuhsRW_crumbEditZone:focus-visible .ZuhsRW_crumbEditGlyph{color:var(--dsw-alias-label-primary)}.ZuhsRW_crumbEditZone:disabled{cursor:default}.ZuhsRW_crumbEditZone:disabled .ZuhsRW_crumbEditGlyph{color:var(--dsw-alias-label-caption)}.ZuhsRW_pathInput{box-sizing:border-box;min-width:0;height:22px;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1 1 0;padding:0;font-size:13px;line-height:20px}.ZuhsRW_content{flex-direction:column;flex:1 1 0;min-height:0;padding:16px 16px 16px 24px;display:flex;position:relative}.ZuhsRW_column{flex-direction:column;flex:1 1 0;gap:2px;min-width:256px;padding-right:8px;display:flex;overflow-y:auto}.ZuhsRW_divider{background:var(--dsw-alias-border-l3);flex:none;width:.5px}.ZuhsRW_rowSeat{flex:none;display:flex}.ZuhsRW_row{text-align:left;cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;align-items:center;gap:4px;width:100%;height:28px;padding:4px;display:flex}.ZuhsRW_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.ZuhsRW_rowSelected,.ZuhsRW_rowSelected:hover{background:var(--dsw-alias-interactive-bg-active,var(--dsw-alias-interactive-bg-hover))}.ZuhsRW_rowIcon{color:var(--dsw-alias-label-secondary);flex:none}.ZuhsRW_rowIconSelected{color:var(--dsw-alias-button-info-fill);flex:none}.ZuhsRW_rowName{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary);flex:1 1 0;font-size:13px;font-weight:500;line-height:20px;overflow:hidden}.ZuhsRW_rowChevron{color:var(--dsw-alias-label-tertiary);flex:none}.ZuhsRW_status,.ZuhsRW_error{padding:4px 120px 4px 4px;font-size:12px;line-height:18px}.ZuhsRW_status{color:var(--dsw-alias-label-secondary)}.ZuhsRW_error{color:var(--dsw-alias-state-error-primary)}.ZuhsRW_loadingFloat{background:var(--dsw-alias-bg-layer-2);padding:2px 8px;position:absolute;bottom:8px;right:16px}.ZuhsRW_footerBar{border-top:.5px solid var(--dsw-alias-border-l3);flex-wrap:wrap;flex:none;align-items:center;gap:8px;padding:16px 24px;display:flex}.ZuhsRW_showHiddenToggle{color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;background:0 0;border:none;align-items:center;gap:4px;padding:0;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.ZuhsRW_showHiddenToggle:hover{color:var(--dsw-alias-label-primary)}.ZuhsRW_showHiddenToggle:disabled{color:var(--dsw-alias-label-caption);cursor:default}.ZuhsRW_showHiddenToggleActive{color:var(--dsw-alias-label-primary)}.ZuhsRW_footerGap{flex:1 1 0}.ZuhsRW_footerAction{min-width:72px}.ZuhsRW_createDialog.ZuhsRW_createDialog{gap:0;width:min(380px,100%);padding:0}.ZuhsRW_createBody{flex-direction:column;gap:12px;padding:22px 24px 20px;display:flex}.ZuhsRW_createTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:510;line-height:24px}.ZuhsRW_createIn{color:var(--dsw-alias-label-primary);margin:0;font-size:14px;line-height:22px}.ZuhsRW_createInput{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);width:100%;height:44px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:22px;outline:none;padding:7px 14px;font-size:14px;line-height:22px}.ZuhsRW_createInput::placeholder{color:var(--dsw-alias-label-caption)}.ZuhsRW_createActions{justify-content:flex-end;align-items:center;gap:8px;margin-top:8px;display:flex}";
		const tagId = "@deepseek-ai/dsh-client-ui-directory-picker-browse/DirectoryBrowser.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-directory-picker-browse";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var DirectoryBrowser_module_css_default = {
			"column": "ZuhsRW_column",
			"content": "ZuhsRW_content",
			"createActions": "ZuhsRW_createActions",
			"createBody": "ZuhsRW_createBody",
			"createDialog": "ZuhsRW_createDialog",
			"createIn": "ZuhsRW_createIn",
			"createInput": "ZuhsRW_createInput",
			"createTitle": "ZuhsRW_createTitle",
			"crumb": "ZuhsRW_crumb",
			"crumbBar": "ZuhsRW_crumbBar",
			"crumbChevron": "ZuhsRW_crumbChevron",
			"crumbEditGlyph": "ZuhsRW_crumbEditGlyph",
			"crumbEditZone": "ZuhsRW_crumbEditZone",
			"crumbSeat": "ZuhsRW_crumbSeat",
			"crumbTrail": "ZuhsRW_crumbTrail",
			"dialog": "ZuhsRW_dialog",
			"divider": "ZuhsRW_divider",
			"editorScope": "ZuhsRW_editorScope",
			"error": "ZuhsRW_error",
			"footerAction": "ZuhsRW_footerAction",
			"footerBar": "ZuhsRW_footerBar",
			"footerGap": "ZuhsRW_footerGap",
			"header": "ZuhsRW_header",
			"loadingFloat": "ZuhsRW_loadingFloat",
			"millerRow": "ZuhsRW_millerRow",
			"pathInput": "ZuhsRW_pathInput",
			"row": "ZuhsRW_row",
			"rowChevron": "ZuhsRW_rowChevron",
			"rowIcon": "ZuhsRW_rowIcon",
			"rowIconSelected": "ZuhsRW_rowIconSelected",
			"rowName": "ZuhsRW_rowName",
			"rowSeat": "ZuhsRW_rowSeat",
			"rowSelected": "ZuhsRW_rowSelected",
			"showHiddenToggle": "ZuhsRW_showHiddenToggle",
			"showHiddenToggleActive": "ZuhsRW_showHiddenToggleActive",
			"status": "ZuhsRW_status",
			"title": "ZuhsRW_title"
		};
		//#endregion
		//#region lib/types/client/DirectoryBrowser.js
		/**
		* The in-app workspace-directory browser (figma Harness 813-23126 family): a
		* 680×500 dialog (clamped to short/narrow viewports — the Miller row scrolls
		* sideways, the columns scroll down) whose header carries the title, the selection-path
		* breadcrumb, and a click-to-edit path zone; below it a Miller view — one
		* full-width level until a row is selected, then two columns splitting the
		* row evenly (256px floor; level | selected folder's children) around a
		* hairline divider. Navigations land selection-anchored and quiet: the
		* previous view keeps rendering while a crumb jump or a submitted path is
		* scanned, then target and parent legs land as one two-pane frame (a slow
		* parent leg falls back to landing the target alone and upgrading in
		* place), so stepping back keeps two panes away from the display root and
		* navigation never flashes an intermediate frame. Selecting in the
		* right column shifts the view one level deeper. "New folder" opens a nested
		* create dialog targeting the selected folder (or the level itself) and
		* selects the created folder. Open adopts the selected folder, falling back
		* to the listed level. Pure consumer of the injected browse calls — the
		* owning flow decides what "Open" means and owns the workspace-creation
		* error surface. Hidden entries are host-flagged and hidden by default; the
		* footer's fixed-label "Show hidden files" toggle (aria-pressed, check when
		* on) reveals them (client-side only). The path editor announces itself with
		* a pencil glyph and a bar-wide hover-lit outline, opens seeded with a
		* trailing separator, and keeps the panes under the draft: the final segment
		* prefix-filters the LAST pane while that pane's level is the one the draft's
		* directory part names (a dot-led prefix also reveals the hidden entries it
		* names, and a prefix nobody matches releases the filter), while any other
		* directory part is scanned after a short debounce and lands like any other
		* navigation — selection-anchored and two-pane away from the display root,
		* both legs waited out so one keystroke moves the view once. The pane arity
		* holds throughout: the last pane is the level the path names and the one
		* beside it is its parent, so typing deeper descends and erasing segments
		* walks back up, moving the Miller view without leaving the editor. Panes the
		* draft walked to stay put when the editor closes (cancellation included):
		* the crumbs name where the walk ended, and Open's fallback target follows
		* them.
		*/
		/** Failure text from the injected directory operation. */
		function failureText(error) {
			if (error !== null && typeof error === "object" && "rpcError" in error) {
				const rpcError = error.rpcError;
				if (rpcError !== null && typeof rpcError === "object" && "message" in rpcError && typeof rpcError.message === "string") return rpcError.message;
			}
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* How long a scan may stay visually silent before the floating "Loading…"
		* pill appears. The stale view keeps rendering while a scan is in flight, so
		* a listing that settles inside this window swaps the panes with no
		* intermediate frame at all; only a genuinely slow host (a network mount, a
		* cold disk) surfaces the indicator.
		*/
		const SLOW_SCAN_DELAY_MS = 300;
		/**
		* How long a navigation landing waits for its parent leg before committing
		* the target alone. Inside the window both legs land as ONE two-pane frame —
		* no single-pane flash between them; past it the target commits single-pane
		* at once (an Enter-submitted navigation is never held hostage by a stalled
		* parent) and the late parent leg upgrades the landing in place.
		*/
		const PARENT_LEG_WAIT_MS = 200;
		/**
		* How long a typed draft rests before the panes follow it to a directory no
		* pane lists. The window absorbs the keystrokes that walk through
		* intermediate directory parts (every character of `/usr/lo` past the
		* separator would otherwise be its own scan) while staying short enough that
		* a pause reads as "the list moved with me".
		*/
		const DRAFT_PREVIEW_DEBOUNCE_MS = 250;
		/**
		* Breadcrumb rows for display: inside the home subtree the chain starts at a
		* localized Home crumb; outside it the full ancestry shows, the root labeled
		* by its own path.
		*/
		function displayCrumbs(listing, homeLabel) {
			const homeIndex = listing.crumbs.findIndex((crumb) => crumb.path === listing.home);
			if (homeIndex === -1) return listing.crumbs;
			const tail = listing.crumbs.slice(homeIndex + 1);
			return [{
				name: homeLabel,
				path: listing.home,
				hidden: false
			}, ...tail];
		}
		/**
		* The listing's platform separator, inferred from the home path the host
		* stamped — never from typed text or entry paths, where a backslash is a
		* legal POSIX name character. Still a heuristic at the last step: a POSIX
		* home directory whose own name contains a backslash would misread.
		* TODO: replace with a host-stamped `separator` field on the wire
		* DirectoryListing so the platform fact travels verbatim (the trade-off is
		* recorded in the directory-picker capability seam Agent Note).
		*/
		function separatorOf(listing) {
			return listing.home.includes("\\") ? "\\" : "/";
		}
		/** The listed level as a directory part: its own path, separator-terminated (the root already is). */
		function levelDirectory(listing) {
			const sep = separatorOf(listing);
			return listing.path.endsWith(sep) ? listing.path : `${listing.path}${sep}`;
		}
		/**
		* The draft's directory part — everything through its last separator — or
		* null while no separator has been typed at all (nothing addresses a
		* directory yet). The platform comes from `listing`: on Windows a forward
		* slash separates too (the host's `resolve` accepts either), while on POSIX a
		* backslash is a legal name character and never separates.
		*/
		function draftDirectory(listing, draft) {
			const cut = separatorOf(listing) === "\\" ? Math.max(draft.lastIndexOf("\\"), draft.lastIndexOf("/")) : draft.lastIndexOf("/");
			return cut === -1 ? null : draft.slice(0, cut + 1);
		}
		/**
		* How the draft reads against one level: the directory part it names, and —
		* when `listing` is the level that directory part addresses — the final
		* segment that prefix-filters it while the user types (case-insensitively,
		* downstream). A level answers a directory part when its own path is that
		* part, or when it is the level that very text just produced (`scanned`): the
		* host resolves what it is given, so `..` segments and Windows forward
		* slashes reach a level whose path spells the request differently.
		* @param listing - the level to read the draft against.
		* @param draft - the current path draft.
		* @param scanned - the last draft-following scan's directory and landing.
		* @returns the draft's directory part (null with no separator typed) and its
		* filtering tail (null when this level does not answer that directory).
		*/
		function readDraft(listing, draft, scanned) {
			const directory = draftDirectory(listing, draft);
			if (directory === null) return {
				directory: null,
				tail: null
			};
			return {
				directory,
				tail: directory === levelDirectory(listing) || scanned !== null && scanned.directory === directory && scanned.landed === listing.path ? draft.slice(directory.length) : null
			};
		}
		/**
		* The rows one column renders. The selection is exempt from every filter: it
		* anchors the two-pane view (crumbs and the child pane point at it), so
		* neither the hidden filter after a dot-reveal pick nor a prefix miss may
		* orphan it. A prefix narrows the level only while some row it would actually
		* show matches — a tail nobody matches is a name being spelled, not a demand
		* for an empty pane, so the level shows whole and its hidden rows return to
		* obeying the toggle. Counting only displayable rows keeps that true because
		* every hidden name is dot-prefixed, and a matching prefix therefore reveals
		* it; otherwise the level could narrow to nothing.
		*/
		function visibleEntries(entries, selectedPath, showHidden, filterPrefix) {
			const needle = filterPrefix === null ? "" : filterPrefix.toLowerCase();
			const displayable = (entry) => showHidden || !entry.hidden || needle.startsWith(".");
			const matches = (entry) => displayable(entry) && entry.name.toLowerCase().startsWith(needle);
			const narrowing = needle !== "" && entries.some(matches);
			return entries.filter((entry) => {
				if (entry.path === selectedPath) return true;
				if (narrowing) return matches(entry);
				return showHidden || !entry.hidden;
			});
		}
		/** One column of folder rows (the Miller view renders one or two of these). */
		function LevelColumn({ entries, selectedPath, busy, onPick, showHidden, filterPrefix, pathEditing }) {
			const visible = visibleEntries(entries, selectedPath, showHidden, filterPrefix);
			return (0, react_jsx_runtime.jsx)("div", {
				className: DirectoryBrowser_module_css_default.column,
				role: "list",
				children: visible.map((entry) => {
					const selected = entry.path === selectedPath;
					return (0, react_jsx_runtime.jsx)("span", {
						role: "listitem",
						className: DirectoryBrowser_module_css_default.rowSeat,
						children: (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-current": selected || void 0,
							className: clsx(DirectoryBrowser_module_css_default.row, selected && DirectoryBrowser_module_css_default.rowSelected),
							disabled: busy,
							onMouseDown: pathEditing ? (event) => {
								event.preventDefault();
							} : void 0,
							onClick: () => {
								onPick(entry);
							},
							children: [
								selected ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {
									size: 16,
									className: DirectoryBrowser_module_css_default.rowIconSelected
								}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, {
									size: 16,
									className: DirectoryBrowser_module_css_default.rowIcon
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: DirectoryBrowser_module_css_default.rowName,
									children: entry.name
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {
									size: 12,
									className: DirectoryBrowser_module_css_default.rowChevron
								})
							]
						})
					}, entry.path);
				})
			});
		}
		/**
		* Render the directory-browser dialog.
		* @param props - owner-controlled browser props.
		* @returns the dialog element (null while closed, via Modal).
		*/
		function DirectoryBrowser({ open, listDirectory, createDirectory, onOpen, onClose, busy, t }) {
			const [parent, setParent] = (0, react.useState)(null);
			const [selected, setSelected] = (0, react.useState)(null);
			const [child, setChild] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [slowScan, setSlowScan] = (0, react.useState)(false);
			const [scanWindow, setScanWindow] = (0, react.useState)(0);
			const [error, setError] = (0, react.useState)(null);
			const [pathDraft, setPathDraft] = (0, react.useState)(null);
			const [showHidden, setShowHidden] = (0, react.useState)(false);
			const [folderDraft, setFolderDraft] = (0, react.useState)(null);
			const [creatingFolder, setCreatingFolder] = (0, react.useState)(false);
			const [createError, setCreateError] = (0, react.useState)(null);
			const requestSeq = (0, react.useRef)(0);
			const scanController = (0, react.useRef)(null);
			const openGeneration = (0, react.useRef)(0);
			const crumbTrailRef = (0, react.useRef)(null);
			const composingRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => () => {
				requestSeq.current += 1;
				openGeneration.current += 1;
				scanController.current?.abort();
			}, []);
			const compositionGuard = {
				onCompositionStart: () => {
					composingRef.current = true;
				},
				onCompositionEnd: () => {
					composingRef.current = false;
				}
			};
			/** Newer intent wins: invalidate the pending listing's settlement AND abort its wire request. */
			const supersede = (0, react.useCallback)(() => {
				scanController.current?.abort();
				scanController.current = null;
				return ++requestSeq.current;
			}, []);
			/** Hide any prior indicator and start a fresh silence window for one listing call. */
			const restartSlowScanWindow = (0, react.useCallback)(() => {
				setSlowScan(false);
				setScanWindow((value) => value + 1);
			}, []);
			/** Launch one listing under a fresh controller so a later supersession can abort it. */
			const launchListing = (0, react.useCallback)((path) => {
				const seq = supersede();
				const controller = new AbortController();
				scanController.current = controller;
				restartSlowScanWindow();
				return {
					seq,
					scan: listDirectory(path, controller.signal)
				};
			}, [
				supersede,
				restartSlowScanWindow,
				listDirectory
			]);
			/**
			* Launch a follow-up listing under the CURRENT supersession seq: a newer
			* intent aborts it like the leg it continues, and it supersedes nothing.
			*/
			const continueScan = (0, react.useCallback)((path) => {
				const controller = new AbortController();
				scanController.current = controller;
				restartSlowScanWindow();
				return listDirectory(path, controller.signal);
			}, [restartSlowScanWindow, listDirectory]);
			/**
			* Enter owns the view from submission until its navigation lands, so the
			* debounce timer the same keystrokes armed must not supersede it. Cleared
			* by the next edit (and by opening the editor); a failed submission leaves
			* it set until the operator edits again, so the rejected path is not
			* immediately re-scanned as a preview.
			*/
			const previewSuspended = (0, react.useRef)(false);
			const viewRef = (0, react.useRef)({
				parent: null,
				child: null
			});
			(0, react.useEffect)(() => {
				viewRef.current = {
					parent,
					child
				};
			}, [parent, child]);
			const scanned = (0, react.useRef)(null);
			/**
			* A landed preview replaced the pane a keyboard operator may have Tabbed
			* onto, so the focus it drops is re-parked on the still-open editor (the
			* Modal has no focus trap). Consumed by the refocus effect below.
			*/
			const refocusPathInput = (0, react.useRef)(false);
			/**
			* Replace the whole view with a freshly scanned level. Away from the
			* display root — the same collapse the crumb header renders, so crumbs and
			* pane shape never disagree — the landing is two-pane: the target's ACTUAL
			* parent-level entry re-selected (left pane = parent, right pane = the
			* target), so a crumb jump reads as stepping back one pane. Both legs land
			* as one frame when the parent leg settles within
			* {@link PARENT_LEG_WAIT_MS}; past that bound (or at the display root) the
			* target commits alone — single wide level, loading ends — and a late
			* parent leg still upgrades the landing in place. A failed parent leg, or a
			* truncated parent window that lacks the target, leaves the single-pane
			* landing — the upgrade must never orphan the selection it exists to
			* anchor. Until whichever commit comes first, the previous view keeps
			* rendering: a landing swaps the panes, it never blanks them.
			*
			* Two callers, one landing shape. A submitted path (Enter, a crumb) closes
			* the editor on arrival, announces its failure, and takes the wait bound —
			* it is answering a gesture, so it may not hang on a stalled parent. The
			* editor's own draft-following scan keeps all three to itself: it is
			* speculative, nothing waits on it, and the stale view keeps rendering, so
			* it waits for BOTH legs rather than flashing a single pane it would then
			* upgrade — one keystroke must move the view once. A failure leaves the
			* last readable panes standing and says nothing, while an arrival clears
			* the stale message and re-parks focus the swap dropped.
			* @param path - the level to list; absent lists the Host home directory.
			* @param options - `closeEditor` retires the path draft on arrival and
			* bounds the wait for the parent leg; `announce` surfaces a failure as the
			* dialog's alert.
			*/
			const land = (0, react.useCallback)((path, options) => {
				const { seq, scan } = launchListing(path);
				setLoading(true);
				if (options.announce) setError(null);
				const settle = () => {
					setLoading(false);
					if (options.closeEditor) {
						setPathDraft(null);
						return;
					}
					setError(null);
					refocusPathInput.current = true;
				};
				scan.then((target) => {
					if (seq !== requestSeq.current) return;
					if (!options.closeEditor && path !== void 0) scanned.current = {
						directory: path,
						landed: target.path
					};
					let landed = false;
					const landSingle = () => {
						if (landed || seq !== requestSeq.current) return;
						landed = true;
						setParent(target);
						setSelected(null);
						setChild(null);
						settle();
					};
					if (displayCrumbs(target, "").length < 2) {
						landSingle();
						return;
					}
					const parentCrumb = target.crumbs.at(-2);
					/* v8 ignore next -- narrowing: a two-deep display chain implies a parent crumb (root-to-target inclusive). */
					if (parentCrumb === void 0) {
						landSingle();
						return;
					}
					continueScan(parentCrumb.path).then((parentLevel) => {
						if (seq !== requestSeq.current) return;
						const sep = separatorOf(parentLevel);
						const fold = (value) => sep === "\\" ? value.toLowerCase() : value;
						const match = parentLevel.entries.find((entry) => fold(entry.path) === fold(target.path));
						if (match === void 0) {
							landSingle();
							return;
						}
						landed = true;
						setParent(parentLevel);
						setSelected(match);
						setChild(target);
						settle();
					}, () => {
						landSingle();
					});
					if (options.closeEditor) window.setTimeout(landSingle, PARENT_LEG_WAIT_MS);
				}, (reason) => {
					if (seq !== requestSeq.current) return;
					setLoading(false);
					if (options.announce) setError(failureText(reason));
				});
			}, [launchListing, continueScan]);
			/** Commit a submitted path (Enter, a crumb, the initial home listing): the editor closes, failures surface. */
			const navigate = (0, react.useCallback)((path) => {
				land(path, {
					closeEditor: true,
					announce: true
				});
			}, [land]);
			const refocusPick = (0, react.useRef)(false);
			const refocusEditZone = (0, react.useRef)(false);
			const pathInputRef = (0, react.useRef)(null);
			const editZoneRef = (0, react.useRef)(null);
			/**
			* Select a row of the listed level and preview its children on the right.
			* Deliberately NOT one-frame like navigate(): a pick's first duty is the
			* immediate selected state on the clicked row, and the pane split IS that
			* feedback (aria-current pill, crumbs following the selection) — holding
			* it back for the child listing would make clicks feel dropped. The quiet
			* rule governs whole-view replacement, where nothing acknowledges the
			* click but the swap itself.
			*/
			const select = (0, react.useCallback)((entry) => {
				const { seq, scan } = launchListing(entry.path);
				if (pathDraft !== null) refocusPick.current = true;
				setPathDraft(null);
				setSelected(entry);
				setChild(null);
				setLoading(true);
				setError(null);
				scan.then((next) => {
					if (seq !== requestSeq.current) return;
					setChild(next);
					setLoading(false);
				}, (reason) => {
					if (seq !== requestSeq.current) return;
					setLoading(false);
					setError(failureText(reason));
					setSelected(null);
					refocusEditZone.current = true;
				});
			}, [launchListing, pathDraft]);
			/**
			* Walk the panes to the directory the draft addresses, WITHOUT closing the
			* editor. The landing is an ordinary one — selection-anchored and two-pane
			* away from the display root — so typing a path moves the Miller view
			* exactly as a crumb jump does, and the draft's final segment
			* prefix-filters the arrival from the next render on.
			*/
			const previewDraftLevel = (0, react.useCallback)((directory) => {
				land(directory, {
					closeEditor: false,
					announce: false
				});
			}, [land]);
			/** Abandon path editing (Escape or clicking away) and restore the crumb view. */
			const cancelPathEdit = (0, react.useCallback)(() => {
				supersede();
				setLoading(false);
				setPathDraft(null);
				setError(null);
				if (child === null) setSelected(null);
				if (parent === null) navigate();
			}, [
				supersede,
				child,
				parent,
				navigate
			]);
			/** A right-column pick advances the view one level: child becomes the level. */
			const advance = (0, react.useCallback)((entry) => {
				/* v8 ignore next -- narrowing guard: the right column only renders with a child listing. */
				if (child === null) return;
				setParent(child);
				select(entry);
			}, [child, select]);
			(0, react.useEffect)(() => {
				openGeneration.current += 1;
				if (open) {
					setParent(null);
					setSelected(null);
					setChild(null);
					setCreatingFolder(false);
					setShowHidden(false);
					navigate();
					return;
				}
				supersede();
				setLoading(false);
				setError(null);
				setPathDraft(null);
				setFolderDraft(null);
				setCreateError(null);
				refocusPick.current = false;
				refocusEditZone.current = false;
			}, [
				open,
				navigate,
				supersede
			]);
			/** The folder a create or Open acts on: the selection, else the listed level. */
			const targetPath = selected?.path ?? parent?.path ?? null;
			const targetName = selected?.name ?? (parent === null ? "" : displayCrumbs(parent, t("browser.home")).at(-1)?.name ?? parent.path);
			const confirmCreate = () => {
				/* v8 ignore next -- reentry fence: the nested dialog only renders with a target and disables while creating. */
				if (targetPath === null || folderDraft === null || creatingFolder) return;
				const name = folderDraft;
				if (name.trim() === "") return;
				setCreatingFolder(true);
				setCreateError(null);
				const generation = openGeneration.current;
				createDirectory(targetPath, name).then((createdPath) => {
					if (generation !== openGeneration.current) return;
					setCreatingFolder(false);
					setFolderDraft(null);
					const { seq, scan } = launchListing(targetPath);
					setLoading(true);
					setError(null);
					scan.then((level) => {
						/* v8 ignore next -- same fence as navigate/select; the modal blocks superseding input */
						if (seq !== requestSeq.current) return;
						setParent(level);
						setLoading(false);
						select({
							name,
							path: createdPath,
							hidden: false
						});
					}, (reason) => {
						/* v8 ignore next -- same fence as navigate/select; the modal blocks superseding input */
						if (seq !== requestSeq.current) return;
						setLoading(false);
						setError(failureText(reason));
					});
				}, (reason) => {
					if (generation !== openGeneration.current) return;
					setCreatingFolder(false);
					setCreateError(failureText(reason));
				});
			};
			(0, react.useEffect)(() => {
				if (!loading) {
					setSlowScan(false);
					return;
				}
				const timer = window.setTimeout(() => {
					setSlowScan(true);
				}, SLOW_SCAN_DELAY_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [loading, scanWindow]);
			(0, react.useEffect)(() => {
				if (pathDraft === null) return;
				const timer = window.setTimeout(() => {
					if (previewSuspended.current) return;
					const current = viewRef.current.child ?? viewRef.current.parent;
					if (current === null) return;
					const { directory, tail } = readDraft(current, pathDraft, scanned.current);
					if (directory === null || tail !== null) return;
					previewDraftLevel(directory);
				}, DRAFT_PREVIEW_DEBOUNCE_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [pathDraft, previewDraftLevel]);
			const crumbSource = child ?? parent;
			const typedPrefix = crumbSource === null || pathDraft === null ? null : readDraft(crumbSource, pathDraft, scanned.current).tail;
			const crumbs = crumbSource === null ? [] : displayCrumbs(crumbSource, t("browser.home"));
			const crumbTail = crumbs.at(-1)?.path;
			(0, react.useEffect)(() => {
				const trail = crumbTrailRef.current;
				if (trail !== null) trail.scrollLeft = trail.scrollWidth;
			}, [crumbTail]);
			const millerRowRef = (0, react.useRef)(null);
			const childPath = child?.path;
			(0, react.useEffect)(() => {
				const row = millerRowRef.current;
				if (row !== null && childPath !== void 0) row.scrollLeft = row.scrollWidth;
			}, [childPath]);
			(0, react.useEffect)(() => {
				if (refocusPathInput.current) {
					refocusPathInput.current = false;
					if (document.activeElement === document.body) pathInputRef.current?.focus();
				}
				if (pathDraft !== null) return;
				if (refocusPick.current) {
					refocusPick.current = false;
					refocusEditZone.current = false;
					const rowHost = millerRowRef.current;
					/* v8 ignore next -- narrowing guard: the miller row is mounted whenever a pick just committed. */
					if (rowHost === null) return;
					const row = rowHost.querySelector("button[aria-current=\"true\"]");
					/* v8 ignore next -- narrowing guard: the pick that set the flag just rendered its aria-current row. */
					if (row === null) return;
					row.focus();
					return;
				}
				if (refocusEditZone.current) {
					refocusEditZone.current = false;
					if (document.activeElement !== document.body) return;
					const zone = editZoneRef.current;
					/* v8 ignore next -- narrowing guard: crumb mode renders the edit zone whenever the editor just closed. */
					if (zone === null) return;
					zone.focus();
				}
			});
			if (!open) return null;
			const twoPane = selected !== null;
			const parentInert = busy || folderDraft !== null;
			const draftPending = pathDraft !== null;
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: () => {
					if (folderDraft === null && !busy) onClose();
				},
				title: t("browser.title"),
				className: clsx(DirectoryBrowser_module_css_default.dialog),
				headless: true,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: DirectoryBrowser_module_css_default.editorScope,
					onKeyDown: (event) => {
						if (event.key !== "Escape" || pathDraft === null) return;
						event.stopPropagation();
						refocusEditZone.current = document.activeElement === pathInputRef.current;
						cancelPathEdit();
					},
					onBlur: (event) => {
						if (pathDraft === null) return;
						if (!document.hasFocus()) return;
						const card = event.currentTarget.closest("[role=\"dialog\"]");
						/* v8 ignore next -- narrowing guard: this scope always renders inside the Modal card. */
						if (card === null) return;
						if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
						refocusEditZone.current = false;
						cancelPathEdit();
					},
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: DirectoryBrowser_module_css_default.header,
							children: [(0, react_jsx_runtime.jsx)("h2", {
								className: DirectoryBrowser_module_css_default.title,
								children: t("browser.title")
							}), (0, react_jsx_runtime.jsx)("div", {
								className: DirectoryBrowser_module_css_default.crumbBar,
								children: pathDraft === null ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
									className: DirectoryBrowser_module_css_default.crumbTrail,
									role: "navigation",
									ref: crumbTrailRef,
									children: crumbs.map((crumb, index) => (0, react_jsx_runtime.jsxs)("span", {
										className: DirectoryBrowser_module_css_default.crumbSeat,
										children: [index > 0 && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {
											size: 12,
											className: DirectoryBrowser_module_css_default.crumbChevron
										}), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: DirectoryBrowser_module_css_default.crumb,
											disabled: parentInert,
											onClick: () => {
												navigate(crumb.path);
											},
											children: crumb.name
										})]
									}, crumb.path))
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: DirectoryBrowser_module_css_default.crumbEditZone,
									"aria-label": t("browser.editPath"),
									title: t("browser.editPath"),
									disabled: parentInert,
									ref: editZoneRef,
									onClick: () => {
										supersede();
										setLoading(false);
										previewSuspended.current = false;
										if (parent === null) {
											setPathDraft("");
											return;
										}
										const base = selected?.path ?? parent.path;
										const sep = separatorOf(parent);
										setPathDraft(base.endsWith(sep) ? base : `${base}${sep}`);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {
										size: 14,
										className: DirectoryBrowser_module_css_default.crumbEditGlyph
									})
								})] }) : (0, react_jsx_runtime.jsx)("input", {
									className: DirectoryBrowser_module_css_default.pathInput,
									value: pathDraft,
									"aria-label": t("browser.editPath"),
									autoFocus: true,
									ref: pathInputRef,
									disabled: parentInert,
									onChange: (event) => {
										supersede();
										setLoading(false);
										previewSuspended.current = false;
										setPathDraft(event.target.value);
									},
									...compositionGuard,
									onKeyDown: (event) => {
										if (event.key === "Enter" && !composingRef.current) {
											event.preventDefault();
											if (pathDraft.trim() !== "") {
												refocusEditZone.current = true;
												previewSuspended.current = true;
												navigate(pathDraft);
											}
										}
									}
								})
							})]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: DirectoryBrowser_module_css_default.content,
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: DirectoryBrowser_module_css_default.millerRow,
									ref: millerRowRef,
									children: [
										parent !== null && (0, react_jsx_runtime.jsx)(LevelColumn, {
											entries: parent.entries,
											selectedPath: selected?.path ?? null,
											busy: parentInert,
											onPick: select,
											showHidden,
											filterPrefix: child === null ? typedPrefix : null,
											pathEditing: draftPending
										}),
										twoPane && (0, react_jsx_runtime.jsx)("span", { className: DirectoryBrowser_module_css_default.divider }),
										twoPane && child !== null && (0, react_jsx_runtime.jsx)(LevelColumn, {
											entries: child.entries,
											selectedPath: null,
											busy: parentInert,
											onPick: advance,
											showHidden,
											filterPrefix: typedPrefix,
											pathEditing: draftPending
										})
									]
								}),
								loading && slowScan && (0, react_jsx_runtime.jsx)("div", {
									className: clsx(DirectoryBrowser_module_css_default.status, DirectoryBrowser_module_css_default.loadingFloat),
									role: "status",
									children: t("browser.loading")
								}),
								(parent?.truncated === true || child?.truncated === true) && (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryBrowser_module_css_default.status,
									role: "status",
									children: t("browser.truncated")
								}),
								error !== null && (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryBrowser_module_css_default.error,
									role: "alert",
									children: error
								})
							]
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: DirectoryBrowser_module_css_default.footerBar,
							children: [
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }),
									disabled: parent === null || loading || parentInert || draftPending,
									onClick: () => {
										setFolderDraft("");
										setCreateError(null);
									},
									children: t("browser.newFolder")
								}),
								(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: clsx(DirectoryBrowser_module_css_default.showHiddenToggle, showHidden && DirectoryBrowser_module_css_default.showHiddenToggleActive),
									"aria-pressed": showHidden,
									disabled: parentInert,
									onMouseDown: draftPending ? (event) => {
										event.preventDefault();
									} : void 0,
									onClick: () => {
										setShowHidden((prev) => !prev);
									},
									children: [t("browser.showHidden"), showHidden && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 })]
								}),
								(0, react_jsx_runtime.jsx)("span", { className: DirectoryBrowser_module_css_default.footerGap }),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									className: clsx(DirectoryBrowser_module_css_default.footerAction),
									disabled: parentInert,
									onClick: onClose,
									children: t("browser.cancel")
								}),
								(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									className: clsx(DirectoryBrowser_module_css_default.footerAction),
									disabled: targetPath === null || loading || parentInert || draftPending,
									/* v8 ignore next -- narrowing guard: Open disables while no target exists. */
									onClick: () => {
										if (targetPath !== null) onOpen(targetPath);
									},
									children: t("browser.open")
								})
							]
						})
					]
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: folderDraft !== null,
					onClose: () => {
						if (!creatingFolder) setFolderDraft(null);
					},
					title: t("browser.newFolder"),
					className: clsx(DirectoryBrowser_module_css_default.createDialog),
					headless: true,
					children: (0, react_jsx_runtime.jsxs)("div", {
						className: DirectoryBrowser_module_css_default.createBody,
						children: [
							(0, react_jsx_runtime.jsx)("h3", {
								className: DirectoryBrowser_module_css_default.createTitle,
								children: t("browser.newFolder")
							}),
							(0, react_jsx_runtime.jsx)("p", {
								className: DirectoryBrowser_module_css_default.createIn,
								children: t("browser.createIn", { name: targetName })
							}),
							(0, react_jsx_runtime.jsx)("input", {
								className: DirectoryBrowser_module_css_default.createInput,
								value: folderDraft ?? "",
								"aria-label": t("browser.folderName"),
								placeholder: t("browser.untitledFolder"),
								autoFocus: true,
								disabled: creatingFolder,
								onChange: (event) => {
									setFolderDraft(event.target.value);
								},
								...compositionGuard,
								onKeyDown: (event) => {
									if (event.key === "Enter" && !composingRef.current) {
										event.preventDefault();
										confirmCreate();
									}
									if (event.key === "Escape") {
										event.stopPropagation();
										if (!creatingFolder) setFolderDraft(null);
									}
								}
							}),
							createError !== null && (0, react_jsx_runtime.jsx)("div", {
								className: DirectoryBrowser_module_css_default.error,
								role: "alert",
								children: createError
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: DirectoryBrowser_module_css_default.createActions,
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									disabled: creatingFolder,
									onClick: () => {
										setFolderDraft(null);
									},
									children: t("browser.cancel")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									disabled: creatingFolder || folderDraft === null || folderDraft.trim() === "",
									onClick: confirmCreate,
									children: t("browser.create")
								})]
							})
						]
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/flow.js
		/**
		* The browse picking occupant (package-internal; the `./client` surface
		* exposes only the Loader exports). Same-package tests exercise it directly
		* through this module.
		*/
		/**
		* Flow occupant: adapts the hole's owner conversation onto the browser
		* dialog — a confirmed directory is the picked path, dismissal is the
		* cancellation. Browse failures (unreadable targets, create conflicts) stay
		* inside the dialog's own alert surfaces, so the owner's `onError` arm is
		* never driven by this occupant.
		* @param props - owner conversation plus the injected browse face.
		* @returns the dialog element (renders nothing while closed).
		*/
		function BrowseDirectoryFlow(props) {
			return (0, react.createElement)(DirectoryBrowser, {
				open: props.open,
				busy: props.busy,
				listDirectory: props.listDirectory,
				createDirectory: props.createDirectory,
				t: props.t,
				onOpen: props.onPicked,
				onClose: props.onCancel
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Locale namespace owning the browser dialog's copy. */
		const LOCALE_NS = "directory-browser";
		/** Required services (cordis fiber inject): the slot registry, workspace UI service, and locale. */
		const inject = [
			"slots",
			"uiWorkspace",
			"locale"
		];
		/**
		* Client plugin body: register the dialog's dictionaries and the browse flow
		* into both directory-flow holes through `slots.inject()` because the
		* ui-workspace entries may activate later or replace their declarations.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				const disposers = [];
				const dictionaries = [["zh", {
					"browser.title": "选择工作区目录",
					"browser.home": "主目录",
					"browser.newFolder": "新建文件夹",
					"browser.folderName": "文件夹名称",
					"browser.createIn": "在\"{name}\"中新建文件夹",
					"browser.untitledFolder": "未命名文件夹",
					"browser.create": "创建",
					"browser.cancel": "取消",
					"browser.open": "打开",
					"browser.editPath": "编辑路径",
					"browser.loading": "加载中…",
					"browser.truncated": "文件夹过多，仅显示开头部分。",
					"browser.showHidden": "显示隐藏文件"
				}], ["en", {
					"browser.title": "Select Workspace Directory",
					"browser.home": "Home",
					"browser.newFolder": "New folder",
					"browser.folderName": "Folder name",
					"browser.createIn": "New folder in \"{name}\"",
					"browser.untitledFolder": "Untitled folder",
					"browser.create": "Create",
					"browser.cancel": "Cancel",
					"browser.open": "Open",
					"browser.editPath": "Edit path",
					"browser.loading": "Loading…",
					"browser.truncated": "Too many folders to list; only the beginning is shown.",
					"browser.showHidden": "Show hidden files"
				}]];
				try {
					for (const [locale, dict] of dictionaries) disposers.push(ctx.locale.register(LOCALE_NS, locale, dict));
				} catch (error) {
					for (const dispose of disposers.reverse()) dispose();
					throw error;
				}
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "directory-picker-browse: dialog dictionaries");
			const injected = () => ({
				listDirectory: (path, signal) => ctx.uiWorkspace.listDirectory(path, signal),
				createDirectory: (path, name) => ctx.uiWorkspace.createDirectory(path, name),
				t: ctx.locale.bind(LOCALE_NS)
			});
			ctx.slots.inject("conversation.hero.workspace.directoryFlow", () => ctx.slots.inject("sidebar.workspaces.directoryFlow", function* () {
				yield ctx.slots.register({
					name: "conversation.hero.workspace.directoryFlow",
					inject: injected
				}, BrowseDirectoryFlow);
				yield ctx.slots.register({
					name: "sidebar.workspaces.directoryFlow",
					inject: injected
				}, BrowseDirectoryFlow);
			}));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
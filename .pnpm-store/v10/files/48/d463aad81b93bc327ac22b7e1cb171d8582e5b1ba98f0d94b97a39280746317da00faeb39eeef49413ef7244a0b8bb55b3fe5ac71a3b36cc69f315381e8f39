window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-workspace",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/navigation.js
		/** Workspace archive and directory UI capability. */
		/** Structured directory failure exposed to directory UI consumers. */
		var DirectoryBrowseError = class extends Error {
			rpcError;
			name = "DirectoryBrowseError";
			/** @param rpcError - Host directory business failure. */
			constructor(rpcError) {
				super(`directory browse failed: ${rpcError.code}: ${rpcError.message}`);
				this.rpcError = rpcError;
			}
		};
		/** Implements Workspace archive and directory UI operations. */
		var UiWorkspaceService = class extends _deepseek_ai_cordis.Service {
			directoryPicker;
			workspaces;
			sessions;
			connecting = /* @__PURE__ */ new Map();
			lifetime = new AbortController();
			/**
			* @param ctx - Client root Context.
			* @param directoryPicker - the directory-picking Remote namespace.
			* @param workspaces - pure Workspace Controller.
			* @param sessions - pure Session Controller.
			*/
			constructor(ctx, directoryPicker, workspaces, sessions) {
				super(ctx, "uiWorkspace");
				this.directoryPicker = directoryPicker;
				this.workspaces = workspaces;
				this.sessions = sessions;
				ctx.effect(() => this.watchNavigation(), "ui-workspace: Workspace navigation policy");
			}
			async connectWorkspace(workspaceId) {
				const workspace = this.workspaces.list.getSnapshot().items.find((item) => item.workspaceId === workspaceId);
				if (workspace === void 0) throw new Error(`uiWorkspace.connectWorkspace: unknown workspace ${workspaceId}`);
				const inflight = this.connecting.get(workspaceId);
				if (inflight !== void 0) return inflight;
				const archived = this.workspaces.list.getSnapshot().archivedSessionIds;
				const sessions = this.sessions.list.getSnapshot();
				for (const id of sessions.ids) {
					const summary = sessions.byId[id];
					if (summary !== void 0 && summary.blank && summary.cwd === workspace.path && workspace.sessionIds.includes(summary.id) && !archived.includes(summary.id)) return summary.id;
				}
				const attempt = this.sessions.create({ workspaceId }).finally(() => {
					this.connecting.delete(workspaceId);
				});
				this.connecting.set(workspaceId, attempt);
				return attempt;
			}
			openSession(sessionId) {
				this.sessions.open(sessionId);
				this.ctx.layout.selectPanel(null);
			}
			async openWorkspace(workspaceId, beforeOpen) {
				const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
				const isCurrent = () => !navigation.aborted;
				const sessionId = await this.connectWorkspace(workspaceId);
				if (!isCurrent()) return;
				beforeOpen?.(sessionId);
				if (isCurrent()) this.openSession(sessionId);
			}
			async forkSession(sessionId) {
				const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
				const childId = await this.sessions.fork({
					sessionId,
					increaseTitle: true
				});
				if (!navigation.aborted) this.openSession(childId);
			}
			startSession(workspaceId) {
				const workspace = this.workspaces.list.getSnapshot();
				const sessions = this.sessions.list.getSnapshot();
				const current = sessions.current;
				const currentWorkspaceId = current === void 0 ? void 0 : workspace.items.find((item) => item.sessionIds.includes(current))?.workspaceId;
				const recent = workspace.phase === "ready" && sessions.phase === "ready" ? recentWorkspace(workspace.items, sessions.byId) : void 0;
				const target = workspaceId ?? currentWorkspaceId ?? recent;
				if (target === void 0) {
					this.sessions.clear();
					this.ctx.layout.selectPanel(null);
					return;
				}
				this.openWorkspace(target).catch((reason) => {
					console.warn("new session failed:", reason);
				});
			}
			async archiveSession(sessionId) {
				await this.workspaces.archiveSession(sessionId);
			}
			async pickDirectory() {
				const result = await this.directoryPicker.pick();
				if (!result.ok) throw new Error(`directory picker failed: ${result.error.message}`);
				return result.value;
			}
			async listDirectory(path, signal) {
				const result = await this.directoryPicker.list(path, signal);
				if (!result.ok) throw new DirectoryBrowseError(result.error);
				return result.value;
			}
			async createDirectory(path, name) {
				const result = await this.directoryPicker.createDirectory(path, name);
				if (!result.ok) throw new DirectoryBrowseError(result.error);
				return result.value;
			}
			watchNavigation() {
				let initial = "waiting";
				const reconcile = () => {
					if (this.lifetime.signal.aborted) return;
					if (this.clearArchivedCurrent()) return;
					if (initial !== "waiting") return;
					const workspace = this.workspaces.list.getSnapshot();
					const sessions = this.sessions.list.getSnapshot();
					if (workspace.phase !== "ready" || sessions.phase !== "ready") return;
					if (sessions.current !== void 0) {
						initial = "done";
						return;
					}
					const target = recentWorkspace(workspace.items, sessions.byId);
					if (target === void 0) {
						initial = "done";
						return;
					}
					initial = "connecting";
					this.connectWorkspace(target).then((sessionId) => {
						if (this.lifetime.signal.aborted) return;
						if (this.sessions.list.getSnapshot().current === void 0) this.sessions.open(sessionId);
						initial = "done";
					}, (reason) => {
						if (this.lifetime.signal.aborted) return;
						initial = "waiting";
						console.warn("initial workspace selection failed:", reason);
					});
				};
				const disposeWorkspaces = this.workspaces.list.subscribe(reconcile);
				const disposeSessions = this.sessions.list.subscribe(reconcile);
				reconcile();
				return () => {
					this.lifetime.abort();
					disposeSessions();
					disposeWorkspaces();
				};
			}
			/** @returns true when an archived current selection was cleared. */
			clearArchivedCurrent() {
				const current = this.sessions.list.getSnapshot().current;
				if (current === void 0 || !this.workspaces.list.getSnapshot().archivedSessionIds.includes(current)) return false;
				this.sessions.clear();
				return true;
			}
		};
		/** Stable tie-breaking follows Host Workspace order. */
		function recentWorkspace(workspaces, sessions) {
			let selected;
			let selectedTime = Number.NEGATIVE_INFINITY;
			for (const workspace of workspaces) {
				let latest = Number.NEGATIVE_INFINITY;
				for (const sessionId of workspace.sessionIds) {
					const session = sessions[sessionId];
					if (session !== void 0) latest = Math.max(latest, session.updatedAt);
				}
				if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt);
				if (selected === void 0 || latest > selectedTime) {
					selected = workspace.workspaceId;
					selectedTime = latest;
				}
			}
			return selected;
		}
		//#endregion
		//#region lib/types/client/stores.js
		/**
		* The workspace browser's viewing store: the session-list grouping mode,
		* persisted across reloads. Module level exports the factory only (a
		* module-level handle would pin the store identity across plugin reloads);
		* register() receives the factory and the browser derives its PropsStore
		* share from the return type.
		*/
		/** Browser-local order account for the hierarchy-free flat Session list. */
		const FLAT_SESSION_ORDER_KEY = "__flat_session_order__";
		/**
		* Create the workspace browser viewing store handle.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createWorkspaceViewStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					groupBy: "workspace",
					orderBy: "updated",
					groupExpansion: {},
					sessionOrderByAccount: {},
					sessionUpdatedAtByAccount: {}
				}),
				persist: "dsh.workspace.view.v5",
				actions: {
					setGroupBy: (d, mode) => {
						d.groupBy = mode;
					},
					setOrderBy: (d, mode) => {
						d.orderBy = mode;
					},
					setGroupExpanded: (d, key, expanded) => {
						d.groupExpansion[key] = expanded;
					},
					retainAccountKeys: (d, workspaceKeys) => {
						const retained = new Set(workspaceKeys);
						d.groupExpansion = Object.fromEntries(Object.entries(d.groupExpansion).filter(([key]) => retained.has(key)));
						d.sessionOrderByAccount = Object.fromEntries(Object.entries(d.sessionOrderByAccount).filter(([key]) => retained.has(key)));
						d.sessionUpdatedAtByAccount = Object.fromEntries(Object.entries(d.sessionUpdatedAtByAccount).filter(([key]) => retained.has(key)));
					},
					syncSessionOrderAccount: (d, accountKey, order, updatedAt) => {
						d.sessionOrderByAccount[accountKey] = order;
						d.sessionUpdatedAtByAccount[accountKey] = updatedAt;
					},
					setSessionOrder: (d, accountKey, order) => {
						d.sessionOrderByAccount[accountKey] = order;
					}
				}
			});
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
		/**
		* Read the final non-empty segment of a Workspace path for display.
		* Workspace-label surfaces use this helper instead of deriving another basename.
		* @param path - Workspace directory path using POSIX or Windows separators.
		* @returns the final segment, or an empty string for a separator-only path.
		*/
		function workspaceTitleOf(path) {
			const trimmed = path.replace(/[/\\]+$/, "");
			const separator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return trimmed.slice(separator + 1);
		}
		//#endregion
		//#region lib/types/client/subagent-lineage.js
		/** UI Workspace-owned projection of descendant counts from Session summaries. */
		/**
		* Index uninterrupted subagent descendants under each ancestor.
		* @param summaries - Session summaries keyed by id.
		* @returns descendant totals keyed by possible parent id.
		*/
		function indexSubagentDescendants(summaries) {
			const indexed = /* @__PURE__ */ new Map();
			for (const descendant of Object.values(summaries)) {
				if (descendant.origin !== "subagent") continue;
				const seen = /* @__PURE__ */ new Set();
				let current = descendant;
				while (current?.origin === "subagent" && current.parentId !== void 0 && !seen.has(current.id)) {
					seen.add(current.id);
					const aggregate = indexed.get(current.parentId);
					if (aggregate === void 0) indexed.set(current.parentId, {
						count: 1,
						runningCount: descendant.running ? 1 : 0
					});
					else {
						aggregate.count += 1;
						if (descendant.running) aggregate.runningCount += 1;
					}
					current = summaries[current.parentId];
				}
			}
			return indexed;
		}
		/**
		* Resolve the Workspace browser group that owns one Session.
		* @param workspaces - authoritative Workspace membership.
		* @param sessionId - Session whose browser group is required.
		* @returns owning Workspace id, or {@link UNGROUPED_KEY} when no Workspace accounts for it.
		*/
		function owningGroupKey(workspaces, sessionId) {
			return workspaces.find((workspace) => workspace.sessionIds.includes(sessionId))?.workspaceId ?? "";
		}
		/**
		* Directory display label: basename of the path (both separators accepted).
		* Ungrouped-bucket fallback for surfaces without a workspace title.
		* @param cwd - directory path, or undefined for the ungrouped bucket.
		* @returns basename, the raw cwd when it has no basename, or an empty ungrouped marker.
		*/
		function workspaceLabel(cwd) {
			if (cwd === void 0 || cwd === "") return "";
			const base = workspaceTitleOf(cwd);
			return base !== "" ? base : cwd;
		}
		/** Recency comparator: newest first, id as the deterministic tiebreak (ids are unique per group). */
		function byRecency(a, b) {
			if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
			return a.id < b.id ? -1 : 1;
		}
		/**
		* Ordinary sessions are visible; among blank sessions, only the current one
		* is visible. Subagent children use their parent header catalog; archived
		* sessions are visible nowhere, while their accounting slots remain so
		* unarchiving restores position.
		*/
		function sessionVisible(session, current, archived) {
			return session.origin !== "subagent" && !archived.has(session.id) && (!session.blank || session.id === current);
		}
		/**
		* A blank session is the selected Workspace's provisional New Session row;
		* its canonical title never enters search (blank rows are query-excluded)
		* and the renderer localizes its display label.
		*/
		function sessionTitle(session) {
			return session.blank ? "" : session.displayTitle;
		}
		/** The list projection alone owns the best-effort active-Schedule indicator. */
		function hasActiveSchedule(session) {
			return (session.projectionValues?.schedule?.length ?? 0) > 0;
		}
		/** Build one group without projecting session lineage into presentation. */
		function buildGroup(key, workspaceId, cwd, createdAt, label, members, order) {
			const sessions = [...members];
			if (order === "recency") sessions.sort(byRecency);
			return {
				key,
				workspaceId,
				cwd,
				createdAt,
				label,
				sessions
			};
		}
		/** Apply a stored Ungrouped order and append newly loose Sessions by recency. */
		function orderedUngrouped(members, stored) {
			const byId = new Map(members.map((session) => [session.id, session]));
			const included = /* @__PURE__ */ new Set();
			const ordered = [];
			for (const key of stored) {
				const session = byId.get(key);
				if (session === void 0 || included.has(key)) continue;
				ordered.push(session);
				included.add(key);
			}
			for (const session of [...members].sort(byRecency)) {
				if (included.has(session.id)) continue;
				ordered.push(session);
			}
			return ordered;
		}
		/**
		* Group Sessions by Host Workspace: one group per entity in stable Host
		* order, with members resolved from sessionIds in their stored order. Sessions
		* outside every Workspace trail in the browser-local Ungrouped order, which
		* falls back to recency before that order is initialized.
		*/
		function groupByWorkspace(list, workspaces, archived, ungroupedOrder) {
			const groups = [];
			const accounted = /* @__PURE__ */ new Set();
			for (const workspace of workspaces) {
				const members = [];
				for (const id of workspace.sessionIds) {
					const summary = list.byId[id];
					if (summary === void 0) continue;
					accounted.add(id);
					if (!sessionVisible(summary, list.current, archived)) continue;
					members.push(summary);
				}
				groups.push(buildGroup(workspace.workspaceId, workspace.workspaceId, workspace.path, Date.parse(workspace.createdAt), workspace.title, members, "account"));
			}
			const stray = list.ids.map((id) => list.byId[id]).filter((s) => s !== void 0 && !accounted.has(s.id) && sessionVisible(s, list.current, archived));
			if (stray.length > 0) groups.push(buildGroup("", void 0, void 0, void 0, "", ungroupedOrder === void 0 ? stray : orderedUngrouped(stray, ungroupedOrder), ungroupedOrder === void 0 ? "recency" : "account"));
			return groups;
		}
		/** Keep navigation presentation independent from domain-owned interaction objects. */
		function visiblePendingKind(kind) {
			switch (kind) {
				case "approval":
				case "plan-review":
				case "question": return kind;
				default: return;
			}
		}
		function sessionNode(s, descendants, pendingInteractions) {
			const pendingInteraction = visiblePendingKind(pendingInteractions.get(s.id)?.kind);
			return {
				id: s.id,
				title: sessionTitle(s),
				blank: s.blank,
				running: s.running,
				runningSubagentCount: descendants.get(s.id)?.runningCount ?? 0,
				completed: s.completed === true,
				hasActiveSchedule: hasActiveSchedule(s),
				updatedAt: s.updatedAt,
				...pendingInteraction === void 0 ? {} : { pendingInteraction }
			};
		}
		/**
		* Derive the workspace browser groups with every session as a top-level row.
		*
		* Every group shows; sessions populate under expanded groups in the selected
		* local order. Blank sessions are excluded except for the selected
		* provisional New Session row; archived sessions are excluded everywhere.
		* Content search lives outside this derivation
		* (see {@link deriveSearchResults}).
		* @param list - sessions list snapshot (`current` feeds containsCurrent).
		* @param workspaces - real workspaces in stable Host order.
		* @param archivedSessionIds - registry-global archive set.
		* @param pendingInteractions - pending UI interactions by Session.
		* @param view - local expansion arrays.
		* @returns group sections in render order.
		*/
		function deriveGroups(list, workspaces, archivedSessionIds, pendingInteractions, view) {
			const archived = new Set(archivedSessionIds);
			const expandedGroups = new Set(view.expandedGroups);
			const descendants = indexSubagentDescendants(list.byId);
			const currentGroup = list.current === void 0 ? void 0 : owningGroupKey(workspaces, list.current);
			const groups = [];
			for (const g of groupByWorkspace(list, workspaces, archived, view.ungroupedOrder)) {
				const expanded = expandedGroups.has(g.key);
				groups.push({
					key: g.key,
					workspaceId: g.workspaceId,
					cwd: g.cwd,
					createdAt: g.createdAt,
					label: g.label,
					sessionCount: g.sessions.length,
					expanded,
					containsCurrent: g.key === currentGroup,
					sessions: expanded ? g.sessions.map((session) => sessionNode(session, descendants, pendingInteractions)) : []
				});
			}
			return groups;
		}
		/**
		* Derive the flat session list ("In one list" mode): every session — fork
		* children included — as a top-level row, strictly newest-first. No grouping,
		* no parent/child adjacency. Content search lives outside this derivation
		* (see {@link deriveSearchResults}).
		* @param list - sessions list snapshot.
		* @param archivedSessionIds - registry-global archive set.
		* @param pendingInteractions - pending UI interactions by Session.
		* @returns flat rows in render order.
		*/
		function deriveFlat(list, archivedSessionIds, pendingInteractions) {
			const archived = new Set(archivedSessionIds);
			const descendants = indexSubagentDescendants(list.byId);
			const rows = [];
			for (const id of list.ids) {
				const s = list.byId[id];
				if (s === void 0 || !sessionVisible(s, list.current, archived)) continue;
				rows.push(s);
			}
			rows.sort(byRecency);
			return rows.map((session) => sessionNode(session, descendants, pendingInteractions));
		}
		/**
		* Merge immediate title/Workspace substring matches with ranked Host content
		* matches. Local rows lead newest-first, content-only rows retain backend
		* order, and duplicate sessions receive the backend snippet in place.
		* @param list - session metadata authority.
		* @param workspaces - Workspace membership and display labels.
		* @param query - caller text; surrounding whitespace is ignored.
		* @param archivedSessionIds - registry-global archive set (members never match).
		* @param pendingInteractions - pending UI interactions by Session.
		* @param content - ranked Host content-search page.
		* @param limit - protocol-owned maximum merged row count.
		* @returns bounded deduplicated flat rows and a refine-query hint bit.
		*/
		function deriveSearchResults(list, workspaces, query, archivedSessionIds, pendingInteractions, content, limit) {
			const q = query.trim().toLowerCase();
			if (q === "") return {
				items: [],
				hasMore: false
			};
			const archived = new Set(archivedSessionIds);
			const descendants = indexSubagentDescendants(list.byId);
			const workspaceBySession = /* @__PURE__ */ new Map();
			for (const workspace of workspaces) for (const sessionId of workspace.sessionIds) if (!workspaceBySession.has(sessionId)) workspaceBySession.set(sessionId, workspace.title);
			const labelOf = (summary) => workspaceBySession.get(summary.id) ?? workspaceLabel(summary.cwd);
			const contentBySession = /* @__PURE__ */ new Map();
			for (const item of content.items) if (!contentBySession.has(item.sessionId)) contentBySession.set(item.sessionId, item);
			const local = [];
			for (const id of list.ids) {
				const summary = list.byId[id];
				if (summary === void 0 || summary.blank || !sessionVisible(summary, list.current, archived)) continue;
				if (sessionTitle(summary).toLowerCase().includes(q) || labelOf(summary).toLowerCase().includes(q)) local.push(summary);
			}
			local.sort(byRecency);
			const ordered = [];
			const included = /* @__PURE__ */ new Set();
			const include = (summary) => {
				if (included.has(summary.id)) return;
				included.add(summary.id);
				ordered.push(summary);
			};
			for (const summary of local) include(summary);
			for (const item of content.items) {
				const summary = list.byId[item.sessionId];
				if (summary !== void 0 && !summary.blank && sessionVisible(summary, list.current, archived)) include(summary);
			}
			return {
				items: ordered.slice(0, limit).map((summary) => {
					const match = contentBySession.get(summary.id);
					const pendingInteraction = visiblePendingKind(pendingInteractions.get(summary.id)?.kind);
					return {
						id: summary.id,
						title: sessionTitle(summary),
						workspace: labelOf(summary),
						running: summary.running,
						runningSubagentCount: descendants.get(summary.id)?.runningCount ?? 0,
						...pendingInteraction === void 0 ? {} : { pendingInteraction },
						completed: summary.completed === true,
						hasActiveSchedule: hasActiveSchedule(summary),
						...match === void 0 ? {} : { snippet: match.snippet }
					};
				}),
				hasMore: content.hasMore || ordered.length > limit
			};
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-workspace/src/client/rows/Rows.module.css.mjs
		const css$2 = ".YDXeBa_projectRow,.YDXeBa_sessionRow{cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary);border-radius:8px;align-items:center;gap:6px;padding:0 8px;display:flex}.YDXeBa_projectRow:hover,.YDXeBa_sessionRow:hover,.YDXeBa_sessionRow.YDXeBa_selected{background:var(--dsw-alias-interactive-bg-hover)}.YDXeBa_searchResultRow{box-sizing:border-box;cursor:pointer;text-align:left;width:100%;min-height:48px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:8px;flex-direction:column;align-items:stretch;padding:4px 8px;display:flex}.YDXeBa_searchResultRow:hover,.YDXeBa_searchResultRow.YDXeBa_selected{background:var(--dsw-alias-interactive-bg-hover)}.YDXeBa_searchResultHeading{align-items:center;min-width:0;display:flex}.YDXeBa_searchResultTitle{text-overflow:ellipsis;white-space:nowrap;flex:0 auto;min-width:0;margin-left:4px;font-size:14px;line-height:20px;overflow:hidden}.YDXeBa_searchResultMeta{align-items:center;gap:6px;min-width:0;margin-left:20px;display:flex}.YDXeBa_searchResultWorkspace,.YDXeBa_searchResultSnippet{text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:17px;overflow:hidden}.YDXeBa_searchResultWorkspace{max-width:40%;color:var(--dsw-alias-label-tertiary);flex:none}.YDXeBa_searchResultSnippet{min-width:0;color:var(--dsw-alias-label-secondary);flex:1}.YDXeBa_projectRow{box-sizing:border-box;align-items:center;height:34px}.YDXeBa_projectRow .YDXeBa_rowActions{height:20px}.YDXeBa_sessionRow{height:32px;animation:YDXeBa_row-in .15s var(--ds-ease-in-out);gap:0}.YDXeBa_sessionRow .YDXeBa_title{margin:0 6px 0 4px}.YDXeBa_flatSessionRowWithoutStatus .YDXeBa_title{margin-left:0}@keyframes YDXeBa_row-in{0%{opacity:0}}.YDXeBa_slot{width:16px;height:20px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}.YDXeBa_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.YDXeBa_folderActive{color:var(--dsw-alias-state-business-primary)}.YDXeBa_projectRow .YDXeBa_chevron{display:none}.YDXeBa_projectRow:hover .YDXeBa_chevron{display:inline-flex}.YDXeBa_projectRow:hover .YDXeBa_folder{display:none}.YDXeBa_arrow{transition:transform .15s var(--ds-ease-in-out)}.YDXeBa_arrowOpen{transform:rotate(90deg)}.YDXeBa_projectText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.YDXeBa_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;line-height:20px;overflow:hidden}.YDXeBa_renameInput{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-button-elevated-fill);min-width:0;color:inherit;border-radius:4px;outline:none;padding:0 2px;font-size:14px;line-height:20px}.YDXeBa_sessionRow .YDXeBa_title{flex:1}.YDXeBa_meta{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;overflow:hidden}.YDXeBa_time{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px;line-height:20px}.YDXeBa_scheduleIndicator{width:16px;height:20px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex}.YDXeBa_searchScheduleIndicator{margin-left:4px;margin-right:0}.YDXeBa_dot{flex:none}.YDXeBa_rowActions{flex:none;align-items:center;gap:12px;display:none}.YDXeBa_projectRow:hover .YDXeBa_rowActions,.YDXeBa_sessionRow:hover .YDXeBa_rowActions,.YDXeBa_projectRow.YDXeBa_menuOpen .YDXeBa_rowActions,.YDXeBa_sessionRow.YDXeBa_menuOpen .YDXeBa_rowActions{display:inline-flex}.YDXeBa_sessionRow:hover .YDXeBa_time,.YDXeBa_sessionRow.YDXeBa_menuOpen .YDXeBa_time{display:none}.YDXeBa_projectRow.YDXeBa_menuOpen,.YDXeBa_sessionRow.YDXeBa_menuOpen{background:var(--dsw-alias-interactive-bg-hover)}.YDXeBa_sessionRow.YDXeBa_dropBefore,.YDXeBa_sessionRow.YDXeBa_dropAfter{position:relative}.YDXeBa_sessionRow.YDXeBa_dropBefore:before,.YDXeBa_sessionRow.YDXeBa_dropAfter:after{content:\"\";z-index:1;background:linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat, linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat, linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;pointer-events:none;height:12px;position:absolute;left:0;right:4px}.YDXeBa_sessionRow.YDXeBa_dropBefore:before{top:-7px}.YDXeBa_sessionRow.YDXeBa_dropAfter:after{bottom:-7px}.YDXeBa_hoverContent{flex-direction:column;gap:8px;display:flex}.YDXeBa_hoverTitle{color:#fff;overflow-wrap:break-word;font-size:14px;line-height:20px}.YDXeBa_hoverPath{color:#cfd3d6;word-break:break-all;font-size:12px;line-height:16px}.YDXeBa_hoverTime{color:#cfd3d6;font-size:12px;line-height:16px}.YDXeBa_hoverStatus{color:#adb2b8;align-items:center;gap:8px;font-size:12px;line-height:20px;display:flex}.YDXeBa_iconButton{cursor:pointer;width:16px;height:16px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.YDXeBa_iconButton:hover{color:var(--dsw-alias-label-primary)}.YDXeBa_chevron{color:var(--dsw-alias-label-caption)}@media (prefers-reduced-motion:reduce){.YDXeBa_sessionRow,.YDXeBa_arrow{transition:none;animation:none}}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-workspace/Rows.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var Rows_module_css_default = {
			"arrow": "YDXeBa_arrow",
			"arrowOpen": "YDXeBa_arrowOpen",
			"chevron": "YDXeBa_chevron",
			"dot": "YDXeBa_dot",
			"dropAfter": "YDXeBa_dropAfter",
			"dropBefore": "YDXeBa_dropBefore",
			"flatSessionRowWithoutStatus": "YDXeBa_flatSessionRowWithoutStatus",
			"folder": "YDXeBa_folder",
			"folderActive": "YDXeBa_folderActive",
			"hoverContent": "YDXeBa_hoverContent",
			"hoverPath": "YDXeBa_hoverPath",
			"hoverStatus": "YDXeBa_hoverStatus",
			"hoverTime": "YDXeBa_hoverTime",
			"hoverTitle": "YDXeBa_hoverTitle",
			"iconButton": "YDXeBa_iconButton",
			"menuOpen": "YDXeBa_menuOpen",
			"meta": "YDXeBa_meta",
			"projectRow": "YDXeBa_projectRow",
			"projectText": "YDXeBa_projectText",
			"renameInput": "YDXeBa_renameInput",
			"row-in": "YDXeBa_row-in",
			"rowActions": "YDXeBa_rowActions",
			"scheduleIndicator": "YDXeBa_scheduleIndicator",
			"searchResultHeading": "YDXeBa_searchResultHeading",
			"searchResultMeta": "YDXeBa_searchResultMeta",
			"searchResultRow": "YDXeBa_searchResultRow",
			"searchResultSnippet": "YDXeBa_searchResultSnippet",
			"searchResultTitle": "YDXeBa_searchResultTitle",
			"searchResultWorkspace": "YDXeBa_searchResultWorkspace",
			"searchScheduleIndicator": "YDXeBa_searchScheduleIndicator",
			"selected": "YDXeBa_selected",
			"sessionRow": "YDXeBa_sessionRow",
			"slot": "YDXeBa_slot",
			"time": "YDXeBa_time",
			"title": "YDXeBa_title",
			"visuallyHidden": "YDXeBa_visuallyHidden"
		};
		//#endregion
		//#region lib/types/client/rows/Rows.js
		/**
		* Workspace browser tree row components (figma Cell set 14:3080): pure presentational —
		* all data and callbacks arrive via props. Hover swaps (folder->chevron,
		* time->ellipsis, action buttons) are CSS-only. Row ... menus are visual-only
		* except workspace Rename/Delete and session Rename/Fork/Archive; the session
		* and workspace hover cards are suppressed while a menu is open.
		*/
		/** Row display title: blank rows show the localized New Session label. */
		function displayTitle(node, t) {
			return node.blank ? t("session.new") : node.title;
		}
		/** Localized compact relative time ("刚刚"/"5分钟" in zh, "now"/"5min" in en). */
		function timeLabel(updatedAt, now, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, now);
			return unit === "now" ? t("time.now") : t(`time.${unit}`, { n });
		}
		/** Hover-card variant: distances wrap in the ago template; the now bucket stays bare (no "now ago"). */
		function hoverTimeLabel(updatedAt, now, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, now);
			return unit === "now" ? t("time.now") : t("time.ago", { t: t(`time.${unit}`, { n }) });
		}
		/**
		* Absolute creation time through the dictionary's date template (the message
		* clock pattern): `toLocaleString` would follow the browser language, not the
		* app locale, and produce mixed-language text after a switch.
		*/
		function createdLabel(createdAt, t) {
			const d = new Date(createdAt);
			const pad2 = (v) => String(v).padStart(2, "0");
			return t("hover.created", { time: `${t("date.ymd", {
				y: d.getFullYear(),
				m: d.getMonth() + 1,
				d: d.getDate()
			})} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` });
		}
		/** Hover-card body: workspace title, display directory path, absolute creation time. */
		function WorkspaceHoverContent({ label, cwd, createdAt, t }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				className: Rows_module_css_default.hoverContent,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTitle,
						children: label
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverPath,
						children: cwd
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTime,
						children: createdLabel(createdAt, t)
					})
				]
			});
		}
		/** Pointer-position half of a row (insert line above or below). */
		function rowHalf(e) {
			const rect = e.currentTarget.getBoundingClientRect();
			return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
		}
		/**
		* Project (workspace) header row: folder + title;
		* hover reveals the chevron and create button, and dwelling on a real
		* Workspace shows its hover card (the ungrouped bucket has none).
		* `containsCurrent` arrives on the node (derivation fact, no renderer scan).
		* @param props.group - derived group node.
		* @param props.onToggle - expand/collapse the group.
		* @param props.onCreate - start a frontend Session inside this Workspace.
		* @param props.drag - optional workspace-row drag wiring.
		* @param props.home - host account home for POSIX hover-path abbreviation.
		* @param props.t - the browser root's locale seat.
		* @returns the row element.
		*/
		function ProjectRowItem({ group, onToggle, onCreate, actions, drag, home, t }) {
			const row = group;
			const label = row.workspaceId === void 0 ? t("group.ungrouped") : row.label;
			const active = group.expanded && group.containsCurrent;
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const workspaceMenuItems = [{
				id: "rename",
				label: t("rename"),
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
			}, {
				id: "delete",
				label: t("delete.workspace"),
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
				danger: true
			}];
			const ownRow = (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(Rows_module_css_default.projectRow, menuOpen && Rows_module_css_default.menuOpen),
				role: "treeitem",
				"aria-expanded": row.expanded,
				onClick: onToggle,
				draggable: drag !== void 0,
				onDragStart: drag === void 0 ? void 0 : (e) => {
					e.dataTransfer.effectAllowed = "move";
					e.dataTransfer.setData("text/plain", row.key);
					drag.start();
				},
				onDragEnd: drag?.end,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.folder, active && Rows_module_css_default.folderActive),
						children: row.expanded ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, {})
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.chevron),
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTriangleRightFill14, { className: clsx(Rows_module_css_default.arrow, row.expanded && Rows_module_css_default.arrowOpen) })
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.projectText,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.title,
							children: label
						})
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						className: Rows_module_css_default.rowActions,
						children: [actions !== void 0 && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							onClose: () => {
								setMenuOpen(false);
							},
							items: workspaceMenuItems,
							onSelect: (id) => {
								setMenuOpen(false);
								/* v8 ignore next -- Menu can emit only the rename and delete rows supplied above. */
								if (id !== "rename" && id !== "delete") return;
								if (id === "rename") actions.rename();
								else actions.delete();
							},
							portal: true,
							closeOnPointerLeave: true,
							anchor: (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Rows_module_css_default.iconButton,
								"aria-label": t("actions.workspace.aria", { name: label }),
								onClick: (e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {})
							})
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Rows_module_css_default.iconButton,
							"aria-label": t("actions.newSession.aria", { name: label }),
							onClick: (e) => {
								e.stopPropagation();
								onCreate();
							},
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
						})]
					})
				]
			});
			if (row.createdAt === void 0) return ownRow;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
				anchor: ownRow,
				content: (0, react_jsx_runtime.jsx)(WorkspaceHoverContent, {
					label: row.label,
					cwd: row.cwd === void 0 ? void 0 : abbreviateHomePath(row.cwd, home),
					createdAt: row.createdAt,
					t
				}),
				disabled: menuOpen,
				copyText: row.cwd,
				copyLabel: t("copy"),
				copiedLabel: t("hover.copied")
			});
		}
		/* v8 ignore next 3 -- closed-union backstop; only reached if the status is forged */
		function assertNever(value) {
			throw new Error(`unknown pending interaction: ${String(value)}`);
		}
		/**
		* Session status presentation; pending interaction is primary and live activity
		* outranks completion reminders.
		*/
		function sessionStatuses(node, t) {
			const subagents = node.runningSubagentCount === 0 ? void 0 : {
				state: "ongoing",
				label: t(node.runningSubagentCount === 1 ? "status.subagentsRunning.one" : "status.subagentsRunning.other", { n: node.runningSubagentCount })
			};
			let pending;
			switch (node.pendingInteraction) {
				case "approval":
					pending = {
						state: "warning",
						label: t("status.waitingApproval")
					};
					break;
				case "plan-review":
					pending = {
						state: "warning",
						label: t("status.planReview")
					};
					break;
				case "question":
					pending = {
						state: "warning",
						label: t("status.waitingAnswer")
					};
					break;
				case void 0: break;
				/* v8 ignore next -- closed PendingInteractionStatus union */
				default: return assertNever(node.pendingInteraction);
			}
			if (pending !== void 0) return subagents === void 0 ? [pending] : [pending, subagents];
			if (node.running) {
				const primary = {
					state: "ongoing",
					label: t("status.running")
				};
				return subagents === void 0 ? [primary] : [primary, subagents];
			}
			if (subagents !== void 0) return [subagents];
			if (node.completed) return [{
				state: "done",
				label: t("status.completed")
			}];
			return [{
				state: "done",
				label: t("status.idle")
			}];
		}
		/** Primary status dot plus every status's screen-reader label, shared by the search and session rows. */
		function SessionStatusDots({ statuses }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: statuses[0].state }), statuses.map((status) => (0, react_jsx_runtime.jsx)("span", {
				className: Rows_module_css_default.visuallyHidden,
				children: status.label
			}, status.label))] });
		}
		/** Non-interactive active-Schedule marker; the enclosing row remains the only action. */
		function ActiveScheduleIndicator({ t, search = false }) {
			const label = t("schedule.active");
			return (0, react_jsx_runtime.jsx)("span", {
				className: clsx(Rows_module_css_default.scheduleIndicator, search && Rows_module_css_default.searchScheduleIndicator),
				role: "img",
				"aria-label": label,
				title: label,
				children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAlarmClockOutline16, {})
			});
		}
		/** Hover-card body: full title, relative time, and every relevant live status. */
		function SessionHoverContent({ node, now, t }) {
			const statuses = sessionStatuses(node, t);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: Rows_module_css_default.hoverContent,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTitle,
						children: displayTitle(node, t)
					}),
					!node.blank && (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTime,
						children: hoverTimeLabel(node.updatedAt, now, t)
					}),
					statuses.map((status) => (0, react_jsx_runtime.jsxs)("div", {
						className: Rows_module_css_default.hoverStatus,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.state }), (0, react_jsx_runtime.jsx)("span", { children: status.label })]
					}, status.label))
				]
			});
		}
		/**
		* One flat search result: title, Workspace context, and optional content
		* excerpt. Search navigation opens the session only; it does not address an
		* event inside the conversation.
		* @param props.result - merged local/content search row.
		* @param props.currentId - selected session id.
		* @param props.onOpen - open the selected session.
		* @param props.t - Workspace-browser translation seat.
		* @returns the result button.
		*/
		function SearchResultItem({ result, currentId, onOpen, t }) {
			const selected = result.id === currentId;
			const statuses = sessionStatuses(result, t);
			const primaryStatus = statuses[0];
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: clsx(Rows_module_css_default.searchResultRow, selected && Rows_module_css_default.selected),
				role: "treeitem",
				"aria-selected": selected,
				onClick: () => {
					onOpen(result.id);
				},
				children: [(0, react_jsx_runtime.jsxs)("span", {
					className: Rows_module_css_default.searchResultHeading,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.slot,
							children: (primaryStatus.state !== "done" || result.completed) && (0, react_jsx_runtime.jsx)(SessionStatusDots, { statuses })
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.searchResultTitle,
							children: result.title
						}),
						result.hasActiveSchedule && (0, react_jsx_runtime.jsx)(ActiveScheduleIndicator, {
							t,
							search: true
						})
					]
				}), (0, react_jsx_runtime.jsxs)("span", {
					className: Rows_module_css_default.searchResultMeta,
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.searchResultWorkspace,
						children: result.workspace || t("group.ungrouped")
					}), result.snippet !== void 0 && (0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.searchResultSnippet,
						children: result.snippet
					})]
				})]
			});
		}
		/**
		* One top-level 34px session row: status dot (pending user interaction outranks
		* own or descendant activity), title, relative time, and the row actions menu.
		* @param props.node - derived session node.
		* @param props.currentId - selected session id (row highlight).
		* @param props.now - epoch ms for relative-time formatting.
		* @param props.onOpen - open a session by id.
		* @param props.onRename - open the session rename dialog (id + current title).
		* @param props.onFork - fork a session at its last completed turn.
		* @param props.onArchive - archive a session by id.
		* @param props.onReveal - scroll this row into view after search navigation, then acknowledge it.
		* @param props.drag - optional draggable-row wiring.
		* @param props.flat - omit the empty status slot in the hierarchy-free flat list.
		* @param props.t - the browser root's locale seat.
		* @returns the session row.
		*/
		function SessionNodeItem({ node, currentId, now, onOpen, onRename, onFork, onArchive, onReveal, drag, flat = false, t }) {
			const row = node;
			const title = displayTitle(node, t);
			const selected = node.id === currentId;
			const statuses = sessionStatuses(node, t);
			const showStatus = statuses[0].state !== "done" || row.completed;
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const rowRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (onReveal === void 0) return;
				rowRef.current?.scrollIntoView({ block: "nearest" });
				onReveal();
			}, [onReveal]);
			const sessionMenuItems = [
				{
					id: "rename",
					label: t("rename"),
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
				},
				{
					id: "fork",
					label: t("menu.fork"),
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
				},
				{
					id: "archive",
					label: t("menu.archiveSession"),
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutline20, { size: 16 })
				}
			];
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
				anchor: (0, react_jsx_runtime.jsxs)("div", {
					ref: rowRef,
					className: clsx(Rows_module_css_default.sessionRow, selected && Rows_module_css_default.selected, menuOpen && Rows_module_css_default.menuOpen, flat && !showStatus && Rows_module_css_default.flatSessionRowWithoutStatus, drag?.marker === "before" && Rows_module_css_default.dropBefore, drag?.marker === "after" && Rows_module_css_default.dropAfter),
					role: "treeitem",
					"aria-selected": selected,
					onClick: () => {
						onOpen(node.id);
					},
					draggable: drag !== void 0,
					onDragStart: drag === void 0 ? void 0 : (e) => {
						e.dataTransfer.effectAllowed = "move";
						e.dataTransfer.setData("text/plain", node.id);
						drag.start();
					},
					onDragEnd: drag?.end,
					onDragOver: drag === void 0 ? void 0 : (e) => {
						if (!drag.active) return;
						e.preventDefault();
						e.dataTransfer.dropEffect = "move";
						drag.hover(rowHalf(e));
					},
					onDrop: drag === void 0 ? void 0 : (e) => {
						if (!drag.active) return;
						e.preventDefault();
						drag.drop(rowHalf(e));
					},
					children: [
						(!flat || showStatus) && (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.slot,
							children: showStatus && (0, react_jsx_runtime.jsx)(SessionStatusDots, { statuses })
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.title,
							children: title
						}),
						row.hasActiveSchedule && (0, react_jsx_runtime.jsx)(ActiveScheduleIndicator, { t }),
						!row.blank && (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.time,
							children: timeLabel(row.updatedAt, now, t)
						}),
						!row.blank && (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.rowActions,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: menuOpen,
								onClose: () => {
									setMenuOpen(false);
								},
								items: sessionMenuItems,
								onSelect: (id) => {
									setMenuOpen(false);
									if (id === "rename") onRename(node.id, row.title);
									if (id === "fork") onFork(node.id);
									if (id === "archive") onArchive(node.id);
								},
								portal: true,
								closeOnPointerLeave: true,
								anchor: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Rows_module_css_default.iconButton,
									"aria-label": t("actions.session.aria", { name: title }),
									onClick: (e) => {
										e.stopPropagation();
										setMenuOpen((v) => !v);
									},
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {})
								})
							})
						})
					]
				}),
				content: (0, react_jsx_runtime.jsx)(SessionHoverContent, {
					node,
					now,
					t
				}),
				disabled: menuOpen || drag?.active === true,
				copyText: row.blank ? void 0 : row.title,
				copyLabel: t("copy"),
				copiedLabel: t("hover.copied")
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-workspace/src/client/WorkspacePicker.module.css.mjs
		const css$1 = "._G5b-a_modalAction{min-width:72px}._G5b-a_modalError,._G5b-a_menuStatus{margin-top:8px;font-size:12px;line-height:18px}._G5b-a_modalError{color:var(--dsw-alias-state-error-primary)}._G5b-a_menuStatus{color:var(--dsw-alias-label-secondary)}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-workspace/WorkspacePicker.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var WorkspacePicker_module_css_default = {
			"menuStatus": "_G5b-a_menuStatus",
			"modalAction": "_G5b-a_modalAction",
			"modalError": "_G5b-a_modalError"
		};
		//#endregion
		//#region lib/types/client/WorkspacePicker.js
		const ADD_WORKSPACE = "::add-workspace";
		/**
		* Render the pick menu plus the adoption error dialog.
		* @param props - owner-controlled flow props.
		* @returns menu + dialog elements.
		*/
		function WorkspacePickFlow({ t, open, anchorRef, useWorkspaces, createWorkspace, useDirectoryFlow, renderDirectoryFlow, onPick, onClose, addOnly = false, side = "bottom", selectedId }) {
			const workspaceSnapshot = useWorkspaces((state) => state);
			const workspaces = workspaceSnapshot.items;
			const getAnchorRect = (0, react.useCallback)(() => anchorRef?.current?.getBoundingClientRect() ?? null, [anchorRef]);
			const [errorOpen, setErrorOpen] = (0, react.useState)(false);
			const [modalError, setModalError] = (0, react.useState)(null);
			const [flowOpen, setFlowOpen] = (0, react.useState)(false);
			const [pickingFolder, setPickingFolder] = (0, react.useState)(false);
			const flowBusy = flowOpen || pickingFolder;
			const flowAvailable = useDirectoryFlow((occupied) => occupied);
			(0, react.useEffect)(() => {
				if (flowOpen && !flowAvailable) setFlowOpen(false);
			}, [flowOpen, flowAvailable]);
			const addEntries = flowAvailable ? [{
				id: ADD_WORKSPACE,
				label: t("menu.addWorkspace"),
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 }),
				disabled: flowBusy
			}] : [];
			const pinAdd = !addOnly && workspaces.length > 0;
			const items = pinAdd ? workspaces.map((workspace) => ({
				id: workspace.workspaceId,
				label: workspace.title,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 16 }),
				disabled: flowBusy
			})) : addEntries;
			const menuIsEmpty = items.length === 0;
			const closeModal = () => {
				setErrorOpen(false);
				setModalError(null);
			};
			/** Adopt a picked directory; failures land in the folder-error dialog (Choose again reopens the flow). */
			const adoptDirectory = (path) => createWorkspace({ path }).then((workspace) => {
				setFlowOpen(false);
				onPick(workspace.workspaceId);
			}).catch((reason) => {
				setModalError(reason instanceof Error ? reason.message : String(reason));
				setFlowOpen(false);
				setErrorOpen(true);
			});
			const openDirectoryFlow = (0, react.useCallback)(() => {
				onClose();
				setErrorOpen(false);
				setModalError(null);
				setFlowOpen(true);
			}, [onClose]);
			const listSettled = addOnly || workspaceSnapshot.phase === "ready";
			const addIsTheOnlyEntry = !pinAdd && listSettled && addEntries.length === 1;
			(0, react.useEffect)(() => {
				if (open && addIsTheOnlyEntry && !flowBusy) openDirectoryFlow();
			}, [
				open,
				addIsTheOnlyEntry,
				flowBusy,
				openDirectoryFlow
			]);
			/** Owner side of the flow conversation: adopt keeps the flow open (busy) until the Host answers. */
			const flowOwner = {
				open: flowOpen,
				busy: pickingFolder,
				onPicked: (path) => {
					setPickingFolder(true);
					adoptDirectory(path).finally(() => {
						setPickingFolder(false);
					});
				},
				onCancel: () => {
					setFlowOpen(false);
				},
				onError: (message) => {
					setFlowOpen(false);
					setModalError(message);
					setErrorOpen(true);
				}
			};
			const handleSelect = (id) => {
				if (id === ADD_WORKSPACE) {
					openDirectoryFlow();
					return;
				}
				onPick(id);
			};
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: open && !addIsTheOnlyEntry && !menuIsEmpty,
					anchor: null,
					items,
					...pinAdd ? { footer: addEntries } : {},
					selectedId,
					onSelect: handleSelect,
					onClose,
					side,
					portal: true,
					getAnchorRect
				}),
				open && !addIsTheOnlyEntry && !menuIsEmpty && workspaceSnapshot.phase === "pending" && (0, react_jsx_runtime.jsx)("div", {
					className: WorkspacePicker_module_css_default.menuStatus,
					role: "status",
					children: t("picker.loading")
				}),
				renderDirectoryFlow(flowOwner),
				(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: errorOpen,
					onClose: closeModal,
					closeLabel: t("close"),
					title: t("folderError.title"),
					footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						className: WorkspacePicker_module_css_default.modalAction,
						onClick: closeModal,
						children: t("cancel")
					}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						className: WorkspacePicker_module_css_default.modalAction,
						disabled: !flowAvailable,
						onClick: openDirectoryFlow,
						children: t("folderError.retry")
					})] }),
					children: (0, react_jsx_runtime.jsx)("div", {
						className: WorkspacePicker_module_css_default.modalError,
						role: "alert",
						children: modalError
					})
				})
			] });
		}
		/**
		* The conversation empty-state registration: adapts the owner share to the
		* core flow (all state and semantics live in the flow / the owner).
		* @param props - empty-state slot props (owner share + injected creation callback).
		* @returns the flow element.
		*/
		function WorkspacePicker({ open, anchorRef, useWorkspaces, selectedId, onPick, onClose, createWorkspace, useDirectoryFlow, renderSlot, t }) {
			return (0, react_jsx_runtime.jsx)(WorkspacePickFlow, {
				t,
				open,
				anchorRef,
				useWorkspaces,
				createWorkspace,
				useDirectoryFlow,
				renderDirectoryFlow: (owner) => renderSlot("conversation.hero.workspace.directoryFlow", owner),
				selectedId,
				onPick,
				onClose
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.module.css.mjs
		const css = ".bhn1Oq_root{--dsh-session-list-edge-inset:var(--dsh-sidebar-inline-padding);--dsh-session-list-scrollbar-width:8px;--dsh-session-list-scrollbar-offset:2px;box-sizing:border-box;min-height:0;padding-right:var(--dsh-session-list-edge-inset);flex-direction:column;flex:1;display:flex}.bhn1Oq_root.bhn1Oq_rail{padding-right:0}.bhn1Oq_iconButton{corner-shape:round;cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.bhn1Oq_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.bhn1Oq_sectionHeader{box-sizing:border-box;height:36px;color:var(--dsw-alias-label-tertiary);border-radius:12px;flex:none;justify-content:flex-end;align-items:center;gap:4px;margin-bottom:4px;padding-left:4px;display:flex;overflow:hidden}.bhn1Oq_root:not(.bhn1Oq_rail) .bhn1Oq_sectionHeader{margin-top:2px;margin-right:-4px}.bhn1Oq_sectionLabel{white-space:nowrap;opacity:1;visibility:visible;min-width:0;max-width:45%;transition:max-width .18s var(--ds-ease-in-out), margin-right .18s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out), transform .18s var(--ds-ease-in-out), visibility 0s linear;flex:none;line-height:20px;overflow:hidden}.bhn1Oq_sectionLabelHidden{opacity:0;visibility:hidden;max-width:0;margin-right:-4px;transition-delay:0s,0s,0s,0s,.18s;transform:translate(-4px)}.bhn1Oq_searchSlot{box-sizing:border-box;min-width:0;max-width:28px;transition:max-width .18s var(--ds-ease-in-out), padding-left .18s var(--ds-ease-in-out);flex:1;align-items:center;margin-left:auto;padding-left:0;display:flex}.bhn1Oq_searchSlotExpanded{max-width:100%;padding-left:0}.bhn1Oq_headerActions{opacity:1;visibility:visible;max-width:60px;transition:max-width .18s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out), transform .18s var(--ds-ease-in-out), visibility 0s linear;flex:none;align-items:center;gap:4px;display:flex;overflow:hidden}.bhn1Oq_headerActionsHidden{opacity:0;visibility:hidden;pointer-events:none;max-width:0;transition-delay:0s,0s,0s,.18s;transform:translate(4px)}.bhn1Oq_search{box-sizing:border-box;corner-shape:round;cursor:text;width:100%;height:28px;color:var(--dsw-alias-label-secondary);transition:width .18s var(--ds-ease-in-out), padding .18s var(--ds-ease-in-out), border-color .18s var(--ds-ease-in-out), background-color .18s var(--ds-ease-in-out);background:0 0;border:none;border-radius:50%;flex:none;align-items:center;gap:0;margin:0;padding:0;display:flex;overflow:hidden}.bhn1Oq_searchExpanded{border:.5px solid var(--dsw-alias-border-l4);width:calc(100% + 4px);height:30px;color:var(--dsw-alias-label-caption);background:0 0;border-radius:10px;margin-inline:-2px;padding:0 4px 0 0}.bhn1Oq_searchButton{corner-shape:round;cursor:pointer;width:28px;height:28px;color:inherit;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.bhn1Oq_searchExpanded .bhn1Oq_searchButton{width:28px;height:30px}.bhn1Oq_searchButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.bhn1Oq_searchExpanded .bhn1Oq_searchButton:hover{background:0 0}.bhn1Oq_searchInput{opacity:0;pointer-events:none;width:0;min-width:0;color:var(--dsw-alias-label-primary);transition:opacity .12s var(--ds-ease-in-out);background:0 0;border:none;outline:none;flex:1;font-size:13px;line-height:18px}.bhn1Oq_searchExpanded .bhn1Oq_searchInput{opacity:1;pointer-events:auto;margin-left:-2px}.bhn1Oq_searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}.bhn1Oq_clearButton{corner-shape:round;cursor:pointer;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.bhn1Oq_clearButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.bhn1Oq_rail .bhn1Oq_sectionHeader{justify-content:flex-start;gap:0;margin-bottom:12px;padding-left:0}.bhn1Oq_rail .bhn1Oq_headerActions{max-width:none}.bhn1Oq_rail .bhn1Oq_iconButton{width:36px;height:36px;color:var(--dsw-alias-label-primary)}.bhn1Oq_rail .bhn1Oq_search{background:0 0;border-color:#0000;gap:0;width:36px;height:36px;margin:0 0 12px;padding:0}.bhn1Oq_rail .bhn1Oq_searchButton{width:36px;height:36px;color:var(--dsw-alias-label-primary)}.bhn1Oq_rail .bhn1Oq_searchButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.bhn1Oq_listArea{min-height:0;margin-left:-4px;margin-right:calc(-1 * var(--dsh-session-list-edge-inset));flex-direction:column;flex:1;padding-left:4px;display:flex;overflow:visible}.bhn1Oq_rail .bhn1Oq_listArea{margin-left:0;margin-right:0;padding-left:0}.bhn1Oq_treeBody{flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.bhn1Oq_fade{left:0;right:var(--dsh-session-list-edge-inset);background:linear-gradient(to bottom, transparent, var(--dsw-specific-sidebar-fill));pointer-events:none;height:24px;position:absolute;bottom:0}.bhn1Oq_wide{animation:bhn1Oq_wide-in .2s var(--ds-ease-in-out)}@keyframes bhn1Oq_wide-in{0%{opacity:0}}.bhn1Oq_list{min-height:0;margin-left:-4px;margin-right:var(--dsh-session-list-scrollbar-offset);padding-left:4px;padding-right:calc(var(--dsh-session-list-edge-inset) - var(--dsh-session-list-scrollbar-width) - var(--dsh-session-list-scrollbar-offset));scrollbar-gutter:stable;flex:1;padding-bottom:16px;overflow-y:auto}.bhn1Oq_flatList>*+*,.bhn1Oq_searchTree>[role=treeitem]+[role=treeitem],.bhn1Oq_groupSection>*+*{margin-top:2px}.bhn1Oq_searchStatus,.bhn1Oq_searchWarning{color:var(--dsw-alias-label-tertiary);padding:10px 12px;font-size:12px;line-height:18px}.bhn1Oq_searchWarning{color:var(--dsw-alias-label-secondary)}.bhn1Oq_groupSection{position:relative}.bhn1Oq_groupSection+.bhn1Oq_groupSection{margin-top:4px}.bhn1Oq_listTopDropIndicator,.bhn1Oq_workspaceDropBefore:before,.bhn1Oq_workspaceDropAfter:after{content:\"\";z-index:1;background:linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat, linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat, linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;pointer-events:none;height:12px;position:absolute;left:0;right:0}.bhn1Oq_listTopDropIndicator{top:-8px;left:0;right:var(--dsh-session-list-edge-inset)}.bhn1Oq_listTopDropActive>.bhn1Oq_workspaceDropBefore:first-child:before{display:none}.bhn1Oq_workspaceDropBefore:before{top:-8px}.bhn1Oq_workspaceDropAfter:after{bottom:-8px}.bhn1Oq_sessionOverflowButton{cursor:pointer;text-align:left;width:100%;height:28px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:8px;padding:0 12px 0 28px;font-size:12px}.bhn1Oq_groupSection>.bhn1Oq_sessionOverflowButton{margin-top:0}.bhn1Oq_sessionOverflowButton:hover{color:var(--dsw-alias-label-secondary);background:0 0}.bhn1Oq_empty{color:var(--dsw-alias-label-tertiary);padding:16px 12px;font-size:13px}.bhn1Oq_renameInput{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);width:100%;height:44px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:22px;outline:none;padding:7px 14px;font-size:14px;font-weight:400;line-height:22px}.bhn1Oq_renameInput:disabled{color:var(--dsw-alias-label-dimmed)}.bhn1Oq_renameError{color:var(--dsw-alias-state-error-primary);margin-top:8px;font-size:12px;line-height:18px}.bhn1Oq_deleteAction:not(:disabled){color:var(--dsw-alias-state-error-primary)}.bhn1Oq_deleteStatus{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}@media (prefers-reduced-motion:reduce){.bhn1Oq_wide{animation:none}.bhn1Oq_search,.bhn1Oq_sectionLabel,.bhn1Oq_searchSlot,.bhn1Oq_searchInput,.bhn1Oq_headerActions{transition:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-workspace/WorkspaceBrowser.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var WorkspaceBrowser_module_css_default = {
			"clearButton": "bhn1Oq_clearButton",
			"deleteAction": "bhn1Oq_deleteAction",
			"deleteStatus": "bhn1Oq_deleteStatus",
			"empty": "bhn1Oq_empty",
			"fade": "bhn1Oq_fade",
			"flatList": "bhn1Oq_flatList",
			"groupSection": "bhn1Oq_groupSection",
			"headerActions": "bhn1Oq_headerActions",
			"headerActionsHidden": "bhn1Oq_headerActionsHidden",
			"iconButton": "bhn1Oq_iconButton",
			"list": "bhn1Oq_list",
			"listArea": "bhn1Oq_listArea",
			"listTopDropActive": "bhn1Oq_listTopDropActive",
			"listTopDropIndicator": "bhn1Oq_listTopDropIndicator",
			"rail": "bhn1Oq_rail",
			"renameError": "bhn1Oq_renameError",
			"renameInput": "bhn1Oq_renameInput",
			"root": "bhn1Oq_root",
			"search": "bhn1Oq_search",
			"searchButton": "bhn1Oq_searchButton",
			"searchExpanded": "bhn1Oq_searchExpanded",
			"searchInput": "bhn1Oq_searchInput",
			"searchSlot": "bhn1Oq_searchSlot",
			"searchSlotExpanded": "bhn1Oq_searchSlotExpanded",
			"searchStatus": "bhn1Oq_searchStatus",
			"searchTree": "bhn1Oq_searchTree",
			"searchWarning": "bhn1Oq_searchWarning",
			"sectionHeader": "bhn1Oq_sectionHeader",
			"sectionLabel": "bhn1Oq_sectionLabel",
			"sectionLabelHidden": "bhn1Oq_sectionLabelHidden",
			"sessionOverflowButton": "bhn1Oq_sessionOverflowButton",
			"treeBody": "bhn1Oq_treeBody",
			"wide": "bhn1Oq_wide",
			"wide-in": "bhn1Oq_wide-in",
			"workspaceDropAfter": "bhn1Oq_workspaceDropAfter",
			"workspaceDropBefore": "bhn1Oq_workspaceDropBefore"
		};
		//#endregion
		//#region lib/types/client/rows/WorkspaceBrowser.js
		/**
		* The workspace/session browsing region filling the sidebar shell's
		* `sidebar.workspaces` hole: section header (title + view options + add
		* workspace), search, the grouped tree or flat list, and the workspace
		* dialogs. Wide state renders the full browser; rail state renders the two
		* region icons (search / add workspace) as 36px controls on the shell's shared
		* rail entry path, each requesting expansion through the owner share. Adding
		* is the header button's one action, so it raises the directory flow with no
		* menu in between; the flow and its error dialog live in WorkspacePicker
		* (same package — direct composition, no slot between them).
		*/
		/**
		* Column slide length (--ds-transition-duration-slow): rail-search focus waits it out —
		* focus() forces a synchronous layout and would jank the slide.
		*/
		const EXPAND_SLIDE_MS = 300;
		/** Pause between the latest keystroke and a Host content-search request. */
		const SEARCH_DEBOUNCE_MS = 250;
		/** `session.search` wire bound, measured in JavaScript UTF-16 code units. */
		const SEARCH_QUERY_MAX_CODE_UNITS = 500;
		/** Session rows visible per Workspace before the local overflow control. */
		const COLLAPSED_SESSION_LIMIT = 5;
		/** Fold one Workspace without charging its provisional New Session against the ordinary-row limit. */
		function collapsedSessionRows(sessions) {
			let ordinaryCount = 0;
			const rows = sessions.filter((session) => {
				if (session.blank) return true;
				if (ordinaryCount >= COLLAPSED_SESSION_LIMIT) return false;
				ordinaryCount += 1;
				return true;
			});
			return {
				rows,
				hiddenCount: sessions.length - rows.length
			};
		}
		/** Keep controlled input and RPC payload inside the session.search wire contract. */
		function sanitizeSearchQuery(value) {
			const withoutNul = value.replaceAll("\0", "");
			if (withoutNul.length <= SEARCH_QUERY_MAX_CODE_UNITS) return withoutNul;
			let end = SEARCH_QUERY_MAX_CODE_UNITS;
			const last = withoutNul.charCodeAt(end - 1);
			const next = withoutNul.charCodeAt(end);
			if (last >= 55296 && last <= 56319 && next >= 56320 && next <= 57343) end--;
			return withoutNul.slice(0, end);
		}
		/** Immutable membership toggle for the local expand-all array. */
		function toggled(list, key) {
			return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
		}
		/**
		* Accept the native drag at document level while a row drag is active: row
		* hover still owns the insertion marker, and releasing outside the list must
		* not be rendered as a rejected drop before dragend commits that last marker.
		*/
		function useNativeDragAcceptance(active) {
			(0, react.useEffect)(() => {
				if (!active) return;
				const acceptDrag = (event) => {
					event.preventDefault();
					if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "move";
				};
				const acceptDrop = (event) => {
					event.preventDefault();
				};
				document.addEventListener("dragover", acceptDrag);
				document.addEventListener("drop", acceptDrop);
				return () => {
					document.removeEventListener("dragover", acceptDrag);
					document.removeEventListener("drop", acceptDrop);
				};
			}, [active]);
		}
		/** Reconcile a stored view order with the Workspace's current session account. */
		function reconciledSessionOrder(sessionIds, stored) {
			if (stored === void 0) return [...sessionIds];
			const byId = new Map(sessionIds.map((id) => [id, id]));
			const ordered = [];
			const included = /* @__PURE__ */ new Set();
			for (const key of stored) {
				const id = byId.get(key);
				if (id === void 0 || included.has(key)) continue;
				ordered.push(id);
				included.add(key);
			}
			for (const id of sessionIds) {
				if (included.has(id)) continue;
				ordered.push(id);
			}
			return ordered;
		}
		/** Newest update first with stable Session identity as the tie-break. */
		function compareSessionRecency(a, b, byId) {
			const aUpdatedAt = byId[a]?.updatedAt ?? Number.NEGATIVE_INFINITY;
			const bUpdatedAt = byId[b]?.updatedAt ?? Number.NEGATIVE_INFINITY;
			if (aUpdatedAt !== bUpdatedAt) return bUpdatedAt - aUpdatedAt;
			return a < b ? -1 : 1;
		}
		/** Reconcile one editable order account and apply its activity-promotion policy. */
		function nextSessionOrderAccount({ sessionIds, previousOrder, previousUpdatedAt, list, orderBy, sortByRecency }) {
			let order = reconciledSessionOrder(sessionIds, previousOrder);
			if (sortByRecency) order.sort((a, b) => compareSessionRecency(a, b, list.byId));
			else if (orderBy === "updated") {
				const promoted = sessionIds.filter((id) => {
					const session = list.byId[id];
					return session !== void 0 && (previousUpdatedAt[id] === void 0 || session.updatedAt > previousUpdatedAt[id]);
				}).sort((a, b) => compareSessionRecency(a, b, list.byId));
				if (promoted.length > 0) {
					const promotedIds = new Set(promoted);
					order = [...promoted, ...order.filter((id) => !promotedIds.has(id))];
				}
			}
			const updatedAt = {};
			for (const id of sessionIds) {
				const session = list.byId[id];
				if (session !== void 0) updatedAt[id] = session.updatedAt;
			}
			const orderChanged = previousOrder === void 0 || order.length !== previousOrder.length || order.some((id, index) => id !== previousOrder[index]);
			const timestampsChanged = Object.keys(updatedAt).length !== Object.keys(previousUpdatedAt).length || Object.entries(updatedAt).some(([id, timestamp]) => previousUpdatedAt[id] !== timestamp);
			return {
				order,
				updatedAt,
				changed: orderChanged || timestampsChanged
			};
		}
		/** Grouping and ordering menu; own open state so it resets with the wide chrome. */
		function ViewOptionsMenu({ groupBy, orderBy, onGroupPick, onOrderPick, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: [
					{
						type: "label",
						id: "group-by",
						text: t("groupBy.label")
					},
					{
						id: "workspace",
						label: t("groupBy.workspace")
					},
					{
						id: "flat",
						label: t("groupBy.flat")
					},
					{
						type: "separator",
						id: "order-by-separator"
					},
					{
						type: "label",
						id: "order-by",
						text: t("orderBy.label")
					},
					{
						id: "manual",
						label: t("orderBy.manual")
					},
					{
						id: "updated",
						label: t("orderBy.updated")
					}
				],
				selectedIds: [groupBy, orderBy],
				onSelect: (id) => {
					if (id === "workspace" || id === "flat") onGroupPick(id);
					else if (id === "manual" || id === "updated") onOrderPick(id);
					setOpen(false);
				},
				align: "end",
				dense: true,
				portal: true,
				anchor: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("viewOptions.label"),
					side: "bottom",
					delayMs: 500,
					children: (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: clsx(WorkspaceBrowser_module_css_default.iconButton, WorkspaceBrowser_module_css_default.wide),
						"aria-label": t("viewOptions.label"),
						onClick: () => {
							setOpen((v) => !v);
						},
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPersonalizationOutline16, {})
					})
				})
			});
		}
		/** Resolve an insertion side from the full rendered workspace group. */
		function workspaceGroupHalf(e) {
			const rect = e.currentTarget.getBoundingClientRect();
			return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
		}
		/** The scrolling session tree; unmounting drops the sessions subscription and expand-all state. */
		function SessionTree({ useSessions, useSessionPendingInteraction, startSession, open, forkSession, workspaces, archivedSessionIds, workspaceReady, usePanelInfo, onRenameRequest, onDeleteRequest, onSessionRename, onSessionArchive, insertWorkspaceBefore, insertSessionBefore, orderBy, groupExpansion, setGroupExpanded, sessionOrderByAccount, sessionUpdatedAtByAccount, syncSessionOrderAccount, setSessionOrder, home, t, revealSessionId, onSessionRevealed }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const list = useSessions((s) => s);
			const pendingInteractions = useSessionPendingInteraction((s) => s);
			const current = panelActive ? void 0 : list.current;
			const revealGroup = revealSessionId === void 0 || !workspaceReady ? void 0 : owningGroupKey(workspaces, revealSessionId);
			const [expandedSessionGroups, setExpandedSessionGroups] = (0, react.useState)([]);
			const [drag, setDrag] = (0, react.useState)(null);
			const sessionDropCommitted = (0, react.useRef)(false);
			const [workspaceDrag, setWorkspaceDrag] = (0, react.useState)(null);
			const workspaceDropCommitted = (0, react.useRef)(false);
			const previousOrderBy = (0, react.useRef)(orderBy);
			useNativeDragAcceptance(drag !== null || workspaceDrag !== null);
			const currentGroup = current === void 0 || !workspaceReady ? void 0 : owningGroupKey(workspaces, current);
			(0, react.useEffect)(() => {
				if (current === void 0 || currentGroup === void 0 || Object.hasOwn(groupExpansion, currentGroup)) return;
				setGroupExpanded(currentGroup, true);
			}, [
				current,
				currentGroup,
				setGroupExpanded,
				groupExpansion
			]);
			const expandedGroups = (0, react.useMemo)(() => Object.entries(groupExpansion).filter(([, expanded]) => expanded).map(([key]) => key), [groupExpansion]);
			const ungroupedSessionIds = (0, react.useMemo)(() => {
				const accounted = new Set(workspaces.flatMap((workspace) => workspace.sessionIds));
				return list.ids.filter((id) => list.byId[id] !== void 0 && !accounted.has(id));
			}, [list, workspaces]);
			(0, react.useEffect)(() => {
				if (list.phase !== "ready") return;
				const switchedToUpdated = previousOrderBy.current !== "updated" && orderBy === "updated";
				previousOrderBy.current = orderBy;
				const accounts = [...workspaces.map((workspace) => ({
					key: workspace.workspaceId,
					sessionIds: workspace.sessionIds.filter((id) => list.byId[id] !== void 0)
				})), {
					key: "",
					sessionIds: ungroupedSessionIds
				}];
				for (const { key, sessionIds } of accounts) {
					const previousOrder = sessionOrderByAccount[key];
					const next = nextSessionOrderAccount({
						sessionIds,
						previousOrder,
						previousUpdatedAt: sessionUpdatedAtByAccount[key] ?? {},
						list,
						orderBy,
						sortByRecency: orderBy === "updated" && (previousOrder === void 0 || switchedToUpdated)
					});
					if (next.changed) syncSessionOrderAccount(key, next.order.map((id) => id), next.updatedAt);
				}
			}, [
				list,
				orderBy,
				sessionOrderByAccount,
				sessionUpdatedAtByAccount,
				syncSessionOrderAccount,
				ungroupedSessionIds,
				workspaces
			]);
			const orderedWorkspaces = (0, react.useMemo)(() => {
				return workspaces.map((workspace) => {
					const stored = sessionOrderByAccount[workspace.workspaceId];
					const sessionIds = reconciledSessionOrder(workspace.sessionIds, stored);
					return {
						...workspace,
						sessionIds
					};
				});
			}, [sessionOrderByAccount, workspaces]);
			const orderedUngroupedSessionIds = (0, react.useMemo)(() => reconciledSessionOrder(ungroupedSessionIds, sessionOrderByAccount[""]), [sessionOrderByAccount, ungroupedSessionIds]);
			const groups = (0, react.useMemo)(() => deriveGroups(list, orderedWorkspaces, archivedSessionIds, pendingInteractions, {
				expandedGroups,
				...sessionOrderByAccount[""] === void 0 ? {} : { ungroupedOrder: sessionOrderByAccount[""] }
			}), [
				list,
				orderedWorkspaces,
				archivedSessionIds,
				pendingInteractions,
				expandedGroups,
				sessionOrderByAccount
			]);
			(0, react.useEffect)(() => {
				if (revealGroup === void 0 || groupExpansion[revealGroup] === true) return;
				setGroupExpanded(revealGroup, true);
			}, [
				groupExpansion,
				revealGroup,
				setGroupExpanded
			]);
			(0, react.useEffect)(() => {
				if (revealSessionId === void 0 || revealGroup === void 0) return;
				const group = groups.find((candidate) => candidate.key === revealGroup);
				if (group === void 0 || !group.expanded || !group.sessions.some((row) => row.id === revealSessionId)) return;
				if (collapsedSessionRows(group.sessions).rows.some((row) => row.id === revealSessionId)) return;
				setExpandedSessionGroups((keys) => keys.includes(revealGroup) ? keys : [...keys, revealGroup]);
			}, [
				groups,
				revealGroup,
				revealSessionId
			]);
			const now = Date.now();
			const commitSessionDrag = (activeDrag, over) => {
				if (sessionDropCommitted.current) return;
				sessionDropCommitted.current = true;
				setDrag(null);
				const group = groups.find((candidate) => candidate.key === activeDrag.accountKey);
				if (group === void 0) return;
				const sessionsExpanded = expandedSessionGroups.includes(group.key);
				const renderedSessions = sessionsExpanded ? group.sessions : collapsedSessionRows(group.sessions).rows;
				const targetIndex = renderedSessions.findIndex((session) => session.id === over.id);
				if (targetIndex === -1) return;
				const sourceIndex = renderedSessions.findIndex((session) => session.id === activeDrag.sessionId);
				if (over.id === activeDrag.sessionId) return;
				const withoutSource = renderedSessions.filter((session) => session.id !== activeDrag.sessionId);
				const targetWithoutSourceIndex = withoutSource.findIndex((session) => session.id === over.id);
				if (targetWithoutSourceIndex === -1) return;
				const visibleInsertAt = over.half === "before" ? targetWithoutSourceIndex : targetWithoutSourceIndex + 1;
				if (sourceIndex !== -1 && visibleInsertAt === sourceIndex) return;
				const accountSessionIds = activeDrag.accountKey === "" ? orderedUngroupedSessionIds : orderedWorkspaces.find((workspace) => workspace.workspaceId === activeDrag.accountKey)?.sessionIds;
				if (accountSessionIds === void 0) return;
				const nextOrder = accountSessionIds.filter((id) => id !== activeDrag.sessionId);
				let anchor;
				if (sessionsExpanded) anchor = over.half === "before" ? over.id : renderedSessions[targetIndex + 1]?.id;
				else {
					const previousVisible = withoutSource[visibleInsertAt - 1]?.id;
					if (previousVisible === void 0) anchor = nextOrder[0];
					else {
						const previousIndex = nextOrder.indexOf(previousVisible);
						if (previousIndex === -1) return;
						anchor = nextOrder[previousIndex + 1];
					}
				}
				const insertAt = anchor === void 0 ? nextOrder.length : nextOrder.indexOf(anchor);
				nextOrder.splice(insertAt === -1 ? nextOrder.length : insertAt, 0, activeDrag.sessionId);
				if (!sessionsExpanded && sourceIndex !== -1) {
					const nodes = new Map(group.sessions.map((node) => [node.id, node]));
					if (!collapsedSessionRows(nextOrder.flatMap((id) => {
						const node = nodes.get(id);
						return node === void 0 ? [] : [node];
					})).rows.some((node) => node.id === activeDrag.sessionId)) return;
				}
				setSessionOrder(activeDrag.accountKey, nextOrder.map((id) => id));
				if (orderBy === "updated" || activeDrag.accountKey === "") return;
				insertSessionBefore(activeDrag.accountKey, activeDrag.sessionId, anchor).catch((reason) => {
					console.warn("session reorder rejected:", reason);
				});
			};
			const commitWorkspaceDrag = (activeDrag, over) => {
				if (workspaceDropCommitted.current) return;
				workspaceDropCommitted.current = true;
				setWorkspaceDrag(null);
				const rowIndex = workspaces.findIndex((workspace) => workspace.workspaceId === over.id);
				if (rowIndex === -1) return;
				const anchor = over.half === "before" ? over.id : workspaces[rowIndex + 1]?.workspaceId;
				if (anchor === activeDrag.workspaceId) return;
				const sourceIndex = workspaces.findIndex((workspace) => workspace.workspaceId === activeDrag.workspaceId);
				const anchorIndex = anchor === void 0 ? workspaces.length : workspaces.findIndex((workspace) => workspace.workspaceId === anchor);
				if (sourceIndex !== -1 && (anchorIndex === sourceIndex || anchorIndex === sourceIndex + 1)) return;
				insertWorkspaceBefore(activeDrag.workspaceId, anchor).catch((reason) => {
					console.warn("workspace reorder rejected:", reason);
				});
			};
			const workspaceDropAtListStart = groups[0]?.workspaceId !== void 0 && workspaceDrag?.over?.id === groups[0].workspaceId && workspaceDrag.over.half === "before";
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [
					workspaceDropAtListStart && (0, react_jsx_runtime.jsx)("span", {
						className: WorkspaceBrowser_module_css_default.listTopDropIndicator,
						"aria-hidden": "true"
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: clsx(WorkspaceBrowser_module_css_default.list, workspaceDropAtListStart && WorkspaceBrowser_module_css_default.listTopDropActive),
						role: "tree",
						"aria-label": t("section.sessions"),
						children: [groups.length === 0 && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.empty,
							children: t("empty.none")
						}), groups.map((group) => {
							const workspaceId = group.workspaceId;
							const collapsed = collapsedSessionRows(group.sessions);
							const sessionsExpanded = expandedSessionGroups.includes(group.key);
							const workspaceMarker = workspaceId !== void 0 && workspaceDrag?.over?.id === workspaceId ? workspaceDrag.over.half : null;
							const workspaceDragProps = workspaceId === void 0 ? void 0 : {
								start: () => {
									workspaceDropCommitted.current = false;
									setWorkspaceDrag({
										workspaceId,
										over: null
									});
								},
								end: () => {
									if (workspaceDrag?.over !== null && workspaceDrag?.over !== void 0) commitWorkspaceDrag(workspaceDrag, workspaceDrag.over);
									else setWorkspaceDrag(null);
									workspaceDropCommitted.current = false;
								}
							};
							const hoverWorkspace = workspaceId === void 0 ? void 0 : (half) => {
								setWorkspaceDrag((active) => active === null ? active : {
									...active,
									over: {
										id: workspaceId,
										half
									}
								});
							};
							const dropWorkspace = workspaceId === void 0 ? void 0 : (half) => {
								if (workspaceDrag === null) return;
								commitWorkspaceDrag(workspaceDrag, {
									id: workspaceId,
									half
								});
							};
							return (0, react_jsx_runtime.jsxs)("div", {
								className: clsx(WorkspaceBrowser_module_css_default.groupSection, workspaceMarker === "before" && WorkspaceBrowser_module_css_default.workspaceDropBefore, workspaceMarker === "after" && WorkspaceBrowser_module_css_default.workspaceDropAfter),
								onDragOver: workspaceDrag === null || hoverWorkspace === void 0 ? void 0 : (e) => {
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									hoverWorkspace(workspaceGroupHalf(e));
								},
								onDrop: workspaceDrag === null || dropWorkspace === void 0 ? void 0 : (e) => {
									e.preventDefault();
									dropWorkspace(workspaceGroupHalf(e));
								},
								children: [
									(0, react_jsx_runtime.jsx)(ProjectRowItem, {
										group,
										home,
										t,
										onToggle: () => {
											if (group.expanded) setExpandedSessionGroups((keys) => keys.filter((key) => key !== group.key));
											setGroupExpanded(group.key, !group.expanded);
										},
										onCreate: () => {
											if (group.workspaceId !== void 0) {
												setGroupExpanded(group.key, true);
												startSession(group.workspaceId);
											}
										},
										drag: workspaceDragProps,
										actions: group.workspaceId === void 0 ? void 0 : {
											rename: () => {
												/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
												if (group.workspaceId !== void 0) onRenameRequest(group.workspaceId, group.label);
											},
											delete: () => {
												/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
												if (group.workspaceId !== void 0) onDeleteRequest(group.workspaceId, group.label);
											}
										}
									}),
									(sessionsExpanded ? group.sessions : collapsed.rows).map((node) => {
										const sameGroupDrag = drag !== null && drag.accountKey === group.key;
										const dragProps = {
											start: () => {
												sessionDropCommitted.current = false;
												setDrag({
													accountKey: group.key,
													sessionId: node.id,
													over: null
												});
											},
											active: sameGroupDrag,
											marker: sameGroupDrag && drag.over?.id === node.id ? drag.over.half : null,
											hover: (half) => {
												/* v8 ignore next -- narrowing guard: Rows gates hover on `active`, which is false while the drag state is null. */
												setDrag((d) => d === null ? d : {
													...d,
													over: {
														id: node.id,
														half
													}
												});
											},
											drop: (half) => {
												/* v8 ignore next -- narrowing guard: Rows gates drop on `active`, which is false while the drag state is null. */
												if (drag === null) return;
												commitSessionDrag(drag, {
													id: node.id,
													half
												});
											},
											end: () => {
												if (drag?.over !== null && drag?.over !== void 0) commitSessionDrag(drag, drag.over);
												else setDrag(null);
												sessionDropCommitted.current = false;
											}
										};
										return (0, react_jsx_runtime.jsx)(SessionNodeItem, {
											node,
											currentId: current,
											now,
											onOpen: open,
											onRename: onSessionRename,
											onFork: forkSession,
											onArchive: onSessionArchive,
											onReveal: node.id === revealSessionId && group.key === revealGroup ? () => {
												onSessionRevealed(node.id);
											} : void 0,
											drag: dragProps,
											t
										}, node.id);
									}),
									collapsed.hiddenCount > 0 && (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: WorkspaceBrowser_module_css_default.sessionOverflowButton,
										"aria-expanded": sessionsExpanded,
										onClick: () => {
											setExpandedSessionGroups((keys) => toggled(keys, group.key));
										},
										children: sessionsExpanded ? t("sessions.collapse") : t("sessions.expand", { n: collapsed.hiddenCount })
									})
								]
							}, group.key);
						})]
					}),
					(0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })
				]
			});
		}
		/** The flat "In one list" body: every session is one draggable top-level row. */
		function FlatList({ useSessions, useSessionPendingInteraction, open, forkSession, onSessionRename, onSessionArchive, archivedSessionIds, usePanelInfo, orderBy, sessionOrderByAccount, sessionUpdatedAtByAccount, syncSessionOrderAccount, setSessionOrder, revealSessionId, onSessionRevealed, t }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const list = useSessions((s) => s);
			const pendingInteractions = useSessionPendingInteraction((s) => s);
			const baseRows = (0, react.useMemo)(() => deriveFlat(list, archivedSessionIds, pendingInteractions), [
				list,
				archivedSessionIds,
				pendingInteractions
			]);
			const sessionIds = (0, react.useMemo)(() => baseRows.map((row) => row.id), [baseRows]);
			const previousOrderBy = (0, react.useRef)(orderBy);
			(0, react.useEffect)(() => {
				if (list.phase !== "ready") return;
				const previousOrder = sessionOrderByAccount[FLAT_SESSION_ORDER_KEY];
				const previousUpdatedAt = sessionUpdatedAtByAccount["__flat_session_order__"] ?? {};
				const switchedToUpdated = previousOrderBy.current !== "updated" && orderBy === "updated";
				previousOrderBy.current = orderBy;
				const next = nextSessionOrderAccount({
					sessionIds,
					previousOrder,
					previousUpdatedAt,
					list,
					orderBy,
					sortByRecency: orderBy === "updated" && (previousOrder === void 0 || switchedToUpdated)
				});
				if (next.changed) syncSessionOrderAccount(FLAT_SESSION_ORDER_KEY, next.order.map((id) => id), next.updatedAt);
			}, [
				list,
				orderBy,
				sessionOrderByAccount,
				sessionUpdatedAtByAccount,
				sessionIds,
				syncSessionOrderAccount
			]);
			const rows = (0, react.useMemo)(() => {
				const byId = new Map(baseRows.map((row) => [row.id, row]));
				return reconciledSessionOrder(sessionIds, sessionOrderByAccount[FLAT_SESSION_ORDER_KEY]).flatMap((id) => {
					const row = byId.get(id);
					return row === void 0 ? [] : [row];
				});
			}, [
				baseRows,
				sessionOrderByAccount,
				sessionIds
			]);
			const [drag, setDrag] = (0, react.useState)(null);
			const dropCommitted = (0, react.useRef)(false);
			useNativeDragAcceptance(drag !== null);
			const commitDrag = (activeDrag, over) => {
				if (dropCommitted.current) return;
				dropCommitted.current = true;
				setDrag(null);
				const targetIndex = rows.findIndex((row) => row.id === over.id);
				if (targetIndex === -1) return;
				const anchor = over.half === "before" ? over.id : rows[targetIndex + 1]?.id;
				if (anchor === activeDrag.sessionId) return;
				const sourceIndex = rows.findIndex((row) => row.id === activeDrag.sessionId);
				const anchorIndex = anchor === void 0 ? rows.length : rows.findIndex((row) => row.id === anchor);
				if (sourceIndex !== -1 && (anchorIndex === sourceIndex || anchorIndex === sourceIndex + 1)) return;
				const nextOrder = rows.map((row) => row.id).filter((id) => id !== activeDrag.sessionId);
				const insertAt = anchor === void 0 ? nextOrder.length : nextOrder.indexOf(anchor);
				nextOrder.splice(insertAt === -1 ? nextOrder.length : insertAt, 0, activeDrag.sessionId);
				setSessionOrder(FLAT_SESSION_ORDER_KEY, nextOrder.map((id) => id));
			};
			const now = Date.now();
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: clsx(WorkspaceBrowser_module_css_default.list, WorkspaceBrowser_module_css_default.flatList),
					role: "tree",
					"aria-label": t("section.sessions"),
					children: [rows.length === 0 && (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.empty,
						children: t("empty.none")
					}), rows.map((node) => {
						const active = drag !== null;
						return (0, react_jsx_runtime.jsx)(SessionNodeItem, {
							node,
							currentId: panelActive ? void 0 : list.current,
							now,
							onOpen: open,
							onRename: onSessionRename,
							onFork: forkSession,
							onArchive: onSessionArchive,
							onReveal: node.id === revealSessionId ? () => {
								onSessionRevealed(node.id);
							} : void 0,
							flat: true,
							drag: {
								start: () => {
									dropCommitted.current = false;
									setDrag({
										accountKey: FLAT_SESSION_ORDER_KEY,
										sessionId: node.id,
										over: null
									});
								},
								active,
								marker: active && drag.over?.id === node.id ? drag.over.half : null,
								hover: (half) => {
									setDrag((current) => current === null ? current : {
										...current,
										over: {
											id: node.id,
											half
										}
									});
								},
								drop: (half) => {
									if (drag !== null) commitDrag(drag, {
										id: node.id,
										half
									});
								},
								end: () => {
									if (drag?.over !== null && drag?.over !== void 0) commitDrag(drag, drag.over);
									else setDrag(null);
									dropCommitted.current = false;
								}
							},
							t
						}, node.id);
					})]
				}), (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })]
			});
		}
		/** Flat search body: local metadata matches plus the current Host result page. */
		function SearchResults({ useSessions, useSessionPendingInteraction, open, workspaces, archivedSessionIds, query, remote, resultLimit, usePanelInfo, t }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const list = useSessions((s) => s);
			const pendingInteractions = useSessionPendingInteraction((s) => s);
			const currentRemote = remote.query === query ? remote : {
				query,
				status: "loading",
				items: [],
				hasMore: false
			};
			const results = (0, react.useMemo)(() => deriveSearchResults(list, workspaces, query, archivedSessionIds, pendingInteractions, currentRemote, resultLimit), [
				list,
				workspaces,
				query,
				archivedSessionIds,
				pendingInteractions,
				currentRemote,
				resultLimit
			]);
			const pending = currentRemote.status === "loading";
			const failed = currentRemote.status === "error";
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: WorkspaceBrowser_module_css_default.list,
					children: [
						(0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchTree,
							role: "tree",
							"aria-label": t("search.results.aria"),
							children: results.items.map((result) => (0, react_jsx_runtime.jsx)(SearchResultItem, {
								result,
								currentId: panelActive ? void 0 : list.current,
								onOpen: open,
								t
							}, result.id))
						}),
						pending && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchStatus,
							role: "status",
							children: t("search.pending")
						}),
						failed && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchWarning,
							role: "status",
							children: t("search.unavailable")
						}),
						!pending && results.items.length === 0 && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.empty,
							children: t("search.noMatches")
						}),
						results.hasMore && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchStatus,
							children: t("search.hasMore", { n: resultLimit })
						})
					]
				}), (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })]
			});
		}
		/**
		* Render the browsing region.
		* @param props - composed slot props (shell owner share + store + injected actions).
		* @returns the region element tree.
		*/
		function WorkspaceBrowser({ wide, usePanelInfo, expandSidebar, useSessions, useSessionPendingInteraction, useWorkspaces, useStore, actions, startSession, open, renameSession, forkSession, renameWorkspace, deleteWorkspace, insertWorkspaceBefore, archiveSession, insertSessionBefore, createWorkspace, searchSessions, searchResultLimit, useDirectoryFlow, useHostInfo, renderSlot, t }) {
			const home = useHostInfo((info) => info.home);
			const workspaces = useWorkspaces((state) => state.items);
			const workspacePhase = useWorkspaces((state) => state.phase);
			const workspaceStreamState = useWorkspaces((state) => state.state);
			const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds);
			const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied);
			const groupBy = useStore((s) => s.groupBy);
			const orderBy = useStore((s) => s.orderBy);
			const groupExpansion = useStore((s) => s.groupExpansion);
			const sessionOrderByAccount = useStore((s) => s.sessionOrderByAccount);
			const sessionUpdatedAtByAccount = useStore((s) => s.sessionUpdatedAtByAccount);
			const currentBlankSessionId = useSessions((state) => {
				const current = state.current;
				return current !== void 0 && state.byId[current]?.blank === true ? current : void 0;
			});
			const currentBlankAccount = currentBlankSessionId === void 0 || workspacePhase !== "ready" ? void 0 : owningGroupKey(workspaces, currentBlankSessionId);
			const promotedBlank = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (currentBlankSessionId === void 0 || currentBlankAccount === void 0) {
					promotedBlank.current = void 0;
					return;
				}
				const promoted = promotedBlank.current;
				if (promoted !== void 0 && promoted.sessionId === currentBlankSessionId && promoted.accountKey === currentBlankAccount) return;
				promotedBlank.current = {
					sessionId: currentBlankSessionId,
					accountKey: currentBlankAccount
				};
				for (const accountKey of new Set([currentBlankAccount, FLAT_SESSION_ORDER_KEY])) {
					const previous = sessionOrderByAccount[accountKey] ?? [];
					actions.setSessionOrder(accountKey, [currentBlankSessionId, ...previous.filter((id) => id !== currentBlankSessionId)]);
				}
			}, [
				actions.setSessionOrder,
				currentBlankAccount,
				currentBlankSessionId,
				sessionOrderByAccount
			]);
			(0, react.useEffect)(() => {
				if (workspacePhase !== "ready") return;
				actions.retainAccountKeys([
					"",
					FLAT_SESSION_ORDER_KEY,
					...workspaces.map((workspace) => workspace.workspaceId)
				]);
			}, [
				actions.retainAccountKeys,
				workspacePhase,
				workspaces
			]);
			const [query, setQuery] = (0, react.useState)("");
			const [searchExpanded, setSearchExpanded] = (0, react.useState)(false);
			const [revealSessionId, setRevealSessionId] = (0, react.useState)(void 0);
			const normalizedQuery = sanitizeSearchQuery(query).trim();
			const [remoteSearch, setRemoteSearch] = (0, react.useState)({
				query: "",
				status: "idle",
				items: [],
				hasMore: false
			});
			const searchRoot = (0, react.useRef)(null);
			const searchInput = (0, react.useRef)(null);
			const [wsPickerOpen, setWsPickerOpen] = (0, react.useState)(false);
			const wsPlusRef = (0, react.useRef)(null);
			const composingRef = (0, react.useRef)(false);
			const openSearchResult = (sessionId) => {
				setRevealSessionId(sessionId);
				setQuery("");
				setSearchExpanded(false);
				open(sessionId);
			};
			const acknowledgeSessionReveal = (sessionId) => {
				setRevealSessionId((current) => current === sessionId ? void 0 : current);
			};
			(0, react.useEffect)(() => {
				if (normalizedQuery !== "") setRevealSessionId(void 0);
			}, [normalizedQuery]);
			const [searchOnExpand, setSearchOnExpand] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (wide && searchOnExpand) {
					const timer = window.setTimeout(() => {
						searchInput.current?.focus({ preventScroll: true });
						setSearchOnExpand(false);
					}, EXPAND_SLIDE_MS);
					return () => {
						window.clearTimeout(timer);
					};
				}
			}, [wide, searchOnExpand]);
			(0, react.useEffect)(() => {
				if (!wide || !searchExpanded || searchOnExpand) return;
				searchInput.current?.focus({ preventScroll: true });
			}, [
				wide,
				searchExpanded,
				searchOnExpand
			]);
			(0, react.useEffect)(() => {
				if (!wide || !searchExpanded || searchOnExpand) return;
				const onClick = (event) => {
					if (!(event.target instanceof Node) || searchRoot.current?.contains(event.target) === true) return;
					searchInput.current?.blur();
					if (normalizedQuery !== "") return;
					setSearchExpanded(false);
				};
				document.addEventListener("click", onClick);
				return () => {
					document.removeEventListener("click", onClick);
				};
			}, [
				normalizedQuery,
				wide,
				searchExpanded,
				searchOnExpand
			]);
			(0, react.useEffect)(() => {
				if (normalizedQuery === "") {
					setRemoteSearch({
						query: "",
						status: "idle",
						items: [],
						hasMore: false
					});
					return;
				}
				const controller = new AbortController();
				setRemoteSearch({
					query: normalizedQuery,
					status: "loading",
					items: [],
					hasMore: false
				});
				const timer = window.setTimeout(() => {
					searchSessions(normalizedQuery, controller.signal).then((result) => {
						if (controller.signal.aborted) return;
						setRemoteSearch({
							query: normalizedQuery,
							status: "ready",
							items: result.items,
							hasMore: result.hasMore
						});
					}).catch(() => {
						if (controller.signal.aborted) return;
						setRemoteSearch({
							query: normalizedQuery,
							status: "error",
							items: [],
							hasMore: false
						});
					});
				}, SEARCH_DEBOUNCE_MS);
				return () => {
					window.clearTimeout(timer);
					controller.abort();
				};
			}, [normalizedQuery, searchSessions]);
			const [renameTarget, setRenameTarget] = (0, react.useState)(null);
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const [renaming, setRenaming] = (0, react.useState)(false);
			const [renameError, setRenameError] = (0, react.useState)(null);
			const renameTrimmed = renameDraft.trim();
			const renameDuplicate = renameTarget !== null && renameTrimmed !== "" && renameTrimmed !== renameTarget.currentTitle && workspaces.some((w) => w.title === renameTrimmed);
			const renameBlocked = renaming || renameTrimmed === "" || renameTarget === null || renameTrimmed === renameTarget.currentTitle || renameDuplicate;
			const closeRename = () => {
				if (renaming) return;
				setRenameTarget(null);
				setRenameError(null);
			};
			const confirmRename = () => {
				if (renameBlocked) return;
				setRenaming(true);
				setRenameError(null);
				renameWorkspace(renameTarget.workspaceId, renameTrimmed).then(() => {
					setRenaming(false);
					setRenameTarget(null);
				}).catch((reason) => {
					setRenaming(false);
					setRenameError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			const [sessionRenameTarget, setSessionRenameTarget] = (0, react.useState)(null);
			const [sessionRenameDraft, setSessionRenameDraft] = (0, react.useState)("");
			const [sessionRenaming, setSessionRenaming] = (0, react.useState)(false);
			const [sessionRenameError, setSessionRenameError] = (0, react.useState)(null);
			const sessionRenameTrimmed = sessionRenameDraft.trim();
			const sessionRenameBlocked = sessionRenaming || sessionRenameTrimmed === "" || sessionRenameTarget === null;
			const closeSessionRename = () => {
				if (sessionRenaming) return;
				setSessionRenameTarget(null);
				setSessionRenameError(null);
			};
			const confirmSessionRename = () => {
				if (sessionRenameBlocked) return;
				setSessionRenaming(true);
				setSessionRenameError(null);
				renameSession(sessionRenameTarget.sessionId, sessionRenameTrimmed).then(() => {
					setSessionRenaming(false);
					setSessionRenameTarget(null);
				}).catch((reason) => {
					setSessionRenaming(false);
					setSessionRenameError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			const onSessionRename = (sessionId, currentTitle) => {
				setSessionRenameTarget({
					sessionId,
					currentTitle
				});
				setSessionRenameDraft(currentTitle);
				setSessionRenameError(null);
			};
			const onSessionArchive = (sessionId) => {
				archiveSession(sessionId).catch((reason) => {
					console.warn("session archive rejected:", reason);
				});
			};
			const [deleteTarget, setDeleteTarget] = (0, react.useState)(null);
			const [deleting, setDeleting] = (0, react.useState)(false);
			const [deleteCommittedId, setDeleteCommittedId] = (0, react.useState)(null);
			const [deleteError, setDeleteError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (deleteCommittedId === null || workspaces.some((workspace) => workspace.workspaceId === deleteCommittedId)) return;
				setDeleting(false);
				setDeleteCommittedId(null);
				setDeleteTarget(null);
			}, [deleteCommittedId, workspaces]);
			const closeDelete = () => {
				if (deleting) return;
				setDeleteTarget(null);
				setDeleteError(null);
			};
			const confirmDelete = () => {
				/* v8 ignore next -- the Modal is absent without a target and its button is disabled while deleting. */
				if (deleting || deleteTarget === null) return;
				setDeleting(true);
				setDeleteCommittedId(null);
				setDeleteError(null);
				deleteWorkspace(deleteTarget.workspaceId).then(() => {
					setDeleteCommittedId(deleteTarget.workspaceId);
				}).catch((reason) => {
					setDeleting(false);
					setDeleteError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.root, !wide && WorkspaceBrowser_module_css_default.rail),
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: WorkspaceBrowser_module_css_default.sectionHeader,
						children: [
							wide && (0, react_jsx_runtime.jsx)("span", {
								className: clsx(WorkspaceBrowser_module_css_default.sectionLabel, WorkspaceBrowser_module_css_default.wide, searchExpanded && WorkspaceBrowser_module_css_default.sectionLabelHidden),
								children: groupBy === "flat" ? t("section.sessions") : t("section.workspaces")
							}),
							wide && (0, react_jsx_runtime.jsx)("div", {
								className: clsx(WorkspaceBrowser_module_css_default.searchSlot, searchExpanded && WorkspaceBrowser_module_css_default.searchSlotExpanded),
								children: (0, react_jsx_runtime.jsxs)("div", {
									ref: searchRoot,
									className: clsx(WorkspaceBrowser_module_css_default.search, searchExpanded && WorkspaceBrowser_module_css_default.searchExpanded),
									onClick: () => {
										setWsPickerOpen(false);
										setSearchExpanded(true);
										searchInput.current?.focus();
									},
									children: [
										(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("search"),
											side: "bottom",
											delayMs: 500,
											disabled: searchExpanded,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: WorkspaceBrowser_module_css_default.searchButton,
												"aria-label": t("search.sessions.aria"),
												"aria-expanded": searchExpanded,
												onClick: () => {
													setWsPickerOpen(false);
													setSearchExpanded(true);
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: searchExpanded ? 11 : 14 })
											})
										}),
										(0, react_jsx_runtime.jsx)("input", {
											ref: searchInput,
											className: WorkspaceBrowser_module_css_default.searchInput,
											type: "text",
											placeholder: t("search.placeholder"),
											maxLength: SEARCH_QUERY_MAX_CODE_UNITS,
											value: query,
											tabIndex: searchExpanded ? 0 : -1,
											onChange: (e) => {
												setQuery(sanitizeSearchQuery(e.target.value));
											},
											onKeyDown: (e) => {
												if (e.key !== "Escape") return;
												setQuery("");
												setSearchExpanded(false);
											}
										}),
										searchExpanded && (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: WorkspaceBrowser_module_css_default.clearButton,
											"aria-label": t("search.clear"),
											onClick: (e) => {
												e.stopPropagation();
												setQuery("");
												setSearchExpanded(false);
											},
											children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
										})
									]
								})
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: clsx(WorkspaceBrowser_module_css_default.headerActions, wide && searchExpanded && WorkspaceBrowser_module_css_default.headerActionsHidden),
								children: [wide && (0, react_jsx_runtime.jsx)(ViewOptionsMenu, {
									groupBy,
									orderBy,
									onGroupPick: (mode) => {
										actions.setGroupBy(mode);
									},
									onOrderPick: (mode) => {
										actions.setOrderBy(mode);
									},
									t
								}), directoryFlowAvailable && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("workspace.add"),
									side: "bottom",
									delayMs: 500,
									children: (0, react_jsx_runtime.jsx)("button", {
										ref: wsPlusRef,
										type: "button",
										className: WorkspaceBrowser_module_css_default.iconButton,
										"aria-label": t("workspace.add"),
										onClick: () => {
											setWsPickerOpen((v) => !v);
										},
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconProjectAddOutline16, { size: wide ? 16 : 18 })
									})
								})]
							}),
							(0, react_jsx_runtime.jsx)(WorkspacePickFlow, {
								t,
								open: wsPickerOpen,
								anchorRef: wsPlusRef,
								useWorkspaces,
								createWorkspace,
								useDirectoryFlow,
								renderDirectoryFlow: (owner) => renderSlot("sidebar.workspaces.directoryFlow", owner),
								addOnly: true,
								side: "right",
								onPick: (workspaceId) => {
									setWsPickerOpen(false);
									startSession(workspaceId);
								},
								onClose: () => {
									setWsPickerOpen(false);
								}
							})
						]
					}),
					!wide && (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.search,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("search"),
							children: (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WorkspaceBrowser_module_css_default.searchButton,
								"aria-label": t("search.sessions.aria"),
								onClick: () => {
									setSearchExpanded(true);
									setSearchOnExpand(true);
									expandSidebar();
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 18 })
							})
						})
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.listArea,
						children: wide && (normalizedQuery !== "" ? (0, react_jsx_runtime.jsx)(SearchResults, {
							usePanelInfo,
							useSessions,
							useSessionPendingInteraction,
							open: openSearchResult,
							workspaces,
							archivedSessionIds,
							query: normalizedQuery,
							remote: remoteSearch,
							resultLimit: searchResultLimit,
							t
						}) : groupBy === "flat" ? (0, react_jsx_runtime.jsx)(FlatList, {
							usePanelInfo,
							useSessions,
							useSessionPendingInteraction,
							open,
							forkSession,
							onSessionRename,
							onSessionArchive,
							archivedSessionIds,
							orderBy,
							sessionOrderByAccount,
							sessionUpdatedAtByAccount,
							syncSessionOrderAccount: actions.syncSessionOrderAccount,
							setSessionOrder: actions.setSessionOrder,
							revealSessionId,
							onSessionRevealed: acknowledgeSessionReveal,
							t
						}) : (0, react_jsx_runtime.jsx)(SessionTree, {
							usePanelInfo,
							useSessions,
							useSessionPendingInteraction,
							onSessionRename,
							onSessionArchive,
							forkSession,
							workspaces,
							workspaceReady: workspacePhase === "ready" && workspaceStreamState !== "loading",
							groupExpansion,
							setGroupExpanded: actions.setGroupExpanded,
							sessionOrderByAccount,
							sessionUpdatedAtByAccount,
							syncSessionOrderAccount: actions.syncSessionOrderAccount,
							setSessionOrder: actions.setSessionOrder,
							archivedSessionIds,
							startSession,
							open,
							insertWorkspaceBefore,
							insertSessionBefore,
							orderBy,
							revealSessionId,
							onSessionRevealed: acknowledgeSessionReveal,
							home,
							t,
							onRenameRequest: (workspaceId, currentTitle) => {
								setRenameTarget({
									workspaceId,
									currentTitle
								});
								setRenameDraft(currentTitle);
								setRenameError(null);
							},
							onDeleteRequest: (workspaceId, title) => {
								setDeleteTarget({
									workspaceId,
									title
								});
								setDeleteError(null);
							}
						}))
					}),
					(0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameTarget !== null,
						onClose: closeRename,
						closeLabel: t("close"),
						title: t("rename.workspace.title"),
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: renaming,
							onClick: closeRename,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: renameBlocked,
							onClick: confirmRename,
							children: t("rename")
						})] }),
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								className: WorkspaceBrowser_module_css_default.renameInput,
								value: renameDraft,
								"aria-label": t("field.workspaceName"),
								autoFocus: true,
								disabled: renaming,
								onFocus: (e) => {
									e.target.select();
								},
								onChange: (e) => {
									setRenameDraft(e.target.value);
									setRenameError(null);
								},
								onCompositionStart: () => {
									composingRef.current = true;
								},
								onCompositionEnd: () => {
									composingRef.current = false;
								},
								onKeyDown: (e) => {
									if (e.key === "Enter" && !composingRef.current) {
										e.preventDefault();
										confirmRename();
									}
								}
							}),
							renameDuplicate && (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: t("conflict.named", { name: renameTrimmed })
							}),
							renameError !== null && (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: renameError
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: sessionRenameTarget !== null,
						onClose: closeSessionRename,
						closeLabel: t("close"),
						title: t("rename.session.title"),
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: sessionRenaming,
							onClick: closeSessionRename,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: sessionRenameBlocked,
							onClick: confirmSessionRename,
							children: t("rename")
						})] }),
						children: [(0, react_jsx_runtime.jsx)("input", {
							className: WorkspaceBrowser_module_css_default.renameInput,
							value: sessionRenameDraft,
							"aria-label": t("field.sessionName"),
							autoFocus: true,
							disabled: sessionRenaming,
							onFocus: (e) => {
								e.target.select();
							},
							onChange: (e) => {
								setSessionRenameDraft(e.target.value);
								setSessionRenameError(null);
							},
							onCompositionStart: () => {
								composingRef.current = true;
							},
							onCompositionEnd: () => {
								composingRef.current = false;
							},
							onKeyDown: (e) => {
								if (e.key === "Enter" && !composingRef.current) {
									e.preventDefault();
									confirmSessionRename();
								}
							}
						}), sessionRenameError !== null && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.renameError,
							role: "alert",
							children: sessionRenameError
						})]
					}),
					(0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteTarget !== null,
						onClose: closeDelete,
						closeLabel: t("close"),
						title: t("delete.workspace"),
						...deleteTarget === null ? {} : { description: t("delete.desc", { name: deleteTarget.title }) },
						footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: deleting,
							onClick: closeDelete,
							children: t("cancel")
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: WorkspaceBrowser_module_css_default.deleteAction,
							disabled: deleting,
							onClick: confirmDelete,
							children: t("delete.workspace")
						})] }),
						children: [deleting && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.deleteStatus,
							role: "status",
							children: t("delete.pending")
						}), deleteError !== null && (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.renameError,
							role: "alert",
							children: deleteError
						})]
					})
				]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/**
		* `workspace` namespace dictionaries: the browsing region (section header,
		* search, tree rows, dialogs) and the pick/add flow. Runtime failure
		* messages (wire error strings) pass through untranslated by policy.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"group.ungrouped": "未分组",
			"session.new": "新会话",
			"section.workspaces": "工作区",
			"section.sessions": "会话",
			"viewOptions.label": "视图选项",
			"groupBy.label": "分组方式",
			"groupBy.workspace": "按工作区",
			"groupBy.flat": "单列表",
			"orderBy.label": "排序方式",
			"orderBy.manual": "手动排序",
			"orderBy.updated": "最近更新",
			"sessions.expand": "展开其余 {n} 个会话",
			"sessions.collapse": "收起",
			"empty.none": "暂无会话",
			"empty.noMatches": "无匹配结果",
			"workspace.add": "添加工作区",
			"search.sessions.aria": "搜索会话",
			"search.placeholder": "搜索会话…",
			"search.clear": "清除搜索",
			"search.results.aria": "搜索结果",
			"search.pending": "正在搜索会话历史…",
			"search.unavailable": "内容搜索暂不可用，仅显示名称匹配。",
			"search.noMatches": "无匹配会话",
			"search.hasMore": "仅显示前 {n} 条结果，请缩小搜索范围。",
			"menu.addWorkspace": "添加工作区…",
			"picker.loading": "正在加载工作区…",
			"conflict.named": "已存在名为“{name}”的工作区。",
			"folderError.title": "无法打开文件夹",
			"folderError.retry": "重新选择",
			"rename": "重命名",
			"rename.workspace.title": "重命名工作区",
			"rename.session.title": "重命名会话",
			"field.workspaceName": "工作区名称",
			"field.sessionName": "会话名称",
			"delete.workspace": "删除工作区",
			"delete.desc": "将把“{name}”从工作区列表中移除。文件夹与会话记录会保留，其会话将显示在“未分组”下。",
			"delete.pending": "正在删除工作区…",
			"menu.fork": "分叉会话",
			"menu.archiveSession": "归档会话",
			"sessions.count.one": "{n} 个会话",
			"sessions.count.other": "{n} 个会话",
			"actions.workspace.aria": "工作区“{name}”的操作",
			"actions.session.aria": "会话“{name}”的操作",
			"actions.newSession.aria": "在“{name}”中新建会话",
			"status.running": "进行中",
			"status.subagentsRunning.one": "{n} 个子代理运行中",
			"status.subagentsRunning.other": "{n} 个子代理运行中",
			"status.idle": "空闲",
			"status.waitingApproval": "等待审批",
			"status.planReview": "计划待审",
			"status.waitingAnswer": "等待回答",
			"status.completed": "已完成",
			"schedule.active": "有活动定时任务",
			"hover.created": "创建于 {time}",
			"hover.copied": "已复制",
			"date.ymd": "{y}年{m}月{d}日",
			"time.now": "刚刚",
			"time.minutes": "{n}分钟",
			"time.hours": "{n}小时",
			"time.days": "{n}天",
			"time.months": "{n}个月",
			"time.years": "{n}年",
			"time.ago": "{t}前"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"group.ungrouped": "Ungrouped",
			"session.new": "New Session",
			"section.workspaces": "Workspaces",
			"section.sessions": "Sessions",
			"viewOptions.label": "View options",
			"groupBy.label": "Group by",
			"groupBy.workspace": "WorkSpace",
			"groupBy.flat": "In one list",
			"orderBy.label": "Order by",
			"orderBy.manual": "Manual",
			"orderBy.updated": "Last updated",
			"sessions.expand": "Show {n} more sessions",
			"sessions.collapse": "Show less",
			"empty.none": "No sessions yet",
			"empty.noMatches": "No matches",
			"workspace.add": "Add workspace",
			"search.sessions.aria": "Search sessions",
			"search.placeholder": "Search sessions...",
			"search.clear": "Clear search",
			"search.results.aria": "Search results",
			"search.pending": "Searching session history…",
			"search.unavailable": "Content search is temporarily unavailable. Showing name matches.",
			"search.noMatches": "No matching sessions",
			"search.hasMore": "Showing the first {n} results. Narrow your search.",
			"menu.addWorkspace": "Add workspace…",
			"picker.loading": "Loading workspaces…",
			"conflict.named": "A workspace named “{name}” already exists.",
			"folderError.title": "Couldn’t open folder",
			"folderError.retry": "Choose again",
			"rename": "Rename",
			"rename.workspace.title": "Rename workspace",
			"rename.session.title": "Rename session",
			"field.workspaceName": "Workspace name",
			"field.sessionName": "Session name",
			"delete.workspace": "Delete workspace",
			"delete.desc": "This removes “{name}” from the workspace list. The folder and session logs will be kept. Its sessions will appear under Ungrouped.",
			"delete.pending": "Deleting workspace…",
			"menu.fork": "Fork session",
			"menu.archiveSession": "Archive session",
			"sessions.count.one": "{n} session",
			"sessions.count.other": "{n} sessions",
			"actions.workspace.aria": "Workspace actions for {name}",
			"actions.session.aria": "Session actions for {name}",
			"actions.newSession.aria": "New session in {name}",
			"status.running": "Running",
			"status.subagentsRunning.one": "{n} subagent running",
			"status.subagentsRunning.other": "{n} subagents running",
			"status.idle": "Idle",
			"status.waitingApproval": "Waiting for approval",
			"status.planReview": "Plan awaiting review",
			"status.waitingAnswer": "Waiting for answer",
			"status.completed": "Completed",
			"schedule.active": "Has active scheduled task",
			"hover.created": "Created {time}",
			"hover.copied": "Copied",
			"date.ymd": "{y}-{m}-{d}",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y",
			"time.ago": "{t} ago"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "workspace";
		/**
		* Required services (cordis fiber inject). The target slots are declared by
		* the ui-sidebar / ui-conversation applies, whose activation order relative
		* to this one is NOT constrained: dsh.client.inject edges are informational
		* (loading/prefetch metadata, never apply sequencing) and neither owner
		* provides a waitable service. apply therefore depends on each slot
		* declaration through `slots.inject()` instead of assuming order.
		*/
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"locale",
			"remote",
			"remote.directoryPicker",
			"layout"
		];
		/**
		* Register the browser and picker once their slot declarations are on the
		* ledger. Inject factories return plain callbacks; data reads use the
		* framework's global hooks.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			const workspaces = ctx.get("workspaces");
			const uiWorkspace = new UiWorkspaceService(ctx, ctx.remote.directoryPicker, workspaces, sessions);
			ctx.slots.provideRoot({ hooks: { workspaces: workspaces.list } });
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-workspace: dictionaries");
			const searchSessions = async (query, signal) => {
				const result = await sessions.search(query, signal);
				if (!result.ok) throw new Error(result.error.message);
				return result.value;
			};
			const flowSource = (hole) => ({
				getSnapshot: () => ctx.slots.entries(hole).length > 0,
				subscribe: (listener) => ctx.slots.subscribe(hole, listener)
			});
			const browserFlowSource = flowSource("sidebar.workspaces.directoryFlow");
			const hostInfo = {
				getSnapshot: () => ctx.remote.$host,
				subscribe: (listener) => ctx.on("connection/reset", listener)
			};
			const pickerFlowSource = flowSource("conversation.hero.workspace.directoryFlow");
			const openSession = (sessionId) => {
				uiWorkspace.openSession(sessionId);
			};
			const browserInjected = () => ({
				startSession: (workspaceId) => {
					uiWorkspace.startSession(workspaceId);
				},
				open: openSession,
				searchSessions,
				searchResultLimit: sessions.searchResultLimit,
				renameSession: async (sessionId, title) => {
					const session = sessions.binding(sessionId)?.session;
					if (session === void 0) throw new Error(`unknown session "${sessionId}"`);
					const result = await session.rename(title);
					if (!result.ok) throw new Error(result.error.message);
				},
				forkSession: (sessionId) => {
					uiWorkspace.forkSession(sessionId).catch(() => {});
				},
				renameWorkspace: async (workspaceId, title) => {
					await workspaces.rename(workspaceId, title);
				},
				deleteWorkspace: async (workspaceId) => {
					await workspaces.delete(workspaceId);
				},
				insertWorkspaceBefore: async (workspaceId, beforeWorkspaceId) => {
					await workspaces.insertBefore(workspaceId, beforeWorkspaceId);
				},
				archiveSession: async (sessionId) => {
					await uiWorkspace.archiveSession(sessionId);
				},
				insertSessionBefore: async (workspaceId, sessionId, beforeSessionId) => {
					await workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId);
				},
				createWorkspace: (input) => workspaces.create(input),
				hooks: {
					directoryFlow: browserFlowSource,
					hostInfo
				}
			});
			const pickerInjected = () => ({
				createWorkspace: (input) => workspaces.create(input),
				hooks: { directoryFlow: pickerFlowSource }
			});
			ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				children: { "sidebar.workspaces.directoryFlow": {
					kind: "single",
					scope: "root"
				} },
				store: createWorkspaceViewStore(),
				inject: browserInjected,
				locale: NS
			}, WorkspaceBrowser));
			ctx.slots.inject("conversation.hero.workspace", () => ctx.slots.register({
				name: "conversation.hero.workspace",
				children: { "conversation.hero.workspace.directoryFlow": {
					kind: "single",
					scope: "root"
				} },
				inject: pickerInjected,
				locale: NS
			}, WorkspacePicker));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
import type { WorkspaceBrowserProps } from '../contract/slots.ts';
import type { GroupNode, SearchResultNode, SessionNode } from '../tree.ts';
/** The standard locale seat, prop-passed from the browser root. */
type RowTranslate = WorkspaceBrowserProps['t'];
/**
 * Row drag wiring supplied by the tree owner. `drop` reports the half of the
 * row where the pointer released so the owner can resolve an insert anchor.
 */
export interface RowDragProps {
    /** Start dragging this row. */
    start: () => void;
    /** A compatible row drag is in flight. */
    active: boolean;
    /** Current marker on this row: insert line above, below, or none. */
    marker: 'before' | 'after' | null;
    /** Report the hovered half while a compatible drag passes over this row. */
    hover: (half: 'before' | 'after') => void;
    drop: (half: 'before' | 'after') => void;
    end: () => void;
}
/** Drag lifecycle owned by a workspace row; its enclosing group owns hit testing. */
interface WorkspaceRowDragProps {
    start: () => void;
    end: () => void;
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
export declare function ProjectRowItem({ group, onToggle, onCreate, actions, drag, home, t }: {
    group: GroupNode;
    onToggle: () => void;
    onCreate: () => void;
    /** Real-Workspace actions; absent for the ungrouped bucket (no menu shown). */
    actions?: {
        rename: () => void;
        delete: () => void;
    } | undefined;
    /** Present only for real Workspace rows in the grouped view. */
    drag?: WorkspaceRowDragProps | undefined;
    /** Host account home; POSIX home-rooted hover paths display as `~`. */
    home?: string | undefined;
    t: RowTranslate;
}): import("react").JSX.Element;
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
export declare function SearchResultItem({ result, currentId, onOpen, t }: {
    result: SearchResultNode;
    currentId: string | undefined;
    onOpen: (id: SearchResultNode['id']) => void;
    t: RowTranslate;
}): import("react").JSX.Element;
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
export declare function SessionNodeItem({ node, currentId, now, onOpen, onRename, onFork, onArchive, onReveal, drag, flat, t, }: {
    node: SessionNode;
    currentId: string | undefined;
    now: number;
    onOpen: (id: SessionNode['id']) => void;
    /** Open the browser-owned session rename dialog (row menu action). */
    onRename: (id: SessionNode['id'], currentTitle: string) => void;
    /** Fork a session at its last completed turn (row menu action). */
    onFork: (id: SessionNode['id']) => void;
    /** Archive this session (row menu action; commits without a dialog). */
    onArchive: (id: SessionNode['id']) => void;
    /** Scroll this row into view after search navigation, then acknowledge it. */
    onReveal?: (() => void) | undefined;
    /** Present only on draggable rows (workspace-group sessions outside search). */
    drag?: RowDragProps | undefined;
    /** The row is rendered without a parent Workspace header. */
    flat?: boolean | undefined;
    t: RowTranslate;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=Rows.d.ts.map
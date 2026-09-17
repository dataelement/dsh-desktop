/**
 * Workspace pick/add flow. WorkspacePickFlow is the reusable core (menu +
 * path error dialog) consumed directly by WorkspaceBrowser (same package) and
 * wrapped by WorkspacePicker for the conversation empty-state slot
 * registration. Directory picking itself lives in the composed flow package's
 * slot occupant (see the contract module doc): this core only opens the flow,
 * adopts the picked path, and owns the error surface. Adding a workspace has
 * exactly one route — pick a host directory, new or existing — because the
 * occupant's own create-folder affordance already covers creating one.
 */
import type { ReactNode, RefObject } from 'react';
import type { WorkspaceId, WorkspaceSnapshot, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
import type { DirectoryFlowOwnerProps, WorkspacePickerProps } from './contract/slots.ts';
/** Core flow props: the owner supplies popover control and pick semantics. */
export interface WorkspacePickFlowProps {
    /** The standard locale seat, forwarded by whichever slot entry hosts the flow. */
    t: WorkspacePickerProps['t'];
    /** Popover visibility (anchor button toggle state, owner-local). */
    open: boolean;
    /** The anchor button element — the popover's placement anchor. */
    anchorRef?: RefObject<HTMLElement | null> | undefined;
    /** Selector hook over the workspace list (framework standard hook). */
    useWorkspaces: <S>(selector: (state: WorkspaceSnapshot) => S) => S;
    /** Adopt a picked host directory as a real Workspace. */
    createWorkspace: (input: {
        path: string;
    }) => Promise<WorkspaceView>;
    /** Bound occupancy selector hook for this surface's directory-flow hole (empty leaves the surface with no add action). */
    useDirectoryFlow: SnapshotSelectorHook<boolean>;
    /** Render this surface's directory-flow hole with the owner conversation (the entry's narrowed renderSlot). */
    renderDirectoryFlow: (owner: DirectoryFlowOwnerProps) => ReactNode;
    /** A real Workspace was picked or created. */
    onPick: (workspaceId: WorkspaceId) => void;
    /** Close the popover (outside click / Escape / post-pick). */
    onClose: () => void;
    /** Only offer the add action, hide existing workspaces. */
    addOnly?: boolean;
    /** Menu opening direction relative to the anchor. */
    side?: 'bottom' | 'top' | 'right';
    /** Currently active workspace (trailing check in the picker list). */
    selectedId?: WorkspaceId | undefined;
}
/**
 * Render the pick menu plus the adoption error dialog.
 * @param props - owner-controlled flow props.
 * @returns menu + dialog elements.
 */
export declare function WorkspacePickFlow({ t, open, anchorRef, useWorkspaces, createWorkspace, useDirectoryFlow, renderDirectoryFlow, onPick, onClose, addOnly, side, selectedId, }: WorkspacePickFlowProps): import("react").JSX.Element;
/**
 * The conversation empty-state registration: adapts the owner share to the
 * core flow (all state and semantics live in the flow / the owner).
 * @param props - empty-state slot props (owner share + injected creation callback).
 * @returns the flow element.
 */
export declare function WorkspacePicker({ open, anchorRef, useWorkspaces, selectedId, onPick, onClose, createWorkspace, useDirectoryFlow, renderSlot, t, }: WorkspacePickerProps): import("react").JSX.Element;
//# sourceMappingURL=WorkspacePicker.d.ts.map
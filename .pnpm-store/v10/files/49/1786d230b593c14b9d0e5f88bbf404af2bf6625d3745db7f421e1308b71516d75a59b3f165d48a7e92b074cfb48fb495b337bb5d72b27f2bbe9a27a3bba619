/**
 * Workspace plugin, browser half. Two registrations: WorkspaceBrowser fills
 * the sidebar shell's `sidebar.workspaces` hole (the whole browsing region),
 * and WorkspacePicker fills the conversation hero's picker hole
 * (`conversation.hero.workspace` — both hero forms). Both read real Host
 * Workspaces through the global useWorkspaces hook, and each declares its
 * own `single` directory-flow child hole for the composed picker package's
 * client half (see the contract module doc). Export discipline:
 * packages/client/AGENTS.md.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
import { type WorkspaceKey } from './locales.ts';
export type { UiWorkspace } from './navigation.ts';
export type { DirectoryFlowOwnerProps, DirectoryFlowSlotName, DirectoryPickingHooks, DirectoryPickingInjected, WorkspaceBrowserInjected, WorkspaceBrowserProps, WorkspacePickerInjected, WorkspacePickerProps, } from './contract/slots.ts';
export type { WorkspaceKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface GlobalStandardProps {
        /** Selector hook over the pure Workspace Controller snapshot. */
        useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot>;
    }
    interface LocaleNamespaceMap {
        /** The workspace browsing region and pick/create flow copy. */
        workspace: WorkspaceKey;
    }
}
/**
 * Required services (cordis fiber inject). The target slots are declared by
 * the ui-sidebar / ui-conversation applies, whose activation order relative
 * to this one is NOT constrained: dsh.client.inject edges are informational
 * (loading/prefetch metadata, never apply sequencing) and neither owner
 * provides a waitable service. apply therefore depends on each slot
 * declaration through `slots.inject()` instead of assuming order.
 */
export declare const inject: string[];
/**
 * Register the browser and picker once their slot declarations are on the
 * ledger. Inject factories return plain callbacks; data reads use the
 * framework's global hooks.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map
/**
 * ModelSelect's injected face. The target 'conversation.input.model' seat is
 * declared (children table) and typed by ui-conversation's composer-bar
 * entry; this package only contributes the single occupant, so no SlotMap
 * merge lives here.
 */
import type { ModelSelection } from '@deepseek-ai/dsh-api-remotes/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { ModelDirectoryState } from './directory.ts';
/** Injected business face of the composer model seat. */
export interface ModelSelectInjected {
    /** Whether this session supports Agent-bound model inspection and selection. */
    available: boolean;
    /** The session's shared directory store (same instance the /model popup reads). */
    directory: SnapshotStore<ModelDirectoryState>;
    /** Ensure the shared advisory catalog is loaded (errors land on the store). */
    load: () => void;
    /**
     * Select a complete provider/model/reasoning selection.
     * @param selection - model selection and optional adapter-owned effort.
     * @returns whether the host accepted the selection.
     */
    select: (selection: ModelSelection) => Promise<boolean>;
}
//# sourceMappingURL=slots.d.ts.map
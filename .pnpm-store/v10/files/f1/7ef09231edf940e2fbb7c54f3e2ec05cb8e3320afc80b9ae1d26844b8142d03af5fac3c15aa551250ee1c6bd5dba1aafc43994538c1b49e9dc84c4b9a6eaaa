/**
 * Composer blocks: the one way another plugin stops a session's input.
 *
 * The composer cannot read the plugins that would know — the dependency runs
 * ui-model-selection → ui-conversation, never back — so a blocker pushes here and the
 * bar reads its own session's store. A block carries the localized reason it
 * exists, because the plugin that raised it owns that copy; the composer only
 * knows how to render an inert textarea with a placeholder, exactly as it
 * already does for a session with no workspace.
 *
 * This is an affordance, not enforcement: the Host refuses a prompt it cannot
 * route regardless of what any client disables.
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ComposerBlock, ComposerBlocks } from '../contract/composer-blocks.ts';
/** The per-session composer-block registry (one instance per plugin fiber). */
export declare class ComposerBlockRegistry implements ComposerBlocks {
    private readonly stores;
    /** @inheritdoc */
    set(sessionId: SessionId, block: ComposerBlock | undefined): void;
    /** @inheritdoc */
    storeFor(sessionId: SessionId): SnapshotStore<ComposerBlock | undefined>;
    /** @inheritdoc */
    forget(sessionId: SessionId): void;
}
//# sourceMappingURL=blocks.d.ts.map
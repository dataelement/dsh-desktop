/**
 * Compaction checkpoint provenance: the correlated source constructor and type
 * every backend uses for its replacement user message, plus the predicate that
 * recognizes persisted checkpoints.
 *
 * The seam itself lives in `@deepseek-ai/dsh-compaction`, which re-exports these
 * contracts; this module is a pure type/value/predicate outlet (no cordis
 * imports, no module augmentation) so client and wire programs can name the
 * checkpoint source without loading the host plugin's Context merges — the
 * `dsh-commands/brand` shape.
 *
 * @module @deepseek-ai/dsh-compaction/checkpoint
 */
const COMPACT_CHECKPOINT_MARKER = Object.freeze({ kind: 'plugin', plugin: 'compact' });
/**
 * Create checkpoint provenance correlated with one compaction transaction.
 * @param compactionId - owning compaction identity.
 * @param sourceCommandId - initiating manual command, when present.
 * @returns immutable checkpoint source.
 */
export function compactCheckpointSource(compactionId, sourceCommandId) {
    return Object.freeze({
        ...COMPACT_CHECKPOINT_MARKER,
        compactionId,
        ...sourceCommandId === undefined ? {} : { sourceCommandId },
    });
}
/**
 * Test whether a persisted message source identifies a compaction checkpoint.
 * @param source - source restored from a surface user message.
 * @returns whether the source carries the backend-independent checkpoint marker.
 */
export function isCompactCheckpointSource(source) {
    return source.kind === 'plugin' && source.plugin === COMPACT_CHECKPOINT_MARKER.plugin;
}
//# sourceMappingURL=checkpoint.js.map
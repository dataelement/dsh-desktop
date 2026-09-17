/**
 * Structured composition reads for plugin-listing surfaces: the plugin rows
 * each preset names, with each row's effective enablement. A preset with a
 * live standing mount answers from that mount's Loader entries — evaluated
 * `disabled`, real root-fiber states; a preset no session has composed since
 * boot answers from its composition file, with `!!js` disabled expressions
 * evaluated through the caller-supplied Loader evaluator so the file answer
 * matches the decision a mount on this host would make. A row whose
 * expression the evaluator refuses stays `'conditional'`.
 * @module @deepseek-ai/dsh-agent-presets/composition-inventory
 */
import type { FiberState } from '@deepseek-ai/cordis';
import { type EntryTree } from '@deepseek-ai/cordis-plugin-loader';
import type { PresetTrust } from './preset.ts';
/**
 * Effective enablement of one composition row: a literal or evaluated
 * boolean, or `'conditional'` when a `!!js` disabled expression could not be
 * evaluated outside a mount.
 */
export type CompositionRowEnablement = boolean | 'conditional';
/**
 * Evaluate one `!!js` disabled expression the way the Loader would at a mount
 * decision. Throwing refuses the answer: the row is reported `'conditional'`
 * rather than guessed.
 */
export type DisabledExpressionEvaluator = (expression: string) => unknown;
/** One plugin row a preset composition names. */
export interface AgentPresetCompositionRow {
    /**
     * The Loader-tree entry id when read from a live mount, else the id the
     * composition file declares; null when the file row declares none.
     */
    readonly entryId: string | null;
    /** Module specifier the row names. */
    readonly moduleName: string;
    /** Effective enablement, including disabled ancestor groups. */
    readonly enabled: CompositionRowEnablement;
    /** The row's own `!!js` disabled expression, when it carries one. */
    readonly condition?: string;
    /** Root-fiber state, present only when read from a live mount. */
    readonly fiberState?: FiberState;
}
/** One preset's roster identity beside its composition rows. */
export interface AgentPresetComposition {
    /** Stable preset id. */
    readonly id: string;
    /** Whether the deployment ships the preset or the user owns it. */
    readonly trust: PresetTrust;
    /** Display name the preset published. */
    readonly name?: string;
    /** Whether a session naming no preset composes this one. */
    readonly isDefault: boolean;
    /** Why this preset's rows cannot be read; absent when {@link rows} answers. */
    readonly broken?: string;
    /** Composition rows in composition order; empty when the preset is broken. */
    readonly rows: readonly AgentPresetCompositionRow[];
}
/**
 * Plugin rows of one composition file, for a preset with no live mount.
 *
 * Parsed with the Loader's own dialect ({@link entryListSchema}), so the rows
 * reported are the rows a mount would start from. A file that stopped reading
 * as a composition — discovery judged the preset healthy moments earlier, so
 * only an edit racing this read gets here — answers as broken with the raced
 * reason rather than dropping the rows silently.
 * @param path - absolute path of the composition file.
 * @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
 * @returns flattened rows in composition order, or why they cannot be read.
 */
export declare function fileComposition(path: string, evaluateExpression: DisabledExpressionEvaluator): Promise<{
    rows: AgentPresetCompositionRow[];
} | {
    broken: string;
}>;
/**
 * Plugin rows of one live standing composition, in Loader-entry order.
 * @param tree - the standing mount's entry tree.
 * @returns rows with the Loader's evaluated enablement and root-fiber states.
 */
export declare function mountedCompositionRows(tree: EntryTree): AgentPresetCompositionRow[];
//# sourceMappingURL=composition-inventory.d.ts.map
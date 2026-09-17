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
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { isJsExpr } from '@deepseek-ai/cordis-plugin-loader';
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include';
import { entryListProblem } from "./discovery.js";
/**
 * One `disabled` node's contribution to effective enablement, mirroring the
 * Loader's own reading: a `!!js` expression is asked of the evaluator — a
 * refusal (throw) leaves the decision to a mount — and anything else disables
 * exactly when `Boolean(value)` does.
 * @param value - the raw `disabled` node of one composition row.
 * @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
 * @returns true (disabled), false (enabled), or `'conditional'`.
 */
function disabledContribution(value, evaluateExpression) {
    if (isJsExpr(value)) {
        try {
            return Boolean(evaluateExpression(value.__jsExpr));
        }
        catch {
            // The evaluator refused (a malformed or context-dependent expression);
            // only a real mount decision can answer, so the row stays conditional.
            return 'conditional';
        }
    }
    return Boolean(value);
}
/**
 * Combine an ancestor group's disabled state with a row's own, the way the
 * Loader walks owning groups: any literal true disables, otherwise any
 * expression leaves the decision to a mount.
 * @param outer - the combined ancestor contribution.
 * @param own - this row's contribution.
 * @returns the row's effective disabled state.
 */
function combineDisabled(outer, own) {
    if (outer === true || own === true)
        return true;
    if (outer === 'conditional' || own === 'conditional')
        return 'conditional';
    return false;
}
/**
 * Flatten one parsed row list into plugin rows. Group rows are structural —
 * the Loader reports a group entry as always enabled and lets children
 * inherit its `disabled` — so only their children are emitted.
 * @param rows - the parsed rows, shape-checked by the caller.
 * @param outerDisabled - the combined ancestor-group disabled state.
 * @param evaluateExpression - the Loader-context evaluator for `!!js` nodes.
 * @param found - the accumulator receiving flattened rows.
 */
function flattenRows(rows, outerDisabled, evaluateExpression, found) {
    for (const value of rows) {
        const row = value;
        const disabled = combineDisabled(outerDisabled, disabledContribution(row.disabled, evaluateExpression));
        if (row.group === true) {
            flattenRows(row.config, disabled, evaluateExpression, found);
            continue;
        }
        found.push({
            entryId: typeof row.id === 'string' && row.id !== '' ? row.id : null,
            moduleName: row.name,
            enabled: disabled === true ? false : disabled === 'conditional' ? 'conditional' : true,
            ...isJsExpr(row.disabled) ? { condition: row.disabled.__jsExpr } : {},
        });
    }
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
export async function fileComposition(path, evaluateExpression) {
    let rows;
    try {
        rows = load(await readFile(path, 'utf8'), { schema: entryListSchema });
    }
    catch (error) {
        /* v8 ignore next -- fs and js-yaml throw Errors for every failure here; the fallback keeps a hostile value readable */
        return { broken: error instanceof Error ? error.message : String(error) };
    }
    const problem = entryListProblem(rows);
    if (problem !== undefined)
        return { broken: problem };
    const found = [];
    flattenRows(rows, false, evaluateExpression, found);
    return { rows: found };
}
/**
 * Plugin rows of one live standing composition, in Loader-entry order.
 * @param tree - the standing mount's entry tree.
 * @returns rows with the Loader's evaluated enablement and root-fiber states.
 */
export function mountedCompositionRows(tree) {
    const found = [];
    for (const entry of tree.entries()) {
        if (entry.options.group)
            continue;
        found.push({
            entryId: entry.id,
            moduleName: entry.options.name,
            enabled: !entry.disabled,
            ...isJsExpr(entry.options.disabled) ? { condition: entry.options.disabled.__jsExpr } : {},
            ...entry.fiber === undefined ? {} : { fiberState: entry.fiber.state },
        });
    }
    return found;
}
//# sourceMappingURL=composition-inventory.js.map
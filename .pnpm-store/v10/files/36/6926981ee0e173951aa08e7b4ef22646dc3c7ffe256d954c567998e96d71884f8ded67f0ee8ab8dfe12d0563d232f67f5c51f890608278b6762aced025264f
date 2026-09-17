/**
 * Browser half of the native directory-picker backend: fills ui-workspace's
 * two directory-flow holes with a renderless occupant that answers each
 * `open` by driving `directoryPicker/pick` (the node half's OS chooser) and
 * reporting the one outcome — picked path, cancellation, or failure — back
 * through the owner conversation. Mounting this package therefore composes
 * both sides of the native interaction with one cordis.yml row; no client
 * code branches on a capability kind.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Required services (cordis fiber inject): the slot registry and workspace UI service. */
export declare const inject: string[];
/**
 * Client plugin body: register the renderless native flow into both
 * directory-flow holes through `slots.inject()` because the ui-workspace
 * entries may activate later or replace their declarations.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
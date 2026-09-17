/**
 * Model-facing `str_replace_editor` over the Harness filesystem seam.
 * @module @deepseek-ai/dsh-tool-str-replace-editor
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-str-replace-editor";
export declare const inject: string[];
/** Configuration for the string-replacement editor tool. */
export interface Config {
    /** Maximum returned view characters before clipping (default 16000). */
    maxOutputChars?: number;
    /** Model-facing tool description. */
    description?: string;
}
/** Runtime configuration schema for the string-replacement editor tool. */
export declare const Config: z<Config>;
/** Register one `str_replace_editor` tool over `ctx.fs`. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
/**
 * Durable session skill catalog and model-facing `skill` loader tool.
 *
 * @module @deepseek-ai/dsh-tool-skill
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-skill";
export declare const inject: string[];
/**
 * Durable provider and item records for one published session skill catalog. The catalog is a
 * `catalog`-form context, so it records the entries it published beside the
 * model-facing prose: a consumer presenting the list must not re-parse the
 * `<available_skills>` block, whose framing exists for the model.
 */
export interface SkillCatalogSource {
    readonly kind: 'skill-catalog';
    readonly form: 'catalog';
    /** Marks a replacement catalog rather than this session's first publication. */
    readonly update?: true;
    /** Exactly the entries this message published, in catalog order. */
    readonly entries: readonly {
        readonly name: string;
        readonly description: string;
    }[];
}
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'skill-catalog': SkillCatalogSource;
    }
}
/** Model-facing skill catalog configuration. */
export interface Config {
    /** Maximum normalized description length rendered in the session catalog; minimum 3. */
    catalogDescriptionMaxLength?: number;
}
/** Validate and default the model-facing skill catalog configuration. */
export declare const Config: z<Config>;
/**
 * Register the model-facing skill loader and its visibility-matched
 * durable session catalog. The catalog is emitted only when the calling agent
 * resolves this plugin's exact tool registration; a restriction or scoped
 * same-name shadow therefore removes both the schema and its call guidance.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map
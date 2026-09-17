import type * as core from "../core/index.cjs";
import * as schemas from "./schemas.cjs";
export type input<T> = core.input<T>;
export type output<T> = core.output<T>;
/** Returns a copy of the schema with every pipe replaced by its input side. A codec's checks are dropped: they constrain the decoded value the input side never produces. */
export declare function input<T extends core.$ZodType>(schema: T): schemas.ZodType<core.input<T>, core.input<T>>;
/** Returns a copy of the schema with every pipe replaced by its output side, carrying over the pipe's own checks. */
export declare function output<T extends core.$ZodType>(schema: T): schemas.ZodType<core.output<T>, core.output<T>>;

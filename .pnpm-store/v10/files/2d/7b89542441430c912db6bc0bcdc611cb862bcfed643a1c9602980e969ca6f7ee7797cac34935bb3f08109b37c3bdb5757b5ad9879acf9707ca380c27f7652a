/**
 * The `node:vm` sandbox a dynamic package's HOST half evaluates in: a fresh realm whose globals
 * are a tagged write-through console, the `harness` registration helpers, the encoding primitives
 * a bare vm context lacks, and callable traps over the Node APIs the sandbox deliberately
 * withholds. Traps steer filesystem, network, process, and timer work to `ctx.fs`, `ctx.web`,
 * `ctx.bash`, and Cordis timers. This keeps cooperative packages inspectable and disposable but
 * is not containment: host-realm helper functions remain an escape route.
 *
 * The browser half never reaches this module — it is evaluated by the client-side runner in a
 * closure, with its own facade.
 * @module @deepseek-ai/dsh-cordis-host-runner/sandbox
 */
/** Exact Host closure symbols exposed by the sandbox and guarded Context. */
export declare const HOST_BUILTIN_INSPECTION: readonly [{
    readonly name: "ctx";
    readonly description: "Restricted Cordis Context. Prefer ctx.get(name) with an undefined check; use inject for hard dependencies.";
    readonly signatures: readonly ["ctx.get(name: string): unknown | undefined", "ctx.on(name: string, listener: Function): () => void", "ctx.provide(name: string, value: unknown): () => void", "ctx.effect(callback: Function, label?: string): () => void"];
}, {
    readonly name: "harness";
    readonly description: "Host helpers for Package-private Client RPC and model-visible dynamic Tools.";
    readonly signatures: readonly ["harness.handle(method: string, handler: (args: JsonValue) => JsonValue | Promise<JsonValue>): () => void", "harness.defineTool(definition: ToolDefinition): ToolDefinition", "harness.registerTool(ctx: Context, tool: ToolDefinition): () => void"];
}, {
    readonly name: "console";
    readonly description: "Package-tagged Host logging.";
    readonly signatures: readonly ["console.log(...values): void", "console.error(...values): void"];
}, {
    readonly name: "btoa";
    readonly description: "Encode UTF-8 text as base64.";
    readonly signatures: readonly ["btoa(value: string): string"];
}, {
    readonly name: "atob";
    readonly description: "Decode base64 as UTF-8 text.";
    readonly signatures: readonly ["atob(value: string): string"];
}, {
    readonly name: "TextEncoder";
    readonly description: "Standard UTF-8 encoder constructor.";
    readonly signatures: readonly ["new TextEncoder()"];
}, {
    readonly name: "TextDecoder";
    readonly description: "Standard text decoder constructor.";
    readonly signatures: readonly ["new TextDecoder(label?: string)"];
}];
/**
 * Build the vm context one host half evaluates in: the tagged console, the
 * `harness` registration helpers, the encoding primitives, the Node-API traps,
 * and the dual-realm `instanceof` patch, already `createContext`-ed.
 * @param id - the package id (`dyn-<n>`), used as the console tag and filename stem.
 * @param harnessExtras - per-package `harness` verbs beyond the registration pair (`handle`).
 * @returns the contextified sandbox object to pass to {@link evaluateHostCode}.
 */
export declare function createSandbox(id: string, harnessExtras?: Record<string, unknown>): object;
/**
 * The parse-failure context a vm `SyntaxError` carries: the vm prints the
 * offending source line and a caret before the message, which is exactly what
 * a model needs to self-correct — surface it instead of the bare message.
 * Falls back to `String(error)` when the stack carries no such prelude.
 * @param error - the `SyntaxError` (host- or sandbox-realm) thrown while compiling package code.
 * @returns the stack prefix up to and including the `SyntaxError: …` line.
 */
export declare function syntaxErrorContext(error: Error): string;
/**
 * The teaching text one parse failure produces, shared by the define-time
 * precheck and the run-time evaluation so a model reads the same diagnosis
 * whichever verb caught it.
 * @param half - which half failed to parse, named as the define argument that carried it.
 * @param context - the {@link syntaxErrorContext} of the failure.
 * @returns the model-facing error message.
 */
export declare function parseErrorMessage(half: 'code.host' | 'code.client', context: string): string;
/**
 * Parse one half's source without running it: the define-time precheck that
 * keeps unparseable code out of the registry, so a model fixes it and defines
 * again instead of discovering the failure at run time. `new Function` is the
 * gate — hosts without a real `node:vm` (the browser worker) still refuse
 * unparseable code — and `vm.Script` is only the best-effort prettifier: on a
 * Node host its failure carries the source-line-and-caret prelude the
 * teaching text builds on, and where the vm is a stub the message stays bare.
 * The two parsers' syntax faces differ at the margin (`new.target` parses in
 * a function body but not at the vm wrapper's top level), an accepted cost of
 * a vm-free gate; and under a page CSP without `'unsafe-eval'`, `new Function`
 * throws `EvalError`, which propagates unwrapped.
 * @param code - the model-written function body.
 * @param half - which define argument carried it, for the error text.
 * @throws when the body does not parse, with the offending line and a teaching hint.
 */
export declare function precheckCode(code: string, half: 'code.host' | 'code.client'): void;
/**
 * Evaluate a host half as the body of an async function inside the sandbox. `vmTimeoutMs` only
 * bounds the SYNCHRONOUS portion; an async body escapes it — acceptable under the module's
 * trust stance. Parse errors include the offending line and a TypeScript-removal or bracket-
 * balance hint.
 * @param sandbox - the contextified object from {@link createSandbox}.
 * @param code - the model-written function body; must `return` a plugin.
 * @param id - the package id, used as the vm filename (`cordis-dyn-<id>.js`).
 * @param vmTimeoutMs - the synchronous evaluation bound in milliseconds.
 * @returns whatever the code returned, still un-narrowed (the run lifecycle checks plugin shape).
 */
export declare function evaluateHostCode(sandbox: object, code: string, id: string, vmTimeoutMs: number): Promise<unknown>;
//# sourceMappingURL=sandbox.d.ts.map
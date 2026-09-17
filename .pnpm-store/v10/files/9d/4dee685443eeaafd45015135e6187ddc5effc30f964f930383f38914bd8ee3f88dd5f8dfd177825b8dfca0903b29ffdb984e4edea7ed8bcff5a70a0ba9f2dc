/** Standard ACP session configuration over one Agent's model selection. */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { type ModelSelection, type ModelSelectionRef } from '@deepseek-ai/dsh-agent';
import { type LlmRuntime } from '@deepseek-ai/dsh-llm';
/** Caller-correctable session configuration failure. */
export declare class AcpModelConfigError extends Error {
    constructor(message: string);
}
/** Project and mutate one Agent's provider/model/reasoning selection through ACP config options. */
export declare class AcpModelControl {
    private readonly llm;
    /** Scoped selection reference consumed by Agent request assembly. */
    readonly selection: ModelSelectionRef;
    private tail;
    private selected;
    private turnSelection;
    private hasResolvedState;
    constructor(llm: LlmRuntime, initial: ModelSelection | undefined);
    /**
     * Install request/prompt consistency listeners in the unpublished Agent scope.
     * @param agentCtx - Agent scope that consumes this selection.
     */
    install(agentCtx: Context): void;
    /**
     * Snapshot the selection attached to the next accepted ACP prompt.
     * @returns a detached future selection, or undefined when listeners supply the route.
     */
    snapshot(): ModelSelection | undefined;
    /**
     * Pin one admitted ACP message's selection for every step in its turn.
     * @param turn - admitted Agent turn.
     * @param selection - exact prompt-admission selection.
     */
    pinTurn(turn: number, selection: ModelSelection): void;
    /**
     * Release only the exact completed turn's routing override.
     * @param turn - completed Agent turn.
     */
    releaseTurn(turn: number): void;
    /**
     * Return the complete standard config-option state after prior mutations settle.
     * @param signal - optional catalog and exact-model cancellation.
     * @returns all current standard configuration options.
     */
    options(signal?: AbortSignal): Promise<SessionConfigOption[]>;
    /**
     * Set one advertised option and return the complete resulting option state.
     * @param configId - standard option id.
     * @param value - opaque selected value returned by a previous option state.
     * @param signal - optional catalog and exact-model cancellation.
     * @returns all standard options after the serialized mutation.
     */
    set(configId: string, value: unknown, signal?: AbortSignal): Promise<SessionConfigOption[]>;
    /** Keep concurrent client mutations in receive order without wedging after rejection. */
    private serialize;
    /** Build detached model choices and the dependent reasoning option. */
    private state;
    /** Validate an exact route and retain only Agent-owned selection fields. */
    private resolveSelection;
}
//# sourceMappingURL=model-control.d.ts.map
/**
 * Same-session goal domain: event-sourced state, compare-and-set mutations,
 * and process-local continuation activation.
 * @module @deepseek-ai/dsh-goal
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { randomUUID } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import { agentEvents } from '@deepseek-ai/dsh-agent';
import { SessionSeq } from '@deepseek-ai/dsh-session';
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { applyGoalEvent, goalChangeRef, } from "./fold.js";
import { GOAL_CHANGE_VERSION, GoalError, GoalId, } from "./runtime.js";
export { GOAL_CHANGE_VERSION, GoalError, GoalId } from "./runtime.js";
export { decodeGoalChange, foldGoal, goalChangeRef } from "./fold.js";
/** Wire payload schema of the `goal` projection (current goal or pre-create/cleared null). */
const goalProjectionSchema = zod.union([
    zod.object({
        goal: zod.object({
            id: zod.string().min(1),
            revision: zod.number().int().positive(),
            objective: zod.string().min(1),
            phase: zod.union([zod.literal('active'), zod.literal('paused'), zod.literal('blocked'), zod.literal('complete')]),
            blockedReason: zod.object({ code: zod.string(), message: zod.string() }).optional(),
            maxGoalRounds: zod.number().int().positive(),
        }),
        roundsStarted: zod.number().int().nonnegative(),
        createdAt: zod.number(),
        updatedAt: zod.number(),
    }),
    zod.null(),
]);
const goalProjectionStateSchema = zod.object({
    current: goalProjectionSchema,
    seenGoalIds: zod.array(zod.string().min(1)).refine(ids => new Set(ids).size === ids.length, { message: 'seen goal ids must be unique' }),
    failure: zod.string().min(1).nullable(),
}).strict().superRefine((state, context) => {
    if (state.current === null)
        return;
    if (!state.seenGoalIds.includes(state.current.goal.id)) {
        context.addIssue({ code: 'custom', message: 'current goal id must be retained among seen goal ids' });
    }
    if (state.current.updatedAt < state.current.createdAt) {
        context.addIssue({ code: 'custom', message: 'current goal update cannot precede its creation' });
    }
    if (state.current.roundsStarted > state.current.goal.maxGoalRounds) {
        context.addIssue({ code: 'custom', message: 'current goal rounds cannot exceed its configured limit' });
    }
});
/** Build strict fold state from one checkpoint-safe projection state. */
function goalFoldState(state) {
    return {
        goal: state.current?.goal,
        roundsStarted: state.current?.roundsStarted ?? 0,
        createdAt: state.current?.createdAt,
        updatedAt: state.current?.updatedAt,
        lastRef: undefined,
        seenGoalIds: new Set(state.seenGoalIds),
    };
}
/** Convert strict fold state into checkpoint-safe projection state. */
function goalProjectionState(state) {
    let current = null;
    if (state.goal !== undefined) {
        const { createdAt, updatedAt } = state;
        if (createdAt === undefined || updatedAt === undefined) {
            throw new Error('current goal fold lacks timestamps');
        }
        current = {
            goal: state.goal,
            roundsStarted: state.roundsStarted,
            createdAt,
            updatedAt,
        };
    }
    return {
        current,
        seenGoalIds: [...state.seenGoalIds],
        failure: null,
    };
}
/**
 * Fold durable goal events through the strict replay rules without throwing
 * from the projection registry's event drive. The first invalid owned event
 * is retained in `failure`; host goal access rejects that state while the
 * client view remains at the last valid goal.
 * @param state - the projection covering all prior events.
 * @param event - the next committed session event.
 * @returns the next projection (same reference when the event is unrelated).
 */
export function applyGoalProjection(state, event) {
    if (state.failure !== null)
        return state;
    if (event.type !== 'goal/change'
        && (event.type !== 'user/message' || event.data.source.kind !== 'goal'))
        return state;
    const folded = goalFoldState(state);
    try {
        applyGoalEvent(folded, event);
        return goalProjectionState(folded);
    }
    catch (error) {
        /* v8 ignore next -- the strict goal fold throws Error instances. */
        const message = error instanceof Error ? error.message : String(error);
        return { ...state, failure: `goal replay failed at session event ${event.seq}: ${message}` };
    }
}
/** Strict host goal state with the existing cropped client value. */
export const goalProjectionDefinition = {
    key: 'goal',
    stateSchema: goalProjectionStateSchema,
    init: () => ({ current: null, seenGoalIds: [], failure: null }),
    apply: applyGoalProjection,
    wire: { viewSchema: goalProjectionSchema, view: state => state.current },
    stateVersion: 6,
};
/** Validate a caller-visible positive safe-integer round cap. */
function resolveMaxGoalRounds(value) {
    if (!Number.isSafeInteger(value) || value < 1) {
        throw new GoalError('maxGoalRounds must be a positive safe integer', 'GOAL_INVALID_MAX_ROUNDS');
    }
    return value;
}
/** Validate and normalize an objective at the domain boundary. */
function resolveObjective(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new GoalError('goal objective must be a non-empty string', 'GOAL_INVALID_OBJECTIVE');
    }
    return value.trim();
}
/** Materialize deployment defaults and validate one create request. */
function resolveCreateGoal(request, defaultMaxGoalRounds) {
    return {
        objective: resolveObjective(request.objective),
        maxGoalRounds: resolveMaxGoalRounds(request.maxGoalRounds ?? defaultMaxGoalRounds),
    };
}
/** Validate and detach one policy-owned blocker explanation. */
function resolveBlockReason(reason) {
    const record = typeof reason === 'object' && reason !== null && !Array.isArray(reason)
        ? reason
        : undefined;
    const code = record?.['code'];
    const message = record?.['message'];
    if (typeof code !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code)
        || typeof message !== 'string' || message.trim().length === 0) {
        throw new GoalError('goal block reason requires a lower-kebab-case code and a non-empty message', 'GOAL_INVALID_BLOCK_REASON');
    }
    return { code, message: message.trim() };
}
/** Goal service (`ctx.goals`) backed exclusively by the owning session log. */
let GoalService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _get_decorators;
    let _edit_decorators;
    let _pause_decorators;
    let _resume_decorators;
    let _complete_decorators;
    let _clear_decorators;
    let _remoteExportCreate_decorators;
    return class GoalService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _get_decorators = [Remote('get')];
            _edit_decorators = [Remote('edit')];
            _pause_decorators = [Remote('pause')];
            _resume_decorators = [Remote('resume')];
            _complete_decorators = [Remote('complete')];
            _clear_decorators = [Remote('clear')];
            _remoteExportCreate_decorators = [Remote('create')];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _edit_decorators, { kind: "method", name: "edit", static: false, private: false, access: { has: obj => "edit" in obj, get: obj => obj.edit }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _pause_decorators, { kind: "method", name: "pause", static: false, private: false, access: { has: obj => "pause" in obj, get: obj => obj.pause }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resume_decorators, { kind: "method", name: "resume", static: false, private: false, access: { has: obj => "resume" in obj, get: obj => obj.resume }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _complete_decorators, { kind: "method", name: "complete", static: false, private: false, access: { has: obj => "complete" in obj, get: obj => obj.complete }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clear_decorators, { kind: "method", name: "clear", static: false, private: false, access: { has: obj => "clear" in obj, get: obj => obj.clear }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remoteExportCreate_decorators, { kind: "method", name: "remoteExportCreate", static: false, private: false, access: { has: obj => "remoteExportCreate" in obj, get: obj => obj.remoteExportCreate }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'sessionProjections'];
        static Config = z.object({
            defaultMaxGoalRounds: z.number().default(256),
        });
        resolved = __runInitializers(this, _instanceExtraInitializers);
        runtimeStates = new WeakMap();
        constructor(ctx, config = {}) {
            super(ctx, 'goals');
            this.resolved = {
                defaultMaxGoalRounds: resolveMaxGoalRounds(config.defaultMaxGoalRounds ?? 256),
            };
            ctx.on('agent/session-start', ({ agent }) => {
                this.setActivation(agent.session, 'disarmed');
            });
            ctx.sessionProjections.register(goalProjectionDefinition);
            ctx.on('session/event', (session, event) => {
                if (event.type !== 'goal/change')
                    return;
                const runtime = this.runtimeState(session);
                const activation = runtime.pendingActivation !== undefined
                    && SessionSeq(runtime.pendingActivation.offset) === event.seq
                    ? runtime.pendingActivation.activation
                    : 'disarmed';
                this.setActivation(session, activation);
            });
        }
        /**
         * Read the current goal for one exact live agent.
         * @param agent - owning live agent.
         * @returns a fresh view or `undefined` when no goal is current.
         * @throws {@link GoalError} when the agent is not the registry's live instance.
         */
        get(agent) {
            this.assertLive(agent);
            return this.view(this.state(agent.session), this.runtimeState(agent.session));
        }
        /**
         * Remove process-local continuation authority without changing durable goal
         * phase or revision. Lifecycle owners use this before unloading a driver;
         * a later human-authorized {@link resume} records the new activation edge.
         * @param agent - owning live agent.
         * @returns a fresh disarmed view, or `undefined` when no goal is current.
         */
        disarm(agent) {
            this.assertLive(agent);
            this.setActivation(agent.session, 'disarmed');
            const runtime = this.runtimeState(agent.session);
            return this.view(this.state(agent.session), runtime);
        }
        /**
         * Create and arm a goal. A completed goal may be replaced; every other
         * current phase must be cleared or resumed instead.
         * @param agent - owning live agent.
         * @param request - objective and optional round cap.
         * @returns the created live view.
         */
        create(agent, request) {
            const spec = resolveCreateGoal(request, this.resolved.defaultMaxGoalRounds);
            const [state, runtime] = this.prepareMutation(agent);
            const current = state?.goal;
            if (current !== undefined && current.phase !== 'complete') {
                throw new GoalError(`goal "${current.id}" already exists with phase "${current.phase}"`, 'GOAL_ALREADY_EXISTS');
            }
            const now = Date.now();
            const goal = {
                id: GoalId(`goal-${randomUUID()}`),
                revision: 1,
                objective: spec.objective,
                phase: 'active',
                maxGoalRounds: spec.maxGoalRounds,
            };
            return this.commitSnapshot(agent, runtime, 'create', goal, 0, now, now, 'armed');
        }
        /**
         * Edit objective and/or round cap without changing phase.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @param request - at least one replacement field.
         * @returns the edited view.
         */
        edit(agent, ref, request) {
            const [state, runtime] = this.prepareMutation(agent);
            const currentState = this.expectCurrent(state, ref);
            const current = currentState.goal;
            if (request.objective === undefined && request.maxGoalRounds === undefined) {
                throw new GoalError('goal edit requires objective and/or maxGoalRounds', 'GOAL_INVALID_EDIT');
            }
            const goal = {
                ...current,
                revision: current.revision + 1,
                ...request.objective === undefined ? {} : { objective: resolveObjective(request.objective) },
                ...request.maxGoalRounds === undefined ? {} : { maxGoalRounds: resolveMaxGoalRounds(request.maxGoalRounds) },
            };
            return this.commitCurrent(agent, currentState, runtime, 'edit', goal, runtime.activation);
        }
        /**
         * Pause an active goal and disarm automatic continuation.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @returns the paused view.
         */
        pause(agent, ref) {
            return this.transition(agent, ref, 'pause', ['active'], 'paused', 'disarmed');
        }
        /**
         * Resume and arm a stopped goal, or rearm an active goal after a
         * session-start edge, while its round budget still has capacity.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @returns the active view.
         */
        resume(agent, ref) {
            const [state, runtime] = this.prepareMutation(agent);
            const currentState = this.expectCurrent(state, ref);
            const current = currentState.goal;
            const resumable = ['active', 'paused', 'blocked'];
            if (!resumable.includes(current.phase)) {
                throw this.transitionError(current, 'resume', resumable);
            }
            if (current.phase === 'active' && runtime.activation === 'armed') {
                throw new GoalError(`goal "${current.id}" is already active and armed`, 'GOAL_INVALID_TRANSITION');
            }
            if (currentState.roundsStarted >= current.maxGoalRounds) {
                throw new GoalError(`goal "${current.id}" exhausted ${current.maxGoalRounds} goal rounds; increase maxGoalRounds before resuming`, 'GOAL_INVALID_TRANSITION');
            }
            return this.commitCurrent(agent, currentState, runtime, 'resume', this.withPhase(current, 'active'), 'armed');
        }
        /**
         * Mark a current non-complete goal complete and disarm it.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @returns the completed view.
         */
        complete(agent, ref) {
            return this.transition(agent, ref, 'complete', ['active', 'paused', 'blocked'], 'complete', 'disarmed');
        }
        /**
         * Mark an active goal blocked and disarm it.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @param reason - policy-owned stable code and human-readable explanation.
         * @returns the blocked view with its durable reason.
         */
        block(agent, ref, reason) {
            const [state, runtime] = this.prepareMutation(agent);
            const currentState = this.expectCurrent(state, ref);
            const current = currentState.goal;
            if (current.phase !== 'active') {
                throw this.transitionError(current, 'block', ['active']);
            }
            return this.commitCurrent(agent, currentState, runtime, 'block', { ...this.withPhase(current, 'blocked'), blockedReason: resolveBlockReason(reason) }, 'disarmed');
        }
        /**
         * Clear the current goal while retaining a durable tombstone and history.
         * @param agent - owning live agent.
         * @param ref - expected current revision.
         * @returns the tombstone ref whose revision is one past the cleared snapshot.
         */
        clear(agent, ref) {
            const [state, runtime] = this.prepareMutation(agent);
            const currentState = this.expectCurrent(state, ref);
            const current = currentState.goal;
            const tombstone = { id: current.id, revision: current.revision + 1 };
            const change = {
                kind: 'goal/change',
                version: GOAL_CHANGE_VERSION,
                operation: 'clear',
                cleared: tombstone,
                clearedAt: this.nextMutationTime(currentState),
            };
            this.commit(agent, runtime, change, 'disarmed');
            return { ...tombstone };
        }
        /** Resolve the durable and process-local state used by a mutation. */
        prepareMutation(agent) {
            this.assertLive(agent);
            return [this.state(agent.session), this.runtimeState(agent.session)];
        }
        /** Reject stale or missing current-state refs. */
        expectCurrent(state, ref) {
            if (state === null)
                throw new GoalError('no current goal', 'GOAL_NOT_FOUND');
            const current = state.goal;
            if (ref.id !== current.id || ref.revision !== current.revision) {
                throw new GoalError(`stale goal ref "${ref.id}" revision ${ref.revision}; current is "${current.id}" revision ${current.revision}`, 'GOAL_STALE_REVISION');
            }
            return state;
        }
        /** Enforce exact live-agent identity rather than trusting a matching id. */
        assertLive(agent) {
            if (this.ctx.agents.get(agent.id) !== agent) {
                throw new GoalError(`agent "${agent.id}" is not live in this registry`, 'GOAL_AGENT_NOT_LIVE');
            }
        }
        /** Read the current durable projection maintained by the registry. */
        state(session) {
            const state = this.ctx.sessionProjections.stateOf(session, 'goal');
            if (state === undefined)
                throw new Error('goal projection is not registered');
            if (state.failure !== null)
                throw new Error(state.failure);
            return state.current;
        }
        /** Return the process-local activation state, initially disarmed. */
        runtimeState(session) {
            let runtime = this.runtimeStates.get(session);
            if (runtime !== undefined)
                return runtime;
            runtime = {
                activation: 'disarmed',
                pendingActivation: undefined,
            };
            this.runtimeStates.set(session, runtime);
            return runtime;
        }
        /** Publish one process-local activation edge when it actually changes. */
        setActivation(session, activation) {
            const runtime = this.runtimeState(session);
            if (runtime.activation === activation)
                return;
            runtime.activation = activation;
            const state = this.ctx.sessionProjections.stateOf(session, 'goal');
            /* v8 ignore next -- static inject requires the projection registry before this service activates. */
            if (state === undefined)
                return;
            if (state.failure !== null)
                return;
            const goal = this.view(state.current, runtime);
            this.ctx.emit('goal/activation-changed', {
                sessionId: session.id,
                ...goal === undefined ? {} : {
                    goal: {
                        id: goal.id,
                        revision: goal.revision,
                        activation: goal.activation,
                    },
                },
            });
        }
        /** Build a new revision with one replacement phase. */
        withPhase(current, phase) {
            return {
                id: current.id,
                revision: current.revision + 1,
                objective: current.objective,
                phase,
                maxGoalRounds: current.maxGoalRounds,
            };
        }
        /** Shared validated phase transition. */
        transition(agent, ref, operation, allowed, phase, activation) {
            const [state, runtime] = this.prepareMutation(agent);
            const currentState = this.expectCurrent(state, ref);
            const current = currentState.goal;
            if (!allowed.includes(current.phase))
                throw this.transitionError(current, operation, allowed);
            return this.commitCurrent(agent, currentState, runtime, operation, this.withPhase(current, phase), activation);
        }
        /** Render a stable invalid-transition error. */
        transitionError(current, operation, allowed) {
            return new GoalError(`cannot ${operation} goal "${current.id}" from phase "${current.phase}"; expected ${allowed.join(' or ')}`, 'GOAL_INVALID_TRANSITION');
        }
        /** Commit a mutation that retains the current goal's derived counters/times. */
        commitCurrent(agent, state, runtime, operation, goal, activation) {
            return this.commitSnapshot(agent, runtime, operation, goal, state.roundsStarted, state.createdAt, this.nextMutationTime(state), activation);
        }
        /** Clamp a current goal's next timestamp across backward wall-clock movement. */
        nextMutationTime(state) {
            return Math.max(Date.now(), state.updatedAt);
        }
        /** Build and commit one full-snapshot mutation. */
        commitSnapshot(agent, runtime, operation, goal, roundsStarted, createdAt, updatedAt, activation) {
            const change = {
                kind: 'goal/change',
                version: GOAL_CHANGE_VERSION,
                operation,
                goal,
                roundsStarted,
                createdAt,
                updatedAt,
            };
            this.commit(agent, runtime, change, activation);
            return {
                ...goal,
                roundsStarted,
                createdAt,
                updatedAt,
                activation: runtime.activation,
            };
        }
        /** Commit one mutation into the goal log and live event stream. */
        commit(agent, runtime, change, activation) {
            const ref = goalChangeRef(change);
            runtime.pendingActivation = { offset: agent.session.seq, activation };
            try {
                const event = agent.session.append('goal/change', change);
                /* v8 ignore next -- Session.append returns the event committed at the pre-append seq. */
                if (SessionSeq(runtime.pendingActivation.offset) === event.seq)
                    runtime.activation = activation;
            }
            finally {
                runtime.pendingActivation = undefined;
            }
            const goal = this.view(this.state(agent.session), runtime);
            const notification = {
                operation: change.operation,
                ref: { ...ref },
                ...goal === undefined ? {} : { goal },
            };
            agentEvents(this.ctx, agent).emit('goal/changed', { change: notification });
        }
        /** Build a detached current view. */
        view(state, runtime) {
            if (state === null)
                return undefined;
            return {
                ...state.goal,
                roundsStarted: state.roundsStarted,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
                activation: runtime.activation,
            };
        }
        /**
         * Create one Goal through the remote boundary.
         * @param agent - exact live Agent resolved from the wire identity.
         * @param request - objective and optional round cap.
         * @returns the created Goal identity.
         */
        remoteExportCreate(agent, request) {
            const view = this.create(agent, request);
            return { ref: { id: view.id, revision: view.revision } };
        }
    };
})();
export { GoalService };
export default GoalService;
//# sourceMappingURL=index.js.map
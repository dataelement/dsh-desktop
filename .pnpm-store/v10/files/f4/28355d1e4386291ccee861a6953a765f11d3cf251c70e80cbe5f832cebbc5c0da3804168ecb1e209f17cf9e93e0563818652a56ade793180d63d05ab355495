/**
 * User-facing permission presets over the independent sandbox-mode and
 * approval-policy knobs. A switch records the selected preset, then writes
 * changed knobs through their canonical setters. Execution, prompt narration,
 * and replay keep reading their knob folds. The preset event preserves user
 * intent when two presets share a bundle. The read side ships as the
 * `permissions` session projection; the write side ships as the
 * `/permission` command.
 *
 * @module dsh-permission-presets
 */
import { Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import { SANDBOX_MODES, setSandboxMode } from '@deepseek-ai/dsh-sandbox-policy';
import { APPROVAL_POLICIES, setApprovalPolicy } from '@deepseek-ai/dsh-user-approval';
/**
 * Returned when effective knob values match no table entry. Clients may show
 * it as the current value, but it is never a switch target or event payload.
 */
export const CUSTOM_PRESET = 'custom';
/** Settings namespace carrying the default for future sessions. */
export const PERMISSION_SETTINGS_NAMESPACE = 'permission';
const permissionStateSchema = zod.object({
    preset: zod.string().nullable(),
    sandbox: zod.union([
        zod.literal('read-only'),
        zod.literal('workspace-write'),
        zod.literal('danger-full-access'),
    ]).nullable(),
    approval: zod.union([zod.literal('ask'), zod.literal('never')]).nullable(),
    seeded: zod.boolean(),
}).strict();
/** State for the empty log: every knob at its composition default. */
const EMPTY_KNOBS = { preset: null, sandbox: null, approval: null };
/**
 * One-event permission-state transition (the projection unit's `apply`). Unrelated
 * events return the same reference — the registry's change gate.
 * @param state - the folded knob state before `event`.
 * @param event - one committed session event.
 * @returns the next state; the same reference when the event is unrelated.
 */
function applyPermissionEvent(state, event) {
    switch (event.type) {
        case 'permission/preset':
            return { ...state, preset: event.data.preset };
        case 'sandbox/mode':
            return { ...state, sandbox: event.data.mode };
        case 'approval/policy':
            return { ...state, approval: event.data.policy };
        case 'session/end-seed':
            return { ...state, seeded: true };
        default:
            return state;
    }
}
/**
 * Owns the deployment's permission presets and their write path. Requires a
 * confining `ctx.shell` executor and `ctx.approval`; unmatched knob values are
 * reported as {@link CUSTOM_PRESET}, not an error.
 */
export class PermissionPresetService extends Service {
    // Inline schema call: the config catalog walks `static Config` statically.
    static Config = z.object({
        presets: z.dict(z.object({
            sandbox: z.union(SANDBOX_MODES).required(),
            approval: z.union(APPROVAL_POLICIES).required(),
            name: z.string(),
            description: z.string(),
        })).default({
            'workspace-write': {
                sandbox: 'workspace-write', approval: 'ask',
                name: 'workspace-write', description: 'Write inside the workspace and permitted temporary directories; wider retries require approval.',
            },
            'danger-full-access': {
                sandbox: 'danger-full-access', approval: 'never',
                name: 'danger-full-access', description: 'Full file access without approval prompts.',
            },
        }),
        defaultPreset: z.string(),
    });
    static inject = ['shell', 'approval', 'sessions', 'sessionProjections'];
    presets;
    defaultSettings;
    constructor(ctx, config) {
        super(ctx, 'permissionPresets');
        // The schema defaulted the table — the cast records that runtime fact.
        this.presets = config.presets;
        if (CUSTOM_PRESET in this.presets) {
            throw new Error(`permission: "${CUSTOM_PRESET}" is reserved for the derived not-a-preset state and cannot name a table entry`);
        }
        if (ctx.shell.sandboxMode === undefined) {
            throw new Error('permission: the mounted bash executor does not confine (no sandboxMode) — presets bundle a sandbox mode, so composing this plugin over an unconfined executor is a misconfiguration');
        }
        const inferredDefault = this.derive(EMPTY_KNOBS);
        const defaultPreset = config.defaultPreset ?? inferredDefault;
        if (defaultPreset === CUSTOM_PRESET) {
            throw new Error('permission: composed sandbox and approval defaults match no preset; configure defaultPreset explicitly');
        }
        this.resolve(defaultPreset);
        const baseSettings = { defaultPreset };
        this.defaultSettings = () => baseSettings;
        const presetChoices = this.names.map((name) => {
            const choice = z.const(name);
            const label = this.presets[name]?.name;
            return label === undefined ? choice : choice.description(label);
        });
        const settingsSchema = z.object({
            defaultPreset: z.union(presetChoices).required(),
        });
        ctx.inject(['settings'], (settingsCtx) => {
            settingsCtx.settings.installSection(ctx, PERMISSION_SETTINGS_NAMESPACE, settingsSchema, baseSettings, {
                setSource: (current) => {
                    this.defaultSettings = current;
                },
                // The source thunk reads the latest scope snapshot at session creation;
                // no process-level registration needs replacement on change.
                onChange: () => { },
            });
        });
        // zod `.optional()` types the key `string | undefined` while the domain
        // says `description?: string`; on the JSON wire the two serialize
        // identically (absent), so the cast records exactly that
        // exactOptionalPropertyTypes widening (the Wire<T> precedent).
        const selectSchema = zod.object({
            options: zod.array(zod.object({
                value: zod.string().min(1),
                name: zod.string().min(1),
                description: zod.string().optional(),
            })),
            currentValue: zod.string().min(1),
        });
        ctx.sessionProjections.register({
            key: 'permissions',
            stateVersion: 2,
            stateSchema: permissionStateSchema,
            init: () => ({ ...EMPTY_KNOBS, seeded: false }),
            apply: applyPermissionEvent,
            wire: { viewSchema: selectSchema, view: state => this.selectFor(state) },
        });
        ctx.on('session/created', (session) => {
            this.pinInitialPermission(session);
        });
        for (const session of ctx.sessions.list()) {
            this.pinInitialPermission(session);
        }
        // The /permission command: the one write path a web client uses (the
        // popup contribution submits the picked preset as this line). The child
        // activates only when a command registry is composed.
        ctx.inject(['commands'], (commandCtx) => {
            commandCtx.commands.register({
                name: 'permission',
                description: 'Switch the permission preset (sandbox mode + approval policy)',
                input: { hint: '<preset>' },
                // No settlement text labels its value with this command's own name: a
                // surface that renders `name · text` (the web command row) would
                // otherwise read `permission · Permission preset: workspace-write.`
                handler: ({ agent, rawInput }) => {
                    const name = rawInput.trim();
                    if (name === '') {
                        return { kind: 'success', text: `current preset ${this.current(agent.session)} (available: ${this.names.join(', ')})` };
                    }
                    if (!this.names.includes(name)) {
                        return { kind: 'error', text: `unknown preset "${name}" (available: ${this.names.join(', ')})` };
                    }
                    this.apply(agent.session, name, (policy) => { this.ctx.approval.setPolicy(agent, policy); });
                    return { kind: 'success', text: `preset ${name}` };
                },
            });
        });
    }
    /**
     * The advertised preset names, in the preset table's declaration order.
     * @returns every switchable preset name.
     */
    get names() {
        return Object.keys(this.presets);
    }
    /**
     * The preset currently selected as the default for future sessions.
     * @returns the resolved settings value, or the composition default without
     * a mounted settings provider.
     */
    get defaultPreset() {
        return this.defaultSettings().defaultPreset;
    }
    permissionState(session) {
        const state = this.ctx.sessionProjections.stateOf(session, 'permissions');
        if (state === undefined)
            throw new Error('permission: permissions session projection is not registered');
        return state;
    }
    /**
     * Resolve the preset matching the effective knob values. A still-matching
     * last selection wins shared-bundle ties; otherwise the first table match
     * wins, or {@link CUSTOM_PRESET} when no entry matches.
     * @param session - the session whose knob state is read.
     * @returns the effective preset name, or `custom` when nothing matches.
     */
    current(session) {
        return this.derive(this.permissionState(session));
    }
    /** Resolve the preset for one folded knob state (the shared mathematics of `current` and the projection unit). */
    derive(state) {
        const sandbox = state.sandbox ?? this.ctx.shell.sandboxMode;
        const approval = state.approval ?? this.ctx.approval.config.policy ?? 'ask';
        const matches = (spec) => spec.sandbox === sandbox && spec.approval === approval;
        if (state.preset !== null) {
            const spec = this.presets[state.preset];
            if (spec !== undefined && matches(spec))
                return state.preset;
        }
        for (const [name, spec] of Object.entries(this.presets)) {
            if (matches(spec))
                return name;
        }
        return CUSTOM_PRESET;
    }
    /**
     * Build the whole select value for one folded knob state: every table
     * option in declaration order, `custom` appended exactly while derived.
     * @param state - the folded knob overrides.
     * @returns the `permissions` projection payload.
     */
    selectFor(state) {
        const currentValue = this.derive(state);
        return {
            options: [
                ...this.names.map(name => this.optionOf(name)),
                ...currentValue === CUSTOM_PRESET ? [this.optionOf(CUSTOM_PRESET)] : [],
            ],
            currentValue,
        };
    }
    /**
     * Resolve a preset's knob bundle.
     * @param name - the preset name to resolve.
     * @returns the configured bundle.
     * @throws when `name` is not in the table.
     */
    resolve(name) {
        const spec = this.presets[name];
        if (spec === undefined) {
            throw new Error(`permission: unknown preset "${name}" (known: ${Object.keys(this.presets).join(', ')})`);
        }
        return spec;
    }
    /**
     * Build the client option for a table entry or {@link CUSTOM_PRESET}. A
     * missing label falls back to the table key.
     * @param name - a table key, or `custom`.
     * @returns the option a client renders.
     * @throws when `name` is neither a table key nor `custom`.
     */
    optionOf(name) {
        if (name === CUSTOM_PRESET) {
            return { value: CUSTOM_PRESET, name: 'Custom', description: 'Current sandbox and approval settings do not match a preset.' };
        }
        const spec = this.resolve(name);
        return { value: name, name: spec.name ?? name, ...spec.description !== undefined ? { description: spec.description } : {} };
    }
    /**
     * Record a changed preset, then update each changed knob through its own
     * setter. Selecting the effective preset again appends nothing.
     * @param session - the session the switch belongs to.
     * @param name - the preset to switch to; unknown names throw.
     */
    set(session, name) {
        this.apply(session, name, (policy) => { setApprovalPolicy(session, policy); });
    }
    /** Apply one preset with the caller-selected live or initialization policy writer. */
    apply(session, name, setApproval) {
        const spec = this.resolve(name);
        if (this.current(session) !== name) {
            session.append('permission/preset', { preset: name });
        }
        const knobs = this.permissionState(session);
        if (spec.sandbox !== (knobs.sandbox ?? this.ctx.shell.sandboxMode)) {
            setSandboxMode(session, spec.sandbox);
        }
        if (spec.approval !== (knobs.approval ?? this.ctx.approval.config.policy ?? 'ask')) {
            setApproval(spec.approval);
        }
    }
    /**
     * Fill every missing permission fact before a session is published. A
     * genuinely fresh session uses the current user default; seeded or partially
     * initialized sessions preserve their effective knob values and only gain
     * the missing durable facts.
     */
    pinInitialPermission(session) {
        const state = this.permissionState(session);
        const selected = state.preset;
        const sandbox = state.sandbox;
        const approval = state.approval;
        const seeded = state.seeded;
        if (selected === null && sandbox === null && approval === null && !seeded) {
            const name = this.defaultPreset;
            const spec = this.resolve(name);
            session.append('permission/preset', { preset: name });
            setSandboxMode(session, spec.sandbox);
            setApprovalPolicy(session, spec.approval);
            return;
        }
        const effective = this.derive(state);
        if (selected === null && effective !== CUSTOM_PRESET) {
            session.append('permission/preset', { preset: effective });
        }
        if (sandbox === null) {
            setSandboxMode(session, this.ctx.shell.sandboxMode);
        }
        if (approval === null) {
            setApprovalPolicy(session, this.ctx.approval.config.policy ?? 'ask');
        }
    }
}
export default PermissionPresetService;
//# sourceMappingURL=index.js.map
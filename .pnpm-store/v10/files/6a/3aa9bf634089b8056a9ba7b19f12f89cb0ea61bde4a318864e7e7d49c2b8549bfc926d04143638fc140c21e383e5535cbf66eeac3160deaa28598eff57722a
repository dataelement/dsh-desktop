---
description: "User-facing permission presets for users and maintainers choosing, configuring, or debugging the Permissions selector that bundles sandbox mode with an approval policy."
kind: "package-reference"
---

# @deepseek-ai/dsh-permission-presets

English | [中文](README.zh.md)

## Summary

Permission presets give users one selector for applying sandbox mode and approval policy together. A deployment can configure named presets and a default for newly created sessions; changing that default does not alter existing sessions, and the shipped table includes `workspace-write` and `danger-full-access`. If the current combination matches no preset, clients show the derived `custom` state, but users cannot select or persist it; switching presets changes only settings whose effective values differ. The `/permission` command reports or changes the current preset, while sandbox execution and approval handling remain separate enforcement mechanisms.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Choose this service when a deployment wants to offer users one Permissions selector instead of separate sandbox and approval controls. It bundles the knobs; execution and approval keep their own values, so removing the package later leaves the last selection in effect.

### Configuring presets

The plugin config defines the preset table and the default for fresh sessions. Each preset name bundles one sandbox mode with one approval policy; `name` and `description` are optional client presentation.

```yaml
- name: '@deepseek-ai/dsh-permission-presets'
  config:
    presets:
      workspace-write:
        sandbox: workspace-write
        approval: ask
      danger-full-access:
        sandbox: danger-full-access
        approval: never
    defaultPreset: workspace-write
```

| Field | Default | Meaning |
|---|---|---|
| `presets` | `workspace-write`, `danger-full-access` | Table of preset name → sandbox/approval bundle |
| `defaultPreset` | inferred | Preset pinned into fresh sessions; required when composition defaults match no preset |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-permission-presets) is the exhaustive source for every accepted field and its JSDoc. The name `custom` is reserved for the derived not-a-preset state and cannot name a table entry. Mounting requires a confining bash executor (one that reports a `sandboxMode`) and the approval service.

### Switching presets

Switching to a preset changes only the knobs whose effective value differs; selecting the preset already in effect changes nothing. The current value resolves as the still-matching last recorded selection, else the first matching table entry, else `custom`. Users switch through the `/permission` command: a bare invocation reports the current preset and the available table, and a preset argument switches to it.

### What users see

Clients render the select with every switchable preset in table order, plus `custom` shown exactly while it is current. `custom` is display-only — callers can switch away from an unmatched knob combination but cannot select or persist a named custom preset through this service.

### Session defaults

The `permission` settings namespace holds `defaultPreset` for future sessions: session creation reads it, applies it to the sandbox mode and approval policy, and records the applied preset as a `permission/preset` selection. Later settings changes never alter an existing session. A resumed seed, including an explicitly empty one marked by `session/end-seed`, preserves its effective permission and receives only missing durable facts rather than the latest user default.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The observable behavior is covered in [Use this package](#use-this-package); this section explains the write path, the read side, and the optional children.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | `PermissionPresetService`: preset table, write path, settings namespace, session pinning, children |
| [`src/types.ts`](src/types.ts) | `permissions` projection-key declaration and select payload types |
| [`src/invariant.ts`](src/invariant.ts) | Invariant companion validating that `permission/preset` names a resolvable preset |

### Write path

`apply()` resolves the preset, appends `permission/preset` only when the effective preset changes, then writes each changed knob through its canonical setter — `setSandboxMode` from `dsh-sandbox-policy` and `setApprovalPolicy` from `dsh-user-approval`. The selection event precedes the knob events so user intent survives when two presets share a bundle; a net-zero selection appends nothing.

### Read side and `custom`

`current(session)` reads the `permissions` projection, whose unit folds the three whole-value knob events over the composition defaults (`ctx.shell.sandboxMode` and the approval config). The host state also retains whether `session/end-seed` has occurred, so session pinning distinguishes an explicitly empty restored seed from a genuinely fresh session without rescanning the log. A still-matching last selection wins shared-bundle ties; otherwise the first table match wins; otherwise the derived `CUSTOM_PRESET` is returned. A missing registry or projection key fails explicitly.

### Session pinning and blank reuse

Mounting pins every live and future session: a genuinely fresh session gains the default preset and both knob facts, while seeded or partially initialized sessions keep their effective knob values and gain only missing durable facts. The projection-owned seed marker makes this decision from the same incremental state as the knob values.

### Optional children

The `permissions` projection unit registers only when a `ctx.sessionProjections` registry is composed; the `/permission` command registers only when a `ctx.commands` registry is composed. Calls that derive the current preset or pin an initial selection require the projection and fail explicitly without its registry or key.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the package-level contract is not enough. They move from the preset vocabulary to the enforcement knobs and the design rationale.

- [Permission presets subsystem reference](../../../docs/subsystems/permission-presets.md) — the preset table, the select payload, and the `ctx.permissionPresets` cordis surface.
- [Sandbox switching design Agent Note](../../../.agents/notes/implemented/feature/2026-07-06-sandbox.md) — how sandbox mode and approval policy compose and switch.
- [Approval subsystem reference](../../../docs/subsystems/approval.md) — the approval policy knob this service bundles.
- [Interaction group map](../README.md) — adjacent command, approval, and question packages.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-user-approval` and `dsh-tool-bash`, which render the approval-policy prompt, switch notice, and sandboxed tool outcomes selected by this service's knob events; `permission/preset` itself is log-only.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define what the preset service does not offer. They are current package constraints, not a permission-system comparison.

- **Only two mechanism knobs are bundled** — presets select sandbox mode and approval policy; an agent/profile choice is not part of `PresetSpec` yet.
- **`custom` is derived-only** — callers can switch away from an unmatched knob combination but cannot target or persist a named custom preset through this service.
- **The preset table is process-level** — configuration is fixed for the plugin lifetime; changing available presets requires reloading the plugin.
- **Stored defaults must remain in the preset table** — removing the referenced preset makes Permission settings registration fail until the `permission` section in `settings.yaml` is updated or reset.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

# Optional browser annotation contribution

`packages/dsh-page-review` contains the independently built browser annotation plugin. It is not in the default Desktop dependency/profile/bundle set. Its package README documents installation, lifecycle, privacy, limits and the validation boundary.

## Composer marker contract

Target: `@deepseek-ai/dsh-client-ui-conversation@0.2.1-rc.2`, `InputBar` primary button. The patch adds `data-dsh-composer-primary`, with value `send` or `stop` from the existing `primaryStops` decision.

This is a DOM compatibility marker, not a new slot. Slot kinds, scopes, props, ordering, mounting and native handlers do not change. With no plugin it has no visual or event effect. The optional annotation adapter uses it to avoid matching translated labels or hashed CSS, preserves the Stop action, and releases its observer with the accessory. Other composer contributions retain their native mounting and positions. Annotation CSS is scoped by its own accessory marker.

The model packet/attachment transaction remains plugin-owned. The host currently has no public contribution for annotation-only content in the ordinary submit transaction; the marker makes the narrow compatibility adapter inspectable while that native extension is designed. The removal condition is a public native submission-extension API covering extra content, normal send/Enter, permission/phase guards, attachments and retry admission.

Validation includes annotation/image transaction regressions, observer teardown, marker absence, Stop/Send transitions, paired locale catalogs, clean package generation and patch replay. See [the current-main validation record](browser-annotations-validation.md) for real Desktop observations, fixes and the validation limits. Incoming Desktop 0.12.0 prototype evidence is not substituted for these checks. The contribution remains opt-in; cross-platform desktop checks are separate from local macOS validation.

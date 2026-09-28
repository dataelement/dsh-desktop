# Legacy plugin message sources on Harness 0.1.7

Harness session format V4 requires a producer-owned `source.kind` for every
newly written message. An installed V3 plugin can still create a message with
`{ kind: 'plugin', plugin: 'example' }`. Its first turn then fails at V4
admission. This is distinct from historical V3 session restoration, which the
Harness V3-to-V4 migration already handles.

Desktop patches `@deepseek-ai/dsh-session@0.1.7-rc.2` at the live `Session.append`
boundary. After taking the normal lossless input snapshot, it converts only
message sources with the exact retired `kind: 'plugin'` and a nonempty string
`plugin` owner. The mapping follows the released V3-to-V4 producer table:
known first-party names retain or rename their kind; other names become
`plugin:<complete-name>`. The `plugin` field is removed and the remaining
source metadata is retained. The accepted in-memory event and persisted V4
event therefore agree. Current V4 sources pass through unchanged. Missing or
invalid owners still reach the V4 validator and fail with its original error.

The conversion covers the message positions declared by Harness: direct
`user/message`, nested `developer/message`, `system/message`,
`assistant/message` and `tool/result`, plus `agent/inbox/spliced` and
`session/title-llm-request` message arrays. It does not inspect arbitrary
plugin event payloads or change configuration fields that happen to be named
`kind`.

Imported `.dshpreset` archives show a `legacy-plugin-message-source` warning
when an included text file appears to construct an old `source` object. The
archive contents remain unchanged. Updating the plugin producer to emit
`{ kind: 'plugin:example' }` is the durable fix; neither preset YAML nor a
published immutable plugin generation is rewritten by Desktop.

The patch can be removed after the supported plugin population has migrated
to V4 producer-owned sources and a fresh packaged-client check confirms that
no installed V3 producer needs the bridge. On every Harness upgrade, compare
this mapping with `dsh-session-format-v3-to-v4` and rerun the behavior test.

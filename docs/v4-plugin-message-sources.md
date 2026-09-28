# Plugin message sources on Harness 0.1.7

Session format V4 requires a producer-owned `source.kind` for every newly
written message. A plugin that still emits
`{ kind: 'plugin', plugin: 'example' }` fails V4 admission; its producer should
emit `{ kind: 'plugin:example' }` instead. Preserve `form`, `sections`, and
other context metadata, but remove the retired `plugin` identity field.

This is a producer change. Preset compositions may reference plugins that
create messages, but changing the preset's plugin rows cannot rewrite a
plugin's JavaScript. DSH Desktop does not edit installed immutable plugin
generations or weaken the Session writer's validation. Upgrade or rebuild the
affected plugin and publish a new generation. The `.dshpreset` import preview
reports `legacy-plugin-message-source` when bundled text appears to construct
the old wrapper; the archive is preserved unchanged because text matching
cannot safely rewrite executable code or quoted instructions.

Community plugin installs and updates also scan the installed package's shipped
JavaScript after staging and peer validation, before changing the Profile's
desired generation. A literal `source: { kind: 'plugin' }` (or `source = ...`)
produces a warning with the package name and relative file/line in the existing
install output and operation log. It is available through the Plugin Manager's
installation details. The current UI does not show it as a separate success
banner. This is advisory: installation continues, because
static matching can miss computed sources or flag a non-executed code path.
The scan excludes private dependencies, tests, examples, and fixtures; only a
producer-level V4 encoding test can confirm the behavior of a specific path.

The repo-owned PPT plugin already emits producer-owned kinds. Its behavior
test passes actual messages through the V4 encoder, including the automatic
skill and composer context. Keep the historical source recognition in that
plugin so restored sessions do not receive duplicate instructions. Harness's
released V3-to-V4 session migration handles older persisted events on read;
there is no separate Desktop session-log rewrite.

When diagnosing a failing third-party plugin, identify its exact package and
generation, find the code that constructs `source`, update that producer, then
verify a real Harness turn and the installed package. A broad Session patch
would change all producers and duplicate Harness's private migration table;
it is appropriate only if product requirements explicitly demand zero-touch
execution of unknown V3 plugins and no supported producer-level route exists.

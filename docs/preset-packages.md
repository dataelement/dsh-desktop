# DSH preset packages

DSH Desktop exchanges custom Agent presets as `.dshpreset` files. A package is a ZIP archive with this layout:

```text
manifest.json
preset/
├── agent.cordis.yml
├── preset.yml            # optional
└── skills, plugins, and other preset-owned assets
```

`manifest.json` currently uses format version 1:

```json
{
  "format": "dsh-preset",
  "version": 1,
  "id": "my-agent",
  "name": "My agent",
  "description": "Optional display copy",
  "sourceDshVersion": "0.1.0-rc.6",
  "exportedAt": "2026-08-14T12:00:00.000Z"
}
```

Only custom presets can be exported. Duplicate a built-in preset first if it should be shared. Model-provider settings, API keys, credentials, sessions, and workspace files are not added by DSH Desktop; only files inside the preset directory are packaged.

Import is a two-step operation. DSH Desktop first validates and previews the archive, then writes it only after confirmation. Existing preset identifiers are never overwritten: the user must choose a new identifier. Installation writes to a temporary directory, validates the resulting preset through the Harness preset scanner, and atomically moves it into the user preset root.

The importer rejects absolute archive paths, parent traversal, backslash-based paths, missing compositions, unsupported manifests, oversized packages, and invalid preset compositions. Export rejects symbolic links and unsupported filesystem entries. Common OS metadata such as `.DS_Store`, `Thumbs.db`, and `desktop.ini` is omitted.

Custom presets are executable configuration. Their compositions may load plugins and expose tools that run commands or access files with the Agent's permissions. Import packages only from trusted sources and review warnings about possible credentials, absolute paths, and DSH version differences.

## Agent and online Skill contract

DSH Desktop exposes package transfer through the same loopback Harness server used by the UI. Harness contributes its canonical loopback origin to shell tools as `DSH_WEB_URL`, so an explicitly requested online Skill can call the local transfer API without knowing the random port and without requiring the `dsh` CLI.

- `GET $DSH_WEB_URL/api/agent-preset.export?agentPreset=<id>` exports one custom Preset.
- `POST $DSH_WEB_URL/api/agent-preset.import` previews a binary package without writing it.
- `POST $DSH_WEB_URL/api/agent-preset.import?agentPreset=<targetId>&install=1` performs the validated atomic install.

The request body for import is the unchanged binary `.dshpreset` file with `Content-Type: application/vnd.dsh.preset+zip`. Online instructions must never paste or decode the archive into model context, directly unpack it into a Preset root, or silently overwrite an existing identifier.

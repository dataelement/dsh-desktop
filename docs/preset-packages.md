# DSH preset packages

DSH Desktop exchanges custom Agent presets as `.dshpreset` files. A package is a ZIP archive with this layout:

```text
manifest.json
preset/
├── agent.cordis.yml
└── preset.yml            # display metadata
```

`manifest.json` currently uses format version 1:

```json
{
  "format": "dsh-preset",
  "version": 1,
  "id": "my-agent",
  "name": "My agent",
  "description": "Optional display copy",
  "sourceDshVersion": "0.1.0-rc.7",
  "exportedAt": "2026-08-14T12:00:00.000Z"
}
```

The settings page exports custom presets. The 0.1.7 registry supplies the declared plugin list and display metadata; the export does not include referenced skills, plugins, or other files. Review such references before sharing a package. Model-provider settings, API keys, credentials, sessions, and workspace files are not added.

Import is a two-step operation. DSH Desktop first validates and previews the archive, then writes it only after confirmation. Existing preset identifiers are never overwritten: the user must choose a new identifier. Installation writes to a temporary directory, validates the YAML plugin list, and atomically moves it into the legacy preset root. Desktop converts it to a 0.1.7 Profile entry at the next launch, so the new preset requires a restart. The original directory and a backup of existing legacy presets are retained.

The importer rejects absolute archive paths, parent traversal, backslash-based paths, missing compositions, unsupported manifests, oversized packages, and invalid preset compositions. It retains extra files from older archives in the legacy directory, but the 0.1.7 Profile migration publishes the YAML plugin list only. Relative references to those extra files need review in the new Profile. Common OS metadata such as `.DS_Store`, `Thumbs.db`, and `desktop.ini` is omitted.

Custom presets are executable configuration. Their compositions may load plugins and expose tools that run commands or access files with the Agent's permissions. Import packages only from trusted sources and review warnings about possible credentials, absolute paths, and DSH version differences.

## Agent and online Skill contract

DSH Desktop exposes package transfer through the same loopback Harness server used by the UI. Harness contributes its canonical loopback origin to shell tools as `DSH_WEB_URL`, so an explicitly requested online Skill can call the local transfer API without knowing the random port and without requiring the `dsh` CLI.

- `GET $DSH_WEB_URL/api/agent-preset.export?agentPreset=<id>` exports one custom Preset.
- `POST $DSH_WEB_URL/api/agent-preset.import` previews a binary package without writing it.
- `POST $DSH_WEB_URL/api/agent-preset.import?agentPreset=<targetId>&install=1` performs the validated atomic install.

The request body for import is the unchanged binary `.dshpreset` file with `Content-Type: application/vnd.dsh.preset+zip`. Online instructions must never paste or decode the archive into model context, directly unpack it into a Preset root, or silently overwrite an existing identifier.

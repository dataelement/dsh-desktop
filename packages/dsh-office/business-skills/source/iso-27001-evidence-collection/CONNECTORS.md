# Connectors

## How tool references work

This skill uses `~~category` placeholders for optional integrations. The skill works without any connectors configured — they enhance the experience when available.

## Connectors for this skill

| Category | Placeholder | Recommended server | Other options |
|----------|-------------|-------------------|---------------|
| Compliance data | `~~compliance` | Compliance MCP server (planned — not yet available) | Local `compliance/` directory files |

### Local compliance data (current default)

If the `compliance/` directory exists with evidence status files, the skill reads those directly. No MCP server needed — just ensure evidence files in `compliance/evidence/*.md` are up to date.

### Compliance MCP server (planned)

A dedicated compliance MCP server with automated gap detection and evidence freshness tracking is planned but not yet available. When released, it will be installable as a standard MCP server. Until then, the skill operates in local-data or reference-only mode.

### Fallback: Reference only

Without any connector, the skill uses embedded checklists and CLI command reference. No organization-specific evidence status is available in this mode.

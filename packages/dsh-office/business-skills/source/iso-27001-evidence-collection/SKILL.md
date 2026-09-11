---
name: iso-27001-evidence-collection
description: "Collect, organize, and validate evidence for ISO 27001 and SOC 2 audits using API-first commands and major cloud CLI tools. Produces timestamped, auditor-ready evidence packages. Trigger when preparing for an audit, refreshing evidence, or discussing audit readiness, evidence gaps, or compliance frameworks."
license: MIT
compatibility: >-
  Works with any AI agent. Enhanced with compliance MCP server for automated
  gap detection. Falls back to embedded checklists when no live data available.
metadata:
  author: open-agreements
  version: "0.1.0"
  frameworks:
    - ISO 27001:2022
    - SOC 2 Type II
    - NIST SP 800-53 Rev 5
---

# ISO 27001 Evidence Collection

Systematically collect audit evidence for ISO 27001:2022 and SOC 2. This skill provides API-first evidence collection commands, organizes evidence by control, and validates completeness before auditor review.

## Security Model

- **No scripts executed** — this skill is markdown-only procedural guidance
- **No secrets required** — works with reference checklists; CLI commands use existing local credentials
- **Evidence stays local** — all outputs go to the local filesystem
- **IP-clean** — references NIST SP 800-53 (public domain); ISO controls cited by section ID only

## When to Use

Activate this skill when:

1. **Preparing evidence package for external audit** — 2-4 weeks before auditor arrives
2. **Quarterly evidence refresh** — update evidence that has aged beyond the audit window
3. **After remediation** — collect evidence proving a finding has been fixed
4. **New system onboarding** — establish baseline evidence for a newly in-scope system
5. **Evidence gap analysis** — identify what's missing before the audit

Do NOT use for:
- Running the internal audit itself — use `iso-27001-internal-audit`
- SOC 2-only readiness assessment — use `soc2-readiness`
- Interpreting audit findings — use the internal audit skill

## Core Concepts

### Evidence Hierarchy (Best to Worst)

| Rank | Type | Example | Why Better |
|------|------|---------|------------|
| 1 | **API export (JSON/CSV)** | `gcloud iam service-accounts list --format=json` | Timestamped, tamper-evident, reproducible |
| 2 | **System-generated report** | SOC 2 report from vendor, SIEM export | Authoritative source, includes metadata |
| 3 | **Configuration export** | Terraform state, policy JSON | Shows intended state, version-controlled |
| 4 | **Screenshot with system clock** | `screencapture -x ~/evidence/...` | Visual proof, but harder to validate |
| 5 | **Manual attestation** | Signed statement by responsible person | Last resort, requires corroboration |

### Evidence Freshness Requirements

| Evidence Type | Max Age | Refresh Cadence |
|---------------|---------|-----------------|
| Access lists | 90 days | Quarterly |
| Vulnerability scans | 30 days | Monthly |
| Configuration exports | 90 days | Quarterly |
| Training records | 12 months | Annual |
| Penetration test | 12 months | Annual |
| Policy documents | 12 months | Annual review |
| Incident records | Audit period | Continuous |
| Risk assessment | 12 months | Annual + on change |

### Evidence Naming Convention

```
{control_id}_{evidence_type}_{YYYY-MM-DD}.{ext}
```

Examples:
- `A.5.15_user-access-list_2026-02-28.json`
- `A.8.8_vulnerability-scan_2026-02-28.csv`
- `A.8.13_backup-test-results_2026-02-28.pdf`

## Step-by-Step Workflow

### Step 1: Identify Evidence Gaps

Determine what evidence is missing or stale.

```
# If compliance MCP is available:
list_evidence_gaps(framework="iso27001_2022", tier="critical")

# If reading local compliance data:
# Check compliance/evidence/*.md files for upload_status != "OK"
# Check renewal_next dates for upcoming expirations
```

### Step 2: Prioritize Collection

Order evidence collection by:
1. **Missing evidence for Critical-tier controls** — audit blockers
2. **Stale evidence past renewal date** — auditor will reject
3. **Evidence for Relevant-tier controls** — expected but not blocking
4. **Checkbox-tier evidence** — policies and attestations

### Step 3: Collect by Platform

Run evidence collection commands grouped by platform to minimize context-switching.

#### GitHub Evidence
```bash
# Org settings: MFA requirement, default permissions
gh api orgs/{org} | jq '{
  two_factor_requirement_enabled,
  default_repository_permission,
  members_can_create_public_repositories
}' > evidence/A.5.17_github-org-mfa_$(date +%Y-%m-%d).json

# Branch protection on production repos
for repo in $(gh repo list {org} --json name -q '.[].name'); do
  gh api repos/{org}/$repo/branches/main/protection 2>/dev/null | \
    jq '{repo: "'$repo'", protection: .}' >> evidence/A.8.32_branch-protection_$(date +%Y-%m-%d).json
done

# Recent merged PRs (change management evidence)
gh pr list --state merged --limit 50 --json number,title,author,reviewDecision,mergedAt,mergedBy \
  > evidence/A.8.32_change-records_$(date +%Y-%m-%d).json

# Dependabot alerts (vulnerability management)
gh api repos/{org}/{repo}/dependabot/alerts?state=open \
  > evidence/A.8.8_dependabot-alerts_$(date +%Y-%m-%d).json

# Secret scanning alerts
gh api orgs/{org}/secret-scanning/alerts --paginate \
  > evidence/A.8.24_secret-scanning_$(date +%Y-%m-%d).json

# Audit log
gh api orgs/{org}/audit-log?per_page=100 \
  > evidence/A.8.15_github-audit-log_$(date +%Y-%m-%d).json
```

#### GCP Evidence
```bash
# IAM policy (access control)
gcloud projects get-iam-policy {project} --format=json \
  > evidence/A.5.15_gcp-iam-policy_$(date +%Y-%m-%d).json

# Service accounts
gcloud iam service-accounts list --format=json \
  > evidence/A.5.16_gcp-service-accounts_$(date +%Y-%m-%d).json

# Audit logging config
gcloud projects get-iam-policy {project} --format=json | jq '.auditConfigs' \
  > evidence/A.8.15_gcp-audit-config_$(date +%Y-%m-%d).json

# Log sinks (centralization)
gcloud logging sinks list --format=json \
  > evidence/A.8.15_gcp-log-sinks_$(date +%Y-%m-%d).json

# Compute instances (asset inventory)
gcloud compute instances list --format=json \
  > evidence/A.5.9_gcp-compute-inventory_$(date +%Y-%m-%d).json

# Cloud SQL backup config
gcloud sql backups list --instance={instance} --format=json \
  > evidence/A.8.13_gcp-sql-backups_$(date +%Y-%m-%d).json

# Firewall rules
gcloud compute firewall-rules list --format=json \
  > evidence/A.8.20_gcp-firewall-rules_$(date +%Y-%m-%d).json
```

#### Azure Evidence
```bash
# Role assignments (access control)
az role assignment list --all --output json \
  > evidence/A.5.15_azure-role-assignments_$(date +%Y-%m-%d).json

# Activity log (audit trail)
az monitor activity-log list --max-events 100 --output json \
  > evidence/A.8.15_azure-activity-log_$(date +%Y-%m-%d).json

# Network security groups
az network nsg list --output json \
  > evidence/A.8.20_azure-nsgs_$(date +%Y-%m-%d).json

# Backup jobs
az backup job list --resource-group {rg} --vault-name {vault} --output json \
  > evidence/A.8.13_azure-backup-jobs_$(date +%Y-%m-%d).json

# Storage encryption
az storage account list --query "[].{name:name, encryption:encryption}" --output json \
  > evidence/A.8.24_azure-storage-encryption_$(date +%Y-%m-%d).json
```

#### Google Workspace Evidence
```bash
# User list with MFA status
gam print users fields primaryEmail,name,isEnrolledIn2Sv,isEnforcedIn2Sv,lastLoginTime,suspended \
  > evidence/A.5.17_workspace-users-mfa_$(date +%Y-%m-%d).csv

# Admin roles
gam print admins > evidence/A.8.2_workspace-admins_$(date +%Y-%m-%d).csv

# Mobile devices
gam print mobile > evidence/A.8.1_workspace-mobile-devices_$(date +%Y-%m-%d).csv
```

#### macOS Endpoint Evidence
```bash
# FileVault encryption
fdesetup status > evidence/A.8.24_filevault-status_$(date +%Y-%m-%d).txt

# System configuration
system_profiler SPHardwareDataType SPSoftwareDataType \
  > evidence/A.8.1_endpoint-config_$(date +%Y-%m-%d).txt

# Screen lock settings
profiles show -type configuration 2>/dev/null | grep -A10 -i "lock\|idle\|screensaver" \
  > evidence/A.6.7_screenlock-config_$(date +%Y-%m-%d).txt
```

### Step 4: Validate Evidence Package

Check completeness before submitting to auditor:

1. **Completeness**: Do you have evidence for every applicable control in the SoA?
2. **Freshness**: Is every piece of evidence within the required age?
3. **Format**: Are API exports in JSON/CSV with timestamps? Screenshots have system clock visible?
4. **Naming**: Files follow the naming convention?
5. **Coverage**: Critical-tier controls have at least 2 forms of evidence?

```
# If compliance MCP is available:
list_evidence_gaps(framework="iso27001_2022")  # Should return empty for complete package
```

### Step 5: Generate Evidence Index

Create an index file listing all evidence, mapped to controls:

```markdown
# Evidence Package Index
Generated: {date}
Audit period: {start} to {end}

| Control | Evidence File | Type | Collected | Status |
|---------|--------------|------|-----------|--------|
| A.5.15 | gcp-iam-policy_2026-02-28.json | API export | 2026-02-28 | Current |
| A.5.17 | workspace-users-mfa_2026-02-28.csv | API export | 2026-02-28 | Current |
| ... | ... | ... | ... | ... |
```

## DO / DON'T

### DO
- Use API exports with ISO 8601 timestamps over screenshots whenever possible
- Collect evidence from the SOURCE system (IdP, not a secondary report)
- Include metadata: collection date, system version, user who collected
- Store evidence in version-controlled directory with clear naming
- Collect evidence for the AUDIT PERIOD (usually past 12 months), not just current state
- Use `screencapture -x ~/evidence/{filename}.png` for screenshots (captures without shadow/border)

### DON'T
- Take screenshots without visible system clock (menu bar on macOS, taskbar on Windows)
- Collect evidence from sandbox/staging instead of production
- Manually edit evidence after collection (auditors may verify against source)
- Wait until the week before the audit to collect everything
- Assume stale evidence is acceptable — check freshness requirements above
- Mix evidence from different audit periods in the same file

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API command requires auth | Use existing local credentials: `gcloud auth login`, `az login`, `gh auth login` |
| Tool not installed | Install: `brew install gh`, `brew install --cask google-cloud-sdk`, `brew install azure-cli` |
| Insufficient permissions | Request read-only access to the relevant service; document the access request as evidence |
| Evidence too large | Use `--limit` or `--max-events` flags; collect summary statistics instead of full export |
| Vendor won't provide SOC 2 report | Request via their trust center; if unavailable, document the request and use their security page |
| Screenshot doesn't include clock | On macOS: use full-screen capture, or `screencapture -x` which includes menu bar |

## Rules

For detailed evidence collection guidance by topic:

| File | Coverage |
|------|----------|
| `rules/api-exports.md` | CLI commands by cloud provider (GCP, Azure, AWS, GitHub, Google Workspace) |
| `rules/screenshot-guide.md` | When and how to take audit-ready screenshots |
| `rules/evidence-types.md` | Evidence type requirements per control domain |

## Attribution

Evidence collection procedures and control guidance developed with [Internal ISO Audit](https://internalisoaudit.com) (Hazel Castro, ISO 27001 Lead Auditor, 14+ years, 100+ audits).

## Runtime Detection

1. **Compliance MCP server available** (best) — Automated gap detection, evidence freshness tracking
2. **Local compliance data available** (good) — Reads evidence status from `compliance/evidence/*.md`
3. **Reference only** (baseline) — Uses embedded checklists and command reference

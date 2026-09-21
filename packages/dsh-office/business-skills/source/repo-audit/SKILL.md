---
name: repo-audit
description: "Deep analysis of Git history: identify frequently changed hotspot files, analyze code ownership by contributor, and scan for leaked secrets. Triggered when users ask about Git analysis, code hotspots, who owns what code, secret scanning, security audits of commit history, or optimizing code review assignments."
type: tool
license: MIT
tags:
  - git
  - security
  - analysis
  - devops
---

# Repo Audit — Deep Analysis of Git History

Perform three-dimensional analysis on a Git repository: **hotspot file detection**, **code ownership analysis**, and **secret leak scanning**.

## Feature Overview

### 1. Hotspot File Analysis (`scripts/hotfiles.sh`)

Identify the most frequently changed files in a repository to help spot:
- High-risk code areas (frequent changes = potential instability)
- Files that deserve extra attention during code review
- Modules that may need splitting or refactoring

**Usage:**
```bash
bash scripts/hotfiles.sh [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--repo PATH` | Repository path | Current directory |
| `--top N` | Show top N files | 20 |
| `--since DATE` | Start date (e.g. `2024-01-01`) | None |
| `--until DATE` | End date | None |
| `--author AUTHOR` | Filter by author | None |
| `--format FORMAT` | Output format: `table` / `csv` / `json` | table |

### 2. Code Ownership Analysis (`scripts/ownership.sh`)

Analyze actual code ownership, reporting for each contributor within the specified scope:
- Commit count and percentage
- Lines changed (additions/deletions)
- Last active date

**Usage:**
```bash
bash scripts/ownership.sh [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--repo PATH` | Repository path | Current directory |
| `--path SUBPATH` | Analyze a specific subdirectory or file | Entire repo |
| `--top N` | Show top N contributors | 10 |
| `--since DATE` | Start date | None |
| `--format FORMAT` | Output format: `table` / `csv` / `json` | table |

### 3. Secret Leak Scanning (`scripts/secret-scan.sh`)

Scan the full Git history (including deleted commits) for common secrets and sensitive information:
- AWS Access Key / Secret Key
- GitHub / GitLab / Slack Tokens
- SSH Private Keys
- Generic API Keys, passwords, and secret patterns

**Usage:**
```bash
bash scripts/secret-scan.sh [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--repo PATH` | Repository path | Current directory |
| `--branch BRANCH` | Scan a specific branch | All branches |
| `--since DATE` | Start date | None |
| `--format FORMAT` | Output format: `table` / `csv` / `json` | table |
| `--severity LEVEL` | Minimum severity level: `low` / `medium` / `high` | low |

## Use Cases

- **Security audits**: Scan history for leaked secrets before deploying to production
- **Code review optimization**: Identify hotspot files and prioritize reviewing high-risk areas
- **Team collaboration**: Understand who knows which parts of the code best, and assign reviews accordingly
- **Tech debt assessment**: Frequently changed files are strong candidates for refactoring

## Dependencies

- `git` (>= 2.20)
- `bash` (>= 4.0)
- Standard Unix utilities: `awk`, `sort`, `head`, `grep`

No additional dependencies or paid APIs required.

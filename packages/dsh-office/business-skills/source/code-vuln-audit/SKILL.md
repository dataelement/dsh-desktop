---
name: code-vuln-audit
description: "Scan code for security issues: dependency vulnerabilities (npm/pip audit), secret leaks (regex and entropy analysis), and OWASP anti-patterns like SQL injection, XSS, or command injection. Use when the user mentions security scans, vulnerability detection, secret leaks, API keys, OWASP, npm audit, pip-audit, hardcoded passwords, or code security checks."
license: MIT
---

# code-vuln-audit

A code security scanning tool with three core scanning capabilities:

1. **Dependency Vulnerability Scanning** — Automatically detects known vulnerabilities in npm / pip dependencies
2. **Secret Leak Detection** — Discovers hardcoded secrets, tokens, and passwords via regex matching + Shannon entropy analysis
3. **OWASP Pattern Detection** — Identifies common security anti-patterns such as SQL injection, XSS, command injection, and insecure deserialization

## Quick Start

```bash
# Scan the current directory (all checks)
python3 scripts/security_scan.py .

# Scan dependencies only
python3 scripts/security_scan.py --mode deps .

# Detect secret leaks only
python3 scripts/security_scan.py --mode secrets /path/to/project

# Detect OWASP security patterns only
python3 scripts/security_scan.py --mode owasp .

# Output report in JSON format
python3 scripts/security_scan.py --format json --output report.json .

# Only show findings at high severity and above
python3 scripts/security_scan.py --severity high .
```

## Scan Module Details

### 1. Dependency Vulnerability Scanning (deps)

Automatically detects the project type and invokes the appropriate tool:

| Project Type | Detection File | Tool Used |
|---|---|---|
| Node.js | `package.json` + `package-lock.json` | `npm audit` |
| Python | `requirements.txt` / `pyproject.toml` / `Pipfile` | `pip-audit` |

If the corresponding audit tool is not installed, a helpful message is displayed instead of an error.

### 2. Secret Leak Detection (secrets)

Detection is performed in two ways:

**Regex Matching**: Covers common secret formats

| Secret Type | Example Pattern |
|---|---|
| AWS Access Key | 20-character string starting with `AKIA` |
| GitHub Token | Starts with `ghp_` or `github_pat_` |
| Slack Token | Starts with `xoxb-` or `xoxp-` |
| Stripe Key | Starts with `sk_live_` or `pk_live_` |
| Private Key File | `-----BEGIN PRIVATE KEY-----` |
| Generic API Key | Format like `api_key = "..."` |
| Credentials in URL | `https://user:pass@host` |
| JWT Token | `eyJ...` format |

**Shannon Entropy Analysis**: Computes information entropy for string constants in code (threshold > 4.5 and length >= 20) to discover secrets in non-standard formats.

### 3. OWASP Pattern Detection (owasp)

Covers statically detectable security patterns from the OWASP Top 10:

| OWASP Category | Detection Patterns |
|---|---|
| A02: Cryptographic Failures | Weak hashes (MD5/SHA1), weak ciphers (DES/RC4) |
| A03: Injection | SQL injection, command injection (os.system / subprocess shell / eval / exec), XSS (innerHTML / document.write / dangerouslySetInnerHTML / v-html) |
| A04: Insecure Design | Path traversal |
| A05: Security Misconfiguration | Debug mode enabled, CORS wildcard, binding to 0.0.0.0 |
| A08: Integrity Failures | Insecure deserialization (pickle / yaml.load / marshal / unserialize) |
| A10: SSRF | User input passed directly to HTTP requests |

Supported languages: Python, JavaScript/TypeScript, Java, PHP, Ruby, Go, and more.

## Parameters

| Parameter | Description | Default |
|---|---|---|
| `TARGET` | Directory to scan | Current directory |
| `--mode MODE` | Scan mode: `all`, `deps`, `secrets`, `owasp` | `all` |
| `--format FORMAT` | Output format: `text`, `json` | `text` |
| `--output FILE` | Output file path | stdout |
| `--severity LEVEL` | Minimum reporting level: `low`, `medium`, `high`, `critical` | `low` |
| `--exclude-dir DIR` | Additional directories to exclude (repeatable) | - |
| `--max-file-kb SIZE` | Maximum file size to scan in KB | `512` |
| `-h, --help` | Show help | - |

## Output Format

### Text Output (default)

```
=== Security Scan Report ===
Target: /path/to/project
Modules: deps, secrets, owasp

[CRITICAL] AWS Access Key ID
  File: src/config.py:15
  Code: AWS_KEY = "AKIAIOSFODNN7EXAMPLE"

[HIGH] SQL Injection (f-string)
  File: src/db.py:42
  Code: cursor.execute(f"SELECT * FROM users WHERE id={user_id}")

--- Summary ---
Critical: 1 | High: 1 | Medium: 0 | Low: 0
Total findings: 2
```

### JSON Output

```json
{
  "target": "/path/to/project",
  "scan_time": "2026-04-14T10:30:00",
  "findings": [
    {
      "scanner": "secrets",
      "name": "AWS Access Key ID",
      "severity": "critical",
      "file": "src/config.py",
      "line": 15,
      "snippet": "AWS_KEY = \"AKIAIOSFODNN7EXAMPLE\"",
      "category": "secret-pattern"
    }
  ],
  "summary": {"critical": 1, "high": 0, "medium": 0, "low": 0, "total": 1}
}
```

## Exit Codes

| Exit Code | Meaning |
|---|---|
| `0` | No findings |
| `1` | Findings present (at least one security issue) |
| `2` | Scanner internal error |

## Prerequisites

- Python 3.7+ (uses standard library only)
- Dependency scanning requires the corresponding tools: `npm` (for Node.js projects), `pip-audit` (for Python projects)
- If an audit tool is missing, that module will be skipped with a notice — other modules continue to run normally

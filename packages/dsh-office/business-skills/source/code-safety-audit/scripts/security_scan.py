#!/usr/bin/env python3
"""security_scan.py — 代码安全扫描工具

三大扫描模块：
  deps    — 依赖漏洞 (npm audit / pip-audit)
  secrets — 密钥泄露 (正则 + Shannon 熵值)
  owasp   — OWASP 安全模式 (注入、XSS、反序列化等)
"""

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# ── Severity ─────────────────────────────────────────────────────────────────

CRITICAL = "critical"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"

SEVERITY_RANK = {LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3}

# ── Directories to always skip ───────────────────────────────────────────────

DEFAULT_EXCLUDE_DIRS = {
    "node_modules", ".git", "__pycache__", "venv", ".venv", "env",
    ".tox", ".mypy_cache", ".pytest_cache", "dist", "build",
    ".next", ".nuxt", "vendor", "bower_components", ".bundle",
    "coverage", ".coverage", "htmlcov", ".eggs", ".cache",
}

# ── Binary extensions to skip ────────────────────────────────────────────────

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac", ".ogg",
    ".exe", ".dll", ".so", ".dylib", ".o", ".a",
    ".pyc", ".pyo", ".class", ".jar", ".war",
    ".sqlite", ".db", ".dat", ".bin", ".wasm",
}

# ── File extension → language tag ────────────────────────────────────────────

EXT_TO_LANG = {
    ".py": "py", ".pyw": "py",
    ".js": "js", ".mjs": "js", ".cjs": "js",
    ".ts": "ts", ".mts": "ts", ".cts": "ts",
    ".jsx": "jsx", ".tsx": "tsx",
    ".java": "java", ".kt": "java",
    ".go": "go",
    ".rb": "rb", ".erb": "rb",
    ".php": "php",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".hpp": "cpp",
    ".cs": "cs",
    ".rs": "rs",
    ".swift": "swift",
    ".vue": "vue",
    ".html": "html", ".htm": "html",
    ".yml": "yml", ".yaml": "yaml",
    ".json": "json",
    ".xml": "xml",
    ".toml": "toml",
    ".ini": "ini", ".cfg": "cfg", ".conf": "conf",
    ".env": "env",
    ".sh": "sh", ".bash": "sh", ".zsh": "sh",
    ".sql": "sql",
    ".tf": "tf", ".hcl": "hcl",
}

# ── Secret regex patterns ────────────────────────────────────────────────────

SECRET_PATTERNS = [
    {
        "name": "AWS Access Key ID",
        "pattern": r"AKIA[0-9A-Z]{16}",
        "severity": CRITICAL,
    },
    {
        "name": "AWS Secret Access Key",
        "pattern": r"(?i)aws[_\-]?secret[_\-]?access[_\-]?key\s*[=:]\s*[\"']?[A-Za-z0-9/+=]{40}",
        "severity": CRITICAL,
    },
    {
        "name": "AWS Secret Key",
        "pattern": r"(?i)aws[_\-]?secret[_\-]?key\s*[=:]\s*[\"']?[A-Za-z0-9/+=]{20,}",
        "severity": CRITICAL,
    },
    {
        "name": "GitHub Personal Access Token",
        "pattern": r"ghp_[0-9a-zA-Z]{36}",
        "severity": CRITICAL,
    },
    {
        "name": "GitHub Fine-grained PAT",
        "pattern": r"github_pat_[0-9a-zA-Z_]{82}",
        "severity": CRITICAL,
    },
    {
        "name": "GitHub OAuth Token",
        "pattern": r"gho_[0-9a-zA-Z]{36}",
        "severity": HIGH,
    },
    {
        "name": "Slack Bot Token",
        "pattern": r"xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}",
        "severity": CRITICAL,
    },
    {
        "name": "Slack User Token",
        "pattern": r"xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{32}",
        "severity": CRITICAL,
    },
    {
        "name": "Private Key",
        "pattern": r"-----BEGIN\s(?:RSA\s|EC\s|DSA\s|OPENSSH\s)?PRIVATE\sKEY-----",
        "severity": CRITICAL,
    },
    {
        "name": "Generic API Key",
        "pattern": r"(?i)(?:api[_\-]?key|apikey)\s*[=:]\s*[\"'][0-9a-zA-Z_\-]{20,}[\"']",
        "severity": HIGH,
    },
    {
        "name": "Generic Secret/Token/Password",
        "pattern": r"(?i)(?:secret|token|password|passwd|pwd|credential)\s*[=:]\s*[\"'][^\"']{8,}[\"']",
        "severity": HIGH,
    },
    {
        "name": "Credentials in URL",
        "pattern": r"(?i)https?://[^:\s]+:[^@\s]+@[^\s]+",
        "severity": HIGH,
    },
    {
        "name": "JWT Token",
        "pattern": r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}",
        "severity": MEDIUM,
    },
    {
        "name": "SendGrid API Key",
        "pattern": r"SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}",
        "severity": HIGH,
    },
    {
        "name": "Stripe Secret Key",
        "pattern": r"sk_live_[0-9a-zA-Z]{24,}",
        "severity": CRITICAL,
    },
    {
        "name": "Stripe Publishable Key",
        "pattern": r"pk_live_[0-9a-zA-Z]{24,}",
        "severity": LOW,
    },
    {
        "name": "Heroku API Key",
        "pattern": r"(?i)heroku[_\-]?api[_\-]?key\s*[=:]\s*[\"']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        "severity": HIGH,
    },
]

# ── OWASP patterns ───────────────────────────────────────────────────────────

OWASP_PATTERNS = [
    # A03: Injection — SQL
    {
        "name": "SQL Injection (f-string)",
        "category": "A03:Injection",
        "pattern": r"(?:execute|query|raw)\s*\(\s*f[\"'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)",
        "severity": CRITICAL,
        "langs": {"py"},
    },
    {
        "name": "SQL Injection (str.format)",
        "category": "A03:Injection",
        "pattern": r"(?:execute|query|raw)\s*\(\s*[\"'].*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE).*[\"']\.format\s*\(",
        "severity": CRITICAL,
        "langs": {"py"},
    },
    {
        "name": "SQL Injection (concat)",
        "category": "A03:Injection",
        "pattern": r"(?:execute|query|raw)\s*\(\s*[\"'].*(?:SELECT|INSERT|UPDATE|DELETE).*[\"']\s*\+",
        "severity": CRITICAL,
        "langs": {"py", "js", "ts", "java", "rb", "php"},
    },
    {
        "name": "SQL Injection (% format)",
        "category": "A03:Injection",
        "pattern": r"(?:execute|query|raw)\s*\(\s*[\"'].*(?:SELECT|INSERT|UPDATE|DELETE).*%s",
        "severity": HIGH,
        "langs": {"py"},
    },
    # A03: Injection — Command
    {
        "name": "Command Injection (os.system)",
        "category": "A03:Injection",
        "pattern": r"os\.system\s*\(",
        "severity": HIGH,
        "langs": {"py"},
    },
    {
        "name": "Command Injection (subprocess shell=True)",
        "category": "A03:Injection",
        "pattern": r"subprocess\.(?:call|run|Popen|check_output|check_call)\s*\(.*shell\s*=\s*True",
        "severity": HIGH,
        "langs": {"py"},
    },
    {
        "name": "Command Injection (eval)",
        "category": "A03:Injection",
        "pattern": r"(?<!\w)eval\s*\(",
        "severity": HIGH,
        "langs": {"py", "js", "ts", "jsx", "tsx", "php", "rb"},
    },
    {
        "name": "Command Injection (exec with input)",
        "category": "A03:Injection",
        "pattern": r"(?<!\w)exec\s*\(",
        "severity": MEDIUM,
        "langs": {"py", "php"},
    },
    {
        "name": "Command Injection (child_process.exec)",
        "category": "A03:Injection",
        "pattern": r"child_process\.exec\s*\(",
        "severity": HIGH,
        "langs": {"js", "ts"},
    },
    {
        "name": "Command Injection (new Function)",
        "category": "A03:Injection",
        "pattern": r"new\s+Function\s*\(",
        "severity": HIGH,
        "langs": {"js", "ts", "jsx", "tsx"},
    },
    # A03: Injection — XSS
    {
        "name": "XSS (innerHTML)",
        "category": "A03:Injection",
        "pattern": r"\.innerHTML\s*=",
        "severity": HIGH,
        "langs": {"js", "ts", "jsx", "tsx", "html"},
    },
    {
        "name": "XSS (outerHTML)",
        "category": "A03:Injection",
        "pattern": r"\.outerHTML\s*=",
        "severity": HIGH,
        "langs": {"js", "ts", "jsx", "tsx", "html"},
    },
    {
        "name": "XSS (document.write)",
        "category": "A03:Injection",
        "pattern": r"document\.write(?:ln)?\s*\(",
        "severity": HIGH,
        "langs": {"js", "ts", "html"},
    },
    {
        "name": "XSS (dangerouslySetInnerHTML)",
        "category": "A03:Injection",
        "pattern": r"dangerouslySetInnerHTML",
        "severity": MEDIUM,
        "langs": {"js", "ts", "jsx", "tsx"},
    },
    {
        "name": "XSS (v-html)",
        "category": "A03:Injection",
        "pattern": r"v-html\s*=",
        "severity": MEDIUM,
        "langs": {"vue", "html"},
    },
    # A02: Cryptographic Failures
    {
        "name": "Weak Hash (MD5)",
        "category": "A02:CryptoFailure",
        "pattern": r"(?:hashlib\.md5|MD5\.(?:Create|new)|createHash\s*\(\s*[\"']md5[\"'])",
        "severity": MEDIUM,
        "langs": {"py", "js", "ts", "cs", "rb"},
    },
    {
        "name": "Weak Hash (SHA1)",
        "category": "A02:CryptoFailure",
        "pattern": r"(?:hashlib\.sha1|SHA1\.(?:Create|new)|createHash\s*\(\s*[\"']sha1[\"'])",
        "severity": MEDIUM,
        "langs": {"py", "js", "ts", "cs", "rb"},
    },
    {
        "name": "Weak Cipher (DES/RC4)",
        "category": "A02:CryptoFailure",
        "pattern": r"(?i)(?:DES|RC4|ARC4|Blowfish)\.(?:new|encrypt|create)",
        "severity": HIGH,
        "langs": {"py", "js", "ts", "java"},
    },
    # A04: Insecure Design — Path Traversal
    {
        "name": "Path Traversal (user input in file ops)",
        "category": "A04:InsecureDesign",
        "pattern": r"(?:open|readFile|readFileSync|createReadStream)\s*\(.*\+.*(?:req\.|request\.|params|query|body)",
        "severity": HIGH,
        "langs": {"py", "js", "ts"},
    },
    # A05: Security Misconfiguration
    {
        "name": "Debug Mode Enabled",
        "category": "A05:Misconfiguration",
        "pattern": r"(?i)(?:DEBUG\s*=\s*True|app\.debug\s*=\s*True|\"debug\"\s*:\s*true)",
        "severity": MEDIUM,
        "langs": {"py", "js", "ts", "yml", "yaml", "json"},
    },
    {
        "name": "CORS Wildcard Origin",
        "category": "A05:Misconfiguration",
        "pattern": r"(?i)(?:Access-Control-Allow-Origin|cors.*origin)[\"']?\s*[=:,]\s*[\"']?\*",
        "severity": MEDIUM,
        "langs": {"py", "js", "ts", "java", "conf", "yml", "yaml"},
    },
    {
        "name": "Binding to 0.0.0.0",
        "category": "A05:Misconfiguration",
        "pattern": r"(?i)(?:host|bind|listen)\s*[=:(].*?[\"']?0\.0\.0\.0[\"']?",
        "severity": LOW,
        "langs": {"py", "js", "ts", "yml", "yaml", "conf"},
    },
    # A08: Integrity Failures — Insecure Deserialization
    {
        "name": "Insecure Deserialization (pickle)",
        "category": "A08:IntegrityFailure",
        "pattern": r"pickle\.(?:loads?|Unpickler)\s*\(",
        "severity": HIGH,
        "langs": {"py"},
    },
    {
        "name": "Insecure Deserialization (yaml.load without SafeLoader)",
        "category": "A08:IntegrityFailure",
        "pattern": r"yaml\.load\s*\(",
        "severity": HIGH,
        "langs": {"py"},
        "exclude_in_line": ["SafeLoader", "safe_load", "CSafeLoader"],
    },
    {
        "name": "Insecure Deserialization (marshal)",
        "category": "A08:IntegrityFailure",
        "pattern": r"marshal\.loads?\s*\(",
        "severity": MEDIUM,
        "langs": {"py"},
    },
    {
        "name": "Insecure Deserialization (unserialize)",
        "category": "A08:IntegrityFailure",
        "pattern": r"(?<!\w)unserialize\s*\(",
        "severity": HIGH,
        "langs": {"php"},
    },
    # A10: SSRF
    {
        "name": "Potential SSRF",
        "category": "A10:SSRF",
        "pattern": r"(?:requests\.get|requests\.post|fetch|urllib\.request\.urlopen|http\.get)\s*\(\s*(?:req\.|request\.|params|query|body|user)",
        "severity": HIGH,
        "langs": {"py", "js", "ts"},
    },
]

# ── Entropy ──────────────────────────────────────────────────────────────────

ENTROPY_THRESHOLD = 4.5
ENTROPY_MIN_LENGTH = 20


def shannon_entropy(data):
    """Calculate Shannon entropy of a string."""
    if not data:
        return 0.0
    freq = Counter(data)
    length = len(data)
    return -sum(
        (count / length) * math.log2(count / length) for count in freq.values()
    )


# Regex to extract quoted string values from code
HIGH_ENTROPY_CONTEXT = re.compile(
    r"""(?i)(?:key|secret|token|password|passwd|pwd|credential|auth|api)\s*[=:]\s*["']([^"']{20,})["']"""
)


# ── Finding ──────────────────────────────────────────────────────────────────


class Finding:
    __slots__ = ("scanner", "name", "severity", "file", "line", "snippet", "category")

    def __init__(self, scanner, name, severity, file, line, snippet, category=""):
        self.scanner = scanner
        self.name = name
        self.severity = severity
        self.file = file
        self.line = line
        self.snippet = snippet
        self.category = category

    def to_dict(self):
        return {
            "scanner": self.scanner,
            "name": self.name,
            "severity": self.severity,
            "file": self.file,
            "line": self.line,
            "snippet": self.snippet,
            "category": self.category,
        }


# ── File walker ──────────────────────────────────────────────────────────────


def walk_files(root, exclude_dirs, max_file_kb):
    """Yield (path, relative_path) for scannable text files."""
    root = Path(root).resolve()
    max_bytes = max_file_kb * 1024

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d
            for d in dirnames
            if d not in exclude_dirs and not d.startswith(".")
        ]

        for fname in filenames:
            fpath = Path(dirpath) / fname
            suffix = fpath.suffix.lower()
            if suffix in BINARY_EXTENSIONS:
                continue
            try:
                size = fpath.stat().st_size
            except OSError:
                continue
            if size == 0 or size > max_bytes:
                continue
            rel = fpath.relative_to(root)
            yield fpath, str(rel)


def read_lines(fpath):
    """Read file lines, returning empty list for binary/undecodable files."""
    try:
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            return f.readlines()
    except (OSError, UnicodeDecodeError):
        return []


# ── Dependency scanner ───────────────────────────────────────────────────────


def scan_npm(project_dir):
    """Run npm audit and return findings."""
    findings = []
    lock_file = project_dir / "package-lock.json"
    pkg_file = project_dir / "package.json"
    if not pkg_file.exists():
        return findings

    npm_path = shutil.which("npm")
    if not npm_path:
        print("[INFO] npm not found, skipping npm audit", file=sys.stderr)
        return findings

    if not lock_file.exists():
        print(
            "[INFO] package-lock.json not found, skipping npm audit "
            "(run 'npm install' first)",
            file=sys.stderr,
        )
        return findings

    try:
        result = subprocess.run(
            [npm_path, "audit", "--json"],
            capture_output=True,
            text=True,
            cwd=str(project_dir),
            timeout=120,
        )
        data = json.loads(result.stdout) if result.stdout.strip() else {}
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
        print(f"[WARN] npm audit failed: {exc}", file=sys.stderr)
        return findings

    vulns = data.get("vulnerabilities", {})
    for pkg_name, info in vulns.items():
        sev = info.get("severity", "low").lower()
        if sev not in SEVERITY_RANK:
            sev = LOW
        via = info.get("via", [])
        title = pkg_name
        if via and isinstance(via[0], dict):
            title = via[0].get("title", pkg_name)
        findings.append(
            Finding(
                scanner="deps",
                name=f"npm: {title}",
                severity=sev,
                file="package.json",
                line=0,
                snippet=f"{pkg_name}@{info.get('range', 'unknown')}",
                category="dependency-vulnerability",
            )
        )
    return findings


def scan_pip(project_dir):
    """Run pip-audit and return findings."""
    findings = []
    markers = ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile"]
    has_python = any((project_dir / m).exists() for m in markers)
    if not has_python:
        return findings

    pip_audit_path = shutil.which("pip-audit")
    if not pip_audit_path:
        print("[INFO] pip-audit not found, skipping Python audit", file=sys.stderr)
        return findings

    req_file = project_dir / "requirements.txt"
    cmd = [pip_audit_path, "--format", "json"]
    if req_file.exists():
        cmd.extend(["--requirement", str(req_file)])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(project_dir),
            timeout=120,
        )
        data = json.loads(result.stdout) if result.stdout.strip() else {}
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
        print(f"[WARN] pip-audit failed: {exc}", file=sys.stderr)
        return findings

    deps = data.get("dependencies", [])
    for dep in deps:
        for vuln in dep.get("vulns", []):
            vuln_id = vuln.get("id", "UNKNOWN")
            desc = vuln.get("description", "")
            fix = vuln.get("fix_versions", [])
            sev = HIGH
            if "critical" in desc.lower():
                sev = CRITICAL

            fix_str = ", ".join(fix) if fix else "no fix available"
            findings.append(
                Finding(
                    scanner="deps",
                    name=f"pip: {vuln_id}",
                    severity=sev,
                    file="requirements.txt",
                    line=0,
                    snippet=f"{dep.get('name', '?')}=={dep.get('version', '?')} (fix: {fix_str})",
                    category="dependency-vulnerability",
                )
            )
    return findings


# ── Secret scanner ───────────────────────────────────────────────────────────


def scan_secrets(root, exclude_dirs, max_file_kb):
    """Scan for hardcoded secrets using regex + entropy."""
    findings = []
    compiled = [(p, re.compile(p["pattern"])) for p in SECRET_PATTERNS]

    for fpath, relpath in walk_files(root, exclude_dirs, max_file_kb):
        lines = read_lines(fpath)
        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or stripped.startswith("//"):
                if not any(kw in stripped.lower() for kw in ("key", "secret", "token", "password")):
                    continue

            # Regex-based detection
            for pat_def, regex in compiled:
                match = regex.search(line)
                if match:
                    snippet = stripped[:200]
                    findings.append(
                        Finding(
                            scanner="secrets",
                            name=pat_def["name"],
                            severity=pat_def["severity"],
                            file=relpath,
                            line=line_num,
                            snippet=snippet,
                            category="secret-pattern",
                        )
                    )

            # Entropy-based detection
            for m in HIGH_ENTROPY_CONTEXT.finditer(line):
                value = m.group(1)
                if len(value) < ENTROPY_MIN_LENGTH:
                    continue
                ent = shannon_entropy(value)
                if ent > ENTROPY_THRESHOLD:
                    findings.append(
                        Finding(
                            scanner="secrets",
                            name=f"High-entropy string (entropy={ent:.2f})",
                            severity=MEDIUM,
                            file=relpath,
                            line=line_num,
                            snippet=stripped[:200],
                            category="entropy-detection",
                        )
                    )

    return findings


# ── OWASP scanner ────────────────────────────────────────────────────────────


def scan_owasp(root, exclude_dirs, max_file_kb):
    """Scan for OWASP security anti-patterns."""
    findings = []
    compiled = []
    for p in OWASP_PATTERNS:
        try:
            compiled.append((p, re.compile(p["pattern"], re.IGNORECASE)))
        except re.error:
            compiled.append((p, re.compile(re.escape(p["pattern"]))))

    for fpath, relpath in walk_files(root, exclude_dirs, max_file_kb):
        suffix = fpath.suffix.lower()
        lang = EXT_TO_LANG.get(suffix, "")
        if not lang:
            base = fpath.name.lower()
            if base == "dockerfile":
                lang = "dockerfile"
            elif base == "makefile":
                lang = "makefile"
            else:
                continue

        lines = read_lines(fpath)
        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue

            for pat_def, regex in compiled:
                if lang not in pat_def["langs"]:
                    continue
                match = regex.search(line)
                if not match:
                    continue

                # Check exclude_in_line filter
                excludes = pat_def.get("exclude_in_line", [])
                if any(ex in line for ex in excludes):
                    continue

                findings.append(
                    Finding(
                        scanner="owasp",
                        name=pat_def["name"],
                        severity=pat_def["severity"],
                        file=relpath,
                        line=line_num,
                        snippet=stripped[:200],
                        category=pat_def["category"],
                    )
                )

    return findings


# ── Reporter ─────────────────────────────────────────────────────────────────

SEVERITY_SYMBOL = {
    CRITICAL: "\033[91mCRITICAL\033[0m",
    HIGH: "\033[93mHIGH\033[0m",
    MEDIUM: "\033[33mMEDIUM\033[0m",
    LOW: "\033[37mLOW\033[0m",
}


def format_text(target, modules, findings):
    """Format findings as human-readable text."""
    lines = []
    lines.append("=== Security Scan Report ===")
    lines.append(f"Target: {target}")
    lines.append(f"Modules: {', '.join(modules)}")
    lines.append(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("")

    if not findings:
        lines.append("No security issues found.")
        return "\n".join(lines)

    sorted_findings = sorted(
        findings, key=lambda f: SEVERITY_RANK.get(f.severity, 0), reverse=True
    )

    for f in sorted_findings:
        sev_label = SEVERITY_SYMBOL.get(f.severity, f.severity.upper())
        lines.append(f"[{sev_label}] {f.name}")
        loc = f"{f.file}:{f.line}" if f.line > 0 else f.file
        lines.append(f"  File: {loc}")
        lines.append(f"  Code: {f.snippet}")
        if f.category:
            lines.append(f"  Category: {f.category}")
        lines.append("")

    counts = {s: 0 for s in (CRITICAL, HIGH, MEDIUM, LOW)}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    lines.append("--- Summary ---")
    lines.append(
        f"Critical: {counts[CRITICAL]} | High: {counts[HIGH]} | "
        f"Medium: {counts[MEDIUM]} | Low: {counts[LOW]}"
    )
    lines.append(f"Total findings: {len(findings)}")
    return "\n".join(lines)


def format_json(target, modules, findings):
    """Format findings as JSON."""
    counts = {s: 0 for s in (CRITICAL, HIGH, MEDIUM, LOW)}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    report = {
        "target": str(target),
        "scan_time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "modules": modules,
        "findings": [f.to_dict() for f in findings],
        "summary": {
            "critical": counts[CRITICAL],
            "high": counts[HIGH],
            "medium": counts[MEDIUM],
            "low": counts[LOW],
            "total": len(findings),
        },
    }
    return json.dumps(report, indent=2, ensure_ascii=False)


# ── Deduplication ────────────────────────────────────────────────────────────


def deduplicate(findings):
    """Remove duplicate findings (same file + line + name)."""
    seen = set()
    unique = []
    for f in findings:
        key = (f.file, f.line, f.name)
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique


# ── Main ─────────────────────────────────────────────────────────────────────


def build_parser():
    parser = argparse.ArgumentParser(
        description="Code security scanner: dependency audit, secret detection, OWASP patterns",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s .                          Scan current directory (all modules)
  %(prog)s --mode secrets /src        Secret detection only
  %(prog)s --mode owasp --format json Scan OWASP patterns, JSON output
  %(prog)s --severity high .          Only report high and critical
""",
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="Directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--mode",
        choices=["all", "deps", "secrets", "owasp"],
        default="all",
        help="Scan module (default: all)",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        dest="out_format",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Write report to file (default: stdout)",
    )
    parser.add_argument(
        "--severity",
        choices=["low", "medium", "high", "critical"],
        default="low",
        help="Minimum severity to report (default: low)",
    )
    parser.add_argument(
        "--exclude-dir",
        action="append",
        default=[],
        dest="exclude_dirs",
        help="Additional directories to exclude (repeatable)",
    )
    parser.add_argument(
        "--max-file-kb",
        type=int,
        default=512,
        help="Max file size in KB to scan (default: 512)",
    )
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    target = Path(args.target).resolve()
    if not target.is_dir():
        print(f"Error: '{args.target}' is not a directory", file=sys.stderr)
        sys.exit(2)

    exclude_dirs = DEFAULT_EXCLUDE_DIRS | set(args.exclude_dirs)
    min_sev = SEVERITY_RANK.get(args.severity, 0)

    modules = []
    if args.mode == "all":
        modules = ["deps", "secrets", "owasp"]
    else:
        modules = [args.mode]

    all_findings = []

    if "deps" in modules:
        all_findings.extend(scan_npm(target))
        all_findings.extend(scan_pip(target))

    if "secrets" in modules:
        all_findings.extend(scan_secrets(target, exclude_dirs, args.max_file_kb))

    if "owasp" in modules:
        all_findings.extend(scan_owasp(target, exclude_dirs, args.max_file_kb))

    all_findings = deduplicate(all_findings)
    all_findings = [f for f in all_findings if SEVERITY_RANK.get(f.severity, 0) >= min_sev]

    if args.out_format == "json":
        output = format_json(target, modules, all_findings)
    else:
        output = format_text(target, modules, all_findings)

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(output, encoding="utf-8")
        print(f"Report written to: {args.output}", file=sys.stderr)
    else:
        print(output)

    sys.exit(1 if all_findings else 0)


if __name__ == "__main__":
    main()

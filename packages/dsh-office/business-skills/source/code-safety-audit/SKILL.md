---
name: code-safety-audit
description: "扫描代码安全漏洞，检测依赖漏洞、密钥泄露和OWASP安全模式。当用户提到安全扫描、漏洞检测、依赖审计、密钥泄露、API key、OWASP、npm audit、pip-audit或SQL注入/XSS等关键词时触发。"
license: MIT
---

# security-scanner

代码安全扫描工具，提供三大扫描能力：

1. **依赖漏洞扫描** — 自动检测 npm / pip 依赖中的已知漏洞
2. **密钥泄露检测** — 通过正则匹配 + Shannon 熵值分析发现硬编码的密钥、Token、密码
3. **OWASP 模式检测** — 识别 SQL 注入、XSS、命令注入、不安全反序列化等常见安全反模式

## Quick Start

```bash
# 扫描当前目录（全部检查项）
python3 scripts/security_scan.py .

# 仅扫描依赖漏洞
python3 scripts/security_scan.py --mode deps .

# 仅检测密钥泄露
python3 scripts/security_scan.py --mode secrets /path/to/project

# 仅检测 OWASP 安全模式
python3 scripts/security_scan.py --mode owasp .

# 输出 JSON 格式报告
python3 scripts/security_scan.py --format json --output report.json .

# 只显示 high 及以上严重级别
python3 scripts/security_scan.py --severity high .
```

## 扫描模块详情

### 1. 依赖漏洞扫描 (deps)

自动检测项目类型并调用相应工具：

| 项目类型 | 检测文件 | 使用工具 |
|---|---|---|
| Node.js | `package.json` + `package-lock.json` | `npm audit` |
| Python | `requirements.txt` / `pyproject.toml` / `Pipfile` | `pip-audit` |

如果对应的审计工具未安装，会给出提示而不是报错。

### 2. 密钥泄露检测 (secrets)

通过两种方式检测：

**正则匹配**：覆盖常见的密钥格式

| 密钥类型 | 示例模式 |
|---|---|
| AWS Access Key | `AKIA` 开头的 20 字符 |
| GitHub Token | `ghp_`、`github_pat_` 开头 |
| Slack Token | `xoxb-`、`xoxp-` 开头 |
| Stripe Key | `sk_live_`、`pk_live_` 开头 |
| 私钥文件 | `-----BEGIN PRIVATE KEY-----` |
| 通用 API Key | `api_key = "..."` 格式 |
| URL 内嵌凭据 | `https://user:pass@host` |
| JWT Token | `eyJ...` 格式 |

**Shannon 熵值分析**：对代码中的字符串常量计算信息熵（阈值 > 4.5 且长度 >= 20），用于发现非标准格式的密钥。

### 3. OWASP 模式检测 (owasp)

覆盖 OWASP Top 10 中可静态检测的安全模式：

| OWASP 分类 | 检测模式 |
|---|---|
| A02: 密码学失败 | 弱哈希 (MD5/SHA1)、弱加密 (DES/RC4) |
| A03: 注入 | SQL 注入、命令注入 (os.system/subprocess shell/eval/exec)、XSS (innerHTML/document.write/dangerouslySetInnerHTML/v-html) |
| A04: 不安全设计 | 路径遍历 |
| A05: 安全配置错误 | Debug 模式开启、CORS 通配符、绑定 0.0.0.0 |
| A08: 完整性失败 | 不安全反序列化 (pickle/yaml.load/marshal/unserialize) |
| A10: SSRF | 用户输入直接用于 HTTP 请求 |

支持语言：Python、JavaScript/TypeScript、Java、PHP、Ruby、Go 等。

## 参数说明

| 参数 | 说明 | 默认值 |
|---|---|---|
| `TARGET` | 扫描目标目录 | 当前目录 |
| `--mode MODE` | 扫描模式：`all`、`deps`、`secrets`、`owasp` | `all` |
| `--format FORMAT` | 输出格式：`text`、`json` | `text` |
| `--output FILE` | 输出文件路径 | stdout |
| `--severity LEVEL` | 最低报告级别：`low`、`medium`、`high`、`critical` | `low` |
| `--exclude-dir DIR` | 额外排除的目录（可重复使用） | - |
| `--max-file-kb SIZE` | 单文件最大扫描大小 (KB) | `512` |
| `-h, --help` | 显示帮助 | - |

## 输出格式

### 文本输出（默认）

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

### JSON 输出

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

## 退出码

| 退出码 | 含义 |
|---|---|
| `0` | 无发现 |
| `1` | 有发现（至少一个安全问题） |
| `2` | 扫描器自身错误 |

## 前置条件

- Python 3.7+（仅使用标准库）
- 依赖扫描需要相应工具：`npm`（Node.js 项目）、`pip-audit`（Python 项目）
- 如缺少审计工具，该模块会跳过并给出提示，不影响其他模块运行

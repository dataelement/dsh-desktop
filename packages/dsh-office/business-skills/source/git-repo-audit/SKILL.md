---
name: git-repo-audit
description: "深度分析 Git 仓库历史，识别高频变更的热点文件、分析代码的实际贡献归属关系、并扫描历史提交中的密钥泄露等安全隐患。当用户提及分析仓库、查看代码归属、寻找热点文件或安全风险扫描，或询问团队协作、代码审查分配、技术债务与安全审计等关键词时触发。"
type: tool
license: MIT
tags:
  - git
  - security
  - analysis
  - devops
---

# Git Forensics — Git 历史深度分析

对 Git 仓库进行三维深度分析：**热点文件识别**、**代码归属分析**、**密钥泄露扫描**。

## 功能概览

### 1. 热点文件分析 (`scripts/hotfiles.sh`)

找出仓库中变更最频繁的文件，帮助识别：
- 高风险代码区域（频繁修改 = 潜在不稳定）
- 需要重点 code review 的文件
- 可能需要拆分或重构的模块

**用法：**
```bash
bash scripts/hotfiles.sh [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--repo PATH` | 仓库路径 | 当前目录 |
| `--top N` | 显示前 N 个文件 | 20 |
| `--since DATE` | 起始日期（如 `2024-01-01`） | 不限 |
| `--until DATE` | 截止日期 | 不限 |
| `--author AUTHOR` | 按作者过滤 | 不限 |
| `--format FORMAT` | 输出格式：`table` / `csv` / `json` | table |

### 2. 代码归属分析 (`scripts/ownership.sh`)

分析代码的实际归属关系，输出每位贡献者在指定范围内的：
- 提交次数与占比
- 修改行数（增/删）
- 最近活跃时间

**用法：**
```bash
bash scripts/ownership.sh [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--repo PATH` | 仓库路径 | 当前目录 |
| `--path SUBPATH` | 分析指定子目录或文件 | 整个仓库 |
| `--top N` | 显示前 N 位贡献者 | 10 |
| `--since DATE` | 起始日期 | 不限 |
| `--format FORMAT` | 输出格式：`table` / `csv` / `json` | table |

### 3. 密钥泄露扫描 (`scripts/secret-scan.sh`)

扫描 Git 全量历史（包括已删除的 commit），检测常见的密钥和敏感信息泄露：
- AWS Access Key / Secret Key
- GitHub / GitLab / Slack Token
- SSH 私钥
- 通用 API Key、密码、Secret 模式

**用法：**
```bash
bash scripts/secret-scan.sh [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--repo PATH` | 仓库路径 | 当前目录 |
| `--branch BRANCH` | 扫描指定分支 | 所有分支 |
| `--since DATE` | 起始日期 | 不限 |
| `--format FORMAT` | 输出格式：`table` / `csv` / `json` | table |
| `--severity LEVEL` | 最低严重级别：`low` / `medium` / `high` | low |

## 使用场景

- **安全审计**：在代码上线前扫描历史中是否有密钥泄露
- **Code Review 优化**：识别热点文件，优先 review 高风险区域
- **团队协作**：了解谁最熟悉哪部分代码，合理分配 review 任务
- **技术债务评估**：高频变更文件可能是重构候选

## 依赖

- `git`（>= 2.20）
- `bash`（>= 4.0）
- 标准 Unix 工具：`awk`、`sort`、`head`、`grep`

无需安装任何额外依赖或付费 API。

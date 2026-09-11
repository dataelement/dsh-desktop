---
name: smart-commit-gen
description: "Conventional Commits 规范化工具：分析 git diff 自动生成符合规范的提交信息，支持自动检测作用域（scope）并智能推断提交类型（如 feat, fix, refactor）。当用户提及 commit message、提交信息、conventional commits、git commit、规范化提交、scope 检测，或提出“帮我写个 commit message”、“这些改动应该怎么提交”、“分析一下 diff 生成提交信息”等请求时触发。"
type: tool
license: MIT
tags:
  - git
  - conventional-commits
  - devops
  - productivity
---

# Git Commit Helper

分析当前 git diff，自动生成符合 [Conventional Commits](https://www.conventionalcommits.org/) 规范的 commit message，并智能检测 scope。

## Quick Start

```bash
# 分析未暂存的改动，生成 commit message
python3 scripts/analyze_diff.py

# 分析已暂存（staged）的改动
python3 scripts/analyze_diff.py --staged

# 指定仓库路径
python3 scripts/analyze_diff.py --repo /path/to/repo

# JSON 格式输出（便于程序集成）
python3 scripts/analyze_diff.py --staged --format json

# 手动覆盖 type 或 scope
python3 scripts/analyze_diff.py --staged --type-override feat --scope-override auth
```

## 使用流程（SOP）

### 1. 获取 diff 分析结果

在用户的 git 仓库中运行脚本，获取自动分析结果：

```bash
python3 scripts/analyze_diff.py --staged --format json
```

### 2. 审查并调整

脚本会输出：
- **type**：自动推断的提交类型（feat / fix / docs / style / refactor / test / chore / perf / ci / build）
- **scope**：从文件路径中检测的作用域（如 auth、api、ui 等）
- **description**：基于变更统计生成的简要描述
- **commit_message**：组装好的完整 commit message

审查输出后，根据实际语义调整：
- 如果 type 不准确（如脚本判断为 chore 但实际是 feat），用 `--type-override` 覆盖
- 如果 scope 不合适，用 `--scope-override` 覆盖
- description 建议根据实际改动内容手写，脚本输出仅作参考

> **注意**：type 检测基于文件路径和变更统计，对 test/docs/ci/build 等类型的检测较准确，但对修改已有源代码文件的情况（feat vs fix vs refactor）需要你阅读 diff 内容后判断。

### 3. Conventional Commits 规范参考

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type       | 含义                        |
|------------|-----------------------------|
| `feat`     | 新功能                      |
| `fix`      | Bug 修复                    |
| `docs`     | 文档变更                    |
| `style`    | 代码格式（不影响逻辑）       |
| `refactor` | 重构（不涉及新功能或修复）   |
| `test`     | 测试相关                    |
| `chore`    | 构建/工具/依赖等杂项        |
| `perf`     | 性能优化                    |
| `ci`       | CI/CD 配置变更              |
| `build`    | 构建系统或外部依赖变更       |

### 4. Breaking Changes

如果改动包含不兼容变更，在 type 后加 `!`：

```
feat(api)!: change authentication endpoint response format
```

## 参数说明

| 参数              | 说明                                      | 默认值   |
|-------------------|-------------------------------------------|----------|
| `--repo`          | Git 仓库路径                               | `.`      |
| `--staged`        | 仅分析已暂存的改动                         | 否       |
| `--format`        | 输出格式：`text` 或 `json`                 | `text`   |
| `--type-override` | 手动指定 commit type，跳过自动检测          | 无       |
| `--scope-override`| 手动指定 scope，跳过自动检测               | 无       |

## 前置条件

- Python 3.6+
- git 已安装且在 PATH 中
- 当前目录或 `--repo` 指向一个有效的 git 仓库

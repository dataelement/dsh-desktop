---
name: conventional-commit-gen
description: "Analyzes git diff to generate commit messages following the Conventional Commits spec, with automatic scope detection and commit type inference. Trigger when users ask to write or generate a commit message, mention Conventional Commits, git commits, standardized commits, scope detection, or phrases like 'help me write a commit message'."
type: tool
license: MIT
tags:
  - git
  - conventional-commits
  - devops
  - productivity
---

# Conventional Commit Gen

Analyzes the current git diff and automatically generates a commit message that follows the [Conventional Commits](https://www.conventionalcommits.org/) specification, with smart scope detection.

## Quick Start

```bash
# Analyze unstaged changes and generate a commit message
python3 scripts/analyze_diff.py

# Analyze staged changes only
python3 scripts/analyze_diff.py --staged

# Specify a repository path
python3 scripts/analyze_diff.py --repo /path/to/repo

# JSON output (useful for programmatic integration)
python3 scripts/analyze_diff.py --staged --format json

# Manually override type or scope
python3 scripts/analyze_diff.py --staged --type-override feat --scope-override auth
```

## Usage Workflow (SOP)

### 1. Get the Diff Analysis

Run the script in the user's git repository to get the automated analysis:

```bash
python3 scripts/analyze_diff.py --staged --format json
```

### 2. Review and Adjust

The script outputs:
- **type**: The auto-detected commit type (feat / fix / docs / style / refactor / test / chore / perf / ci / build)
- **scope**: The scope detected from file paths (e.g., auth, api, ui)
- **description**: A brief description generated from the change summary
- **commit_message**: The fully assembled commit message

After reviewing the output, adjust as needed:
- If the type is inaccurate (e.g., the script detected `chore` but it's actually a `feat`), use `--type-override` to override
- If the scope doesn't fit, use `--scope-override` to override
- The description should ideally be hand-written based on the actual changes; treat the script output as a starting point

> **Note**: Type detection is based on file paths and change statistics. It works well for types like test/docs/ci/build, but for modifications to existing source code files (feat vs fix vs refactor), you should read the diff content and make the final call.

### 3. Conventional Commits Reference

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type       | Meaning                                    |
|------------|--------------------------------------------|
| `feat`     | A new feature                              |
| `fix`      | A bug fix                                  |
| `docs`     | Documentation changes                      |
| `style`    | Code formatting (no logic changes)         |
| `refactor` | Refactoring (no new features or bug fixes) |
| `test`     | Test-related changes                       |
| `chore`    | Build/tooling/dependency maintenance       |
| `perf`     | Performance improvements                   |
| `ci`       | CI/CD configuration changes                |
| `build`    | Build system or external dependency changes|

### 4. Breaking Changes

If the change includes a breaking change, add `!` after the type:

```
feat(api)!: change authentication endpoint response format
```

## Parameters

| Parameter           | Description                                       | Default  |
|---------------------|---------------------------------------------------|----------|
| `--repo`            | Path to the git repository                        | `.`      |
| `--staged`          | Analyze staged changes only                       | No       |
| `--format`          | Output format: `text` or `json`                   | `text`   |
| `--type-override`   | Manually specify the commit type, skipping auto-detection | None |
| `--scope-override`  | Manually specify the scope, skipping auto-detection | None   |

## Prerequisites

- Python 3.6+
- git installed and available in PATH
- Current directory or `--repo` points to a valid git repository

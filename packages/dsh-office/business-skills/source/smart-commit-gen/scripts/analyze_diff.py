#!/usr/bin/env python3
"""Analyze git diff and generate Conventional Commits message."""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import PurePosixPath


def run_git(args, cwd=None):
    """Run a git command and return stdout."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            cwd=cwd,
        )
        if result.returncode != 0:
            print(
                f"Error: git {' '.join(args)} failed: {result.stderr.strip()}",
                file=sys.stderr,
            )
            sys.exit(1)
        return result.stdout
    except FileNotFoundError:
        print("Error: git is not installed or not in PATH", file=sys.stderr)
        sys.exit(1)


def get_changed_files(repo, staged):
    """Get list of changed files with their status."""
    diff_args = ["diff", "--name-status"]
    if staged:
        diff_args.append("--staged")
    output = run_git(diff_args, cwd=repo)

    files = []
    for line in output.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0][0]
        filepath = parts[-1]
        files.append({"status": status, "path": filepath})
    return files


def get_diff_stats(repo, staged):
    """Get diff statistics (insertions, deletions per file)."""
    diff_args = ["diff", "--numstat"]
    if staged:
        diff_args.append("--staged")
    output = run_git(diff_args, cwd=repo)

    stats = []
    for line in output.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            added = int(parts[0]) if parts[0] != "-" else 0
            deleted = int(parts[1]) if parts[1] != "-" else 0
            stats.append({"path": parts[2], "added": added, "deleted": deleted})
    return stats


TYPE_PATTERNS = {
    "test": [
        r"(^|/)tests?/",
        r"(^|/)__tests__/",
        r"\.test\.",
        r"\.spec\.",
        r"_test\.(go|py|rb|rs)$",
        r"(^|/)test_",
    ],
    "docs": [
        r"(^|/)docs?/",
        r"README",
        r"CHANGELOG",
        r"CONTRIBUTING",
        r"\.md$",
        r"\.rst$",
    ],
    "ci": [
        r"\.github/workflows/",
        r"\.gitlab-ci",
        r"Jenkinsfile",
        r"\.circleci/",
        r"\.travis\.yml",
        r"azure-pipelines",
    ],
    "build": [
        r"Dockerfile",
        r"docker-compose",
        r"Makefile$",
        r"webpack\.config",
        r"rollup\.config",
        r"vite\.config",
        r"tsconfig",
        r"CMakeLists\.txt",
        r"setup\.py$",
        r"pyproject\.toml$",
        r"Cargo\.toml$",
        r"go\.mod$",
        r"package\.json$",
        r"pom\.xml$",
        r"build\.gradle",
    ],
    "style": [
        r"\.css$",
        r"\.scss$",
        r"\.less$",
        r"\.eslintrc",
        r"\.prettierrc",
    ],
    "chore": [
        r"\.gitignore$",
        r"\.gitattributes$",
        r"\.npmrc$",
        r"\.env\.example$",
        r"\.dockerignore$",
    ],
}


def _stats_for_file(path, stats):
    """Get diff stats for a specific file."""
    for s in stats:
        if s["path"] == path:
            return s
    return None


def detect_type(files, stats):
    """Detect the commit type from changed files and diff stats."""
    if not files:
        return "chore"

    type_votes = Counter()

    for f in files:
        path = f["path"]
        matched = False
        for commit_type, patterns in TYPE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, path, re.IGNORECASE):
                    type_votes[commit_type] += 1
                    matched = True
                    break
            if matched:
                break

        if not matched:
            if f["status"] == "A":
                type_votes["feat"] += 1
            elif f["status"] in ("D", "R"):
                type_votes["refactor"] += 1
            # Modified files: use per-file stats for a smarter guess
            elif f["status"] == "M":
                fstat = _stats_for_file(path, stats)
                if fstat and fstat["added"] > 0 and fstat["deleted"] == 0:
                    type_votes["feat"] += 1
                elif fstat and fstat["deleted"] > fstat["added"] * 2:
                    type_votes["refactor"] += 1
                # Otherwise don't vote — let the tiebreaker decide

    if not type_votes:
        total_added = sum(s["added"] for s in stats)
        total_deleted = sum(s["deleted"] for s in stats)
        if total_added > total_deleted * 2:
            return "feat"
        if total_deleted > total_added * 2:
            return "refactor"
        return "chore"

    if len(type_votes) == 1:
        return type_votes.most_common(1)[0][0]

    total = sum(type_votes.values())
    top_type, top_count = type_votes.most_common(1)[0]
    if top_count > total * 0.6:
        return top_type

    total_added = sum(s["added"] for s in stats)
    total_deleted = sum(s["deleted"] for s in stats)

    if total_added > 0 and total_deleted == 0:
        return "feat"
    if total_deleted > total_added * 2:
        return "refactor"

    new_files = [f for f in files if f["status"] == "A"]
    if len(new_files) > len(files) * 0.5:
        return "feat"

    return top_type


def detect_scope(files):
    """Detect scope from changed file paths."""
    if not files:
        return None

    skip_dirs = {"src", "lib", "app", "pkg", "internal", "cmd", "main"}
    components = []
    for f in files:
        parts = PurePosixPath(f["path"]).parts
        meaningful = [p for p in parts[:-1] if p.lower() not in skip_dirs]
        if meaningful:
            components.append(meaningful[0])

    if not components:
        exts = [PurePosixPath(f["path"]).suffix for f in files]
        ext_counter = Counter(exts)
        if len(ext_counter) == 1 and ext_counter.most_common(1)[0][0]:
            ext = ext_counter.most_common(1)[0][0].lstrip(".")
            scope_map = {
                "py": "python",
                "ts": "frontend",
                "tsx": "frontend",
                "js": "frontend",
                "jsx": "frontend",
                "go": "server",
                "rs": "core",
                "java": "server",
                "css": "style",
                "scss": "style",
            }
            return scope_map.get(ext)
        return None

    counter = Counter(components)
    top_component, top_count = counter.most_common(1)[0]
    if top_count >= len(files) * 0.5:
        return top_component.lower().replace(" ", "-")

    return None


def generate_description(files, stats):
    """Generate a short description from change summary."""
    if not files:
        return "no changes detected"

    status_counts = Counter(f["status"] for f in files)
    parts = []

    if status_counts.get("A", 0) > 0:
        count = status_counts["A"]
        added_files = [f["path"] for f in files if f["status"] == "A"]
        if count == 1:
            parts.append(f"add {PurePosixPath(added_files[0]).name}")
        else:
            parts.append(f"add {count} new files")

    if status_counts.get("M", 0) > 0:
        count = status_counts["M"]
        mod_files = [f["path"] for f in files if f["status"] == "M"]
        if count == 1:
            parts.append(f"update {PurePosixPath(mod_files[0]).name}")
        else:
            parts.append(f"update {count} files")

    if status_counts.get("D", 0) > 0:
        count = status_counts["D"]
        del_files = [f["path"] for f in files if f["status"] == "D"]
        if count == 1:
            parts.append(f"remove {PurePosixPath(del_files[0]).name}")
        else:
            parts.append(f"remove {count} files")

    if status_counts.get("R", 0) > 0:
        count = status_counts["R"]
        parts.append(f"rename {count} file{'s' if count > 1 else ''}")

    if parts:
        return ", ".join(parts)
    return f"modify {len(files)} file{'s' if len(files) > 1 else ''}"


def main():
    parser = argparse.ArgumentParser(
        description="Analyze git diff and generate Conventional Commits message"
    )
    parser.add_argument(
        "--repo",
        default=".",
        help="Path to git repository (default: current directory)",
    )
    parser.add_argument(
        "--staged",
        action="store_true",
        help="Analyze staged changes only (git diff --staged)",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--type-override",
        help="Override auto-detected commit type",
    )
    parser.add_argument(
        "--scope-override",
        help="Override auto-detected scope",
    )
    args = parser.parse_args()

    run_git(["rev-parse", "--git-dir"], cwd=args.repo)

    files = get_changed_files(args.repo, args.staged)
    stats = get_diff_stats(args.repo, args.staged)

    if not files:
        if args.format == "json":
            print(json.dumps({"error": "no changes detected"}, ensure_ascii=False))
        else:
            print("No changes detected.", file=sys.stderr)
        sys.exit(1)

    commit_type = args.type_override or detect_type(files, stats)
    scope = args.scope_override or detect_scope(files)
    if scope and scope == commit_type:
        scope = None
    description = generate_description(files, stats)

    if scope:
        commit_msg = f"{commit_type}({scope}): {description}"
    else:
        commit_msg = f"{commit_type}: {description}"

    file_summary = []
    for f in files:
        stat = next((s for s in stats if s["path"] == f["path"]), None)
        entry = {"path": f["path"], "status": f["status"]}
        if stat:
            entry["added"] = stat["added"]
            entry["deleted"] = stat["deleted"]
        file_summary.append(entry)

    total_added = sum(s["added"] for s in stats)
    total_deleted = sum(s["deleted"] for s in stats)

    if args.format == "json":
        result = {
            "commit_message": commit_msg,
            "type": commit_type,
            "scope": scope,
            "description": description,
            "files_changed": len(files),
            "total_insertions": total_added,
            "total_deletions": total_deleted,
            "files": file_summary,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        status_labels = {
            "A": "added",
            "M": "modified",
            "D": "deleted",
            "R": "renamed",
            "C": "copied",
        }
        print(f"Commit message:  {commit_msg}")
        print(f"Type:            {commit_type}")
        print(f"Scope:           {scope or '(none)'}")
        print(f"Description:     {description}")
        print(f"Files changed:   {len(files)}")
        print(f"Insertions:      +{total_added}")
        print(f"Deletions:       -{total_deleted}")
        print()
        print("Changed files:")
        for f in file_summary:
            label = status_labels.get(f["status"], f["status"])
            line = f"  [{label:8s}] {f['path']}"
            if "added" in f:
                line += f"  (+{f['added']}/-{f['deleted']})"
            print(line)


if __name__ == "__main__":
    main()

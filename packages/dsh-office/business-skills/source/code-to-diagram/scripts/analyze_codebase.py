#!/usr/bin/env python3
"""
analyze_codebase.py — Scan a codebase, extract import relationships via AST,
and generate Mermaid architecture / flowchart / org-chart diagrams.

Supports: Python, JavaScript, TypeScript, Go, Java
Output:   Mermaid (.mmd) and optionally SVG (requires mmdc)

Usage:
    python3 analyze_codebase.py /path/to/project
    python3 analyze_codebase.py /path/to/project --type architecture --format svg
"""

import ast
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set


# ---------------------------------------------------------------------------
# Language-specific import parsers
# ---------------------------------------------------------------------------

class PythonImportParser:
    def parse(self, filepath: str) -> List[str]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                tree = ast.parse(fh.read(), filename=filepath)
        except (SyntaxError, ValueError, RecursionError):
            return []
        imports: List[str] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        return imports


class JSImportParser:
    _PATTERNS = [
        re.compile(r"""import\s+.*?\s+from\s+['"]([^'"]+)['"]"""),
        re.compile(r"""import\s+['"]([^'"]+)['"]"""),
        re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
        re.compile(r"""export\s+.*?\s+from\s+['"]([^'"]+)['"]"""),
    ]

    def parse(self, filepath: str) -> List[str]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []
        imports: List[str] = []
        for pat in self._PATTERNS:
            imports.extend(pat.findall(content))
        return imports


class GoImportParser:
    _SINGLE = re.compile(r'import\s+"([^"]+)"')
    _GROUP = re.compile(r"import\s*\((.*?)\)", re.DOTALL)
    _ITEM = re.compile(r'"([^"]+)"')

    def parse(self, filepath: str) -> List[str]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []
        imports = list(self._SINGLE.findall(content))
        for group in self._GROUP.findall(content):
            imports.extend(self._ITEM.findall(group))
        return imports


class JavaImportParser:
    _PATTERN = re.compile(r"import\s+([\w.]+)\s*;")

    def parse(self, filepath: str) -> List[str]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []
        return self._PATTERN.findall(content)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_PYTHON_PARSER = PythonImportParser()
_JS_PARSER = JSImportParser()
_GO_PARSER = GoImportParser()
_JAVA_PARSER = JavaImportParser()

LANGUAGE_MAP: Dict[str, tuple] = {
    ".py": ("python", _PYTHON_PARSER),
    ".js": ("javascript", _JS_PARSER),
    ".jsx": ("javascript", _JS_PARSER),
    ".ts": ("typescript", _JS_PARSER),
    ".tsx": ("typescript", _JS_PARSER),
    ".mjs": ("javascript", _JS_PARSER),
    ".cjs": ("javascript", _JS_PARSER),
    ".go": ("go", _GO_PARSER),
    ".java": ("java", _JAVA_PARSER),
}

IGNORE_DIRS = frozenset({
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", "vendor", ".tox",
    "env", ".env", ".idea", ".vscode", "coverage", ".cache",
    ".mypy_cache", ".pytest_cache", "target", "out",
})


# ---------------------------------------------------------------------------
# Scanning & Dependency Resolution
# ---------------------------------------------------------------------------

def scan_codebase(root_dir: str, max_files: int = 500) -> Dict:
    root = Path(root_dir).resolve()
    files_by_lang: Dict[str, List[str]] = defaultdict(list)
    imports_map: Dict[str, List[str]] = {}
    file_count = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for filename in filenames:
            if file_count >= max_files:
                break
            filepath = Path(dirpath) / filename
            ext = filepath.suffix.lower()
            if ext not in LANGUAGE_MAP:
                continue

            lang, parser = LANGUAGE_MAP[ext]
            rel_path = str(filepath.relative_to(root))
            files_by_lang[lang].append(rel_path)
            file_count += 1

            imported = parser.parse(str(filepath))
            if imported:
                imports_map[rel_path] = imported

        if file_count >= max_files:
            break

    return {
        "root": str(root),
        "files_by_lang": dict(files_by_lang),
        "imports_map": imports_map,
        "total_files": file_count,
    }


def resolve_internal_imports(scan_result: Dict) -> Dict[str, Set[str]]:
    all_files: Set[str] = set()
    for files in scan_result["files_by_lang"].values():
        all_files.update(files)

    module_to_file: Dict[str, str] = {}
    for f in all_files:
        mod = f.replace("/", ".").replace("\\", ".")
        for ext in (".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".go", ".java"):
            if mod.endswith(ext):
                mod = mod[: -len(ext)]
                break
        module_to_file[mod] = f
        base = Path(f).stem
        module_to_file.setdefault(base, f)

    internal_deps: Dict[str, Set[str]] = defaultdict(set)
    for source_file, imports in scan_result["imports_map"].items():
        for imp in imports:
            normalized = imp.replace("/", ".").replace("\\", ".")
            matched: Optional[str] = None

            if normalized in module_to_file:
                matched = module_to_file[normalized]
            else:
                parts = normalized.split(".")
                for i in range(len(parts)):
                    candidate = ".".join(parts[i:])
                    if candidate in module_to_file:
                        matched = module_to_file[candidate]
                        break

            if matched and matched != source_file:
                internal_deps[source_file].add(matched)

    return dict(internal_deps)


# ---------------------------------------------------------------------------
# Mermaid ID helper
# ---------------------------------------------------------------------------

def _mid(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", name)


# ---------------------------------------------------------------------------
# Diagram generators
# ---------------------------------------------------------------------------

def generate_architecture_diagram(
    scan_result: Dict, internal_deps: Dict[str, Set[str]]
) -> str:
    lines = ["graph TD"]

    if not internal_deps:
        lines.append('    empty["No import dependencies detected"]')
        return "\n".join(lines)

    def _build_groups(keyfn):
        dd: Dict[str, Set[str]] = defaultdict(set)
        df: Dict[str, Set[str]] = defaultdict(set)
        for source, targets in internal_deps.items():
            sg = keyfn(source)
            df[sg].add(source)
            for target in targets:
                tg = keyfn(target)
                df[tg].add(target)
                if sg != tg:
                    dd[sg].add(tg)
        return dict(dd), dict(df)

    def _top_dir(path: str) -> str:
        parts = Path(path).parts
        return parts[0] if len(parts) > 1 else "root"

    def _parent_dir(path: str) -> str:
        parent = str(Path(path).parent)
        return parent if parent != "." else "root"

    # Adaptive grouping: try coarse first, refine if no cross-group edges
    dir_deps, dir_files = _build_groups(_top_dir)
    if not dir_deps:
        dir_deps, dir_files = _build_groups(_parent_dir)

    # Still no cross-group edges → file-level edges
    if not dir_deps:
        for source, targets in sorted(internal_deps.items()):
            sid = _mid(source)
            lines.append(f'    {sid}["{source}"]')
            for target in sorted(targets):
                tid = _mid(target)
                lines.append(f'    {tid}["{target}"]')
                lines.append(f"    {sid} --> {tid}")
        return "\n".join(lines)

    for dir_name in sorted(dir_files):
        did = _mid(dir_name)
        lines.append(f'    subgraph {did}["{dir_name}"]')
        for f in sorted(dir_files[dir_name]):
            fid = _mid(f)
            lines.append(f'        {fid}["{Path(f).name}"]')
        lines.append("    end")

    seen_edges: Set[tuple] = set()
    for src_dir, tgt_dirs in sorted(dir_deps.items()):
        for tgt_dir in sorted(tgt_dirs):
            edge = (src_dir, tgt_dir)
            if edge not in seen_edges:
                seen_edges.add(edge)
                lines.append(f"    {_mid(src_dir)} --> {_mid(tgt_dir)}")

    return "\n".join(lines)


def generate_flowchart(
    scan_result: Dict, internal_deps: Dict[str, Set[str]]
) -> str:
    lines = ["flowchart LR"]

    if not internal_deps:
        lines.append('    empty["No import dependencies detected"]')
        return "\n".join(lines)

    all_targets: Set[str] = set()
    for targets in internal_deps.values():
        all_targets.update(targets)

    entry_points = set(internal_deps.keys()) - all_targets
    declared: Set[str] = set()

    for ep in sorted(entry_points):
        eid = _mid(ep)
        lines.append(f'    {eid}(["{Path(ep).name}"])')
        declared.add(ep)

    for source, targets in sorted(internal_deps.items()):
        sid = _mid(source)
        if source not in declared:
            lines.append(f'    {sid}["{Path(source).name}"]')
            declared.add(source)
        for target in sorted(targets):
            tid = _mid(target)
            if target not in declared:
                lines.append(f'    {tid}["{Path(target).name}"]')
                declared.add(target)
            lines.append(f"    {sid} --> {tid}")

    return "\n".join(lines)


def generate_org_chart(root_dir: str, max_depth: int = 4) -> str:
    root = Path(root_dir).resolve()
    lines = ["graph TD"]

    root_id = _mid(root.name or "project")
    lines.append(f'    {root_id}["{root.name or "project"}"]')
    seen: Set[tuple] = set()

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS)

        current = Path(dirpath).resolve()
        rel = current.relative_to(root)
        depth = len(rel.parts)

        if depth >= max_depth:
            dirnames.clear()
            continue

        parent_id = root_id if str(rel) == "." else _mid(str(rel))

        for d in dirnames:
            child_rel = rel / d if str(rel) != "." else Path(d)
            child_id = _mid(str(child_rel))
            edge = (parent_id, child_id)
            if edge not in seen:
                seen.add(edge)
                lines.append(f'    {child_id}["{d}/"]')
                lines.append(f"    {parent_id} --> {child_id}")

        code_files = [
            f for f in filenames if Path(f).suffix.lower() in LANGUAGE_MAP
        ]
        if code_files and len(code_files) <= 10:
            for f in sorted(code_files):
                file_rel = rel / f if str(rel) != "." else Path(f)
                fid = _mid(str(file_rel))
                edge = (parent_id, fid)
                if edge not in seen:
                    seen.add(edge)
                    lines.append(f'    {fid}("{f}")')
                    lines.append(f"    {parent_id} --> {fid}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# SVG rendering (optional, needs mmdc)
# ---------------------------------------------------------------------------

def render_svg(mermaid_text: str, output_path: str) -> bool:
    mmdc = shutil.which("mmdc")
    if not mmdc:
        return False

    fd, mmd_path = tempfile.mkstemp(suffix=".mmd")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(mermaid_text)
        result = subprocess.run(
            [mmdc, "-i", mmd_path, "-o", output_path, "-b", "transparent"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False
    finally:
        try:
            os.unlink(mmd_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Analyze codebase imports and generate Mermaid/SVG diagrams"
    )
    parser.add_argument("directory", help="Root directory of the codebase")
    parser.add_argument(
        "--type", "-t",
        choices=["architecture", "flowchart", "org", "all"],
        default="all",
        help="Diagram type (default: all)",
    )
    parser.add_argument(
        "--output", "-o",
        help="Output directory (default: current directory)",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["mermaid", "svg", "both"],
        default="mermaid",
        help="Output format (default: mermaid)",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=500,
        help="Max source files to scan (default: 500)",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=4,
        help="Max directory depth for org chart (default: 4)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw analysis as JSON",
    )

    args = parser.parse_args()

    target_dir = Path(args.directory).resolve()
    if not target_dir.is_dir():
        print(f"Error: '{args.directory}' is not a valid directory", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output).resolve() if args.output else Path.cwd()
    output_dir.mkdir(parents=True, exist_ok=True)

    # --- scan ---
    print(f"Scanning: {target_dir}", file=sys.stderr)
    scan_result = scan_codebase(str(target_dir), max_files=args.max_files)

    total = scan_result["total_files"]
    langs = len(scan_result["files_by_lang"])
    print(f"Found {total} source file(s) in {langs} language(s)", file=sys.stderr)

    for lang, files in sorted(scan_result["files_by_lang"].items()):
        print(f"  {lang}: {len(files)} file(s)", file=sys.stderr)

    # --- JSON mode ---
    if args.json:
        out = {
            "root": scan_result["root"],
            "files_by_lang": scan_result["files_by_lang"],
            "imports": scan_result["imports_map"],
            "total_files": total,
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return

    # --- resolve deps ---
    internal_deps = resolve_internal_imports(scan_result)
    edge_count = sum(len(v) for v in internal_deps.values())
    print(f"Resolved {edge_count} internal dependency edge(s)", file=sys.stderr)

    # --- generate diagrams ---
    diagrams: Dict[str, str] = {}
    if args.type in ("architecture", "all"):
        diagrams["architecture"] = generate_architecture_diagram(scan_result, internal_deps)
    if args.type in ("flowchart", "all"):
        diagrams["flowchart"] = generate_flowchart(scan_result, internal_deps)
    if args.type in ("org", "all"):
        diagrams["org"] = generate_org_chart(str(target_dir), max_depth=args.max_depth)

    for name, mermaid_text in diagrams.items():
        mmd_path = output_dir / f"{name}.mmd"
        svg_path = output_dir / f"{name}.svg"

        if args.format in ("mermaid", "both"):
            mmd_path.write_text(mermaid_text, encoding="utf-8")
            print(f"Written: {mmd_path}", file=sys.stderr)

        if args.format in ("svg", "both"):
            if render_svg(mermaid_text, str(svg_path)):
                print(f"Written: {svg_path}", file=sys.stderr)
            else:
                mmd_path.write_text(mermaid_text, encoding="utf-8")
                print(
                    f"SVG unavailable (mmdc not found), fallback Mermaid: {mmd_path}",
                    file=sys.stderr,
                )

        print(f"\n--- {name} ---")
        print(mermaid_text)

    print(f"\nGenerated {len(diagrams)} diagram(s).", file=sys.stderr)


if __name__ == "__main__":
    main()

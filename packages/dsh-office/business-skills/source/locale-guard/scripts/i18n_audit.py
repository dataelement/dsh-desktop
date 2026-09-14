#!/usr/bin/env python3
"""Audit i18n key usage vs locale JSON files.

Usage:
  python scripts/i18n_audit.py --src ./src --locale ./locales/en-US/common.json --locale ./locales/zh-CN/common.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Set

KEY_PATTERNS = [
    re.compile(r"(?<![\w.])t\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"\bi18n\.t\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"\bi18next\.t\(\s*['\"]([^'\"]+)['\"]"),
]

PLURAL_SUFFIXES = ("_zero", "_one", "_two", "_few", "_many", "_other")


def iter_source_files(root: Path, exts: Iterable[str]) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if "node_modules" in path.parts or ".git" in path.parts:
            continue
        if path.suffix.lstrip(".") in exts:
            yield path


def extract_keys(paths: Iterable[Path]) -> Set[str]:
    keys: Set[str] = set()
    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for pattern in KEY_PATTERNS:
            for match in pattern.finditer(text):
                keys.add(match.group(1))
    return keys


def flatten_json(obj, prefix: str = "") -> Dict[str, object]:
    keys: Dict[str, object] = {}
    if isinstance(obj, dict):
        for key, value in obj.items():
            path = f"{prefix}.{key}" if prefix else key
            keys.update(flatten_json(value, path))
    else:
        keys[prefix] = obj
    return keys


def locale_name(path: Path) -> str:
    name = path.stem
    if path.name in {"common.json", "translation.json", "messages.json"}:
        parent = path.parent.name
        if parent:
            return parent
    return name


def has_plural_variant(key: str, key_set: Set[str]) -> bool:
    return any(f"{key}{suffix}" in key_set for suffix in PLURAL_SUFFIXES)


def load_locale(path: Path) -> Set[str]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return set(flatten_json(data).keys())


def compute_missing(used: Set[str], locale_keys: Set[str]) -> List[str]:
    missing = []
    for key in sorted(used):
        if key in locale_keys:
            continue
        if has_plural_variant(key, locale_keys):
            continue
        missing.append(key)
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit i18n keys against locale JSON files.")
    parser.add_argument("--src", default=".", help="Source root to scan")
    parser.add_argument(
        "--locale",
        action="append",
        required=True,
        help="Path to locale JSON (repeatable)",
    )
    parser.add_argument(
        "--ext",
        action="append",
        default=["ts", "tsx", "js", "jsx"],
        help="File extensions to scan (repeatable)",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    src_root = Path(args.src).resolve()
    locale_paths = [Path(p).resolve() for p in args.locale]

    source_files = list(iter_source_files(src_root, args.ext))
    used_keys = extract_keys(source_files)

    locale_key_map: Dict[str, Set[str]] = {}
    for path in locale_paths:
        locale_key_map[locale_name(path)] = load_locale(path)

    missing_by_locale = {
        name: compute_missing(used_keys, keys) for name, keys in locale_key_map.items()
    }

    unused_by_locale = {
        name: sorted(keys - used_keys) for name, keys in locale_key_map.items()
    }

    parity_missing: Dict[str, List[str]] = {}
    locale_names = list(locale_key_map.keys())
    for name in locale_names:
        other_names = [n for n in locale_names if n != name]
        other_keys = set().union(*(locale_key_map[n] for n in other_names))
        parity_missing[name] = sorted(other_keys - locale_key_map[name])

    output = {
        "used_keys": sorted(used_keys),
        "missing_by_locale": missing_by_locale,
        "unused_by_locale": unused_by_locale,
        "parity_missing": parity_missing,
    }

    if args.json:
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
        return 0

    print(f"Scanned {len(source_files)} files")
    print(f"Used keys: {len(used_keys)}")
    for name in locale_names:
        missing = missing_by_locale[name]
        unused = unused_by_locale[name]
        parity = parity_missing[name]
        print(f"\nLocale: {name}")
        print(f"  Missing: {len(missing)}")
        for key in missing[:50]:
            print(f"    - {key}")
        if len(missing) > 50:
            print("    ...")
        print(f"  Unused: {len(unused)}")
        print(f"  Parity missing: {len(parity)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

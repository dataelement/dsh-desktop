#!/usr/bin/env python3
"""Verify the bundled EFund Chinese font asset without third-party packages."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

EXPECTED_SHA256 = "c371bf3656aefdec1a056b461c8c9ef6d1b367105eb6cedcb23ade7687de5e92"
EXPECTED_NAMES = ("华文黑体_易方达", "STHeiti_YFD")


def main() -> int:
    parser = argparse.ArgumentParser(description="检查技能内华文黑体_易方达字体资产。")
    parser.add_argument(
        "font",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "assets" / "fonts" / "STHeiti_YFD.ttf",
    )
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    font = args.font.expanduser().resolve()
    errors: list[str] = []
    if not font.is_file():
        errors.append(f"字体文件不存在：{font}")
        payload = b""
    else:
        payload = font.read_bytes()

    digest = hashlib.sha256(payload).hexdigest() if payload else None
    if digest and digest != EXPECTED_SHA256:
        errors.append(f"SHA-256 不匹配：{digest}")

    signature = payload[:4]
    if payload and signature not in {b"\x00\x01\x00\x00", b"OTTO", b"ttcf"}:
        errors.append(f"不是受支持的 OpenType/TrueType 字体签名：{signature!r}")

    found_names: list[str] = []
    for name in EXPECTED_NAMES:
        encoded_variants = (name.encode("utf-8"), name.encode("utf-16-be"))
        if any(value in payload for value in encoded_variants):
            found_names.append(name)
        else:
            errors.append(f"字体内部未找到名称：{name}")

    report = {
        "font": str(font),
        "bytes": len(payload),
        "sha256": digest,
        "expectedSha256": EXPECTED_SHA256,
        "foundNames": found_names,
        "errorCount": len(errors),
        "errors": errors,
    }
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Font: {font}")
    print(f"SHA-256: {digest or 'missing'}")
    print(f"Names: {', '.join(found_names) or 'none'}")
    print(f"Errors: {len(errors)}")
    for error in errors:
        print(f"[ERROR] {error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

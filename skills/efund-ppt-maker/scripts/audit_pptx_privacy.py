#!/usr/bin/env python3
"""Audit a PPTX and embedded Office packages for identifiable or hidden content."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Any
from urllib.parse import unquote
from xml.etree import ElementTree as ET

EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)")
LOCAL_PATH_RE = re.compile(r"(?i)(?:file:/{0,3})?(?:/Users/|/home/|[A-Z]:[\\/])")
COMMENT_PREFIXES = ("ppt/comments/", "ppt/threadedComments/", "ppt/persons/")
COMMENT_PARTS = {"ppt/commentAuthors.xml", "ppt/authors.xml"}
EMBEDDED_SUFFIXES = {".xlsx", ".xlsm", ".docx", ".pptx"}
SAFE_NOTE_TEXT_RE = re.compile(r"(?:备注已脱敏|\d+(?:[./-]\d+)*)")


def issue(severity: str, code: str, member: str, message: str) -> dict[str, str]:
    return {"severity": severity, "code": code, "member": member, "message": message}


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def xml_text_and_attributes(data: bytes) -> tuple[str, dict[str, list[str]]]:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return "", {}
    texts: list[str] = []
    attrs: dict[str, list[str]] = {}
    for element in root.iter():
        if local_name(element.tag) == "t" and element.text:
            texts.append(element.text)
        for name, value in element.attrib.items():
            attrs.setdefault(local_name(name), []).append(value)
    return "".join(texts), attrs


def inspect_text(
    text: str,
    member: str,
    deny_texts: tuple[str, ...],
    findings: list[dict[str, str]],
) -> None:
    for value in deny_texts:
        if value and value in text:
            findings.append(issue("error", "forbidden-text", member, "发现禁止保留的字面文本"))
    for value in sorted(set(EMAIL_RE.findall(text))):
        if value.lower().startswith(("xxx@", "example@")):
            continue
        findings.append(issue("warning", "possible-email", member, f"可能的邮箱：{value}"))
    for value in sorted(set(PHONE_RE.findall(text))):
        findings.append(issue("warning", "possible-phone", member, f"可能的手机号：{value}"))
    if LOCAL_PATH_RE.search(text):
        findings.append(issue("error", "local-path", member, "发现本机绝对路径"))


def inspect_relationships(
    data: bytes,
    member: str,
    require_no_external_links: bool,
    findings: list[dict[str, str]],
) -> None:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return
    for relationship in root:
        target = unquote(relationship.get("Target") or "")
        if LOCAL_PATH_RE.search(target):
            findings.append(issue("error", "local-relationship", member, "外部关系包含本机路径"))
        if (
            require_no_external_links
            and relationship.get("TargetMode") == "External"
            and target.lower() != "about:blank"
        ):
            findings.append(
                issue("error", "external-relationship", member, f"仍有外部关系：{target}")
            )


def inspect_core_metadata(
    data: bytes,
    member: str,
    findings: list[dict[str, str]],
) -> None:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return
    for element in root.iter():
        if local_name(element.tag) in {"creator", "lastModifiedBy"} and (element.text or "").strip():
            findings.append(
                issue(
                    "error",
                    "editor-metadata",
                    member,
                    f"{local_name(element.tag)} 仍含可识别信息",
                )
            )


def inspect_notes_redaction(
    data: bytes,
    member: str,
    findings: list[dict[str, str]],
) -> None:
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return
    for element in root.iter():
        if local_name(element.tag) != "t":
            continue
        value = (element.text or "").strip()
        if value and not SAFE_NOTE_TEXT_RE.fullmatch(value):
            findings.append(
                issue("error", "unredacted-note-text", member, "备注正文仍含未脱敏文本")
            )
            return


def inspect_package(
    archive: zipfile.ZipFile,
    *,
    label: str,
    deny_texts: tuple[str, ...],
    require_no_notes: bool,
    require_no_comments: bool,
    require_no_thumbnails: bool,
    require_no_external_links: bool,
    require_redacted_notes: bool,
    inspect_embedded: bool,
) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    names = archive.namelist()

    if "docProps/custom.xml" in names:
        findings.append(issue("error", "custom-properties", f"{label}:docProps/custom.xml", "仍有自定义属性"))
    if require_no_notes:
        for name in names:
            if name.startswith(("ppt/notesSlides/", "ppt/notesMasters/")):
                findings.append(issue("error", "notes-part", f"{label}:{name}", "仍有备注或备注母版"))
    if require_no_comments:
        for name in names:
            if name.startswith(COMMENT_PREFIXES) or name in COMMENT_PARTS:
                findings.append(issue("error", "comment-part", f"{label}:{name}", "仍有批注或人员部件"))
    if require_no_thumbnails:
        for name in names:
            if name.startswith("docProps/thumbnail."):
                findings.append(issue("error", "thumbnail-part", f"{label}:{name}", "仍有旧封面缩略图"))

    for name in names:
        member = f"{label}:{name}"
        payload = archive.read(name)
        if name == "docProps/core.xml":
            inspect_core_metadata(payload, member, findings)
        if require_redacted_notes and name.startswith("ppt/notesSlides/") and name.endswith(".xml"):
            inspect_notes_redaction(payload, member, findings)
        if name.endswith(".rels"):
            inspect_relationships(payload, member, require_no_external_links, findings)
        if name.endswith((".xml", ".rels")):
            text, attrs = xml_text_and_attributes(payload)
            inspect_text(text, member, deny_texts, findings)
            for key in ("descr", "title", "name", "Target"):
                for value in attrs.get(key, []):
                    inspect_text(value, member, deny_texts, findings)
            decoded = payload.decode("utf-8", errors="ignore")
            for value in deny_texts:
                if value and value in decoded and value not in text:
                    findings.append(
                        issue("error", "forbidden-text", member, "XML 属性或结构中发现禁止文本")
                    )
        if (
            inspect_embedded
            and name.startswith("ppt/embeddings/")
            and Path(name).suffix.lower() in EMBEDDED_SUFFIXES
        ):
            try:
                with zipfile.ZipFile(io.BytesIO(payload), "r") as nested:
                    findings.extend(
                        inspect_package(
                            nested,
                            label=member,
                            deny_texts=deny_texts,
                            require_no_notes=False,
                            require_no_comments=False,
                            require_no_thumbnails=False,
                            require_no_external_links=require_no_external_links,
                            require_redacted_notes=False,
                            inspect_embedded=False,
                        )
                    )
            except zipfile.BadZipFile:
                findings.append(
                    issue("warning", "unreadable-embedded-package", member, "嵌入对象不是可审计的 Office ZIP")
                )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 PPTX 的个人信息、隐藏内容和外部关系。")
    parser.add_argument("pptx", type=Path)
    parser.add_argument("--deny-text", action="append", default=[])
    parser.add_argument("--require-no-notes", action="store_true")
    parser.add_argument("--require-redacted-notes", action="store_true")
    parser.add_argument("--require-no-comments", action="store_true")
    parser.add_argument("--require-no-thumbnails", action="store_true")
    parser.add_argument("--require-no-external-links", action="store_true")
    parser.add_argument("--warnings-as-errors", action="store_true")
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    pptx = args.pptx.expanduser().resolve()
    try:
        with zipfile.ZipFile(pptx, "r") as archive:
            broken = archive.testzip()
            if broken:
                print(f"Invalid PPTX member: {broken}", file=sys.stderr)
                return 2
            findings = inspect_package(
                archive,
                label=pptx.name,
                deny_texts=tuple(args.deny_text),
                require_no_notes=args.require_no_notes,
                require_no_comments=args.require_no_comments,
                require_no_thumbnails=args.require_no_thumbnails,
                require_no_external_links=args.require_no_external_links,
                require_redacted_notes=args.require_redacted_notes,
                inspect_embedded=True,
            )
    except (OSError, zipfile.BadZipFile) as exc:
        print(f"Cannot inspect PPTX: {exc}", file=sys.stderr)
        return 2

    report: dict[str, Any] = {
        "pptx": str(pptx),
        "errorCount": sum(item["severity"] == "error" for item in findings),
        "warningCount": sum(item["severity"] == "warning" for item in findings),
        "issues": findings,
    }
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Errors: {report['errorCount']}; Warnings: {report['warningCount']}")
    for item in findings:
        print(f"[{item['severity'].upper()}] {item['code']} {item['member']}: {item['message']}")
    failed = report["errorCount"] > 0 or (
        args.warnings_as_errors and report["warningCount"] > 0
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

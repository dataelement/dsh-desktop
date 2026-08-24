#!/usr/bin/env python3
"""Remove editor and toolchain metadata from a PPTX without changing slide content."""

from __future__ import annotations

import argparse
import html
import io
import json
import os
import re
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote
from xml.sax.saxutils import escape as xml_escape


CORE_CLEAR = {
    "creator",
    "lastModifiedBy",
    "description",
    "keywords",
    "category",
    "contentStatus",
    "identifier",
    "language",
    "subject",
}
CORE_REMOVE: set[str] = set()
APP_CLEAR = {"Manager", "HyperlinkBase", "Template", "Company"}
APP_REMOVE: set[str] = set()
APP_ZERO = {"TotalTime"}
LOCAL_TARGET_RE = re.compile(r"^(?:file:|/?[A-Za-z]:[\\/]|/Users/|/home/)", re.I)
LOCAL_PATH_RE = re.compile(r"(?:file:/{0,3})?(?:[A-Za-z]:[\\/]|/Users/|/home/)", re.I)
DESCR_ATTR_RE = re.compile(r'(\bdescr=")([^"]*)(")')
REL_TAG_RE = re.compile(r"<(?:[A-Za-z0-9_.-]+:)?Relationship\b[^>]*?/?>", re.I)
TARGET_ATTR_RE = re.compile(r'(\bTarget\s*=\s*)(["\'])(.*?)(\2)', re.I)
OVERRIDE_TAG_RE = re.compile(r"<(?:[A-Za-z0-9_.-]+:)?Override\b[^>]*?/?>", re.I)
PART_NAME_RE = re.compile(r'\bPartName\s*=\s*["\']([^"\']+)["\']', re.I)
TYPE_ATTR_RE = re.compile(r'\bType\s*=\s*["\']([^"\']+)["\']', re.I)
TEXT_NODE_RE = re.compile(
    r"(<(?:[A-Za-z0-9_.-]+:)?t\b[^>]*>)(.*?)"
    r"(</(?:[A-Za-z0-9_.-]+:)?t>)",
    re.I | re.S,
)


@dataclass(frozen=True)
class SanitizePolicy:
    redactions: tuple[str, ...] = ()
    replacements: tuple[tuple[str, str], ...] = ()
    part_replacements: tuple[tuple[str, bytes], ...] = ()
    clear_notes: bool = False
    remove_notes: bool = False
    remove_comments: bool = False
    remove_thumbnails: bool = False
    neutralize_external_links: bool = False


def replace_element_text(text: str, name: str, replacement: str) -> str:
    pattern = re.compile(
        rf"(<(?:[A-Za-z0-9_.-]+:)?{re.escape(name)}\b[^>]*>).*?"
        rf"(</(?:[A-Za-z0-9_.-]+:)?{re.escape(name)}>)",
        re.I | re.S,
    )
    return pattern.sub(lambda match: f"{match.group(1)}{replacement}{match.group(2)}", text)


def remove_element(text: str, name: str) -> str:
    pattern = re.compile(
        rf"<(?:[A-Za-z0-9_.-]+:)?{re.escape(name)}\b[^>]*?(?:/>|>.*?"
        rf"</(?:[A-Za-z0-9_.-]+:)?{re.escape(name)}>)",
        re.I | re.S,
    )
    return pattern.sub("", text)


def clean_core(data: bytes) -> bytes:
    text = data.decode("utf-8")
    for name in CORE_REMOVE:
        text = remove_element(text, name)
    for name in CORE_CLEAR:
        text = replace_element_text(text, name, "")
    return text.encode("utf-8")


def clean_app(data: bytes, policy: SanitizePolicy) -> bytes:
    text = data.decode("utf-8")
    for name in APP_REMOVE:
        text = remove_element(text, name)
    for name in APP_CLEAR:
        text = replace_element_text(text, name, "")
    for name in APP_ZERO:
        text = replace_element_text(text, name, "0")
    if policy.remove_notes:
        text = replace_element_text(text, "Notes", "0")
    return text.encode("utf-8")


def clean_content_types(data: bytes, policy: SanitizePolicy) -> bytes:
    text = data.decode("utf-8")

    def replace_override(match: re.Match[str]) -> str:
        tag = match.group(0)
        part_match = PART_NAME_RE.search(tag)
        part_name = part_match.group(1) if part_match else ""
        if part_name == "/docProps/custom.xml":
            return ""
        if policy.remove_notes and part_name.startswith(("/ppt/notesSlides/", "/ppt/notesMasters/")):
            return ""
        if policy.remove_comments and (
            part_name.startswith(("/ppt/comments/", "/ppt/threadedComments/", "/ppt/persons/"))
            or part_name in {"/ppt/commentAuthors.xml", "/ppt/authors.xml"}
        ):
            return ""
        if policy.remove_thumbnails and part_name.startswith("/docProps/thumbnail."):
            return ""
        return tag

    cleaned = OVERRIDE_TAG_RE.sub(replace_override, text)
    return cleaned.encode("utf-8")


def clean_relationships(
    data: bytes,
    policy: SanitizePolicy,
    *,
    remove_custom: bool = False,
) -> bytes:
    text = data.decode("utf-8")

    def replace_relationship(match: re.Match[str]) -> str:
        tag = match.group(0)
        if remove_custom and ("docProps/custom.xml" in tag or "/custom-properties" in tag):
            return ""
        type_match = TYPE_ATTR_RE.search(tag)
        rel_type = type_match.group(1).rsplit("/", 1)[-1].lower() if type_match else ""
        if policy.remove_notes and rel_type in {"notesslide", "notesmaster"}:
            return ""
        if policy.remove_comments and rel_type in {
            "comments",
            "commentauthors",
            "threadedcomment",
            "person",
        }:
            return ""
        if policy.remove_thumbnails and rel_type == "thumbnail":
            return ""
        if not re.search(r'\bTargetMode\s*=\s*["\']External["\']', tag, re.I):
            return tag
        target_match = TARGET_ATTR_RE.search(tag)
        if not target_match:
            return tag
        if not policy.neutralize_external_links and not LOCAL_TARGET_RE.search(
            unquote(target_match.group(3))
        ):
            return tag
        return TARGET_ATTR_RE.sub(
            lambda item: f"{item.group(1)}{item.group(2)}about:blank{item.group(4)}",
            tag,
            count=1,
        )

    cleaned = REL_TAG_RE.sub(replace_relationship, text)
    return cleaned.encode("utf-8")


def clean_nonvisual_attributes(data: bytes) -> bytes:
    text = data.decode("utf-8")

    def replace(match: re.Match[str]) -> str:
        value = match.group(2)
        if not LOCAL_PATH_RE.search(value):
            return match.group(0)
        neutral = value.replace("\\", "/").rstrip("/").rsplit("/", 1)[-1]
        return f"{match.group(1)}{neutral}{match.group(3)}"

    cleaned = DESCR_ATTR_RE.sub(replace, text)
    return cleaned.encode("utf-8") if cleaned != text else data


def clear_notes_body(data: bytes) -> bytes:
    """Keep the notes package structure but replace body text with a neutral marker."""
    text = data.decode("utf-8")
    shape_pattern = re.compile(
        r"(<(?:[A-Za-z0-9_.-]+:)?sp\b[^>]*>.*?"
        r"</(?:[A-Za-z0-9_.-]+:)?sp>)",
        re.I | re.S,
    )
    body_placeholder = re.compile(
        r"<(?:[A-Za-z0-9_.-]+:)?ph\b[^>]*\btype\s*=\s*[\"']body[\"']",
        re.I,
    )
    text_node = re.compile(
        r"(<(?:[A-Za-z0-9_.-]+:)?t\b[^>]*>).*?"
        r"(</(?:[A-Za-z0-9_.-]+:)?t>)",
        re.I | re.S,
    )

    def replace_shape(match: re.Match[str]) -> str:
        shape = match.group(1)
        if not body_placeholder.search(shape):
            return shape
        first = True

        def replace_text(item: re.Match[str]) -> str:
            nonlocal first
            replacement = "备注已脱敏" if first else ""
            first = False
            return f"{item.group(1)}{replacement}{item.group(2)}"

        return text_node.sub(replace_text, shape)

    cleaned = shape_pattern.sub(replace_shape, text)
    return cleaned.encode("utf-8") if cleaned != text else data


def redact_literals(
    data: bytes,
    redactions: tuple[str, ...],
    replacements: tuple[tuple[str, str], ...] = (),
) -> bytes:
    cleaned = data
    for source, replacement in replacements:
        if source:
            cleaned = cleaned.replace(source.encode("utf-8"), replacement.encode("utf-8"))
    for value in redactions:
        if value:
            cleaned = cleaned.replace(value.encode("utf-8"), b"")
    try:
        text = cleaned.decode("utf-8")
    except UnicodeDecodeError:
        return cleaned
    for source, replacement in replacements:
        if source:
            text = replace_across_text_nodes(text, source, replacement)
    for value in redactions:
        if value:
            text = replace_across_text_nodes(text, value, "")
    return text.encode("utf-8")


def replace_across_text_nodes(text: str, source: str, replacement: str) -> str:
    """Replace a phrase even when PowerPoint splits it across several a:t runs."""
    while True:
        matches = list(TEXT_NODE_RE.finditer(text))
        if not matches:
            return text
        values = [html.unescape(match.group(2)) for match in matches]
        offsets: list[int] = []
        total = 0
        for value in values:
            offsets.append(total)
            total += len(value)
        joined = "".join(values)
        start = joined.find(source)
        if start < 0:
            return text
        end = start + len(source)
        first_index = next(
            index
            for index, (offset, value) in enumerate(zip(offsets, values))
            if offset + len(value) > start
        )
        last_index = next(
            index
            for index in range(first_index, len(values))
            if offsets[index] + len(values[index]) >= end
        )
        replacements_by_index: dict[int, str] = {}
        first_value = values[first_index]
        first_local = start - offsets[first_index]
        if first_index == last_index:
            last_local = end - offsets[last_index]
            replacements_by_index[first_index] = (
                first_value[:first_local] + replacement + first_value[last_local:]
            )
        else:
            replacements_by_index[first_index] = first_value[:first_local] + replacement
            for index in range(first_index + 1, last_index):
                replacements_by_index[index] = ""
            last_local = end - offsets[last_index]
            replacements_by_index[last_index] = values[last_index][last_local:]
        for index in range(last_index, first_index - 1, -1):
            match = matches[index]
            value = xml_escape(replacements_by_index[index])
            text = text[: match.start(2)] + value + text[match.end(2) :]


def clean_presentation(data: bytes, policy: SanitizePolicy) -> bytes:
    text = data.decode("utf-8")
    if policy.remove_notes:
        text = remove_element(text, "notesMasterIdLst")
    return text.encode("utf-8")


def clean_embedded_office_package(data: bytes, policy: SanitizePolicy) -> bytes:
    source_buffer = io.BytesIO(data)
    output_buffer = io.BytesIO()
    try:
        with zipfile.ZipFile(source_buffer, "r") as src, zipfile.ZipFile(output_buffer, "w") as dst:
            for info in src.infolist():
                name = info.filename
                payload = src.read(name)
                if name == "docProps/custom.xml":
                    cleaned = None
                elif name == "docProps/core.xml":
                    cleaned = clean_core(payload)
                elif name == "docProps/app.xml":
                    cleaned = clean_app(payload, policy)
                elif name == "[Content_Types].xml":
                    cleaned = clean_content_types(payload, policy)
                elif name.endswith(".rels"):
                    cleaned = clean_relationships(
                        payload,
                        policy,
                        remove_custom=name == "_rels/.rels",
                    )
                elif name.endswith(".xml"):
                    cleaned = clean_nonvisual_attributes(payload)
                else:
                    cleaned = payload
                if cleaned is not None:
                    if name.endswith((".xml", ".rels")):
                        cleaned = redact_literals(
                            cleaned,
                            policy.redactions,
                            policy.replacements,
                        )
                    dst.writestr(info, cleaned)
        return output_buffer.getvalue()
    except zipfile.BadZipFile:
        return data


def transform_member(name: str, data: bytes, policy: SanitizePolicy) -> bytes | None:
    if policy.remove_notes and name.startswith(("ppt/notesSlides/", "ppt/notesMasters/")):
        return None
    if policy.remove_comments and (
        name.startswith(("ppt/comments/", "ppt/threadedComments/", "ppt/persons/"))
        or name in {"ppt/commentAuthors.xml", "ppt/authors.xml"}
    ):
        return None
    if policy.remove_thumbnails and name.startswith("docProps/thumbnail."):
        return None
    if name == "docProps/custom.xml":
        return None
    if name == "docProps/core.xml":
        cleaned = clean_core(data)
    elif name == "docProps/app.xml":
        cleaned = clean_app(data, policy)
    elif name == "[Content_Types].xml":
        cleaned = clean_content_types(data, policy)
    elif name == "ppt/presentation.xml":
        cleaned = clean_presentation(data, policy)
    elif policy.clear_notes and name.startswith("ppt/notesSlides/") and name.endswith(".xml"):
        cleaned = clear_notes_body(data)
    elif name.startswith("ppt/embeddings/") and Path(name).suffix.lower() in {
        ".xlsx",
        ".xlsm",
        ".docx",
        ".pptx",
    }:
        cleaned = clean_embedded_office_package(data, policy)
    elif name.endswith(".rels"):
        cleaned = clean_relationships(data, policy, remove_custom=name == "_rels/.rels")
    elif name.endswith(".xml"):
        cleaned = clean_nonvisual_attributes(data)
    else:
        cleaned = data
    if name.endswith((".xml", ".rels")):
        cleaned = redact_literals(cleaned, policy.redactions, policy.replacements)
    return cleaned


def sanitize(source: Path, output: Path, policy: SanitizePolicy | None = None) -> None:
    source = source.expanduser().resolve()
    output = output.expanduser().resolve()
    policy = policy or SanitizePolicy()
    if not source.is_file():
        raise FileNotFoundError(source)
    if source.suffix.lower() != ".pptx" or output.suffix.lower() != ".pptx":
        raise ValueError("输入和输出都必须使用 .pptx 扩展名")

    output.parent.mkdir(parents=True, exist_ok=True)
    source_mode = source.stat().st_mode & 0o777
    fd, temp_name = tempfile.mkstemp(prefix="pptx-clean-", suffix=".pptx", dir=output.parent)
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        replacement_parts = dict(policy.part_replacements)
        with zipfile.ZipFile(source, "r") as src, zipfile.ZipFile(temp_path, "w") as dst:
            for info in src.infolist():
                if info.filename in replacement_parts:
                    cleaned = replacement_parts[info.filename]
                else:
                    cleaned = transform_member(info.filename, src.read(info.filename), policy)
                if cleaned is not None:
                    dst.writestr(info, cleaned)
        with zipfile.ZipFile(temp_path, "r") as check:
            if "ppt/presentation.xml" not in check.namelist():
                raise ValueError("输出不是有效的 PowerPoint 包")
            broken = check.testzip()
            if broken:
                raise ValueError(f"输出包校验失败：{broken}")
        os.chmod(temp_path, source_mode)
        os.replace(temp_path, output)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description="清理 PPTX 中的编辑者与工具链元数据。")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--redact-text", action="append", default=[], help="从 XML 文本中删除指定字面值")
    parser.add_argument("--replace-map", type=Path, help="JSON 对象：将 XML 中的键替换为对应字符串值")
    parser.add_argument(
        "--replace-part",
        action="append",
        default=[],
        metavar="PACKAGE_MEMBER=FILE",
        help="用本地文件永久替换指定 PPTX 包部件",
    )
    parser.add_argument("--remove-notes", action="store_true", help="删除演讲者备注与备注母版")
    parser.add_argument(
        "--clear-notes",
        action="store_true",
        help="保留备注结构，但将备注正文替换为“备注已脱敏”（兼容性优先）",
    )
    parser.add_argument("--remove-comments", action="store_true", help="删除批注、批注作者和人员部件")
    parser.add_argument("--remove-thumbnails", action="store_true", help="删除可能缓存旧封面的文档缩略图")
    parser.add_argument(
        "--neutralize-external-links",
        action="store_true",
        help="将所有外部关系目标替换为 about:blank",
    )
    args = parser.parse_args()
    replacements: tuple[tuple[str, str], ...] = ()
    if args.replace_map:
        raw = json.loads(args.replace_map.expanduser().read_text(encoding="utf-8"))
        if not isinstance(raw, dict) or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in raw.items()
        ):
            raise ValueError("--replace-map 必须是字符串到字符串的 JSON 对象")
        replacements = tuple(raw.items())
    part_replacements: list[tuple[str, bytes]] = []
    for spec in args.replace_part:
        member, separator, file_name = spec.partition("=")
        if not separator or not member or not file_name:
            raise ValueError("--replace-part 格式必须为 PACKAGE_MEMBER=FILE")
        part_replacements.append(
            (member, Path(file_name).expanduser().resolve().read_bytes())
        )
    policy = SanitizePolicy(
        redactions=tuple(args.redact_text),
        replacements=replacements,
        part_replacements=tuple(part_replacements),
        clear_notes=args.clear_notes,
        remove_notes=args.remove_notes,
        remove_comments=args.remove_comments,
        remove_thumbnails=args.remove_thumbnails,
        neutralize_external_links=args.neutralize_external_links,
    )
    sanitize(args.source, args.output, policy)
    print(args.output.expanduser().resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

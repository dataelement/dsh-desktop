#!/usr/bin/env python3
"""Check inherited and newly added text-shape font sizes in an E Fund PPTX."""

from __future__ import annotations

import argparse
import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
from zipfile import BadZipFile, ZipFile

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"p": P_NS, "a": A_NS, "r": R_NS}
INHERITED_ACTIONS = {"rewrite", "rewrite-and-reposition"}
ROLE_SIZE_LADDERS = {
    "page-title": {23.0},
    "slide-title": {23.0},
    "big-conclusion": {18.0},
    "module-title": {14.0, 16.0},
    "module-lead": {14.0, 16.0},
    "lead": {14.0, 16.0},
    "body": {10.0, 11.0, 12.0},
    "annotation": {7.0, 8.0, 9.0},
    "source-note": {7.0, 8.0, 9.0},
    "caption": {7.0, 8.0, 9.0},
    "footer": {7.0, 8.0, 9.0},
    "metric": {20.0, 24.0, 28.0, 32.0, 36.0, 44.0},
    "metric-number": {20.0, 24.0, 28.0, 32.0, 36.0, 44.0},
    "thanks": {float(size) for size in range(45, 55)},
}


def parse_xml(data: bytes, source: str) -> ET.Element:
    try:
        return ET.fromstring(data)
    except ET.ParseError as exc:
        raise ValueError(f"{source} XML 无法解析：{exc}") from exc


def logical_slide_part(archive: ZipFile, slide_number: int) -> str:
    presentation_part = "ppt/presentation.xml"
    relationships_part = "ppt/_rels/presentation.xml.rels"
    if presentation_part not in archive.namelist():
        raise ValueError(f"找不到演示文稿部件：{presentation_part}")
    if relationships_part not in archive.namelist():
        raise ValueError(f"找不到演示文稿关系：{relationships_part}")

    presentation = parse_xml(archive.read(presentation_part), presentation_part)
    slide_ids = presentation.findall("./p:sldIdLst/p:sldId", NS)
    if slide_number < 1 or slide_number > len(slide_ids):
        raise ValueError(
            f"逻辑页码超出范围：{slide_number}；文稿共 {len(slide_ids)} 页"
        )
    relationship_id = slide_ids[slide_number - 1].get(f"{{{R_NS}}}id")
    if not relationship_id:
        raise ValueError(f"逻辑第 {slide_number} 页缺少关系 ID")

    relationships = parse_xml(
        archive.read(relationships_part), relationships_part
    )
    targets = {
        relationship.get("Id"): relationship.get("Target")
        for relationship in relationships.findall(f"{{{PKG_REL_NS}}}Relationship")
    }
    target = targets.get(relationship_id)
    if not target:
        raise ValueError(
            f"逻辑第 {slide_number} 页的关系 {relationship_id} 没有内部目标"
        )
    part = (
        target.lstrip("/")
        if target.startswith("/")
        else posixpath.normpath(posixpath.join("ppt", target))
    )
    if part not in archive.namelist():
        raise ValueError(f"逻辑第 {slide_number} 页对应部件不存在：{part}")
    return part


def shape_records(archive: ZipFile, slide_number: int) -> dict[str, dict[str, Any]]:
    part = logical_slide_part(archive, slide_number)
    root = parse_xml(archive.read(part), part)
    records: dict[str, dict[str, Any]] = {}
    for shape in root.findall(".//p:sp", NS):
        non_visual = shape.find("./p:nvSpPr/p:cNvPr", NS)
        if non_visual is None or not non_visual.get("id"):
            continue
        shape_id = str(non_visual.get("id"))
        text = "".join(node.text or "" for node in shape.findall(".//a:t", NS)).strip()
        sizes: set[float] = set()
        unresolved_runs = 0
        visible_runs = 0
        for paragraph in shape.findall(".//a:p", NS):
            default_properties = paragraph.find("./a:pPr/a:defRPr", NS)
            default_size = (
                default_properties.get("sz") if default_properties is not None else None
            )
            runs = list(paragraph.findall("./a:r", NS)) + list(
                paragraph.findall("./a:fld", NS)
            )
            for run in runs:
                run_text = "".join(
                    node.text or "" for node in run.findall(".//a:t", NS)
                )
                if not run_text.strip():
                    continue
                visible_runs += 1
                properties = run.find("./a:rPr", NS)
                raw_size = (
                    properties.get("sz")
                    if properties is not None and properties.get("sz")
                    else default_size
                )
                if raw_size and raw_size.isdigit():
                    sizes.add(round(int(raw_size) / 100, 1))
                else:
                    unresolved_runs += 1
        records[shape_id] = {
            "name": non_visual.get("name"),
            "text": text,
            "sizes": sorted(sizes),
            "visibleRuns": visible_runs,
            "unresolvedRuns": unresolved_runs,
        }
    return records


def list_values(value: object) -> list[object]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def id_values(target: dict[str, Any], plural: str, singular: str) -> list[str]:
    values = list_values(target.get(plural))
    if target.get(singular) is not None:
        values.append(target[singular])
    return [str(value) for value in values if value is not None]


def number_list(value: object) -> list[float]:
    numbers: list[float] = []
    for item in list_values(value):
        if isinstance(item, bool):
            raise ValueError(f"无效字号：{item!r}")
        try:
            number = round(float(item), 1)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"无效字号：{item!r}") from exc
        if number <= 0:
            raise ValueError(f"字号必须大于 0：{item!r}")
        numbers.append(number)
    return sorted(set(numbers))


def parse_allow(values: list[str]) -> set[tuple[int, str]]:
    allowed: set[tuple[int, str]] = set()
    for value in values:
        match = re.fullmatch(r"(\d+):(.+)", value)
        if not match:
            raise ValueError(f"无效 --allow：{value!r}；应为 输出页码:ShapeID")
        allowed.add((int(match.group(1)), match.group(2)))
    return allowed


def target_source_ids(target: dict[str, Any]) -> list[str]:
    explicit = id_values(target, "sourceShapeIds", "sourceShapeId")
    return explicit or id_values(target, "shapeIds", "shapeId")


def target_final_ids(target: dict[str, Any]) -> list[str]:
    return id_values(target, "finalShapeIds", "finalShapeId")


def issue(
    severity: str,
    code: str,
    message: str,
    output_slide: int,
    shape_id: str | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "severity": severity,
        "code": code,
        "message": message,
        "outputSlide": output_slide,
    }
    if shape_id is not None:
        result["shapeId"] = shape_id
    return result


def compare(
    source_pptx: Path | None,
    final_pptx: Path,
    map_path: Path,
    allowed: set[tuple[int, str]],
) -> dict[str, Any]:
    frame_map = json.loads(map_path.read_text(encoding="utf-8"))
    entries = frame_map.get("outputSlides")
    if not isinstance(entries, list):
        raise ValueError("template-frame-map.json 缺少 outputSlides 数组")

    issues: list[dict[str, Any]] = []
    checked_inherited = 0
    checked_added = 0
    needs_source = any(
        entry.get("sourceSlide") is not None
        and any(
            target.get("action") in INHERITED_ACTIONS
            for target in entry.get("editTargets", [])
        )
        for entry in entries
    )
    if needs_source and source_pptx is None:
        raise ValueError("映射包含继承文本对象，必须提供 --source-pptx")

    source_archive = ZipFile(source_pptx) if source_pptx is not None else None
    try:
        with ZipFile(final_pptx) as final_archive:
            for entry in entries:
                output_slide = int(entry["outputSlide"])
                source_slide_value = entry.get("sourceSlide")
                source_slide = (
                    int(source_slide_value) if source_slide_value is not None else None
                )
                final_shapes = shape_records(final_archive, output_slide)
                source_shapes = (
                    shape_records(source_archive, source_slide)
                    if source_archive is not None and source_slide is not None
                    else {}
                )

                for target in entry.get("editTargets", []):
                    action = target.get("action")
                    if action in INHERITED_ACTIONS:
                        source_ids = target_source_ids(target)
                        final_ids = target_final_ids(target)
                        if not source_ids:
                            issues.append(
                                issue(
                                    "warning",
                                    "missing-source-shape-id",
                                    "继承文本目标未声明源 Shape ID",
                                    output_slide,
                                )
                            )
                            continue
                        if final_ids and len(final_ids) != len(source_ids):
                            issues.append(
                                issue(
                                    "warning",
                                    "shape-id-count-mismatch",
                                    "源/成品 Shape ID 数量不一致",
                                    output_slide,
                                )
                            )
                            continue
                        pairs = zip(source_ids, final_ids or source_ids)
                        for source_id, final_id in pairs:
                            source_shape = source_shapes.get(source_id)
                            final_shape = final_shapes.get(final_id)
                            if source_shape is None or final_shape is None:
                                missing = "源" if source_shape is None else "成品"
                                issues.append(
                                    issue(
                                        "warning",
                                        "shape-not-found",
                                        f"{missing}文本 Shape 未找到：{source_id if source_shape is None else final_id}",
                                        output_slide,
                                        final_id,
                                    )
                                )
                                continue
                            if not source_shape["text"]:
                                continue
                            checked_inherited += 1
                            if (
                                source_shape["unresolvedRuns"]
                                or final_shape["unresolvedRuns"]
                            ):
                                issues.append(
                                    issue(
                                        "warning",
                                        "unresolved-font-size",
                                        "继承文本存在未显式解析的 run 字号，须结合布局导出人工确认",
                                        output_slide,
                                        final_id,
                                    )
                                )
                            if source_shape["sizes"] == final_shape["sizes"]:
                                continue
                            if (output_slide, final_id) in allowed:
                                continue
                            issues.append(
                                issue(
                                    "error",
                                    "inherited-font-size-mismatch",
                                    f"继承字号 {source_shape['sizes']}pt → {final_shape['sizes']}pt；{final_shape['text'][:60]}",
                                    output_slide,
                                    final_id,
                                )
                            )

                    if action != "add":
                        continue
                    role = str(target.get("textRole") or "").strip()
                    final_ids = target_final_ids(target)
                    if not final_ids:
                        issues.append(
                            issue(
                                "warning",
                                "missing-final-shape-id",
                                "原创文本目标未声明 finalShapeIds",
                                output_slide,
                            )
                        )
                        continue
                    if target.get("checkTypography") is False or role.startswith(
                        "non-text"
                    ):
                        for final_id in final_ids:
                            final_shape = final_shapes.get(final_id)
                            if final_shape is not None and final_shape["text"]:
                                issues.append(
                                    issue(
                                        "error",
                                        "non-text-target-has-text",
                                        "声明为非文本的新增对象含有可见文字",
                                        output_slide,
                                        final_id,
                                    )
                                )
                        continue
                    expected = number_list(
                        target.get("expectedFontSizesPt", target.get("fontSizePt"))
                    )
                    allowed_sizes = number_list(target.get("allowedFontSizesPt"))
                    if not expected and not allowed_sizes:
                        issues.append(
                            issue(
                                "warning",
                                "missing-font-size-contract",
                                f"原创文本目标未声明允许字号；角色={role or '未声明'}",
                                output_slide,
                            )
                        )
                        continue
                    declared_contract = expected or allowed_sizes
                    role_ladder = ROLE_SIZE_LADDERS.get(role)
                    if role_ladder is not None and any(
                        size not in role_ladder for size in declared_contract
                    ):
                        issues.append(
                            issue(
                                "error",
                                "font-contract-outside-role-ladder",
                                f"角色 {role} 声明字号 {declared_contract}pt，超出全局阶梯 {sorted(role_ladder)}pt",
                                output_slide,
                            )
                        )
                    for final_id in final_ids:
                        final_shape = final_shapes.get(final_id)
                        if final_shape is None:
                            if (output_slide, final_id) in allowed:
                                continue
                            issues.append(
                                issue(
                                    "error",
                                    "new-shape-not-found",
                                    "找不到声明的原创文本 Shape",
                                    output_slide,
                                    final_id,
                                )
                            )
                            continue
                        if not final_shape["text"]:
                            issues.append(
                                issue(
                                    "warning",
                                    "new-shape-has-no-text",
                                    "声明的原创文本 Shape 没有可见文字",
                                    output_slide,
                                    final_id,
                                )
                            )
                            continue
                        checked_added += 1
                        actual = final_shape["sizes"]
                        matches = bool(actual) and (
                            actual == expected
                            if expected
                            else all(size in allowed_sizes for size in actual)
                        )
                        if final_shape["unresolvedRuns"]:
                            matches = False
                        if matches or (output_slide, final_id) in allowed:
                            continue
                        contract = declared_contract
                        issues.append(
                            issue(
                                "error",
                                "new-font-size-outside-contract",
                                f"原创字号 {actual}pt 不符合 {contract}pt；角色={role or '未声明'}；{final_shape['text'][:60]}",
                                output_slide,
                                final_id,
                            )
                        )
    finally:
        if source_archive is not None:
            source_archive.close()

    return {
        "sourcePptx": str(source_pptx.resolve()) if source_pptx else None,
        "finalPptx": str(final_pptx.resolve()),
        "map": str(map_path.resolve()),
        "checkedInheritedTextShapes": checked_inherited,
        "checkedAddedTextShapes": checked_added,
        "errorCount": sum(item["severity"] == "error" for item in issues),
        "warningCount": sum(item["severity"] == "warning" for item in issues),
        "issues": issues,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="检查易方达 PPT 继承与原创文本的字号保真。")
    parser.add_argument("--source-pptx", type=Path)
    parser.add_argument("--final-pptx", required=True, type=Path)
    parser.add_argument("--map", required=True, dest="map_path", type=Path)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument(
        "--allow",
        action="append",
        default=[],
        metavar="OUTPUT_SLIDE:SHAPE_ID",
        help="逐 Shape 放行一个有明确理由的字号差异",
    )
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--warnings-as-errors", action="store_true")
    args = parser.parse_args()

    for path in (args.final_pptx, args.map_path):
        if not path.is_file():
            parser.error(f"文件不存在：{path}")
    if args.source_pptx is not None and not args.source_pptx.is_file():
        parser.error(f"文件不存在：{args.source_pptx}")

    try:
        report = compare(
            args.source_pptx.expanduser().resolve() if args.source_pptx else None,
            args.final_pptx.expanduser().resolve(),
            args.map_path.expanduser().resolve(),
            parse_allow(args.allow),
        )
    except (BadZipFile, KeyError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    print(
        "Text shapes checked: "
        f"inherited={report['checkedInheritedTextShapes']}; "
        f"added={report['checkedAddedTextShapes']}"
    )
    print(f"Errors: {report['errorCount']}; Warnings: {report['warningCount']}")
    for item in report["issues"]:
        shape = f" shape={item['shapeId']}" if "shapeId" in item else ""
        print(
            f"[{item['severity'].upper()}] {item['code']} "
            f"slide={item['outputSlide']}{shape}: {item['message']}"
        )

    failed = (args.strict and report["errorCount"] > 0) or (
        args.warnings_as_errors and report["warningCount"] > 0
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

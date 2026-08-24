#!/usr/bin/env python3
"""Verify an E Fund cover against an exact built-in or user-supplied reference."""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PR = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"p": P, "a": A, "r": R}
EMU_TOLERANCE = 0
FONT_TOLERANCE_PT = 0.01

PROFILES = {
    "v6-cn-simple": ("efund-template-v6.pptx", 2),
    "v6-cn-subtitle": ("efund-template-v6.pptx", 3),
    "v6-bilingual": ("efund-template-v6.pptx", 4),
    "v6-english": ("efund-template-v6.pptx", 5),
    "v6-co-brand": ("efund-template-v6.pptx", 6),
    "ai-tech-internal": ("efund-ai-platform-v21.pptx", 1),
}

REQUIRED_COVER_PICTURES = {profile: "6" for profile in PROFILES}


@dataclass
class PackageView:
    path: Path
    archive: zipfile.ZipFile
    canvas: tuple[int, int]
    theme_fonts: dict[str, str]
    default_font_size: float


def issue(code: str, message: str, scope: str = "cover") -> dict[str, str]:
    return {"severity": "error", "code": code, "scope": scope, "message": message}


def xml_root(package: PackageView, part: str) -> ET.Element:
    return ET.fromstring(package.archive.read(part))


def rels_part(part: str) -> str:
    folder, name = posixpath.split(part)
    return posixpath.join(folder, "_rels", f"{name}.rels")


def relationships(package: PackageView, part: str) -> dict[str, tuple[str, str]]:
    rel_part = rels_part(part)
    if rel_part not in package.archive.namelist():
        return {}
    root = xml_root(package, rel_part)
    result: dict[str, tuple[str, str]] = {}
    for rel in root.findall(f"{{{PR}}}Relationship"):
        rel_id = rel.get("Id")
        target = rel.get("Target")
        if not rel_id or not target:
            continue
        result[rel_id] = (target, rel.get("TargetMode") or "Internal")
    return result


def resolve_target(part: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(part), target))


def presentation_metadata(archive: zipfile.ZipFile) -> tuple[tuple[int, int], float]:
    root = ET.fromstring(archive.read("ppt/presentation.xml"))
    size = root.find("p:sldSz", NS)
    if size is None:
        raise ValueError("ppt/presentation.xml 缺少 p:sldSz")
    canvas = (int(size.get("cx") or 0), int(size.get("cy") or 0))
    default_size = 18.0
    default_rpr = root.find(".//p:defaultTextStyle/a:lvl1pPr/a:defRPr", NS)
    if default_rpr is not None and default_rpr.get("sz"):
        default_size = int(default_rpr.get("sz") or 1800) / 100
    return canvas, default_size


def theme_fonts(archive: zipfile.ZipFile) -> dict[str, str]:
    candidates = sorted(name for name in archive.namelist() if name.startswith("ppt/theme/theme"))
    result = {
        "+mj-lt": "Arial",
        "+mn-lt": "Arial",
        "+mj-ea": "华文黑体_易方达",
        "+mn-ea": "华文黑体_易方达",
    }
    if not candidates:
        return result
    root = ET.fromstring(archive.read(candidates[0]))
    for token, path in {
        "+mj-lt": ".//a:fontScheme/a:majorFont/a:latin",
        "+mj-ea": ".//a:fontScheme/a:majorFont/a:ea",
        "+mn-lt": ".//a:fontScheme/a:minorFont/a:latin",
        "+mn-ea": ".//a:fontScheme/a:minorFont/a:ea",
    }.items():
        node = root.find(path, NS)
        if node is not None and node.get("typeface"):
            result[token] = str(node.get("typeface"))
    return result


def open_package(path: Path) -> PackageView:
    archive = zipfile.ZipFile(path)
    canvas, default_size = presentation_metadata(archive)
    return PackageView(path, archive, canvas, theme_fonts(archive), default_size)


def logical_slide_part(package: PackageView, number: int) -> str:
    if number < 1:
        raise ValueError("页码必须为 1-based 正整数")
    root = xml_root(package, "ppt/presentation.xml")
    slide_ids = root.findall("./p:sldIdLst/p:sldId", NS)
    if number > len(slide_ids):
        raise ValueError(f"文件不存在第 {number} 个逻辑页")
    rel_id = slide_ids[number - 1].get(f"{{{R}}}id")
    target = relationships(package, "ppt/presentation.xml").get(str(rel_id))
    if not target or target[1] != "Internal":
        raise ValueError(f"无法解析第 {number} 个逻辑页")
    return resolve_target("ppt/presentation.xml", target[0])


def linked_layout_part(package: PackageView, part: str) -> str:
    rels = relationships(package, part)
    for target, mode in rels.values():
        if mode == "Internal" and "slideLayout" in target:
            return resolve_target(part, target)
    raise ValueError(f"{part} 没有 slideLayout 关系")


def object_id(element: ET.Element) -> str | None:
    node = element.find(".//p:cNvPr", NS)
    return node.get("id") if node is not None else None


def element_kind(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def element_geometry(element: ET.Element) -> tuple[int, int, int, int] | None:
    xfrm = element.find("./p:spPr/a:xfrm", NS)
    if xfrm is None:
        xfrm = element.find("./p:grpSpPr/a:xfrm", NS)
    if xfrm is not None:
        off = xfrm.find("a:off", NS)
        ext = xfrm.find("a:ext", NS)
    else:
        xfrm = element.find("./p:xfrm", NS)
        if xfrm is None:
            return None
        off = xfrm.find("a:off", NS)
        ext = xfrm.find("a:ext", NS)
    if off is None or ext is None:
        return None
    return (
        int(off.get("x") or 0),
        int(off.get("y") or 0),
        int(ext.get("cx") or 0),
        int(ext.get("cy") or 0),
    )


def on_canvas(box: tuple[int, int, int, int], canvas: tuple[int, int]) -> bool:
    x, y, width, height = box
    return x < canvas[0] and y < canvas[1] and x + width > 0 and y + height > 0


def shape_tree_objects(root: ET.Element, canvas: tuple[int, int]) -> dict[str, ET.Element]:
    tree = root.find(".//p:spTree", NS)
    if tree is None:
        return {}
    result: dict[str, ET.Element] = {}
    for element in list(tree):
        if element_kind(element) not in {"sp", "pic", "graphicFrame", "cxnSp", "grpSp"}:
            continue
        identifier = object_id(element)
        geometry = element_geometry(element)
        if identifier and geometry and on_canvas(geometry, canvas):
            result[identifier] = element
    return result


def normalize_font(package: PackageView, value: str | None, east_asian: bool) -> str:
    fallback = "+mj-ea" if east_asian else "+mj-lt"
    chosen = value or fallback
    chosen = package.theme_fonts.get(chosen, chosen)
    return chosen.strip().casefold()


def is_east_asian(text: str) -> bool:
    return any("\u2e80" <= char <= "\u9fff" for char in text)


def inherited_rpr(paragraph: ET.Element) -> ET.Element | None:
    value = paragraph.find("./a:pPr/a:defRPr", NS)
    return value if value is not None else paragraph.find("./a:endParaRPr", NS)


def xml_signature(
    element: ET.Element | None,
    ignored_attributes: set[str] | None = None,
) -> tuple[Any, ...] | None:
    if element is None:
        return None
    ignored = ignored_attributes or set()
    tag = element.tag.rsplit("}", 1)[-1]
    attributes = tuple(
        sorted((name, value) for name, value in element.attrib.items() if name not in ignored)
    )
    children = tuple(xml_signature(child, ignored) for child in list(element))
    return tag, attributes, children


def run_style(
    package: PackageView,
    run: ET.Element,
    paragraph: ET.Element,
) -> tuple[float, str, str, bool, bool]:
    text_node = run.find("./a:t", NS)
    text = text_node.text if text_node is not None and text_node.text else ""
    rpr = run.find("./a:rPr", NS)
    if rpr is None:
        rpr = inherited_rpr(paragraph)
    size = package.default_font_size
    bold = False
    italic = False
    latin: str | None = None
    east: str | None = None
    text_color = ""
    if rpr is not None:
        if rpr.get("sz"):
            size = int(rpr.get("sz") or 0) / 100
        bold = rpr.get("b") in {"1", "true"}
        italic = rpr.get("i") in {"1", "true"}
        latin_node = rpr.find("a:latin", NS)
        east_node = rpr.find("a:ea", NS)
        latin = latin_node.get("typeface") if latin_node is not None else None
        east = east_node.get("typeface") if east_node is not None else None
        text_color = repr(xml_signature(rpr.find("./a:solidFill", NS)))
    return (
        size,
        normalize_font(package, latin, False),
        normalize_font(package, east, True),
        bold,
        italic,
        text_color,
    )


def paragraph_signature(package: PackageView, paragraph: ET.Element) -> dict[str, Any]:
    text = "".join(node.text or "" for node in paragraph.findall(".//a:t", NS))
    runs = paragraph.findall("./a:r", NS) + paragraph.findall("./a:fld", NS)
    styles = {run_style(package, run, paragraph) for run in runs}
    if not styles:
        pseudo = ET.Element(f"{{{A}}}r")
        styles = {run_style(package, pseudo, paragraph)}
    ppr = paragraph.find("./a:pPr", NS)
    return {
        "hasEastAsianText": is_east_asian(text),
        "styles": sorted(styles),
        "alignment": ppr.get("algn") if ppr is not None else None,
        "level": ppr.get("lvl") if ppr is not None else None,
        "paragraphFormat": repr(xml_signature(ppr)),
    }


def body_signature(package: PackageView, element: ET.Element) -> dict[str, Any] | None:
    body = element.find("./p:txBody", NS)
    if body is None:
        return None
    paragraphs = body.findall("./a:p", NS)
    body_pr = body.find("./a:bodyPr", NS)
    return {
        "paragraphCount": len(paragraphs),
        "paragraphs": [paragraph_signature(package, paragraph) for paragraph in paragraphs],
        "bodyPr": repr(xml_signature(body_pr)),
    }


def shape_style_signature(element: ET.Element) -> tuple[Any, ...] | None:
    properties = element.find("./p:spPr", NS)
    if properties is None:
        properties = element.find("./p:grpSpPr", NS)
    if properties is None:
        return None
    fill = next(
        (
            properties.find(f"./a:{name}", NS)
            for name in ("solidFill", "gradFill", "pattFill", "blipFill", "noFill")
            if properties.find(f"./a:{name}", NS) is not None
        ),
        None,
    )
    line = properties.find("./a:ln", NS)
    xfrm = properties.find("./a:xfrm", NS)
    transform_attributes = (
        tuple(sorted(xfrm.attrib.items())) if xfrm is not None else tuple()
    )
    geometry = properties.find("./a:prstGeom", NS)
    return (
        xml_signature(fill),
        xml_signature(line),
        transform_attributes,
        xml_signature(geometry),
    )


def picture_crop_signature(element: ET.Element) -> tuple[Any, ...] | None:
    fill = element.find("./p:blipFill", NS)
    if fill is None:
        return None
    ignored = {f"{{{R}}}embed", f"{{{R}}}link"}
    return xml_signature(fill, ignored)


def element_text(element: ET.Element) -> str:
    return "\n".join(
        "".join(node.text or "" for node in paragraph.findall(".//a:t", NS))
        for paragraph in element.findall("./p:txBody/a:p", NS)
    )


def media_hash(package: PackageView, part: str, element: ET.Element) -> str | None:
    blip = element.find(".//a:blip", NS)
    if blip is None:
        return None
    rel_id = blip.get(f"{{{R}}}embed")
    if not rel_id:
        return None
    target = relationships(package, part).get(rel_id)
    if not target or target[1] != "Internal":
        return None
    media_part = resolve_target(part, target[0])
    if media_part not in package.archive.namelist():
        return None
    return hashlib.sha256(package.archive.read(media_part)).hexdigest()


def compare_geometry(
    reference: tuple[int, int, int, int],
    final: tuple[int, int, int, int],
) -> bool:
    return all(abs(a - b) <= EMU_TOLERANCE for a, b in zip(reference, final))


def compare_text(
    reference_package: PackageView,
    reference_element: ET.Element,
    final_package: PackageView,
    final_element: ET.Element,
    identifier: str,
    scope: str,
) -> list[dict[str, str]]:
    reference = body_signature(reference_package, reference_element)
    final = body_signature(final_package, final_element)
    if reference is None and final is None:
        return []
    if reference is None or final is None:
        return [issue("cover-text-body-mismatch", f"Shape ID {identifier} 文本框结构已改变", scope)]
    findings: list[dict[str, str]] = []
    if reference["paragraphCount"] != final["paragraphCount"]:
        findings.append(
            issue(
                "cover-paragraph-count-mismatch",
                f"Shape ID {identifier} 段落数必须为 {reference['paragraphCount']}，实际为 {final['paragraphCount']}",
                scope,
            )
        )
        return findings
    if reference["bodyPr"] != final["bodyPr"]:
        findings.append(
            issue(
                "cover-textbox-margins-mismatch",
                f"Shape ID {identifier} 的文本框边距、锚点或换行设置已改变",
                scope,
            )
        )
    for index, (expected, actual) in enumerate(
        zip(reference["paragraphs"], final["paragraphs"]), start=1
    ):
        if (
            expected["alignment"] != actual["alignment"]
            or expected["level"] != actual["level"]
            or expected["paragraphFormat"] != actual["paragraphFormat"]
        ):
            findings.append(
                issue(
                    "cover-paragraph-layout-mismatch",
                    f"Shape ID {identifier} 第 {index} 段的对齐或层级已改变",
                    scope,
                )
            )
        expected_styles = expected["styles"]
        actual_styles = actual["styles"]
        if len(expected_styles) != len(actual_styles):
            expected_sizes = sorted({style[0] for style in expected_styles})
            actual_sizes = sorted({style[0] for style in actual_styles})
            if expected_sizes != actual_sizes:
                findings.append(
                    issue(
                        "cover-font-size-mismatch",
                        f"Shape ID {identifier} 第 {index} 段字号集合必须为 {expected_sizes}pt，实际为 {actual_sizes}pt",
                        scope,
                    )
                )
            findings.append(
                issue(
                    "cover-font-style-mismatch",
                    f"Shape ID {identifier} 第 {index} 段出现了额外字号、字体或字重",
                    scope,
                )
            )
            continue
        for expected_style, actual_style in zip(expected_styles, actual_styles):
            size_matches = abs(expected_style[0] - actual_style[0]) <= FONT_TOLERANCE_PT
            other_matches = expected_style[1:] == actual_style[1:]
            if not size_matches:
                findings.append(
                    issue(
                        "cover-font-size-mismatch",
                        f"Shape ID {identifier} 第 {index} 段字号必须为 {expected_style[0]:g}pt，实际为 {actual_style[0]:g}pt",
                        scope,
                    )
                )
            if not other_matches:
                findings.append(
                    issue(
                        "cover-font-style-mismatch",
                        f"Shape ID {identifier} 第 {index} 段的字体、字重或斜体与标准封面不一致",
                        scope,
                    )
                )
    return findings


def check_required_cover_picture(
    profile: str,
    reference_package: PackageView,
    reference_part: str,
    final_package: PackageView,
    final_part: str,
) -> list[dict[str, str]]:
    identifier = REQUIRED_COVER_PICTURES[profile]
    reference_objects = shape_tree_objects(
        xml_root(reference_package, reference_part), reference_package.canvas
    )
    final_objects = shape_tree_objects(
        xml_root(final_package, final_part), final_package.canvas
    )
    reference_element = reference_objects.get(identifier)
    final_element = final_objects.get(identifier)
    if reference_element is None or element_kind(reference_element) != "pic":
        return [
            issue(
                "cover-reference-brand-picture-invalid",
                f"内置配置 {profile} 的标准封面右侧品牌图 Shape ID {identifier} 缺失；"
                "不得以色块作为封面检查基准",
                "cover-layout",
            )
        ]
    if final_element is None or element_kind(final_element) != "pic":
        return [
            issue(
                "cover-required-brand-picture-missing",
                f"标准封面右侧品牌图 Shape ID {identifier} 必须保留为图片对象；"
                "禁止删除、重绘或替换为实心色块",
                "cover-layout",
            )
        ]
    findings: list[dict[str, str]] = []
    reference_geometry = element_geometry(reference_element)
    final_geometry = element_geometry(final_element)
    if (
        reference_geometry is None
        or final_geometry is None
        or not compare_geometry(reference_geometry, final_geometry)
    ):
        findings.append(
            issue(
                "cover-required-brand-picture-geometry-mismatch",
                f"标准封面右侧品牌图 Shape ID {identifier} 坐标或尺寸必须为 "
                f"{reference_geometry}，实际为 {final_geometry}",
                "cover-layout",
            )
        )
    if picture_crop_signature(reference_element) != picture_crop_signature(final_element):
        findings.append(
            issue(
                "cover-required-brand-picture-crop-mismatch",
                f"标准封面右侧品牌图 Shape ID {identifier} 的裁切、拉伸或图片效果已改变",
                "cover-layout",
            )
        )
    if media_hash(reference_package, reference_part, reference_element) != media_hash(
        final_package, final_part, final_element
    ):
        findings.append(
            issue(
                "cover-required-brand-picture-media-mismatch",
                f"标准封面右侧品牌图 Shape ID {identifier} 必须使用内置源图媒体",
                "cover-layout",
            )
        )
    return findings


def compare_part(
    reference_package: PackageView,
    reference_part: str,
    final_package: PackageView,
    final_part: str,
    *,
    scope: str,
    allowed_picture_replacements: set[str],
) -> list[dict[str, str]]:
    reference_root = xml_root(reference_package, reference_part)
    final_root = xml_root(final_package, final_part)
    reference_objects = shape_tree_objects(reference_root, reference_package.canvas)
    final_objects = shape_tree_objects(final_root, final_package.canvas)
    findings: list[dict[str, str]] = []
    if scope == "cover-layout":
        reference_canvas = reference_root.find("./p:cSld", NS)
        final_canvas = final_root.find("./p:cSld", NS)
        reference_name = reference_canvas.get("name") if reference_canvas is not None else None
        final_name = final_canvas.get("name") if final_canvas is not None else None
        if reference_name != final_name:
            findings.append(
                issue(
                    "cover-layout-name-mismatch",
                    f"封面布局名称必须为 {reference_name!r}，实际为 {final_name!r}",
                    scope,
                )
            )
        for attribute in ("showMasterSp", "userDrawn"):
            if reference_root.get(attribute) != final_root.get(attribute):
                findings.append(
                    issue(
                        "cover-layout-contract-mismatch",
                        f"封面布局属性 {attribute} 已改变",
                        scope,
                    )
                )
    missing = sorted(set(reference_objects) - set(final_objects), key=int)
    extra = sorted(set(final_objects) - set(reference_objects), key=int)
    if missing:
        findings.append(
            issue("cover-object-missing", "缺少标准对象 Shape ID：" + "、".join(missing), scope)
        )
    if extra:
        findings.append(
            issue("cover-extra-object", "出现未授权可见对象 Shape ID：" + "、".join(extra), scope)
        )
    for identifier in sorted(set(reference_objects) & set(final_objects), key=int):
        reference_element = reference_objects[identifier]
        final_element = final_objects[identifier]
        if element_kind(reference_element) != element_kind(final_element):
            findings.append(
                issue(
                    "cover-object-type-mismatch",
                    f"Shape ID {identifier} 类型必须为 {element_kind(reference_element)}",
                    scope,
                )
            )
            continue
        reference_geometry = element_geometry(reference_element)
        final_geometry = element_geometry(final_element)
        if (
            reference_geometry is None
            or final_geometry is None
            or not compare_geometry(reference_geometry, final_geometry)
        ):
            findings.append(
                issue(
                    "cover-geometry-mismatch",
                    f"Shape ID {identifier} 坐标或尺寸必须为 {reference_geometry}，实际为 {final_geometry}",
                    scope,
                )
            )
        if shape_style_signature(reference_element) != shape_style_signature(final_element):
            findings.append(
                issue(
                    "cover-shape-style-mismatch",
                    f"Shape ID {identifier} 的填充、线条、旋转或几何样式已改变",
                    scope,
                )
            )
        if picture_crop_signature(reference_element) != picture_crop_signature(final_element):
            findings.append(
                issue(
                    "cover-picture-crop-mismatch",
                    f"Shape ID {identifier} 的图片裁切或图片效果已改变",
                    scope,
                )
            )
        findings.extend(
            compare_text(
                reference_package,
                reference_element,
                final_package,
                final_element,
                identifier,
                scope,
            )
        )
        if scope == "cover-layout" and element_text(reference_element) != element_text(final_element):
            findings.append(
                issue(
                    "cover-brand-text-mismatch",
                    f"Shape ID {identifier} 的布局层品牌文字已改变",
                    scope,
                )
            )
        if (
            element_kind(reference_element) == "pic"
            and identifier not in allowed_picture_replacements
        ):
            if media_hash(reference_package, reference_part, reference_element) != media_hash(
                final_package, final_part, final_element
            ):
                findings.append(
                    issue(
                        "cover-brand-media-mismatch",
                        f"Shape ID {identifier} 的品牌图片部件已改变",
                        scope,
                    )
                )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="按易方达封面硬合同检查字号、位置和品牌家具。")
    parser.add_argument("final_pptx", type=Path)
    parser.add_argument("--final-slide", type=int, default=1)
    parser.add_argument("--profile", choices=sorted(PROFILES))
    parser.add_argument("--reference-pptx", type=Path)
    parser.add_argument("--reference-slide", type=int)
    parser.add_argument(
        "--allow-picture-replacement",
        action="append",
        default=[],
        metavar="SHAPE_ID",
        help="用户模板中明确允许替换底层媒体的既有图片 Shape ID；可重复",
    )
    parser.add_argument("--json-output", type=Path)
    args = parser.parse_args()

    if args.profile:
        if args.reference_pptx or args.reference_slide or args.allow_picture_replacement:
            parser.error(
                "--profile 不能与 --reference-pptx/--reference-slide/--allow-picture-replacement 同时使用"
            )
        asset_name, reference_slide = PROFILES[args.profile]
        reference_path = Path(__file__).resolve().parent.parent / "assets" / asset_name
        allowed_picture_replacements = (
            {"10", "11", "12"} if args.profile == "v6-co-brand" else set()
        )
    else:
        if not args.reference_pptx or not args.reference_slide:
            parser.error("必须提供 --profile，或同时提供 --reference-pptx 和 --reference-slide")
        reference_path = args.reference_pptx.expanduser().resolve()
        reference_slide = args.reference_slide
        allowed_picture_replacements = set(args.allow_picture_replacement)

    final_path = args.final_pptx.expanduser().resolve()
    reference_path = reference_path.expanduser().resolve()
    findings: list[dict[str, str]] = []
    try:
        reference_package = open_package(reference_path)
        final_package = open_package(final_path)
        try:
            if reference_package.canvas != final_package.canvas:
                findings.append(
                    issue(
                        "cover-canvas-mismatch",
                        f"画布必须为 {reference_package.canvas} EMU，实际为 {final_package.canvas} EMU",
                    )
                )
            reference_slide_part = logical_slide_part(reference_package, reference_slide)
            final_slide_part = logical_slide_part(final_package, args.final_slide)
            findings.extend(
                compare_part(
                    reference_package,
                    reference_slide_part,
                    final_package,
                    final_slide_part,
                    scope="cover-slide",
                    allowed_picture_replacements=allowed_picture_replacements,
                )
            )
            reference_layout = linked_layout_part(reference_package, reference_slide_part)
            final_layout = linked_layout_part(final_package, final_slide_part)
            if args.profile:
                findings.extend(
                    check_required_cover_picture(
                        args.profile,
                        reference_package,
                        reference_layout,
                        final_package,
                        final_layout,
                    )
                )
            findings.extend(
                compare_part(
                    reference_package,
                    reference_layout,
                    final_package,
                    final_layout,
                    scope="cover-layout",
                    allowed_picture_replacements=set(),
                )
            )
        finally:
            reference_package.archive.close()
            final_package.archive.close()
    except (OSError, KeyError, ValueError, zipfile.BadZipFile, ET.ParseError) as exc:
        findings.append(issue("cover-check-failed", str(exc)))

    report = {
        "finalPptx": str(final_path),
        "finalSlide": args.final_slide,
        "profile": args.profile,
        "referencePptx": str(reference_path),
        "referenceSlide": reference_slide,
        "errorCount": len(findings),
        "warningCount": 0,
        "issues": findings,
    }
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    print(f"Errors: {report['errorCount']}; Warnings: 0")
    for finding in findings:
        print(
            f"[ERROR] {finding['code']} scope={finding['scope']}: {finding['message']}"
        )
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())

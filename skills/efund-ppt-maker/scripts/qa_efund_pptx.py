#!/usr/bin/env python3
"""Structural QA for E Fund-style PPTX files. Uses only Python stdlib."""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Iterable
from zipfile import BadZipFile, ZipFile

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"p": P_NS, "a": A_NS}
EMU_PER_INCH = 914400
TARGET_ASPECT = 16 / 9
TARGET_WIDTH_EMU = 10 * EMU_PER_INCH
PROMPT_RE = re.compile(
    r"(?:单击此处|Click\s+to\s+(?:add|edit)|Slide\s+Number|\bFooter\b|20xx|\bxxx\b)",
    re.IGNORECASE,
)
LEGAL_RE = re.compile(r"(?:风险提示|免责声明|Risk Reminder|Disclaimer|附注)", re.I)
PREFERRED_FONTS = {"Arial", "华文黑体_易方达"}
PREFERRED_EAST_ASIAN_FONT = "华文黑体_易方达"
CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
ALLOWED_LEGACY_FONTS = {
    "Arial Narrow",
    "华文黑体",
    "微软雅黑",
    "PingFang SC",
    "STHeiti",
}
STANDARD_TEXT_SPECS = {
    "standard-narrative-title": {"size": 15.0, "kind": "title"},
    "standard-visual-title": {"size": 10.0, "kind": "visual-title"},
    "standard-narrative-body": {"size": 12.0, "kind": "body"},
}
STANDARD_BODY_LINE_SPACING_PCT = 150.0


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def slide_key(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 10**9


def text_of(element: ET.Element) -> str:
    return "".join(node.text or "" for node in element.findall(".//a:t", NS)).strip()


def object_name(element: ET.Element) -> str:
    node = element.find(".//p:cNvPr", NS)
    return (node.get("name") if node is not None else None) or local_name(element.tag)


def has_forbidden_shadow(element: ET.Element) -> bool:
    shadow_tags = {"outerShdw", "innerShdw", "prstShdw"}
    return any(local_name(node.tag) in shadow_tags for node in element.iter())


def get_transform(element: ET.Element) -> tuple[int, int, int, int] | None:
    kind = local_name(element.tag)
    if kind == "graphicFrame":
        xfrm = element.find("p:xfrm", NS)
    elif kind == "grpSp":
        xfrm = element.find("p:grpSpPr/a:xfrm", NS)
    else:
        xfrm = element.find("p:spPr/a:xfrm", NS)
    if xfrm is None:
        return None
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    if off is None or ext is None:
        return None
    try:
        return (
            int(off.get("x") or 0),
            int(off.get("y") or 0),
            int(ext.get("cx") or 0),
            int(ext.get("cy") or 0),
        )
    except ValueError:
        return None


def top_level_objects(root: ET.Element) -> Iterable[ET.Element]:
    tree = root.find("p:cSld/p:spTree", NS)
    if tree is None:
        return []
    accepted = {"sp", "pic", "graphicFrame", "cxnSp", "grpSp"}
    return [child for child in list(tree) if local_name(child.tag) in accepted]


def weighted_title_length(text: str) -> float:
    return sum(1.0 if ord(char) > 127 else 0.5 for char in re.sub(r"\s+", "", text))


def issue(severity: str, code: str, message: str, slide: int | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"severity": severity, "code": code, "message": message}
    if slide is not None:
        item["slide"] = slide
    return item


def font_families(zf: ZipFile) -> set[str]:
    families: set[str] = set()
    prefixes = ("ppt/slides/", "ppt/slideLayouts/", "ppt/slideMasters/")
    for name in zf.namelist():
        if not name.endswith(".xml") or not name.startswith(prefixes):
            continue
        try:
            root = ET.fromstring(zf.read(name))
        except ET.ParseError:
            continue
        for node in root.iter():
            if local_name(node.tag) in {"latin", "ea", "cs", "sym"}:
                value = (node.get("typeface") or "").strip()
                if value and not value.startswith("+"):
                    families.add(value.replace("&quot;", '"'))
    return families


def east_asian_font_audit(element: ET.Element) -> dict[str, Any]:
    """Audit explicit East Asian typefaces on DrawingML runs containing CJK text."""
    preferred = 0
    implicit: list[str] = []
    wrong: list[tuple[str, str]] = []
    runs = list(element.findall(".//a:r", NS)) + list(element.findall(".//a:fld", NS))
    for run in runs:
        text = "".join(node.text or "" for node in run.findall(".//a:t", NS)).strip()
        if not text or not CJK_RE.search(text):
            continue
        run_properties = run.find("a:rPr", NS)
        east_asian = run_properties.find("a:ea", NS) if run_properties is not None else None
        typeface = (east_asian.get("typeface") if east_asian is not None else "") or ""
        typeface = typeface.strip()
        sample = re.sub(r"\s+", " ", text)[:24]
        if typeface == PREFERRED_EAST_ASIAN_FONT:
            preferred += 1
        elif not typeface or typeface.startswith("+"):
            implicit.append(sample)
        else:
            wrong.append((sample, typeface))
    return {"preferredExplicit": preferred, "implicit": implicit, "wrong": wrong}


def visible_runs(element: ET.Element) -> list[ET.Element]:
    return [
        run
        for run in list(element.findall(".//a:r", NS)) + list(element.findall(".//a:fld", NS))
        if text_of(run)
    ]


def drawingml_bold(run_properties: ET.Element | None) -> bool:
    if run_properties is None:
        return False
    value = (run_properties.get("b") or "").strip().lower()
    return value in {"1", "true", "on"}


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.findall(".//a:t", NS)).strip()


def paragraph_line_spacing_pct(paragraph: ET.Element) -> float | None:
    node = paragraph.find("a:pPr/a:lnSpc/a:spcPct", NS)
    if node is None:
        return None
    try:
        return int(node.get("val") or 0) / 1000
    except ValueError:
        return None


def paragraph_is_fully_bold(paragraph: ET.Element) -> bool:
    runs = visible_runs(paragraph)
    return bool(runs) and all(drawingml_bold(run.find("a:rPr", NS)) for run in runs)


def audit_named_standard_text(
    element: ET.Element, slide_number: int
) -> list[dict[str, Any]]:
    """Enforce the optional standard evidence-page text contract by stable object name."""
    name = object_name(element).strip().lower()
    spec = STANDARD_TEXT_SPECS.get(name)
    if spec is None:
        return []

    issues: list[dict[str, Any]] = []
    runs = visible_runs(element)
    if not runs:
        return [
            issue(
                "error",
                "standard-text-empty",
                f"具名标准文本对象 {object_name(element)} 为空",
                slide_number,
            )
        ]

    expected_size = float(spec["size"])
    for run in runs:
        run_text = text_of(run)
        run_properties = run.find("a:rPr", NS)
        try:
            actual_size = (
                int(run_properties.get("sz") or 0) / 100
                if run_properties is not None
                else 0
            )
        except ValueError:
            actual_size = 0
        if abs(actual_size - expected_size) > 0.01:
            issues.append(
                issue(
                    "error",
                    "standard-text-size",
                    f"{object_name(element)} 的“{run_text[:20]}”为 {actual_size:g}pt，要求 {expected_size:g}pt",
                    slide_number,
                )
            )

        if spec["kind"] == "title" and not drawingml_bold(run_properties):
            issues.append(
                issue(
                    "error",
                    "standard-title-not-bold",
                    f"{object_name(element)} 的标题 run 必须加粗：{run_text[:20]}",
                    slide_number,
                )
            )
        if spec["kind"] == "visual-title" and drawingml_bold(run_properties):
            issues.append(
                issue(
                    "error",
                    "standard-visual-title-bold",
                    f"{object_name(element)} 的图表/视觉标题必须为常规字重：{run_text[:20]}",
                    slide_number,
                )
            )

        if CJK_RE.search(run_text):
            east_asian = run_properties.find("a:ea", NS) if run_properties is not None else None
            typeface = (east_asian.get("typeface") if east_asian is not None else "") or ""
            if typeface.strip() != PREFERRED_EAST_ASIAN_FONT:
                issues.append(
                    issue(
                        "error",
                        "standard-text-east-asian-font",
                        f"{object_name(element)} 的中文 run 必须显式使用 {PREFERRED_EAST_ASIAN_FONT}：{run_text[:20]}",
                        slide_number,
                    )
                )
        if re.search(r"[A-Za-z0-9]", run_text):
            latin = run_properties.find("a:latin", NS) if run_properties is not None else None
            typeface = (latin.get("typeface") if latin is not None else "") or ""
            if typeface.strip() != "Arial":
                issues.append(
                    issue(
                        "error",
                        "standard-text-latin-font",
                        f"{object_name(element)} 的英文/数字 run 必须显式使用 Arial：{run_text[:20]}",
                        slide_number,
                    )
                )

    if spec["kind"] == "body":
        for paragraph in element.findall(".//a:p", NS):
            body_text = paragraph_text(paragraph)
            if not body_text:
                continue
            spacing = paragraph_line_spacing_pct(paragraph)
            if spacing is None or abs(spacing - STANDARD_BODY_LINE_SPACING_PCT) > 0.01:
                actual = "未显式设置" if spacing is None else f"{spacing:g}%"
                issues.append(
                    issue(
                        "error",
                        "standard-body-line-spacing",
                        f"{object_name(element)} 的正文段落行距为 {actual}，要求 150%：{body_text[:20]}",
                        slide_number,
                    )
                )
            if len(re.sub(r"\s+", "", body_text)) >= 8 and paragraph_is_fully_bold(paragraph):
                issues.append(
                    issue(
                        "error",
                        "standard-body-all-bold",
                        f"{object_name(element)} 的完整正文段落不得全部加粗：{body_text[:20]}",
                        slide_number,
                    )
                )
    return issues


def analyze(path: Path) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    result: dict[str, Any] = {"file": str(path), "issues": issues}
    try:
        with ZipFile(path) as zf:
            presentation = ET.fromstring(zf.read("ppt/presentation.xml"))
            size = presentation.find("p:sldSz", NS)
            if size is None:
                issues.append(issue("error", "missing-slide-size", "presentation.xml 缺少 p:sldSz"))
                return result
            width = int(size.get("cx") or 0)
            height = int(size.get("cy") or 0)
            aspect = width / height if height else 0
            result["slideSizeEmu"] = {"width": width, "height": height}
            result["aspectRatio"] = aspect
            if width <= 0 or height <= 0 or abs(aspect - TARGET_ASPECT) > 0.004:
                issues.append(
                    issue("error", "aspect-ratio", f"画布比例 {aspect:.5f} 不是允许的 16:9")
                )
            if abs(width - TARGET_WIDTH_EMU) > int(0.01 * EMU_PER_INCH):
                issues.append(
                    issue(
                        "error",
                        "canvas-width",
                        f"画布宽度为 {width / EMU_PER_INCH:.3f} 英寸，不是易方达案例的 10 英寸",
                    )
                )

            slide_names = sorted(
                (
                    name
                    for name in zf.namelist()
                    if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
                ),
                key=slide_key,
            )
            result["slideCount"] = len(slide_names)
            tolerance_x = int(width * 0.008)
            tolerance_y = int(height * 0.008)
            slide_summaries: list[dict[str, Any]] = []
            east_asian_totals = {"preferredExplicit": 0, "implicit": 0, "wrong": 0}

            for slide_number, name in enumerate(slide_names, start=1):
                root = ET.fromstring(zf.read(name))
                all_text = "\n".join(filter(None, (text_of(obj) for obj in top_level_objects(root))))
                char_count = len(re.sub(r"\s+", "", all_text))
                summary: dict[str, Any] = {"slide": slide_number, "characters": char_count}
                slide_summaries.append(summary)
                legal = bool(LEGAL_RE.search(all_text))

                if PROMPT_RE.search(all_text):
                    matched = PROMPT_RE.search(all_text)
                    issues.append(
                        issue(
                            "error",
                            "template-prompt",
                            f"残留模板提示语：{matched.group(0) if matched else 'unknown'}",
                            slide_number,
                        )
                    )
                if char_count > 650 and not legal:
                    issues.append(
                        issue("warning", "high-density", f"正文约 {char_count} 字符，需检查是否应拆页", slide_number)
                    )

                title_candidates: list[tuple[int, str]] = []
                implicit_east_asian: list[tuple[str, str]] = []
                wrong_east_asian: list[tuple[str, str, str]] = []
                slide_east_asian = {"preferredExplicit": 0, "implicit": 0, "wrong": 0}
                for obj in top_level_objects(root):
                    kind = local_name(obj.tag)
                    text = text_of(obj)
                    if has_forbidden_shadow(obj):
                        issues.append(
                            issue(
                                "error",
                                "shape-shadow-forbidden",
                                f"对象 {object_name(obj)} 使用了图形阴影；易方达页面必须保持扁平无阴影",
                                slide_number,
                            )
                        )
                    issues.extend(audit_named_standard_text(obj, slide_number))
                    east_asian = east_asian_font_audit(obj)
                    slide_east_asian["preferredExplicit"] += east_asian["preferredExplicit"]
                    slide_east_asian["implicit"] += len(east_asian["implicit"])
                    slide_east_asian["wrong"] += len(east_asian["wrong"])
                    implicit_east_asian.extend(
                        (object_name(obj), sample) for sample in east_asian["implicit"]
                    )
                    wrong_east_asian.extend(
                        (object_name(obj), sample, typeface)
                        for sample, typeface in east_asian["wrong"]
                    )
                    transform = get_transform(obj)
                    if obj.find(".//p:ph", NS) is not None and not text:
                        issues.append(
                            issue(
                                "error",
                                "empty-placeholder",
                                f"空占位符：{object_name(obj)}",
                                slide_number,
                            )
                        )
                    if transform is None:
                        continue
                    x, y, obj_width, obj_height = transform
                    if kind not in {"grpSp", "cxnSp"} and obj_width > 0 and obj_height > 0:
                        if (
                            x < -tolerance_x
                            or y < -tolerance_y
                            or x + obj_width > width + tolerance_x
                            or y + obj_height > height + tolerance_y
                        ):
                            fully_outside = (
                                x + obj_width <= 0
                                or y + obj_height <= 0
                                or x >= width
                                or y >= height
                            )
                            code = "off-canvas-object" if fully_outside else "out-of-bounds-geometry"
                            message = (
                                "对象完全位于画布外，通常是模板制作说明；成品应确认删除"
                                if fully_outside
                                else "对象边界跨出画布；必须用渲染溢出测试确认可见像素"
                            )
                            issues.append(
                                issue(
                                    "warning",
                                    code,
                                    f"{message}：{object_name(obj)} x={x}, y={y}, w={obj_width}, h={obj_height}",
                                    slide_number,
                                )
                            )
                    if (
                        kind not in {"grpSp", "cxnSp"}
                        and text
                        and x >= 0
                        and y >= 0
                        and y < int(0.85 * EMU_PER_INCH)
                        and x < int(7.7 * EMU_PER_INCH)
                    ):
                        title_candidates.append((y, text.replace("\n", " ").strip()))

                    sizes = []
                    for node in obj.findall(".//*[@sz]"):
                        try:
                            sizes.append(int(node.get("sz") or 0) / 100)
                        except ValueError:
                            pass
                    if kind not in {"grpSp", "cxnSp"} and text and sizes and not legal:
                        min_size = min(value for value in sizes if value > 0) if any(sizes) else 0
                        if min_size and min_size < 10 and y < int(5.12 * EMU_PER_INCH):
                            issues.append(
                                issue(
                                    "warning",
                                    "small-body-text",
                                    f"对象 {object_name(obj)} 含 {min_size:g}pt 文本；仅脚注/来源允许低于 10pt",
                                    slide_number,
                                )
                            )

                summary["eastAsianFontRuns"] = slide_east_asian
                for key in east_asian_totals:
                    east_asian_totals[key] += slide_east_asian[key]
                if implicit_east_asian:
                    samples = "；".join(
                        f"{name}：{sample}" for name, sample in implicit_east_asian[:3]
                    )
                    issues.append(
                        issue(
                            "warning",
                            "implicit-east-asian-font",
                            f"{len(implicit_east_asian)} 个中文 run 未显式设置 a:ea；继承对象须登记，新增长文本则 QA 失败。示例：{samples}",
                            slide_number,
                        )
                    )
                if wrong_east_asian:
                    samples = "；".join(
                        f"{name}：{sample}（{typeface}）"
                        for name, sample, typeface in wrong_east_asian[:3]
                    )
                    issues.append(
                        issue(
                            "warning",
                            "wrong-east-asian-font",
                            f"{len(wrong_east_asian)} 个中文 run 显式使用非首选东亚字体；继承对象须登记，新增长文本则 QA 失败。示例：{samples}",
                            slide_number,
                        )
                    )

                if title_candidates:
                    title = min(title_candidates, key=lambda item: item[0])[1]
                    summary["title"] = title
                    equivalent = weighted_title_length(title)
                    if equivalent > 34:
                        issues.append(
                            issue(
                                "warning",
                                "long-title",
                                f"标题约 {equivalent:.1f} 个等效中文字符，可能侵入 Logo 区或换行",
                                slide_number,
                            )
                        )

            fonts = sorted(font_families(zf))
            result["fonts"] = fonts
            nonpreferred = sorted(
                font for font in fonts if font not in PREFERRED_FONTS | ALLOWED_LEGACY_FONTS
            )
            if nonpreferred:
                issues.append(
                    issue(
                        "warning",
                        "nonpreferred-fonts",
                        "发现非首选字体；必须逐对象证明来自继承图表/品牌对象，若用于新增可见文本则 QA 失败："
                        + ", ".join(nonpreferred),
                    )
                )
            result["eastAsianFontRuns"] = east_asian_totals
            result["slides"] = slide_summaries
    except (BadZipFile, KeyError, ET.ParseError, OSError, ValueError) as exc:
        issues.append(issue("error", "unreadable-pptx", f"无法读取 PPTX：{exc}"))

    result["errorCount"] = sum(item["severity"] == "error" for item in issues)
    result["warningCount"] = sum(item["severity"] == "warning" for item in issues)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="检查易方达风格 PPTX 的结构、越界、占位符和字体。")
    parser.add_argument("pptx", type=Path)
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--warnings-as-errors", action="store_true")
    args = parser.parse_args()

    report = analyze(args.pptx.expanduser().resolve())
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Slides: {report.get('slideCount', 0)}")
    print(f"Errors: {report.get('errorCount', 0)}; Warnings: {report.get('warningCount', 0)}")
    for item in report["issues"]:
        where = f" slide={item['slide']}" if "slide" in item else ""
        print(f"[{item['severity'].upper()}] {item['code']}{where}: {item['message']}")

    failed = report.get("errorCount", 0) > 0 or (
        args.warnings_as_errors and report.get("warningCount", 0) > 0
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

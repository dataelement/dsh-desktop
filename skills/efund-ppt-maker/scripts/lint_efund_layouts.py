#!/usr/bin/env python3
"""Lint normalized slide-layout JSON for wrapping, sizing, bounds, and overlaps."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

LEGAL_RE = re.compile(r"(?:风险提示|免责声明|Risk Reminder|Disclaimer|附注)", re.I)
BUILD_MODES = {"reuse", "controlled-recomposition", "original-in-brand-shell"}
LAYOUT_DECISION_FIELDS = (
    "contentStructure",
    "readingOrder",
    "primaryVisual",
    "geometryPlan",
    "caseInfluence",
    "whyNotDirectReuse",
    "originalityEvidence",
)
REUSE_QUALIFIERS = (
    "sameRelationship",
    "sameModuleCount",
    "sameDensity",
    "sameFocalHierarchy",
    "sameReadingOrder",
)
VISUAL_TEXT_BINDING_FIELDS = (
    "visualType",
    "supportsClaim",
    "textAnchor",
    "sourceOrGeneration",
    "whyThisVisual",
    "informationCarried",
    "visualObjectIds",
)
VISUAL_TYPES = {
    "photo",
    "chart",
    "diagram",
    "architecture",
    "process",
    "official-screenshot",
    "icon-group",
    "data-visual",
    "table",
    "map",
    "timeline",
    "illustration",
    "comparison-visual",
}
VISUAL_EXEMPT_PAGE_KINDS = {"cover", "agenda", "legal", "closing"}
COVER_PROFILES = {
    "v6-cn-simple": 2,
    "v6-cn-subtitle": 3,
    "v6-bilingual": 4,
    "v6-english": 5,
    "v6-co-brand": 6,
    "ai-tech-internal": 1,
    "user-template": None,
}
BODY_LEFT_ALIGNED_ROLES = {
    "body",
    "body-text",
    "paragraph",
    "explanation",
    "narrative-body",
    "module-body",
    "module-description",
    "table-body",
    "takeaway",
    "recommendation",
    "suggestion",
    "advice",
    "conclusion",
    "source",
    "note",
}
LEFT_ALIGNMENT_VALUES = {"", "left", "start", "l", "none"}
MIN_TEXT_INSET_PX = 10.0
CONNECTOR_TEXT_CLEARANCE_PX = 8.0
ALIGNMENT_CHECKS = {
    "left",
    "right",
    "top",
    "bottom",
    "width",
    "height",
    "center-x",
    "center-y",
    "horizontal-gap",
    "vertical-gap",
}


def issue(severity: str, code: str, message: str, slide: int) -> dict[str, Any]:
    return {"severity": severity, "code": code, "message": message, "slide": slide}


def weighted_length(text: str) -> float:
    return sum(1.0 if ord(char) > 127 else 0.5 for char in re.sub(r"\s+", "", text))


def area(box: list[float]) -> float:
    return max(0.0, box[2]) * max(0.0, box[3])


def intersection(a: list[float], b: list[float]) -> float:
    left = max(a[0], b[0])
    top = max(a[1], b[1])
    right = min(a[0] + a[2], b[0] + b[2])
    bottom = min(a[1] + a[3], b[1] + b[3])
    return max(0.0, right - left) * max(0.0, bottom - top)


def horizontal_intersection(a: list[float], b: list[float]) -> float:
    return max(0.0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))


def object_label(element: dict[str, Any]) -> str:
    return str(element.get("name") or element.get("aid") or element.get("id") or element.get("kind"))


def normalized_label(element: dict[str, Any]) -> str:
    return object_label(element).strip().lower().replace("_", "-")


def has_content(value: object) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool(value) and all(has_content(item) for item in value)
    return value is not None


def weak_reuse_reason(value: object) -> bool:
    if not isinstance(value, str):
        return True
    normalized = re.sub(r"[\s，。；、,.!！]", "", value).lower()
    weak = {
        "可以换字",
        "可换字",
        "版面相近",
        "布局相近",
        "看起来相近",
        "看起来一样",
        "样式合适",
        "套用模板",
    }
    return len(normalized) < 6 or normalized in weak


def weak_visual_binding(binding: dict[str, Any]) -> bool:
    weak = {
        "装饰",
        "美观",
        "好看",
        "丰富页面",
        "图文并茂",
        "占位",
        "支撑本页结论",
        "呼应文字",
        "与主题相关",
        "提升设计感",
    }
    minimum_lengths = {
        "supportsClaim": 6,
        "whyThisVisual": 8,
        "informationCarried": 6,
    }
    for name, minimum in minimum_lengths.items():
        value = binding.get(name)
        if not isinstance(value, str):
            return True
        normalized = re.sub(r"[\s，。；、,.!！:：]", "", value)
        if len(normalized) < minimum or normalized in weak:
            return True
    return False


def is_connector(element: dict[str, Any]) -> bool:
    label = normalized_label(element)
    geometry = str(element.get("geometry") or "").lower()
    return "connector" in label or "连接符" in label or geometry in {"line", "straightconnector1"}


def is_chart_category_label(element: dict[str, Any]) -> bool:
    label = normalized_label(element)
    return (
        "label" in label
        and "value" not in label
        and "data-label" not in label
        and "axis" not in label
        and bool(str(element.get("text") or "").strip())
    )


def is_chart_data_mark(element: dict[str, Any]) -> bool:
    label = normalized_label(element)
    segments = set(re.split(r"[-\s]+", label))
    return bool(segments.intersection({"bar", "column", "mark", "point", "area"}))


def is_advisory_callout(element: dict[str, Any]) -> bool:
    label = normalized_label(element)
    text = str(element.get("text") or "").strip()
    return bool(text) and any(
        token in label
        for token in ("takeaway", "recommendation", "suggestion", "advice")
    )


def paragraph_alignments(element: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for paragraph in element.get("paragraphs") or []:
        style = paragraph.get("resolvedTextStyle") or {}
        value = style.get("alignment") if isinstance(style, dict) else None
        if value is not None:
            values.add(str(value).strip().lower())
    if not values:
        style = element.get("resolvedTextStyle") or {}
        value = style.get("alignment") if isinstance(style, dict) else None
        if value is not None:
            values.add(str(value).strip().lower())
    return values


def standard_narrative_required_height(element: dict[str, Any]) -> float | None:
    if normalized_label(element) != "standard-narrative-body":
        return None
    layout = element.get("textLayout") or {}
    try:
        line_count = int(layout.get("lineCount") or 0)
    except (TypeError, ValueError):
        return None
    sizes = font_sizes(element)
    if line_count <= 0 or not sizes:
        return None
    # Layout JSON uses normalized CSS pixels. The contract requires 150% line
    # spacing; add 4px for top/bottom text insets when the runtime cannot
    # expose them directly.
    return line_count * max(sizes) * 1.5 + 4.0


def font_sizes(element: dict[str, Any]) -> list[float]:
    sizes: list[float] = []
    resolved = element.get("resolvedFontSize")
    if isinstance(resolved, (int, float)) and resolved > 0:
        sizes.append(float(resolved))
    style = element.get("resolvedTextStyle") or {}
    value = style.get("fontSize") if isinstance(style, dict) else None
    if isinstance(value, (int, float)) and value > 0:
        sizes.append(float(value))
    for paragraph in element.get("paragraphs") or []:
        for run in paragraph.get("runs") or []:
            value = run.get("fontSize")
            if isinstance(value, (int, float)) and value > 0:
                sizes.append(float(value))
    return sizes


def element_role(element: dict[str, Any]) -> str:
    value = element.get("textRole") or element.get("role") or ""
    return str(value).strip().lower().replace("_", "-")


def is_page_title(element: dict[str, Any], fw: float) -> bool:
    text = str(element.get("text") or "").strip()
    box = element.get("_box")
    if not text or not isinstance(box, list):
        return False
    role = element_role(element)
    label = normalized_label(element)
    explicit = role in {"page-title", "slide-title", "top-bar-title"} or any(
        token in label for token in ("page-title", "slide-title", "top-bar-title")
    )
    named_title = (
        label.startswith("title")
        and not any(token in label for token in ("subtitle", "visual-title", "module-title"))
    )
    sizes = font_sizes(element)
    max_size = max(sizes) if sizes else 0.0
    geometric = (
        box[0] >= 0
        and box[1] >= 0
        and box[1] <= 62
        and box[0] < fw * 0.78
        and box[0] + box[2] <= fw + 3.0
        and max_size >= 18.0
    )
    return explicit or (named_title and box[1] <= 83) or geometric


def reported_line_count(element: dict[str, Any]) -> int:
    layout = element.get("textLayout") or {}
    try:
        layout_count = int(layout.get("lineCount") or 0)
    except (TypeError, ValueError):
        layout_count = 0
    text_count = str(element.get("text") or "").count("\n") + 1
    return max(1, layout_count, text_count)


def requires_left_alignment(element: dict[str, Any]) -> bool:
    role = element_role(element)
    label = normalized_label(element)
    if role in BODY_LEFT_ALIGNED_ROLES:
        return True
    if is_advisory_callout(element):
        return True
    return any(
        token in label
        for token in (
            "body-copy",
            "body-text",
            "narrative-explanation",
            "module-description",
            "table-body",
            "source-note",
        )
    )


def text_insets(element: dict[str, Any]) -> dict[str, float] | None:
    raw = element.get("textInsets")
    if isinstance(raw, list) and len(raw) == 4:
        try:
            return {
                "left": float(raw[0]),
                "top": float(raw[1]),
                "right": float(raw[2]),
                "bottom": float(raw[3]),
            }
        except (TypeError, ValueError):
            return None
    if not isinstance(raw, dict):
        return None
    aliases = {
        "left": ("left", "l"),
        "top": ("top", "t"),
        "right": ("right", "r"),
        "bottom": ("bottom", "b"),
    }
    result: dict[str, float] = {}
    for side, names in aliases.items():
        value = next((raw.get(name) for name in names if raw.get(name) is not None), None)
        try:
            result[side] = float(value)
        except (TypeError, ValueError):
            return None
    return result


def needs_body_inset_check(element: dict[str, Any]) -> bool:
    if element.get("kind") != "shape" or not str(element.get("text") or "").strip():
        return False
    if requires_left_alignment(element):
        return True
    return reported_line_count(element) >= 2 and weighted_length(str(element.get("text") or "")) >= 14


def point_pair(value: object) -> tuple[float, float] | None:
    if isinstance(value, list) and len(value) >= 2:
        try:
            return float(value[0]), float(value[1])
        except (TypeError, ValueError):
            return None
    if isinstance(value, dict):
        try:
            return float(value["x"]), float(value["y"])
        except (KeyError, TypeError, ValueError):
            return None
    return None


def connector_segment(
    element: dict[str, Any],
) -> tuple[tuple[float, float], tuple[float, float]] | None:
    start = point_pair(element.get("lineStart") or element.get("start"))
    end = point_pair(element.get("lineEnd") or element.get("end"))
    if start and end:
        return start, end
    points = element.get("points")
    if isinstance(points, list) and len(points) >= 2:
        start = point_pair(points[0])
        end = point_pair(points[-1])
        if start and end:
            return start, end
    box = element.get("_box")
    label = normalized_label(element)
    if isinstance(box, list) and not "connector" in label:
        if box[3] <= 4.0:
            return (box[0], box[1]), (box[0] + box[2], box[1] + box[3])
        if box[2] <= 4.0:
            return (box[0], box[1]), (box[0] + box[2], box[1] + box[3])
    return None


def point_in_box(point: tuple[float, float], box: list[float]) -> bool:
    return (
        box[0] <= point[0] <= box[0] + box[2]
        and box[1] <= point[1] <= box[1] + box[3]
    )


def orientation(
    first: tuple[float, float],
    second: tuple[float, float],
    third: tuple[float, float],
) -> float:
    return (second[0] - first[0]) * (third[1] - first[1]) - (
        second[1] - first[1]
    ) * (third[0] - first[0])


def on_segment(
    first: tuple[float, float],
    point: tuple[float, float],
    second: tuple[float, float],
) -> bool:
    return (
        min(first[0], second[0]) - 1e-6 <= point[0] <= max(first[0], second[0]) + 1e-6
        and min(first[1], second[1]) - 1e-6
        <= point[1]
        <= max(first[1], second[1]) + 1e-6
    )


def segments_intersect(
    a1: tuple[float, float],
    a2: tuple[float, float],
    b1: tuple[float, float],
    b2: tuple[float, float],
) -> bool:
    o1 = orientation(a1, a2, b1)
    o2 = orientation(a1, a2, b2)
    o3 = orientation(b1, b2, a1)
    o4 = orientation(b1, b2, a2)
    if ((o1 > 0 > o2) or (o1 < 0 < o2)) and ((o3 > 0 > o4) or (o3 < 0 < o4)):
        return True
    for value, first, point, second in (
        (o1, a1, b1, a2),
        (o2, a1, b2, a2),
        (o3, b1, a1, b2),
        (o4, b1, a2, b2),
    ):
        if abs(value) <= 1e-6 and on_segment(first, point, second):
            return True
    return False


def segment_intersects_box(
    start: tuple[float, float], end: tuple[float, float], box: list[float]
) -> bool:
    if point_in_box(start, box) or point_in_box(end, box):
        return True
    left, top, width, height = box
    top_left = (left, top)
    top_right = (left + width, top)
    bottom_right = (left + width, top + height)
    bottom_left = (left, top + height)
    return any(
        segments_intersect(start, end, edge_start, edge_end)
        for edge_start, edge_end in (
            (top_left, top_right),
            (top_right, bottom_right),
            (bottom_right, bottom_left),
            (bottom_left, top_left),
        )
    )


def looks_unfilled(fill: object) -> bool:
    value = str(fill or "").strip().lower().replace(" ", "")
    if not value or value in {
        "none",
        "transparent",
        "#ffffff",
        "ffffff",
        "white",
        "#00000000",
        "00000000",
        "#ffffff00",
        "ffffff00",
    }:
        return True
    match = re.fullmatch(r"rgba\(\d+,\d+,\d+,([0-9.]+)\)", value)
    return bool(match and float(match.group(1)) <= 0.05)


def is_large_wireframe(element: dict[str, Any], fw: float, fh: float) -> bool:
    if element.get("kind") != "shape":
        return False
    geometry = str(element.get("geometry") or "").lower()
    if geometry not in {"rect", "roundrect"}:
        return False
    box = element.get("_box")
    if not isinstance(box, list):
        return False
    ratio = area(box) / max(1.0, fw * fh)
    if ratio < 0.055 or ratio > 0.45:
        return False
    line_width = element.get("lineWidth")
    has_line = bool(element.get("lineColor")) or (
        isinstance(line_width, (int, float)) and line_width > 0
    )
    return has_line and looks_unfilled(element.get("fillColor"))


def is_footer_furniture(element: dict[str, Any], footer_line_y: float) -> bool:
    """Return true only for inherited-style footer furniture, never source notes."""
    label = object_label(element).lower()
    text = re.sub(r"\s+", "", str(element.get("text") or ""))
    box = element.get("_box")
    if not isinstance(box, list) or box[1] < footer_line_y - 4:
        return False
    if any(token in label for token in ("source", "note", "来源", "脚注", "注释")):
        return False
    if any(
        token in label
        for token in (
            "footer",
            "页脚",
            "sldnum",
            "slide-number",
            "page-number",
            "logo",
            "公司名",
            "保密",
        )
    ):
        return True
    if any(
        token in text
        for token in (
            "易方达基金管理有限公司",
            "仅供内部交流讨论",
            "禁止外传",
            "confidential",
            "copyright",
            "allrightsreserved",
        )
    ):
        return True
    if re.fullmatch(r"[#<>（）()\s]*\d{1,3}[#<>（）()\s]*", text):
        return True
    geometry = str(element.get("geometry") or "").lower()
    return (
        geometry in {"line", "straightconnector1"}
        and abs(box[1] - footer_line_y) <= 4
        and box[3] <= 4
    )


def unique_layout_elements(object_index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    unique: list[dict[str, Any]] = []
    seen: set[int] = set()
    for element in object_index.values():
        identity = id(element)
        if identity in seen:
            continue
        seen.add(identity)
        unique.append(element)
    return unique


def missing_footer_furniture(object_index: dict[str, dict[str, Any]]) -> list[str]:
    roles = {
        "页脚分隔线": False,
        "左侧公司名": False,
        "中部保密提示": False,
        "右侧页码": False,
    }
    for element in unique_layout_elements(object_index):
        box = element.get("_box")
        if not isinstance(box, list) or box[1] < 488:
            continue
        label = normalized_label(element)
        text = re.sub(r"\s+", "", str(element.get("text") or ""))
        geometry = str(element.get("geometry") or "").lower()
        if (
            (
                geometry in {"line", "straightconnector1"}
                and box[2] >= 480
                and box[3] <= 4
            )
            or any(token in label for token in ("footer-divider", "footer-rule", "footer-line"))
        ):
            roles["页脚分隔线"] = True
        if "易方达基金管理有限公司" in text or any(
            token in label for token in ("footer-company", "company-name")
        ):
            roles["左侧公司名"] = True
        if any(token in text.lower() for token in ("仅供内部交流讨论", "禁止外传", "confidential")) or any(
            token in label for token in ("footer-confidentiality", "confidentiality")
        ):
            roles["中部保密提示"] = True
        if (
            any(token in label for token in ("page-number", "slide-number", "sldnum"))
            or re.fullmatch(r"[#<>（）()\s]*\d{1,3}[#<>（）()\s]*", text)
        ):
            roles["右侧页码"] = True
    return [name for name, present in roles.items() if not present]


def alignment_group_findings(
    groups: object,
    object_index: dict[str, dict[str, Any]],
    slide: int,
) -> list[dict[str, Any]]:
    if not isinstance(groups, list):
        return []
    findings: list[dict[str, Any]] = []
    for group_index, group in enumerate(groups, start=1):
        if not isinstance(group, dict):
            findings.append(
                issue(
                    "error",
                    "invalid-alignment-group",
                    f"alignmentGroups 第 {group_index} 项必须是对象",
                    slide,
                )
            )
            continue
        group_name = str(group.get("name") or f"第 {group_index} 组")
        object_ids = group.get("objectIds")
        checks = group.get("checks")
        try:
            tolerance = float(group.get("tolerancePx", 2.0))
        except (TypeError, ValueError):
            tolerance = -1.0
        if (
            not isinstance(object_ids, list)
            or len(object_ids) < 2
            or not isinstance(checks, list)
            or not checks
            or tolerance < 0
            or tolerance > 4
        ):
            findings.append(
                issue(
                    "error",
                    "invalid-alignment-group",
                    f"{group_name} 必须声明至少两个 objectIds、非空 checks，tolerancePx 须为 0–4",
                    slide,
                )
            )
            continue
        invalid_checks = [str(value) for value in checks if value not in ALIGNMENT_CHECKS]
        if invalid_checks:
            findings.append(
                issue(
                    "error",
                    "invalid-alignment-group",
                    f"{group_name} 使用了未知检查项：{'、'.join(invalid_checks)}",
                    slide,
                )
            )
            continue
        elements: list[dict[str, Any]] = []
        missing_ids: list[str] = []
        seen: set[int] = set()
        for value in object_ids:
            key = str(value).strip()
            element = object_index.get(key)
            if not element or not isinstance(element.get("_box"), list):
                missing_ids.append(key)
                continue
            if id(element) not in seen:
                seen.add(id(element))
                elements.append(element)
        if missing_ids or len(elements) < 2:
            findings.append(
                issue(
                    "error",
                    "invalid-alignment-group",
                    f"{group_name} 找不到布局对象：{'、'.join(missing_ids) or '有效对象不足两个'}",
                    slide,
                )
            )
            continue
        boxes = [element["_box"] for element in elements]
        values_by_check = {
            "left": [box[0] for box in boxes],
            "right": [box[0] + box[2] for box in boxes],
            "top": [box[1] for box in boxes],
            "bottom": [box[1] + box[3] for box in boxes],
            "width": [box[2] for box in boxes],
            "height": [box[3] for box in boxes],
            "center-x": [box[0] + box[2] / 2 for box in boxes],
            "center-y": [box[1] + box[3] / 2 for box in boxes],
        }
        violations: list[str] = []
        for check in checks:
            if check in values_by_check:
                values = values_by_check[check]
                delta = max(values) - min(values)
                if delta > tolerance:
                    violations.append(f"{check} 偏差 {delta:.1f}px")
            elif check == "horizontal-gap":
                ordered = sorted(boxes, key=lambda box: box[0])
                gaps = [
                    ordered[index + 1][0] - (ordered[index][0] + ordered[index][2])
                    for index in range(len(ordered) - 1)
                ]
                if gaps and max(gaps) - min(gaps) > tolerance:
                    violations.append(
                        f"horizontal-gap 偏差 {max(gaps) - min(gaps):.1f}px"
                    )
            elif check == "vertical-gap":
                ordered = sorted(boxes, key=lambda box: box[1])
                gaps = [
                    ordered[index + 1][1] - (ordered[index][1] + ordered[index][3])
                    for index in range(len(ordered) - 1)
                ]
                if gaps and max(gaps) - min(gaps) > tolerance:
                    violations.append(
                        f"vertical-gap 偏差 {max(gaps) - min(gaps):.1f}px"
                    )
        if violations:
            findings.append(
                issue(
                    "error",
                    "alignment-group-violation",
                    f"{group_name} 未通过同级网格：{'；'.join(violations)}；容差 {tolerance:.1f}px",
                    slide,
                )
            )
    return findings


def analyze_file(
    path: Path,
) -> tuple[int, list[dict[str, Any]], dict[str, dict[str, Any]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    slide_info = data.get("slide") or {}
    slide = int(slide_info.get("slide") or 0)
    frame = slide_info.get("frame") or {"left": 0, "top": 0, "width": 960, "height": 540}
    fw = float(frame.get("width") or 960)
    fh = float(frame.get("height") or 540)
    footer_line_y = fh - 44
    content_safe_bottom = footer_line_y - 8
    findings: list[dict[str, Any]] = []
    elements = [item for item in data.get("elements") or [] if item.get("scope") == "slide"]
    object_index: dict[str, dict[str, Any]] = {}
    for element in elements:
        for name in ("id", "aid", "name"):
            value = element.get(name)
            if value is not None and str(value).strip():
                object_index[str(value).strip()] = element

    usable: list[dict[str, Any]] = []
    for element in elements:
        box = element.get("bbox")
        if not isinstance(box, list) or len(box) != 4:
            continue
        box = [float(value) for value in box]
        element["_box"] = box
        usable.append(element)
        if (
            box[1] + box[3] > content_safe_bottom
            and not is_footer_furniture(element, footer_line_y)
        ):
            findings.append(
                issue(
                    "error",
                    "footer-clearance-violation",
                    f"{object_label(element)} 底边 {box[1] + box[3]:.1f} 超过正文安全底线 "
                    f"{content_safe_bottom:.1f}；来源/注释必须整体位于页脚分隔线上方并保留至少 8px 间距",
                    slide,
                )
            )
        tolerance = 3.0
        if (
            not is_connector(element)
            and (
                box[0] < -tolerance
                or box[1] < -tolerance
                or box[0] + box[2] > fw + tolerance
                or box[1] + box[3] > fh + tolerance
            )
        ):
            findings.append(
                issue(
                    "warning",
                    "out-of-bounds-geometry",
                    f"{object_label(element)} bbox={box}；组合坐标可能失真，须以渲染溢出测试为准",
                    slide,
                )
            )

        text = str(element.get("text") or "").strip()
        if not text:
            continue
        layout = element.get("textLayout") or {}
        sizes = font_sizes(element)
        max_size = max(sizes) if sizes else 0
        min_size = min(sizes) if sizes else 0
        is_title = is_page_title(element, fw)
        legal = bool(LEGAL_RE.search(text))
        if is_title:
            line_count = reported_line_count(element)
            if line_count > 1:
                findings.append(
                    issue("error", "wrapped-title", f"{object_label(element)} 标题为 {line_count} 行", slide)
                )
            logo_safe_left = fw * 0.79 - 16.0
            if box[0] + box[2] > logo_safe_left:
                findings.append(
                    issue(
                        "error",
                        "title-logo-clearance-violation",
                        f"{object_label(element)} 右边界 {box[0] + box[2]:.1f} 进入 Logo 前 16px 保护带；"
                        f"标题框右边界不得超过 {logo_safe_left:.1f}",
                        slide,
                    )
                )
            equivalent = weighted_length(text)
            if equivalent > 34:
                findings.append(
                    issue("warning", "long-title", f"标题约 {equivalent:.1f} 个等效中文字符", slide)
                )
        elif box[1] < fh - 44 and not legal and min_size:
            actual_pt = min_size * 0.75
            if actual_pt < 7:
                findings.append(
                    issue(
                        "warning",
                        "illegible-text",
                        f"{object_label(element)} 最小约 {actual_pt:.1f}pt；仅源注/脚注/法务可保留",
                        slide,
                    )
                )
            elif actual_pt < 10:
                findings.append(
                    issue("warning", "small-body-text", f"{object_label(element)} 最小约 {actual_pt:.1f}pt", slide)
                )

        if requires_left_alignment(element):
            non_left = sorted(
                value
                for value in paragraph_alignments(element)
                if value not in LEFT_ALIGNMENT_VALUES
            )
            if non_left:
                findings.append(
                    issue(
                        "error",
                        "body-text-not-left-aligned",
                        f"{object_label(element)} 的正文角色 {element_role(element) or 'body'} "
                        f"使用 {', '.join(non_left)} 对齐；解释、说明、建议、结论和表格正文必须左对齐",
                        slide,
                    )
                )

        if needs_body_inset_check(element):
            insets = text_insets(element)
            if insets is None:
                findings.append(
                    issue(
                        "error",
                        "missing-text-insets",
                        f"{object_label(element)} 是含正文的图形，但布局 JSON 未导出 textInsets；"
                        "无法验证文字与图形边缘的安全距离",
                        slide,
                    )
                )
            else:
                tight = [
                    f"{side}={value:.1f}px"
                    for side, value in insets.items()
                    if value < MIN_TEXT_INSET_PX
                ]
                if tight:
                    findings.append(
                        issue(
                            "error",
                            "text-inset-clearance",
                            f"{object_label(element)} 的正文内边距不足 {MIN_TEXT_INSET_PX:.0f}px："
                            + "、".join(tight),
                            slide,
                        )
                    )

    text_elements = [
        element
        for element in usable
        if str(element.get("text") or "").strip()
        and not is_footer_furniture(element, footer_line_y)
    ]
    connector_clearance_count = 0
    for connector in (element for element in usable if is_connector(element)):
        if is_footer_furniture(connector, footer_line_y):
            continue
        label = normalized_label(connector)
        if any(token in label for token in ("axis", "rule", "divider", "separator")):
            continue
        segment = connector_segment(connector)
        if segment is None:
            findings.append(
                issue(
                    "error",
                    "connector-endpoints-missing",
                    f"{object_label(connector)} 未导出 lineStart/lineEnd 或 points；"
                    "无法验证连接线与文字的 8px 安全距离",
                    slide,
                )
            )
            continue
        attached_ids = {
            str(value).strip()
            for name in ("fromId", "toId", "sourceId", "targetId")
            if (value := connector.get(name)) is not None
        }
        for text_element in text_elements:
            aliases = {
                str(text_element.get(name)).strip()
                for name in ("id", "aid", "name")
                if text_element.get(name) is not None
            }
            if attached_ids.intersection(aliases):
                continue
            text_box = text_element["_box"]
            expanded_box = [
                text_box[0] - CONNECTOR_TEXT_CLEARANCE_PX,
                text_box[1] - CONNECTOR_TEXT_CLEARANCE_PX,
                text_box[2] + CONNECTOR_TEXT_CLEARANCE_PX * 2,
                text_box[3] + CONNECTOR_TEXT_CLEARANCE_PX * 2,
            ]
            if segment_intersects_box(segment[0], segment[1], expanded_box):
                connector_clearance_count += 1
                findings.append(
                    issue(
                        "error",
                        "connector-text-clearance",
                        f"{object_label(connector)} 进入 {object_label(text_element)} 外扩 "
                        f"{CONNECTOR_TEXT_CLEARANCE_PX:.0f}px 的文字安全区；须移动连接线、标签或节点",
                        slide,
                    )
                )
                if connector_clearance_count >= 20:
                    findings.append(
                        issue(
                            "error",
                            "connector-clearance-cap",
                            "本页连接线文字安全距离错误已截断为 20 条",
                            slide,
                        )
                    )
                    break
        if connector_clearance_count >= 20:
            break

    wireframes = [
        object_label(element)
        for element in usable
        if is_large_wireframe(element, fw, fh)
    ]
    if len(wireframes) >= 3:
        findings.append(
            issue(
                "warning",
                "wireframe-heavy",
                f"发现 {len(wireframes)} 个大面积空心线框容器；优先改为实心重点块、浅色分区或无边框对齐。示例："
                + "、".join(wireframes[:4]),
                slide,
            )
        )

    narrative_bodies = [
        element for element in usable if normalized_label(element) == "standard-narrative-body"
    ]
    callouts = [
        element
        for element in usable
        if any(
            token in normalized_label(element)
            for token in ("takeaway", "conclusion", "callout", "summary-block")
        )
    ]
    for body in narrative_bodies:
        required_height = standard_narrative_required_height(body)
        body_box = body["_box"]
        if required_height is not None and required_height > body_box[3] + 1.0:
            findings.append(
                issue(
                    "error",
                    "standard-narrative-text-overflow",
                    f"{object_label(body)} 按真实行数、字号和 150% 行距至少需要 "
                    f"{required_height:.1f}px，高于文本框 {body_box[3]:.1f}px",
                    slide,
                )
            )
        actual_bottom = body_box[1] + max(body_box[3], required_height or body_box[3])
        for callout in callouts:
            callout_box = callout["_box"]
            if horizontal_intersection(body_box, callout_box) <= 4:
                continue
            gap = callout_box[1] - actual_bottom
            if -callout_box[3] < gap < 16.0:
                findings.append(
                    issue(
                        "error",
                        "narrative-callout-clearance",
                        f"{object_label(body)} 的实际文字底边与 {object_label(callout)} "
                        f"仅相隔 {gap:.1f}px；至少需要 16px",
                        slide,
                    )
                )

    chart_labels = [element for element in usable if is_chart_category_label(element)]
    chart_marks = [element for element in usable if is_chart_data_mark(element)]
    for label in chart_labels:
        for mark in chart_marks:
            common = intersection(label["_box"], mark["_box"])
            if common > 16.0:
                findings.append(
                    issue(
                        "error",
                        "chart-label-mark-overlap",
                        f"{object_label(label)} 与数据标记 {object_label(mark)} 相交 "
                        f"{common:.1f}px²；须为类别标签保留独立槽位",
                        slide,
                    )
                )

    for callout in (element for element in usable if is_advisory_callout(element)):
        alignments = paragraph_alignments(callout)
        non_left = sorted(
            value
            for value in alignments
            if value not in {"", "left", "start", "l", "none"}
        )
        if non_left:
            findings.append(
                issue(
                    "error",
                    "advisory-callout-not-left-aligned",
                    f"{object_label(callout)} 的建议/结论文本对齐为 {', '.join(non_left)}；必须左对齐",
                    slide,
                )
            )

    grouped_table_elements = [
        element for element in usable if normalized_label(element).startswith("grouped-table-")
    ]
    if grouped_table_elements:
        for element in grouped_table_elements:
            label = normalized_label(element)
            geometry = str(element.get("geometry") or "").lower()
            if (
                any(token in label for token in ("rule", "separator", "divider"))
                or geometry in {"line", "straightconnector1"}
            ):
                findings.append(
                    issue(
                        "error",
                        "grouped-table-separator-line",
                        f"{object_label(element)} 是分组表正文分隔线；模式 B/C 必须改用底色和留白分层",
                        slide,
                    )
                )

    overlap_count = 0
    for index, first in enumerate(usable):
        if is_connector(first):
            continue
        a = first["_box"]
        a_area = area(a)
        if a_area <= 16 or a_area > fw * fh * 0.60:
            continue
        for second in usable[index + 1 :]:
            if is_connector(second):
                continue
            b = second["_box"]
            b_area = area(b)
            if b_area <= 16 or b_area > fw * fh * 0.60:
                continue
            common = intersection(a, b)
            smaller = min(a_area, b_area)
            if smaller <= 0 or common <= 40:
                continue
            ratio = common / smaller
            if ratio >= 0.96:
                continue
            if ratio >= 0.25:
                overlap_count += 1
                findings.append(
                    issue(
                        "warning",
                        "overlap-review",
                        f"{object_label(first)} 与 {object_label(second)} 重叠 {ratio:.0%}（需视觉判定）",
                        slide,
                    )
                )
                if overlap_count >= 25:
                    findings.append(issue("warning", "overlap-cap", "本页重叠警告已截断为 25 条", slide))
                    break
        if overlap_count >= 25:
            break

    return slide, findings, object_index


def validate_frame_map(
    path: Path,
    expected_slides: set[int],
    layout_objects: dict[int, dict[str, dict[str, Any]]],
) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [issue("error", "invalid-frame-map", f"无法读取映射：{exc}", 0)]

    pages = data.get("outputSlides")
    if not isinstance(pages, list) or not pages:
        return [
            issue(
                "error",
                "missing-output-slides",
                "template-frame-map.json 必须包含非空 outputSlides 数组",
                0,
            )
        ]

    findings: list[dict[str, Any]] = []
    mapped_slides: set[int] = set()
    content_slides: list[int] = []
    for entry in pages:
        if not isinstance(entry, dict):
            findings.append(issue("error", "invalid-slide-map", "页映射必须是对象", 0))
            continue
        try:
            slide = int(entry.get("outputSlide"))
        except (TypeError, ValueError):
            findings.append(issue("error", "invalid-output-slide", "outputSlide 必须是 1-based 整数", 0))
            continue
        if slide in mapped_slides:
            findings.append(issue("error", "duplicate-output-slide", "outputSlides 中页码重复", slide))
        mapped_slides.add(slide)

        declared_page_kind = entry.get("pageKind")
        page_kind: str | None = (
            str(declared_page_kind) if has_content(declared_page_kind) else None
        )
        content_page = False
        binding = entry.get("visualTextBinding")
        if not isinstance(binding, dict):
            findings.append(
                issue(
                    "error",
                    "missing-visual-text-binding",
                    "每页必须提供 visualTextBinding；普通内容页不得只有文字",
                    slide,
                )
            )
        elif binding.get("exempt") is True:
            page_kind = binding.get("pageKind")
            reason = binding.get("reason")
            if page_kind not in VISUAL_EXEMPT_PAGE_KINDS or weak_reuse_reason(reason):
                findings.append(
                    issue(
                        "error",
                        "invalid-visual-exemption",
                        "仅固定封面、目录、法务和纯结束页可豁免，且必须填写具体原因",
                        slide,
                    )
                )
        else:
            content_slides.append(slide)
            content_page = True
            missing_binding = [
                name for name in VISUAL_TEXT_BINDING_FIELDS if not has_content(binding.get(name))
            ]
            if missing_binding:
                findings.append(
                    issue(
                        "error",
                        "incomplete-visual-text-binding",
                        "图文语义绑定缺少具体字段：" + "、".join(missing_binding),
                        slide,
                    )
                )
            else:
                visual_type = binding.get("visualType")
                if visual_type not in VISUAL_TYPES:
                    findings.append(
                        issue(
                            "error",
                            "invalid-visual-type",
                            f"visualType 必须为 {sorted(VISUAL_TYPES)} 之一",
                            slide,
                        )
                    )
                if weak_visual_binding(binding):
                    findings.append(
                        issue(
                            "error",
                            "weak-visual-relevance",
                            "视觉必须具体说明支撑的主张、选用原因和独立承载的信息，不能只写美观、装饰或与主题相关",
                            slide,
                        )
                    )
                visual_ids = binding.get("visualObjectIds")
                if not isinstance(visual_ids, list) or not visual_ids:
                    findings.append(
                        issue(
                            "error",
                            "invalid-visual-object-ids",
                            "visualObjectIds 必须是非空对象 ID 数组",
                            slide,
                        )
                    )
                else:
                    known_objects = layout_objects.get(slide, {})
                    unknown = [
                        str(value)
                        for value in visual_ids
                        if str(value).strip() not in known_objects
                    ]
                    if unknown:
                        findings.append(
                            issue(
                                "error",
                                "missing-visual-object",
                                "声明的视觉对象未出现在对应布局 JSON："
                                + "、".join(unknown[:8]),
                                slide,
                            )
                        )

        if content_page:
            missing_footer = missing_footer_furniture(layout_objects.get(slide, {}))
            if missing_footer:
                findings.append(
                    issue(
                        "error",
                        "missing-brand-footer-furniture",
                        "普通内容页必须保留完整品牌页脚，当前缺少："
                        + "、".join(missing_footer),
                        slide,
                    )
                )

        mode = entry.get("buildMode")
        if mode not in BUILD_MODES:
            findings.append(
                issue(
                    "error",
                    "invalid-build-mode",
                    f"buildMode 必须为 {sorted(BUILD_MODES)} 之一",
                    slide,
                )
            )
            continue

        try:
            module_count = int(entry.get("moduleCount") or 0)
        except (TypeError, ValueError):
            module_count = -1
        alignment_groups = entry.get("alignmentGroups")
        if mode != "reuse" and module_count >= 2 and not (
            isinstance(alignment_groups, list) and alignment_groups
        ):
            findings.append(
                issue(
                    "error",
                    "missing-alignment-groups",
                    "含两个及以上模块的原创/受控重组页必须声明 alignmentGroups，"
                    "记录同级对象的边缘、尺寸、基线或间距约束",
                    slide,
                )
            )
        findings.extend(
            alignment_group_findings(alignment_groups, layout_objects.get(slide, {}), slide)
        )

        for target in entry.get("editTargets") or []:
            if not isinstance(target, dict):
                continue
            role = str(target.get("textRole") or "").strip().lower().replace("_", "-")
            if role not in BODY_LEFT_ALIGNED_ROLES:
                continue
            raw_ids = target.get("finalShapeIds")
            if not isinstance(raw_ids, list):
                raw_ids = [
                    value
                    for value in (target.get("finalShapeId"), target.get("shapeId"))
                    if value is not None
                ]
            for value in raw_ids:
                element = layout_objects.get(slide, {}).get(str(value).strip())
                if not element:
                    continue
                non_left = sorted(
                    alignment
                    for alignment in paragraph_alignments(element)
                    if alignment not in LEFT_ALIGNMENT_VALUES
                )
                if non_left:
                    findings.append(
                        issue(
                            "error",
                            "body-text-not-left-aligned",
                            f"{object_label(element)} 在映射中声明为 {role}，实际使用 "
                            f"{', '.join(non_left)} 对齐；正文角色必须左对齐",
                            slide,
                        )
                    )

        if page_kind == "cover":
            profile = entry.get("coverProfile")
            if profile not in COVER_PROFILES:
                findings.append(
                    issue(
                        "error",
                        "invalid-cover-profile",
                        f"固定封面必须声明 coverProfile，且只能为 {sorted(COVER_PROFILES)} 之一",
                        slide,
                    )
                )
            if mode != "reuse":
                findings.append(
                    issue(
                        "error",
                        "cover-must-reuse",
                        "封面是固定标准页，buildMode 必须为 reuse；不得原创或受控重组封面",
                        slide,
                    )
                )
            expected_source = COVER_PROFILES.get(profile)
            source_slide = entry.get("sourceSlide")
            if expected_source is not None:
                try:
                    source_slide_number = int(source_slide)
                except (TypeError, ValueError):
                    source_slide_number = -1
                if source_slide_number != expected_source:
                    findings.append(
                        issue(
                            "error",
                            "cover-source-slide-mismatch",
                            f"{profile} 必须复用源第 {expected_source} 页",
                            slide,
                        )
                    )
            elif profile == "user-template":
                try:
                    valid_source_slide = int(source_slide) >= 1
                except (TypeError, ValueError):
                    valid_source_slide = False
                if not valid_source_slide:
                    findings.append(
                        issue(
                            "error",
                            "missing-cover-source-slide",
                            "user-template 封面必须声明 1-based sourceSlide",
                            slide,
                        )
                    )

        if mode == "reuse":
            eligibility = entry.get("reuseEligibility")
            if not isinstance(eligibility, dict):
                findings.append(
                    issue(
                        "error",
                        "missing-reuse-eligibility",
                        "直接复用页必须提供 reuseEligibility",
                        slide,
                    )
                )
                continue
            failed = [name for name in REUSE_QUALIFIERS if eligibility.get(name) is not True]
            if failed:
                findings.append(
                    issue(
                        "error",
                        "unqualified-direct-reuse",
                        "直接复用资格未全部满足：" + "、".join(failed),
                        slide,
                    )
                )
            if weak_reuse_reason(eligibility.get("reason")):
                findings.append(
                    issue(
                        "error",
                        "weak-reuse-reason",
                        "直接复用原因必须具体，不能只写可以换字、版面相近或套用模板",
                        slide,
                    )
                )
        else:
            decision = entry.get("layoutDecision")
            if not isinstance(decision, dict):
                findings.append(
                    issue(
                        "error",
                        "missing-layout-decision",
                        "原创或受控重组页必须提供 layoutDecision",
                        slide,
                    )
                )
                continue
            missing = [name for name in LAYOUT_DECISION_FIELDS if not has_content(decision.get(name))]
            if missing:
                findings.append(
                    issue(
                        "error",
                        "incomplete-layout-decision",
                        "布局决策缺少具体字段：" + "、".join(missing),
                        slide,
                    )
                )

    if len(content_slides) >= 6:
        standard_names = {
            "standard-narrative-title",
            "standard-narrative-body",
            "standard-visual-title",
        }
        standard_slides: list[int] = []
        for slide in content_slides:
            names = {
                str(value).strip().lower()
                for value in layout_objects.get(slide, {})
            }
            if standard_names.issubset(names):
                standard_slides.append(slide)
        minimum = math.ceil(len(content_slides) / 3)
        if len(standard_slides) < minimum:
            findings.append(
                issue(
                    "error",
                    "insufficient-standard-evidence-layouts",
                    f"普通内容页 {len(content_slides)} 页，基础证据双区页仅 {len(standard_slides)} 页；"
                    f"至少需要 {minimum} 页（普通内容页的三分之一）",
                    0,
                )
            )

    for slide in sorted(expected_slides - mapped_slides):
        findings.append(
            issue(
                "error",
                "unmapped-layout-slide",
                "存在布局 JSON，但 template-frame-map.json 没有对应 outputSlide",
                slide,
            )
        )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="检查规范化的易方达逐页布局 JSON。")
    parser.add_argument("layout_dir", type=Path)
    parser.add_argument(
        "--map",
        type=Path,
        help="可选：校验布局决策、直接复用资格、图文语义绑定和视觉对象存在性",
    )
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--warnings-as-errors", action="store_true")
    args = parser.parse_args()

    paths = sorted(args.layout_dir.expanduser().resolve().glob("*.layout.json"))
    if not paths:
        print(f"No .layout.json files found in {args.layout_dir}", file=sys.stderr)
        return 2

    findings: list[dict[str, Any]] = []
    slides: list[int] = []
    layout_objects: dict[int, dict[str, dict[str, Any]]] = {}
    for path in paths:
        slide, file_findings, object_index = analyze_file(path)
        slides.append(slide)
        layout_objects[slide] = object_index
        findings.extend(file_findings)
    if args.map:
        findings.extend(
            validate_frame_map(args.map.expanduser().resolve(), set(slides), layout_objects)
        )
    report = {
        "layoutDir": str(args.layout_dir.expanduser().resolve()),
        "templateFrameMap": str(args.map.expanduser().resolve()) if args.map else None,
        "slides": slides,
        "errorCount": sum(item["severity"] == "error" for item in findings),
        "warningCount": sum(item["severity"] == "warning" for item in findings),
        "issues": findings,
    }
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Layouts: {len(paths)}")
    print(f"Errors: {report['errorCount']}; Warnings: {report['warningCount']}")
    for item in findings:
        print(f"[{item['severity'].upper()}] {item['code']} slide={item['slide']}: {item['message']}")

    failed = report["errorCount"] > 0 or (args.warnings_as_errors and report["warningCount"] > 0)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

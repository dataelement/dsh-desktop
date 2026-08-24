#!/usr/bin/env python3
"""Flag templated, slogan-like wording in visible PowerPoint slide text."""

from __future__ import annotations

import argparse
import json
import posixpath
import re
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


@dataclass(frozen=True)
class Rule:
    code: str
    pattern: re.Pattern[str]
    message: str
    rewrite: str


RULES = (
    Rule(
        "contrast-not-but",
        re.compile(r"(?:不是|不只是|不再是|并非|绝非)[^。！？；\n]{1,48}?[，,]?(?:而是|而在于)"),
        "避免用“不是……而是……”制造修辞性反差",
        "直接写明对象、变化和结果；确有两种方案时改用共同维度比较",
    ),
    Rule(
        "not-only-more",
        re.compile(r"(?:不仅|不只)[^。！？；\n]{1,48}?[，,；;](?:更|而且|还|也)"),
        "避免用“不仅……更/而且……”堆叠价值判断",
        "拆成具体动作与可验证结果",
    ),
    Rule(
        "three-more",
        re.compile(
            r"更[^，。！？；\n]{1,12}[、，]更[^，。！？；\n]{1,12}[、，]更[^，。！？；\n]{1,12}"
        ),
        "避免连续三个“更……”形成无证据排比",
        "分别给出时长、数量、风险或交付变化",
    ),
    Rule(
        "make-truly",
        re.compile(r"让[^。！？；\n]{1,28}真正(?:成为|实现|释放|发挥)"),
        "“让……真正……”通常缺少具体动作",
        "写明前置条件、执行动作和可观察结果",
    ),
    Rule(
        "slogan-engine",
        re.compile(r"(?:打造|构建|成为|培育|注入)[^。！？；\n]{0,24}(?:新引擎|新动能|新范式)"),
        "避免“打造新引擎/新范式”等口号化表达",
        "改写为具体能力、流程变化或业务指标",
    ),
    Rule(
        "slogan-new-chapter",
        re.compile(r"(?:开启|书写|共创)[^。！？；\n]{0,20}(?:新篇章|新未来)"),
        "避免“开启新篇章/共创新未来”等宣传口号",
        "直接陈述下一阶段交付、责任和时间",
    ),
    Rule(
        "slogan-leap",
        re.compile(r"(?:实现|推动|完成|引领)[^。！？；\n]{0,24}(?:跃迁|蝶变)"),
        "避免“实现跃迁/蝶变”等不可验证表述",
        "说明能力提升的具体维度、基线和目标",
    ),
    Rule(
        "vague-empower",
        re.compile(
            r"(?:全面|深度|持续|智能|精准|高效|科技|AI|数据|平台)?赋能"
            r"(?:业务|发展|增长|转型|创新|未来|组织|行业|千行百业|提质增效)"
        ),
        "“赋能业务/增长/转型”没有说明实际动作",
        "改成支持、缩短、减少、统一、自动推送等具体动作，并补充结果",
    ),
    Rule(
        "slogan-closed-loop",
        re.compile(r"(?:打造|构建|形成)[^。！？；\n]{0,20}(?:智能|业务|管理|价值)?闭环"),
        "避免用“打造闭环”替代流程说明",
        "写清触发条件、处理步骤、反馈结果和责任主体",
    ),
    Rule(
        "boilerplate-wave",
        re.compile(r"在[^，。！？；\n]{1,24}(?:浪潮|时代|大背景)下"),
        "避免用宏大背景作为无信息量开场",
        "从本页直接相关的事实、问题或变化切入",
    ),
    Rule(
        "boilerplate-with-development",
        re.compile(r"随着[^，。！？；\n]{1,28}不断(?:发展|演进|深入|加速)"),
        "避免“随着……不断发展”式通用开场",
        "写明发生了什么具体变化及其业务影响",
    ),
)


def issue(
    severity: str,
    code: str,
    message: str,
    slide: int,
    shape_id: str,
    shape_name: str,
    text: str,
    rewrite: str,
) -> dict[str, Any]:
    return {
        "severity": severity,
        "code": code,
        "message": message,
        "slide": slide,
        "shapeId": shape_id,
        "shapeName": shape_name,
        "text": text,
        "rewrite": rewrite,
    }


def rels_part(part: str) -> str:
    folder, name = posixpath.split(part)
    return posixpath.join(folder, "_rels", f"{name}.rels")


def relationships(
    archive: zipfile.ZipFile,
    part: str,
) -> dict[str, tuple[str, str]]:
    rel_part = rels_part(part)
    if rel_part not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read(rel_part))
    result: dict[str, tuple[str, str]] = {}
    for rel in root.findall(f"{{{PR}}}Relationship"):
        rel_id = rel.get("Id")
        target = rel.get("Target")
        if rel_id and target:
            result[rel_id] = (target, rel.get("TargetMode") or "Internal")
    return result


def resolve_target(part: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(part), target))


def presentation_info(
    archive: zipfile.ZipFile,
) -> tuple[tuple[int, int], list[str]]:
    part = "ppt/presentation.xml"
    root = ET.fromstring(archive.read(part))
    size = root.find("p:sldSz", NS)
    if size is None:
        raise ValueError("ppt/presentation.xml 缺少 p:sldSz")
    canvas = (int(size.get("cx") or 0), int(size.get("cy") or 0))
    rels = relationships(archive, part)
    slide_parts: list[str] = []
    for slide_id in root.findall("./p:sldIdLst/p:sldId", NS):
        rel_id = slide_id.get(f"{{{R}}}id")
        target = rels.get(str(rel_id))
        if not target or target[1] != "Internal":
            raise ValueError(f"无法解析逻辑页关系 {rel_id}")
        slide_parts.append(resolve_target(part, target[0]))
    return canvas, slide_parts


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


def visible_text_objects(
    root: ET.Element,
    canvas: tuple[int, int],
) -> list[tuple[str, str, str]]:
    tree = root.find(".//p:spTree", NS)
    if tree is None:
        return []
    result: list[tuple[str, str, str]] = []
    for element in list(tree):
        kind = element.tag.rsplit("}", 1)[-1]
        if kind not in {"sp", "graphicFrame", "grpSp"}:
            continue
        c_nv_pr = element.find(".//p:cNvPr", NS)
        if c_nv_pr is None or c_nv_pr.get("hidden") in {"1", "true"}:
            continue
        geometry = element_geometry(element)
        if geometry is not None and not on_canvas(geometry, canvas):
            continue
        paragraphs = []
        for paragraph in element.findall(".//a:p", NS):
            text = "".join(node.text or "" for node in paragraph.findall(".//a:t", NS)).strip()
            if text:
                paragraphs.append(text)
        text = "\n".join(paragraphs).strip()
        if text:
            result.append(
                (
                    str(c_nv_pr.get("id") or ""),
                    str(c_nv_pr.get("name") or ""),
                    text,
                )
            )
    return result


def page_metadata(map_path: Path | None) -> dict[int, dict[str, Any]]:
    if map_path is None:
        return {}
    data = json.loads(map_path.read_text(encoding="utf-8"))
    pages = data.get("outputSlides")
    if not isinstance(pages, list):
        raise ValueError("映射必须包含 outputSlides 数组")
    result: dict[int, dict[str, Any]] = {}
    for page in pages:
        if isinstance(page, dict):
            result[int(page.get("outputSlide"))] = page
    return result


def parse_cli_allow(values: list[str]) -> set[tuple[int, str, str | None]]:
    result: set[tuple[int, str, str | None]] = set()
    for value in values:
        parts = value.split(":")
        if len(parts) not in {2, 3}:
            raise ValueError(f"--allow 必须为 页码:ShapeID[:规则代码]，实际为 {value!r}")
        result.add((int(parts[0]), parts[1], parts[2] if len(parts) == 3 else None))
    return result


def map_allows(page: dict[str, Any], shape_id: str, code: str) -> bool:
    exemptions = page.get("writingStyleExemptions")
    if not isinstance(exemptions, list):
        return False
    for exemption in exemptions:
        if not isinstance(exemption, dict):
            continue
        if str(exemption.get("shapeId") or "") != shape_id:
            continue
        reason = exemption.get("reason")
        if not isinstance(reason, str) or len(reason.strip()) < 4:
            continue
        codes = exemption.get("codes")
        if codes == "*" or (
            isinstance(codes, list) and (code in codes or "*" in codes)
        ):
            return True
    return False


def page_kind(page: dict[str, Any]) -> str | None:
    direct = page.get("pageKind")
    if isinstance(direct, str):
        return direct
    binding = page.get("visualTextBinding")
    if isinstance(binding, dict) and isinstance(binding.get("pageKind"), str):
        return str(binding.get("pageKind"))
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="检查易方达 PPT 中的模板化、口号化文案。")
    parser.add_argument("pptx", type=Path)
    parser.add_argument("--map", type=Path)
    parser.add_argument("--allow", action="append", default=[], metavar="SLIDE:SHAPE[:CODE]")
    parser.add_argument("--json-output", type=Path)
    parser.add_argument("--warnings-as-errors", action="store_true")
    args = parser.parse_args()

    findings: list[dict[str, Any]] = []
    pptx = args.pptx.expanduser().resolve()
    try:
        allows = parse_cli_allow(args.allow)
        pages = page_metadata(args.map.expanduser().resolve() if args.map else None)
        with zipfile.ZipFile(pptx) as archive:
            canvas, slide_parts = presentation_info(archive)
            for slide, part in enumerate(slide_parts, start=1):
                page = pages.get(slide, {})
                if page_kind(page) == "legal":
                    continue
                root = ET.fromstring(archive.read(part))
                for shape_id, shape_name, text in visible_text_objects(root, canvas):
                    for rule in RULES:
                        match = rule.pattern.search(text)
                        if not match:
                            continue
                        if (
                            (slide, shape_id, None) in allows
                            or (slide, shape_id, rule.code) in allows
                            or map_allows(page, shape_id, rule.code)
                        ):
                            continue
                        findings.append(
                            issue(
                                "warning",
                                rule.code,
                                rule.message,
                                slide,
                                shape_id,
                                shape_name,
                                match.group(0),
                                rule.rewrite,
                            )
                        )
    except (
        OSError,
        TypeError,
        ValueError,
        KeyError,
        zipfile.BadZipFile,
        ET.ParseError,
        json.JSONDecodeError,
    ) as exc:
        findings.append(
            issue(
                "error",
                "writing-style-check-failed",
                str(exc),
                0,
                "",
                "",
                "",
                "修复输入文件、页映射或参数后重试",
            )
        )

    report = {
        "pptx": str(pptx),
        "templateFrameMap": str(args.map.expanduser().resolve()) if args.map else None,
        "errorCount": sum(item["severity"] == "error" for item in findings),
        "warningCount": sum(item["severity"] == "warning" for item in findings),
        "issues": findings,
    }
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    print(f"Errors: {report['errorCount']}; Warnings: {report['warningCount']}")
    for finding in findings:
        print(
            f"[{finding['severity'].upper()}] {finding['code']} "
            f"slide={finding['slide']} shape={finding['shapeId']}: "
            f"{finding['message']}；命中“{finding['text']}”；建议：{finding['rewrite']}"
        )
    failed = report["errorCount"] > 0 or (
        args.warnings_as_errors and report["warningCount"] > 0
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
会议纪要结构化校验工具。

检查 Markdown 格式的会议纪要是否满足结构化要求：
- 必填章节完整性
- 行动项表格格式
- 日期格式规范性
- 议题数量一致性
"""

import re
import sys
from pathlib import Path


REQUIRED_META_FIELDS = ["日期", "时间", "地点", "主持人", "记录人", "参会人"]

REQUIRED_SECTIONS = [
    "议题概览",
    "详细记录",
    "行动项汇总",
]

DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")
TOPIC_HEADER_PATTERN = re.compile(r"^###\s+议题\s*\d+[：:]\s*\S+", re.MULTILINE)
TOPIC_OVERVIEW_ROW = re.compile(r"\|\s*议题\s*\d+[：:].+\|")
ACTION_TABLE_ROW = re.compile(
    r"\|\s*\d+\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|"
)


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []

    def error(self, msg: str):
        self.errors.append(msg)

    def warn(self, msg: str):
        self.warnings.append(msg)

    def add_info(self, msg: str):
        self.info.append(msg)

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0

    def report(self) -> str:
        lines = []
        lines.append("=" * 50)
        lines.append("  会议纪要结构校验报告")
        lines.append("=" * 50)
        lines.append("")

        if self.info:
            for item in self.info:
                lines.append(f"  ℹ️  {item}")
            lines.append("")

        if self.errors:
            lines.append(f"❌ 错误 ({len(self.errors)}):")
            for item in self.errors:
                lines.append(f"   • {item}")
            lines.append("")

        if self.warnings:
            lines.append(f"⚠️  警告 ({len(self.warnings)}):")
            for item in self.warnings:
                lines.append(f"   • {item}")
            lines.append("")

        if self.passed:
            lines.append("✅ 校验通过！纪要结构完整。")
        else:
            lines.append(f"❌ 校验未通过，共 {len(self.errors)} 个错误需要修复。")

        lines.append("")
        return "\n".join(lines)


def read_file(path: str) -> str:
    file_path = Path(path)
    if not file_path.exists():
        print(f"错误：文件不存在 - {path}", file=sys.stderr)
        sys.exit(1)
    if not file_path.suffix.lower() in (".md", ".markdown", ".txt"):
        print(f"警告：文件不是 Markdown 格式 - {path}", file=sys.stderr)
    return file_path.read_text(encoding="utf-8")


def check_title(content: str, result: ValidationResult):
    if re.search(r"^#\s+会议纪要[：:]", content, re.MULTILINE):
        result.add_info("标题格式正确")
    else:
        result.error("缺少标题行（应以 '# 会议纪要：' 开头）")


def check_meta_fields(content: str, result: ValidationResult):
    meta_block_match = re.search(
        r"\|\s*项目\s*\|\s*内容\s*\|.*?(?=\n---|\n##|\Z)",
        content,
        re.DOTALL,
    )
    if not meta_block_match:
        result.error("未找到元信息表格（项目 | 内容）")
        return

    meta_block = meta_block_match.group()
    for field in REQUIRED_META_FIELDS:
        if field not in meta_block:
            result.error(f"元信息缺少必填字段：{field}")
        else:
            row_match = re.search(
                rf"\|\s*{re.escape(field)}\s*\|\s*(.*?)\s*\|", meta_block
            )
            if row_match:
                value = row_match.group(1).strip()
                if not value or value in ("未知", "N/A", ""):
                    result.warn(f"字段 '{field}' 的值为空或未知")


def check_required_sections(content: str, result: ValidationResult):
    for section in REQUIRED_SECTIONS:
        if re.search(rf"^#{{1,3}}\s+.*{re.escape(section)}", content, re.MULTILINE):
            result.add_info(f"章节 '{section}' 存在")
        else:
            result.error(f"缺少必填章节：{section}")


def check_topic_consistency(content: str, result: ValidationResult):
    overview_topics = TOPIC_OVERVIEW_ROW.findall(content)
    detail_topics = TOPIC_HEADER_PATTERN.findall(content)

    overview_count = len(overview_topics)
    detail_count = len(detail_topics)

    result.add_info(f"议题概览：{overview_count} 个，详细记录：{detail_count} 个")

    if overview_count == 0 and detail_count == 0:
        result.error("未找到任何议题")
    elif overview_count != detail_count:
        result.warn(
            f"议题概览数量（{overview_count}）与详细记录数量（{detail_count}）不一致"
        )


def check_action_items(content: str, result: ValidationResult):
    summary_match = re.search(
        r"##\s*行动项汇总(.*?)(?=\n##|\Z)", content, re.DOTALL
    )
    if not summary_match:
        result.warn("未找到行动项汇总章节")
        return

    summary_block = summary_match.group(1)
    action_rows = ACTION_TABLE_ROW.findall(summary_block)
    result.add_info(f"行动项汇总表：{len(action_rows)} 条")

    if len(action_rows) == 0:
        result.warn("行动项汇总表为空")
        return

    for i, row in enumerate(action_rows, 1):
        cells = [c.strip() for c in row.split("|") if c.strip()]
        if len(cells) < 4:
            result.error(f"行动项第 {i} 行列数不足（需至少 4 列：序号、任务、负责人、截止日期）")
            continue

        task_desc = cells[1] if len(cells) > 1 else ""
        owner = cells[2] if len(cells) > 2 else ""
        deadline = cells[3] if len(cells) > 3 else ""

        if not task_desc or task_desc == "...":
            continue

        if not owner or owner in ("待确认", "TBD", ""):
            result.warn(f"行动项 {i}：负责人为空或待确认（'{owner}'）")

        if deadline and deadline not in ("待确认", "TBD"):
            if not DATE_PATTERN.search(deadline):
                result.warn(
                    f"行动项 {i}：截止日期格式不规范（'{deadline}'），建议使用 YYYY-MM-DD"
                )


def check_action_count_consistency(content: str, result: ValidationResult):
    detail_section = re.search(
        r"##\s*详细记录(.*?)(?=\n##\s*行动项汇总|\Z)", content, re.DOTALL
    )
    if not detail_section:
        return

    detail_block = detail_section.group(1)
    detail_action_rows = ACTION_TABLE_ROW.findall(detail_block)
    detail_count = sum(
        1 for r in detail_action_rows
        if not re.match(r"\|\s*\.\.\.", r)
    )

    summary_match = re.search(
        r"##\s*行动项汇总(.*?)(?=\n##|\Z)", content, re.DOTALL
    )
    if not summary_match:
        return

    summary_block = summary_match.group(1)
    summary_action_rows = ACTION_TABLE_ROW.findall(summary_block)
    summary_count = sum(
        1 for r in summary_action_rows
        if not re.match(r"\|\s*\.\.\.", r)
    )

    if detail_count > 0 and summary_count > 0 and detail_count != summary_count:
        result.warn(
            f"各议题行动项合计（{detail_count}）与汇总表（{summary_count}）数量不一致"
        )


def check_dates_format(content: str, result: ValidationResult):
    date_candidates = re.findall(
        r"\d{1,4}[/\-.年]\d{1,2}[/\-.月]\d{1,4}[日]?", content
    )
    non_standard = []
    for d in date_candidates:
        if not DATE_PATTERN.fullmatch(d):
            non_standard.append(d)

    if non_standard:
        unique = list(set(non_standard))[:5]
        result.warn(
            f"发现非标准日期格式：{', '.join(unique)}（建议统一为 YYYY-MM-DD）"
        )


def validate(content: str) -> ValidationResult:
    result = ValidationResult()
    check_title(content, result)
    check_meta_fields(content, result)
    check_required_sections(content, result)
    check_topic_consistency(content, result)
    check_action_items(content, result)
    check_action_count_consistency(content, result)
    check_dates_format(content, result)
    return result


def main():
    if len(sys.argv) < 2:
        print("用法：python3 validate_minutes.py <会议纪要.md>", file=sys.stderr)
        print("", file=sys.stderr)
        print("对 Markdown 格式的会议纪要进行结构化校验，检查：", file=sys.stderr)
        print("  - 必填章节是否存在", file=sys.stderr)
        print("  - 行动项表格格式是否完整", file=sys.stderr)
        print("  - 截止日期格式是否规范", file=sys.stderr)
        print("  - 议题概览与详细记录数量是否一致", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    content = read_file(file_path)
    result = validate(content)
    print(result.report())
    sys.exit(0 if result.passed else 1)


if __name__ == "__main__":
    main()

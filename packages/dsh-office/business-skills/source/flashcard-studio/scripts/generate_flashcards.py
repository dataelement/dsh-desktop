#!/usr/bin/env python3
"""
Flashcard Generator — 从学习材料提取知识点，生成 Anki 兼容 CSV。

支持两种模式：
  auto  — 基于规则从 Markdown/文本中提取定义、Q&A、列表等
  json  — 接收预构造的 JSON 闪卡数据，格式化为 Anki CSV

用法：
  python generate_flashcards.py --input notes.md --output flashcards.csv
  python generate_flashcards.py --mode json --input cards.json --output out.csv
  cat notes.md | python generate_flashcards.py > flashcards.csv
"""

import argparse
import csv
import json
import os
import re
import sys


# ---------------------------------------------------------------------------
# Markdown / text parsing
# ---------------------------------------------------------------------------

def parse_markdown(text):
    """将 Markdown 文本解析为嵌套 section 树。"""
    lines = text.strip().split("\n")
    root = {"title": "", "level": 0, "content": [], "subsections": []}
    stack = [root]

    for line in lines:
        hdr = re.match(r"^(#{1,6})\s+(.+)$", line)
        if hdr:
            level = len(hdr.group(1))
            node = {"title": hdr.group(2).strip(), "level": level, "content": [], "subsections": []}
            while len(stack) > 1 and stack[-1]["level"] >= level:
                stack.pop()
            stack[-1]["subsections"].append(node)
            stack.append(node)
        else:
            stripped = line.strip()
            if stripped:
                stack[-1]["content"].append(stripped)

    return root


# ---------------------------------------------------------------------------
# Knowledge-point extractors
# ---------------------------------------------------------------------------

_DEFINITION_PATTERNS = [
    re.compile(r"^[*\-•]?\s*\*{0,2}(.+?)\*{0,2}\s*[：:]\s*(.+)$"),
    re.compile(r"^[*\-•]?\s*\*{0,2}(.+?)\*{0,2}\s*[—–]\s*(.+)$"),
]

_GENERIC_LABELS = frozenset({
    "场所", "条件", "原料", "产物", "时间", "地点", "方法", "目的", "特点",
    "结果", "步骤", "功能", "过程", "对象", "类型", "分类", "来源", "用途", "意义",
})


def _is_chinese(text):
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def _make_def_question(term):
    return f"什么是{term}？" if _is_chinese(term) else f"What is {term}?"


def extract_definitions(text):
    """从 "术语: 定义" 或 "术语 — 定义" 模式中提取闪卡。"""
    cards = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        for pat in _DEFINITION_PATTERNS:
            m = pat.match(line)
            if m:
                term = m.group(1).strip().strip("*").strip("_")
                defn = m.group(2).strip()
                if len(term) > 1 and len(defn) > 5 and term not in _GENERIC_LABELS:
                    cards.append({"front": _make_def_question(term), "back": defn, "tags": "definition"})
                break
    return cards


def extract_qa_pairs(text):
    """提取已有的 Q/A 问答对。"""
    cards = []
    lines = text.strip().split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        qm = re.match(r"^[QqＱ问]\s*[：:.]\s*(.+)$", line)
        if qm and i + 1 < len(lines):
            am = re.match(r"^[AaＡ答]\s*[：:.]\s*(.+)$", lines[i + 1].strip())
            if am:
                cards.append({"front": qm.group(1).strip(), "back": am.group(1).strip(), "tags": "qa"})
                i += 2
                continue
        i += 1
    return cards


def extract_list_items(section):
    """从 section 标题 + 列表项中生成闪卡。"""
    cards = []
    title = section.get("title", "")
    items = []

    for line in section.get("content", []):
        lm = re.match(r"^[\-*•]\s+(.+)$", line) or re.match(r"^\d+[.)]\s+(.+)$", line)
        if lm:
            items.append(lm.group(1))

    if title and len(items) >= 2:
        front = (f"{title}的关键要点有哪些？" if _is_chinese(title)
                 else f"What are the key points of {title}?")
        back_html = "<ul>" + "".join(f"<li>{it}</li>" for it in items) + "</ul>"
        cards.append({"front": front, "back": back_html, "tags": "list"})

    for item in items:
        sep = "：" if "：" in item else (":" if ":" in item else None)
        if sep:
            parts = item.split(sep, 1)
            term = parts[0].strip().strip("*").strip("_")
            defn = parts[1].strip()
            if len(term) > 1 and len(defn) > 5 and term not in _GENERIC_LABELS:
                cards.append({"front": _make_def_question(term), "back": defn, "tags": "definition"})

    return cards


def extract_from_paragraphs(section):
    """从 section 标题 + 段落文本中生成闪卡。"""
    cards = []
    title = section.get("title", "")
    paras = [
        line for line in section.get("content", [])
        if not re.match(r"^[\-*•]\s+", line)
        and not re.match(r"^\d+[.)]\s+", line)
        and not re.match(r"^[QqＱ问AaＡ答]\s*[：:.]\s*", line)
    ]
    if title and paras:
        content = " ".join(paras)
        if len(content) > 20:
            front = f"请解释：{title}" if _is_chinese(title) else f"Explain: {title}"
            cards.append({"front": front, "back": content, "tags": "concept"})
    return cards


def _walk_sections(section):
    """递归遍历 section 树，提取所有闪卡。"""
    cards = []
    full_text = "\n".join(section.get("content", []))
    cards.extend(extract_definitions(full_text))
    cards.extend(extract_qa_pairs(full_text))
    cards.extend(extract_list_items(section))
    cards.extend(extract_from_paragraphs(section))
    for sub in section.get("subsections", []):
        cards.extend(_walk_sections(sub))
    return cards


def deduplicate(cards):
    """按 front 字段去重。"""
    seen = set()
    result = []
    for c in cards:
        key = c["front"].lower().strip()
        if key not in seen:
            seen.add(key)
            result.append(c)
    return result


def auto_extract(text):
    """Auto 模式入口：规则提取 + 去重。"""
    root = parse_markdown(text)
    cards = _walk_sections(root)
    cards.extend(extract_definitions(text))
    cards.extend(extract_qa_pairs(text))
    return deduplicate(cards)


# ---------------------------------------------------------------------------
# JSON input
# ---------------------------------------------------------------------------

def load_json_cards(text):
    """从 JSON 数组加载闪卡，兼容多种字段名。"""
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("JSON input must be an array of flashcard objects")
    cards = []
    for item in data:
        cards.append({
            "front": str(item.get("front", item.get("question", item.get("q", "")))),
            "back": str(item.get("back", item.get("answer", item.get("a", "")))),
            "tags": str(item.get("tags", item.get("tag", ""))),
        })
    return cards


# ---------------------------------------------------------------------------
# CSV output
# ---------------------------------------------------------------------------

_SEPARATOR_NAMES = {"\t": "Tab", ";": "Semicolon", ",": "Comma"}


def _sanitize(text):
    """清理字段文本，将 Markdown 标记转为 HTML。"""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.+?)\*", r"<i>\1</i>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    return text.strip()


def write_anki_csv(cards, out, separator="\t", include_tags=True):
    """将闪卡列表写为 Anki 兼容 CSV。"""
    sep_name = _SEPARATOR_NAMES.get(separator, "Tab")
    out.write(f"#separator:{sep_name}\n")
    out.write("#html:true\n")
    col_sep = separator
    if include_tags:
        out.write(f"#columns:Front{col_sep}Back{col_sep}Tags\n")
    else:
        out.write(f"#columns:Front{col_sep}Back\n")

    writer = csv.writer(out, delimiter=separator, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    for card in cards:
        front = _sanitize(card.get("front", ""))
        back = _sanitize(card.get("back", ""))
        if not front or not back:
            continue
        if include_tags:
            writer.writerow([front, back, card.get("tags", "")])
        else:
            writer.writerow([front, back])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="从学习材料提取知识点，生成 Anki 兼容闪卡 CSV。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s --input notes.md --output flashcards.csv
  %(prog)s --mode json --input cards.json --output flashcards.csv
  cat notes.md | %(prog)s > flashcards.csv
  echo '[{"front":"Q","back":"A"}]' | %(prog)s --mode json
        """,
    )
    parser.add_argument("--input", "-i", help="输入文件路径（默认 stdin）")
    parser.add_argument("--output", "-o", help="输出 CSV 路径（默认 stdout）")
    parser.add_argument("--mode", "-m", choices=["auto", "json"], default="auto",
                        help="提取模式：auto（规则提取）或 json（结构化输入）")
    parser.add_argument("--no-tags", action="store_true", help="不输出 tags 列")
    parser.add_argument("--separator", "-s", default="\t", choices=["\t", ";", ","],
                        help="CSV 分隔符（默认 Tab）")
    args = parser.parse_args()

    # 读取输入
    if args.input:
        input_path = os.path.realpath(args.input)
        with open(input_path, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("Error: 输入内容为空", file=sys.stderr)
        sys.exit(1)

    # 提取闪卡
    if args.mode == "json":
        cards = load_json_cards(text)
    else:
        cards = auto_extract(text)

    if not cards:
        print("Warning: 未能从输入内容中提取到闪卡。", file=sys.stderr)
        sys.exit(0)

    # 写出 CSV
    if args.output:
        output_path = os.path.realpath(args.output)
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            write_anki_csv(cards, f, separator=args.separator, include_tags=not args.no_tags)
        print(f"已生成 {len(cards)} 张闪卡 → {args.output}", file=sys.stderr)
    else:
        write_anki_csv(out=sys.stdout, cards=cards, separator=args.separator, include_tags=not args.no_tags)
        print(f"已生成 {len(cards)} 张闪卡", file=sys.stderr)


if __name__ == "__main__":
    main()

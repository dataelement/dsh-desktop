#!/usr/bin/env python3
"""
Citation Formatter — APA / MLA / IEEE / Harvard 参考文献格式转换工具
支持格式转换、批量处理、格式错误检查

仅依赖 Python 标准库，无需外部包或 API Key。
"""

import sys
import json
import re
import argparse
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple, Optional
from pathlib import Path

STYLES = ("apa", "mla", "ieee", "harvard")


# ═══════════════════════════════════════════════════════
#  Data Model
# ═══════════════════════════════════════════════════════

@dataclass
class Citation:
    authors: List[str] = field(default_factory=list)
    year: str = ""
    title: str = ""
    journal: str = ""
    volume: str = ""
    issue: str = ""
    pages: str = ""
    publisher: str = ""
    doi: str = ""
    url: str = ""
    entry_type: str = "article"
    edition: str = ""
    city: str = ""
    accessed_date: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: v for k, v in d.items() if v and v != []}

    @classmethod
    def from_dict(cls, d: dict) -> "Citation":
        valid = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        return cls(**valid)


# ═══════════════════════════════════════════════════════
#  Author helpers
# ═══════════════════════════════════════════════════════

def _initials(first_names: str) -> List[str]:
    return re.findall(r"[A-ZÀ-Ú]", first_names)


def _split_name(name: str) -> Tuple[str, str]:
    name = name.strip()
    if "," in name:
        last, first = name.split(",", 1)
        return last.strip(), first.strip()
    parts = name.split()
    if len(parts) >= 2:
        return parts[-1], " ".join(parts[:-1])
    return name, ""


def _author_apa(name: str) -> str:
    last, first = _split_name(name)
    inits = _initials(first)
    return f"{last}, {'. '.join(inits)}." if inits else last


def _author_mla_first(name: str) -> str:
    last, first = _split_name(name)
    return f"{last}, {first}" if first else last


def _author_mla_subsequent(name: str) -> str:
    last, first = _split_name(name)
    return f"{first} {last}" if first else last


def _author_ieee(name: str) -> str:
    last, first = _split_name(name)
    inits = _initials(first)
    return f"{'. '.join(inits)}. {last}" if inits else last


def _author_harvard(name: str) -> str:
    last, first = _split_name(name)
    inits = _initials(first)
    return f"{last}, {''.join(i + '.' for i in inits)}" if inits else last


def _join_authors(parts: List[str], sep: str = ",", conj: str = "and") -> str:
    if len(parts) == 0:
        return ""
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} {conj} {parts[1]}"
    return f"{sep} ".join(parts[:-1]) + f"{sep} {conj} {parts[-1]}"


# ═══════════════════════════════════════════════════════
#  Formatters
# ═══════════════════════════════════════════════════════

def format_apa(c: Citation) -> str:
    authors = _join_authors([_author_apa(a) for a in c.authors], ",", "&")
    out = f"{authors} ({c.year}). {c.title}"
    if c.entry_type == "article" and c.journal:
        out += f". {c.journal}"
        if c.volume:
            out += f", {c.volume}"
        if c.issue:
            out += f"({c.issue})"
        if c.pages:
            out += f", {c.pages}"
        out += "."
    elif c.entry_type == "book":
        if c.edition:
            out += f" ({c.edition} ed.)"
        out += "."
        if c.publisher:
            out += f" {c.publisher}."
    else:
        out += "."
        if c.publisher:
            out += f" {c.publisher}."
    out += _doi_suffix_apa(c)
    return out


def format_mla(c: Citation) -> str:
    if len(c.authors) == 0:
        authors = ""
    elif len(c.authors) == 1:
        authors = _author_mla_first(c.authors[0])
    elif len(c.authors) == 2:
        authors = f"{_author_mla_first(c.authors[0])}, and {_author_mla_subsequent(c.authors[1])}"
    else:
        authors = f"{_author_mla_first(c.authors[0])}, et al."

    authors = authors.rstrip(".")
    if c.entry_type == "article" and c.journal:
        out = f'{authors}. "{c.title}." {c.journal}'
        if c.volume:
            out += f", vol. {c.volume}"
        if c.issue:
            out += f", no. {c.issue}"
        if c.year:
            out += f", {c.year}"
        if c.pages:
            out += f", pp. {c.pages}"
        out += "."
    else:
        out = f"{authors}. {c.title}."
        if c.edition:
            out += f" {c.edition} ed.,"
        if c.publisher:
            out += f" {c.publisher},"
        if c.year:
            out += f" {c.year}"
        out += "."
    out += _doi_suffix_mla(c)
    return out


def format_ieee(c: Citation, number: int = 1) -> str:
    authors = _join_authors([_author_ieee(a) for a in c.authors], ",", "and")
    if c.entry_type == "article" and c.journal:
        out = f'[{number}] {authors}, "{c.title}," {c.journal}'
        if c.volume:
            out += f", vol. {c.volume}"
        if c.issue:
            out += f", no. {c.issue}"
        if c.pages:
            out += f", pp. {c.pages}"
        if c.year:
            out += f", {c.year}"
        out += "."
    else:
        out = f"[{number}] {authors}, {c.title}."
        if c.city and c.publisher:
            out += f" {c.city}: {c.publisher}"
        elif c.publisher:
            out += f" {c.publisher}"
        if c.year:
            out += f", {c.year}."
        else:
            out += "."
    out += _doi_suffix_ieee(c)
    return out


def format_harvard(c: Citation) -> str:
    authors = _join_authors([_author_harvard(a) for a in c.authors], ",", "and")
    if c.entry_type == "article" and c.journal:
        out = f"{authors} ({c.year}) '{c.title}', {c.journal}"
        if c.volume:
            out += f", {c.volume}"
        if c.issue:
            out += f"({c.issue})"
        if c.pages:
            out += f", pp. {c.pages}"
        out += "."
    else:
        out = f"{authors} ({c.year}) {c.title}."
        if c.edition:
            out += f" {c.edition} edn."
        if c.city and c.publisher:
            out += f" {c.city}: {c.publisher}."
        elif c.publisher:
            out += f" {c.publisher}."
    out += _doi_suffix_harvard(c)
    return out


def _doi_url(c: Citation) -> str:
    if c.doi:
        return c.doi if c.doi.startswith("http") else f"https://doi.org/{c.doi}"
    return ""


def _doi_suffix_apa(c: Citation) -> str:
    url = _doi_url(c)
    if url:
        return f" {url}"
    if c.url:
        return f" {c.url}"
    return ""


def _doi_suffix_mla(c: Citation) -> str:
    url = _doi_url(c)
    if url:
        return f" {url}."
    if c.url:
        return f" {c.url}."
    return ""


def _doi_suffix_ieee(c: Citation) -> str:
    if c.doi:
        bare = c.doi if not c.doi.startswith("http") else c.doi.replace("https://doi.org/", "")
        return f" doi: {bare}."
    return ""


def _doi_suffix_harvard(c: Citation) -> str:
    url = _doi_url(c)
    if url:
        return f" doi: {url}"
    if c.url:
        s = f" Available at: {c.url}"
        if c.accessed_date:
            s += f" (Accessed: {c.accessed_date})"
        return s + "."
    return ""


FORMATTERS = {
    "apa": format_apa,
    "mla": format_mla,
    "ieee": format_ieee,
    "harvard": format_harvard,
}


# ═══════════════════════════════════════════════════════
#  Parsers
# ═══════════════════════════════════════════════════════

def _extract_doi(text: str) -> Tuple[str, str]:
    m = re.search(r"(?:https?://doi\.org/|doi:\s*)(10\.\d{4,}/[^\s,;]+)", text)
    if m:
        doi = m.group(1).rstrip(".")
        return doi, (text[: m.start()] + text[m.end() :]).strip()
    return "", text


def _extract_url(text: str) -> Tuple[str, str]:
    m = re.search(r"(https?://[^\s,;]+)", text)
    if m:
        url = m.group(1).rstrip(".")
        return url, (text[: m.start()] + text[m.end() :]).strip()
    return "", text


def _normalize_author(name: str) -> str:
    name = name.strip().rstrip(".")
    if not name or name.lower() == "et al":
        return ""
    if "," in name:
        return name.strip()
    parts = name.split()
    if len(parts) >= 2:
        is_init = [bool(re.match(r"^[A-ZÀ-Ú]\.?$", p)) for p in parts]
        if any(is_init):
            idx = next((i for i, v in enumerate(is_init) if not v), len(parts))
            inits = parts[:idx]
            rest = parts[idx:]
            if rest:
                last = " ".join(rest)
                init_str = " ".join(i if i.endswith(".") else i + "." for i in inits)
                return f"{last}, {init_str}"
        return f"{parts[-1]}, {' '.join(parts[:-1])}"
    return name


def detect_style(text: str) -> str:
    text = text.strip()
    if re.match(r"^\[\d+\]", text):
        return "ieee"
    if re.search(r"\(\d{4}[a-z]?\)\.\s", text):
        return "apa"
    if re.search(r"'[^']+'\s*,", text) and re.search(r"\(\d{4}\)", text):
        return "harvard"
    if re.search(r"\(\d{4}[a-z]?\)\s+[^.]", text):
        return "harvard"
    if re.search(r'"[^"]+"', text):
        return "mla"
    return "unknown"


def parse_apa(text: str) -> Citation:
    c = Citation()
    c.doi, text = _extract_doi(text)
    if not c.doi:
        c.url, text = _extract_url(text)

    m = re.search(r"\((\d{4}[a-z]?)\)\.\s*", text)
    if not m:
        c.title = text
        return c
    c.year = m.group(1)
    author_part = text[: m.start()].strip().rstrip(",").strip()
    rest = text[m.end() :].strip()

    raw = re.split(r",\s*&\s*|\s+&\s+", author_part)
    authors = []
    for seg in raw:
        found = re.findall(
            r"([A-ZÀ-Ú][a-zà-ú]+(?:[-'][A-ZÀ-Ú][a-zà-ú]+)?)\s*,\s*([A-ZÀ-Ú]\.(?:\s*[A-ZÀ-Ú]\.)*)",
            seg,
        )
        if found:
            for last, inits in found:
                authors.append(f"{last}, {inits}")
        elif seg.strip():
            authors.append(seg.strip())
    c.authors = authors or [author_part]

    am = re.match(r"(.+?)\.\s+(.+?),\s*(\d+)\((\d+)\),\s*([\d\u2013\-]+)", rest)
    if am:
        c.title, c.journal, c.volume, c.issue, c.pages = (
            am.group(1),
            am.group(2),
            am.group(3),
            am.group(4),
            am.group(5),
        )
        c.entry_type = "article"
        return c

    am2 = re.match(r"(.+?)\.\s+(.+?),\s*(\d+),\s*([\d\u2013\-]+)", rest)
    if am2:
        c.title, c.journal, c.volume, c.pages = (
            am2.group(1),
            am2.group(2),
            am2.group(3),
            am2.group(4),
        )
        c.entry_type = "article"
        return c

    parts = rest.split(". ")
    c.title = parts[0].strip() if parts else rest.rstrip(".")
    if len(parts) >= 2:
        remaining = ". ".join(parts[1:]).rstrip(". ").strip()
        if remaining:
            c.publisher = remaining
    c.entry_type = "book" if c.publisher else "article"
    return c


def parse_mla(text: str) -> Citation:
    c = Citation()
    c.doi, text = _extract_doi(text)
    if not c.doi:
        c.url, text = _extract_url(text)

    am = re.match(r"(.+?)\.\s+\"([^\"]+)\"\.\s*(.+)", text)
    if am:
        author_part, c.title, rest = am.group(1), am.group(2), am.group(3)
        jm = re.match(
            r"(.+?),\s*vol\.\s*(\d+),\s*no\.\s*(\d+),\s*(\d{4}),\s*pp\.\s*([\d\u2013\-]+)",
            rest,
        )
        if jm:
            c.journal, c.volume, c.issue, c.year, c.pages = (
                jm.group(1),
                jm.group(2),
                jm.group(3),
                jm.group(4),
                jm.group(5),
            )
            c.entry_type = "article"
        else:
            ym = re.search(r"(\d{4})", rest)
            if ym:
                c.year = ym.group(1)
                c.journal = rest[: ym.start()].strip().rstrip(",").strip()
            c.entry_type = "article"
    else:
        parts = text.split(". ")
        author_part = parts[0].strip() if parts else text
        if len(parts) >= 2:
            c.title = parts[1].strip()
        if len(parts) >= 3:
            tail = ". ".join(parts[2:]).rstrip(". ").strip()
            ym = re.search(r"(\d{4})", tail)
            if ym:
                c.year = ym.group(1)
                c.publisher = tail[: ym.start()].strip().rstrip(",").strip()
            else:
                c.publisher = tail
        c.entry_type = "book" if c.publisher else "article"

    if ", and " in author_part:
        first, second = author_part.split(", and ", 1)
        c.authors = [a for a in [_normalize_author(first), _normalize_author(second)] if a]
    elif " and " in author_part:
        first, second = author_part.split(" and ", 1)
        c.authors = [a for a in [_normalize_author(first), _normalize_author(second)] if a]
    else:
        a = author_part.replace(", et al.", "").replace(" et al.", "")
        c.authors = [_normalize_author(a)] if a else []
    return c


def parse_ieee(text: str) -> Citation:
    c = Citation()
    c.doi, text = _extract_doi(text)
    if not c.doi:
        c.url, text = _extract_url(text)

    text = re.sub(r"^\[\d+\]\s*", "", text).strip()

    qm = re.match(r"(.+?),\s*\"([^\"]+),?\"\s*,?\s*(.+)", text)
    if qm:
        author_part, c.title, rest = qm.group(1), qm.group(2).rstrip(","), qm.group(3)
        c.title = c.title.strip()
        vm = re.search(r"vol\.\s*(\d+)", rest)
        nm = re.search(r"no\.\s*(\d+)", rest)
        pm = re.search(r"pp\.\s*([\d\u2013\-]+)", rest)
        ym = re.search(r"(\d{4})", rest)
        jparts = rest.split(",")
        if jparts:
            j = jparts[0].strip().rstrip(",")
            if not re.match(r"(vol\.|no\.|pp\.|\d{4})", j):
                c.journal = j
        if vm:
            c.volume = vm.group(1)
        if nm:
            c.issue = nm.group(1)
        if pm:
            c.pages = pm.group(1)
        if ym:
            c.year = ym.group(1)
        c.entry_type = "article" if c.journal else "book"
    else:
        parts = text.split(",", 1)
        author_part = parts[0].strip()
        if len(parts) > 1:
            rest = parts[1].strip().rstrip(".")
            c.title = rest
            ym = re.search(r"(\d{4})", rest)
            if ym:
                c.year = ym.group(1)
        c.entry_type = "book"

    raw_authors = re.split(r",\s*and\s+|\s+and\s+", author_part)
    c.authors = [_normalize_author(a) for a in raw_authors if a.strip()]
    return c


def parse_harvard(text: str) -> Citation:
    c = Citation()
    c.doi, text = _extract_doi(text)
    if not c.doi:
        c.url, text = _extract_url(text)

    am = re.search(r"Available at:\s*", text)
    if am:
        text = text[: am.start()].strip()

    ym = re.search(r"\((\d{4}[a-z]?)\)\s*", text)
    if not ym:
        c.title = text
        return c
    c.year = ym.group(1)
    author_part = text[: ym.start()].strip()
    rest = text[ym.end() :].strip()

    qm = re.match(r"'([^']+)'\s*,\s*(.+)", rest)
    if qm:
        c.title = qm.group(1)
        tail = qm.group(2).strip().rstrip(".")
        parts = tail.split(",")
        c.journal = parts[0].strip() if parts else ""
        vm = re.search(r"(\d+)\((\d+)\)", tail)
        if vm:
            c.volume, c.issue = vm.group(1), vm.group(2)
        elif parts and len(parts) > 1:
            vm2 = re.search(r"(\d+)", parts[1] if len(parts) > 1 else "")
            if vm2:
                c.volume = vm2.group(1)
        pm = re.search(r"pp?\.\s*([\d\u2013\-]+)", tail)
        if pm:
            c.pages = pm.group(1)
        c.entry_type = "article"
    else:
        parts = rest.split(".")
        c.title = parts[0].strip() if parts else rest
        if len(parts) >= 2:
            c.publisher = parts[1].strip()
        c.entry_type = "book" if c.publisher else "article"

    raw_authors = re.split(r"\s+and\s+", author_part)
    c.authors = [_normalize_author(a) for a in raw_authors if a.strip()]
    return c


PARSERS = {
    "apa": parse_apa,
    "mla": parse_mla,
    "ieee": parse_ieee,
    "harvard": parse_harvard,
}


def parse_auto(text: str) -> Tuple[Citation, str]:
    style = detect_style(text)
    if style in PARSERS:
        return PARSERS[style](text), style
    for s in STYLES:
        try:
            c = PARSERS[s](text)
            if c.authors and c.title:
                return c, s
        except Exception:
            continue
    c = Citation(title=text)
    return c, "unknown"


# ═══════════════════════════════════════════════════════
#  Error Checker
# ═══════════════════════════════════════════════════════

def check_citation(c: Citation, style: str) -> List[Dict[str, str]]:
    errors: List[Dict[str, str]] = []

    if not c.authors:
        errors.append({"field": "authors", "severity": "error", "message": "缺少作者信息"})
    if not c.title:
        errors.append({"field": "title", "severity": "error", "message": "缺少标题"})
    if not c.year:
        errors.append({"field": "year", "severity": "error", "message": "缺少出版年份"})
    elif not re.match(r"^\d{4}[a-z]?$", c.year):
        errors.append({"field": "year", "severity": "error", "message": f"年份格式不正确: {c.year}"})

    if c.entry_type == "article":
        if not c.journal:
            errors.append({"field": "journal", "severity": "warning", "message": "期刊文章缺少期刊名称"})
        if not c.volume:
            errors.append({"field": "volume", "severity": "warning", "message": "缺少卷号 (volume)"})
        if not c.pages:
            errors.append({"field": "pages", "severity": "warning", "message": "缺少页码"})
    elif c.entry_type == "book":
        if not c.publisher:
            errors.append({"field": "publisher", "severity": "warning", "message": "书籍缺少出版社信息"})

    if c.pages and not re.match(r"^\d+[\-\u2013]\d+$|^\d+$", c.pages):
        errors.append({"field": "pages", "severity": "warning", "message": f"页码格式可能不正确: {c.pages}"})

    if c.doi and not re.match(r"^(https?://doi\.org/)?10\.\d{4,}/", c.doi):
        errors.append({"field": "doi", "severity": "warning", "message": f"DOI 格式可能不正确: {c.doi}"})

    for i, author in enumerate(c.authors):
        if "," not in author and len(author.split()) < 2:
            errors.append({
                "field": f"authors[{i}]",
                "severity": "warning",
                "message": f"作者姓名格式可能不完整: {author}",
            })

    if style == "apa":
        if c.title and c.title[0].islower():
            errors.append({
                "field": "title",
                "severity": "warning",
                "message": "APA 格式标题首字母应大写 (sentence case)",
            })

    return errors


def check_text(text: str, style: str) -> List[Dict[str, str]]:
    errors: List[Dict[str, str]] = []
    text = text.strip()

    if style == "apa":
        if not re.search(r"\(\d{4}", text):
            errors.append({"field": "format", "severity": "error", "message": "APA 格式缺少括号内的年份，如 (2023)"})
        if not re.search(r"\)\.", text):
            errors.append({"field": "format", "severity": "warning", "message": "APA 格式年份后应有句号: (2023)."})
    elif style == "mla":
        if not re.search(r'"[^"]+"', text) and not re.search(r"\d{4}\.", text):
            errors.append({"field": "format", "severity": "warning", "message": "MLA 期刊文章标题应用双引号包围"})
    elif style == "ieee":
        if not re.match(r"^\[\d+\]", text):
            errors.append({"field": "format", "severity": "error", "message": "IEEE 格式应以 [编号] 开头，如 [1]"})
        if not re.search(r'"[^"]+"', text):
            errors.append({"field": "format", "severity": "warning", "message": "IEEE 格式标题应用双引号包围"})
    elif style == "harvard":
        if not re.search(r"\(\d{4}\)", text):
            errors.append({"field": "format", "severity": "error", "message": "Harvard 格式缺少括号内的年份"})

    return errors


# ═══════════════════════════════════════════════════════
#  Batch Processing
# ═══════════════════════════════════════════════════════

def read_input(input_path: Optional[str]) -> List[str]:
    if input_path:
        p = Path(input_path)
        if not p.exists():
            print(json.dumps({"error": f"文件不存在: {input_path}"}, ensure_ascii=False), file=sys.stderr)
            sys.exit(1)
        content = p.read_text(encoding="utf-8")
    else:
        content = sys.stdin.read()

    content = content.strip()
    if not content:
        return []

    try:
        data = json.loads(content)
        if isinstance(data, list):
            return [json.dumps(item, ensure_ascii=False) if isinstance(item, dict) else str(item) for item in data]
        if isinstance(data, dict):
            return [content]
    except (json.JSONDecodeError, ValueError):
        pass

    return [line.strip() for line in content.split("\n") if line.strip()]


# ═══════════════════════════════════════════════════════
#  CLI
# ═══════════════════════════════════════════════════════

def cmd_format(args):
    lines = read_input(args.input)
    if args.data:
        lines = [args.data]
    results = []
    for i, line in enumerate(lines):
        try:
            d = json.loads(line)
            c = Citation.from_dict(d)
        except (json.JSONDecodeError, ValueError):
            results.append({"index": i, "error": f"无法解析 JSON: {line[:80]}"})
            continue
        fmt = FORMATTERS[args.style]
        if args.style == "ieee":
            text = fmt(c, number=i + 1)
        else:
            text = fmt(c)
        results.append({"index": i, "style": args.style, "formatted": text})

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            if "error" in r:
                print(f"ERROR: {r['error']}", file=sys.stderr)
            else:
                print(r["formatted"])


def cmd_parse(args):
    texts = []
    if args.citation:
        texts = [args.citation]
    else:
        texts = read_input(args.input)

    results = []
    for i, text in enumerate(texts):
        if args.style and args.style != "auto":
            c = PARSERS[args.style](text)
            detected = args.style
        else:
            c, detected = parse_auto(text)
        results.append({
            "index": i,
            "detected_style": detected,
            "citation": c.to_dict(),
            "original": text,
        })

    print(json.dumps(results if len(results) > 1 else results[0], ensure_ascii=False, indent=2))


def cmd_convert(args):
    texts = []
    if args.citation:
        texts = [args.citation]
    else:
        texts = read_input(args.input)

    results = []
    for i, text in enumerate(texts):
        try:
            d = json.loads(text)
            c = Citation.from_dict(d)
            src = "json"
        except (json.JSONDecodeError, ValueError):
            if args.source and args.source != "auto":
                c = PARSERS[args.source](text)
                src = args.source
            else:
                c, src = parse_auto(text)

        fmt = FORMATTERS[args.to]
        converted = fmt(c, number=i + 1) if args.to == "ieee" else fmt(c)
        entry = {
            "index": i,
            "source_style": src,
            "target_style": args.to,
            "original": text,
            "converted": converted,
        }
        results.append(entry)

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            print(r["converted"])


def cmd_check(args):
    texts = []
    if args.citation:
        texts = [args.citation]
    else:
        texts = read_input(args.input)

    all_results = []
    for i, text in enumerate(texts):
        try:
            d = json.loads(text)
            c = Citation.from_dict(d)
            struct_errors = check_citation(c, args.style)
            fmt_errors = []
        except (json.JSONDecodeError, ValueError):
            if args.style:
                c = PARSERS.get(args.style, parse_apa)(text)
            else:
                c, _ = parse_auto(text)
            struct_errors = check_citation(c, args.style or "apa")
            fmt_errors = check_text(text, args.style or "apa") if args.style else []

        errors = struct_errors + fmt_errors
        entry = {
            "index": i,
            "original": text[:200],
            "style": args.style or "auto",
            "errors": errors,
            "is_valid": len([e for e in errors if e["severity"] == "error"]) == 0,
        }
        all_results.append(entry)

    if args.json:
        print(json.dumps(all_results, ensure_ascii=False, indent=2))
    else:
        for r in all_results:
            status = "✓ PASS" if r["is_valid"] else "✗ FAIL"
            print(f"[{r['index']}] {status}")
            if r["errors"]:
                for e in r["errors"]:
                    tag = "ERROR" if e["severity"] == "error" else "WARN "
                    print(f"  {tag} [{e['field']}] {e['message']}")
            print()


def cmd_detect(args):
    texts = []
    if args.citation:
        texts = [args.citation]
    else:
        texts = read_input(args.input)

    results = []
    for i, text in enumerate(texts):
        style = detect_style(text)
        results.append({"index": i, "style": style, "text": text[:120]})

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            print(f"[{r['index']}] {r['style']}: {r['text']}")


def main():
    parser = argparse.ArgumentParser(
        description="Citation Formatter — APA/MLA/IEEE/Harvard 参考文献格式转换工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    # format
    p_fmt = sub.add_parser("format", help="将结构化 JSON 数据格式化为指定引用格式")
    p_fmt.add_argument("--style", required=True, choices=STYLES, help="目标引用格式")
    p_fmt.add_argument("--data", help="JSON 字符串（单条引用）")
    p_fmt.add_argument("--input", help="输入文件路径（JSON 数组或每行一条 JSON）")
    p_fmt.add_argument("--json", action="store_true", help="JSON 格式输出")

    # parse
    p_parse = sub.add_parser("parse", help="将引用文本解析为结构化 JSON")
    p_parse.add_argument("citation", nargs="?", help="引用文本")
    p_parse.add_argument("--style", choices=STYLES + ("auto",), default="auto", help="指定源格式（默认自动检测）")
    p_parse.add_argument("--input", help="输入文件路径")

    # convert
    p_conv = sub.add_parser("convert", help="在不同引用格式之间转换")
    p_conv.add_argument("citation", nargs="?", help="引用文本")
    p_conv.add_argument("--from", dest="source", choices=STYLES + ("auto",), default="auto", help="源格式")
    p_conv.add_argument("--to", required=True, choices=STYLES, help="目标格式")
    p_conv.add_argument("--input", help="输入文件路径")
    p_conv.add_argument("--json", action="store_true", help="JSON 格式输出")

    # check
    p_chk = sub.add_parser("check", help="检查引用格式是否正确")
    p_chk.add_argument("citation", nargs="?", help="引用文本或 JSON")
    p_chk.add_argument("--style", choices=STYLES, help="检查的目标格式")
    p_chk.add_argument("--input", help="输入文件路径")
    p_chk.add_argument("--json", action="store_true", help="JSON 格式输出")

    # detect
    p_det = sub.add_parser("detect", help="自动检测引用格式")
    p_det.add_argument("citation", nargs="?", help="引用文本")
    p_det.add_argument("--input", help="输入文件路径")
    p_det.add_argument("--json", action="store_true", help="JSON 格式输出")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    dispatch = {
        "format": cmd_format,
        "parse": cmd_parse,
        "convert": cmd_convert,
        "check": cmd_check,
        "detect": cmd_detect,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""日志分析工具：错误聚类 + 频率统计 + 时间分布，支持 JSON/syslog/Nginx 格式。"""

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

SYSLOG_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

SYSLOG_RE = re.compile(
    r"^(?P<month>[A-Z][a-z]{2})\s+(?P<day>\d{1,2})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<host>\S+)\s+"
    r"(?P<process>\S+?)(?:\[(?P<pid>\d+)\])?:\s+"
    r"(?P<message>.+)$"
)

NGINX_ACCESS_RE = re.compile(
    r'^(?P<ip>\S+)\s+\S+\s+\S+\s+'
    r'\[(?P<time>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<path>\S+)\s+\S+"\s+'
    r'(?P<status>\d{3})\s+(?P<size>\d+)'
    r'(?:\s+"(?P<referer>[^"]*)"\s+"(?P<ua>[^"]*)")?'
)

NGINX_ERROR_RE = re.compile(
    r"^(?P<time>\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s+"
    r"\[(?P<level>\w+)\]\s+"
    r"(?P<pid>\d+)#(?P<tid>\d+):\s+"
    r"(?:\*(?P<conn>\d+)\s+)?"
    r"(?P<message>.+)$"
)

NORMALIZE_PATTERNS = [
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b"), "<IP>"),
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I), "<UUID>"),
    (re.compile(r"\b0x[0-9a-fA-F]+\b"), "<HEX>"),
    (re.compile(r"(?<=/)\d+(?=/|$|\s)"), "<ID>"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"), "<TIMESTAMP>"),
    (re.compile(r"\b\d{10,13}\b"), "<EPOCH>"),
    (re.compile(r"\b\d+\.\d+(?:ms|s|m)\b"), "<DURATION>"),
    (re.compile(r"\b\d{4,}\b"), "<NUM>"),
    (re.compile(r'"/[^"]*"'), '"<PATH>"'),
]

ERROR_KEYWORDS = re.compile(
    r"\b(?:error|err|fail|fatal|crit|critical|panic|exception|traceback"
    r"|refus|timeout|deni|reject|abort|crash|segfault|oom|kill)\w*\b",
    re.I,
)

LEVEL_PRIORITY = {
    "EMERGENCY": 0, "EMERG": 0,
    "ALERT": 1,
    "CRITICAL": 2, "CRIT": 2, "FATAL": 2,
    "ERROR": 3, "ERR": 3,
    "WARNING": 4, "WARN": 4,
    "NOTICE": 5,
    "INFO": 6,
    "DEBUG": 7,
    "TRACE": 8,
}


def normalize_message(msg: str) -> str:
    result = msg.strip()
    for pattern, replacement in NORMALIZE_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


def detect_format(lines: list[str]) -> str:
    for line in lines[:20]:
        line = line.strip()
        if not line:
            continue
        if line.startswith("{"):
            try:
                json.loads(line)
                return "json"
            except json.JSONDecodeError:
                pass
        if SYSLOG_RE.match(line):
            return "syslog"
        if NGINX_ACCESS_RE.match(line) or NGINX_ERROR_RE.match(line):
            return "nginx"
    return "json"


def parse_iso_time(ts: str) -> datetime | None:
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            return datetime.strptime(ts, fmt).replace(tzinfo=None)
        except ValueError:
            continue
    return None


def parse_json_line(line: str) -> dict | None:
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None

    ts_raw = obj.get("timestamp") or obj.get("time") or obj.get("@timestamp") or obj.get("ts") or ""
    ts = parse_iso_time(str(ts_raw))

    level = str(obj.get("level") or obj.get("severity") or obj.get("loglevel") or "").upper()

    msg = str(obj.get("message") or obj.get("msg") or obj.get("error") or obj.get("text") or "")
    if not msg:
        msg = json.dumps(obj, ensure_ascii=False)

    return {"timestamp": ts, "level": level, "message": msg, "raw": line}


def parse_syslog_line(line: str) -> dict | None:
    m = SYSLOG_RE.match(line)
    if not m:
        return None

    month = SYSLOG_MONTHS.get(m.group("month"), 1)
    day = int(m.group("day"))
    time_parts = m.group("time").split(":")
    now = datetime.now()
    try:
        ts = datetime(now.year, month, day, int(time_parts[0]), int(time_parts[1]), int(time_parts[2]))
    except (ValueError, IndexError):
        ts = None

    msg = m.group("message")
    level = ""
    level_match = re.match(r"^(?:(\w+):?\s+)?(.*)$", msg)
    if level_match and level_match.group(1) and level_match.group(1).upper() in LEVEL_PRIORITY:
        level = level_match.group(1).upper()
        msg = level_match.group(2)

    if not level and ERROR_KEYWORDS.search(msg):
        level = "ERROR"

    return {"timestamp": ts, "level": level, "message": msg, "raw": line}


def parse_nginx_line(line: str) -> dict | None:
    m = NGINX_ERROR_RE.match(line)
    if m:
        try:
            ts = datetime.strptime(m.group("time"), "%Y/%m/%d %H:%M:%S")
        except ValueError:
            ts = None
        level = m.group("level").upper()
        msg = m.group("message")
        return {"timestamp": ts, "level": level, "message": msg, "raw": line}

    m = NGINX_ACCESS_RE.match(line)
    if m:
        ts = None
        time_str = m.group("time")
        try:
            ts = datetime.strptime(time_str.split()[0], "%d/%b/%Y:%H:%M:%S")
        except ValueError:
            pass

        status = int(m.group("status"))
        if status >= 500:
            level = "ERROR"
        elif status >= 400:
            level = "WARN"
        else:
            level = "INFO"

        msg = f'{m.group("method")} {m.group("path")} -> {status}'
        return {"timestamp": ts, "level": level, "message": msg, "raw": line}

    return None


PARSERS = {
    "json": parse_json_line,
    "syslog": parse_syslog_line,
    "nginx": parse_nginx_line,
}


def is_error_level(level: str) -> bool:
    normalized = level.upper().strip()
    return LEVEL_PRIORITY.get(normalized, 99) <= 3


def parse_file(filepath: str, fmt: str, level_filter: str | None,
               since: datetime | None, until: datetime | None) -> tuple:
    path = Path(filepath)
    if not path.is_file():
        print(f"错误: 文件不存在 - {filepath}", file=sys.stderr)
        sys.exit(1)

    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not lines:
        print("错误: 文件为空", file=sys.stderr)
        sys.exit(1)

    if fmt == "auto":
        fmt = detect_format(lines)

    parser = PARSERS.get(fmt)
    if not parser:
        print(f"错误: 不支持的格式 '{fmt}'", file=sys.stderr)
        sys.exit(1)

    entries = []
    parse_fail = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        entry = parser(line)
        if entry is None:
            parse_fail += 1
            continue

        if level_filter and entry["level"] != level_filter.upper():
            continue
        if since and entry["timestamp"] and entry["timestamp"] < since:
            continue
        if until and entry["timestamp"] and entry["timestamp"] > until:
            continue

        entries.append(entry)

    return entries, len(lines), parse_fail, fmt


def cluster_errors(entries: list[dict]) -> list[dict]:
    error_entries = [e for e in entries if is_error_level(e.get("level", "")) or ERROR_KEYWORDS.search(e["message"])]

    cluster_map = defaultdict(list)
    for entry in error_entries:
        key = normalize_message(entry["message"])
        cluster_map[key].append(entry)

    clusters = []
    for normalized, members in cluster_map.items():
        sample = members[0]["message"]
        timestamps = [m["timestamp"] for m in members if m["timestamp"]]
        clusters.append({
            "pattern": normalized,
            "sample": sample,
            "count": len(members),
            "first_seen": min(timestamps).isoformat() if timestamps else None,
            "last_seen": max(timestamps).isoformat() if timestamps else None,
        })

    clusters.sort(key=lambda c: c["count"], reverse=True)
    return clusters


def compute_time_distribution(entries: list[dict]) -> tuple:
    hourly = Counter()
    daily = Counter()
    error_entries = [e for e in entries if is_error_level(e.get("level", "")) or ERROR_KEYWORDS.search(e["message"])]

    for entry in error_entries:
        ts = entry.get("timestamp")
        if not ts:
            continue
        hourly[ts.hour] += 1
        daily[ts.strftime("%Y-%m-%d")] += 1

    return hourly, daily


def bar_chart(value: int, max_value: int, width: int = 30) -> str:
    if max_value == 0:
        return "░" * width
    filled = int(value / max_value * width)
    return "█" * filled + "░" * (width - filled)


def print_report(entries, total_lines, parse_fail, fmt, clusters, hourly, daily, top_n):
    error_count = sum(c["count"] for c in clusters)
    timestamps = [e["timestamp"] for e in entries if e.get("timestamp")]

    print("=" * 55)
    print("              日志分析报告")
    print("=" * 55)

    print(f"\n📊 概览")
    print(f"  检测格式: {fmt}")
    print(f"  总行数:   {total_lines:,}")
    print(f"  已解析:   {len(entries) + parse_fail:,} (解析失败: {parse_fail:,})")
    print(f"  匹配条目: {len(entries):,}")
    print(f"  错误数:   {error_count:,}")
    if timestamps:
        print(f"  时间范围: {min(timestamps).strftime('%Y-%m-%d %H:%M:%S')} ~ {max(timestamps).strftime('%Y-%m-%d %H:%M:%S')}")

    if clusters:
        print(f"\n🔴 Top 错误聚类 (共 {len(clusters)} 类)")
        for i, c in enumerate(clusters[:top_n], 1):
            sample_short = c["sample"][:80] + ("..." if len(c["sample"]) > 80 else "")
            print(f"  #{i:<3} [×{c['count']:<5}] {sample_short}")
            if c["first_seen"]:
                print(f"       首次: {c['first_seen']}  末次: {c['last_seen']}")
    else:
        print("\n✅ 未发现错误")

    if hourly:
        print(f"\n⏰ 时间分布 (按小时)")
        max_h = max(hourly.values()) if hourly else 1
        for h in range(24):
            count = hourly.get(h, 0)
            print(f"  {h:02d}:00  {bar_chart(count, max_h, 20)}  {count:,}")

    if daily:
        print(f"\n📅 时间分布 (按日期)")
        max_d = max(daily.values()) if daily else 1
        for day in sorted(daily.keys()):
            count = daily[day]
            print(f"  {day}  {bar_chart(count, max_d, 20)}  {count:,}")

    print()


def build_json_report(entries, total_lines, parse_fail, fmt, clusters, hourly, daily):
    timestamps = [e["timestamp"] for e in entries if e.get("timestamp")]
    level_counts = Counter(e.get("level", "UNKNOWN") for e in entries)

    return {
        "summary": {
            "format": fmt,
            "total_lines": total_lines,
            "parsed_entries": len(entries) + parse_fail,
            "parse_failures": parse_fail,
            "matched_entries": len(entries),
            "error_count": sum(c["count"] for c in clusters),
            "cluster_count": len(clusters),
            "time_range": {
                "start": min(timestamps).isoformat() if timestamps else None,
                "end": max(timestamps).isoformat() if timestamps else None,
            },
            "level_distribution": dict(level_counts),
        },
        "error_clusters": clusters,
        "time_distribution": {
            "hourly": {f"{h:02d}:00": hourly.get(h, 0) for h in range(24)},
            "daily": dict(sorted(daily.items())),
        },
    }


def main():
    parser = argparse.ArgumentParser(
        description="日志分析工具：错误聚类 + 频率统计 + 时间分布"
    )
    parser.add_argument("log_file", help="日志文件路径")
    parser.add_argument("--format", choices=["auto", "json", "syslog", "nginx"],
                        default="auto", help="日志格式 (默认: auto)")
    parser.add_argument("--top", type=int, default=20, help="显示 Top N 错误聚类 (默认: 20)")
    parser.add_argument("--output", help="输出 JSON 报告到文件")
    parser.add_argument("--level", help="过滤日志级别 (如 ERROR, WARN)")
    parser.add_argument("--since", help="只分析此时间之后的日志 (ISO 格式)")
    parser.add_argument("--until", help="只分析此时间之前的日志 (ISO 格式)")

    args = parser.parse_args()

    since = parse_iso_time(args.since) if args.since else None
    until = parse_iso_time(args.until) if args.until else None

    entries, total_lines, parse_fail, fmt = parse_file(
        args.log_file, args.format, args.level, since, until
    )

    if not entries:
        print("未找到匹配的日志条目", file=sys.stderr)
        sys.exit(0)

    clusters = cluster_errors(entries)
    hourly, daily = compute_time_distribution(entries)

    print_report(entries, total_lines, parse_fail, fmt, clusters, hourly, daily, args.top)

    if args.output:
        report = build_json_report(entries, total_lines, parse_fail, fmt, clusters, hourly, daily)
        output_path = Path(args.output)
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"JSON 报告已保存到: {args.output}")


if __name__ == "__main__":
    main()

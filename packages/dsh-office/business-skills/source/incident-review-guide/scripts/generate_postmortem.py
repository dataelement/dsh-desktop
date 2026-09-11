#!/usr/bin/env python3
"""
Postmortem document generator.

Reads incident data from JSON (file or stdin) and produces a structured
Markdown postmortem document following SRE best practices.

Usage:
    python3 generate_postmortem.py --interactive
    python3 generate_postmortem.py --input incident.json --output postmortem.md
    echo '{"title":"..."}' | python3 generate_postmortem.py --format markdown
"""

import argparse
import json
import sys
import os
from datetime import datetime, timezone, timedelta

VALID_SEVERITIES = ("P0", "P1", "P2", "P3")
VALID_EVENT_TYPES = ("TRIGGER", "DETECT", "ACTION", "RESOLVE", "INFO")
VALID_ACTION_TYPES = ("mitigate", "detect", "prevent", "process")

EVENT_ICONS = {
    "TRIGGER": "\U0001f534",   # red circle
    "DETECT":  "\U0001f7e1",   # yellow circle
    "ACTION":  "\U0001f535",   # blue circle
    "RESOLVE": "\U0001f7e2",   # green circle
    "INFO":    "\u26aa",       # white circle
}

ACTION_ICONS = {
    "mitigate": "\U0001f525",  # fire
    "detect":   "\U0001f6e1\ufe0f",  # shield
    "prevent":  "\U0001f527",  # wrench
    "process":  "\U0001f4d6",  # book
}

SEVERITY_DESC_ZH = {
    "P0": "全站/核心业务不可用",
    "P1": "核心功能严重降级",
    "P2": "非核心功能受损",
    "P3": "轻微问题",
}

SEVERITY_DESC_EN = {
    "P0": "Total site / core business outage",
    "P1": "Severe degradation of core features",
    "P2": "Non-core feature impairment",
    "P3": "Minor issue",
}


def parse_datetime(s):
    """Parse an ISO-8601-ish datetime string into a datetime object."""
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
    ):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def format_duration(total_seconds):
    """Format seconds into human-readable duration string."""
    if total_seconds < 0:
        return "N/A"
    hours, remainder = divmod(total_seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h{minutes}m"
    return f"{minutes}m"


def compute_duration(start_str, end_str):
    """Return human-readable duration between two datetime strings."""
    start = parse_datetime(start_str)
    end = parse_datetime(end_str)
    if not start or not end:
        return "N/A"
    return format_duration(int((end - start).total_seconds()))


def compute_hhmm_diff(t1, t2):
    """Compute duration between two HH:MM strings (assumes same day or next day)."""
    try:
        h1, m1 = map(int, t1.split(":"))
        h2, m2 = map(int, t2.split(":"))
    except (ValueError, AttributeError):
        return None
    diff_minutes = (h2 * 60 + m2) - (h1 * 60 + m1)
    if diff_minutes < 0:
        diff_minutes += 24 * 60
    return format_duration(diff_minutes * 60)


def validate_data(data):
    """Validate incident data and return list of warnings."""
    warnings = []
    if not data.get("title"):
        warnings.append("missing required field: title")
    if data.get("severity") and data["severity"] not in VALID_SEVERITIES:
        warnings.append(f"invalid severity '{data['severity']}', expected one of {VALID_SEVERITIES}")
    for i, event in enumerate(data.get("timeline", [])):
        if event.get("type") and event["type"] not in VALID_EVENT_TYPES:
            warnings.append(f"timeline[{i}]: invalid type '{event['type']}', expected one of {VALID_EVENT_TYPES}")
    for i, item in enumerate(data.get("action_items", [])):
        if item.get("type") and item["type"] not in VALID_ACTION_TYPES:
            warnings.append(f"action_items[{i}]: invalid type '{item['type']}', expected one of {VALID_ACTION_TYPES}")
    return warnings


def prompt_input(prompt_text, default=None, required=False):
    """Read a line of input from the user with optional default."""
    suffix = f" [{default}]" if default else ""
    while True:
        value = input(f"{prompt_text}{suffix}: ").strip()
        if not value and default:
            return default
        if not value and required:
            print("  This field is required. Please enter a value.")
            continue
        return value


def prompt_list(prompt_text):
    """Read multiple lines until empty line."""
    print(f"{prompt_text} (enter empty line to finish):")
    items = []
    while True:
        line = input("  > ").strip()
        if not line:
            break
        items.append(line)
    return items


def interactive_collect():
    """Interactively collect incident data from the user."""
    print("=" * 60)
    print("  Postmortem - Interactive Data Collection")
    print("=" * 60)
    print()

    data = {}

    print("--- Step 1: Basic Information ---")
    data["title"] = prompt_input("Incident title", required=True)
    data["severity"] = prompt_input("Severity (P0/P1/P2/P3)", default="P1")
    data["start_time"] = prompt_input("Impact start time (e.g. 2024-03-15T14:32:00+08:00)", required=True)
    data["end_time"] = prompt_input("Impact end time", required=True)
    data["impact"] = prompt_input("Impact description", required=True)
    data["responders"] = prompt_list("Responders / on-call team members")

    print()
    print("--- Step 2: Timeline ---")
    print("Enter timeline events. Format: HH:MM TYPE description")
    print(f"  Valid types: {', '.join(VALID_EVENT_TYPES)}")
    timeline = []
    while True:
        line = input("  event> ").strip()
        if not line:
            break
        parts = line.split(None, 2)
        if len(parts) < 3:
            print("  Format: HH:MM TYPE description")
            continue
        timeline.append({"time": parts[0], "type": parts[1].upper(), "desc": parts[2]})
    data["timeline"] = timeline

    print()
    print("--- Step 3: 5 Whys Analysis ---")
    five_whys = []
    for i in range(1, 6):
        q = prompt_input(f"Why {i} - question")
        if not q:
            break
        a = prompt_input(f"Why {i} - answer")
        five_whys.append({"level": i, "question": q, "answer": a})
    extra = prompt_input("Continue deeper? (y/n)", default="n")
    if extra.lower() == "y":
        level = len(five_whys) + 1
        while True:
            q = prompt_input(f"Why {level} - question (empty to stop)")
            if not q:
                break
            a = prompt_input(f"Why {level} - answer")
            five_whys.append({"level": level, "question": q, "answer": a})
            level += 1
    data["five_whys"] = five_whys
    data["root_cause"] = prompt_input("Root cause summary", required=True)
    data["root_cause_category"] = prompt_input(
        "Root cause category (change/capacity/monitoring/dependency/process/design)",
        default="process",
    )

    print()
    print("--- Step 4: Action Items ---")
    action_items = []
    while True:
        desc = input("  action item description (empty to stop)> ").strip()
        if not desc:
            break
        ai = {"desc": desc}
        ai["type"] = prompt_input("    type (mitigate/detect/prevent/process)", default="mitigate")
        ai["owner"] = prompt_input("    owner")
        ai["due"] = prompt_input("    due date (YYYY-MM-DD)")
        ai["priority"] = prompt_input("    priority (P0/P1/P2)", default="P1")
        action_items.append(ai)
    data["action_items"] = action_items

    print()
    print("--- Step 5: Lessons Learned ---")
    data["lessons"] = {
        "keep_doing": prompt_list("What went well (keep doing)"),
        "improve": prompt_list("What to improve"),
        "lucky": prompt_list("Luck factors (lucky/unlucky)"),
    }

    return data


def render_markdown_zh(data, template="standard"):
    """Render incident data as a Chinese Markdown postmortem."""
    lines = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = data.get("title", "Untitled Incident")
    severity = data.get("severity", "N/A")
    duration = compute_duration(data.get("start_time", ""), data.get("end_time", ""))

    lines.append(f"# Postmortem: {title}")
    lines.append("")
    lines.append(f"> **Generated**: {now_str}  ")
    lines.append(f"> **Severity**: {severity} — {SEVERITY_DESC_ZH.get(severity, '')}  ")
    lines.append(f"> **Duration**: {duration}")
    lines.append("")

    lines.append("---")
    lines.append("")

    # Section 1: Overview
    lines.append("## 1. 事故概况")
    lines.append("")
    lines.append("| 字段 | 内容 |")
    lines.append("|---|---|")
    lines.append(f"| **事故标题** | {title} |")
    lines.append(f"| **严重等级** | {severity} |")
    lines.append(f"| **影响开始** | {data.get('start_time', 'N/A')} |")
    lines.append(f"| **影响结束** | {data.get('end_time', 'N/A')} |")
    lines.append(f"| **持续时长** | {duration} |")
    lines.append(f"| **影响范围** | {data.get('impact', 'N/A')} |")
    responders = data.get("responders", [])
    if responders:
        lines.append(f"| **响应团队** | {', '.join(responders)} |")
    lines.append("")

    # Section 2: Timeline
    lines.append("## 2. 事故时间线")
    lines.append("")
    timeline = data.get("timeline", [])
    if timeline:
        lines.append("| 时间 | 类别 | 事件 |")
        lines.append("|---|---|---|")
        for event in timeline:
            etype = event.get("type", "INFO")
            icon = EVENT_ICONS.get(etype, "")
            lines.append(f"| {event.get('time', '')} | {icon} {etype} | {event.get('desc', '')} |")
        lines.append("")

        # Compute metrics
        trigger_time = None
        detect_time = None
        resolve_time = None
        for event in timeline:
            t = event.get("time", "")
            if event.get("type") == "TRIGGER" and not trigger_time:
                trigger_time = t
            elif event.get("type") == "DETECT" and not detect_time:
                detect_time = t
            elif event.get("type") == "RESOLVE" and not resolve_time:
                resolve_time = t

        lines.append("**关键指标：**")
        lines.append("")
        if trigger_time and detect_time:
            ttd = compute_hhmm_diff(trigger_time, detect_time)
            ttd_str = f"{ttd} ({trigger_time} → {detect_time})" if ttd else f"{trigger_time} → {detect_time}"
            lines.append(f"- **TTD (Time to Detect)**: {ttd_str}")
        if detect_time and resolve_time:
            ttr = compute_hhmm_diff(detect_time, resolve_time)
            ttr_str = f"{ttr} ({detect_time} → {resolve_time})" if ttr else f"{detect_time} → {resolve_time}"
            lines.append(f"- **TTR (Time to Resolve)**: {ttr_str}")
        lines.append("")
    else:
        lines.append("*（未提供时间线数据）*")
        lines.append("")

    # Section 3: 5 Whys
    lines.append("## 3. 根因分析 (5 Whys)")
    lines.append("")
    five_whys = data.get("five_whys", [])
    if five_whys:
        for item in five_whys:
            level = item.get("level", "?")
            lines.append(f"**Why {level}: {item.get('question', '')}**")
            lines.append(f"> {item.get('answer', '')}")
            lines.append("")
    lines.append(f"**Root Cause**: {data.get('root_cause', 'N/A')}")
    lines.append("")
    rc_cat = data.get("root_cause_category", "")
    if rc_cat:
        lines.append(f"**Category**: {rc_cat}")
        lines.append("")

    # Section 4: Action Items
    lines.append("## 4. 改进措施 (Action Items)")
    lines.append("")
    action_items = data.get("action_items", [])
    if action_items:
        lines.append("| # | Type | Description | Owner | Due | Priority |")
        lines.append("|---|---|---|---|---|---|")
        for i, item in enumerate(action_items, 1):
            atype = item.get("type", "process")
            icon = ACTION_ICONS.get(atype, "")
            lines.append(
                f"| {i} | {icon} {atype.capitalize()} | {item.get('desc', '')} "
                f"| {item.get('owner', 'TBD')} | {item.get('due', 'TBD')} "
                f"| {item.get('priority', '')} |"
            )
        lines.append("")
    else:
        lines.append("*（未提供改进措施）*")
        lines.append("")

    # Section 5: Lessons
    lines.append("## 5. 经验教训")
    lines.append("")
    lessons = data.get("lessons", {})
    keep = lessons.get("keep_doing", [])
    improve = lessons.get("improve", [])
    lucky = lessons.get("lucky", [])

    if keep:
        lines.append("### Keep Doing")
        for item in keep:
            lines.append(f"- {item}")
        lines.append("")
    if improve:
        lines.append("### Improve")
        for item in improve:
            lines.append(f"- {item}")
        lines.append("")
    if lucky:
        lines.append("### Lucky / Unlucky")
        for item in lucky:
            lines.append(f"- {item}")
        lines.append("")

    if template == "standard":
        lines.append("---")
        lines.append("")
        lines.append("## Appendix")
        lines.append("")
        lines.append("### Blameless Principles Checklist")
        lines.append("")
        lines.append("- [ ] Document uses system/process language, not personal blame")
        lines.append("- [ ] All timeline entries are backed by data (logs, metrics, configs)")
        lines.append("- [ ] Root cause points to systemic improvement, not individual error")
        lines.append("- [ ] Every action item is SMART (Specific, Measurable, Assignable, Realistic, Time-bound)")
        lines.append("- [ ] Document has been reviewed by all incident responders")
        lines.append("")

    return "\n".join(lines)


def render_markdown_en(data, template="standard"):
    """Render incident data as an English Markdown postmortem."""
    lines = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = data.get("title", "Untitled Incident")
    severity = data.get("severity", "N/A")
    duration = compute_duration(data.get("start_time", ""), data.get("end_time", ""))

    lines.append(f"# Postmortem: {title}")
    lines.append("")
    lines.append(f"> **Generated**: {now_str}  ")
    lines.append(f"> **Severity**: {severity} — {SEVERITY_DESC_EN.get(severity, '')}  ")
    lines.append(f"> **Duration**: {duration}")
    lines.append("")
    lines.append("---")
    lines.append("")

    lines.append("## 1. Incident Overview")
    lines.append("")
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    lines.append(f"| **Title** | {title} |")
    lines.append(f"| **Severity** | {severity} |")
    lines.append(f"| **Impact Start** | {data.get('start_time', 'N/A')} |")
    lines.append(f"| **Impact End** | {data.get('end_time', 'N/A')} |")
    lines.append(f"| **Duration** | {duration} |")
    lines.append(f"| **Impact** | {data.get('impact', 'N/A')} |")
    responders = data.get("responders", [])
    if responders:
        lines.append(f"| **Responders** | {', '.join(responders)} |")
    lines.append("")

    lines.append("## 2. Timeline")
    lines.append("")
    timeline = data.get("timeline", [])
    if timeline:
        lines.append("| Time | Type | Event |")
        lines.append("|---|---|---|")
        for event in timeline:
            etype = event.get("type", "INFO")
            icon = EVENT_ICONS.get(etype, "")
            lines.append(f"| {event.get('time', '')} | {icon} {etype} | {event.get('desc', '')} |")
        lines.append("")
        trigger_time = None
        detect_time = None
        resolve_time = None
        for event in timeline:
            t = event.get("time", "")
            if event.get("type") == "TRIGGER" and not trigger_time:
                trigger_time = t
            elif event.get("type") == "DETECT" and not detect_time:
                detect_time = t
            elif event.get("type") == "RESOLVE" and not resolve_time:
                resolve_time = t

        lines.append("**Key Metrics:**")
        lines.append("")
        if trigger_time and detect_time:
            ttd = compute_hhmm_diff(trigger_time, detect_time)
            ttd_str = f"{ttd} ({trigger_time} → {detect_time})" if ttd else f"{trigger_time} → {detect_time}"
            lines.append(f"- **TTD (Time to Detect)**: {ttd_str}")
        if detect_time and resolve_time:
            ttr = compute_hhmm_diff(detect_time, resolve_time)
            ttr_str = f"{ttr} ({detect_time} → {resolve_time})" if ttr else f"{detect_time} → {resolve_time}"
            lines.append(f"- **TTR (Time to Resolve)**: {ttr_str}")
        lines.append("")
    else:
        lines.append("*(No timeline data provided)*")
        lines.append("")

    lines.append("## 3. Root Cause Analysis (5 Whys)")
    lines.append("")
    five_whys = data.get("five_whys", [])
    if five_whys:
        for item in five_whys:
            level = item.get("level", "?")
            lines.append(f"**Why {level}: {item.get('question', '')}**")
            lines.append(f"> {item.get('answer', '')}")
            lines.append("")
    lines.append(f"**Root Cause**: {data.get('root_cause', 'N/A')}")
    lines.append("")
    rc_cat = data.get("root_cause_category", "")
    if rc_cat:
        lines.append(f"**Category**: {rc_cat}")
        lines.append("")

    lines.append("## 4. Action Items")
    lines.append("")
    action_items = data.get("action_items", [])
    if action_items:
        lines.append("| # | Type | Description | Owner | Due | Priority |")
        lines.append("|---|---|---|---|---|---|")
        for i, item in enumerate(action_items, 1):
            atype = item.get("type", "process")
            icon = ACTION_ICONS.get(atype, "")
            lines.append(
                f"| {i} | {icon} {atype.capitalize()} | {item.get('desc', '')} "
                f"| {item.get('owner', 'TBD')} | {item.get('due', 'TBD')} "
                f"| {item.get('priority', '')} |"
            )
        lines.append("")
    else:
        lines.append("*(No action items provided)*")
        lines.append("")

    lines.append("## 5. Lessons Learned")
    lines.append("")
    lessons = data.get("lessons", {})
    for section, heading in [("keep_doing", "Keep Doing"), ("improve", "Improve"), ("lucky", "Lucky / Unlucky")]:
        items = lessons.get(section, [])
        if items:
            lines.append(f"### {heading}")
            for item in items:
                lines.append(f"- {item}")
            lines.append("")

    if template == "standard":
        lines.append("---")
        lines.append("")
        lines.append("## Appendix")
        lines.append("")
        lines.append("### Blameless Principles Checklist")
        lines.append("")
        lines.append("- [ ] Document uses system/process language, not personal blame")
        lines.append("- [ ] All timeline entries are backed by data (logs, metrics, configs)")
        lines.append("- [ ] Root cause points to systemic improvement, not individual error")
        lines.append("- [ ] Every action item is SMART (Specific, Measurable, Assignable, Realistic, Time-bound)")
        lines.append("- [ ] Document has been reviewed by all incident responders")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Generate a structured postmortem document from incident data.",
        epilog="Examples:\n"
               "  %(prog)s --interactive\n"
               "  %(prog)s --input incident.json --output postmortem.md\n"
               "  cat incident.json | %(prog)s --format markdown\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--interactive", action="store_true", help="Interactive mode: guided data collection")
    parser.add_argument("--input", metavar="FILE", help="JSON input file (reads stdin if omitted and not --interactive)")
    parser.add_argument("--output", metavar="FILE", help="Output file path (prints to stdout if omitted)")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown", help="Output format (default: markdown)")
    parser.add_argument("--template", choices=["standard", "brief"], default="standard", help="Template style (default: standard)")
    parser.add_argument("--lang", choices=["zh", "en"], default="zh", help="Document language (default: zh)")
    args = parser.parse_args()

    if args.interactive:
        try:
            data = interactive_collect()
        except (EOFError, KeyboardInterrupt):
            print("\n\nInteractive collection cancelled.", file=sys.stderr)
            sys.exit(1)
    elif args.input:
        try:
            with open(args.input, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"Error: file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: invalid JSON in {args.input}: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        if sys.stdin.isatty():
            parser.print_help()
            print("\nError: provide --interactive, --input FILE, or pipe JSON to stdin.", file=sys.stderr)
            sys.exit(1)
        try:
            data = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"Error: invalid JSON from stdin: {e}", file=sys.stderr)
            sys.exit(1)

    warnings = validate_data(data)
    for w in warnings:
        print(f"Warning: {w}", file=sys.stderr)

    if args.format == "json":
        enriched = dict(data)
        enriched["_computed"] = {
            "duration": compute_duration(data.get("start_time", ""), data.get("end_time", "")),
            "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        timeline = data.get("timeline", [])
        trigger_time = detect_time = resolve_time = None
        for event in timeline:
            t = event.get("time", "")
            if event.get("type") == "TRIGGER" and not trigger_time:
                trigger_time = t
            elif event.get("type") == "DETECT" and not detect_time:
                detect_time = t
            elif event.get("type") == "RESOLVE" and not resolve_time:
                resolve_time = t
        if trigger_time and detect_time:
            enriched["_computed"]["ttd"] = compute_hhmm_diff(trigger_time, detect_time)
        if detect_time and resolve_time:
            enriched["_computed"]["ttr"] = compute_hhmm_diff(detect_time, resolve_time)
        output = json.dumps(enriched, ensure_ascii=False, indent=2)
    elif args.lang == "en":
        output = render_markdown_en(data, template=args.template)
    else:
        output = render_markdown_zh(data, template=args.template)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Postmortem written to: {args.output}", file=sys.stderr)
        except OSError as e:
            print(f"Error writing to {args.output}: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(output)


if __name__ == "__main__":
    main()

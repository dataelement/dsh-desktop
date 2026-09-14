#!/usr/bin/env python3
"""
软件项目工时估算计算器
支持三点估算 (PERT)、T-shirt Sizing、功能点分析 (FPA)
"""

import argparse
import json
import math
import sys
from typing import Any


TSHIRT_MAP: dict[str, dict[str, float]] = {
    "XS":  {"O": 0.25, "M": 0.5,  "P": 1},
    "S":   {"O": 0.5,  "M": 1,    "P": 2.5},
    "M":   {"O": 2,    "M": 3.5,  "P": 7},
    "L":   {"O": 5,    "M": 10,   "P": 20},
    "XL":  {"O": 15,   "M": 25,   "P": 50},
    "XXL": {"O": 40,   "M": 70,   "P": 150},
}

FPA_WEIGHTS: dict[str, dict[str, int]] = {
    "ILF": {"低": 7,  "中": 10, "高": 15, "low": 7,  "medium": 10, "high": 15},
    "EIF": {"低": 5,  "中": 7,  "高": 10, "low": 5,  "medium": 7,  "high": 10},
    "EI":  {"低": 3,  "中": 4,  "高": 6,  "low": 3,  "medium": 4,  "high": 6},
    "EO":  {"低": 4,  "中": 5,  "高": 7,  "low": 4,  "medium": 5,  "high": 7},
    "EQ":  {"低": 3,  "中": 4,  "高": 6,  "low": 3,  "medium": 4,  "high": 6},
}

CONFIDENCE_LEVELS = [
    ("68%",   1.0),
    ("90%",   1.645),
    ("95%",   2.0),
    ("99.7%", 3.0),
]


def validate_pert_task(task: dict[str, Any], idx: int) -> None:
    for key in ("O", "M", "P"):
        if key not in task:
            print(f"错误: 任务 #{idx + 1} 缺少字段 '{key}'", file=sys.stderr)
            sys.exit(1)
        if not isinstance(task[key], (int, float)) or task[key] < 0:
            print(f"错误: 任务 #{idx + 1} 的 '{key}' 必须为非负数", file=sys.stderr)
            sys.exit(1)
    if task["O"] > task["M"]:
        print(f"警告: 任务 #{idx + 1} '{task.get('name', '')}' 的 O({task['O']}) > M({task['M']})，请检查", file=sys.stderr)
    if task["M"] > task["P"]:
        print(f"警告: 任务 #{idx + 1} '{task.get('name', '')}' 的 M({task['M']}) > P({task['P']})，请检查", file=sys.stderr)


def calc_pert(tasks: list[dict[str, Any]]) -> dict[str, Any]:
    if not tasks:
        print("错误: 任务列表为空", file=sys.stderr)
        sys.exit(1)

    results = []
    total_e = 0.0
    total_var = 0.0

    for i, task in enumerate(tasks):
        validate_pert_task(task, i)
        o, m, p = task["O"], task["M"], task["P"]
        e = (o + 4 * m + p) / 6
        sigma = (p - o) / 6
        variance = sigma ** 2
        spread_ratio = p / o if o > 0 else float("inf")

        if spread_ratio < 2:
            risk_level = "低"
        elif spread_ratio <= 4:
            risk_level = "中"
        else:
            risk_level = "高"

        total_e += e
        total_var += variance

        results.append({
            "name": task.get("name", f"任务{i + 1}"),
            "O": o,
            "M": m,
            "P": p,
            "E": round(e, 2),
            "sigma": round(sigma, 2),
            "spread_ratio": round(spread_ratio, 2),
            "risk_level": risk_level,
        })

    total_sigma = math.sqrt(total_var)
    confidence_intervals = {}
    for label, z in CONFIDENCE_LEVELS:
        low = max(0, total_e - z * total_sigma)
        high = total_e + z * total_sigma
        confidence_intervals[label] = {
            "low": round(low, 2),
            "high": round(high, 2),
        }

    return {
        "method": "PERT 三点估算",
        "unit": "人日",
        "tasks": results,
        "summary": {
            "total_E": round(total_e, 2),
            "total_sigma": round(total_sigma, 2),
            "confidence_intervals": confidence_intervals,
        },
        "recommendation": {
            "internal_planning": f"{confidence_intervals['90%']['high']} 人日 (90% 置信)",
            "external_quote": f"{confidence_intervals['95%']['high']} 人日 (95% 置信)",
        },
    }


def calc_tshirt(tasks: list[dict[str, Any]]) -> dict[str, Any]:
    if not tasks:
        print("错误: 任务列表为空", file=sys.stderr)
        sys.exit(1)

    converted = []
    for i, task in enumerate(tasks):
        size = task.get("size", "").upper()
        if size not in TSHIRT_MAP:
            valid = ", ".join(TSHIRT_MAP.keys())
            print(f"错误: 任务 #{i + 1} 的尺码 '{task.get('size', '')}' 无效，可选: {valid}", file=sys.stderr)
            sys.exit(1)
        mapping = TSHIRT_MAP[size]
        converted.append({
            "name": task.get("name", f"任务{i + 1}"),
            "size": size,
            "O": mapping["O"],
            "M": mapping["M"],
            "P": mapping["P"],
        })

    pert_result = calc_pert(converted)
    pert_result["method"] = "T-shirt Sizing → PERT 转换"

    for i, t in enumerate(pert_result["tasks"]):
        t["size"] = converted[i]["size"]

    return pert_result


def calc_fpa(components: list[dict[str, Any]], hours_per_fp: float = 10.0) -> dict[str, Any]:
    if not components:
        print("错误: 组件列表为空", file=sys.stderr)
        sys.exit(1)
    if hours_per_fp <= 0:
        print("错误: hours-per-fp 必须为正数", file=sys.stderr)
        sys.exit(1)

    results = []
    total_ufp = 0

    for i, comp in enumerate(components):
        comp_type = comp.get("type", "").upper()
        if comp_type not in FPA_WEIGHTS:
            valid = ", ".join(FPA_WEIGHTS.keys())
            print(f"错误: 组件 #{i + 1} 的类型 '{comp.get('type', '')}' 无效，可选: {valid}", file=sys.stderr)
            sys.exit(1)

        complexity = comp.get("complexity", "中")
        weights = FPA_WEIGHTS[comp_type]
        if complexity not in weights:
            valid = "低/中/高 或 low/medium/high"
            print(f"错误: 组件 #{i + 1} 的复杂度 '{complexity}' 无效，可选: {valid}", file=sys.stderr)
            sys.exit(1)

        count = comp.get("count", 1)
        if not isinstance(count, int) or count < 1:
            print(f"错误: 组件 #{i + 1} 的 count 必须为正整数", file=sys.stderr)
            sys.exit(1)

        weight = weights[complexity]
        fp = weight * count
        total_ufp += fp

        results.append({
            "type": comp_type,
            "complexity": complexity,
            "count": count,
            "weight": weight,
            "fp": fp,
        })

    total_hours = total_ufp * hours_per_fp
    buffer_low = total_hours * 1.15
    buffer_high = total_hours * 1.30

    total_days = total_hours / 8
    buffer_low_days = buffer_low / 8
    buffer_high_days = buffer_high / 8

    return {
        "method": "功能点分析 (FPA)",
        "components": results,
        "summary": {
            "total_UFP": total_ufp,
            "hours_per_fp": hours_per_fp,
            "total_hours": round(total_hours, 1),
            "total_days": round(total_days, 1),
            "with_buffer_15pct": {
                "hours": round(buffer_low, 1),
                "days": round(buffer_low_days, 1),
            },
            "with_buffer_30pct": {
                "hours": round(buffer_high, 1),
                "days": round(buffer_high_days, 1),
            },
        },
        "recommendation": {
            "internal_planning": f"{round(buffer_low_days, 1)} 人日 (含15%缓冲)",
            "external_quote": f"{round(buffer_high_days, 1)} 人日 (含30%缓冲)",
        },
    }


def parse_json_arg(value: str, arg_name: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError as e:
        print(f"错误: --{arg_name} 参数 JSON 解析失败: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="软件项目工时估算计算器 — 支持 PERT / T-shirt / FPA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 三点估算
  %(prog)s --method pert --tasks '[{"name":"登录","O":2,"M":3,"P":8}]'

  # T-shirt 转估算
  %(prog)s --method tshirt --tasks '[{"name":"登录","size":"M"}]'

  # 功能点分析
  %(prog)s --method fpa --components '[{"type":"ILF","complexity":"中","count":3}]' --hours-per-fp 10
        """,
    )
    parser.add_argument(
        "--method",
        required=True,
        choices=["pert", "tshirt", "fpa"],
        help="估算方法: pert (三点估算), tshirt (T-shirt sizing), fpa (功能点分析)",
    )
    parser.add_argument(
        "--tasks",
        help="任务列表 JSON (pert/tshirt 方法使用)",
    )
    parser.add_argument(
        "--components",
        help="功能组件列表 JSON (fpa 方法使用)",
    )
    parser.add_argument(
        "--hours-per-fp",
        type=float,
        default=10.0,
        help="每功能点对应人时数 (仅 fpa 方法，默认 10)",
    )
    parser.add_argument(
        "--output",
        choices=["json", "table"],
        default="json",
        help="输出格式 (默认 json)",
    )

    args = parser.parse_args()

    if args.method in ("pert", "tshirt"):
        if not args.tasks:
            print("错误: --method pert/tshirt 需要 --tasks 参数", file=sys.stderr)
            sys.exit(1)
        tasks = parse_json_arg(args.tasks, "tasks")
        if not isinstance(tasks, list):
            print("错误: --tasks 必须是 JSON 数组", file=sys.stderr)
            sys.exit(1)

        if args.method == "pert":
            result = calc_pert(tasks)
        else:
            result = calc_tshirt(tasks)

    elif args.method == "fpa":
        if not args.components:
            print("错误: --method fpa 需要 --components 参数", file=sys.stderr)
            sys.exit(1)
        components = parse_json_arg(args.components, "components")
        if not isinstance(components, list):
            print("错误: --components 必须是 JSON 数组", file=sys.stderr)
            sys.exit(1)
        result = calc_fpa(components, args.hours_per_fp)

    if args.output == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.output == "table":
        print_table(result)


def print_table(result: dict[str, Any]) -> None:
    print(f"\n{'=' * 60}")
    print(f"  估算方法: {result['method']}")
    print(f"{'=' * 60}")

    if "tasks" in result:
        header = f"{'#':<3} {'名称':<16} {'O':>6} {'M':>6} {'P':>6} {'E':>7} {'σ':>6}"
        print(f"\n{header}")
        print("-" * 60)
        for i, t in enumerate(result["tasks"], 1):
            size_str = f" [{t['size']}]" if "size" in t else ""
            name = t["name"] + size_str
            if len(name) > 15:
                name = name[:14] + "…"
            print(f"{i:<3} {name:<16} {t['O']:>6.1f} {t['M']:>6.1f} {t['P']:>6.1f} {t['E']:>7.2f} {t['sigma']:>6.2f}")

        s = result["summary"]
        print(f"\n{'─' * 60}")
        print(f"  总期望工时:  {s['total_E']} 人日")
        print(f"  总标准差:    {s['total_sigma']} 人日")
        print(f"\n  置信区间:")
        for label, interval in s["confidence_intervals"].items():
            print(f"    {label:>6}: {interval['low']:.1f} – {interval['high']:.1f} 人日")

    elif "components" in result:
        header = f"{'#':<3} {'类型':<6} {'复杂度':<8} {'数量':>4} {'权重':>4} {'FP':>5}"
        print(f"\n{header}")
        print("-" * 40)
        for i, c in enumerate(result["components"], 1):
            print(f"{i:<3} {c['type']:<6} {c['complexity']:<8} {c['count']:>4} {c['weight']:>4} {c['fp']:>5}")

        s = result["summary"]
        print(f"\n{'─' * 40}")
        print(f"  总 UFP:      {s['total_UFP']}")
        print(f"  人时/FP:     {s['hours_per_fp']}")
        print(f"  总工时:      {s['total_hours']} 人时 ({s['total_days']} 人日)")
        print(f"  含15%缓冲:   {s['with_buffer_15pct']['hours']} 人时 ({s['with_buffer_15pct']['days']} 人日)")
        print(f"  含30%缓冲:   {s['with_buffer_30pct']['hours']} 人时 ({s['with_buffer_30pct']['days']} 人日)")

    r = result.get("recommendation", {})
    if r:
        print(f"\n  💡 建议:")
        print(f"    内部规划: {r.get('internal_planning', 'N/A')}")
        print(f"    对外报价: {r.get('external_quote', 'N/A')}")
    print()


if __name__ == "__main__":
    main()

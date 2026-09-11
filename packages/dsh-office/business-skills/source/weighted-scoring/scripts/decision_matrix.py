#!/usr/bin/env python3
"""
Decision Matrix — 加权评分决策矩阵计算工具

功能：
  --json  '{ ... }'   完整评分计算 + 敏感性分析
  --roc   '["维度1", "维度2", ...]'   ROC 排序法计算权重

输出格式：Markdown 表格，可直接粘贴使用。
"""

import argparse
import json
import sys
from typing import Any


def compute_roc_weights(n: int) -> list[float]:
    """计算 ROC（Rank Order Centroid）权重。"""
    weights = []
    for k in range(1, n + 1):
        w = sum(1.0 / j for j in range(k, n + 1)) / n
        weights.append(w)
    return weights


def normalize_weights(weights: list[float]) -> list[float]:
    """归一化权重，使总和为 1.0。"""
    total = sum(weights)
    if total == 0:
        print("错误：权重总和为 0，无法归一化。", file=sys.stderr)
        sys.exit(1)
    return [w / total for w in weights]


def compute_weighted_scores(
    dimensions: list[str],
    weights: list[float],
    options: list[str],
    scores: dict[str, list[int]],
) -> dict[str, float]:
    """计算每个方案的加权总分。"""
    result = {}
    for opt in options:
        total = sum(w * s for w, s in zip(weights, scores[opt]))
        result[opt] = round(total, 4)
    return result


def detect_zero_discrimination(
    dimensions: list[str],
    options: list[str],
    scores: dict[str, list[int]],
) -> list[str]:
    """检测零区分度维度（所有方案评分相同）。"""
    warnings = []
    for i, dim in enumerate(dimensions):
        values = {scores[opt][i] for opt in options}
        if len(values) == 1:
            warnings.append(f"维度「{dim}」所有方案评分均为 {values.pop()}，无区分度，建议移除或重新评估")
    return warnings


def sensitivity_analysis(
    dimensions: list[str],
    weights: list[float],
    options: list[str],
    scores: dict[str, list[int]],
    delta: float = 0.10,
) -> list[str]:
    """权重 ±delta 波动的敏感性分析。返回分析结果描述列表。"""
    baseline = compute_weighted_scores(dimensions, weights, options, scores)
    baseline_ranking = sorted(baseline.keys(), key=lambda x: -baseline[x])

    results = []
    for i, dim in enumerate(dimensions):
        for direction in [+delta, -delta]:
            test_weights = list(weights)
            shift = weights[i] * direction / (1.0 - weights[i]) if weights[i] < 1.0 else 0
            new_w = weights[i] + weights[i] * direction
            if new_w < 0:
                continue
            test_weights[i] = new_w
            for j in range(len(test_weights)):
                if j != i:
                    test_weights[j] = weights[j] - weights[j] * shift
                    if test_weights[j] < 0:
                        test_weights[j] = 0

            test_weights = normalize_weights(test_weights)
            test_scores = compute_weighted_scores(dimensions, test_weights, options, scores)
            test_ranking = sorted(test_scores.keys(), key=lambda x: -test_scores[x])

            if test_ranking[0] != baseline_ranking[0]:
                sign = "+" if direction > 0 else "-"
                pct = abs(direction) * 100
                results.append(
                    f"当「{dim}」权重 {sign}{pct:.0f}% 时，"
                    f"排名第 1 从 {baseline_ranking[0]}({baseline[baseline_ranking[0]]:.2f}) "
                    f"变为 {test_ranking[0]}({test_scores[test_ranking[0]]:.2f})"
                )
    return results


def format_matrix_table(
    dimensions: list[str],
    weights: list[float],
    options: list[str],
    scores: dict[str, list[int]],
) -> str:
    """生成 Markdown 格式的决策矩阵表格。"""
    lines = []

    header = "| 维度 | 权重 | " + " | ".join(options) + " |"
    sep = "|------|------|" + "------|" * len(options)
    lines.append(header)
    lines.append(sep)

    totals = {opt: 0.0 for opt in options}
    for i, dim in enumerate(dimensions):
        row = f"| {dim} | {weights[i]*100:.1f}% |"
        for opt in options:
            s = scores[opt][i]
            ws = weights[i] * s
            totals[opt] += ws
            row += f" {s} ({ws:.2f}) |"
        lines.append(row)

    total_row = "| **加权总分** | **100%** |"
    for opt in options:
        total_row += f" **{totals[opt]:.2f}** |"
    lines.append(total_row)

    ranked = sorted(options, key=lambda x: -totals[x])
    rank_map = {opt: idx + 1 for idx, opt in enumerate(ranked)}
    rank_row = "| **排名** | |"
    for opt in options:
        rank_row += f" **{rank_map[opt]}** |"
    lines.append(rank_row)

    return "\n".join(lines)


def validate_input(data: dict[str, Any]) -> None:
    """校验输入数据的完整性。"""
    required = ["dimensions", "weights", "options", "scores"]
    for key in required:
        if key not in data:
            print(f"错误：缺少必需字段 '{key}'", file=sys.stderr)
            sys.exit(1)

    dims = data["dimensions"]
    weights = data["weights"]
    options = data["options"]
    scores = data["scores"]

    if len(dims) != len(weights):
        print(f"错误：维度数量({len(dims)})与权重数量({len(weights)})不匹配", file=sys.stderr)
        sys.exit(1)

    if len(dims) < 2:
        print("错误：至少需要 2 个评估维度", file=sys.stderr)
        sys.exit(1)

    if len(options) < 2:
        print("错误：至少需要 2 个候选方案", file=sys.stderr)
        sys.exit(1)

    for opt in options:
        if opt not in scores:
            print(f"错误：方案 '{opt}' 在 scores 中缺少评分数据", file=sys.stderr)
            sys.exit(1)
        if len(scores[opt]) != len(dims):
            print(
                f"错误：方案 '{opt}' 的评分数量({len(scores[opt])})与维度数量({len(dims)})不匹配",
                file=sys.stderr,
            )
            sys.exit(1)
        for j, s in enumerate(scores[opt]):
            if not isinstance(s, (int, float)) or s < 1 or s > 5:
                print(f"错误：方案 '{opt}' 在维度 '{dims[j]}' 的评分 {s} 不在 1-5 范围内", file=sys.stderr)
                sys.exit(1)

    if any(w < 0 for w in weights):
        print("错误：权重不能为负数", file=sys.stderr)
        sys.exit(1)


def cmd_json(raw: str) -> None:
    """处理 --json 模式：完整评分计算 + 敏感性分析。"""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"错误：JSON 解析失败 — {e}", file=sys.stderr)
        sys.exit(1)

    validate_input(data)

    dims = data["dimensions"]
    raw_weights = data["weights"]
    options = data["options"]
    scores = data["scores"]

    weights = normalize_weights([float(w) for w in raw_weights])

    print("## 决策矩阵评分结果\n")
    print(format_matrix_table(dims, weights, options, scores))

    warnings = detect_zero_discrimination(dims, options, scores)
    if warnings:
        print("\n### 评分质量警告\n")
        for w in warnings:
            print(f"- {w}")

    totals = compute_weighted_scores(dims, weights, options, scores)
    ranked = sorted(totals.keys(), key=lambda x: -totals[x])
    gap = totals[ranked[0]] - totals[ranked[1]]

    print(f"\n### 敏感性分析（权重 ±10%）\n")
    print(f"第 1 名 {ranked[0]}({totals[ranked[0]]:.2f}) 与第 2 名 {ranked[1]}({totals[ranked[1]]:.2f}) 差距：{gap:.2f} 分\n")

    if gap < 0.3:
        print("**差距 < 0.3 分，建议关注敏感性分析结果：**\n")
    else:
        print("差距 >= 0.3 分，结论较稳健。以下为波动测试参考：\n")

    sa = sensitivity_analysis(dims, weights, options, scores)
    if sa:
        for s in sa:
            print(f"- {s}")
    else:
        if gap < 0.3:
            print("- 所有维度权重 ±10% 波动后，排名第 1 不变。虽然分差较小，但排名对权重变化不敏感，结论可信。")
        else:
            print("- 所有维度权重 ±10% 波动后，排名第 1 不变。结论稳健。")


def cmd_roc(raw: str) -> None:
    """处理 --roc 模式：ROC 排序法计算权重。"""
    try:
        dims = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"错误：JSON 解析失败 — {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(dims, list) or len(dims) < 2:
        print("错误：请提供至少 2 个维度的排名列表（JSON 数组）", file=sys.stderr)
        sys.exit(1)

    n = len(dims)
    weights = compute_roc_weights(n)

    print("## ROC 权重计算结果\n")
    print("| 排名 | 维度 | 权重 |")
    print("|------|------|------|")
    for i, (dim, w) in enumerate(zip(dims, weights)):
        print(f"| {i+1} | {dim} | {w*100:.1f}% |")

    print(f"\n> 维度按重要性从高到低排列。权重由 ROC（Rank Order Centroid）公式计算，共 {n} 个维度。")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Decision Matrix — 加权评分决策矩阵计算工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  python3 decision_matrix.py --json '{"dimensions":["A","B"],"weights":[60,40],"options":["X","Y"],"scores":{"X":[4,3],"Y":[3,5]}}'
  python3 decision_matrix.py --roc '["功能","性能","成本"]'
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--json", type=str, help="JSON 格式的完整评分数据")
    group.add_argument("--roc", type=str, help="JSON 数组，维度按重要性排序")

    args = parser.parse_args()

    if args.json:
        cmd_json(args.json)
    elif args.roc:
        cmd_roc(args.roc)


if __name__ == "__main__":
    main()

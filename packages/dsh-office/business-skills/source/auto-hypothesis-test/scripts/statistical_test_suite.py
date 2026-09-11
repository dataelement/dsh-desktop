#!/usr/bin/env python3
"""statistical_test_suite.py — 根据数据自动选择统计检验并输出通俗解读"""

import argparse
import json
import sys
import os

import numpy as np
import pandas as pd
from scipy import stats


def load_data(path: str) -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(path)
    elif ext in (".xls", ".xlsx"):
        return pd.read_excel(path)
    elif ext == ".tsv":
        return pd.read_csv(path, sep="\t")
    elif ext == ".json":
        return pd.read_json(path)
    else:
        return pd.read_csv(path)


def is_categorical(series: pd.Series, max_unique_abs: int = 20, max_unique_ratio: float = 0.05) -> bool:
    if series.dtype == object or series.dtype.name == "category":
        return True
    n_unique = series.nunique()
    return n_unique <= max_unique_abs and n_unique / max(len(series), 1) < max_unique_ratio


def check_normality(data: np.ndarray, alpha: float = 0.05) -> tuple:
    if len(data) < 3:
        return False, 1.0, "样本量不足（< 3），无法检验正态性"
    sample = data
    if len(data) > 5000:
        rng = np.random.default_rng(42)
        sample = rng.choice(data, size=5000, replace=False)
    stat, p = stats.shapiro(sample)
    is_normal = p > alpha
    desc = f"Shapiro-Wilk W = {stat:.4f}, p = {p:.4g}"
    desc += "（数据近似服从正态分布）" if is_normal else "（数据不服从正态分布）"
    return is_normal, p, desc


def check_equal_variance(groups: list, alpha: float = 0.05) -> tuple:
    stat, p = stats.levene(*groups)
    equal_var = p > alpha
    desc = f"Levene's test: F = {stat:.4f}, p = {p:.4g}"
    desc += "（各组方差齐性）" if equal_var else "（各组方差不齐）"
    return equal_var, p, desc


def round_p(p: float) -> float:
    p = float(p)
    if p < 1e-6:
        return p
    return round(p, 6)


def format_p_text(p: float) -> str:
    if p < 0.0001:
        return "< 0.0001"
    return f"{p:.4g}"


def significance_label(p: float) -> str:
    if p < 0.001:
        return "***（极显著）"
    elif p < 0.01:
        return "**（高度显著）"
    elif p < 0.05:
        return "*（显著）"
    elif p < 0.1:
        return ".（边际显著）"
    return "（不显著）"


# ── Test runners ──────────────────────────────────────────────────────────────

def run_independent_ttest(groups: list, group_names: list, alpha: float = 0.05) -> dict:
    g1, g2 = groups
    equal_var, _, var_desc = check_equal_variance(groups, alpha)
    stat, p = stats.ttest_ind(g1, g2, equal_var=equal_var)

    pooled_std = np.sqrt(
        ((len(g1) - 1) * np.std(g1, ddof=1) ** 2 + (len(g2) - 1) * np.std(g2, ddof=1) ** 2)
        / (len(g1) + len(g2) - 2)
    )
    cohens_d = abs(np.mean(g1) - np.mean(g2)) / pooled_std if pooled_std > 0 else 0.0

    test_name = "独立样本 t 检验" if equal_var else "Welch t 检验（不等方差）"
    return {
        "test": test_name,
        "test_id": "independent_ttest" if equal_var else "welch_ttest",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "df": len(g1) + len(g2) - 2,
        "effect_size": {"cohens_d": round(float(cohens_d), 4)},
        "variance_test": var_desc,
        "group_stats": {
            group_names[0]: {"n": len(g1), "mean": round(float(np.mean(g1)), 4), "std": round(float(np.std(g1, ddof=1)), 4)},
            group_names[1]: {"n": len(g2), "mean": round(float(np.mean(g2)), 4), "std": round(float(np.std(g2, ddof=1)), 4)},
        },
    }


def run_mann_whitney(groups: list, group_names: list) -> dict:
    g1, g2 = groups
    stat, p = stats.mannwhitneyu(g1, g2, alternative="two-sided")
    n1, n2 = len(g1), len(g2)
    r = 1 - (2 * stat) / (n1 * n2) if n1 * n2 > 0 else 0.0

    return {
        "test": "Mann-Whitney U 检验（非参数）",
        "test_id": "mann_whitney_u",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "effect_size": {"rank_biserial_r": round(float(r), 4)},
        "group_stats": {
            group_names[0]: {"n": n1, "median": round(float(np.median(g1)), 4)},
            group_names[1]: {"n": n2, "median": round(float(np.median(g2)), 4)},
        },
    }


def run_one_way_anova(groups: list, group_names: list) -> dict:
    stat, p = stats.f_oneway(*groups)
    all_data = np.concatenate(groups)
    grand_mean = np.mean(all_data)
    ss_between = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups)
    ss_total = float(np.sum((all_data - grand_mean) ** 2))
    eta_sq = ss_between / ss_total if ss_total > 0 else 0.0

    group_stats = {}
    for name, g in zip(group_names, groups):
        group_stats[str(name)] = {
            "n": len(g),
            "mean": round(float(np.mean(g)), 4),
            "std": round(float(np.std(g, ddof=1)), 4),
        }

    return {
        "test": "单因素方差分析（One-way ANOVA）",
        "test_id": "one_way_anova",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "effect_size": {"eta_squared": round(float(eta_sq), 4)},
        "n_groups": len(groups),
        "group_stats": group_stats,
    }


def run_kruskal_wallis(groups: list, group_names: list) -> dict:
    stat, p = stats.kruskal(*groups)
    n = sum(len(g) for g in groups)
    epsilon_sq = max((stat - len(groups) + 1) / (n - len(groups)), 0.0) if n > len(groups) else 0.0

    group_stats = {}
    for name, g in zip(group_names, groups):
        group_stats[str(name)] = {
            "n": len(g),
            "median": round(float(np.median(g)), 4),
        }

    return {
        "test": "Kruskal-Wallis H 检验（非参数 ANOVA）",
        "test_id": "kruskal_wallis",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "effect_size": {"epsilon_squared": round(float(epsilon_sq), 4)},
        "n_groups": len(groups),
        "group_stats": group_stats,
    }


def run_chi_square(df: pd.DataFrame, col1: str, col2: str) -> dict:
    contingency = pd.crosstab(df[col1], df[col2])
    chi2, p, dof, expected = stats.chi2_contingency(contingency)
    n = contingency.sum().sum()
    min_dim = min(contingency.shape) - 1
    cramers_v = np.sqrt(chi2 / (n * min_dim)) if min_dim > 0 and n > 0 else 0.0

    return {
        "test": "卡方独立性检验（Chi-square test）",
        "test_id": "chi_square",
        "statistic": round(float(chi2), 4),
        "p_value": round_p(p),
        "df": int(dof),
        "effect_size": {"cramers_v": round(float(cramers_v), 4)},
        "contingency_table": {str(k): {str(kk): int(vv) for kk, vv in v.items()} for k, v in contingency.to_dict().items()},
        "min_expected": round(float(expected.min()), 2),
    }


def run_paired_ttest(d1: np.ndarray, d2: np.ndarray, name1: str, name2: str) -> dict:
    stat, p = stats.ttest_rel(d1, d2)
    diff = d1 - d2
    diff_std = float(np.std(diff, ddof=1))
    cohens_d = abs(float(np.mean(diff))) / diff_std if diff_std > 0 else 0.0

    return {
        "test": "配对样本 t 检验",
        "test_id": "paired_ttest",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "effect_size": {"cohens_d": round(float(cohens_d), 4)},
        "stats": {
            name1: {"n": len(d1), "mean": round(float(np.mean(d1)), 4), "std": round(float(np.std(d1, ddof=1)), 4)},
            name2: {"n": len(d2), "mean": round(float(np.mean(d2)), 4), "std": round(float(np.std(d2, ddof=1)), 4)},
            "difference": {"mean": round(float(np.mean(diff)), 4), "std": round(diff_std, 4)},
        },
    }


def run_wilcoxon(d1: np.ndarray, d2: np.ndarray, name1: str, name2: str) -> dict:
    stat, p = stats.wilcoxon(d1, d2)
    n = len(d1)
    r = 1 - (2 * stat) / (n * (n + 1) / 2) if n > 0 else 0.0

    return {
        "test": "Wilcoxon 符号秩检验（非参数配对检验）",
        "test_id": "wilcoxon",
        "statistic": round(float(stat), 4),
        "p_value": round_p(p),
        "effect_size": {"r": round(float(r), 4)},
        "stats": {
            name1: {"n": len(d1), "median": round(float(np.median(d1)), 4)},
            name2: {"n": len(d2), "median": round(float(np.median(d2)), 4)},
        },
    }


# ── Effect size descriptions ─────────────────────────────────────────────────

_ES_THRESHOLDS = {
    "cohens_d":       [(0.2, "极小，几乎没有实际差异"), (0.5, "小效应量，差异较小"), (0.8, "中等效应量，差异明显"), (float("inf"), "大效应量，差异非常明显")],
    "eta_squared":    [(0.01, "极小"), (0.06, "小效应量"), (0.14, "中等效应量"), (float("inf"), "大效应量")],
    "cramers_v":      [(0.1, "关联极弱"), (0.3, "弱关联"), (0.5, "中等关联"), (float("inf"), "强关联")],
    "rank_biserial_r":[(0.1, "极小"), (0.3, "小效应量"), (0.5, "中等效应量"), (float("inf"), "大效应量")],
    "epsilon_squared":[(0.01, "极小"), (0.06, "小效应量"), (0.14, "中等效应量"), (float("inf"), "大效应量")],
    "r":              [(0.1, "极小"), (0.3, "小效应量"), (0.5, "中等效应量"), (float("inf"), "大效应量")],
}

_ES_LABELS = {
    "cohens_d": "Cohen's d",
    "eta_squared": "\u03b7\u00b2",
    "cramers_v": "Cram\u00e9r's V",
    "rank_biserial_r": "|r|",
    "epsilon_squared": "\u03b5\u00b2",
    "r": "|r|",
}


def _effect_size_desc(effect_size: dict) -> str:
    for key, thresholds in _ES_THRESHOLDS.items():
        if key not in effect_size:
            continue
        val = abs(effect_size[key])
        label = _ES_LABELS[key]
        for cutoff, desc in thresholds:
            if val < cutoff:
                return f"{label} = {val}（{desc}）"
    return ""


# ── Interpretation ────────────────────────────────────────────────────────────

def interpret(result: dict, alpha: float = 0.05) -> list:
    p = result["p_value"]
    sig = p < alpha
    lines = [
        f"检验方法：{result['test']}",
        f"显著性水平：\u03b1 = {alpha}",
    ]

    p_str = format_p_text(p)
    if sig:
        if p_str.startswith("<"):
            lines.append(f"结论：p {p_str}，远小于 {alpha}，差异/关联具有统计学显著性。")
        else:
            lines.append(f"结论：p = {p_str} < {alpha}，差异/关联具有统计学显著性。")
    else:
        lines.append(f"结论：p = {p_str} \u2265 {alpha}，未发现统计学显著差异/关联。")

    es_desc = _effect_size_desc(result.get("effect_size", {}))
    if es_desc:
        lines.append(f"效应量：{es_desc}")

    test_id = result.get("test_id", "")

    if test_id in ("independent_ttest", "welch_ttest"):
        gs = result["group_stats"]
        names = list(gs.keys())
        m1, m2 = gs[names[0]]["mean"], gs[names[1]]["mean"]
        if sig:
            higher = names[0] if m1 > m2 else names[1]
            lines.append(
                f"通俗解读：「{names[0]}」（均值 {m1}）和「{names[1]}」（均值 {m2}）"
                f"之间存在显著差异，「{higher}」明显更高。"
            )
        else:
            lines.append(
                f"通俗解读：「{names[0]}」（均值 {m1}）和「{names[1]}」（均值 {m2}）"
                f"之间没有显著差异。"
            )

    elif test_id == "mann_whitney_u":
        gs = result["group_stats"]
        names = list(gs.keys())
        m1, m2 = gs[names[0]]["median"], gs[names[1]]["median"]
        if sig:
            lines.append(f"通俗解读：「{names[0]}」（中位数 {m1}）和「{names[1]}」（中位数 {m2}）的分布存在显著差异。")
        else:
            lines.append(f"通俗解读：「{names[0]}」和「{names[1]}」的分布没有显著差异。")

    elif test_id == "one_way_anova":
        ng = result["n_groups"]
        if sig:
            lines.append(f"通俗解读：{ng} 个组之间至少有一对存在显著差异。建议进一步做事后检验（如 Tukey HSD）确定具体哪些组不同。")
        else:
            lines.append(f"通俗解读：{ng} 个组之间没有显著差异。")

    elif test_id == "kruskal_wallis":
        ng = result["n_groups"]
        if sig:
            lines.append(f"通俗解读：{ng} 个组的分布存在显著差异。建议进一步做 Dunn's test 确定具体差异。")
        else:
            lines.append(f"通俗解读：{ng} 个组的分布没有显著差异。")

    elif test_id == "chi_square":
        min_exp = result.get("min_expected", 0)
        if min_exp < 5:
            lines.append(f"注意：最小期望频数 = {min_exp}（< 5），卡方检验结果可能不可靠，建议使用 Fisher 精确检验。")
        if sig:
            lines.append("通俗解读：两个分类变量之间存在显著关联，某些类别组合的出现频率明显偏离随机预期。")
        else:
            lines.append("通俗解读：两个分类变量之间没有显著关联，类别组合的分布与随机预期无明显偏差。")

    elif test_id == "paired_ttest":
        diff_mean = result["stats"]["difference"]["mean"]
        if sig:
            direction = "增加" if diff_mean > 0 else "减少"
            lines.append(f"通俗解读：两次测量之间存在显著变化，平均{direction}了 {abs(diff_mean):.4f}。")
        else:
            lines.append("通俗解读：两次测量之间没有显著变化。")

    elif test_id == "wilcoxon":
        if sig:
            lines.append("通俗解读：配对数据之间存在显著差异。")
        else:
            lines.append("通俗解读：配对数据之间没有显著差异。")

    return lines


# ── Auto-selection & orchestration ────────────────────────────────────────────

def auto_select_and_run(df, group_col, value_col, col1, col2, paired, force_test, alpha):
    if paired or (col1 and col2):
        if not col1 or not col2:
            print("错误：配对检验需要用 --col1 和 --col2 指定两个变量列", file=sys.stderr)
            sys.exit(1)

        data = df[[col1, col2]].dropna()
        if len(data) < 3:
            print(f"错误：有效配对数据仅 {len(data)} 行（至少需要 3 行）", file=sys.stderr)
            sys.exit(1)

        d1 = data[col1].values.astype(float)
        d2 = data[col2].values.astype(float)
        diff = d1 - d2

        norm_ok, _, norm_desc = check_normality(diff, alpha)
        selection_reason = []

        if force_test == "paired-ttest":
            result = run_paired_ttest(d1, d2, col1, col2)
        elif force_test == "wilcoxon":
            result = run_wilcoxon(d1, d2, col1, col2)
        elif norm_ok:
            selection_reason.append("配对差值近似正态分布 → 选择配对 t 检验")
            result = run_paired_ttest(d1, d2, col1, col2)
        else:
            selection_reason.append("配对差值不服从正态分布 → 选择 Wilcoxon 符号秩检验")
            result = run_wilcoxon(d1, d2, col1, col2)

        result["normality_check"] = norm_desc
        result["selection_reason"] = selection_reason
        return result

    if not group_col or not value_col:
        print("错误：请指定 --group + --value（分组比较），或 --col1 + --col2（配对比较）", file=sys.stderr)
        sys.exit(1)

    group_is_cat = is_categorical(df[group_col])
    value_is_cat = is_categorical(df[value_col])

    if (group_is_cat and value_is_cat) or force_test == "chi-square":
        result = run_chi_square(df.dropna(subset=[group_col, value_col]), group_col, value_col)
        result["selection_reason"] = ["两个变量均为分类型 → 选择卡方独立性检验"]
        return result

    groups_data = []
    group_names = []
    for name, sub_df in df.groupby(group_col):
        vals = sub_df[value_col].dropna().values.astype(float)
        if len(vals) > 0:
            groups_data.append(vals)
            group_names.append(str(name))

    n_groups = len(groups_data)
    if n_groups < 2:
        print(f"错误：分组变量 '{group_col}' 只有 {n_groups} 个有效组（至少需要 2 个）", file=sys.stderr)
        sys.exit(1)

    normality_results = {}
    all_normal = True
    for name, data in zip(group_names, groups_data):
        is_norm, _, desc = check_normality(data, alpha)
        normality_results[name] = desc
        if not is_norm:
            all_normal = False

    selection_reason = []

    if force_test:
        test_map = {
            "t-test": lambda: run_independent_ttest(groups_data, group_names, alpha),
            "mann-whitney": lambda: run_mann_whitney(groups_data, group_names),
            "anova": lambda: run_one_way_anova(groups_data, group_names),
            "kruskal-wallis": lambda: run_kruskal_wallis(groups_data, group_names),
        }
        if force_test in test_map:
            selection_reason.append(f"用户强制指定 → {force_test}")
            result = test_map[force_test]()
        else:
            print(f"错误：当前模式不支持检验类型 '{force_test}'", file=sys.stderr)
            sys.exit(1)
    elif n_groups == 2:
        if all_normal:
            selection_reason.append("2 组比较 + 数据近似正态 → 选择独立样本 t 检验")
            result = run_independent_ttest(groups_data, group_names, alpha)
        else:
            selection_reason.append("2 组比较 + 数据不满足正态性 → 选择 Mann-Whitney U 检验")
            result = run_mann_whitney(groups_data, group_names)
    else:
        if all_normal:
            selection_reason.append(f"{n_groups} 组比较 + 数据近似正态 → 选择单因素方差分析 (ANOVA)")
            result = run_one_way_anova(groups_data, group_names)
        else:
            selection_reason.append(f"{n_groups} 组比较 + 数据不满足正态性 → 选择 Kruskal-Wallis 检验")
            result = run_kruskal_wallis(groups_data, group_names)

    result["normality_check"] = normality_results
    result["selection_reason"] = selection_reason
    return result


def main():
    parser = argparse.ArgumentParser(
        description="自动统计检验工具：根据数据特征选择 t 检验/卡方/ANOVA/Mann-Whitney 等，输出结果与通俗解读"
    )
    parser.add_argument("input", help="输入数据文件（CSV/TSV/Excel/JSON）")
    parser.add_argument("--group", "-g", default=None, help="分组变量列名")
    parser.add_argument("--value", "-v", default=None, help="数值/分类变量列名")
    parser.add_argument("--col1", default=None, help="配对检验：第 1 个变量列名")
    parser.add_argument("--col2", default=None, help="配对检验：第 2 个变量列名")
    parser.add_argument("--paired", action="store_true", help="启用配对检验模式")
    parser.add_argument(
        "--test", "-T", default=None,
        choices=["t-test", "mann-whitney", "anova", "kruskal-wallis", "chi-square", "paired-ttest", "wilcoxon"],
        help="强制指定检验方法（默认自动选择）",
    )
    parser.add_argument("--alpha", "-a", type=float, default=0.05, help="显著性水平（默认 0.05）")
    parser.add_argument("--output", "-o", default=None, help="输出 JSON 文件路径")

    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"错误：文件不存在 — {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        df = load_data(args.input)
    except Exception as e:
        print(f"错误：无法读取文件 — {e}", file=sys.stderr)
        sys.exit(1)

    needed = [c for c in [args.group, args.value, args.col1, args.col2] if c]
    for col in needed:
        if col not in df.columns:
            print(f"错误：列 '{col}' 不在数据中。可用列：{list(df.columns)}", file=sys.stderr)
            sys.exit(1)

    if not (args.group and args.value) and not (args.col1 and args.col2):
        print("错误：请指定 --group + --value（分组比较），或 --col1 + --col2（配对比较）", file=sys.stderr)
        sys.exit(1)

    result = auto_select_and_run(df, args.group, args.value, args.col1, args.col2, args.paired, args.test, args.alpha)
    result["alpha"] = args.alpha
    result["interpretation"] = interpret(result, args.alpha)

    output_json = json.dumps(result, ensure_ascii=False, indent=2, default=str)

    if args.output:
        out_dir = os.path.dirname(args.output)
        if out_dir and not os.path.isdir(out_dir):
            os.makedirs(out_dir, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"结果已保存到 {args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""correlation_explorer.py — 相关性矩阵 + 偏相关 + 伪相关识别工具"""

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


def pearson_matrix(df: pd.DataFrame) -> dict:
    cols = df.columns.tolist()
    n = len(cols)
    corr = np.zeros((n, n))
    pval = np.zeros((n, n))

    for i in range(n):
        corr[i, i] = 1.0
        for j in range(i + 1, n):
            r, p = stats.pearsonr(df.iloc[:, i], df.iloc[:, j])
            corr[i, j] = corr[j, i] = r
            pval[i, j] = pval[j, i] = p

    return {
        "columns": cols,
        "correlation": [[round(float(corr[i, j]), 6) for j in range(n)] for i in range(n)],
        "p_values": [[round(float(pval[i, j]), 6) for j in range(n)] for i in range(n)],
    }


def spearman_matrix(df: pd.DataFrame) -> dict:
    cols = df.columns.tolist()
    n = len(cols)
    corr = np.zeros((n, n))
    pval = np.zeros((n, n))

    for i in range(n):
        corr[i, i] = 1.0
        for j in range(i + 1, n):
            r, p = stats.spearmanr(df.iloc[:, i], df.iloc[:, j])
            corr[i, j] = corr[j, i] = r
            pval[i, j] = pval[j, i] = p

    return {
        "columns": cols,
        "correlation": [[round(float(corr[i, j]), 6) for j in range(n)] for i in range(n)],
        "p_values": [[round(float(pval[i, j]), 6) for j in range(n)] for i in range(n)],
    }


def partial_correlation_matrix(df: pd.DataFrame) -> dict:
    """
    Compute partial correlations via the precision matrix.
    partial_corr(i,j) = -P[i,j] / sqrt(P[i,i] * P[j,j])
    where P = inv(correlation_matrix).
    """
    cols = df.columns.tolist()
    n = len(cols)
    nobs = len(df)

    corr_mat = df.corr().values

    try:
        precision = np.linalg.inv(corr_mat)
    except np.linalg.LinAlgError:
        precision = np.linalg.pinv(corr_mat)

    partial = np.zeros((n, n))
    for i in range(n):
        partial[i, i] = 1.0
        for j in range(i + 1, n):
            denom = np.sqrt(abs(precision[i, i] * precision[j, j]))
            if denom > 1e-15:
                val = -precision[i, j] / denom
                val = np.clip(val, -1.0, 1.0)
            else:
                val = 0.0
            partial[i, j] = partial[j, i] = val

    # p-values: df = n_obs - n_vars
    df_val = nobs - n
    pval = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            r = partial[i, j]
            if df_val > 0 and abs(r) < 1.0:
                t_stat = r * np.sqrt(df_val) / np.sqrt(1.0 - r * r)
                p = 2.0 * stats.t.sf(abs(t_stat), df_val)
            elif abs(r) >= 1.0:
                p = 0.0
            else:
                p = float("nan")
            pval[i, j] = pval[j, i] = p

    return {
        "columns": cols,
        "partial_correlation": [[round(float(partial[i, j]), 6) for j in range(n)] for i in range(n)],
        "p_values": [[round(float(pval[i, j]), 6) for j in range(n)] for i in range(n)],
        "df": df_val,
    }


def detect_spurious(pearson_result: dict, partial_result: dict,
                    alpha: float = 0.05, drop_threshold: float = 0.5) -> list:
    """
    Flag pairs where bivariate correlation is significant
    but partial correlation either loses significance or drops substantially.
    """
    cols = pearson_result["columns"]
    n = len(cols)
    spurious = []

    for i in range(n):
        for j in range(i + 1, n):
            r_bi = pearson_result["correlation"][i][j]
            p_bi = pearson_result["p_values"][i][j]
            r_pa = partial_result["partial_correlation"][i][j]
            p_pa = partial_result["p_values"][i][j]

            if p_bi >= alpha:
                continue

            reasons = []

            if not np.isnan(p_pa) and p_pa >= alpha:
                reasons.append("偏相关不显著")

            if abs(r_bi) > 1e-10:
                drop_ratio = 1.0 - abs(r_pa) / abs(r_bi)
                if drop_ratio > drop_threshold:
                    reasons.append(f"相关系数下降 {drop_ratio * 100:.1f}%")

            if reasons:
                spurious.append({
                    "var_x": cols[i],
                    "var_y": cols[j],
                    "pearson_r": round(float(r_bi), 6),
                    "pearson_p": round(float(p_bi), 6),
                    "partial_r": round(float(r_pa), 6),
                    "partial_p": round(float(p_pa), 6) if not np.isnan(p_pa) else None,
                    "drop_pct": round(
                        (1.0 - abs(r_pa) / abs(r_bi)) * 100, 1
                    ) if abs(r_bi) > 1e-10 else 0.0,
                    "reasons": reasons,
                })

    return spurious


def significance_label(p: float) -> str:
    if np.isnan(p):
        return "（无法计算）"
    if p < 0.001:
        return "***（极显著）"
    elif p < 0.01:
        return "**（高度显著）"
    elif p < 0.05:
        return "*（显著）"
    elif p < 0.1:
        return ".（边际显著）"
    else:
        return "（不显著）"


def strength_label(r: float) -> str:
    a = abs(r)
    if a >= 0.8:
        return "很强"
    elif a >= 0.6:
        return "强"
    elif a >= 0.4:
        return "中等"
    elif a >= 0.2:
        return "弱"
    else:
        return "极弱/无"


def interpret(pearson: dict, partial: dict, spurious: list) -> dict:
    cols = pearson["columns"]
    n = len(cols)

    summary = [f"分析了 {n} 个变量的相关性：{', '.join(cols)}"]

    pairs = []
    for i in range(n):
        for j in range(i + 1, n):
            pairs.append((
                cols[i], cols[j],
                pearson["correlation"][i][j],
                pearson["p_values"][i][j],
            ))
    pairs.sort(key=lambda x: abs(x[2]), reverse=True)

    top_correlations = []
    for x, y, r, p in pairs[:5]:
        direction = "正" if r > 0 else "负"
        strength = strength_label(r)
        sig = significance_label(p)
        top_correlations.append(
            f"{x} <-> {y}：r = {r:.4f}（{strength}{direction}相关，{sig}）"
        )

    partial_insights = []
    for i in range(n):
        for j in range(i + 1, n):
            r_bi = pearson["correlation"][i][j]
            r_pa = partial["partial_correlation"][i][j]
            if abs(r_bi) > 0.2 and abs(r_bi) > 1e-10:
                abs_change = (abs(r_pa) - abs(r_bi)) / abs(r_bi) * 100
                sign_flip = (r_bi > 0) != (r_pa > 0) and abs(r_pa) > 0.05
                if abs(abs_change) > 30 or sign_flip:
                    if sign_flip:
                        word = "方向反转并减弱"
                    elif abs_change > 0:
                        word = "增强"
                    else:
                        word = "减弱"
                    partial_insights.append(
                        f"{cols[i]} <-> {cols[j]}：Pearson r = {r_bi:.4f} -> "
                        f"偏相关 r = {r_pa:.4f}（控制其他变量后{word}了 {abs(abs_change):.1f}%）"
                    )

    if not partial_insights:
        partial_insights = ["各变量对的偏相关与简单相关差异不大。"]

    spurious_summary = []
    if spurious:
        spurious_summary.append(f"发现 {len(spurious)} 对疑似伪相关：")
        for s in spurious:
            spurious_summary.append(
                f"  {s['var_x']} <-> {s['var_y']}："
                f"Pearson r = {s['pearson_r']:.4f} -> 偏相关 r = {s['partial_r']:.4f}"
                f"（{'、'.join(s['reasons'])}）"
                f"——两变量的相关性很可能是由其他混淆变量导致的"
            )
    else:
        spurious_summary.append(
            "未发现明显的伪相关——各变量对的相关性在控制其他变量后仍然基本成立。"
        )

    return {
        "概览": summary,
        "最强相关对": top_correlations,
        "偏相关洞察": partial_insights,
        "伪相关检测": spurious_summary,
    }


def main():
    parser = argparse.ArgumentParser(
        description="相关性矩阵（Pearson/Spearman）+ 偏相关 + 伪相关识别工具"
    )
    parser.add_argument("input", help="输入数据文件路径（CSV/TSV/Excel/JSON）")
    parser.add_argument(
        "--features", "-f", default=None,
        help="要分析的列名，逗号分隔。省略则使用所有数值列",
    )
    parser.add_argument(
        "--method", "-m", choices=["all", "pearson", "spearman"], default="all",
        help="相关系数类型：all（全部，默认）、pearson、spearman",
    )
    parser.add_argument(
        "--alpha", "-a", type=float, default=0.05,
        help="显著性水平（默认 0.05）",
    )
    parser.add_argument(
        "--drop-threshold", "-d", type=float, default=0.5,
        help="伪相关判定的下降阈值（默认 0.5，即 50%%）",
    )
    parser.add_argument(
        "--output", "-o", default=None,
        help="输出 JSON 文件路径（省略则打印到标准输出）",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"错误：文件不存在 — {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        df = load_data(args.input)
    except Exception as e:
        print(f"错误：无法读取文件 — {e}", file=sys.stderr)
        sys.exit(1)

    if args.features:
        features = [f.strip() for f in args.features.split(",")]
        missing = [f for f in features if f not in df.columns]
        if missing:
            print(
                f"错误：以下列不在数据中：{missing}。可用列：{list(df.columns)}",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        features = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(features) < 2:
            print("错误：至少需要 2 个数值列来计算相关性。", file=sys.stderr)
            sys.exit(1)

    df_clean = df[features].copy()
    for col in features:
        if not np.issubdtype(df_clean[col].dtype, np.number):
            try:
                df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
            except Exception:
                print(f"错误：列 '{col}' 无法转换为数值类型。", file=sys.stderr)
                sys.exit(1)

    before = len(df_clean)
    df_clean = df_clean.dropna()
    after = len(df_clean)
    if before > after:
        print(
            f"提示：已删除 {before - after} 行含缺失值的数据（剩余 {after} 行）",
            file=sys.stderr,
        )

    if after < len(features) + 1:
        print(
            f"错误：有效数据只有 {after} 行，不足以计算 {len(features)} 个变量的相关性。",
            file=sys.stderr,
        )
        sys.exit(1)

    result = {
        "n_observations": after,
        "n_variables": len(features),
        "features": features,
        "alpha": args.alpha,
    }

    if args.method in ("all", "pearson"):
        result["pearson"] = pearson_matrix(df_clean)
        print("提示：已计算 Pearson 相关矩阵", file=sys.stderr)

    if args.method in ("all", "spearman"):
        result["spearman"] = spearman_matrix(df_clean)
        print("提示：已计算 Spearman 相关矩阵", file=sys.stderr)

    result["partial_correlation"] = partial_correlation_matrix(df_clean)
    print("提示：已计算偏相关矩阵", file=sys.stderr)

    pearson_for_detect = result.get("pearson") or pearson_matrix(df_clean)
    result["spurious_correlations"] = detect_spurious(
        pearson_for_detect,
        result["partial_correlation"],
        alpha=args.alpha,
        drop_threshold=args.drop_threshold,
    )
    if result["spurious_correlations"]:
        print(
            f"提示：发现 {len(result['spurious_correlations'])} 对疑似伪相关",
            file=sys.stderr,
        )

    result["interpretation"] = interpret(
        pearson_for_detect,
        result["partial_correlation"],
        result["spurious_correlations"],
    )

    output_json = json.dumps(result, ensure_ascii=False, indent=2)

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

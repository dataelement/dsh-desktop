#!/usr/bin/env python3
"""
regression_analyzer.py — 自动回归建模工具
支持线性回归 (OLS) 和逻辑回归 (Logit)，输出系数、R²、p-value、VIF 及通俗解读。
"""

import argparse
import json
import sys
import os
from io import StringIO

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
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


def detect_regression_type(series: pd.Series) -> str:
    unique = series.dropna().unique()
    if len(unique) == 2 and set(unique).issubset({0, 1, 0.0, 1.0, True, False}):
        return "logistic"
    return "linear"


def compute_vif(X: pd.DataFrame) -> dict:
    if X.shape[1] < 2:
        return {col: float("nan") for col in X.columns}
    vif_data = {}
    arr = X.values.astype(float)
    for i, col in enumerate(X.columns):
        try:
            vif_data[col] = round(variance_inflation_factor(arr, i), 4)
        except Exception:
            vif_data[col] = float("nan")
    return vif_data


def significance_label(p: float) -> str:
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


def vif_warning(vif_val: float) -> str:
    if np.isnan(vif_val):
        return "无法计算"
    elif vif_val > 10:
        return "严重多重共线性，建议移除或合并"
    elif vif_val > 5:
        return "中度多重共线性，需关注"
    else:
        return "正常"


def interpret_linear(result, vif_dict: dict) -> dict:
    summary_lines = []
    r2 = result.rsquared
    adj_r2 = result.rsquared_adj
    f_pval = result.f_pvalue

    if r2 >= 0.8:
        fit_desc = "模型拟合优良"
    elif r2 >= 0.5:
        fit_desc = "模型拟合中等"
    elif r2 >= 0.3:
        fit_desc = "模型拟合较弱"
    else:
        fit_desc = "模型拟合很差"

    summary_lines.append(
        f"R² = {r2:.4f}（{fit_desc}，模型解释了因变量 {r2*100:.1f}% 的变异）"
    )
    summary_lines.append(f"调整后 R² = {adj_r2:.4f}")

    if f_pval < 0.05:
        summary_lines.append(
            f"F 检验 p = {f_pval:.4g}，模型整体显著（至少有一个自变量有预测作用）"
        )
    else:
        summary_lines.append(
            f"F 检验 p = {f_pval:.4g}，模型整体不显著（自变量组合未能有效预测因变量）"
        )

    coef_interpretations = []
    for name in result.params.index:
        coef = result.params[name]
        pval = result.pvalues[name]
        sig = significance_label(pval)
        if name == "const":
            coef_interpretations.append(
                f"截距 = {coef:.4f}（p = {pval:.4g} {sig}）：所有自变量为 0 时因变量的预测值"
            )
        else:
            direction = "正向" if coef > 0 else "负向"
            vif_val = vif_dict.get(name, float("nan"))
            vif_note = vif_warning(vif_val)
            vif_str = f"VIF = {vif_val:.2f}" if not np.isnan(vif_val) else "VIF = N/A"
            coef_interpretations.append(
                f"{name}：系数 = {coef:.4f}（p = {pval:.4g} {sig}），{direction}影响，"
                f"每增加 1 单位因变量变化 {coef:.4f}。{vif_str}（{vif_note}）"
            )

    return {
        "模型概述": summary_lines,
        "各变量解读": coef_interpretations,
    }


def interpret_logistic(result, vif_dict: dict) -> dict:
    summary_lines = []
    pseudo_r2 = result.prsquared
    llr_pval = result.llr_pvalue

    if pseudo_r2 >= 0.4:
        fit_desc = "模型拟合良好"
    elif pseudo_r2 >= 0.2:
        fit_desc = "模型拟合可接受"
    else:
        fit_desc = "模型拟合较弱"

    summary_lines.append(
        f"Pseudo R²（McFadden）= {pseudo_r2:.4f}（{fit_desc}）"
    )

    if llr_pval < 0.05:
        summary_lines.append(
            f"似然比检验 p = {llr_pval:.4g}，模型整体显著"
        )
    else:
        summary_lines.append(
            f"似然比检验 p = {llr_pval:.4g}，模型整体不显著"
        )

    coef_interpretations = []
    for name in result.params.index:
        coef = result.params[name]
        pval = result.pvalues[name]
        sig = significance_label(pval)
        odds_ratio = np.exp(coef)
        if name == "const":
            coef_interpretations.append(
                f"截距 = {coef:.4f}（p = {pval:.4g} {sig}），基础几率比 = {odds_ratio:.4f}"
            )
        else:
            vif_val = vif_dict.get(name, float("nan"))
            vif_note = vif_warning(vif_val)
            vif_str = f"VIF = {vif_val:.2f}" if not np.isnan(vif_val) else "VIF = N/A"
            if odds_ratio > 1:
                direction = f"每增加 1 单位，事件发生的几率增加 {(odds_ratio - 1) * 100:.1f}%"
            else:
                direction = f"每增加 1 单位，事件发生的几率降低 {(1 - odds_ratio) * 100:.1f}%"
            coef_interpretations.append(
                f"{name}：系数 = {coef:.4f}，OR = {odds_ratio:.4f}（p = {pval:.4g} {sig}），"
                f"{direction}。{vif_str}（{vif_note}）"
            )

    return {
        "模型概述": summary_lines,
        "各变量解读": coef_interpretations,
    }


def run_linear(df: pd.DataFrame, target: str, features: list, add_const: bool = True) -> dict:
    y = df[target].astype(float)
    X = df[features].astype(float)

    vif_dict = compute_vif(X)

    if add_const:
        X = sm.add_constant(X)

    model = sm.OLS(y, X)
    result = model.fit()

    coefficients = {}
    for name in result.params.index:
        coefficients[name] = {
            "coefficient": round(float(result.params[name]), 6),
            "std_error": round(float(result.bse[name]), 6),
            "t_value": round(float(result.tvalues[name]), 4),
            "p_value": round(float(result.pvalues[name]), 6),
            "ci_lower": round(float(result.conf_int().loc[name, 0]), 6),
            "ci_upper": round(float(result.conf_int().loc[name, 1]), 6),
        }

    output = {
        "type": "linear",
        "n_observations": int(result.nobs),
        "n_features": len(features),
        "r_squared": round(float(result.rsquared), 6),
        "r_squared_adj": round(float(result.rsquared_adj), 6),
        "f_statistic": round(float(result.fvalue), 4),
        "f_p_value": round(float(result.f_pvalue), 6),
        "aic": round(float(result.aic), 4),
        "bic": round(float(result.bic), 4),
        "durbin_watson": round(float(sm.stats.stattools.durbin_watson(result.resid)), 4),
        "coefficients": coefficients,
        "vif": {k: round(v, 4) if not np.isnan(v) else None for k, v in vif_dict.items()},
        "interpretation": interpret_linear(result, vif_dict),
    }

    buf = StringIO()
    buf.write(result.summary().as_text())
    output["statsmodels_summary"] = buf.getvalue()

    return output


def run_logistic(df: pd.DataFrame, target: str, features: list, add_const: bool = True) -> dict:
    y = df[target].astype(float)
    X = df[features].astype(float)

    vif_dict = compute_vif(X)

    if add_const:
        X = sm.add_constant(X)

    model = sm.Logit(y, X)
    try:
        result = model.fit(disp=0, maxiter=100)
    except Exception as e:
        print(f"错误：逻辑回归拟合失败 — {e}", file=sys.stderr)
        sys.exit(1)

    coefficients = {}
    for name in result.params.index:
        coef = float(result.params[name])
        coefficients[name] = {
            "coefficient": round(coef, 6),
            "std_error": round(float(result.bse[name]), 6),
            "z_value": round(float(result.tvalues[name]), 4),
            "p_value": round(float(result.pvalues[name]), 6),
            "odds_ratio": round(float(np.exp(coef)), 6),
            "ci_lower": round(float(result.conf_int().loc[name, 0]), 6),
            "ci_upper": round(float(result.conf_int().loc[name, 1]), 6),
        }

    output = {
        "type": "logistic",
        "n_observations": int(result.nobs),
        "n_features": len(features),
        "pseudo_r_squared": round(float(result.prsquared), 6),
        "log_likelihood": round(float(result.llf), 4),
        "llr_p_value": round(float(result.llr_pvalue), 6),
        "aic": round(float(result.aic), 4),
        "bic": round(float(result.bic), 4),
        "coefficients": coefficients,
        "vif": {k: round(v, 4) if not np.isnan(v) else None for k, v in vif_dict.items()},
        "interpretation": interpret_logistic(result, vif_dict),
    }

    buf = StringIO()
    buf.write(result.summary().as_text())
    output["statsmodels_summary"] = buf.getvalue()

    return output


def main():
    parser = argparse.ArgumentParser(
        description="自动回归建模工具：支持线性回归和逻辑回归，输出系数/R²/p-value/VIF 及通俗解读"
    )
    parser.add_argument("input", help="输入数据文件路径（CSV/TSV/Excel/JSON）")
    parser.add_argument("--target", "-t", required=True, help="因变量（目标变量）列名")
    parser.add_argument(
        "--features", "-f", default=None,
        help="自变量列名，逗号分隔。省略则使用除目标变量外的所有数值列"
    )
    parser.add_argument(
        "--type", "-T", choices=["linear", "logistic", "auto"], default="auto",
        help="回归类型：linear（线性）、logistic（逻辑）、auto（自动检测，默认）"
    )
    parser.add_argument("--no-const", action="store_true", help="不添加截距项（常数项）")
    parser.add_argument("--output", "-o", default=None, help="输出 JSON 文件路径（省略则打印到标准输出）")
    parser.add_argument("--keep-na", action="store_true", help="保留缺失值（会导致回归报错，仅用于调试）")

    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"错误：文件不存在 — {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        df = load_data(args.input)
    except Exception as e:
        print(f"错误：无法读取文件 — {e}", file=sys.stderr)
        sys.exit(1)

    if args.target not in df.columns:
        print(f"错误：目标变量 '{args.target}' 不在数据中。可用列：{list(df.columns)}", file=sys.stderr)
        sys.exit(1)

    if args.features:
        features = [f.strip() for f in args.features.split(",")]
        missing = [f for f in features if f not in df.columns]
        if missing:
            print(f"错误：以下自变量不在数据中：{missing}。可用列：{list(df.columns)}", file=sys.stderr)
            sys.exit(1)
    else:
        features = [c for c in df.select_dtypes(include=[np.number]).columns if c != args.target]
        if not features:
            print("错误：未找到数值型自变量。请用 --features 手动指定。", file=sys.stderr)
            sys.exit(1)

    cols_needed = features + [args.target]
    for col in cols_needed:
        if not np.issubdtype(df[col].dtype, np.number):
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except Exception:
                print(f"错误：列 '{col}' 无法转换为数值类型。", file=sys.stderr)
                sys.exit(1)

    if not args.keep_na:
        before = len(df)
        df = df[cols_needed].dropna()
        after = len(df)
        if before > after:
            print(f"提示：已删除 {before - after} 行含缺失值的数据（剩余 {after} 行）", file=sys.stderr)

    if len(df) < len(features) + 2:
        print(
            f"错误：有效数据只有 {len(df)} 行，不足以拟合 {len(features)} 个自变量的模型"
            f"（至少需要 {len(features) + 2} 行）。",
            file=sys.stderr,
        )
        sys.exit(1)

    reg_type = args.type
    if reg_type == "auto":
        reg_type = detect_regression_type(df[args.target])
        print(f"提示：自动检测回归类型 → {reg_type}", file=sys.stderr)

    add_const = not args.no_const

    if reg_type == "linear":
        result = run_linear(df, args.target, features, add_const)
    else:
        result = run_logistic(df, args.target, features, add_const)

    result["target"] = args.target
    result["features"] = features

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

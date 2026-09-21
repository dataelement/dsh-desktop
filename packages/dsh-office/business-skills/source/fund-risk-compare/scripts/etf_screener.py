#!/usr/bin/env python3
"""
ETF Multi-Dimensional Screener.

Computes annualized return, max drawdown, Sharpe ratio, and correlation matrix
from user-provided NAV (Net Asset Value) CSV data.

Usage:
    python etf_screener.py --input nav_data.csv
    python etf_screener.py --input nav_data.csv --risk-free 0.03 --output report.csv
"""

import argparse
import csv
import json
import math
import os
import sys


def read_csv_nav(filepath):
    """Read NAV data from CSV. Expected: date,ETF1,ETF2,..."""
    dates = []
    nav_data = {}

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

        etf_names = [h.strip() for h in header[1:]]
        if not etf_names:
            raise ValueError("CSV must have at least one ETF column after the date column.")
        for name in etf_names:
            nav_data[name] = []

        for row_num, row in enumerate(reader, start=2):
            if not row or not row[0].strip():
                continue
            dates.append(row[0].strip())
            for i, name in enumerate(etf_names):
                val = row[i + 1].strip() if i + 1 < len(row) else ""
                if val == "" or val.lower() == "nan":
                    nav_data[name].append(None)
                else:
                    try:
                        nav_data[name].append(float(val))
                    except ValueError:
                        raise ValueError(
                            f"Row {row_num}, column '{name}': cannot parse '{val}' as number."
                        )

    return dates, etf_names, nav_data


def compute_daily_returns(navs):
    """Compute daily returns from NAV series."""
    returns = []
    for i in range(1, len(navs)):
        if navs[i] is not None and navs[i - 1] is not None and navs[i - 1] != 0:
            returns.append(navs[i] / navs[i - 1] - 1)
        else:
            returns.append(None)
    return returns


def annualized_return(navs, trading_days=252):
    """Annualized return = (NAV_end / NAV_start) ^ (trading_days / n_days) - 1."""
    valid = [(i, v) for i, v in enumerate(navs) if v is not None and v > 0]
    if len(valid) < 2:
        return None
    first_idx, first_nav = valid[0]
    last_idx, last_nav = valid[-1]
    n_days = last_idx - first_idx
    if n_days == 0:
        return None
    total_return = last_nav / first_nav
    if total_return <= 0:
        return None
    return total_return ** (trading_days / n_days) - 1


def max_drawdown(navs):
    """Maximum peak-to-trough decline in NAV series."""
    valid_navs = [v for v in navs if v is not None and v > 0]
    if len(valid_navs) < 2:
        return None

    peak = valid_navs[0]
    max_dd = 0.0

    for nav in valid_navs:
        if nav > peak:
            peak = nav
        dd = (peak - nav) / peak
        if dd > max_dd:
            max_dd = dd

    return max_dd


def annualized_volatility(returns, trading_days=252):
    """Annualized volatility = daily_std * sqrt(trading_days)."""
    valid = [r for r in returns if r is not None]
    if len(valid) < 2:
        return None
    n = len(valid)
    mean = sum(valid) / n
    variance = sum((r - mean) ** 2 for r in valid) / (n - 1)
    return math.sqrt(variance) * math.sqrt(trading_days)


def sharpe_ratio(ann_ret, ann_vol, risk_free=0.02):
    """Sharpe = (annualized_return - risk_free) / annualized_volatility."""
    if ann_ret is None or ann_vol is None or ann_vol == 0:
        return None
    return (ann_ret - risk_free) / ann_vol


def pearson_correlation(x, y):
    """Pearson correlation between two return series (skips None pairs)."""
    pairs = [(a, b) for a, b in zip(x, y) if a is not None and b is not None]
    n = len(pairs)
    if n < 2:
        return None

    mean_x = sum(a for a, _ in pairs) / n
    mean_y = sum(b for _, b in pairs) / n

    cov = sum((a - mean_x) * (b - mean_y) for a, b in pairs) / (n - 1)
    var_x = sum((a - mean_x) ** 2 for a, _ in pairs) / (n - 1)
    var_y = sum((b - mean_y) ** 2 for _, b in pairs) / (n - 1)

    if var_x == 0 or var_y == 0:
        return None

    return cov / (math.sqrt(var_x) * math.sqrt(var_y))


def correlation_matrix(returns_dict, etf_names):
    """Pairwise Pearson correlation matrix of daily returns."""
    n = len(etf_names)
    matrix = [[0.0] * n for _ in range(n)]

    for i in range(n):
        matrix[i][i] = 1.0
        for j in range(i + 1, n):
            corr = pearson_correlation(
                returns_dict[etf_names[i]], returns_dict[etf_names[j]]
            )
            matrix[i][j] = corr
            matrix[j][i] = corr

    return matrix


def compute_all_metrics(etf_names, nav_data, risk_free=0.02, trading_days=252):
    """Compute all metrics for all ETFs and return (metrics_dict, corr_matrix)."""
    metrics = {}
    returns_dict = {}

    for name in etf_names:
        navs = nav_data[name]
        daily_ret = compute_daily_returns(navs)
        returns_dict[name] = daily_ret

        ann_ret = annualized_return(navs, trading_days)
        mdd = max_drawdown(navs)
        ann_vol = annualized_volatility(daily_ret, trading_days)
        sr = sharpe_ratio(ann_ret, ann_vol, risk_free)

        metrics[name] = {
            "annualized_return": ann_ret,
            "max_drawdown": mdd,
            "annualized_volatility": ann_vol,
            "sharpe_ratio": sr,
        }

    corr = correlation_matrix(returns_dict, etf_names)
    return metrics, corr


def fmt_pct(val, decimals=2):
    if val is None:
        return "N/A"
    return f"{val * 100:.{decimals}f}%"


def fmt_float(val, decimals=4):
    if val is None:
        return "N/A"
    return f"{val:.{decimals}f}"


def print_report(etf_names, metrics, corr_matrix, risk_free, dates):
    """Print formatted comparison report to stdout."""
    print("=" * 78)
    print("  ETF Multi-Dimensional Comparison / ETF 多维对比报告")
    print("=" * 78)
    print()
    print(f"  Risk-Free Rate (无风险利率): {fmt_pct(risk_free)}")
    if dates:
        print(f"  Period (区间): {dates[0]} ~ {dates[-1]}  ({len(dates)} trading days)")
    print()

    name_w = max(max((len(n) for n in etf_names), default=6), 10) + 2
    col_w = 16

    print(
        f"  {'ETF':<{name_w}}"
        f" {'Ann.Return':>{col_w}}"
        f" {'Max Drawdown':>{col_w}}"
        f" {'Ann.Volatility':>{col_w}}"
        f" {'Sharpe Ratio':>{col_w}}"
    )
    print(
        f"  {'':.<{name_w}}"
        f" {'年化收益':>{col_w}}"
        f" {'最大回撤':>{col_w}}"
        f" {'年化波动率':>{col_w}}"
        f" {'夏普比率':>{col_w}}"
    )
    print("  " + "-" * (name_w + col_w * 4 + 4))

    for name in etf_names:
        m = metrics[name]
        print(
            f"  {name:<{name_w}}"
            f" {fmt_pct(m['annualized_return']):>{col_w}}"
            f" {fmt_pct(m['max_drawdown']):>{col_w}}"
            f" {fmt_pct(m['annualized_volatility']):>{col_w}}"
            f" {fmt_float(m['sharpe_ratio']):>{col_w}}"
        )

    print()

    if len(etf_names) >= 2:
        print("-" * 78)
        print("  Correlation Matrix / 相关性矩阵 (基于日收益率)")
        print("-" * 78)
        print()

        c_w = max(max((len(n) for n in etf_names), default=6), 8) + 2

        header = f"  {'':>{c_w}}"
        for name in etf_names:
            header += f" {name:>{c_w}}"
        print(header)
        print("  " + "-" * (c_w * (len(etf_names) + 1) + len(etf_names)))

        for i, name in enumerate(etf_names):
            line = f"  {name:>{c_w}}"
            for j in range(len(etf_names)):
                val = corr_matrix[i][j]
                line += f" {fmt_float(val):>{c_w}}"
            print(line)

        print()

    print("=" * 78)


def export_csv(etf_names, metrics, corr_matrix, filepath):
    """Export metrics and correlation to CSV."""
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        writer.writerow(
            ["ETF", "Annualized Return", "Max Drawdown", "Annualized Volatility", "Sharpe Ratio"]
        )
        for name in etf_names:
            m = metrics[name]
            writer.writerow([
                name,
                f"{m['annualized_return']:.6f}" if m["annualized_return"] is not None else "N/A",
                f"{m['max_drawdown']:.6f}" if m["max_drawdown"] is not None else "N/A",
                f"{m['annualized_volatility']:.6f}" if m["annualized_volatility"] is not None else "N/A",
                f"{m['sharpe_ratio']:.6f}" if m["sharpe_ratio"] is not None else "N/A",
            ])

        writer.writerow([])
        writer.writerow(["Correlation"] + etf_names)
        for i, name in enumerate(etf_names):
            row = [name]
            for j in range(len(etf_names)):
                val = corr_matrix[i][j]
                row.append(f"{val:.6f}" if val is not None else "N/A")
            writer.writerow(row)

    print(f"\n  Results exported to: {filepath}")


def export_json_file(etf_names, metrics, corr_matrix, risk_free, filepath):
    """Export full results as JSON file."""
    output = build_json_output(etf_names, metrics, corr_matrix, risk_free)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n  Results exported to: {filepath}")


def build_json_output(etf_names, metrics, corr_matrix, risk_free):
    """Build JSON-serializable output dict."""
    output = {
        "risk_free_rate": risk_free,
        "metrics": {},
        "correlation_matrix": {
            "etf_names": etf_names,
            "matrix": [
                [round(v, 6) if v is not None else None for v in row]
                for row in corr_matrix
            ],
        },
    }
    for name in etf_names:
        m = metrics[name]
        output["metrics"][name] = {
            k: round(v, 6) if v is not None else None for k, v in m.items()
        }
    return output


def build_parser():
    parser = argparse.ArgumentParser(
        description="ETF Multi-Dimensional Screener: Annualized Return, Max Drawdown, "
                    "Sharpe Ratio, Correlation Matrix",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python etf_screener.py --input nav_data.csv
  python etf_screener.py --input nav_data.csv --risk-free 0.03 --output report.csv
  python etf_screener.py --input nav_data.csv --json

Input CSV format (first column = date, remaining columns = ETF NAVs):
  date,ETF_A,ETF_B,ETF_C
  2023-01-03,1.0000,1.0000,1.0000
  2023-01-04,1.0050,0.9980,1.0020
  ...
        """,
    )

    parser.add_argument(
        "--input", "-i", type=str, required=True,
        help="Path to CSV file with NAV data (required)",
    )
    parser.add_argument(
        "--risk-free", "-rf", type=float, default=0.02,
        help="Annual risk-free rate (default: 0.02 = 2%%)",
    )
    parser.add_argument(
        "--trading-days", type=int, default=252,
        help="Trading days per year (default: 252)",
    )
    parser.add_argument(
        "--output", "-o", type=str, default=None,
        help="Output file path (.csv or .json)",
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output results as JSON to stdout",
    )

    return parser


def validate_args(args):
    """Validate CLI arguments. Returns list of error strings."""
    errors = []
    if not os.path.isfile(args.input):
        errors.append(f"Input file not found: {args.input}")
    if args.risk_free < 0 or args.risk_free > 0.5:
        errors.append(f"Risk-free rate should be 0-50%, got: {args.risk_free:.2%}")
    if args.trading_days < 1 or args.trading_days > 365:
        errors.append(f"Trading days should be 1-365, got: {args.trading_days}")
    if args.output:
        ext = os.path.splitext(args.output)[1].lower()
        if ext not in (".csv", ".json"):
            errors.append(f"Output file must be .csv or .json, got: {args.output}")
    return errors


def main():
    parser = build_parser()
    args = parser.parse_args()

    errors = validate_args(args)
    if errors:
        for e in errors:
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        dates, etf_names, nav_data = read_csv_nav(args.input)
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        sys.exit(1)

    if len(etf_names) < 1:
        print("Error: CSV must contain at least one ETF column.", file=sys.stderr)
        sys.exit(1)

    if len(dates) < 2:
        print("Error: CSV must contain at least 2 rows of NAV data.", file=sys.stderr)
        sys.exit(1)

    metrics, corr_matrix = compute_all_metrics(
        etf_names, nav_data,
        risk_free=args.risk_free,
        trading_days=args.trading_days,
    )

    if args.json:
        output = build_json_output(etf_names, metrics, corr_matrix, args.risk_free)
        output["trading_days"] = args.trading_days
        output["data_points"] = len(dates)
        output["period"] = {"start": dates[0], "end": dates[-1]}
        json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
        print()
        sys.exit(0)

    print_report(etf_names, metrics, corr_matrix, args.risk_free, dates)

    if args.output:
        ext = os.path.splitext(args.output)[1].lower()
        if ext == ".csv":
            export_csv(etf_names, metrics, corr_matrix, args.output)
        elif ext == ".json":
            export_json_file(etf_names, metrics, corr_matrix, args.risk_free, args.output)

    print("\n  Done.")


if __name__ == "__main__":
    main()

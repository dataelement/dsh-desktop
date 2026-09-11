#!/usr/bin/env python3
"""
anomaly_detector.py - 多方法异常检测工具

支持 Z-score、IQR、移动平均偏离三种方法，自动分类标注异常。

Usage:
    python3 anomaly_detector.py data.csv
    python3 anomaly_detector.py data.csv --methods z-score,iqr --columns price,volume
    python3 anomaly_detector.py data.csv --z-threshold 2.5 --window 7 --output result.json
"""

import argparse
import csv
import json
import math
import os
import statistics
import sys


def read_csv(filepath):
    if not os.path.isfile(filepath):
        print(f"错误：文件不存在 - {filepath}", file=sys.stderr)
        sys.exit(1)
    headers = []
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            print("错误：CSV 文件为空或缺少表头", file=sys.stderr)
            sys.exit(1)
        headers = list(reader.fieldnames)
        for row in reader:
            rows.append(row)
    if not rows:
        print("错误：CSV 文件没有数据行", file=sys.stderr)
        sys.exit(1)
    return headers, rows


def try_float(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(str(val).strip())
    except ValueError:
        return None


def detect_numeric_columns(headers, rows):
    numeric_cols = []
    for col in headers:
        numeric_count = 0
        total = 0
        for row in rows:
            v = row.get(col)
            if v is not None and str(v).strip() != "":
                total += 1
                if try_float(v) is not None:
                    numeric_count += 1
        if total > 0 and numeric_count / total >= 0.8:
            numeric_cols.append(col)
    return numeric_cols


def extract_column_values(rows, col):
    values = []
    indices = []
    for i, row in enumerate(rows):
        v = try_float(row.get(col))
        if v is not None:
            values.append(v)
            indices.append(i)
    return values, indices


def compute_stats(values):
    n = len(values)
    if n < 2:
        return None
    mean = statistics.mean(values)
    std = statistics.stdev(values)
    sorted_vals = sorted(values)
    q1_idx = (n - 1) * 0.25
    q3_idx = (n - 1) * 0.75
    q1 = _interpolate(sorted_vals, q1_idx)
    q3 = _interpolate(sorted_vals, q3_idx)
    iqr = q3 - q1
    return {
        "mean": round(mean, 6),
        "std": round(std, 6),
        "min": min(values),
        "max": max(values),
        "q1": round(q1, 6),
        "median": round(statistics.median(values), 6),
        "q3": round(q3, 6),
        "iqr": round(iqr, 6),
        "count": n,
    }


def _interpolate(sorted_vals, idx):
    lower = int(math.floor(idx))
    upper = int(math.ceil(idx))
    if lower == upper:
        return sorted_vals[lower]
    frac = idx - lower
    return sorted_vals[lower] * (1 - frac) + sorted_vals[upper] * frac


def zscore_detect(values, indices, threshold=3.0):
    if len(values) < 3:
        return {}
    mean = statistics.mean(values)
    std = statistics.stdev(values)
    if std == 0:
        return {}
    anomalies = {}
    for val, idx in zip(values, indices):
        z = (val - mean) / std
        if abs(z) >= threshold:
            anomalies[idx] = {
                "z_score": round(z, 4),
                "mean": round(mean, 4),
                "std": round(std, 4),
                "severity": "extreme" if abs(z) >= threshold * 1.5 else "moderate",
            }
    return anomalies


def iqr_detect(values, indices, multiplier=1.5):
    if len(values) < 4:
        return {}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    q1 = _interpolate(sorted_vals, (n - 1) * 0.25)
    q3 = _interpolate(sorted_vals, (n - 1) * 0.75)
    iqr = q3 - q1
    if iqr == 0:
        return {}
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    extreme_lower = q1 - 3.0 * iqr
    extreme_upper = q3 + 3.0 * iqr
    anomalies = {}
    for val, idx in zip(values, indices):
        if val < lower or val > upper:
            is_extreme = val < extreme_lower or val > extreme_upper
            anomalies[idx] = {
                "iqr_bounds": [round(lower, 4), round(upper, 4)],
                "q1": round(q1, 4),
                "q3": round(q3, 4),
                "iqr": round(iqr, 4),
                "severity": "extreme" if is_extreme else "moderate",
            }
    return anomalies


def moving_avg_detect(values, indices, window=5, threshold=2.0):
    n = len(values)
    if n < window + 2:
        return {}
    ma_values = []
    for i in range(n):
        start = max(0, i - window + 1)
        segment = values[start : i + 1]
        ma_values.append(statistics.mean(segment))

    deviations = [abs(values[i] - ma_values[i]) for i in range(n)]
    valid_devs = [d for d in deviations if d > 0]
    if not valid_devs:
        return {}
    dev_std = statistics.stdev(valid_devs) if len(valid_devs) >= 2 else statistics.mean(valid_devs)
    if dev_std == 0:
        return {}

    anomalies = {}
    for i in range(n):
        dev_ratio = deviations[i] / dev_std
        if dev_ratio >= threshold:
            anomalies[indices[i]] = {
                "moving_avg": round(ma_values[i], 4),
                "deviation": round(deviations[i], 4),
                "deviation_ratio": round(dev_ratio, 4),
                "window": window,
                "severity": "extreme" if dev_ratio >= threshold * 2 else "moderate",
            }
    return anomalies


def classify_anomaly(row_idx, column, value, method_results):
    methods_detected = list(method_results.keys())
    num_methods = len(methods_detected)

    has_extreme = any(m.get("severity") == "extreme" for m in method_results.values())

    if num_methods >= 2 or has_extreme:
        classification = "needs_attention"
    else:
        classification = "explainable"

    reasons = []
    if num_methods >= 2:
        method_names = {"z-score": "Z-score", "iqr": "IQR", "moving-avg": "移动平均偏离"}
        names = [method_names.get(m, m) for m in methods_detected]
        reasons.append(f"被 {num_methods} 种方法同时检出（{', '.join(names)}）")
    if has_extreme:
        reasons.append("偏离程度极端")

    if not reasons:
        reasons.append("仅被单一方法检出，偏离程度温和")

    details = {}
    for method, info in method_results.items():
        filtered = {k: v for k, v in info.items() if k != "severity"}
        details[method] = filtered

    return {
        "row": row_idx,
        "column": column,
        "value": value,
        "methods_detected": methods_detected,
        "num_methods": num_methods,
        "details": details,
        "classification": classification,
        "reason": "；".join(reasons),
    }


def run_detection(rows, columns, methods, z_threshold, iqr_multiplier, window, ma_threshold):
    all_anomalies = []
    column_stats = {}

    for col in columns:
        values, indices = extract_column_values(rows, col)
        if len(values) < 3:
            continue

        stats = compute_stats(values)
        if stats is None:
            continue

        row_methods = {}

        if "z-score" in methods:
            z_results = zscore_detect(values, indices, z_threshold)
            for idx, info in z_results.items():
                row_methods.setdefault(idx, {})["z-score"] = info

        if "iqr" in methods:
            iqr_results = iqr_detect(values, indices, iqr_multiplier)
            for idx, info in iqr_results.items():
                row_methods.setdefault(idx, {})["iqr"] = info

        if "moving-avg" in methods:
            ma_results = moving_avg_detect(values, indices, window, ma_threshold)
            for idx, info in ma_results.items():
                row_methods.setdefault(idx, {})["moving-avg"] = info

        col_anomaly_count = 0
        for row_idx, method_results in sorted(row_methods.items()):
            raw_value = try_float(rows[row_idx].get(col))
            anomaly = classify_anomaly(row_idx, col, raw_value, method_results)
            all_anomalies.append(anomaly)
            col_anomaly_count += 1

        stats["anomaly_count"] = col_anomaly_count
        column_stats[col] = stats

    return all_anomalies, column_stats


def build_output(rows, columns, methods, anomalies, column_stats):
    needs_attention = sum(1 for a in anomalies if a["classification"] == "needs_attention")
    explainable = sum(1 for a in anomalies if a["classification"] == "explainable")

    return {
        "summary": {
            "total_rows": len(rows),
            "columns_analyzed": columns,
            "methods_used": methods,
            "total_anomalies": len(anomalies),
            "needs_attention": needs_attention,
            "explainable": explainable,
        },
        "anomalies": anomalies,
        "column_stats": column_stats,
    }


def main():
    parser = argparse.ArgumentParser(
        description="多方法异常检测工具（Z-score / IQR / 移动平均偏离）"
    )
    parser.add_argument("csv_file", help="输入 CSV 文件路径")
    parser.add_argument(
        "--methods",
        default="z-score,iqr,moving-avg",
        help="检测方法，逗号分隔（默认：z-score,iqr,moving-avg）",
    )
    parser.add_argument(
        "--columns",
        default=None,
        help="目标列名，逗号分隔（默认：自动识别全部数值列）",
    )
    parser.add_argument(
        "--z-threshold",
        type=float,
        default=3.0,
        help="Z-score 判定阈值（默认：3.0）",
    )
    parser.add_argument(
        "--iqr-multiplier",
        type=float,
        default=1.5,
        help="IQR 倍数（默认：1.5）",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=5,
        help="移动平均窗口大小（默认：5）",
    )
    parser.add_argument(
        "--ma-threshold",
        type=float,
        default=2.0,
        help="移动平均偏离阈值（标准差倍数，默认：2.0）",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="输出文件路径（默认：stdout）",
    )
    args = parser.parse_args()

    valid_methods = {"z-score", "iqr", "moving-avg"}
    methods = [m.strip() for m in args.methods.split(",")]
    for m in methods:
        if m not in valid_methods:
            print(f"错误：不支持的方法 '{m}'，可选：{', '.join(sorted(valid_methods))}", file=sys.stderr)
            sys.exit(1)

    headers, rows = read_csv(args.csv_file)

    if args.columns:
        columns = [c.strip() for c in args.columns.split(",")]
        for c in columns:
            if c not in headers:
                print(f"错误：列 '{c}' 不在 CSV 表头中。可用列：{', '.join(headers)}", file=sys.stderr)
                sys.exit(1)
    else:
        columns = detect_numeric_columns(headers, rows)
        if not columns:
            print("错误：未检测到数值列，请用 --columns 手动指定", file=sys.stderr)
            sys.exit(1)

    anomalies, column_stats = run_detection(
        rows, columns, methods,
        args.z_threshold, args.iqr_multiplier,
        args.window, args.ma_threshold,
    )

    result = build_output(rows, columns, methods, anomalies, column_stats)
    output_json = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"结果已写入：{args.output}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()

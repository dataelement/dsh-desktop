#!/usr/bin/env python3
"""HTTP 阶梯式并发压测工具 — 封装 ab/wrk + p50/p90/p99 + 拐点分析"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlparse


def validate_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False, "URL 必须以 http:// 或 https:// 开头"
    if not parsed.hostname:
        return False, "URL 必须包含主机名"
    return True, ""


def detect_tool(prefer=None):
    if prefer:
        if shutil.which(prefer):
            return prefer
        return None
    if shutil.which("wrk"):
        return "wrk"
    if shutil.which("ab"):
        return "ab"
    return None


def to_ms(value, unit):
    if unit == "us":
        return value / 1000.0
    if unit == "s":
        return value * 1000.0
    return value


def parse_wrk_output(output):
    metrics = {
        "rps": 0.0,
        "avg_latency_ms": 0.0,
        "p50_ms": 0.0,
        "p90_ms": 0.0,
        "p99_ms": 0.0,
        "total_requests": 0,
        "errors": 0,
    }

    for line in output.split("\n"):
        line = line.strip()

        m = re.search(r"Requests/sec:\s+([\d.]+)", line)
        if m:
            metrics["rps"] = float(m.group(1))

        m = re.match(r"Latency\s+([\d.]+)(us|ms|s)\s+", line)
        if m:
            metrics["avg_latency_ms"] = to_ms(float(m.group(1)), m.group(2))

        m = re.match(r"50%\s+([\d.]+)(us|ms|s)", line)
        if m:
            metrics["p50_ms"] = to_ms(float(m.group(1)), m.group(2))

        m = re.match(r"90%\s+([\d.]+)(us|ms|s)", line)
        if m:
            metrics["p90_ms"] = to_ms(float(m.group(1)), m.group(2))

        m = re.match(r"99%\s+([\d.]+)(us|ms|s)", line)
        if m:
            metrics["p99_ms"] = to_ms(float(m.group(1)), m.group(2))

        m = re.search(r"(\d+)\s+requests in", line)
        if m:
            metrics["total_requests"] = int(m.group(1))

        m = re.search(
            r"Socket errors:\s*connect\s+(\d+),\s*read\s+(\d+),"
            r"\s*write\s+(\d+),\s*timeout\s+(\d+)",
            line,
        )
        if m:
            metrics["errors"] += sum(int(m.group(i)) for i in range(1, 5))

        m = re.search(r"Non-2xx or 3xx responses:\s+(\d+)", line)
        if m:
            metrics["errors"] += int(m.group(1))

    return metrics


def parse_ab_output(output, csv_path=None):
    metrics = {
        "rps": 0.0,
        "avg_latency_ms": 0.0,
        "p50_ms": 0.0,
        "p90_ms": 0.0,
        "p99_ms": 0.0,
        "total_requests": 0,
        "errors": 0,
    }

    for line in output.split("\n"):
        m = re.search(r"Requests per second:\s+([\d.]+)", line)
        if m:
            metrics["rps"] = float(m.group(1))

        m = re.search(r"Time per request:\s+([\d.]+)\s+\[ms\]\s+\(mean\)$", line)
        if m:
            metrics["avg_latency_ms"] = float(m.group(1))

        m = re.search(r"Complete requests:\s+(\d+)", line)
        if m:
            metrics["total_requests"] = int(m.group(1))

        m = re.search(r"Failed requests:\s+(\d+)", line)
        if m:
            metrics["errors"] = int(m.group(1))

        m = re.match(r"\s+50%\s+(\d+)", line)
        if m:
            metrics["p50_ms"] = float(m.group(1))
        m = re.match(r"\s+90%\s+(\d+)", line)
        if m:
            metrics["p90_ms"] = float(m.group(1))
        m = re.match(r"\s+99%\s+(\d+)", line)
        if m:
            metrics["p99_ms"] = float(m.group(1))

    if csv_path and os.path.exists(csv_path):
        try:
            pct_data = {}
            with open(csv_path, encoding="utf-8") as f:
                for csvline in f:
                    csvline = csvline.strip()
                    if not csvline or csvline.startswith("Percentage"):
                        continue
                    parts = csvline.split(",")
                    if len(parts) >= 2:
                        try:
                            pct_data[float(parts[0])] = float(parts[1])
                        except ValueError:
                            continue
            if pct_data:
                if 50 in pct_data:
                    metrics["p50_ms"] = pct_data[50]
                for k in sorted(pct_data):
                    if k >= 90:
                        metrics["p90_ms"] = pct_data[k]
                        break
                for k in sorted(pct_data):
                    if k >= 99:
                        metrics["p99_ms"] = pct_data[k]
                        break
        except (IOError, OSError):
            pass

    return metrics


def run_wrk(url, concurrency, duration, threads=None):
    if threads is None:
        threads = max(1, min(concurrency, os.cpu_count() or 4))

    cmd = [
        "wrk",
        "-t", str(threads),
        "-c", str(concurrency),
        "-d", f"{duration}s",
        "--latency",
        url,
    ]

    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=duration + 30,
        )
        output = proc.stdout + "\n" + proc.stderr
        return parse_wrk_output(output), None
    except subprocess.TimeoutExpired:
        return None, "执行超时"
    except OSError as e:
        return None, str(e)


def run_ab(url, concurrency, duration, requests_per_step=None):
    if requests_per_step is None:
        requests_per_step = max(concurrency * 100, 1000)

    parsed = urlparse(url)
    if not parsed.path or parsed.path == "":
        url = url.rstrip("/") + "/"

    csv_fd, csv_path = tempfile.mkstemp(suffix=".csv")
    os.close(csv_fd)

    cmd = [
        "ab",
        "-n", str(requests_per_step),
        "-c", str(concurrency),
        "-e", csv_path,
        "-s", str(min(duration, 120)),
        url,
    ]

    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=duration * 3 + 60,
        )
        output = proc.stdout + "\n" + proc.stderr
        return parse_ab_output(output, csv_path), None
    except subprocess.TimeoutExpired:
        return None, "执行超时"
    except OSError as e:
        return None, str(e)
    finally:
        try:
            os.unlink(csv_path)
        except OSError:
            pass


def find_inflection_points(results):
    if len(results) < 3:
        return []

    inflections = []

    for i in range(2, len(results)):
        prev2 = results[i - 2]
        prev = results[i - 1]
        curr = results[i]

        if curr.get("error_message") or prev.get("error_message") or prev2.get("error_message"):
            continue

        reasons = []

        delta_prev = prev["p99_ms"] - prev2["p99_ms"]
        delta_curr = curr["p99_ms"] - prev["p99_ms"]
        if delta_prev > 0 and delta_curr > delta_prev * 2:
            reasons.append(
                f"p99延迟加速增长: {prev['p99_ms']:.1f}ms → {curr['p99_ms']:.1f}ms "
                f"(增幅 {delta_curr:.1f}ms，前一步增幅 {delta_prev:.1f}ms)"
            )

        eff_prev = prev["rps"] / prev["concurrency"] if prev["concurrency"] > 0 else 0
        eff_curr = curr["rps"] / curr["concurrency"] if curr["concurrency"] > 0 else 0
        if eff_prev > 0 and eff_curr < eff_prev * 0.6:
            reasons.append(
                f"吞吐效率下降: {eff_prev:.1f} rps/conn → {eff_curr:.1f} rps/conn "
                f"(降幅 {(1 - eff_curr / eff_prev) * 100:.0f}%)"
            )

        if prev["rps"] > 0 and prev["p99_ms"] > 0:
            rps_gain = (curr["rps"] - prev["rps"]) / prev["rps"] * 100
            lat_gain = (curr["p99_ms"] - prev["p99_ms"]) / prev["p99_ms"] * 100
            if rps_gain < 10 and lat_gain > 50:
                reasons.append(
                    f"吞吐量趋于饱和但延迟激增: RPS仅增长{rps_gain:.1f}% "
                    f"而 p99延迟增长{lat_gain:.1f}%"
                )

        curr_total = curr["total_requests"]
        prev_total = prev["total_requests"]
        err_rate = curr["errors"] / curr_total * 100 if curr_total > 0 else 0
        prev_err_rate = prev["errors"] / prev_total * 100 if prev_total > 0 else 0
        if err_rate > 1 and (prev_err_rate == 0 or err_rate > prev_err_rate * 2):
            reasons.append(
                f"错误率飙升: {prev_err_rate:.2f}% → {err_rate:.2f}%"
            )

        if reasons:
            inflections.append({
                "concurrency": curr["concurrency"],
                "step_index": i,
                "reasons": reasons,
            })

    return inflections


def find_optimal_concurrency(results, inflections):
    valid = [r for r in results if not r.get("error_message")]
    if not valid:
        return None

    if inflections:
        first_idx = inflections[0]["step_index"]
        if first_idx > 0:
            return results[first_idx - 1]["concurrency"]

    return max(valid, key=lambda r: r["rps"])["concurrency"]


def format_table(results, inflection_concurrencies):
    header = (
        f"{'并发':>6} | {'RPS':>10} | {'Avg(ms)':>8} | {'P50(ms)':>8} | "
        f"{'P90(ms)':>8} | {'P99(ms)':>8} | {'错误率':>7} | 拐点"
    )
    sep = "-" * len(header)
    lines = [sep, header, sep]

    for r in results:
        if r.get("error_message"):
            lines.append(
                f"{r['concurrency']:>6} | {'FAILED':>10} | "
                f"{'—':>8} | {'—':>8} | {'—':>8} | {'—':>8} | {'—':>7} |"
            )
            continue
        err_pct = r["errors"] / r["total_requests"] * 100 if r["total_requests"] > 0 else 0
        marker = "  ◀" if r["concurrency"] in inflection_concurrencies else ""
        lines.append(
            f"{r['concurrency']:>6} | {r['rps']:>10.1f} | {r['avg_latency_ms']:>8.1f} | "
            f"{r['p50_ms']:>8.1f} | {r['p90_ms']:>8.1f} | {r['p99_ms']:>8.1f} | "
            f"{err_pct:>6.2f}% |{marker}"
        )

    lines.append(sep)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="HTTP 阶梯式并发压测工具 — 封装 ab/wrk + p50/p90/p99 + 拐点分析",
    )
    parser.add_argument("url", help="目标 URL（http:// 或 https://）")
    parser.add_argument(
        "-s", "--steps",
        default="1,10,50,100,200,500",
        help="并发阶梯（逗号分隔），默认: 1,10,50,100,200,500",
    )
    parser.add_argument(
        "-d", "--duration",
        type=int, default=10,
        help="每阶段持续时间（秒），默认: 10",
    )
    parser.add_argument(
        "-n", "--requests",
        type=int, default=None,
        help="使用 ab 时每阶段总请求数（默认: concurrency×100 且至少 1000）",
    )
    parser.add_argument(
        "-t", "--tool",
        choices=["wrk", "ab"],
        default=None,
        help="指定压测工具（默认自动检测，优先 wrk）",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="仅输出 JSON 格式结果",
    )
    parser.add_argument(
        "--threads",
        type=int, default=None,
        help="wrk 线程数（默认: min(并发数, CPU核心数)）",
    )

    args = parser.parse_args()

    valid, err_msg = validate_url(args.url)
    if not valid:
        print(json.dumps({"error": err_msg}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    try:
        steps = sorted(set(int(s.strip()) for s in args.steps.split(",")))
        if any(s < 1 for s in steps):
            raise ValueError("并发数必须为正整数")
    except ValueError:
        print(
            json.dumps({"error": "并发阶梯必须为正整数，逗号分隔"}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)

    tool = detect_tool(args.tool)
    if not tool:
        msg = (
            "未找到压测工具。请安装 wrk 或 ab：\n"
            "  Ubuntu/Debian: sudo apt-get install wrk  或  sudo apt-get install apache2-utils\n"
            "  macOS: brew install wrk  （ab 通常已随 macOS 预装）"
        )
        print(json.dumps({"error": msg}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

    if not args.json:
        print(f"压测工具: {tool}", file=sys.stderr)
        print(f"目标 URL: {args.url}", file=sys.stderr)
        print(f"并发阶梯: {steps}", file=sys.stderr)
        print(f"每阶段持续: {args.duration}s", file=sys.stderr)
        print(file=sys.stderr)

    results = []

    for step_idx, conc in enumerate(steps):
        if not args.json:
            print(
                f"[{step_idx + 1}/{len(steps)}] 并发 {conc} 执行中...",
                end="", flush=True, file=sys.stderr,
            )

        if tool == "wrk":
            metrics, err = run_wrk(args.url, conc, args.duration, args.threads)
        else:
            metrics, err = run_ab(args.url, conc, args.duration, args.requests)

        if metrics is None:
            if not args.json:
                print(f" 失败: {err}", file=sys.stderr)
            results.append({
                "concurrency": conc,
                "rps": 0, "avg_latency_ms": 0,
                "p50_ms": 0, "p90_ms": 0, "p99_ms": 0,
                "total_requests": 0, "errors": 0,
                "error_message": err,
            })
            continue

        metrics["concurrency"] = conc
        results.append(metrics)

        if not args.json:
            print(
                f" RPS={metrics['rps']:.1f}  p99={metrics['p99_ms']:.1f}ms",
                file=sys.stderr,
            )

    inflections = find_inflection_points(results)
    inflection_set = {ip["concurrency"] for ip in inflections}
    optimal = find_optimal_concurrency(results, inflections)

    report = {
        "url": args.url,
        "tool": tool,
        "duration_per_step": args.duration,
        "steps": results,
        "inflection_points": inflections,
        "recommended_concurrency": optimal,
    }

    if not args.json:
        print(file=sys.stderr)
        print(format_table(results, inflection_set), file=sys.stderr)
        print(file=sys.stderr)

        if inflections:
            print("拐点分析:", file=sys.stderr)
            for ip in inflections:
                print(f"  ▶ 并发 {ip['concurrency']}:", file=sys.stderr)
                for reason in ip["reasons"]:
                    print(f"    - {reason}", file=sys.stderr)
            print(file=sys.stderr)

        if optimal:
            print(f"建议最优并发数: {optimal}", file=sys.stderr)
            print(file=sys.stderr)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

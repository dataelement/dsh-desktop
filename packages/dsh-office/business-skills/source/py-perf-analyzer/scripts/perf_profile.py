#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Python 性能分析工具 - cProfile + line_profiler + tracemalloc"""

import argparse
import ast
import builtins
import cProfile
import io
import json
import pstats
import sys
import textwrap
import tracemalloc
from pathlib import Path


def _format_bytes(size):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(size) < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


def _prepare_exec(script_path, script_args):
    """准备脚本执行环境，返回 (code, globals, cleanup)"""
    script_path = Path(script_path).resolve()
    with open(script_path, "r", encoding="utf-8") as f:
        source = f.read()

    code = compile(source, str(script_path), "exec")
    script_globals = {
        "__name__": "__main__",
        "__file__": str(script_path),
        "__builtins__": __builtins__,
    }

    saved_argv = sys.argv[:]
    saved_path = sys.path[:]
    sys.argv = [str(script_path)] + list(script_args)
    sys.path.insert(0, str(script_path.parent))

    def cleanup():
        sys.argv = saved_argv
        sys.path = saved_path

    return source, code, script_globals, cleanup


# ---------------------------------------------------------------------------
# CPU Profiling (cProfile)
# ---------------------------------------------------------------------------

def run_cpu_profile(script_path, script_args, sort_key="cumulative", top_n=20, threshold=0.0):
    _, code, script_globals, cleanup = _prepare_exec(script_path, script_args)
    profiler = cProfile.Profile()

    try:
        profiler.enable()
        exec(code, script_globals)
        profiler.disable()
    except SystemExit:
        profiler.disable()
    finally:
        cleanup()

    return _parse_cprofile(profiler, sort_key, top_n, threshold)


def _parse_cprofile(profiler, sort_key, top_n, threshold):
    stream = io.StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats(sort_key)

    total_tt = stats.total_tt if stats.total_tt > 0 else 1e-9
    results = []

    for func_key, func_stat in stats.stats.items():
        filename, line_no, func_name = func_key
        cc, nc, tt, ct, callers = func_stat
        pct = (ct / total_tt) * 100

        if pct < threshold:
            continue

        # 过滤 profiler 自身 exec() 产生的噪声条目
        if filename == "~" and func_name == "<built-in method builtins.exec>":
            continue
        if func_name == "<module>":
            continue

        results.append({
            "function": func_name,
            "file": filename,
            "line": line_no,
            "calls": nc,
            "total_time": round(tt, 6),
            "cumulative_time": round(ct, 6),
            "per_call_total": round(tt / nc, 6) if nc > 0 else 0,
            "per_call_cumulative": round(ct / nc, 6) if nc > 0 else 0,
            "percent": round(pct, 2),
        })

    sort_map = {
        "cumulative": lambda x: x["cumulative_time"],
        "tottime": lambda x: x["total_time"],
        "calls": lambda x: x["calls"],
        "ncalls": lambda x: x["calls"],
    }
    results.sort(key=sort_map.get(sort_key, sort_map["cumulative"]), reverse=True)

    return {
        "total_time": round(stats.total_tt, 6),
        "total_calls": stats.total_calls,
        "functions": results[:top_n],
        "all_function_count": len(results),
    }


# ---------------------------------------------------------------------------
# Memory Profiling (tracemalloc)
# ---------------------------------------------------------------------------

def run_memory_profile(script_path, script_args, top_n=20):
    _, code, script_globals, cleanup = _prepare_exec(script_path, script_args)

    tracemalloc.start(25)
    snapshot_start = tracemalloc.take_snapshot()

    try:
        exec(code, script_globals)
    except SystemExit:
        pass
    finally:
        snapshot_end = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        cleanup()

    top_stats = snapshot_end.statistics("lineno")
    allocations = []
    for stat in top_stats[:top_n]:
        frame = stat.traceback[0]
        allocations.append({
            "file": frame.filename,
            "line": frame.lineno,
            "size_bytes": stat.size,
            "size_human": _format_bytes(stat.size),
            "count": stat.count,
        })

    diff_stats = snapshot_end.compare_to(snapshot_start, "lineno")
    growth = []
    for stat in diff_stats:
        if stat.size_diff > 0:
            frame = stat.traceback[0]
            growth.append({
                "file": frame.filename,
                "line": frame.lineno,
                "size_diff_bytes": stat.size_diff,
                "size_diff_human": _format_bytes(stat.size_diff),
                "count_diff": stat.count_diff,
            })
    growth.sort(key=lambda x: x["size_diff_bytes"], reverse=True)

    return {
        "peak_memory_bytes": peak,
        "peak_memory_human": _format_bytes(peak),
        "current_memory_bytes": current,
        "current_memory_human": _format_bytes(current),
        "top_allocations": allocations,
        "memory_growth": growth[:top_n],
    }


# ---------------------------------------------------------------------------
# Combined CPU + Memory (single execution)
# ---------------------------------------------------------------------------

def run_combined_profile(script_path, script_args, sort_key="cumulative",
                         top_n=20, threshold=0.0):
    _, code, script_globals, cleanup = _prepare_exec(script_path, script_args)

    tracemalloc.start(25)
    snapshot_start = tracemalloc.take_snapshot()
    profiler = cProfile.Profile()

    try:
        profiler.enable()
        exec(code, script_globals)
        profiler.disable()
    except SystemExit:
        profiler.disable()
    finally:
        snapshot_end = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        cleanup()

    cpu_result = _parse_cprofile(profiler, sort_key, top_n, threshold)

    top_stats = snapshot_end.statistics("lineno")
    allocations = [
        {
            "file": s.traceback[0].filename,
            "line": s.traceback[0].lineno,
            "size_bytes": s.size,
            "size_human": _format_bytes(s.size),
            "count": s.count,
        }
        for s in top_stats[:top_n]
    ]

    diff_stats = snapshot_end.compare_to(snapshot_start, "lineno")
    growth = sorted(
        [
            {
                "file": s.traceback[0].filename,
                "line": s.traceback[0].lineno,
                "size_diff_bytes": s.size_diff,
                "size_diff_human": _format_bytes(s.size_diff),
                "count_diff": s.count_diff,
            }
            for s in diff_stats if s.size_diff > 0
        ],
        key=lambda x: x["size_diff_bytes"],
        reverse=True,
    )

    mem_result = {
        "peak_memory_bytes": peak,
        "peak_memory_human": _format_bytes(peak),
        "current_memory_bytes": current,
        "current_memory_human": _format_bytes(current),
        "top_allocations": allocations,
        "memory_growth": growth[:top_n],
    }

    return cpu_result, mem_result


# ---------------------------------------------------------------------------
# Line Profiling (line_profiler)
# ---------------------------------------------------------------------------

def _find_top_level_functions(source):
    tree = ast.parse(source)
    funcs = []
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            funcs.append((node.name, node.lineno, node.col_offset))
    return funcs


def run_line_profile(script_path, script_args, functions=None, top_n=20):
    try:
        from line_profiler import LineProfiler
    except ImportError:
        return {
            "available": False,
            "error": "line_profiler 未安装。请运行: pip install line_profiler",
        }

    source, _, _, _ = _prepare_exec(script_path, script_args)

    all_funcs = _find_top_level_functions(source)
    if functions:
        target_names = {f.strip() for f in functions.split(",")}
    else:
        target_names = {name for name, _, _ in all_funcs}

    if not target_names:
        return {"available": True, "error": "未找到可分析的函数", "functions": []}

    targets = [(name, lineno, col) for name, lineno, col in all_funcs
               if name in target_names]
    if not targets:
        return {
            "available": True,
            "error": f"未在脚本顶层找到目标函数: {', '.join(target_names)}",
            "functions": [],
        }

    lines = source.split("\n")
    for name, lineno, col in sorted(targets, key=lambda t: t[1], reverse=True):
        indent = " " * col
        lines.insert(lineno - 1, f"{indent}@profile")
    modified_source = "\n".join(lines)

    profiler = LineProfiler()
    saved_profile = builtins.__dict__.get("profile")
    builtins.__dict__["profile"] = profiler

    script_path = Path(script_path).resolve()
    code = compile(modified_source, str(script_path), "exec")
    script_globals = {
        "__name__": "__main__",
        "__file__": str(script_path),
        "__builtins__": __builtins__,
    }

    saved_argv = sys.argv[:]
    saved_path = sys.path[:]
    sys.argv = [str(script_path)] + list(script_args)
    sys.path.insert(0, str(script_path.parent))

    try:
        exec(code, script_globals)
    except SystemExit:
        pass
    finally:
        sys.argv = saved_argv
        sys.path = saved_path
        if saved_profile is not None:
            builtins.__dict__["profile"] = saved_profile
        else:
            builtins.__dict__.pop("profile", None)

    stream = io.StringIO()
    profiler.print_stats(stream=stream)
    raw_output = stream.getvalue()
    parsed = _parse_line_profiler_output(raw_output)

    return {
        "available": True,
        "functions_profiled": sorted(target_names),
        "functions": parsed,
        "raw_output": raw_output,
    }


def _parse_line_profiler_output(raw):
    results = []
    current_func = None
    current_file = None
    current_lines = []
    in_data = False

    for line in raw.split("\n"):
        stripped = line.strip()

        if stripped.startswith("File:"):
            current_file = stripped.split("File:", 1)[1].strip()
            continue

        if stripped.startswith("Function:"):
            if current_func and current_lines:
                results.append({
                    "function": current_func,
                    "file": current_file or "",
                    "lines": current_lines,
                })
            part = stripped.split("Function:", 1)[1].strip()
            func_name = part.split(" at ")[0].strip() if " at " in part else part
            current_func = func_name
            current_lines = []
            in_data = False
            continue

        if stripped.startswith("Line") and "Hits" in stripped:
            in_data = True
            continue

        if "=====" in stripped:
            in_data = True
            continue

        if in_data and stripped:
            parts = stripped.split(None, 5)
            if len(parts) >= 5:
                try:
                    line_no = int(parts[0])
                    hits = int(parts[1])
                    time_val = float(parts[2])
                    per_hit = float(parts[3])
                    pct = float(parts[4])
                    src = parts[5] if len(parts) > 5 else ""
                    current_lines.append({
                        "line_no": line_no,
                        "hits": hits,
                        "time": time_val,
                        "per_hit": per_hit,
                        "percent": pct,
                        "source": src,
                    })
                except (ValueError, IndexError):
                    pass

    if current_func and current_lines:
        results.append({
            "function": current_func,
            "file": current_file or "",
            "lines": current_lines,
        })

    return results


# ---------------------------------------------------------------------------
# Report Printers
# ---------------------------------------------------------------------------

def print_cpu_report(result):
    print("\n" + "=" * 60)
    print("  CPU 性能分析报告 (cProfile)")
    print("=" * 60)

    print(f"\n  总执行时间: {result['total_time']:.4f} 秒")
    print(f"  总函数调用: {result['total_calls']:,} 次")
    print(f"  分析函数数: {result['all_function_count']} 个")

    funcs = result["functions"]
    if not funcs:
        print("\n  未检测到需要关注的函数")
        return

    print(f"\n  Top {len(funcs)} 耗时函数:")
    print("  " + "-" * 56)
    print(f"  {'#':<4} {'占比':>6} {'累计(s)':>9} {'自身(s)':>9} {'调用':>8}  函数")
    print("  " + "-" * 56)

    for i, f in enumerate(funcs, 1):
        display = f["function"]
        if f["file"] != "~" and not f["file"].startswith("<"):
            short = Path(f["file"]).name
            display = f"{short}:{f['line']}:{f['function']}"
        if len(display) > 42:
            display = "..." + display[-39:]
        print(
            f"  {i:<4} {f['percent']:>5.1f}% "
            f"{f['cumulative_time']:>9.4f} {f['total_time']:>9.4f} "
            f"{f['calls']:>8}  {display}"
        )

    top = funcs[0]
    print(f"\n  主要瓶颈: {top['function']} ({top['percent']:.1f}% 时间)")
    if top["file"] != "~" and not top["file"].startswith("<"):
        print(f"  位置: {top['file']}:{top['line']}")


def print_memory_report(result):
    print("\n" + "=" * 60)
    print("  内存分析报告 (tracemalloc)")
    print("=" * 60)

    print(f"\n  峰值内存: {result['peak_memory_human']}")
    print(f"  当前内存: {result['current_memory_human']}")

    allocs = result["top_allocations"]
    if allocs:
        print(f"\n  Top {len(allocs)} 内存分配:")
        print("  " + "-" * 56)
        print(f"  {'#':<4} {'大小':>10} {'数量':>8}  位置")
        print("  " + "-" * 56)
        for i, a in enumerate(allocs, 1):
            loc = f"{Path(a['file']).name}:{a['line']}"
            if len(loc) > 42:
                loc = "..." + loc[-39:]
            print(f"  {i:<4} {a['size_human']:>10} {a['count']:>8}  {loc}")

    growth = result.get("memory_growth", [])
    if growth:
        print(f"\n  内存增长热点:")
        print("  " + "-" * 56)
        for i, g in enumerate(growth[:10], 1):
            loc = f"{Path(g['file']).name}:{g['line']}"
            if len(loc) > 42:
                loc = "..." + loc[-39:]
            print(f"  {i:<4} +{g['size_diff_human']:>9} (+{g['count_diff']:>5})  {loc}")


def print_line_report(result):
    print("\n" + "=" * 60)
    print("  逐行分析报告 (line_profiler)")
    print("=" * 60)

    if result.get("error"):
        print(f"\n  {result['error']}")
        return

    funcs = result.get("functions", [])
    if not funcs:
        print("\n  未检测到可分析的函数")
        return

    for func_data in funcs:
        print(f"\n  函数: {func_data['function']}")
        if func_data.get("file"):
            print(f"  文件: {func_data['file']}")
        print("  " + "-" * 56)
        print(f"  {'行号':<6} {'命中':>8} {'耗时':>10} {'占比':>6}  代码")
        print("  " + "-" * 56)

        for ln in func_data["lines"]:
            bar_len = int(ln["percent"] / 5)
            bar = "#" * bar_len if bar_len > 0 else ""
            pct_str = f"{ln['percent']:>5.1f}%"
            print(
                f"  {ln['line_no']:<6} {ln['hits']:>8} "
                f"{ln['time']:>10.1f} {pct_str} {bar} {ln['source']}"
            )


def print_suggestion(cpu_result):
    """根据 CPU 分析结果给出优化建议"""
    funcs = cpu_result.get("functions", [])
    if not funcs:
        return

    suggestions = []
    for f in funcs[:5]:
        name = f["function"]
        # 跳过内置函数/导入机制等不可逐行分析的条目
        if name.startswith("<") or f["file"].startswith("<frozen"):
            continue
        if f["calls"] > 10000 and f["per_call_total"] > 0.0001:
            suggestions.append(
                f"  - {name}: 调用 {f['calls']:,} 次，"
                f"考虑缓存/减少调用次数"
            )
        elif f["percent"] > 30:
            suggestions.append(
                f"  - {name}: 占 {f['percent']:.1f}% 时间，"
                f"建议用 --mode line --function {name} 做逐行分析"
            )

    if suggestions:
        print("\n  优化建议:")
        for s in suggestions:
            print(s)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Python 性能分析工具 - cProfile + line_profiler + 内存分析",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
        示例:
          %(prog)s script.py                               CPU 分析(默认)
          %(prog)s script.py --mode memory                 内存分析
          %(prog)s script.py --mode line --function foo    逐行分析
          %(prog)s script.py --mode all --top 10           全量分析
          %(prog)s script.py -- --arg1 val1                传参给目标脚本
        """),
    )

    parser.add_argument("script", help="要分析的 Python 脚本路径")
    parser.add_argument("script_args", nargs="*",
                        help="传递给目标脚本的参数（用 -- 分隔）")
    parser.add_argument("--mode", choices=["cpu", "memory", "line", "all"],
                        default="cpu", help="分析模式 (默认: cpu)")
    parser.add_argument("--top", type=int, default=20,
                        help="显示 Top N 结果 (默认: 20)")
    parser.add_argument("--sort",
                        choices=["cumulative", "tottime", "calls", "ncalls"],
                        default="cumulative",
                        help="CPU 分析排序方式 (默认: cumulative)")
    parser.add_argument("--output", help="输出 JSON 报告到文件")
    parser.add_argument("--function",
                        help="逐行分析的目标函数名 (逗号分隔)")
    parser.add_argument("--threshold", type=float, default=0.0,
                        help="只显示占比超过此阈值(%%) 的函数 (默认: 0)")

    args = parser.parse_args()

    script_path = Path(args.script).resolve()
    if not script_path.exists():
        print(f"错误: 脚本文件不存在: {script_path}", file=sys.stderr)
        sys.exit(1)
    if not script_path.suffix == ".py":
        print(f"警告: 文件不是 .py 扩展名: {script_path}", file=sys.stderr)

    report = {"script": str(script_path), "mode": args.mode}

    try:
        if args.mode == "all":
            print(f"正在进行 CPU + 内存组合分析: {script_path.name} ...")
            cpu_result, mem_result = run_combined_profile(
                script_path, args.script_args,
                args.sort, args.top, args.threshold,
            )
            report["cpu"] = cpu_result
            report["memory"] = mem_result
            print_cpu_report(cpu_result)
            print_memory_report(mem_result)
            print_suggestion(cpu_result)

        elif args.mode == "cpu":
            print(f"正在进行 CPU 分析: {script_path.name} ...")
            cpu_result = run_cpu_profile(
                script_path, args.script_args,
                args.sort, args.top, args.threshold,
            )
            report["cpu"] = cpu_result
            print_cpu_report(cpu_result)
            print_suggestion(cpu_result)

        elif args.mode == "memory":
            print(f"正在进行内存分析: {script_path.name} ...")
            mem_result = run_memory_profile(
                script_path, args.script_args, args.top,
            )
            report["memory"] = mem_result
            print_memory_report(mem_result)

        elif args.mode == "line":
            print(f"正在进行逐行分析: {script_path.name} ...")
            line_result = run_line_profile(
                script_path, args.script_args,
                args.function, args.top,
            )
            report["line"] = line_result
            print_line_report(line_result)

    except Exception as e:
        print(f"\n分析过程中出错: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if args.output:
        output_path = Path(args.output).resolve()
        serializable = json.loads(json.dumps(report, default=str))
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, ensure_ascii=False, indent=2)
        print(f"\n报告已保存到: {output_path}")

    print()


if __name__ == "__main__":
    main()

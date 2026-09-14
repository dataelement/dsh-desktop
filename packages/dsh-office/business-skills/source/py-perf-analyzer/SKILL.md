---
name: py-perf-analyzer
description: "定位 Python 脚本的性能瓶颈，集成 cProfile、tracemalloc 和 line_profiler，一键执行 CPU 热点函数、内存分配或逐行耗时分析，并可输出 JSON 报告。当用户提到优化脚本、分析性能、定位 CPU 或内存热点、进行逐行分析，或询问代码为什么慢、如何加速、内存泄漏等问题时触发。"
license: MIT
type: tool
tags: [python, profiling, performance, cProfile, memory, optimization]
---

# Perf Profiler

Python 性能分析工具，集成 cProfile、line_profiler 和 tracemalloc，一键定位 CPU 和内存瓶颈。

## 功能

- **CPU 分析 (cProfile)**：统计每个函数的调用次数、累计耗时、自身耗时，定位热点函数
- **内存分析 (tracemalloc)**：追踪内存分配热点、峰值内存、内存增长来源
- **逐行分析 (line_profiler)**：精确到每一行代码的耗时和命中次数，适合深入优化
- **组合分析**：`all` 模式一次执行同时收集 CPU + 内存数据，减少重复运行开销

## 依赖

| 依赖 | 类型 | 用途 |
|------|------|------|
| Python 3.7+ | 必须 | 运行环境 |
| cProfile / pstats | 内置 | CPU 性能分析 |
| tracemalloc | 内置 | 内存追踪 |
| line_profiler | 可选 | 逐行分析（`pip install line_profiler`） |

## 使用方式

```bash
python scripts/perf_profile.py <脚本路径> [脚本参数...] [选项]
```

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `script` | 要分析的 Python 脚本路径（必填） | - |
| `script_args` | 传递给目标脚本的参数 | 无 |
| `--mode` | 分析模式：`cpu` / `memory` / `line` / `all` | `cpu` |
| `--top` | 显示 Top N 结果 | `20` |
| `--sort` | CPU 分析排序：`cumulative` / `tottime` / `calls` | `cumulative` |
| `--output` | 输出 JSON 报告到文件 | 仅终端输出 |
| `--function` | 逐行分析的目标函数名（逗号分隔） | 自动发现 |
| `--threshold` | 只显示占比超过此值(%)的函数 | `0` |

### 示例

```bash
# CPU 分析（默认模式）
python scripts/perf_profile.py my_script.py

# 内存分析
python scripts/perf_profile.py my_script.py --mode memory

# 逐行分析指定函数
python scripts/perf_profile.py my_script.py --mode line --function compute,process_data

# 全量分析（CPU + 内存），只看 Top 10
python scripts/perf_profile.py my_script.py --mode all --top 10

# 传递参数给目标脚本，输出 JSON 报告
python scripts/perf_profile.py my_script.py --output report.json -- --input data.csv --output result.csv

# 只关注占比 > 5% 的函数
python scripts/perf_profile.py my_script.py --threshold 5
```

## 输出说明

### CPU 分析报告

```
============================================================
  CPU 性能分析报告 (cProfile)
============================================================

  总执行时间: 2.3456 秒
  总函数调用: 1,234,567 次
  分析函数数: 89 个

  Top 5 耗时函数:
  --------------------------------------------------------
  排名   占比   累计(s)    自身(s)      调用  函数
  --------------------------------------------------------
  1     45.2%    1.0605    0.8234     1000  compute.py:23:matrix_multiply
  2     22.1%    0.5183    0.5183    50000  utils.py:45:normalize
  3     12.3%    0.2885    0.1200      500  io.py:12:read_batch
  ...

  🔍 主要瓶颈: matrix_multiply (45.2% 时间)
     位置: compute.py:23
```

### 内存分析报告

```
============================================================
  内存分析报告 (tracemalloc)
============================================================

  峰值内存: 128.5 MB
  当前内存: 64.2 MB

  Top 5 内存分配:
  --------------------------------------------------------
  排名       大小     数量  位置
  --------------------------------------------------------
  1      45.2 MB    10000  data_loader.py:78
  2      22.1 MB     5000  transform.py:45
  ...

  内存增长热点:
  --------------------------------------------------------
  1     +32.0 MB  (+8000)  data_loader.py:78
  ...
```

### JSON 报告

使用 `--output` 参数可导出完整的结构化 JSON 报告，包含所有分析维度的详细数据，便于后续处理或接入 CI 流水线。

---
name: http-load-tester
description: "HTTP 阶梯式并发压测工具，自动执行多级并发压力测试，采集 p50/p90/p99 延迟百分位数，分析性能拐点（如延迟激增、吞吐饱和或错误率飙升），并输出结构化报告与最优并发建议。使用纯 Python 标准库，零外部依赖。当用户提及 HTTP 压测、基准测试、ab、wrk、并发测试、阶梯压测、延迟百分位、p99、拐点分析、性能测试、QPS、RPS 或容量规划等关键词或场景时触发。"
license: MIT
type: tool
tags: [http, benchmark, performance, latency, load-testing]
---

# HTTP Benchmark — 阶梯式并发压测 + 拐点分析

对 HTTP 服务执行阶梯式并发压力测试，自动采集延迟百分位数并检测性能拐点。

## 功能

- **双引擎支持**：自动检测 wrk（优先）或 ab（Apache Bench），也可手动指定
- **阶梯式并发**：按用户定义的并发梯度逐级加压（默认 1→10→50→100→200→500）
- **延迟百分位**：每级采集 p50 / p90 / p99 延迟
- **拐点分析**：自动检测三类性能拐点
  - p99 延迟加速增长（增幅超前一级 2 倍）
  - 吞吐效率显著下降（RPS/连接数降幅 > 40%）
  - 吞吐量饱和但延迟激增（RPS 增长 < 10%，p99 增长 > 50%）
  - 错误率飙升（超 1% 且翻倍）
- **最优并发建议**：根据拐点自动推荐最佳并发数
- **零 Python 依赖**：纯标准库实现

## Quick Start

```bash
# 基本用法 — 对目标 URL 执行默认阶梯压测
python3 scripts/http_benchmark.py https://example.com/api/health

# 自定义并发阶梯和每级持续时间
python3 scripts/http_benchmark.py https://example.com/api/health -s 5,20,50,100,300 -d 15

# 指定使用 ab 引擎
python3 scripts/http_benchmark.py https://example.com/ -t ab

# 仅输出 JSON（适合程序化解析）
python3 scripts/http_benchmark.py https://example.com/api/health --json

# 使用 ab 且指定每阶段请求总数
python3 scripts/http_benchmark.py https://example.com/ -t ab -n 5000

# 将 JSON 报告保存到文件
python3 scripts/http_benchmark.py https://example.com/api/health --json > report.json
```

## 参数说明

| 参数 | 短参 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | — | （必填） | 目标 URL（http:// 或 https://） |
| `--steps` | `-s` | `1,10,50,100,200,500` | 并发阶梯（逗号分隔正整数） |
| `--duration` | `-d` | `10` | 每阶段持续秒数（wrk 直接使用；ab 据此估算请求数） |
| `--requests` | `-n` | `concurrency×100` | 使用 ab 时每阶段总请求数 |
| `--tool` | `-t` | 自动检测 | 指定压测工具：`wrk` 或 `ab` |
| `--threads` | — | `min(并发, CPU核数)` | wrk 线程数 |
| `--json` | — | `false` | 仅输出 JSON 格式 |

## 输出格式

### 人类可读（默认）

```
压测工具: wrk
目标 URL: https://example.com/api/health
并发阶梯: [1, 10, 50, 100, 200, 500]
每阶段持续: 10s

----------------------------------------------------------------------------------
  并发 |        RPS |  Avg(ms) |  P50(ms) |  P90(ms) |  P99(ms) |   错误率 | 拐点
----------------------------------------------------------------------------------
     1 |      245.3 |      4.1 |      3.8 |      5.2 |      8.1 |   0.00% |
    10 |     2301.5 |      4.3 |      4.0 |      5.8 |      9.3 |   0.00% |
    50 |     9876.2 |      5.1 |      4.6 |      7.2 |     12.5 |   0.00% |
   100 |    14523.1 |      6.9 |      5.8 |     10.3 |     22.7 |   0.00% |
   200 |    15102.3 |     13.2 |     10.1 |     22.5 |     58.3 |   0.12% |  ◀
   500 |    14890.5 |     33.6 |     28.3 |     55.2 |    132.1 |   1.35% |  ◀
----------------------------------------------------------------------------------

拐点分析:
  ▶ 并发 200:
    - p99延迟加速增长: 22.7ms → 58.3ms (增幅 35.6ms，前一步增幅 10.2ms)
    - 吞吐量趋于饱和但延迟激增: RPS仅增长3.9% 而 p99延迟增长156.8%
  ▶ 并发 500:
    - 错误率飙升: 0.12% → 1.35%

建议最优并发数: 100
```

### JSON 格式（`--json`）

```json
{
  "url": "https://example.com/api/health",
  "tool": "wrk",
  "duration_per_step": 10,
  "steps": [
    {
      "concurrency": 1,
      "rps": 245.3,
      "avg_latency_ms": 4.1,
      "p50_ms": 3.8,
      "p90_ms": 5.2,
      "p99_ms": 8.1,
      "total_requests": 2453,
      "errors": 0
    }
  ],
  "inflection_points": [
    {
      "concurrency": 200,
      "step_index": 4,
      "reasons": ["p99延迟加速增长: ..."]
    }
  ],
  "recommended_concurrency": 100
}
```

## 前置依赖

需要安装 wrk 或 ab 中的至少一个：

```bash
# Ubuntu / Debian
sudo apt-get install wrk          # 推荐
sudo apt-get install apache2-utils # ab

# macOS
brew install wrk
# ab 已随 macOS 预装
```

## 拐点检测算法

对每一级并发，与前两级对比计算以下指标：

1. **p99 延迟加速度**：当前级 p99 增幅 > 前一级增幅的 2 倍时触发
2. **吞吐效率**：RPS/并发数 较前一级下降 > 40% 时触发
3. **饱和检测**：RPS 增长 < 10% 且 p99 增长 > 50% 时触发
4. **错误率**：超过 1% 且较前一级翻倍时触发

**建议最优并发**：第一个拐点前一级的并发数；若无拐点，选 RPS 最高的级别。

## 注意事项

- 压测会对目标服务产生真实负载，请勿对生产环境未授权的服务执行
- wrk 的延迟百分位数据比 ab 更精确（wrk 使用 HdrHistogram）
- ab 不支持 duration 参数，脚本通过请求总数近似控制时长
- 建议每级至少持续 10 秒以获得稳定数据

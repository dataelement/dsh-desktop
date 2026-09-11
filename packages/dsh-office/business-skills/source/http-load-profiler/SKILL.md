---
name: http-load-profiler
description: "Run stepped HTTP load tests with ab/wrk, ramping concurrency levels to collect p50/p90/p99 latency, detect performance inflection points, and recommend optimal concurrency. Triggered by requests like 'load test this URL', 'benchmark my API', 'find the max concurrency', or mentions of p99 latency, throughput saturation, or capacity planning."
license: MIT
type: tool
tags: [http, benchmark, performance, latency, load-testing]
---

# HTTP Load Profiler — Stepped Concurrency Load Test + Inflection Point Analysis

Run stepped concurrency load tests against HTTP services, automatically collect latency percentiles, and detect performance inflection points.

## Features

- **Dual engine support**: Auto-detects wrk (preferred) or ab (Apache Bench); manual override available
- **Stepped concurrency**: Ramps up through user-defined concurrency levels (default: 1 → 10 → 50 → 100 → 200 → 500)
- **Latency percentiles**: Collects p50 / p90 / p99 latency at each level
- **Inflection point detection**: Automatically identifies four types of performance inflection points
  - p99 latency accelerating (increase exceeds 2x the previous step's increase)
  - Throughput efficiency dropping significantly (RPS per connection drops > 40%)
  - Throughput saturated while latency spikes (RPS growth < 10%, p99 growth > 50%)
  - Error rate surging (exceeds 1% and doubles from previous step)
- **Optimal concurrency recommendation**: Automatically suggests the best concurrency level based on inflection points
- **Zero Python dependencies**: Pure standard library implementation

## Quick Start

```bash
# Basic usage — run default stepped load test against target URL
python3 scripts/http_benchmark.py https://example.com/api/health

# Custom concurrency steps and duration per step
python3 scripts/http_benchmark.py https://example.com/api/health -s 5,20,50,100,300 -d 15

# Specify ab as the engine
python3 scripts/http_benchmark.py https://example.com/ -t ab

# JSON-only output (for programmatic parsing)
python3 scripts/http_benchmark.py https://example.com/api/health --json

# Use ab with a specific number of requests per step
python3 scripts/http_benchmark.py https://example.com/ -t ab -n 5000

# Save JSON report to a file
python3 scripts/http_benchmark.py https://example.com/api/health --json > report.json
```

## Parameters

| Parameter | Short | Default | Description |
|-----------|-------|---------|-------------|
| `url` | — | (required) | Target URL (http:// or https://) |
| `--steps` | `-s` | `1,10,50,100,200,500` | Concurrency steps (comma-separated positive integers) |
| `--duration` | `-d` | `10` | Duration per step in seconds (used directly by wrk; ab estimates request count from this) |
| `--requests` | `-n` | `concurrency×100` | Total requests per step when using ab |
| `--tool` | `-t` | auto-detect | Specify load testing tool: `wrk` or `ab` |
| `--threads` | — | `min(concurrency, CPU cores)` | Thread count for wrk |
| `--json` | — | `false` | Output JSON only |

## Output Format

### Human-readable (default)

```
Tool: wrk
Target URL: https://example.com/api/health
Concurrency steps: [1, 10, 50, 100, 200, 500]
Duration per step: 10s

----------------------------------------------------------------------------------
  Conc. |        RPS |  Avg(ms) |  P50(ms) |  P90(ms) |  P99(ms) |   Errors | Inflection
----------------------------------------------------------------------------------
     1 |      245.3 |      4.1 |      3.8 |      5.2 |      8.1 |   0.00% |
    10 |     2301.5 |      4.3 |      4.0 |      5.8 |      9.3 |   0.00% |
    50 |     9876.2 |      5.1 |      4.6 |      7.2 |     12.5 |   0.00% |
   100 |    14523.1 |      6.9 |      5.8 |     10.3 |     22.7 |   0.00% |
   200 |    15102.3 |     13.2 |     10.1 |     22.5 |     58.3 |   0.12% |  ◀
   500 |    14890.5 |     33.6 |     28.3 |     55.2 |    132.1 |   1.35% |  ◀
----------------------------------------------------------------------------------

Inflection point analysis:
  ▶ Concurrency 200:
    - p99 latency accelerating: 22.7ms → 58.3ms (increase 35.6ms, previous step increase 10.2ms)
    - Throughput saturated with latency spike: RPS grew only 3.9% while p99 latency grew 156.8%
  ▶ Concurrency 500:
    - Error rate surging: 0.12% → 1.35%

Recommended optimal concurrency: 100
```

### JSON format (`--json`)

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
      "reasons": ["p99 latency accelerating: ..."]
    }
  ],
  "recommended_concurrency": 100
}
```

## Prerequisites

At least one of wrk or ab must be installed:

```bash
# Ubuntu / Debian
sudo apt-get install wrk          # recommended
sudo apt-get install apache2-utils # ab

# macOS
brew install wrk
# ab is pre-installed on macOS
```

## Inflection Point Detection Algorithm

For each concurrency level, the following metrics are compared against the two preceding levels:

1. **p99 latency acceleration**: Triggers when the current p99 increase exceeds 2x the previous step's increase
2. **Throughput efficiency**: Triggers when RPS per connection drops > 40% from the previous step
3. **Saturation detection**: Triggers when RPS growth < 10% while p99 growth > 50%
4. **Error rate**: Triggers when rate exceeds 1% and doubles from the previous step

**Recommended optimal concurrency**: The concurrency level one step before the first inflection point. If no inflection point is found, the level with the highest RPS is selected.

## Important Notes

- Load testing generates real traffic against the target service — do not run against production services without authorization
- wrk provides more accurate latency percentiles than ab (wrk uses HdrHistogram)
- ab does not support a duration parameter; the script approximates timing via total request count
- A minimum of 10 seconds per step is recommended for stable results

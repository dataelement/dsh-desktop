---
name: discounted-cashflow-model
description: "Builds a discounted cash flow (DCF) valuation model, calculating enterprise value, equity value, and per-share price with a growth-rate × discount-rate sensitivity analysis matrix. Triggered by requests like 'do a DCF on [company]', 'run a valuation', 'calculate WACC/discount rate', or mentions of free cash flow, terminal value, or sensitivity analysis."
license: MIT
---

# Discounted Cash Flow Valuation Model

A DCF (Discounted Cash Flow) valuation tool that supports full free cash flow projections, terminal value calculation, enterprise value derivation, and automatic generation of a **growth rate × discount rate** sensitivity analysis matrix.

## Quick Start

### Basic DCF Valuation

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10
```

### With Sensitivity Analysis Matrix

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --sensitivity
```

### Full Equity Valuation + CSV Export

```bash
python scripts/dcf_model.py \
    --fcf 5000 --growth 0.12 --discount 0.09 \
    --terminal-growth 0.03 --years 5 \
    --debt 8000 --cash 3000 --shares 10000000 \
    --currency "M USD" \
    --sensitivity \
    --growth-range 0.05,0.25,0.05 \
    --discount-range 0.06,0.14,0.02 \
    --output valuation.csv
```

## Detailed Usage

### Core Valuation Workflow

1. **Projected Free Cash Flows**: Project FCF for each year based on a base FCF and growth rate
2. **Terminal Value**: Calculated using the Gordon Growth Model (perpetuity growth model): `TV = FCF_n × (1+g) / (r-g)`
3. **Discounting**: Discount projected FCFs and terminal value to present value, yielding Enterprise Value
4. **Equity Value**: `Equity Value = EV - Net Debt + Cash`
5. **Per-Share Value**: `Per Share = Equity Value / Shares Outstanding`

### Sensitivity Analysis Matrix

Use the `--sensitivity` flag to automatically generate a two-dimensional matrix showing enterprise value under different combinations of growth rates and discount rates. This helps visualize how changes in key assumptions affect the valuation.

The base case scenario is marked with `[brackets]` in the matrix.

### JSON Output Mode

Add the `--json` flag to output the full results in JSON format to stdout, useful for programmatic processing:

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --json
```

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--fcf` | Yes | - | Base year free cash flow (positive number) |
| `--growth` | Yes | - | Annual growth rate, e.g. 0.15 for 15% |
| `--discount` | Yes | - | Discount rate / WACC, e.g. 0.10 for 10% |
| `--terminal-growth` | No | 0.03 | Perpetuity growth rate (must be < discount rate) |
| `--years` | No | 5 | Number of projection years (1–30) |
| `--debt` | No | 0 | Net debt (used for equity value calculation) |
| `--cash` | No | 0 | Cash and equivalents |
| `--shares` | No | 0 | Total shares outstanding (used for per-share value) |
| `--sensitivity` | No | false | Generate sensitivity analysis matrix |
| `--growth-range` | No | auto | Growth rate range as `min,max,step`, e.g. `0.05,0.25,0.05` |
| `--discount-range` | No | auto | Discount rate range as `min,max,step`, e.g. `0.06,0.14,0.02` |
| `--output` | No | - | Output file path (.csv or .json) |
| `--currency` | No | "" | Currency unit label, e.g. `M USD`, `€K` |
| `--json` | No | false | Output results as JSON to stdout |

## Use Cases

- Perform DCF valuation on a target company to assess its fair value range
- Run valuation sensitivity checks before investment decisions (how much do key assumptions need to shift to change the conclusion?)
- Quickly generate valuation matrix tables for financial modeling
- Export CSV/JSON results to integrate into larger analysis pipelines or reports

## Notes

- The discount rate must exceed the perpetuity growth rate (a mathematical requirement of the Gordon Growth Model)
- This tool uses only the Python standard library — no additional dependencies required
- Cells marked `N/A` in the sensitivity matrix indicate parameter combinations that violate mathematical constraints

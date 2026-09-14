---
name: fund-risk-compare
description: "Compare multiple ETFs using NAV CSV data, generating key risk-return metrics like annualized return, max drawdown, Sharpe ratio, and a correlation matrix. Triggered when users ask to compare ETFs or funds, calculate performance metrics, analyze NAV data, or mention terms like Sharpe ratio, correlation analysis, or max drawdown."
license: MIT
---

# Fund Risk Compare — Multi-Dimensional ETF Comparison Tool

Performs multi-dimensional risk-return analysis on multiple ETFs based on user-provided NAV (Net Asset Value) data. Automatically calculates annualized returns, max drawdown, Sharpe ratio, and generates a correlation matrix.

## Quick Start

### Basic Comparison

```bash
python scripts/etf_screener.py --input nav_data.csv
```

### Custom Risk-Free Rate + CSV Export

```bash
python scripts/etf_screener.py --input nav_data.csv --risk-free 0.03 --output report.csv
```

### JSON Output (for programmatic processing)

```bash
python scripts/etf_screener.py --input nav_data.csv --json
```

## Input Data Format

CSV file with dates in the first column and NAV values for each ETF in subsequent columns:

```csv
date,SP500_ETF,NASDAQ_ETF,BOND_ETF
2023-01-03,1.0000,1.0000,1.0000
2023-01-04,1.0050,0.9980,1.0020
2023-01-05,1.0120,1.0010,1.0080
...
```

- The date column name and format are flexible (used only to label the time range)
- ETF column names are used as labels in the comparison report
- Missing values can be left blank or marked as `NaN` — they are automatically skipped

## Calculation Details

### Annualized Return

Computed from the first and last NAV values, then annualized by the number of trading days:

`Ann. Return = (NAV_end / NAV_start) ^ (trading_days / n_days) - 1`

### Max Drawdown

The largest peak-to-trough decline in the NAV series:

`MDD = max( (peak - trough) / peak )`

### Sharpe Ratio

A risk-adjusted return metric:

`Sharpe = (Annualized Return - Risk-Free Rate) / Annualized Volatility`

Annualized volatility is derived from the standard deviation of daily returns multiplied by `√(trading_days)`.

### Correlation Matrix

Pearson correlation coefficients computed from daily returns, measuring the co-movement between ETFs. A coefficient near 1 indicates strong positive correlation, near 0 indicates no correlation, and near -1 indicates negative correlation.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--input` / `-i` | Yes | - | Path to the NAV CSV file |
| `--risk-free` / `-rf` | No | 0.02 | Annual risk-free rate (e.g., 0.03 for 3%) |
| `--trading-days` | No | 252 | Trading days per year (typically 252 for US/China markets) |
| `--output` / `-o` | No | - | Output file path (.csv or .json) |
| `--json` | No | false | Output results as JSON to stdout |

## Use Cases

- Compare risk-return profiles across multiple ETFs to support asset allocation decisions
- Analyze correlations between ETFs to build diversified, low-correlation portfolios
- Evaluate fund manager performance (higher Sharpe ratio = better risk-adjusted returns)
- Backtest the performance of different assets over a specific time period

## Notes

- This tool uses only Python standard libraries — no additional dependencies required
- NAV data should span a sufficient time range (at least 60 trading days recommended) for meaningful statistical metrics
- The Sharpe ratio is sensitive to the risk-free rate assumption — adjust the `--risk-free` parameter to match current market conditions
- The correlation matrix requires at least 2 ETFs to generate

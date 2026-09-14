---
name: financial-statement-analyzer
description: "Analyzes income statement, balance sheet, and cash flow statement data to generate YoY/QoQ trend analysis and flag anomalies like AR surges or cash flow divergence. Trigger when users ask to analyze financials, compare YoY/QoQ, detect red flags, or assess earnings quality."
license: MIT
---

# Financial Statement Analysis — YoY/QoQ Trends + Anomaly Detection

Perform structured analysis of a company's income statement, balance sheet, and cash flow statement: automatically compute year-over-year (YoY) and quarter-over-quarter (QoQ) changes, run multi-dimensional anomaly detection rules (AR surge, cash flow divergence from profit, inventory buildup, gross margin shifts, etc.), and produce a readable report.

## Capabilities

| Capability | Description |
|------------|-------------|
| YoY Analysis | Compare same-period data (e.g., 2024Q1 vs 2023Q1) to identify trend changes |
| QoQ Analysis | Compare consecutive periods (e.g., 2024Q2 vs 2024Q1) to capture short-term fluctuations |
| Financial Ratios | Gross margin, net margin, debt-to-asset ratio, current ratio, DSO, and more |
| Anomaly Detection | 10 built-in rules with automatic scanning, risk severity levels, and explanations |

## Quick Start

```bash
# Basic usage: analyze financial data in JSON format
python scripts/analyze_financials.py data.json

# Output results in JSON format
python scripts/analyze_financials.py data.json --json

# Export to a file
python scripts/analyze_financials.py data.json --output report.json

# Generate sample data file (for testing)
python scripts/analyze_financials.py --sample > sample_data.json

# Customize anomaly detection thresholds
python scripts/analyze_financials.py data.json --ar-threshold 0.25 --ocf-ratio 0.4
```

## Input Data Format

The script accepts a JSON file in the following format:

```json
{
  "company": "Acme Corp",
  "currency": "USD",
  "unit": "thousands",
  "periods": ["2023Q1","2023Q2","2023Q3","2023Q4","2024Q1","2024Q2","2024Q3","2024Q4"],
  "income_statement": {
    "revenue": [5000, 5200, 4800, 6000, 5500, 5800, 5100, 6500],
    "cost_of_revenue": [3000, 3100, 2900, 3500, 3400, 3600, 3200, 4100],
    "operating_income": [800, 850, 750, 1000, 780, 820, 700, 900],
    "net_income": [600, 650, 560, 780, 580, 620, 520, 680]
  },
  "balance_sheet": {
    "accounts_receivable": [2000, 2100, 2200, 2300, 2800, 3200, 3600, 4200],
    "inventory": [1000, 1050, 1100, 1200, 1100, 1150, 1200, 1300],
    "total_current_assets": [5000, 5200, 5400, 5800, 6000, 6500, 7000, 7500],
    "goodwill": [500, 500, 500, 500, 500, 500, 500, 500],
    "total_assets": [15000, 15500, 16000, 16500, 17000, 17500, 18000, 18500],
    "accounts_payable": [1500, 1600, 1550, 1700, 1650, 1750, 1700, 1800],
    "total_current_liabilities": [4000, 4200, 4100, 4500, 4300, 4600, 4500, 4900],
    "total_liabilities": [8000, 8200, 8400, 8600, 8800, 9000, 9200, 9500],
    "total_equity": [7000, 7300, 7600, 7900, 8200, 8500, 8800, 9000]
  },
  "cash_flow": {
    "operating_cash_flow": [700, 750, 620, 850, 300, 280, 250, 200],
    "investing_cash_flow": [-200, -180, -250, -300, -400, -350, -300, -280],
    "financing_cash_flow": [-100, -50, -80, -120, 200, 150, 100, 50],
    "capex": [180, 160, 230, 280, 380, 330, 280, 260]
  }
}
```

**Field descriptions:**
- `periods` supports quarterly format (`2024Q1`) and annual format (`2024`); the script auto-detects the type
- All arrays must match the length of `periods`
- Missing fields are skipped gracefully (no errors thrown)
- `unit` is a display label used only in report output

## Parameters

| Parameter | Short | Required | Default | Description |
|-----------|-------|----------|---------|-------------|
| `input` | - | Yes* | - | Path to input JSON file |
| `--json` | `-j` | No | false | Output in JSON format |
| `--output` | `-o` | No | stdout | Output file path (.json) |
| `--sample` | `-s` | No | false | Print sample data to stdout |
| `--ar-threshold` | - | No | 0.20 | AR anomaly threshold (growth rate gap) |
| `--inv-threshold` | - | No | 0.15 | Inventory anomaly threshold (growth rate gap) |
| `--ocf-ratio` | - | No | 0.50 | Cash flow / profit divergence threshold |
| `--margin-threshold` | - | No | 0.05 | Gross margin shift threshold |
| `--debt-ceiling` | - | No | 0.70 | Debt-to-asset ratio warning level |
| `--current-floor` | - | No | 1.00 | Current ratio warning level |
| `--goodwill-ceiling` | - | No | 0.30 | Goodwill-to-asset ratio warning level |

\* `input` is not required when using `--sample`.

## Anomaly Detection Rules

The script includes the following 10 built-in anomaly detection rules:

| # | Rule | Trigger Condition | Risk Implication |
|---|------|-------------------|------------------|
| 1 | AR Surge | AR growth - Revenue growth > threshold | Possible aggressive revenue recognition or collection difficulties |
| 2 | Cash Flow Divergence | OCF / Net Income < threshold | Low earnings quality; profits may contain significant accruals |
| 3 | Inventory Buildup | Inventory growth - Revenue growth > threshold | Potential product obsolescence or write-down risk |
| 4 | Gross Margin Shift | Gross margin change > threshold | Significant change in pricing power or cost structure |
| 5 | Net Margin Shift | Net margin change > threshold | Abnormal expense control or non-recurring items |
| 6 | Persistent Negative OCF | OCF < 0 for 2+ consecutive periods | Insufficient organic cash generation |
| 7 | Excessive Goodwill | Goodwill / Total Assets > threshold | Impairment risk if acquired entities underperform |
| 8 | High Leverage | Liabilities / Assets > threshold | Elevated debt repayment pressure |
| 9 | Low Current Ratio | Current Assets / Current Liabilities < threshold | Weak short-term liquidity |
| 10 | AP Anomaly | AP growth significantly deviates from COGS growth | Supply chain stress or working capital strain |

## LLM Interpretation Guide

When a user provides financial report data (PDF / image / table / text), follow these steps:

1. **Data Extraction**: Convert the user-provided financial data into the JSON format above and save as a temporary file
2. **Run Analysis**: Execute `scripts/analyze_financials.py` for quantitative analysis
3. **Comprehensive Interpretation**: Combine the script output with the analysis framework below to provide a thorough interpretation

### Cross-Statement Analysis Framework

- **Income Statement → Balance Sheet**: Is revenue growth driven by accounts receivable? Is net income converting to retained earnings?
- **Income Statement → Cash Flow Statement**: Does net income match operating cash flow? Are depreciation and amortization add-backs reasonable?
- **Balance Sheet → Cash Flow Statement**: Where is the funding for asset expansion coming from? Are investing activities consistent with capital expenditures?

### Contextual Judgment for Anomaly Signals

An anomaly signal does not necessarily mean "the company has a problem" — it must be interpreted in the context of industry and business conditions:
- An AR surge may be normal seasonal behavior at year-end for B2B companies
- High leverage is typical in utilities and real estate industries
- Negative short-term cash flow can be reasonable for high-growth companies (e.g., SaaS)

### Recommended Output Format

```
## Financial Statement Analysis Report — [Company Name]

### Key Metrics at a Glance
(Summary table of key indicators)

### YoY/QoQ Change Highlights
(Top 3-5 most significant changes with interpretation)

### Anomaly Signals
(Each detected anomaly explained with severity and possible causes)

### Cross-Statement Analysis
(Cross-statement logical validation conclusions)

### Summary & Recommendations
(1-2 paragraph overall assessment)
```

---
name: financial-ratio-toolkit
description: "Analyzes company fundamentals by computing 20+ financial ratios (profitability, solvency, liquidity, efficiency, and growth) and DuPont Analysis from user-provided financial statements. Triggered by requests for financial ratio calculation, DuPont/ROE analysis, or phrases like \"analyze these financials\" or \"calculate solvency ratios."
license: MIT
---

# Financial Ratio Toolkit (Stock Fundamental Analyzer)

Performs comprehensive fundamental analysis on public company financial statements, covering **20+ core financial metrics** and **DuPont Analysis**. Simply provide key data from the balance sheet, income statement, and cash flow statement to get a structured analysis report.

## Quick Start

Save the financial data as a JSON file, then run the analysis script:

```bash
python3 scripts/analyze.py --input financial_data.json
```

Output in JSON format (for programmatic consumption):

```bash
python3 scripts/analyze.py --input financial_data.json --json
```

Read data from standard input:

```bash
cat financial_data.json | python3 scripts/analyze.py --stdin
```

## Input Data Format

Input is in JSON format with the following sections:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company_name` | string | No | Company name |
| `report_period` | string | No | Reporting period (e.g., "2025Q4") |
| `currency` | string | No | Currency unit (default: "CNY") |
| `balance_sheet` | object | **Yes** | Balance sheet data |
| `income_statement` | object | **Yes** | Income statement data |
| `cash_flow_statement` | object | No | Cash flow statement data |
| `market_data` | object | No | Market data (stock price, shares, etc.) |
| `prior_year` | object | No | Prior year comparative data (for growth rate calculations) |

### Balance Sheet (balance_sheet)

| Field | Description |
|-------|-------------|
| `total_assets` | Total assets |
| `total_liabilities` | Total liabilities |
| `shareholders_equity` | Shareholders' equity (net assets) |
| `current_assets` | Current assets |
| `current_liabilities` | Current liabilities |
| `inventory` | Inventory |
| `accounts_receivable` | Accounts receivable |
| `cash_and_equivalents` | Cash and cash equivalents |

### Income Statement (income_statement)

| Field | Description |
|-------|-------------|
| `revenue` | Revenue |
| `cost_of_goods_sold` | Cost of goods sold |
| `operating_income` | Operating income |
| `net_income` | Net income |
| `interest_expense` | Interest expense |
| `depreciation_amortization` | Depreciation and amortization |
| `income_tax` | Income tax expense |

### Cash Flow Statement (cash_flow_statement)

| Field | Description |
|-------|-------------|
| `operating_cash_flow` | Net cash from operating activities |
| `capital_expenditure` | Capital expenditure |

### Market Data (market_data)

| Field | Description |
|-------|-------------|
| `shares_outstanding` | Total shares outstanding |
| `stock_price` | Current stock price |

### Prior Year Data (prior_year)

| Field | Description |
|-------|-------------|
| `revenue` | Prior year revenue |
| `net_income` | Prior year net income |

## Analysis Metrics (20+ Items)

### Profitability (6 items)
- ROE (Return on Equity)
- ROA (Return on Assets)
- Gross Profit Margin
- Net Profit Margin
- Operating Profit Margin
- EBITDA Margin

### Solvency (4 items)
- Debt-to-Asset Ratio
- Equity Multiplier
- Interest Coverage Ratio (EBIT / Interest Expense)
- Debt-to-Equity Ratio (Liabilities / Equity)

### Liquidity (3 items)
- Current Ratio
- Quick Ratio
- Cash Ratio

### Operational Efficiency (6 items)
- Asset Turnover
- Inventory Turnover
- Days Inventory Outstanding
- Receivables Turnover
- Days Sales Outstanding
- Working Capital Turnover

### Per-Share Metrics (3 items)
- Earnings Per Share (EPS)
- Book Value Per Share (BVPS)
- Price-to-Earnings Ratio (P/E)

### Cash Flow Metrics (3 items)
- Operating Cash Flow Ratio
- Free Cash Flow
- Cash Flow to Net Income Ratio

### Growth (2 items)
- Revenue Growth Rate (YoY)
- Net Income Growth Rate (YoY)

### DuPont Analysis
Decomposes ROE into three factors:
> ROE = Net Profit Margin x Asset Turnover x Equity Multiplier

## Output Example

The script produces a structured analysis report containing values, reference ranges, and brief assessments for each metric. See `scripts/analyze.py --help` for detailed usage.

## Notes

- All metrics are calculated from user-provided static financial data; no live market data is fetched
- Reference ranges vary significantly across industries; the assessments in the report are for reference only
- It is recommended to consider industry characteristics and company-specific context for a comprehensive evaluation
- The script uses only the Python standard library with no additional dependencies required

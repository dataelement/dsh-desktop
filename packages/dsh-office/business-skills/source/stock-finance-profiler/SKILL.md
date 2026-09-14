---
name: stock-finance-profiler
description: "股票基本面分析工具：基于用户提供的三张财务报表（资产负债表、利润表、现金流量表），计算超过 20 项核心财务指标（涵盖盈利能力、偿债能力、流动性、营运效率、每股指标、现金流和成长能力）并进行详细的杜邦分析。当用户提及财报分析、基本面分析、财务指标计算、杜邦分解、ROE 分析，或使用类似“帮我分析一下这家公司的财报”、“计算一下财务比率”等表述时触发。"
license: MIT
---

# 股票基本面分析工具（Stock Fundamental Analyzer）

对上市公司财报数据进行全面的基本面分析，覆盖 **20+ 核心财务指标** 和 **杜邦分析（DuPont Analysis）**。用户只需提供资产负债表、利润表、现金流量表的关键数据，即可获得结构化的分析报告。

## Quick Start

将财报数据保存为 JSON 文件，然后运行分析脚本：

```bash
python3 scripts/analyze.py --input financial_data.json
```

输出 JSON 格式（便于程序处理）：

```bash
python3 scripts/analyze.py --input financial_data.json --json
```

从标准输入读取数据：

```bash
cat financial_data.json | python3 scripts/analyze.py --stdin
```

## 输入数据格式

输入为 JSON 格式，包含以下部分：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company_name` | string | 否 | 公司名称 |
| `report_period` | string | 否 | 报告期（如 "2025Q4"） |
| `currency` | string | 否 | 货币单位（默认 "CNY"） |
| `balance_sheet` | object | **是** | 资产负债表数据 |
| `income_statement` | object | **是** | 利润表数据 |
| `cash_flow_statement` | object | 否 | 现金流量表数据 |
| `market_data` | object | 否 | 市场数据（股价、股本等） |
| `prior_year` | object | 否 | 上年同期数据（用于计算增长率） |

### 资产负债表（balance_sheet）

| 字段 | 说明 |
|------|------|
| `total_assets` | 总资产 |
| `total_liabilities` | 总负债 |
| `shareholders_equity` | 股东权益（净资产） |
| `current_assets` | 流动资产 |
| `current_liabilities` | 流动负债 |
| `inventory` | 存货 |
| `accounts_receivable` | 应收账款 |
| `cash_and_equivalents` | 货币资金 |

### 利润表（income_statement）

| 字段 | 说明 |
|------|------|
| `revenue` | 营业收入 |
| `cost_of_goods_sold` | 营业成本 |
| `operating_income` | 营业利润 |
| `net_income` | 净利润 |
| `interest_expense` | 利息费用 |
| `depreciation_amortization` | 折旧摊销 |
| `income_tax` | 所得税费用 |

### 现金流量表（cash_flow_statement）

| 字段 | 说明 |
|------|------|
| `operating_cash_flow` | 经营活动现金流净额 |
| `capital_expenditure` | 资本支出 |

### 市场数据（market_data）

| 字段 | 说明 |
|------|------|
| `shares_outstanding` | 总股本（股） |
| `stock_price` | 当前股价 |

### 上年同期数据（prior_year）

| 字段 | 说明 |
|------|------|
| `revenue` | 上年营业收入 |
| `net_income` | 上年净利润 |

## 分析指标（20+ 项）

### 盈利能力（6 项）
- ROE（净资产收益率）
- ROA（总资产收益率）
- 毛利率
- 净利率
- 营业利润率
- EBITDA 利润率

### 偿债能力（4 项）
- 资产负债率
- 权益乘数
- 利息保障倍数（EBIT / 利息费用）
- 产权比率（负债 / 权益）

### 流动性（3 项）
- 流动比率
- 速动比率
- 现金比率

### 营运效率（6 项）
- 总资产周转率
- 存货周转率
- 存货周转天数
- 应收账款周转率
- 应收账款周转天数
- 营运资金周转率

### 每股指标（3 项）
- 每股收益（EPS）
- 每股净资产（BVPS）
- 市盈率（P/E）

### 现金流指标（3 项）
- 经营现金流比率
- 自由现金流
- 现金流净利润比

### 成长能力（2 项）
- 营收同比增长率
- 净利润同比增长率

### 杜邦分析
将 ROE 分解为三因素：
> ROE = 净利率 × 总资产周转率 × 权益乘数

## 输出示例

脚本会输出结构化的分析报告，包含各类指标的数值、参考范围和简要评价。详细用法请参考 `scripts/analyze.py --help`。

## 注意事项

- 所有指标基于用户提供的静态财报数据计算，不涉及实时行情获取
- 不同行业的指标参考范围差异较大，报告中的评价仅供参考
- 建议结合行业特点和公司具体情况进行综合判断
- 脚本仅使用 Python 标准库，无需安装额外依赖

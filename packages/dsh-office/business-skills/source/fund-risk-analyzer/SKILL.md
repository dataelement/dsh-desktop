---
name: fund-risk-analyzer
description: "ETF多维对比工具：基于用户提供的净值CSV数据，自动计算并对比多只ETF或基金的年化收益率、最大回撤、夏普比率，并生成相关性矩阵图表。当用户需要对比基金风险收益、计算年化收益/最大回撤/夏普比率、进行相关性分析，或提到关键词如ETF对比、净值分析、风险收益、波动率、Sharpe Ratio、max drawdown时触发。"
license: MIT
---

# ETF Screener / ETF 多维对比工具

基于用户提供的净值（NAV）数据，对多只 ETF 进行多维度风险收益对比分析，自动计算年化收益率、最大回撤、夏普比率，并生成相关性矩阵。

## Quick Start

### 基础对比

```bash
python scripts/etf_screener.py --input nav_data.csv
```

### 自定义无风险利率 + CSV 导出

```bash
python scripts/etf_screener.py --input nav_data.csv --risk-free 0.03 --output report.csv
```

### JSON 输出（便于程序化处理）

```bash
python scripts/etf_screener.py --input nav_data.csv --json
```

## 输入数据格式

CSV 文件，第一列为日期，后续列为各 ETF 的净值：

```csv
date,沪深300ETF,中证500ETF,纳指ETF
2023-01-03,1.0000,1.0000,1.0000
2023-01-04,1.0050,0.9980,1.0020
2023-01-05,1.0120,1.0010,1.0080
...
```

- 日期列名不限，格式不限（仅用于标注区间）
- ETF 列名即为对比报告中的名称
- 缺失值用空白或 `NaN` 表示，会自动跳过

## 计算说明

### 年化收益率 (Annualized Return)

基于首尾净值计算总收益，再按交易日数年化：

`Ann. Return = (NAV_end / NAV_start) ^ (trading_days / n_days) - 1`

### 最大回撤 (Max Drawdown)

净值序列中从峰值到谷底的最大跌幅：

`MDD = max( (peak - trough) / peak )`

### 夏普比率 (Sharpe Ratio)

风险调整后收益指标：

`Sharpe = (Annualized Return - Risk-Free Rate) / Annualized Volatility`

年化波动率由日收益率标准差乘以 `√(trading_days)` 得出。

### 相关性矩阵 (Correlation Matrix)

基于日收益率计算 Pearson 相关系数，衡量 ETF 间的联动程度。相关系数接近 1 表示高度正相关，接近 0 表示不相关，接近 -1 表示负相关。

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--input` / `-i` | 是 | - | 净值 CSV 文件路径 |
| `--risk-free` / `-rf` | 否 | 0.02 | 年化无风险利率（如 0.03 表示 3%） |
| `--trading-days` | 否 | 252 | 每年交易日数（A 股 252，美股 252） |
| `--output` / `-o` | 否 | - | 输出文件路径（.csv 或 .json） |
| `--json` | 否 | false | 以 JSON 格式输出到 stdout |

## 使用场景

- 对比多只 ETF 的风险收益特征，辅助资产配置决策
- 分析 ETF 间的相关性，构建低相关的投资组合
- 评估基金经理表现（夏普比率越高越好）
- 回测不同资产在特定时间段的表现

## 注意事项

- 本工具使用纯 Python 标准库，无需安装额外依赖
- 净值数据需要足够的时间跨度（建议至少 60 个交易日）才能获得有意义的统计指标
- 夏普比率受无风险利率假设影响，请根据实际市场环境调整 `--risk-free` 参数
- 相关性矩阵需要至少 2 只 ETF 才能生成

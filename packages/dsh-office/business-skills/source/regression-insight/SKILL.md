---
name: regression-insight
description: "对 CSV/Excel 数据执行线性回归（OLS）或逻辑回归（Logistic），一键输出完整统计结果（包含回归系数、R²、p值、VIF等）和中文通俗解读。当用户提及回归分析、拟合模型、查看系数显著性、R方、p值、共线性（VIF），或使用关键词如 回归、regression、OLS、logit、拟合、显著性 时触发。"
license: MIT
---

# regression-analyzer

自动回归建模工具 —— 对表格数据执行线性回归（OLS）或逻辑回归（Logit），一键输出完整统计结果和中文通俗解读。

## 能力概览

| 功能 | 说明 |
|------|------|
| 线性回归 | OLS，输出系数、R²、调整 R²、F 检验、AIC/BIC、Durbin-Watson |
| 逻辑回归 | Logit，输出系数、Odds Ratio、Pseudo R²、似然比检验 |
| 多重共线性检测 | 每个自变量的 VIF 值 + 警告级别 |
| 通俗解读 | 用中文对每个指标和系数给出"什么意思/该怎么看"的说明 |
| 自动检测 | 目标变量为 0/1 时自动切换逻辑回归 |

## Quick Start

```bash
# 线性回归：预测 price，用所有数值列做自变量
python3 scripts/regression_analyzer.py data.csv --target price

# 逻辑回归：预测 churn（0/1），指定特征列
python3 scripts/regression_analyzer.py users.csv --target churn --features "age,income,tenure"

# 保存结果到 JSON
python3 scripts/regression_analyzer.py data.csv --target sales --output result.json
```

## 详细用法

### 基本调用

```bash
python3 scripts/regression_analyzer.py <数据文件> --target <目标列> [选项]
```

### 指定回归类型

```bash
# 强制线性回归
python3 scripts/regression_analyzer.py data.csv -t y --type linear

# 强制逻辑回归
python3 scripts/regression_analyzer.py data.csv -t label --type logistic

# 自动检测（默认）
python3 scripts/regression_analyzer.py data.csv -t y --type auto
```

### 选择特征列

```bash
# 手动指定（逗号分隔）
python3 scripts/regression_analyzer.py data.csv -t price -f "sqft,bedrooms,bathrooms"

# 省略则自动使用所有数值列
python3 scripts/regression_analyzer.py data.csv -t price
```

## 参数说明

| 参数 | 缩写 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `input` | — | 是 | — | 输入文件路径（CSV/TSV/Excel/JSON） |
| `--target` | `-t` | 是 | — | 目标变量（因变量）列名 |
| `--features` | `-f` | 否 | 全部数值列 | 自变量列名，逗号分隔 |
| `--type` | `-T` | 否 | `auto` | 回归类型：`linear` / `logistic` / `auto` |
| `--output` | `-o` | 否 | 标准输出 | 结果 JSON 保存路径 |
| `--no-const` | — | 否 | `false` | 不添加截距项 |
| `--keep-na` | — | 否 | `false` | 保留缺失值行（调试用） |

## 输出结构（JSON）

```json
{
  "type": "linear",
  "r_squared": 0.8523,
  "r_squared_adj": 0.8471,
  "f_statistic": 162.34,
  "f_p_value": 0.0,
  "coefficients": {
    "sqft": {"coefficient": 135.42, "p_value": 0.0001, ...},
    "bedrooms": {"coefficient": 8021.5, "p_value": 0.032, ...}
  },
  "vif": {"sqft": 2.31, "bedrooms": 1.87},
  "interpretation": {
    "模型概述": ["R² = 0.8523（模型拟合优良…）"],
    "各变量解读": ["sqft：系数 = 135.42…正向影响…"]
  }
}
```

## 依赖

- Python 3.8+
- pandas
- numpy
- statsmodels
- scipy

```bash
pip install pandas numpy statsmodels scipy
```

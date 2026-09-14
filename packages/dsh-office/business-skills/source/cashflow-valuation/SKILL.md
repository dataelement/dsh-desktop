---
name: cashflow-valuation
description: "DCF现金流折现估值模型，支持完整的自由现金流预测、终值计算和企业价值推导，并生成增长率 × 折现率的敏感性分析矩阵。当用户需要进行企业估值、DCF分析、现金流折现计算、WACC折现、终值计算、敏感性分析、股权价值或每股价值估算，或提及关键词如DCF、估值、折现、现金流、WACC、terminal value、sensitivity analysis、企业价值、equity value、Gordon Growth Model、自由现金流时触发。"
license: MIT
---

# DCF Valuation / 现金流折现估值模型

基于 DCF（Discounted Cash Flow）方法的企业估值工具，支持完整的自由现金流预测、终值计算、企业价值推导，并自动生成 **增长率 × 折现率** 的敏感性分析矩阵。

## Quick Start

### 基础 DCF 估值

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10
```

### 带敏感性分析矩阵

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --sensitivity
```

### 完整股权估值 + CSV 导出

```bash
python scripts/dcf_model.py \
    --fcf 5000 --growth 0.12 --discount 0.09 \
    --terminal-growth 0.03 --years 5 \
    --debt 8000 --cash 3000 --shares 10000000 \
    --currency "万元" \
    --sensitivity \
    --growth-range 0.05,0.25,0.05 \
    --discount-range 0.06,0.14,0.02 \
    --output valuation.csv
```

## 详细用法

### 核心估值流程

1. **预测期自由现金流**：基于基准 FCF 和增长率，逐年预测未来 N 年的 FCF
2. **终值计算**：使用 Gordon Growth Model（永续增长模型），`TV = FCF_n × (1+g) / (r-g)`
3. **折现求和**：将预测期 FCF 和终值折现到当前，得到企业价值（Enterprise Value）
4. **股权价值**：`Equity Value = EV - Net Debt + Cash`
5. **每股价值**：`Per Share = Equity Value / Shares Outstanding`

### 敏感性分析矩阵

通过 `--sensitivity` 参数自动生成二维矩阵，展示不同增长率和折现率组合下的企业价值，帮助理解关键假设变化对估值的影响。

矩阵中用 `[方括号]` 标记基准情景（base case）。

### JSON 输出模式

添加 `--json` 参数可将完整结果以 JSON 格式输出到 stdout，便于程序化处理：

```bash
python scripts/dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --json
```

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--fcf` | 是 | - | 基准年自由现金流（正数） |
| `--growth` | 是 | - | 年增长率，如 0.15 表示 15% |
| `--discount` | 是 | - | 折现率 / WACC，如 0.10 表示 10% |
| `--terminal-growth` | 否 | 0.03 | 永续增长率（必须 < 折现率） |
| `--years` | 否 | 5 | 预测年数（1-30） |
| `--debt` | 否 | 0 | 净负债（用于计算股权价值） |
| `--cash` | 否 | 0 | 现金及等价物 |
| `--shares` | 否 | 0 | 总股本（用于计算每股价值） |
| `--sensitivity` | 否 | false | 生成敏感性分析矩阵 |
| `--growth-range` | 否 | 自动 | 增长率范围 `min,max,step`，如 `0.05,0.25,0.05` |
| `--discount-range` | 否 | 自动 | 折现率范围 `min,max,step`，如 `0.06,0.14,0.02` |
| `--output` | 否 | - | 输出文件路径（.csv 或 .json） |
| `--currency` | 否 | "" | 金额单位标签，如 `万元`、`M USD` |
| `--json` | 否 | false | 以 JSON 格式输出到 stdout |

## 使用场景

- 对目标公司进行 DCF 估值，评估其合理价格区间
- 投资决策前的估值敏感性检验（关键假设变化多大会改变结论）
- 财务建模时快速生成估值矩阵表格
- 输出 CSV/JSON 结果，嵌入更大的分析流程或报告中

## 注意事项

- 折现率必须大于永续增长率（Gordon Growth Model 的数学要求）
- 本工具使用纯 Python 标准库，无需安装额外依赖
- 敏感性矩阵中标记为 `N/A` 的单元格表示该参数组合不满足数学约束

---
name: auto-stat-test
description: "自动执行统计检验，根据数据特征（组数、正态性、配对设计）智能选择 t 检验、卡方检验、ANOVA、Mann-Whitney U 等合适方法，并输出包含 p 值、效应量和通俗中文解读的完整报告。当用户需要进行假设检验、组间比较、显著性分析，或提及 t 检验、卡方、方差分析、p 值、配对检验、非参数检验等关键词时触发。"
license: MIT
---

# statistical-test-suite

自动统计检验工具 —— 根据数据特征自动选择合适的统计检验方法（t 检验 / 卡方 / ANOVA / Mann-Whitney 等），一键输出检验结果和中文通俗解读。

## 能力概览

| 功能 | 说明 |
|------|------|
| 独立样本 t 检验 | 2 组 + 正态数据，比较均值差异 |
| Welch t 检验 | 2 组 + 正态但方差不齐 |
| Mann-Whitney U | 2 组 + 非正态数据（非参数） |
| 单因素 ANOVA | 3+ 组 + 正态数据 |
| Kruskal-Wallis | 3+ 组 + 非正态数据（非参数） |
| 卡方独立性检验 | 两个分类变量的关联性 |
| 配对 t 检验 | 前后对比（正态） |
| Wilcoxon 符号秩 | 前后对比（非参数） |
| 自动选择 | 根据组数、正态性、数据类型自动决定 |
| 通俗解读 | 每个指标和结论都给出中文白话说明 |

## Quick Start

```bash
# 分组比较（自动选择检验方法）
python3 scripts/statistical_test_suite.py data.csv --group treatment --value score

# 卡方检验（两个分类变量）
python3 scripts/statistical_test_suite.py survey.csv --group gender --value preference

# 配对检验（前后对比）
python3 scripts/statistical_test_suite.py experiment.csv --col1 pre_score --col2 post_score --paired

# 强制指定检验方法
python3 scripts/statistical_test_suite.py data.csv --group group --value score --test mann-whitney

# 保存结果到 JSON
python3 scripts/statistical_test_suite.py data.csv -g treatment -v score -o result.json
```

## 详细用法

### 模式一：分组比较

用 `--group` 指定分组列，`--value` 指定比较列，工具自动判断用哪种检验。

```bash
python3 scripts/statistical_test_suite.py <数据文件> --group <分组列> --value <数值列> [选项]
```

自动选择逻辑：
1. 两列都是分类变量 → **卡方检验**
2. 2 个组 + 数据正态 → **独立样本 t 检验**（方差不齐则用 Welch t）
3. 2 个组 + 数据非正态 → **Mann-Whitney U 检验**
4. 3+ 个组 + 数据正态 → **单因素 ANOVA**
5. 3+ 个组 + 数据非正态 → **Kruskal-Wallis 检验**

### 模式二：配对比较

用 `--col1` 和 `--col2` 指定前后两个变量列。

```bash
python3 scripts/statistical_test_suite.py <数据文件> --col1 <前> --col2 <后> --paired [选项]
```

自动选择逻辑：
1. 差值正态 → **配对 t 检验**
2. 差值非正态 → **Wilcoxon 符号秩检验**

## 参数说明

| 参数 | 缩写 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `input` | — | 是 | — | 输入文件路径（CSV/TSV/Excel/JSON） |
| `--group` | `-g` | 模式一 | — | 分组变量列名 |
| `--value` | `-v` | 模式一 | — | 数值/分类变量列名 |
| `--col1` | — | 模式二 | — | 配对检验第 1 个变量列名 |
| `--col2` | — | 模式二 | — | 配对检验第 2 个变量列名 |
| `--paired` | — | 否 | `false` | 启用配对检验模式 |
| `--test` | `-T` | 否 | 自动 | 强制检验方法（见下方列表） |
| `--alpha` | `-a` | 否 | `0.05` | 显著性水平 |
| `--output` | `-o` | 否 | 标准输出 | 结果 JSON 保存路径 |

### 可选检验方法（`--test`）

`t-test` / `mann-whitney` / `anova` / `kruskal-wallis` / `chi-square` / `paired-ttest` / `wilcoxon`

## 输出结构（JSON）

```json
{
  "test": "独立样本 t 检验",
  "test_id": "independent_ttest",
  "statistic": 2.3456,
  "p_value": 0.0213,
  "effect_size": {"cohens_d": 0.4821},
  "group_stats": {
    "对照组": {"n": 30, "mean": 72.5, "std": 8.3},
    "实验组": {"n": 30, "mean": 78.1, "std": 7.9}
  },
  "normality_check": {"对照组": "Shapiro-Wilk W = 0.97, p = 0.52（正态）", "...": "..."},
  "selection_reason": ["2 组比较 + 数据近似正态 → 选择独立样本 t 检验"],
  "alpha": 0.05,
  "interpretation": [
    "检验方法：独立样本 t 检验",
    "显著性水平：α = 0.05",
    "结论：p = 0.0213 < 0.05，差异具有统计学显著性。",
    "效应量：Cohen's d = 0.4821（中等效应量，差异明显）",
    "通俗解读：「对照组」（均值 72.5）和「实验组」（均值 78.1）之间存在显著差异…"
  ]
}
```

## 依赖

- Python 3.8+
- pandas
- numpy
- scipy

```bash
pip install pandas numpy scipy
```

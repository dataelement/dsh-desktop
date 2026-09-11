---
name: corr-insight
description: "计算变量间的Pearson或Spearman相关矩阵、偏相关分析，并自动识别因混淆变量导致的伪相关。当用户需要检查数据相关性、计算相关系数、进行偏相关分析，或提及伪相关、spurious correlation、混淆变量等关键词时触发。"
license: MIT
---

# correlation-explorer

相关性分析工具 —— 对表格数据计算 Pearson/Spearman 相关矩阵、偏相关矩阵，并自动识别疑似伪相关（由混淆变量导致的虚假关联）。

## 能力概览

| 功能 | 说明 |
|------|------|
| Pearson 相关矩阵 | 线性相关系数 + p 值，适用于连续且近似正态的变量 |
| Spearman 相关矩阵 | 秩相关系数 + p 值，适用于非线性单调关系或有序变量 |
| 偏相关矩阵 | 控制所有其他变量后的净相关（精度矩阵法），揭示变量间的直接关联 |
| 伪相关识别 | 自动对比简单相关与偏相关，标记因混淆变量导致的虚假显著相关 |
| 通俗解读 | 用中文对每对变量的相关强度、显著性、偏相关变化给出说明 |

## Quick Start

```bash
# 分析所有数值列的相关性
python3 scripts/correlation_explorer.py data.csv

# 只分析指定列
python3 scripts/correlation_explorer.py data.csv -f "age,income,spending,score"

# 只算 Pearson
python3 scripts/correlation_explorer.py data.csv -m pearson

# 保存结果到 JSON
python3 scripts/correlation_explorer.py data.csv -o result.json
```

## 详细用法

### 基本调用

```bash
python3 scripts/correlation_explorer.py <数据文件> [选项]
```

### 选择相关系数类型

```bash
# 同时计算 Pearson 和 Spearman（默认）
python3 scripts/correlation_explorer.py data.csv -m all

# 只计算 Pearson
python3 scripts/correlation_explorer.py data.csv -m pearson

# 只计算 Spearman
python3 scripts/correlation_explorer.py data.csv -m spearman
```

### 调整伪相关检测灵敏度

```bash
# 更严格：相关系数下降 30% 即报警
python3 scripts/correlation_explorer.py data.csv -d 0.3

# 更宽松：下降 70% 才报警
python3 scripts/correlation_explorer.py data.csv -d 0.7

# 使用 0.01 显著性水平
python3 scripts/correlation_explorer.py data.csv -a 0.01
```

## 参数说明

| 参数 | 缩写 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `input` | — | 是 | — | 输入文件路径（CSV/TSV/Excel/JSON） |
| `--features` | `-f` | 否 | 全部数值列 | 要分析的列名，逗号分隔 |
| `--method` | `-m` | 否 | `all` | 相关系数类型：`all` / `pearson` / `spearman` |
| `--alpha` | `-a` | 否 | `0.05` | 显著性水平 |
| `--drop-threshold` | `-d` | 否 | `0.5` | 伪相关判定的下降阈值（0~1，默认 50%） |
| `--output` | `-o` | 否 | 标准输出 | 结果 JSON 保存路径 |

## 输出结构（JSON）

```json
{
  "n_observations": 200,
  "n_variables": 4,
  "features": ["age", "income", "spending", "score"],
  "pearson": {
    "columns": ["age", "income", "spending", "score"],
    "correlation": [[1.0, 0.72, ...], ...],
    "p_values": [[0.0, 0.0001, ...], ...]
  },
  "spearman": { "..." : "同 pearson 结构" },
  "partial_correlation": {
    "columns": ["age", "income", "spending", "score"],
    "partial_correlation": [[1.0, 0.15, ...], ...],
    "p_values": [[0.0, 0.32, ...], ...],
    "df": 196
  },
  "spurious_correlations": [
    {
      "var_x": "age",
      "var_y": "spending",
      "pearson_r": 0.65,
      "partial_r": 0.08,
      "drop_pct": 87.7,
      "reasons": ["偏相关不显著", "相关系数下降 87.7%"]
    }
  ],
  "interpretation": {
    "概览": ["分析了 4 个变量的相关性..."],
    "最强相关对": ["income <-> spending：r = 0.82（很强正相关）"],
    "偏相关洞察": ["age <-> spending：控制其他变量后减弱了 87.7%"],
    "伪相关检测": ["发现 1 对疑似伪相关..."]
  }
}
```

## 核心概念

### 偏相关 vs 简单相关
- **简单相关**（Pearson/Spearman）：两变量之间的总体关联，可能混入第三方变量的影响
- **偏相关**：控制了所有其他变量后，两变量之间的"净"关联
- 如果偏相关远小于简单相关，说明两变量的关联很大程度上是由其他变量"中介"或"混淆"的

### 伪相关（Spurious Correlation）
当两个变量看似相关，但实际上是因为它们都受到第三方混淆变量的影响。本工具通过对比简单相关和偏相关来自动识别这类情况。

## 依赖

- Python 3.8+
- pandas
- numpy
- scipy

```bash
pip install pandas numpy scipy
```

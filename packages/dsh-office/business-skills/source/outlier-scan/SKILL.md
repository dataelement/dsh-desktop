---
name: outlier-scan
description: "CSV数据异常检测工具，使用Z-score、IQR（四分位距）、移动平均偏离三种方法进行扫描，并自动将检测到的异常点分类为「可解释」或「需关注」，输出详细的JSON报告。当用户需要异常检测、离群值排查或数据质量巡检，提及outlier detection、Z-score、IQR、移动平均偏离等关键词或直接上传CSV文件时触发。"
license: MIT
---

# anomaly-detector

多方法异常检测工具，支持 Z-score、IQR（四分位距）、移动平均偏离三种检测方法，对检测到的异常自动分类标注为「可解释」或「需关注」。

## 能力概览

| 能力 | 说明 |
|------|------|
| Z-score 检测 | 基于标准差偏离程度识别异常，适合近似正态分布数据 |
| IQR 检测 | 基于四分位距识别异常，对偏态分布更稳健 |
| 移动平均偏离 | 基于滑动窗口均值偏离识别异常，适合时序数据 |
| 异常分类 | 综合多方法结果，将异常标注为「可解释」或「需关注」 |

## Quick Start

```bash
# 使用全部方法检测
python3 scripts/anomaly_detector.py data.csv

# 指定方法和列
python3 scripts/anomaly_detector.py data.csv --methods z-score,iqr --columns price,volume

# 自定义阈值，输出到文件
python3 scripts/anomaly_detector.py data.csv --z-threshold 2.5 --window 7 --output result.json
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `csv_file` | 位置参数 | (必填) | 输入 CSV 文件路径 |
| `--methods` | 字符串 | `z-score,iqr,moving-avg` | 逗号分隔的检测方法 |
| `--columns` | 字符串 | 全部数值列 | 逗号分隔的目标列名 |
| `--z-threshold` | 浮点数 | `3.0` | Z-score 判定阈值 |
| `--iqr-multiplier` | 浮点数 | `1.5` | IQR 倍数（1.5=普通异常, 3.0=极端异常）|
| `--window` | 整数 | `5` | 移动平均窗口大小 |
| `--ma-threshold` | 浮点数 | `2.0` | 移动平均偏离阈值（标准差倍数）|
| `--output` | 字符串 | stdout | 输出文件路径（JSON 格式）|

## 异常分类规则

脚本会综合所有方法的检测结果，对每个异常点进行分类：

**需关注（needs_attention）**：满足以下任一条件
- 被 2 种及以上方法同时检出
- Z-score 绝对值 > 阈值 × 1.5（极端偏离）
- IQR 偏离超过 3 倍 IQR（极端离群）

**可解释（explainable）**：不满足上述条件的异常
- 仅被 1 种方法检出
- 偏离程度温和，可能是正常波动

## 输出结构

```json
{
  "summary": {
    "total_rows": 100,
    "columns_analyzed": ["price", "volume"],
    "methods_used": ["z-score", "iqr", "moving-avg"],
    "total_anomalies": 8,
    "needs_attention": 3,
    "explainable": 5
  },
  "anomalies": [
    {
      "row": 42,
      "column": "price",
      "value": 999.9,
      "methods_detected": ["z-score", "iqr"],
      "details": {
        "z_score": 4.2,
        "iqr_bounds": [10.0, 50.0]
      },
      "classification": "needs_attention",
      "reason": "被 2 种方法同时检出，Z-score=4.2 远超阈值"
    }
  ],
  "column_stats": {
    "price": {
      "mean": 25.3,
      "std": 5.1,
      "q1": 21.0,
      "q3": 29.5,
      "iqr": 8.5,
      "anomaly_count": 5
    }
  }
}
```

## 使用指南

1. **准备数据**：CSV 文件需包含表头行，数值列会被自动识别
2. **选择方法**：
   - 数据近似正态分布 → 优先使用 `z-score`
   - 数据有偏态或不确定分布 → 优先使用 `iqr`
   - 时序数据关注趋势偏离 → 使用 `moving-avg`
   - 不确定时使用全部方法（默认），综合判断更可靠
3. **解读结果**：优先关注 `needs_attention` 类异常，`explainable` 类可作为参考

## 依赖

仅使用 Python 标准库，无需额外安装：
- `csv` — CSV 文件读取
- `json` — JSON 输出
- `math` — 数学计算
- `statistics` — 统计函数

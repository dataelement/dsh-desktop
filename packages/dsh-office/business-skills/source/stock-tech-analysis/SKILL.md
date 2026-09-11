---
name: stock-tech-analysis
description: "OHLCV 技术指标分析工具，可从股票OHLCV数据计算15+种常见技术指标（包括MA、MACD、RSI、布林带、KDJ、ATR等），并生成多空信号汇总与综合研判报告。当用户提出技术分析、指标计算、K线分析等请求，或使用具体词汇如“MACD金叉”、“RSI超买”、“均线交叉”、“量价分析”，或直接询问“帮我算一下技术指标”、“分析这段K线的多空信号”时触发。"
license: MIT
---

# OHLCV 技术指标分析工具（Technical Indicator Toolkit）

从 OHLCV 数据计算 **15+ 技术指标**，并生成**多空信号汇总**与综合研判。用户只需提供包含 OHLCV 列的 CSV 文件，即可获得完整的技术分析报告。

## Quick Start

```bash
python3 scripts/compute_indicators.py data.csv
```

输出文本格式报告：

```bash
python3 scripts/compute_indicators.py data.csv --format text
```

输出最近 5 行的指标数据：

```bash
python3 scripts/compute_indicators.py data.csv --last-n 5
```

将结果保存到文件：

```bash
python3 scripts/compute_indicators.py data.csv -o result.json
```

## 输入数据格式

CSV 文件需包含以下列（列名大小写不敏感，支持常见别名）：

| 列名 | 别名 | 说明 |
|------|------|------|
| `Open` | `o` | 开盘价 |
| `High` | `h` | 最高价 |
| `Low` | `l` | 最低价 |
| `Close` | `c`, `adj close` | 收盘价 |
| `Volume` | `vol`, `v` | 成交量 |
| `Date` | `datetime`, `time` | 日期（可选） |

示例 CSV：

```csv
Date,Open,High,Low,Close,Volume
2025-01-02,100.0,105.0,99.0,103.5,1500000
2025-01-03,103.5,108.0,102.0,106.0,1800000
...
```

## 技术指标（17 组）

### 均线指标（6 项）
- SMA(5)、SMA(10)、SMA(20)、SMA(60) — 简单移动平均线
- EMA(12)、EMA(26) — 指数移动平均线

### MACD（3 项）
- MACD 线（EMA12 − EMA26）
- Signal 线（MACD 的 9 日 EMA）
- Histogram 柱状图（MACD − Signal）

### RSI（1 项）
- RSI(14) — 14 日相对强弱指数

### 布林带（3 项）
- 上轨（Middle + 2σ）
- 中轨（SMA20）
- 下轨（Middle − 2σ）

### KDJ（3 项）
- K 值、D 值、J 值（9,3,3 参数）

### 波动率与趋势
- ATR(14) — 平均真实波幅
- ADX(14) — 平均方向指数
- +DI / −DI — 方向运动指标

### 量价指标
- OBV — 能量潮
- VWAP — 成交量加权平均价
- MFI(14) — 资金流量指数

### 动量指标
- CCI(20) — 顺势指标
- Williams %R(14) — 威廉指标
- ROC(12) — 变动速率
- TRIX — 三重指数平滑平均线

## 多空信号判定规则

| 指标 | 做多信号 | 做空信号 |
|------|---------|---------|
| MA 交叉 | SMA5 > SMA20 | SMA5 < SMA20 |
| MACD | Histogram > 0 | Histogram < 0 |
| RSI | RSI < 30（超卖） | RSI > 70（超买） |
| 布林带 | 价格 < 下轨 | 价格 > 上轨 |
| KDJ | J < 20 或 K > D | J > 80 或 K < D |
| CCI | CCI < −100 | CCI > 100 |
| Williams %R | %R < −80 | %R > −20 |
| ADX/DMI | ADX > 25 且 +DI > −DI | ADX > 25 且 −DI > +DI |
| ROC | ROC > 0 | ROC < 0 |
| MFI | MFI < 20 | MFI > 80 |
| OBV | 5 日趋势上升 | 5 日趋势下降 |
| TRIX | TRIX > 0 | TRIX < 0 |

综合判断基于多空信号数量占比。

## 输出格式

### JSON 模式（默认）

```json
{
  "metadata": { "input_file": "...", "total_rows": 100, "indicators_computed": 27 },
  "indicators": [ { "date": "...", "close": 103.5, "SMA_5": 102.1, ... } ],
  "signals": { "MA_Cross": "bullish", "MACD": "bearish", ... },
  "summary": { "verdict": "bullish", "bullish_count": 7, "bearish_count": 4, "neutral_count": 1 }
}
```

### 文本模式

结构化的中文分析报告，包含所有指标数值和多空信号汇总。

## 依赖

- Python 3.7+
- pandas
- numpy

```bash
pip install pandas numpy
```

## 注意事项

- 所有指标基于用户提供的历史数据离线计算，不联网获取行情
- 技术指标需要一定数量的历史数据才能计算（如 SMA60 需要至少 60 条数据）
- 数据不足时对应指标显示为 `null`/`N/A`，不影响其他指标计算
- 信号判定仅供参考，不构成投资建议

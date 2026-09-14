---
name: stock-signal-analyzer
description: "Analyzes OHLCV data to compute 15+ technical indicators (including MA, MACD, RSI, Bollinger Bands, KDJ) and generates a bullish/bearish signal summary with an overall assessment. Triggered when users request technical analysis, ask to calculate indicators like MACD or RSI, mention candlestick analysis, or discuss signals from moving average crossovers, Bollinger Band breakouts, or RSI overbought/oversold levels."
license: MIT
---

# OHLCV Technical Indicator Analysis Tool (Stock Signal Analyzer)

Computes **15+ technical indicators** from OHLCV data and generates a **bullish/bearish signal summary** with an overall assessment. Simply provide a CSV file containing OHLCV columns to get a complete technical analysis report.

## Quick Start

```bash
python3 scripts/compute_indicators.py data.csv
```

Output as a text report:

```bash
python3 scripts/compute_indicators.py data.csv --format text
```

Output indicator data for the last 5 rows:

```bash
python3 scripts/compute_indicators.py data.csv --last-n 5
```

Save results to a file:

```bash
python3 scripts/compute_indicators.py data.csv -o result.json
```

## Input Data Format

The CSV file must contain the following columns (column names are case-insensitive and common aliases are supported):

| Column | Aliases | Description |
|--------|---------|-------------|
| `Open` | `o` | Opening price |
| `High` | `h` | Highest price |
| `Low` | `l` | Lowest price |
| `Close` | `c`, `adj close` | Closing price |
| `Volume` | `vol`, `v` | Trading volume |
| `Date` | `datetime`, `time` | Date (optional) |

Example CSV:

```csv
Date,Open,High,Low,Close,Volume
2025-01-02,100.0,105.0,99.0,103.5,1500000
2025-01-03,103.5,108.0,102.0,106.0,1800000
...
```

## Technical Indicators (17 Groups)

### Moving Averages (6 items)
- SMA(5), SMA(10), SMA(20), SMA(60) — Simple Moving Averages
- EMA(12), EMA(26) — Exponential Moving Averages

### MACD (3 items)
- MACD Line (EMA12 − EMA26)
- Signal Line (9-day EMA of MACD)
- Histogram (MACD − Signal)

### RSI (1 item)
- RSI(14) — 14-day Relative Strength Index

### Bollinger Bands (3 items)
- Upper Band (Middle + 2σ)
- Middle Band (SMA20)
- Lower Band (Middle − 2σ)

### KDJ (3 items)
- K value, D value, J value (9,3,3 parameters)

### Volatility & Trend
- ATR(14) — Average True Range
- ADX(14) — Average Directional Index
- +DI / −DI — Directional Movement Indicators

### Volume-Price Indicators
- OBV — On-Balance Volume
- VWAP — Volume-Weighted Average Price
- MFI(14) — Money Flow Index

### Momentum Indicators
- CCI(20) — Commodity Channel Index
- Williams %R(14) — Williams Percent Range
- ROC(12) — Rate of Change
- TRIX — Triple Exponential Moving Average

## Signal Rules

| Indicator | Bullish Signal | Bearish Signal |
|-----------|---------------|----------------|
| MA Cross | SMA5 > SMA20 | SMA5 < SMA20 |
| MACD | Histogram > 0 | Histogram < 0 |
| RSI | RSI < 30 (oversold) | RSI > 70 (overbought) |
| Bollinger Bands | Price < Lower Band | Price > Upper Band |
| KDJ | J < 20 or K > D | J > 80 or K < D |
| CCI | CCI < −100 | CCI > 100 |
| Williams %R | %R < −80 | %R > −20 |
| ADX/DMI | ADX > 25 and +DI > −DI | ADX > 25 and −DI > +DI |
| ROC | ROC > 0 | ROC < 0 |
| MFI | MFI < 20 | MFI > 80 |
| OBV | 5-day uptrend | 5-day downtrend |
| TRIX | TRIX > 0 | TRIX < 0 |

The overall assessment is based on the proportion of bullish vs. bearish signals.

## Output Formats

### JSON Mode (default)

```json
{
  "metadata": { "input_file": "...", "total_rows": 100, "indicators_computed": 27 },
  "indicators": [ { "date": "...", "close": 103.5, "SMA_5": 102.1, ... } ],
  "signals": { "MA_Cross": "bullish", "MACD": "bearish", ... },
  "summary": { "verdict": "bullish", "bullish_count": 7, "bearish_count": 4, "neutral_count": 1 }
}
```

### Text Mode

A structured analysis report containing all indicator values and a bullish/bearish signal summary.

## Dependencies

- Python 3.7+
- pandas
- numpy

```bash
pip install pandas numpy
```

## Notes

- All indicators are computed offline from user-provided historical data — no live market data is fetched
- Technical indicators require a minimum amount of historical data to compute (e.g., SMA60 needs at least 60 data points)
- When insufficient data is available, the corresponding indicator displays `null`/`N/A` without affecting other indicators
- Signal assessments are for reference only and do not constitute investment advice

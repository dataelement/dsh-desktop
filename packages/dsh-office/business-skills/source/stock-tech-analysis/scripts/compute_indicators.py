#!/usr/bin/env python3
"""OHLCV Technical Indicator Toolkit — compute 15+ indicators and signal summary."""

import argparse
import json
import math
import os
import sys

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print(
        "Error: pandas and numpy are required.\n"
        "Install with: pip install pandas numpy",
        file=sys.stderr,
    )
    sys.exit(1)


# ---------------------------------------------------------------------------
# Indicator computation
# ---------------------------------------------------------------------------

def sma(series, period):
    return series.rolling(window=period, min_periods=period).mean()


def ema(series, period):
    return series.ewm(span=period, adjust=False).mean()


def compute_macd(close, fast=12, slow=26, signal_period=9):
    ema_fast = ema(close, fast)
    ema_slow = ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal_period)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_rsi(close, period=14):
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100.0 - (100.0 / (1.0 + rs))


def compute_bollinger(close, period=20, num_std=2):
    mid = sma(close, period)
    std = close.rolling(window=period, min_periods=period).std(ddof=0)
    return mid + num_std * std, mid, mid - num_std * std


def compute_kdj(high, low, close, k_period=9, d_smooth=3):
    lowest = low.rolling(window=k_period, min_periods=k_period).min()
    highest = high.rolling(window=k_period, min_periods=k_period).max()
    denom = highest - lowest
    rsv = ((close - lowest) / denom.replace(0, np.nan)) * 100.0
    k = rsv.ewm(com=d_smooth - 1, adjust=False).mean()
    d = k.ewm(com=d_smooth - 1, adjust=False).mean()
    j = 3.0 * k - 2.0 * d
    return k, d, j


def compute_atr(high, low, close, period=14):
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return tr.rolling(window=period, min_periods=period).mean()


def compute_obv(close, volume):
    direction = np.sign(close.diff()).fillna(0)
    return (volume * direction).cumsum()


def compute_vwap(high, low, close, volume):
    tp = (high + low + close) / 3.0
    cum_vol = volume.cumsum().replace(0, np.nan)
    return (tp * volume).cumsum() / cum_vol


def compute_cci(high, low, close, period=20):
    tp = (high + low + close) / 3.0
    tp_sma = tp.rolling(window=period, min_periods=period).mean()
    mad = tp.rolling(window=period, min_periods=period).apply(
        lambda x: np.mean(np.abs(x - x.mean())), raw=True
    )
    denom = (0.015 * mad).replace(0, np.nan)
    return (tp - tp_sma) / denom


def compute_williams_r(high, low, close, period=14):
    hh = high.rolling(window=period, min_periods=period).max()
    ll = low.rolling(window=period, min_periods=period).min()
    denom = (hh - ll).replace(0, np.nan)
    return ((hh - close) / denom) * -100.0


def compute_adx(high, low, close, period=14):
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0.0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0.0)

    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)

    atr_val = tr.rolling(window=period, min_periods=period).mean()
    atr_safe = atr_val.replace(0, np.nan)
    plus_di = 100.0 * plus_dm.rolling(window=period, min_periods=period).mean() / atr_safe
    minus_di = 100.0 * minus_dm.rolling(window=period, min_periods=period).mean() / atr_safe

    di_sum = (plus_di + minus_di).replace(0, np.nan)
    dx = 100.0 * (plus_di - minus_di).abs() / di_sum
    adx_val = dx.rolling(window=period, min_periods=period).mean()
    return adx_val, plus_di, minus_di


def compute_roc(close, period=12):
    prev = close.shift(period).replace(0, np.nan)
    return (close - close.shift(period)) / prev * 100.0


def compute_mfi(high, low, close, volume, period=14):
    tp = (high + low + close) / 3.0
    mf = tp * volume
    tp_diff = tp.diff()
    pos_mf = mf.where(tp_diff > 0, 0.0).rolling(window=period, min_periods=period).sum()
    neg_mf = mf.where(tp_diff < 0, 0.0).rolling(window=period, min_periods=period).sum()
    neg_safe = neg_mf.replace(0, np.nan)
    return 100.0 - (100.0 / (1.0 + pos_mf / neg_safe))


def compute_trix(close, period=12):
    e1 = ema(close, period)
    e2 = ema(e1, period)
    e3 = ema(e2, period)
    prev = e3.shift(1).replace(0, np.nan)
    return (e3 - e3.shift(1)) / prev * 100.0


# ---------------------------------------------------------------------------
# Signal generation
# ---------------------------------------------------------------------------

def _safe(val):
    if val is None:
        return False
    try:
        return not math.isnan(val)
    except (TypeError, ValueError):
        return False


def generate_signals(df, row):
    signals = {}

    if _safe(row.get("SMA_5")) and _safe(row.get("SMA_20")):
        signals["MA_Cross"] = "bullish" if row["SMA_5"] > row["SMA_20"] else "bearish"

    if _safe(row.get("MACD_Histogram")):
        signals["MACD"] = "bullish" if row["MACD_Histogram"] > 0 else "bearish"

    if _safe(row.get("RSI_14")):
        v = row["RSI_14"]
        signals["RSI"] = "bullish" if v < 30 else ("bearish" if v > 70 else "neutral")

    if _safe(row.get("BB_Upper")) and _safe(row.get("BB_Lower")):
        c = row["Close"]
        if c < row["BB_Lower"]:
            signals["Bollinger"] = "bullish"
        elif c > row["BB_Upper"]:
            signals["Bollinger"] = "bearish"
        else:
            signals["Bollinger"] = "neutral"

    if _safe(row.get("KDJ_J")) and _safe(row.get("KDJ_K")) and _safe(row.get("KDJ_D")):
        if row["KDJ_J"] < 20:
            signals["KDJ"] = "bullish"
        elif row["KDJ_J"] > 80:
            signals["KDJ"] = "bearish"
        elif row["KDJ_K"] > row["KDJ_D"]:
            signals["KDJ"] = "bullish"
        else:
            signals["KDJ"] = "bearish"

    if _safe(row.get("CCI_20")):
        v = row["CCI_20"]
        signals["CCI"] = "bullish" if v < -100 else ("bearish" if v > 100 else "neutral")

    if _safe(row.get("Williams_R")):
        v = row["Williams_R"]
        signals["Williams_R"] = "bullish" if v < -80 else ("bearish" if v > -20 else "neutral")

    if _safe(row.get("ADX")) and _safe(row.get("Plus_DI")) and _safe(row.get("Minus_DI")):
        if row["ADX"] > 25:
            signals["ADX_DMI"] = "bullish" if row["Plus_DI"] > row["Minus_DI"] else "bearish"
        else:
            signals["ADX_DMI"] = "neutral"

    if _safe(row.get("ROC_12")):
        signals["ROC"] = "bullish" if row["ROC_12"] > 0 else "bearish"

    if _safe(row.get("MFI_14")):
        v = row["MFI_14"]
        signals["MFI"] = "bullish" if v < 20 else ("bearish" if v > 80 else "neutral")

    if len(df) >= 5 and _safe(row.get("OBV")):
        obv_prev = df["OBV"].iloc[-5]
        if _safe(obv_prev):
            signals["OBV"] = "bullish" if row["OBV"] > obv_prev else "bearish"

    if _safe(row.get("TRIX")):
        signals["TRIX"] = "bullish" if row["TRIX"] > 0 else "bearish"

    return signals


def summarize_signals(signals):
    total = len(signals)
    if total == 0:
        return {
            "verdict": "insufficient_data",
            "bullish_count": 0,
            "bearish_count": 0,
            "neutral_count": 0,
            "total_indicators": 0,
            "bullish_pct": 0.0,
            "bearish_pct": 0.0,
        }
    bullish = sum(1 for s in signals.values() if s == "bullish")
    bearish = sum(1 for s in signals.values() if s == "bearish")
    neutral = total - bullish - bearish

    if bullish > bearish:
        verdict = "bullish"
    elif bearish > bullish:
        verdict = "bearish"
    else:
        verdict = "neutral"

    return {
        "verdict": verdict,
        "bullish_count": bullish,
        "bearish_count": bearish,
        "neutral_count": neutral,
        "total_indicators": total,
        "bullish_pct": round(bullish / total * 100, 1),
        "bearish_pct": round(bearish / total * 100, 1),
    }


# ---------------------------------------------------------------------------
# Column normalisation
# ---------------------------------------------------------------------------

_COL_ALIASES = {
    "open": "Open", "o": "Open",
    "high": "High", "h": "High",
    "low": "Low", "l": "Low",
    "close": "Close", "c": "Close", "adj close": "Close", "adj_close": "Close",
    "volume": "Volume", "vol": "Volume", "v": "Volume",
    "date": "Date", "datetime": "Date", "time": "Date", "timestamp": "Date",
}


def normalise_columns(df):
    mapping = {}
    for col in df.columns:
        key = col.strip().lower()
        if key in _COL_ALIASES:
            mapping[col] = _COL_ALIASES[key]
    return df.rename(columns=mapping)


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _fmt(val, decimals=4):
    if val is None:
        return "N/A"
    try:
        if math.isnan(val):
            return "N/A"
    except (TypeError, ValueError):
        return str(val)
    return f"{val:.{decimals}f}"


def _json_safe(val, decimals=4):
    if val is None:
        return None
    try:
        if math.isnan(val):
            return None
    except (TypeError, ValueError):
        return val
    return round(float(val), decimals)


INDICATOR_COLS = [
    "SMA_5", "SMA_10", "SMA_20", "SMA_60",
    "EMA_12", "EMA_26",
    "MACD", "MACD_Signal", "MACD_Histogram",
    "RSI_14",
    "BB_Upper", "BB_Middle", "BB_Lower",
    "KDJ_K", "KDJ_D", "KDJ_J",
    "ATR_14",
    "OBV", "VWAP",
    "CCI_20", "Williams_R",
    "ADX", "Plus_DI", "Minus_DI",
    "ROC_12", "MFI_14", "TRIX",
]

_SIGNAL_LABEL = {"bullish": "做多 (Bullish)", "bearish": "做空 (Bearish)", "neutral": "中性 (Neutral)"}
_VERDICT_LABEL = {"bullish": "偏多 (BULLISH)", "bearish": "偏空 (BEARISH)", "neutral": "中性 (NEUTRAL)", "insufficient_data": "数据不足"}


def format_text(df, signals, summary, input_file):
    row = df.iloc[-1]
    lines = [
        "=" * 60,
        "  OHLCV 技术指标分析报告",
        "=" * 60,
        f"数据文件: {input_file}",
        f"数据行数: {len(df)}",
        f"计算指标: {len(INDICATOR_COLS)} 项",
        "",
    ]
    if "Date" in df.columns:
        lines.append(f"最新日期: {row.get('Date', 'N/A')}")
    lines += [
        f"最新收盘: {_fmt(row['Close'])}",
        "",
        "--- 均线指标 ---",
    ]
    for p in [5, 10, 20, 60]:
        lines.append(f"  SMA({p}):  {_fmt(row.get(f'SMA_{p}'))}")
    for p in [12, 26]:
        lines.append(f"  EMA({p}): {_fmt(row.get(f'EMA_{p}'))}")

    lines += [
        "",
        "--- MACD ---",
        f"  MACD:      {_fmt(row.get('MACD'))}",
        f"  Signal:    {_fmt(row.get('MACD_Signal'))}",
        f"  Histogram: {_fmt(row.get('MACD_Histogram'))}",
        "",
        "--- RSI ---",
        f"  RSI(14): {_fmt(row.get('RSI_14'))}",
        "",
        "--- 布林带 (Bollinger Bands) ---",
        f"  上轨: {_fmt(row.get('BB_Upper'))}",
        f"  中轨: {_fmt(row.get('BB_Middle'))}",
        f"  下轨: {_fmt(row.get('BB_Lower'))}",
        "",
        "--- KDJ ---",
        f"  K: {_fmt(row.get('KDJ_K'))}",
        f"  D: {_fmt(row.get('KDJ_D'))}",
        f"  J: {_fmt(row.get('KDJ_J'))}",
        "",
        "--- 波动率 & 趋势 ---",
        f"  ATR(14): {_fmt(row.get('ATR_14'))}",
        f"  ADX:     {_fmt(row.get('ADX'))}",
        f"  +DI:     {_fmt(row.get('Plus_DI'))}",
        f"  -DI:     {_fmt(row.get('Minus_DI'))}",
        "",
        "--- 量价指标 ---",
        f"  OBV:     {_fmt(row.get('OBV'), 0)}",
        f"  VWAP:    {_fmt(row.get('VWAP'))}",
        f"  MFI(14): {_fmt(row.get('MFI_14'))}",
        "",
        "--- 动量指标 ---",
        f"  CCI(20):      {_fmt(row.get('CCI_20'))}",
        f"  Williams %R:  {_fmt(row.get('Williams_R'))}",
        f"  ROC(12):      {_fmt(row.get('ROC_12'))}",
        f"  TRIX:         {_fmt(row.get('TRIX'), 6)}",
        "",
        "=" * 60,
        "  多空信号汇总",
        "=" * 60,
    ]

    for ind, sig in signals.items():
        lines.append(f"  {ind:15s} {_SIGNAL_LABEL.get(sig, sig)}")

    lines += [
        "",
        f"综合研判: {_VERDICT_LABEL.get(summary['verdict'], summary['verdict'])}",
        f"  做多: {summary['bullish_count']}/{summary['total_indicators']} ({summary['bullish_pct']}%)",
        f"  做空: {summary['bearish_count']}/{summary['total_indicators']} ({summary['bearish_pct']}%)",
        f"  中性: {summary['neutral_count']}/{summary['total_indicators']}",
        "=" * 60,
    ]
    return "\n".join(lines)


def format_json(df, signals, summary, input_file, last_n):
    rows = df.tail(last_n)
    indicator_rows = []
    for _, row in rows.iterrows():
        entry = {}
        if "Date" in df.columns:
            entry["date"] = str(row.get("Date", ""))
        entry["close"] = _json_safe(row["Close"])
        for col in INDICATOR_COLS:
            entry[col] = _json_safe(row.get(col))
        indicator_rows.append(entry)

    result = {
        "metadata": {
            "input_file": input_file,
            "total_rows": len(df),
            "output_rows": min(last_n, len(df)),
            "indicators_computed": len(INDICATOR_COLS),
        },
        "indicators": indicator_rows,
        "signals": signals,
        "summary": summary,
    }
    return json.dumps(result, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Compute 15+ technical indicators from OHLCV CSV data and generate signal summary.",
    )
    parser.add_argument("input_csv", help="Path to OHLCV CSV file")
    parser.add_argument("-o", "--output", help="Output file path (default: stdout)")
    parser.add_argument(
        "-f", "--format", choices=["json", "text"], default="json",
        help="Output format (default: json)",
    )
    parser.add_argument(
        "--last-n", type=int, default=1,
        help="Number of recent rows to include in output (default: 1)",
    )
    args = parser.parse_args()

    input_path = os.path.expanduser(args.input_csv)
    if not os.path.isfile(input_path):
        print(f"Error: file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)
    df = normalise_columns(df)

    required = ["Open", "High", "Low", "Close", "Volume"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"Error: missing required columns: {missing}", file=sys.stderr)
        print(f"Available columns: {list(df.columns)}", file=sys.stderr)
        sys.exit(1)

    for col in required:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=required)
    if len(df) < 2:
        print("Error: need at least 2 valid data rows", file=sys.stderr)
        sys.exit(1)

    df = df.reset_index(drop=True)

    # --- compute all indicators ---
    for p in [5, 10, 20, 60]:
        df[f"SMA_{p}"] = sma(df["Close"], p)
    for p in [12, 26]:
        df[f"EMA_{p}"] = ema(df["Close"], p)

    macd_l, sig_l, hist_l = compute_macd(df["Close"])
    df["MACD"], df["MACD_Signal"], df["MACD_Histogram"] = macd_l, sig_l, hist_l

    df["RSI_14"] = compute_rsi(df["Close"])

    bb_u, bb_m, bb_l = compute_bollinger(df["Close"])
    df["BB_Upper"], df["BB_Middle"], df["BB_Lower"] = bb_u, bb_m, bb_l

    k, d, j = compute_kdj(df["High"], df["Low"], df["Close"])
    df["KDJ_K"], df["KDJ_D"], df["KDJ_J"] = k, d, j

    df["ATR_14"] = compute_atr(df["High"], df["Low"], df["Close"])
    df["OBV"] = compute_obv(df["Close"], df["Volume"])
    df["VWAP"] = compute_vwap(df["High"], df["Low"], df["Close"], df["Volume"])
    df["CCI_20"] = compute_cci(df["High"], df["Low"], df["Close"])
    df["Williams_R"] = compute_williams_r(df["High"], df["Low"], df["Close"])

    adx_v, pdi, mdi = compute_adx(df["High"], df["Low"], df["Close"])
    df["ADX"], df["Plus_DI"], df["Minus_DI"] = adx_v, pdi, mdi

    df["ROC_12"] = compute_roc(df["Close"])
    df["MFI_14"] = compute_mfi(df["High"], df["Low"], df["Close"], df["Volume"])
    df["TRIX"] = compute_trix(df["Close"])

    # --- signals ---
    latest = df.iloc[-1].to_dict()
    signals = generate_signals(df, latest)
    summary = summarize_signals(signals)

    # --- output ---
    if args.format == "text":
        output = format_text(df, signals, summary, args.input_csv)
    else:
        output = format_json(df, signals, summary, args.input_csv, args.last_n)

    if args.output:
        out_path = os.path.expanduser(args.output)
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(output)
        print(f"Results written to: {out_path}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()

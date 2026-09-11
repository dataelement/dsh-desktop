---
name: correlation-auditor
description: "Analyzes correlation matrices (Pearson/Spearman), computes partial correlations to control for confounding variables, and flags potential spurious correlations in your data. Triggered when users ask about relationships between variables, need correlation matrices, or mention Pearson/Spearman coefficients, partial correlation, confounding factors, or spurious correlations."
license: MIT
---

# correlation-auditor

Correlation analysis toolkit — computes Pearson/Spearman correlation matrices and partial correlation matrices from tabular data, and automatically flags suspected spurious correlations caused by confounding variables.

## Capabilities

| Feature | Description |
|---------|-------------|
| Pearson Correlation Matrix | Linear correlation coefficients + p-values; suitable for continuous, approximately normal variables |
| Spearman Correlation Matrix | Rank correlation coefficients + p-values; suitable for nonlinear monotonic relationships or ordinal variables |
| Partial Correlation Matrix | Net correlations after controlling for all other variables (precision matrix method); reveals direct associations between variables |
| Spurious Correlation Detection | Automatically compares bivariate correlations with partial correlations and flags falsely significant correlations driven by confounders |
| Plain-Language Interpretation | Provides a readable summary of correlation strength, significance, and partial-correlation changes for each variable pair |

## Quick Start

```bash
# Analyze correlations across all numeric columns
python3 scripts/correlation_explorer.py data.csv

# Analyze only specific columns
python3 scripts/correlation_explorer.py data.csv -f "age,income,spending,score"

# Compute Pearson only
python3 scripts/correlation_explorer.py data.csv -m pearson

# Save results to JSON
python3 scripts/correlation_explorer.py data.csv -o result.json
```

## Detailed Usage

### Basic Invocation

```bash
python3 scripts/correlation_explorer.py <data-file> [options]
```

### Choosing the Correlation Method

```bash
# Compute both Pearson and Spearman (default)
python3 scripts/correlation_explorer.py data.csv -m all

# Pearson only
python3 scripts/correlation_explorer.py data.csv -m pearson

# Spearman only
python3 scripts/correlation_explorer.py data.csv -m spearman
```

### Tuning Spurious-Correlation Detection Sensitivity

```bash
# Stricter: alert when the coefficient drops by 30%
python3 scripts/correlation_explorer.py data.csv -d 0.3

# More lenient: alert only when the coefficient drops by 70%
python3 scripts/correlation_explorer.py data.csv -d 0.7

# Use a 0.01 significance level
python3 scripts/correlation_explorer.py data.csv -a 0.01
```

## Parameters

| Parameter | Short | Required | Default | Description |
|-----------|-------|----------|---------|-------------|
| `input` | — | Yes | — | Input file path (CSV/TSV/Excel/JSON) |
| `--features` | `-f` | No | All numeric columns | Column names to analyze, comma-separated |
| `--method` | `-m` | No | `all` | Correlation method: `all` / `pearson` / `spearman` |
| `--alpha` | `-a` | No | `0.05` | Significance level |
| `--drop-threshold` | `-d` | No | `0.5` | Drop threshold for spurious-correlation detection (0–1; default 50%) |
| `--output` | `-o` | No | stdout | Output JSON file path (prints to stdout if omitted) |

## Output Structure (JSON)

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
  "spearman": { "..." : "same structure as pearson" },
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
      "reasons": ["partial correlation not significant", "coefficient dropped by 87.7%"]
    }
  ],
  "interpretation": {
    "overview": ["Analyzed correlations among 4 variables..."],
    "strongest_pairs": ["income <-> spending: r = 0.82 (very strong positive)"],
    "partial_correlation_insights": ["age <-> spending: weakened by 87.7% after controlling for other variables"],
    "spurious_correlation_check": ["Found 1 suspected spurious correlation pair..."]
  }
}
```

## Key Concepts

### Partial Correlation vs. Bivariate Correlation
- **Bivariate correlation** (Pearson/Spearman): The overall association between two variables, which may be inflated by the influence of a third variable
- **Partial correlation**: The "net" association between two variables after controlling for all others
- If the partial correlation is substantially smaller than the bivariate correlation, the observed association is largely mediated or confounded by other variables

### Spurious Correlation
Two variables may appear correlated only because both are influenced by a shared confounding variable. This tool automatically identifies such cases by comparing bivariate and partial correlations.

## Dependencies

- Python 3.8+
- pandas
- numpy
- scipy

```bash
pip install pandas numpy scipy
```

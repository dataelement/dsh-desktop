---
name: regression-modeler
description: "Run regression analysis (OLS or logistic) on uploaded CSV/Excel data, generating coefficients, R², p-values, VIF, and plain-language interpretation. Triggered by requests for regression modeling, fitting data, testing significance, checking multicollinearity, or keywords like OLS, logit, coefficient, p-value, or R-squared."
license: MIT
---

# regression-modeler

Automated regression modeling tool — performs linear regression (OLS) or logistic regression (Logit) on tabular data, producing comprehensive statistical results with plain-language interpretation.

## Capabilities

| Feature | Description |
|---------|-------------|
| Linear Regression | OLS with coefficients, R², adjusted R², F-test, AIC/BIC, Durbin-Watson |
| Logistic Regression | Logit with coefficients, Odds Ratio, Pseudo R², likelihood ratio test |
| Multicollinearity Detection | VIF values for each predictor with warning levels |
| Plain-Language Interpretation | Clear explanations of what each metric and coefficient means |
| Auto Detection | Automatically switches to logistic regression when the target is binary (0/1) |

## Quick Start

```bash
# Linear regression: predict price using all numeric columns as predictors
python3 scripts/regression_analyzer.py data.csv --target price

# Logistic regression: predict churn (0/1) with specified features
python3 scripts/regression_analyzer.py users.csv --target churn --features "age,income,tenure"

# Save results to JSON
python3 scripts/regression_analyzer.py data.csv --target sales --output result.json
```

## Detailed Usage

### Basic Invocation

```bash
python3 scripts/regression_analyzer.py <data_file> --target <target_column> [options]
```

### Specifying Regression Type

```bash
# Force linear regression
python3 scripts/regression_analyzer.py data.csv -t y --type linear

# Force logistic regression
python3 scripts/regression_analyzer.py data.csv -t label --type logistic

# Auto-detect (default)
python3 scripts/regression_analyzer.py data.csv -t y --type auto
```

### Selecting Feature Columns

```bash
# Manually specify (comma-separated)
python3 scripts/regression_analyzer.py data.csv -t price -f "sqft,bedrooms,bathrooms"

# Omit to automatically use all numeric columns
python3 scripts/regression_analyzer.py data.csv -t price
```

## Parameters

| Parameter | Short | Required | Default | Description |
|-----------|-------|----------|---------|-------------|
| `input` | — | Yes | — | Input file path (CSV/TSV/Excel/JSON) |
| `--target` | `-t` | Yes | — | Target variable (dependent variable) column name |
| `--features` | `-f` | No | All numeric columns | Predictor column names, comma-separated |
| `--type` | `-T` | No | `auto` | Regression type: `linear` / `logistic` / `auto` |
| `--output` | `-o` | No | stdout | Output JSON file path |
| `--no-const` | — | No | `false` | Do not add an intercept term |
| `--keep-na` | — | No | `false` | Keep rows with missing values (for debugging) |

## Output Structure (JSON)

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
    "model_summary": ["R² = 0.8523 (good model fit...)"],
    "variable_analysis": ["sqft: coefficient = 135.42... positive effect..."]
  }
}
```

## Dependencies

- Python 3.8+
- pandas
- numpy
- statsmodels
- scipy

```bash
pip install pandas numpy statsmodels scipy
```

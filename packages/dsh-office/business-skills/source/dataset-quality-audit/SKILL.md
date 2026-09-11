---
name: dataset-quality-audit
description: "Run comprehensive quality checks on tabular data (CSV/Excel/TSV/JSON), detecting missing values, duplicates, outliers, format issues, and type inconsistencies to produce an overall score, grade, and actionable suggestions. Triggered when users ask to check data quality, find missing or duplicate values, detect outliers, validate formats, profile data, or clean data."
license: MIT
---

# dataset-quality-audit

A data quality auditing tool that runs 12-dimension quality checks on tabular data, producing per-dimension scores (0–100), an overall grade, and actionable fix suggestions.

## Capabilities

| Dimension | Description |
|-----------|-------------|
| Missing Values | Count and percentage of null/NaN values per column |
| Duplicate Rows | Number and percentage of fully duplicated rows |
| Type Consistency | Mixed types within a single column (e.g., numbers mixed with text) |
| Value Range / Outliers | Outlier detection using the IQR method |
| Format Compliance | Consistency of date, email, phone number, and other formatted fields |
| Uniqueness Constraints | Whether ID-type columns contain duplicates |
| Whitespace Issues | Leading/trailing spaces, empty strings, whitespace-only values |
| Constant Columns | Columns with only a single unique value (zero information) |
| Distribution Skewness | Whether numeric columns have excessive skewness |
| Column Naming | Spaces, special characters, or inconsistent casing in column names |
| Cardinality Anomalies | Unusually high or low number of unique values |
| Cross-Column Consistency | Logical checks across columns (e.g., start date before end date) |

## Quick Start

```bash
# Basic quality check
python3 scripts/data_quality_checker.py data.csv

# Save report as JSON
python3 scripts/data_quality_checker.py data.csv --output report.json

# Specify ID columns (for uniqueness checks)
python3 scripts/data_quality_checker.py users.csv --id-columns "user_id,email"

# Specify date columns (for format checks)
python3 scripts/data_quality_checker.py orders.csv --date-columns "created_at,updated_at"
```

## Detailed Usage

### Basic Invocation

```bash
python3 scripts/data_quality_checker.py <data-file> [options]
```

### Parameters

| Parameter | Short | Required | Default | Description |
|-----------|-------|----------|---------|-------------|
| `input` | — | Yes | — | Path to input file (CSV/TSV/Excel/JSON) |
| `--output` | `-o` | No | stdout | Path for the JSON report output |
| `--id-columns` | `-id` | No | Auto-detect | Comma-separated column names that should be unique |
| `--date-columns` | `-dc` | No | Auto-detect | Comma-separated column names containing dates |
| `--sample` | `-s` | No | All rows | Number of rows to sample (useful for large files) |
| `--encoding` | `-e` | No | utf-8 | File encoding |

## Output Format (JSON)

```json
{
  "file": "data.csv",
  "rows": 10000,
  "columns": 15,
  "overall_score": 78.5,
  "grade": "B",
  "dimensions": {
    "missing_values": {
      "score": 85.0,
      "issues": [
        {"column": "age", "missing_count": 150, "missing_pct": 1.5, "suggestion": "Fill with median or mode"}
      ]
    },
    "duplicates": {
      "score": 95.0,
      "issues": [...]
    }
  },
  "top_suggestions": [
    "Column 'age' has 1.5% missing values — consider filling with the median",
    "Found 200 fully duplicated rows — consider deduplication"
  ]
}
```

## Grading Scale

| Grade | Score Range | Meaning |
|-------|------------|---------|
| A+ | 95–100 | Excellent quality — ready for use as-is |
| A | 90–95 | Good quality — minor issues only |
| B | 80–90 | Moderate quality — recommended to fix before use |
| C | 60–80 | Poor quality — significant cleaning required |
| D | 40–60 | Very poor quality — many issues need attention |
| F | 0–40 | Essentially unusable — requires re-collection or major cleanup |

## Dependencies

- Python 3.8+
- pandas
- numpy

```bash
pip install pandas numpy
```

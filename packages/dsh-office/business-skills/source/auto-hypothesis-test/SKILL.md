---
name: auto-hypothesis-test
description: "Automatically selects and runs the right statistical test for your data — t-test, ANOVA, chi-square, Mann-Whitney, or others — and provides plain-language interpretations of the results. Triggered when you ask about group comparisons, significance, p-values, hypothesis testing, or mention specific tests like t-test, ANOVA, or chi-square."
license: MIT
---

# auto-hypothesis-test

Automated statistical testing tool — automatically selects the appropriate hypothesis test based on your data characteristics (t-test / chi-square / ANOVA / Mann-Whitney, etc.) and outputs results with plain-language interpretations.

## Capabilities

| Feature | Description |
|---------|-------------|
| Independent samples t-test | 2 groups + normal data, compare means |
| Welch's t-test | 2 groups + normal but unequal variances |
| Mann-Whitney U | 2 groups + non-normal data (nonparametric) |
| One-way ANOVA | 3+ groups + normal data |
| Kruskal-Wallis | 3+ groups + non-normal data (nonparametric) |
| Chi-square independence test | Association between two categorical variables |
| Paired t-test | Before/after comparison (normal) |
| Wilcoxon signed-rank | Before/after comparison (nonparametric) |
| Auto-selection | Automatically chooses based on group count, normality, and data type |
| Plain-language interpretation | Every metric and conclusion explained in everyday language |

## Quick Start

```bash
# Group comparison (auto-selects the test)
python3 scripts/statistical_test_suite.py data.csv --group treatment --value score

# Chi-square test (two categorical variables)
python3 scripts/statistical_test_suite.py survey.csv --group gender --value preference

# Paired test (before/after comparison)
python3 scripts/statistical_test_suite.py experiment.csv --col1 pre_score --col2 post_score --paired

# Force a specific test
python3 scripts/statistical_test_suite.py data.csv --group group --value score --test mann-whitney

# Save results to JSON
python3 scripts/statistical_test_suite.py data.csv -g treatment -v score -o result.json
```

## Detailed Usage

### Mode 1: Group Comparison

Use `--group` to specify the grouping column and `--value` to specify the comparison column. The tool automatically determines which test to use.

```bash
python3 scripts/statistical_test_suite.py <data-file> --group <group-col> --value <value-col> [options]
```

Auto-selection logic:
1. Both columns are categorical → **Chi-square test**
2. 2 groups + data is normal → **Independent samples t-test** (Welch's t if variances are unequal)
3. 2 groups + data is non-normal → **Mann-Whitney U test**
4. 3+ groups + data is normal → **One-way ANOVA**
5. 3+ groups + data is non-normal → **Kruskal-Wallis test**

### Mode 2: Paired Comparison

Use `--col1` and `--col2` to specify the two measurement columns.

```bash
python3 scripts/statistical_test_suite.py <data-file> --col1 <before> --col2 <after> --paired [options]
```

Auto-selection logic:
1. Differences are normal → **Paired t-test**
2. Differences are non-normal → **Wilcoxon signed-rank test**

## Parameters

| Parameter | Short | Required | Default | Description |
|-----------|-------|----------|---------|-------------|
| `input` | — | Yes | — | Input file path (CSV/TSV/Excel/JSON) |
| `--group` | `-g` | Mode 1 | — | Grouping variable column name |
| `--value` | `-v` | Mode 1 | — | Numeric/categorical variable column name |
| `--col1` | — | Mode 2 | — | First variable column for paired test |
| `--col2` | — | Mode 2 | — | Second variable column for paired test |
| `--paired` | — | No | `false` | Enable paired test mode |
| `--test` | `-T` | No | Auto | Force a specific test (see list below) |
| `--alpha` | `-a` | No | `0.05` | Significance level |
| `--output` | `-o` | No | stdout | Path to save result JSON |

### Available Tests (`--test`)

`t-test` / `mann-whitney` / `anova` / `kruskal-wallis` / `chi-square` / `paired-ttest` / `wilcoxon`

## Output Structure (JSON)

```json
{
  "test": "Independent samples t-test",
  "test_id": "independent_ttest",
  "statistic": 2.3456,
  "p_value": 0.0213,
  "effect_size": {"cohens_d": 0.4821},
  "group_stats": {
    "Control": {"n": 30, "mean": 72.5, "std": 8.3},
    "Treatment": {"n": 30, "mean": 78.1, "std": 7.9}
  },
  "normality_check": {"Control": "Shapiro-Wilk W = 0.97, p = 0.52 (normal)", "...": "..."},
  "selection_reason": ["2 groups + approximately normal data → selected independent samples t-test"],
  "alpha": 0.05,
  "interpretation": [
    "Test method: Independent samples t-test",
    "Significance level: α = 0.05",
    "Conclusion: p = 0.0213 < 0.05, the difference is statistically significant.",
    "Effect size: Cohen's d = 0.4821 (medium effect, notable difference)",
    "Plain-language summary: There is a significant difference between 'Control' (mean 72.5) and 'Treatment' (mean 78.1)…"
  ]
}
```

## Dependencies

- Python 3.8+
- pandas
- numpy
- scipy

```bash
pip install pandas numpy scipy
```

---
name: log-error-digest
description: "Analyze log files to troubleshoot errors, identify peak error periods, and produce error clustering, frequency statistics, and time distribution reports. Supports JSON, syslog, and Nginx formats with automatic detection. Use when a user uploads a .log file and asks to analyze errors, find patterns, debug issues, or get distribution stats."
license: MIT
type: tool
tags: [logs, analysis, devops, monitoring]
---

# Log Error Digest

Automated log file analysis that produces error clustering, frequency statistics, and time distribution reports.

## Features

- **Error Clustering**: Groups similar error messages by normalizing dynamic parts (IPs, UUIDs, numbers, etc.) to identify root causes
- **Frequency Statistics**: Counts occurrences by error type, sorted by severity
- **Time Distribution**: Shows error distribution by hour and by date, helping pinpoint peak error periods

## Supported Log Formats

| Format | Description | Auto-detection |
|--------|-------------|----------------|
| JSON | One JSON object per line with `timestamp`/`level`/`message` fields | Starts with `{` |
| syslog | RFC 3164 format, e.g. `Jan  1 12:00:00 host proc[pid]: msg` | Starts with month name |
| Nginx | Access log or error log format | Starts with IP or date/path pattern |

## Usage

```bash
python scripts/analyze_logs.py <log_file_path> [options]
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `log_file` | Path to the log file (required) | - |
| `--format` | Log format: `auto`/`json`/`syslog`/`nginx` | `auto` |
| `--top` | Show Top N error clusters | `20` |
| `--output` | Export results to a JSON file | Terminal output only |
| `--level` | Filter by log level (e.g. `ERROR`, `WARN`) | All levels |
| `--since` | Only analyze logs after this time (ISO format) | No limit |
| `--until` | Only analyze logs before this time (ISO format) | No limit |

### Examples

```bash
# Auto-detect format and analyze the entire log file
python scripts/analyze_logs.py /var/log/app.log

# Specify Nginx format, show only Top 10 errors
python scripts/analyze_logs.py /var/log/nginx/error.log --format nginx --top 10

# Filter ERROR level only, export JSON report
python scripts/analyze_logs.py app.log --level ERROR --output report.json

# Analyze logs within a specific time range
python scripts/analyze_logs.py app.log --since 2024-01-01T00:00:00 --until 2024-01-02T00:00:00
```

## Output

### Terminal Output

```
=======================================================
              Log Analysis Report
=======================================================

📊 Overview
  Detected format: json
  Total lines:     15,234
  Parsed:          15,100 (parse failures: 134)
  Matched entries: 12,800
  Errors:          2,341
  Time range:      2024-01-01 00:03:12 ~ 2024-01-01 23:58:45

🔴 Top Error Clusters (47 total)
  #1   [×523  ] Connection refused to database at 10.0.1.5:5432
       First seen: 2024-01-01T00:15:30  Last seen: 2024-01-01T23:45:12
  #2   [×312  ] Timeout waiting for response from user-service after 30000ms
       First seen: 2024-01-01T02:10:00  Last seen: 2024-01-01T22:30:45
  #3   [×198  ] File not found: /data/uploads/img_99421.png
       First seen: 2024-01-01T08:00:00  Last seen: 2024-01-01T20:15:33
  ...

⏰ Time Distribution (by hour)
  00:00  █████░░░░░░░░░░░░░░░  42
  01:00  ██░░░░░░░░░░░░░░░░░░  18
  ...
  14:00  ████████████████████  523
  ...

📅 Time Distribution (by date)
  2024-01-01  ████████████████████  2,341
```

### JSON Output

Use the `--output` parameter to export a structured JSON report for further processing or integration with monitoring systems.

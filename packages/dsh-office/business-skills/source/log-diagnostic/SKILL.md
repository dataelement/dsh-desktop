---
name: log-diagnostic
description: "分析日志文件的错误模式，支持JSON、syslog、Nginx等常见格式，自动检测并输出错误聚类、频率统计和时间分布报告，用于排查问题、定位高发时段。当用户上传.log文件并要求排查错误、分析错误分布、定位高发时段，或提及错误统计、日志分析等关键词时触发。"
license: MIT
type: tool
tags: [logs, analysis, devops, monitoring]
---

# Log Analyzer

对日志文件进行自动化分析，提供错误聚类、频率统计和时间分布报告。

## 功能

- **错误聚类**：将相似的错误消息归类，消除噪声（IP、UUID、数字等动态部分），识别根本问题
- **频率统计**：按错误类型统计出现次数，按严重程度排序
- **时间分布**：展示错误在各小时和各日期的分布，帮助定位高发时段

## 支持的日志格式

| 格式 | 说明 | 自动检测 |
|------|------|----------|
| JSON | 每行一个 JSON 对象，含 `timestamp`/`level`/`message` 等字段 | 以 `{` 开头 |
| syslog | RFC 3164 格式，如 `Jan  1 12:00:00 host proc[pid]: msg` | 月份名开头 |
| Nginx | access log 或 error log 格式 | IP 开头或日期路径格式 |

## 使用方式

```bash
python scripts/analyze_logs.py <日志文件路径> [选项]
```

### 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `log_file` | 日志文件路径（必填） | - |
| `--format` | 指定日志格式：`auto`/`json`/`syslog`/`nginx` | `auto` |
| `--top` | 显示 Top N 错误聚类 | `20` |
| `--output` | 输出结果到 JSON 文件 | 仅终端输出 |
| `--level` | 过滤日志级别（如 `ERROR`、`WARN`） | 所有级别 |
| `--since` | 只分析此时间之后的日志（ISO 格式） | 不限 |
| `--until` | 只分析此时间之前的日志（ISO 格式） | 不限 |

### 示例

```bash
# 自动检测格式，分析整个日志文件
python scripts/analyze_logs.py /var/log/app.log

# 指定 Nginx 格式，只看 Top 10 错误
python scripts/analyze_logs.py /var/log/nginx/error.log --format nginx --top 10

# 只分析 ERROR 级别，输出 JSON 报告
python scripts/analyze_logs.py app.log --level ERROR --output report.json

# 分析指定时间范围内的日志
python scripts/analyze_logs.py app.log --since 2024-01-01T00:00:00 --until 2024-01-02T00:00:00
```

## 输出说明

### 终端输出

```
=======================================================
              日志分析报告
=======================================================

📊 概览
  检测格式: json
  总行数:   15,234
  已解析:   15,100 (解析失败: 134)
  匹配条目: 12,800
  错误数:   2,341
  时间范围: 2024-01-01 00:03:12 ~ 2024-01-01 23:58:45

🔴 Top 错误聚类 (共 47 类)
  #1   [×523  ] Connection refused to database at 10.0.1.5:5432
       首次: 2024-01-01T00:15:30  末次: 2024-01-01T23:45:12
  #2   [×312  ] Timeout waiting for response from user-service after 30000ms
       首次: 2024-01-01T02:10:00  末次: 2024-01-01T22:30:45
  #3   [×198  ] File not found: /data/uploads/img_99421.png
       首次: 2024-01-01T08:00:00  末次: 2024-01-01T20:15:33
  ...

⏰ 时间分布 (按小时)
  00:00  █████░░░░░░░░░░░░░░░  42
  01:00  ██░░░░░░░░░░░░░░░░░░  18
  ...
  14:00  ████████████████████  523
  ...

📅 时间分布 (按日期)
  2024-01-01  ████████████████████  2,341
```

### JSON 输出

使用 `--output` 参数可导出结构化 JSON 报告，方便后续处理或接入监控系统。

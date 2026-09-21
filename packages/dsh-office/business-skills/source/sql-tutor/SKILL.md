---
name: sql-tutor
description: "帮助用户编写和优化 SQL 查询，包括将自然语言转换为 SQL、提供查询优化建议以及解读 EXPLAIN 执行计划。当用户需要 SQL 相关帮助时触发，例如直接请求“自然语言转SQL”、“帮我优化这条SQL”、“解释一下这个执行计划”，或提及关键词如 NL2SQL、SQL优化、慢查询、索引建议、全表扫描、SQL调优，以及支持 SQLite 和 PostgreSQL 数据库时。"
license: MIT
---

# sql-query-helper

SQL 查询辅助工具 —— 自然语言→SQL 翻译、查询优化分析、EXPLAIN 执行计划解读。

## 能力概览

| 功能 | 说明 |
|------|------|
| Schema 提取 | 提取数据库表结构（列、类型、索引、外键、样本数据），为 NL→SQL 提供上下文 |
| 自然语言→SQL | 结合 Schema 上下文，将自然语言描述翻译为 SQL 查询 |
| 查询优化分析 | 基于 13 条规则检测 SQL 反模式，给出优化建议 |
| EXPLAIN 解读 | 执行 EXPLAIN 并解读查询计划，识别全表扫描、索引缺失等问题 |

## 工作流程

### 自然语言→SQL

1. 使用 `schema` 命令提取数据库表结构
2. 将 Schema 作为上下文，将用户的自然语言需求翻译为 SQL
3. 使用 `optimize` 命令检查生成的 SQL 是否有优化空间
4. 使用 `explain` 命令验证查询执行计划

```bash
# 步骤1：提取 Schema（紧凑模式，适合作为 LLM 上下文）
python3 scripts/sql_query_helper.py --db-path data.db schema --compact

# 步骤2：分析 SQL 优化建议
python3 scripts/sql_query_helper.py optimize "SELECT * FROM orders WHERE user_id = 100"

# 步骤3：查看 EXPLAIN 执行计划
python3 scripts/sql_query_helper.py --db-path data.db explain "SELECT * FROM orders WHERE user_id = 100"
```

## Quick Start

### Schema 提取

```bash
# 提取完整 Schema（JSON 格式，含样本数据）
python3 scripts/sql_query_helper.py --db-path data.db schema

# 紧凑模式（纯文本，适合嵌入 prompt）
python3 scripts/sql_query_helper.py --db-path data.db schema --compact

# 不采样数据
python3 scripts/sql_query_helper.py --db-path data.db schema --sample-rows 0

# PostgreSQL
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb user=reader" schema --compact
```

### 查询优化分析

```bash
# 分析 SQL 查询（无需数据库连接，纯规则检测）
python3 scripts/sql_query_helper.py optimize "SELECT * FROM orders o, users u WHERE o.user_id = u.id"

python3 scripts/sql_query_helper.py optimize "SELECT name FROM users WHERE UPPER(email) LIKE '%@GMAIL.COM'"

python3 scripts/sql_query_helper.py optimize "SELECT id, (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count FROM users u"
```

### EXPLAIN 解读

```bash
# SQLite EXPLAIN
python3 scripts/sql_query_helper.py --db-path data.db explain "SELECT * FROM orders WHERE user_id = 100"

# PostgreSQL EXPLAIN
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb" explain "SELECT * FROM orders WHERE user_id = 100"

# PostgreSQL EXPLAIN ANALYZE（实际执行查询，获取真实数据）
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb" explain --analyze "SELECT * FROM orders WHERE user_id = 100"
```

## 详细用法

### 全局参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--db-type` | 否 | sqlite | 数据库类型：sqlite 或 postgres |
| `--db-path` | schema/explain 时（SQLite） | — | SQLite 数据库文件路径 |
| `--dsn` | schema/explain 时（PostgreSQL） | — | PostgreSQL 连接串 |

### 子命令

| 命令 | 需要数据库 | 说明 |
|------|-----------|------|
| `schema` | 是 | 提取数据库表结构 |
| `optimize <sql>` | 否 | SQL 查询优化分析（纯规则检测） |
| `explain <sql>` | 是 | 执行 EXPLAIN 并解读 |

### schema 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--sample-rows, -n` | 3 | 每表采样行数（0 表示不采样） |
| `--compact` | false | 紧凑文本输出（适合嵌入 prompt） |

### explain 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--analyze` | false | 使用 EXPLAIN ANALYZE（仅 PostgreSQL，会实际执行查询） |

## 优化规则清单

`optimize` 命令检测以下 13 类 SQL 反模式：

| 规则 | 严重度 | 说明 |
|------|--------|------|
| avoid-select-star | warning | 避免 SELECT *，显式列出列名 |
| unbounded-query | info | 缺少 WHERE 和 LIMIT |
| leading-wildcard-like | warning | LIKE '%...' 导致索引失效 |
| or-condition | info | OR 条件可能阻止索引使用 |
| not-in-subquery | warning | NOT IN (子查询) 性能差 |
| scalar-subquery | warning | SELECT 中的标量子查询逐行执行 |
| function-on-column | warning | WHERE 中对列使用函数导致索引失效 |
| implicit-join | info | 隐式连接可读性差 |
| distinct-usage | info | DISTINCT 可能掩盖 JOIN 问题 |
| order-without-limit | info | ORDER BY 没有 LIMIT |
| deep-nesting | warning | 多层嵌套子查询 |
| having-without-group | warning | HAVING 没有 GROUP BY |
| not-equal-filter | info | != 条件无法有效使用索引 |

## EXPLAIN 解读项

| 检测项 | 适用数据库 | 说明 |
|--------|-----------|------|
| 全表扫描 | SQLite / PostgreSQL | 检测 Seq Scan / SCAN TABLE |
| 自动临时索引 | SQLite | SQLite 自动创建临时索引，说明缺少永久索引 |
| 覆盖索引 | SQLite / PostgreSQL | 索引包含所有查询列，无需回表 |
| 磁盘排序 | PostgreSQL | 排序溢出到磁盘 |
| 嵌套循环连接 | PostgreSQL | 大表嵌套循环性能差 |
| 行数估计偏差 | PostgreSQL (ANALYZE) | 预估行数与实际行数差距大于 10 倍 |

## 输出示例

### schema --compact

```
-- Database: sqlite
-- users (1500 rows): id INTEGER  PK, name TEXT, email TEXT, age INTEGER, created_at TEXT
--   IDX(unique): idx_users_email on (email)
-- orders (8200 rows): id INTEGER  PK, user_id INTEGER, amount REAL, status TEXT, created_at TEXT
--   FK: user_id -> users.id
--   IDX: idx_orders_user_id on (user_id)
```

### optimize

```json
{
  "sql": "SELECT * FROM orders o, users u WHERE o.user_id = u.id",
  "issues": [
    {
      "severity": "warning",
      "rule": "avoid-select-star",
      "message": "避免 SELECT *：只选择需要的列，减少 I/O 和网络传输",
      "suggestion": "将 SELECT * 改为显式列出需要的列名"
    },
    {
      "severity": "info",
      "rule": "implicit-join",
      "message": "使用了隐式连接（逗号分隔表），可读性差且易出错",
      "suggestion": "改用显式 JOIN ... ON 语法，提高可读性和可维护性"
    }
  ]
}
```

### explain (SQLite)

```json
{
  "db_type": "sqlite",
  "query": "SELECT * FROM orders WHERE user_id = 100",
  "plan": [
    {"id": 2, "parent": 0, "detail": "SEARCH orders USING INDEX idx_orders_user_id (user_id=?)"}
  ],
  "interpretation": [
    {
      "severity": "ok",
      "type": "index-search",
      "detail": "使用索引查找: idx_orders_user_id",
      "suggestion": "索引查找效率良好"
    }
  ]
}
```

## 安全机制

- **只读连接**：SQLite 使用 `?mode=ro`；PostgreSQL 使用 `SET SESSION READ ONLY`
- **SQL 白名单**：仅允许 SELECT / WITH / EXPLAIN 开头
- **危险关键字拦截**：INSERT、UPDATE、DELETE、DROP 等 30+ 关键字被阻止
- **多语句拦截**：禁止分号分隔的多条 SQL
- **标识符转义**：表名使用双引号转义，防止 SQL 注入

## 依赖

- Python 3.8+（`sqlite3` 为内置模块）
- PostgreSQL 支持需安装：`pip install psycopg2-binary`
- `optimize` 命令无需数据库连接，零外部依赖

---
name: sql-insight
description: "Translate natural language to SQL, optimize query performance, and interpret EXPLAIN plans for SQLite and PostgreSQL. Triggered when users ask to convert questions into SQL, improve slow queries, tune indexes, analyze execution plans, or mention keywords like NL2SQL, query tuning, or full table scan."
license: MIT
---

# sql-insight

SQL query assistant — natural language to SQL translation, query optimization analysis, and EXPLAIN plan interpretation.

## Capabilities

| Feature | Description |
|---------|-------------|
| Schema Extraction | Extracts database table structure (columns, types, indexes, foreign keys, sample data) to provide context for NL→SQL |
| Natural Language → SQL | Translates natural language descriptions into SQL queries using schema context |
| Query Optimization Analysis | Detects SQL anti-patterns based on 13 rules and provides optimization suggestions |
| EXPLAIN Interpretation | Runs EXPLAIN and interprets the query plan, identifying full table scans, missing indexes, and more |

## Workflow

### Natural Language → SQL

1. Use the `schema` command to extract the database table structure
2. Use the schema as context to translate the user's natural language request into SQL
3. Use the `optimize` command to check if the generated SQL can be improved
4. Use the `explain` command to verify the query execution plan

```bash
# Step 1: Extract schema (compact mode, suitable for LLM context)
python3 scripts/sql_query_helper.py --db-path data.db schema --compact

# Step 2: Analyze SQL optimization suggestions
python3 scripts/sql_query_helper.py optimize "SELECT * FROM orders WHERE user_id = 100"

# Step 3: View EXPLAIN execution plan
python3 scripts/sql_query_helper.py --db-path data.db explain "SELECT * FROM orders WHERE user_id = 100"
```

## Quick Start

### Schema Extraction

```bash
# Extract full schema (JSON format, with sample data)
python3 scripts/sql_query_helper.py --db-path data.db schema

# Compact mode (plain text, suitable for embedding in prompts)
python3 scripts/sql_query_helper.py --db-path data.db schema --compact

# Skip data sampling
python3 scripts/sql_query_helper.py --db-path data.db schema --sample-rows 0

# PostgreSQL
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb user=reader" schema --compact
```

### Query Optimization Analysis

```bash
# Analyze SQL query (no database connection required, pure rule-based detection)
python3 scripts/sql_query_helper.py optimize "SELECT * FROM orders o, users u WHERE o.user_id = u.id"

python3 scripts/sql_query_helper.py optimize "SELECT name FROM users WHERE UPPER(email) LIKE '%@GMAIL.COM'"

python3 scripts/sql_query_helper.py optimize "SELECT id, (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count FROM users u"
```

### EXPLAIN Interpretation

```bash
# SQLite EXPLAIN
python3 scripts/sql_query_helper.py --db-path data.db explain "SELECT * FROM orders WHERE user_id = 100"

# PostgreSQL EXPLAIN
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb" explain "SELECT * FROM orders WHERE user_id = 100"

# PostgreSQL EXPLAIN ANALYZE (actually executes the query for real-world data)
python3 scripts/sql_query_helper.py --db-type postgres --dsn "host=localhost dbname=mydb" explain --analyze "SELECT * FROM orders WHERE user_id = 100"
```

## Detailed Usage

### Global Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--db-type` | No | sqlite | Database type: sqlite or postgres |
| `--db-path` | For schema/explain (SQLite) | — | SQLite database file path |
| `--dsn` | For schema/explain (PostgreSQL) | — | PostgreSQL connection string |

### Subcommands

| Command | Requires Database | Description |
|---------|-------------------|-------------|
| `schema` | Yes | Extract database table structure |
| `optimize <sql>` | No | SQL query optimization analysis (pure rule-based detection) |
| `explain <sql>` | Yes | Run EXPLAIN and interpret the plan |

### schema Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--sample-rows, -n` | 3 | Number of sample rows per table (0 to skip sampling) |
| `--compact` | false | Compact text output (suitable for embedding in prompts) |

### explain Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--analyze` | false | Use EXPLAIN ANALYZE (PostgreSQL only; actually executes the query) |

## Optimization Rules

The `optimize` command detects the following 13 SQL anti-patterns:

| Rule | Severity | Description |
|------|----------|-------------|
| avoid-select-star | warning | Avoid SELECT *; explicitly list column names |
| unbounded-query | info | Missing WHERE and LIMIT clauses |
| leading-wildcard-like | warning | LIKE '%...' causes index to be bypassed |
| or-condition | info | OR conditions may prevent index usage |
| not-in-subquery | warning | NOT IN (subquery) has poor performance |
| scalar-subquery | warning | Scalar subqueries in SELECT execute row-by-row |
| function-on-column | warning | Functions on columns in WHERE prevent index usage |
| implicit-join | info | Implicit joins (comma-separated tables) are less readable |
| distinct-usage | info | DISTINCT may mask JOIN duplication issues |
| order-without-limit | info | ORDER BY without LIMIT |
| deep-nesting | warning | Deeply nested subqueries |
| having-without-group | warning | HAVING without GROUP BY |
| not-equal-filter | info | != conditions cannot effectively use indexes |

## EXPLAIN Interpretation Items

| Check | Applicable Database | Description |
|-------|---------------------|-------------|
| Full table scan | SQLite / PostgreSQL | Detects Seq Scan / SCAN TABLE |
| Auto temporary index | SQLite | SQLite auto-creates a temporary index, indicating a missing permanent index |
| Covering index | SQLite / PostgreSQL | Index contains all queried columns; no table lookup needed |
| Disk sort | PostgreSQL | Sort operation spills to disk |
| Nested loop join | PostgreSQL | Nested loop joins on large tables have poor performance |
| Row estimate deviation | PostgreSQL (ANALYZE) | Estimated rows differ from actual rows by more than 10x |

## Output Examples

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
      "message": "Avoid SELECT *: only select the columns you need to reduce I/O and network transfer",
      "suggestion": "Replace SELECT * with an explicit list of required column names"
    },
    {
      "severity": "info",
      "rule": "implicit-join",
      "message": "Uses implicit join (comma-separated tables), which is less readable and error-prone",
      "suggestion": "Use explicit JOIN ... ON syntax for better readability and maintainability"
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
      "detail": "Index lookup: idx_orders_user_id",
      "suggestion": "Index lookup is efficient"
    }
  ]
}
```

## Safety Mechanisms

- **Read-only connections**: SQLite uses `?mode=ro`; PostgreSQL uses `SET SESSION READ ONLY`
- **SQL whitelist**: Only allows statements starting with SELECT / WITH / EXPLAIN
- **Dangerous keyword blocking**: INSERT, UPDATE, DELETE, DROP, and 30+ other keywords are blocked
- **Multi-statement blocking**: Semicolon-separated multiple SQL statements are rejected
- **Identifier escaping**: Table names are double-quote escaped to prevent SQL injection

## Dependencies

- Python 3.8+ (`sqlite3` is a built-in module)
- PostgreSQL support requires: `pip install psycopg2-binary`
- The `optimize` command requires no database connection and has zero external dependencies

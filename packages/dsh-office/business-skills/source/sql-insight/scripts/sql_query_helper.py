#!/usr/bin/env python3
"""sql_query_helper.py — SQL 查询辅助工具：Schema 提取 / 查询优化分析 / EXPLAIN 解读"""

import argparse
import json
import re
import sqlite3
import sys
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Dict, List

try:
    import psycopg2
    import psycopg2.extras
    import psycopg2.sql as pgsql

    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


# ─── SQL safety ─────────────────────────────────────────────────────────────

DANGEROUS_KW = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
    r"EXEC|EXECUTE|MERGE|REPLACE|UPSERT|ATTACH|DETACH|COPY|LOAD|"
    r"CALL|SET|LOCK|UNLOCK|RENAME|COMMENT|VACUUM|REINDEX|CLUSTER|"
    r"REFRESH|DISCARD|REASSIGN|SECURITY|OWNER|RULE|TRIGGER|NOTIFY|LISTEN)\b",
    re.IGNORECASE,
)

ALLOWED_START = re.compile(
    r"^\s*(SELECT|WITH|EXPLAIN|PRAGMA|SHOW|DESCRIBE)\b",
    re.IGNORECASE,
)


def _validate_readonly(sql: str):
    stripped = sql.strip().rstrip(";").strip()
    if not stripped:
        raise ValueError("SQL 语句不能为空")
    if not ALLOWED_START.match(stripped):
        raise ValueError("只允许 SELECT / WITH / EXPLAIN 语句")
    clean = re.sub(r"'[^']*'", "''", stripped)
    clean = re.sub(r'"[^"]*"', '""', clean)
    if DANGEROUS_KW.search(clean):
        raise ValueError("检测到写入操作关键字，只允许只读查询")
    if ";" in clean:
        raise ValueError("不允许执行多条 SQL 语句")


def _quote_id(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _json_default(obj):
    if isinstance(obj, (datetime, date, time)):
        return obj.isoformat()
    if isinstance(obj, timedelta):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, bytes):
        return obj.hex()
    if isinstance(obj, memoryview):
        return bytes(obj).hex()
    return str(obj)


# ─── Schema extraction ──────────────────────────────────────────────────────


class SchemaExtractor:
    """Extract database schema for NL→SQL context."""

    def __init__(self, db_type: str, db_path: str = None, dsn: str = None):
        self.db_type = db_type
        if db_type == "sqlite":
            uri = "file:{}?mode=ro".format(db_path)
            self.conn = sqlite3.connect(uri, uri=True)
            self.conn.row_factory = sqlite3.Row
        else:
            if not HAS_PSYCOPG2:
                print(
                    "错误：PostgreSQL 需要安装 psycopg2\n  pip install psycopg2-binary",
                    file=sys.stderr,
                )
                sys.exit(1)
            self.conn = psycopg2.connect(dsn)
            self.conn.set_session(readonly=True, autocommit=True)

    def extract(self, sample_rows: int = 3) -> Dict[str, Any]:
        if self.db_type == "sqlite":
            return self._extract_sqlite(sample_rows)
        return self._extract_postgres(sample_rows)

    # ── SQLite ──

    def _extract_sqlite(self, sample_rows: int) -> Dict[str, Any]:
        tables = []
        cur = self.conn.execute(
            "SELECT name, type FROM sqlite_master "
            "WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        )
        for row in cur:
            tables.append(
                self._sqlite_table_info(row["name"], row["type"], sample_rows)
            )
        return {"db_type": "sqlite", "tables": tables}

    def _sqlite_table_info(
        self, name: str, ttype: str, sample_rows: int
    ) -> Dict[str, Any]:
        qid = _quote_id(name)

        cur = self.conn.execute("PRAGMA table_info({})".format(qid))
        columns = [
            {
                "name": r["name"],
                "type": r["type"] or "TEXT",
                "nullable": not bool(r["notnull"]),
                "primary_key": bool(r["pk"]),
                "default": r["dflt_value"],
            }
            for r in cur
        ]

        cur = self.conn.execute("PRAGMA foreign_key_list({})".format(qid))
        fks = [
            {
                "column": r["from"],
                "references": "{}.{}".format(r["table"], r["to"]),
            }
            for r in cur
        ]

        cur = self.conn.execute("PRAGMA index_list({})".format(qid))
        indexes = []
        for r in cur:
            ic = self.conn.execute(
                "PRAGMA index_info({})".format(_quote_id(r["name"]))
            )
            indexes.append(
                {
                    "name": r["name"],
                    "unique": bool(r["unique"]),
                    "columns": [c["name"] for c in ic],
                }
            )

        cur = self.conn.execute(
            "SELECT COUNT(*) AS cnt FROM {}".format(qid)
        )
        row_count = cur.fetchone()["cnt"]

        samples: List[Dict] = []
        if sample_rows > 0:
            cur = self.conn.execute(
                "SELECT * FROM {} LIMIT ?".format(qid), (sample_rows,)
            )
            samples = [dict(r) for r in cur]

        return {
            "name": name,
            "type": ttype,
            "row_count": row_count,
            "columns": columns,
            "foreign_keys": fks,
            "indexes": indexes,
            "sample_rows": samples,
        }

    # ── PostgreSQL ──

    def _extract_postgres(self, sample_rows: int) -> Dict[str, Any]:
        tables = []
        with self.conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                "SELECT table_name AS name, table_type AS type "
                "FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY table_name"
            )
            for row in cur:
                tables.append(
                    self._pg_table_info(row["name"], row["type"], sample_rows)
                )
        return {"db_type": "postgresql", "tables": tables}

    def _pg_table_info(
        self, name: str, ttype: str, sample_rows: int
    ) -> Dict[str, Any]:
        with self.conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(
                """
                SELECT c.column_name      AS name,
                       c.data_type        AS type,
                       (c.is_nullable = 'YES') AS nullable,
                       (pk.column_name IS NOT NULL) AS primary_key,
                       c.column_default   AS "default"
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema    = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_name   = %s
                      AND tc.table_schema = 'public'
                ) pk ON pk.column_name = c.column_name
                WHERE c.table_name = %s AND c.table_schema = 'public'
                ORDER BY c.ordinal_position
                """,
                (name, name),
            )
            columns = [dict(r) for r in cur]

            cur.execute(
                """
                SELECT kcu.column_name AS "column",
                       ccu.table_name || '.' || ccu.column_name AS references
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema    = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                 AND tc.table_schema    = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_name   = %s
                  AND tc.table_schema = 'public'
                """,
                (name,),
            )
            fks = [dict(r) for r in cur]

            cur.execute(
                """
                SELECT i.relname        AS name,
                       ix.indisunique   AS "unique",
                       array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
                FROM pg_class t
                JOIN pg_index ix     ON t.oid  = ix.indrelid
                JOIN pg_class i      ON i.oid  = ix.indexrelid
                JOIN pg_attribute a  ON a.attrelid = t.oid
                                    AND a.attnum   = ANY(ix.indkey)
                JOIN pg_namespace n  ON n.oid  = t.relnamespace
                WHERE t.relname = %s AND n.nspname = 'public'
                GROUP BY i.relname, ix.indisunique
                """,
                (name,),
            )
            indexes = [dict(r) for r in cur]

            qid = pgsql.Identifier(name)
            cur.execute(
                pgsql.SQL("SELECT COUNT(*) AS cnt FROM {}").format(qid)
            )
            row_count = cur.fetchone()["cnt"]

            samples: List[Dict] = []
            if sample_rows > 0:
                cur.execute(
                    pgsql.SQL("SELECT * FROM {} LIMIT %s").format(qid),
                    (sample_rows,),
                )
                samples = [dict(r) for r in cur]

        return {
            "name": name,
            "type": ttype,
            "row_count": row_count,
            "columns": columns,
            "foreign_keys": fks,
            "indexes": indexes,
            "sample_rows": samples,
        }

    def close(self):
        self.conn.close()


# ─── Query optimizer (rule-based) ───────────────────────────────────────────


class QueryOptimizer:
    """Rule-based SQL optimization suggestions (13 rules)."""

    @staticmethod
    def analyze(sql: str) -> List[Dict[str, str]]:
        issues: List[Dict[str, str]] = []
        sql_upper = sql.upper()
        cleaned = re.sub(r"'[^']*'", "''", sql, flags=re.DOTALL)
        cleaned_upper = cleaned.upper()

        if re.search(r"\bSELECT\s+\*", cleaned_upper):
            issues.append(
                {
                    "severity": "warning",
                    "rule": "avoid-select-star",
                    "message": "避免 SELECT *：只选择需要的列，减少 I/O 和网络传输",
                    "suggestion": "将 SELECT * 改为显式列出需要的列名",
                }
            )

        has_agg = re.search(
            r"\b(COUNT|SUM|AVG|MIN|MAX)\s*\(", cleaned_upper
        )
        if (
            re.search(r"\bSELECT\b", cleaned_upper)
            and not re.search(r"\bWHERE\b", cleaned_upper)
            and not re.search(r"\bLIMIT\b", cleaned_upper)
            and not has_agg
        ):
            issues.append(
                {
                    "severity": "info",
                    "rule": "unbounded-query",
                    "message": "查询没有 WHERE 和 LIMIT 子句，可能返回大量数据",
                    "suggestion": "添加 WHERE 条件过滤数据，或使用 LIMIT 限制返回行数",
                }
            )

        if re.search(r"\bLIKE\s+'%", sql_upper):
            issues.append(
                {
                    "severity": "warning",
                    "rule": "leading-wildcard-like",
                    "message": "LIKE '%...' 前缀通配符会导致索引失效，触发全表扫描",
                    "suggestion": "考虑使用全文索引或反转索引；如果可能，改为 LIKE 'prefix%'",
                }
            )

        if re.search(r"\bWHERE\b.*\bOR\b", cleaned_upper, re.DOTALL):
            issues.append(
                {
                    "severity": "info",
                    "rule": "or-condition",
                    "message": "WHERE 中的 OR 条件可能阻止索引使用",
                    "suggestion": "考虑用 UNION ALL 替代 OR，或使用 IN (...) 替代多个 OR",
                }
            )

        if re.search(
            r"\bNOT\s+IN\s*\(\s*SELECT\b", cleaned_upper, re.DOTALL
        ):
            issues.append(
                {
                    "severity": "warning",
                    "rule": "not-in-subquery",
                    "message": "NOT IN (子查询) 性能较差且对 NULL 值行为不符合直觉",
                    "suggestion": "改用 NOT EXISTS 或 LEFT JOIN ... WHERE ... IS NULL",
                }
            )

        if re.search(
            r"\bSELECT\b[^)]*\(\s*SELECT\b", cleaned_upper, re.DOTALL
        ):
            issues.append(
                {
                    "severity": "warning",
                    "rule": "scalar-subquery",
                    "message": "SELECT 列表中的标量子查询会对每一行执行，性能可能很差",
                    "suggestion": "改用 JOIN 或 CTE (WITH 子句) 来避免逐行执行子查询",
                }
            )

        where_match = re.search(r"\bWHERE\b(.*)", cleaned_upper, re.DOTALL)
        if where_match:
            func_on_col = re.search(
                r"\b(?:UPPER|LOWER|TRIM|SUBSTR|SUBSTRING|"
                r"DATE|YEAR|MONTH|CAST|CONVERT|COALESCE)\s*\(\s*[A-Z_]",
                where_match.group(1),
            )
            if func_on_col:
                issues.append(
                    {
                        "severity": "warning",
                        "rule": "function-on-column",
                        "message": "在 WHERE 条件中对列使用函数会导致索引失效",
                        "suggestion": "使用函数索引（表达式索引），或调整查询逻辑避免对列施加函数",
                    }
                )

        from_match = re.search(
            r"\bFROM\b(.*?)(?:\bWHERE\b|\bGROUP\b|\bORDER\b"
            r"|\bLIMIT\b|\bHAVING\b|$)",
            cleaned_upper,
            re.DOTALL,
        )
        if from_match:
            from_clause = from_match.group(1)
            if "," in from_clause and "JOIN" not in from_clause:
                issues.append(
                    {
                        "severity": "info",
                        "rule": "implicit-join",
                        "message": "使用了隐式连接（逗号分隔表），可读性差且易出错",
                        "suggestion": "改用显式 JOIN ... ON 语法，提高可读性和可维护性",
                    }
                )

        if re.search(r"\bSELECT\s+DISTINCT\b", cleaned_upper):
            issues.append(
                {
                    "severity": "info",
                    "rule": "distinct-usage",
                    "message": "DISTINCT 可能掩盖了 JOIN 产生的重复行问题",
                    "suggestion": "检查 JOIN 条件是否正确；如果确实需要去重，考虑在子查询中先去重",
                }
            )

        if re.search(r"\bORDER\s+BY\b", cleaned_upper) and not re.search(
            r"\bLIMIT\b", cleaned_upper
        ):
            issues.append(
                {
                    "severity": "info",
                    "rule": "order-without-limit",
                    "message": "ORDER BY 没有配合 LIMIT，将对全部结果排序",
                    "suggestion": "如果只需要前 N 条结果，添加 LIMIT 可以显著提升性能",
                }
            )

        subquery_count = len(re.findall(r"\(\s*SELECT\b", cleaned_upper))
        if subquery_count >= 3:
            issues.append(
                {
                    "severity": "warning",
                    "rule": "deep-nesting",
                    "message": "检测到 {} 层嵌套子查询，可能难以优化且可读性差".format(
                        subquery_count
                    ),
                    "suggestion": "使用 CTE (WITH 子句) 重写嵌套子查询，提高可读性和优化空间",
                }
            )

        if re.search(r"\bHAVING\b", cleaned_upper) and not re.search(
            r"\bGROUP\s+BY\b", cleaned_upper
        ):
            issues.append(
                {
                    "severity": "warning",
                    "rule": "having-without-group",
                    "message": "使用了 HAVING 但没有 GROUP BY",
                    "suggestion": "检查是否应该使用 WHERE 而不是 HAVING",
                }
            )

        if re.search(r"\bWHERE\b.*(?:!=|<>)", cleaned_upper, re.DOTALL):
            issues.append(
                {
                    "severity": "info",
                    "rule": "not-equal-filter",
                    "message": "不等于条件 (!=/<>) 通常无法有效使用索引",
                    "suggestion": "如果可能，改写为范围条件 (< AND >) 或使用其他等值条件",
                }
            )

        if not issues:
            issues.append(
                {
                    "severity": "ok",
                    "rule": "no-issues",
                    "message": "未检测到明显的优化问题",
                    "suggestion": "建议使用 EXPLAIN 命令查看实际执行计划以发现潜在问题",
                }
            )

        return issues


# ─── EXPLAIN interpreter ────────────────────────────────────────────────────


class ExplainInterpreter:
    """Parse and interpret EXPLAIN output for SQLite and PostgreSQL."""

    def __init__(self, db_type: str, db_path: str = None, dsn: str = None):
        self.db_type = db_type
        if db_type == "sqlite":
            uri = "file:{}?mode=ro".format(db_path)
            self.conn = sqlite3.connect(uri, uri=True)
            self.conn.row_factory = sqlite3.Row
        else:
            if not HAS_PSYCOPG2:
                print(
                    "错误：PostgreSQL 需要安装 psycopg2\n"
                    "  pip install psycopg2-binary",
                    file=sys.stderr,
                )
                sys.exit(1)
            self.conn = psycopg2.connect(dsn)
            self.conn.set_session(readonly=True, autocommit=True)

    def interpret(
        self, sql: str, analyze: bool = False
    ) -> Dict[str, Any]:
        _validate_readonly(sql)
        if self.db_type == "sqlite":
            return self._interpret_sqlite(sql)
        return self._interpret_postgres(sql, analyze)

    # ── SQLite ──

    def _interpret_sqlite(self, sql: str) -> Dict[str, Any]:
        cur = self.conn.execute("EXPLAIN QUERY PLAN {}".format(sql))
        plan_rows: List[Dict] = []
        issues: List[Dict] = []

        for row in cur:
            row_dict = dict(row)
            detail = row_dict.get("detail", "")
            plan_rows.append(
                {
                    "id": row_dict.get("id", 0),
                    "parent": row_dict.get("parent", 0),
                    "detail": detail,
                }
            )
            self._analyze_sqlite_detail(detail, issues)

        if not issues:
            issues.append(
                {
                    "severity": "ok",
                    "type": "no-issues",
                    "detail": "查询计划看起来正常",
                    "suggestion": "如需进一步优化，关注数据量增长后的性能",
                }
            )

        return {
            "db_type": "sqlite",
            "query": sql,
            "plan": plan_rows,
            "interpretation": issues,
        }

    @staticmethod
    def _analyze_sqlite_detail(
        detail: str, issues: List[Dict]
    ) -> None:
        detail_upper = detail.upper()

        if "SCAN" in detail_upper and "INDEX" not in detail_upper:
            match = re.search(
                r"SCAN\s+(?:TABLE\s+)?(\S+)", detail, re.IGNORECASE
            )
            table_name = match.group(1) if match else "unknown"
            issues.append(
                {
                    "severity": "warning",
                    "type": "full-table-scan",
                    "detail": "全表扫描: {}".format(table_name),
                    "suggestion": "考虑为 {} 的 WHERE/JOIN 条件列添加索引".format(
                        table_name
                    ),
                }
            )

        if "USING TEMPORARY" in detail_upper or (
            "TEMP B-TREE" in detail_upper
        ):
            issues.append(
                {
                    "severity": "info",
                    "type": "temp-table",
                    "detail": "使用了临时 B-Tree",
                    "suggestion": "检查 GROUP BY / DISTINCT / ORDER BY 是否可以用索引覆盖",
                }
            )

        if "COVERING INDEX" in detail_upper:
            issues.append(
                {
                    "severity": "ok",
                    "type": "covering-index",
                    "detail": "使用了覆盖索引（不需要回表查询）",
                    "suggestion": "这是很好的优化，无需额外操作",
                }
            )

        if "SEARCH" in detail_upper and "INDEX" in detail_upper:
            match = re.search(
                r"USING\s+(?:COVERING\s+)?INDEX\s+(\S+)",
                detail,
                re.IGNORECASE,
            )
            idx_name = match.group(1) if match else "unknown"
            issues.append(
                {
                    "severity": "ok",
                    "type": "index-search",
                    "detail": "使用索引查找: {}".format(idx_name),
                    "suggestion": "索引查找效率良好",
                }
            )

        if "AUTOMATIC" in detail_upper and "INDEX" in detail_upper:
            issues.append(
                {
                    "severity": "warning",
                    "type": "auto-index",
                    "detail": "SQLite 创建了自动临时索引",
                    "suggestion": "这表示缺少合适的索引，应创建永久索引以提高性能",
                }
            )

    # ── PostgreSQL ──

    def _interpret_postgres(
        self, sql: str, analyze: bool
    ) -> Dict[str, Any]:
        if analyze:
            prefix = "EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS)"
        else:
            prefix = "EXPLAIN (FORMAT JSON)"

        with self.conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute("{} {}".format(prefix, sql))
            result = cur.fetchone()
            plan_json = result[list(result.keys())[0]]

        if isinstance(plan_json, str):
            plan_json = json.loads(plan_json)

        issues: List[Dict] = []
        self._analyze_pg_node(plan_json[0]["Plan"], issues)

        top_plan = plan_json[0]["Plan"]
        summary: Dict[str, Any] = {
            "total_cost": top_plan.get("Total Cost", 0),
            "startup_cost": top_plan.get("Startup Cost", 0),
        }
        if analyze:
            summary["actual_total_time_ms"] = top_plan.get(
                "Actual Total Time", 0
            )
            summary["actual_rows"] = top_plan.get("Actual Rows", 0)
            summary["planning_time_ms"] = plan_json[0].get(
                "Planning Time", 0
            )
            summary["execution_time_ms"] = plan_json[0].get(
                "Execution Time", 0
            )

        if not issues:
            issues.append(
                {
                    "severity": "ok",
                    "type": "no-issues",
                    "detail": "查询计划看起来正常",
                    "suggestion": "使用 EXPLAIN ANALYZE 查看实际执行数据可获得更精确的诊断",
                }
            )

        return {
            "db_type": "postgresql",
            "query": sql,
            "plan": plan_json,
            "summary": summary,
            "interpretation": issues,
        }

    def _analyze_pg_node(
        self, node: Dict, issues: List[Dict]
    ) -> None:
        node_type = node.get("Node Type", "")

        if node_type == "Seq Scan":
            rows = node.get("Plan Rows", node.get("Actual Rows", 0))
            table = node.get("Relation Name", "unknown")
            if rows > 1000:
                issues.append(
                    {
                        "severity": "warning",
                        "type": "sequential-scan",
                        "detail": "顺序扫描（全表扫描）: {}，预估 {} 行".format(
                            table, rows
                        ),
                        "suggestion": "为 {} 的过滤条件列添加索引".format(table),
                    }
                )
            else:
                issues.append(
                    {
                        "severity": "info",
                        "type": "sequential-scan-small",
                        "detail": "顺序扫描: {}，预估 {} 行（小表，可接受）".format(
                            table, rows
                        ),
                        "suggestion": "小表的顺序扫描通常不需要优化",
                    }
                )

        if node_type == "Nested Loop":
            rows = node.get("Plan Rows", 0)
            if rows > 10000:
                issues.append(
                    {
                        "severity": "warning",
                        "type": "nested-loop",
                        "detail": "嵌套循环连接，预估 {} 行".format(rows),
                        "suggestion": "检查 JOIN 条件是否有合适的索引",
                    }
                )

        if node_type == "Sort":
            method = node.get("Sort Method", "")
            if "disk" in method.lower() or "external" in method.lower():
                issues.append(
                    {
                        "severity": "warning",
                        "type": "disk-sort",
                        "detail": "排序溢出到磁盘: {}".format(method),
                        "suggestion": "增加 work_mem 参数或为 ORDER BY 列添加索引",
                    }
                )

        if node_type == "Hash Join":
            issues.append(
                {
                    "severity": "info",
                    "type": "hash-join",
                    "detail": "使用了 Hash Join",
                    "suggestion": "Hash Join 对大表连接通常高效",
                }
            )

        if node_type in ("Index Scan", "Index Only Scan"):
            idx = node.get("Index Name", "unknown")
            is_only = "Only" in node_type
            issues.append(
                {
                    "severity": "ok",
                    "type": "index-scan",
                    "detail": "{}: {}".format(
                        "仅索引扫描" if is_only else "索引扫描", idx
                    ),
                    "suggestion": "索引使用良好{}".format(
                        "，覆盖索引避免了回表" if is_only else ""
                    ),
                }
            )

        if node_type == "Bitmap Heap Scan":
            issues.append(
                {
                    "severity": "info",
                    "type": "bitmap-scan",
                    "detail": "使用了 Bitmap 堆扫描",
                    "suggestion": "Bitmap Scan 适合返回中等数量行的情况",
                }
            )

        plan_rows = node.get("Plan Rows", 0)
        actual_rows = node.get("Actual Rows")
        if actual_rows is not None and plan_rows > 0:
            ratio = actual_rows / plan_rows
            if ratio > 10 or (ratio < 0.1 and actual_rows > 100):
                issues.append(
                    {
                        "severity": "warning",
                        "type": "estimate-mismatch",
                        "detail": "行数估计偏差: 预估 {} 行，实际 {} 行".format(
                            plan_rows, actual_rows
                        ),
                        "suggestion": "运行 ANALYZE 命令更新表统计信息",
                    }
                )

        for child in node.get("Plans", []):
            self._analyze_pg_node(child, issues)

    def close(self):
        self.conn.close()


# ─── Compact schema formatter ───────────────────────────────────────────────


def _compact_schema(schema: Dict[str, Any]) -> str:
    lines = ["-- Database: {}".format(schema["db_type"])]
    for t in schema["tables"]:
        cols = ", ".join(
            "{} {}{}".format(
                c["name"],
                c["type"],
                "  PK" if c.get("primary_key") else "",
            )
            for c in t["columns"]
        )
        lines.append(
            "-- {} ({} rows): {}".format(t["name"], t["row_count"], cols)
        )
        for fk in t.get("foreign_keys", []):
            lines.append(
                "--   FK: {} -> {}".format(fk["column"], fk["references"])
            )
        for idx in t.get("indexes", []):
            uniq = "(unique)" if idx["unique"] else ""
            lines.append(
                "--   IDX{}: {} on ({})".format(
                    uniq, idx["name"], ", ".join(idx["columns"])
                )
            )
    return "\n".join(lines)


# ─── CLI ─────────────────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="SQL 查询辅助工具：Schema 提取 / 查询优化 / EXPLAIN 解读"
    )
    p.add_argument(
        "--db-type",
        choices=["sqlite", "postgres"],
        default="sqlite",
        help="数据库类型（默认 sqlite）",
    )
    p.add_argument("--db-path", default=None, help="SQLite 数据库文件路径")
    p.add_argument(
        "--dsn",
        default=None,
        help="PostgreSQL 连接串，如 'host=localhost dbname=mydb user=reader'",
    )

    sub = p.add_subparsers(dest="command", help="子命令")

    schema_p = sub.add_parser("schema", help="提取数据库表结构")
    schema_p.add_argument(
        "--sample-rows",
        "-n",
        type=int,
        default=3,
        help="每表采样行数（默认 3，0 表示不采样）",
    )
    schema_p.add_argument(
        "--compact",
        action="store_true",
        help="紧凑文本输出（适合嵌入 prompt）",
    )

    opt_p = sub.add_parser("optimize", help="SQL 查询优化分析")
    opt_p.add_argument("sql", help="待分析的 SQL 语句")

    exp_p = sub.add_parser("explain", help="执行 EXPLAIN 并解读查询计划")
    exp_p.add_argument("sql", help="待分析的 SQL 语句")
    exp_p.add_argument(
        "--analyze",
        action="store_true",
        help="使用 EXPLAIN ANALYZE（仅 PostgreSQL）",
    )

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command in ("schema", "explain"):
        if args.db_type == "sqlite" and not args.db_path:
            print(
                "错误：SQLite 模式需要 --db-path 参数", file=sys.stderr
            )
            sys.exit(1)
        if args.db_type == "postgres" and not args.dsn:
            print(
                "错误：PostgreSQL 模式需要 --dsn 参数", file=sys.stderr
            )
            sys.exit(1)

    try:
        if args.command == "schema":
            extractor = SchemaExtractor(
                args.db_type, db_path=args.db_path, dsn=args.dsn
            )
            try:
                schema = extractor.extract(sample_rows=args.sample_rows)
                if args.compact:
                    print(_compact_schema(schema))
                else:
                    print(
                        json.dumps(
                            schema,
                            ensure_ascii=False,
                            indent=2,
                            default=_json_default,
                        )
                    )
            finally:
                extractor.close()

        elif args.command == "optimize":
            issues = QueryOptimizer.analyze(args.sql)
            print(
                json.dumps(
                    {"sql": args.sql, "issues": issues},
                    ensure_ascii=False,
                    indent=2,
                )
            )

        elif args.command == "explain":
            interpreter = ExplainInterpreter(
                args.db_type, db_path=args.db_path, dsn=args.dsn
            )
            try:
                result = interpreter.interpret(
                    args.sql, analyze=getattr(args, "analyze", False)
                )
                print(
                    json.dumps(
                        result,
                        ensure_ascii=False,
                        indent=2,
                        default=_json_default,
                    )
                )
            finally:
                interpreter.close()

    except ValueError as e:
        print(
            json.dumps({"error": str(e)}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)
    except Exception as e:
        print(
            json.dumps({"error": str(e)}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

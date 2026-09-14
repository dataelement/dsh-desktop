#!/usr/bin/env python3
"""db_explorer.py — SQLite / PostgreSQL 只读数据库探索工具"""

import argparse
import json
import re
import sqlite3
import sys
from datetime import date, datetime, time, timedelta
from decimal import Decimal

try:
    import psycopg2
    import psycopg2.extras
    import psycopg2.sql as pgsql

    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


DANGEROUS_KW = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
    r"EXEC|EXECUTE|MERGE|REPLACE|UPSERT|ATTACH|DETACH|COPY|LOAD|"
    r"CALL|SET|LOCK|UNLOCK|RENAME|COMMENT|VACUUM|REINDEX|CLUSTER|"
    r"REFRESH|DISCARD|REASSIGN|SECURITY|OWNER|RULE|TRIGGER|NOTIFY|LISTEN)\b",
    re.IGNORECASE,
)

ALLOWED_START = re.compile(
    r"^\s*(SELECT|WITH|EXPLAIN|PRAGMA|SHOW|DESCRIBE|\\d)\b",
    re.IGNORECASE,
)


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


def _quote_id(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _validate_sql(sql: str):
    stripped = sql.strip().rstrip(";").strip()
    if not stripped:
        raise ValueError("SQL 语句不能为空")
    if not ALLOWED_START.match(stripped):
        raise ValueError(
            "只允许 SELECT / WITH / EXPLAIN / PRAGMA / SHOW 语句"
        )
    clean = re.sub(r"'[^']*'", "''", stripped)
    clean = re.sub(r'"[^"]*"', '""', clean)
    if DANGEROUS_KW.search(clean):
        raise ValueError("检测到写入操作关键字，只允许只读查询")
    if ";" in clean:
        raise ValueError("不允许执行多条 SQL 语句")


class SQLiteExplorer:
    def __init__(self, db_path: str):
        uri = f"file:{db_path}?mode=ro"
        self.conn = sqlite3.connect(uri, uri=True)
        self.conn.row_factory = sqlite3.Row

    def _tables(self):
        cur = self.conn.execute(
            "SELECT name, type FROM sqlite_master "
            "WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        )
        return [{"name": r["name"], "type": r["type"]} for r in cur]

    def _check_table(self, table: str):
        names = [t["name"] for t in self._tables()]
        if table not in names:
            raise ValueError(
                f"表 '{table}' 不存在。可用的表: {', '.join(names)}"
            )

    def list_tables(self):
        tables = self._tables()
        for t in tables:
            cur = self.conn.execute(
                f"SELECT COUNT(*) AS cnt FROM {_quote_id(t['name'])}"
            )
            t["row_count"] = cur.fetchone()["cnt"]
        return tables

    def describe_table(self, table: str):
        self._check_table(table)
        qid = _quote_id(table)

        cur = self.conn.execute(f"PRAGMA table_info({qid})")
        columns = []
        for r in cur:
            columns.append(
                {
                    "cid": r["cid"],
                    "name": r["name"],
                    "type": r["type"] or "TEXT",
                    "notnull": bool(r["notnull"]),
                    "default": r["dflt_value"],
                    "primary_key": bool(r["pk"]),
                }
            )

        cur = self.conn.execute(f"PRAGMA foreign_key_list({qid})")
        fks = []
        for r in cur:
            fks.append(
                {
                    "from": r["from"],
                    "to_table": r["table"],
                    "to_column": r["to"],
                }
            )

        cur = self.conn.execute(f"PRAGMA index_list({qid})")
        indexes = []
        for r in cur:
            idx = _quote_id(r["name"])
            ic = self.conn.execute(f"PRAGMA index_info({idx})")
            indexes.append(
                {
                    "name": r["name"],
                    "unique": bool(r["unique"]),
                    "columns": [c["name"] for c in ic],
                }
            )

        cur = self.conn.execute(f"SELECT COUNT(*) AS cnt FROM {qid}")
        row_count = cur.fetchone()["cnt"]

        return {
            "table": table,
            "row_count": row_count,
            "columns": columns,
            "foreign_keys": fks,
            "indexes": indexes,
        }

    def preview(self, table: str, limit: int = 20):
        self._check_table(table)
        cur = self.conn.execute(
            f"SELECT * FROM {_quote_id(table)} LIMIT ?", (limit,)
        )
        cols = [d[0] for d in cur.description]
        rows = [dict(r) for r in cur]
        return {"table": table, "columns": cols, "rows": rows, "count": len(rows)}

    def er_diagram(self):
        tables = [t for t in self._tables() if t["type"] == "table"]
        lines = ["erDiagram"]

        for t in tables:
            desc = self.describe_table(t["name"])
            fk_cols = {fk["from"] for fk in desc["foreign_keys"]}

            lines.append(f"    {t['name']} {{")
            for col in desc["columns"]:
                ct = col["type"].replace(" ", "_")
                markers = ""
                if col["primary_key"]:
                    markers += " PK"
                if col["name"] in fk_cols:
                    markers += " FK"
                lines.append(f"        {ct} {col['name']}{markers}")
            lines.append("    }")

            for fk in desc["foreign_keys"]:
                lines.append(
                    f'    {fk["to_table"]} ||--o{{ {t["name"]} : "{fk["from"]}"'
                )

        return "\n".join(lines)

    def query(self, sql: str):
        _validate_sql(sql)
        cur = self.conn.execute(sql)
        if cur.description is None:
            return {"columns": [], "rows": [], "count": 0}
        cols = [d[0] for d in cur.description]
        rows = [dict(r) for r in cur]
        return {"columns": cols, "rows": rows, "count": len(rows)}

    def close(self):
        self.conn.close()


class PostgreSQLExplorer:
    def __init__(self, dsn: str):
        if not HAS_PSYCOPG2:
            print(
                "错误：需要安装 psycopg2\n  pip install psycopg2-binary",
                file=sys.stderr,
            )
            sys.exit(1)
        self.conn = psycopg2.connect(dsn)
        self.conn.set_session(readonly=True, autocommit=True)

    def _cursor(self):
        return self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    _TYPE_MAP = {"BASE TABLE": "table", "VIEW": "view"}

    def _tables(self):
        with self._cursor() as cur:
            cur.execute(
                "SELECT table_name AS name, table_type AS type "
                "FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY table_name"
            )
            rows = [dict(r) for r in cur]
            for r in rows:
                r["type"] = self._TYPE_MAP.get(r["type"], r["type"].lower())
            return rows

    def _check_table(self, table: str):
        names = [t["name"] for t in self._tables()]
        if table not in names:
            raise ValueError(
                f"表 '{table}' 不存在。可用的表: {', '.join(names)}"
            )

    def list_tables(self):
        tables = self._tables()
        with self._cursor() as cur:
            for t in tables:
                qid = pgsql.Identifier(t["name"])
                cur.execute(
                    pgsql.SQL("SELECT COUNT(*) AS cnt FROM {}").format(qid)
                )
                t["row_count"] = cur.fetchone()["cnt"]
        return tables

    def describe_table(self, table: str):
        self._check_table(table)
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT c.ordinal_position AS cid,
                       c.column_name      AS name,
                       c.data_type        AS type,
                       (c.is_nullable = 'NO') AS notnull,
                       c.column_default   AS "default",
                       (pk.column_name IS NOT NULL) AS primary_key
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_name = %s
                      AND tc.table_schema = 'public'
                ) pk ON pk.column_name = c.column_name
                WHERE c.table_name = %s AND c.table_schema = 'public'
                ORDER BY c.ordinal_position
                """,
                (table, table),
            )
            columns = [dict(r) for r in cur]

            cur.execute(
                """
                SELECT kcu.column_name    AS "from",
                       ccu.table_name     AS to_table,
                       ccu.column_name    AS to_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name
                 AND tc.table_schema = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_name = %s
                  AND tc.table_schema = 'public'
                """,
                (table,),
            )
            fks = [dict(r) for r in cur]

            cur.execute(
                """
                SELECT i.relname AS name,
                       ix.indisunique AS "unique",
                       array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
                FROM pg_class t
                JOIN pg_index ix ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_attribute a ON a.attrelid = t.oid
                     AND a.attnum = ANY(ix.indkey)
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE t.relname = %s AND n.nspname = 'public'
                GROUP BY i.relname, ix.indisunique
                """,
                (table,),
            )
            indexes = [dict(r) for r in cur]

            qid = pgsql.Identifier(table)
            cur.execute(
                pgsql.SQL("SELECT COUNT(*) AS cnt FROM {}").format(qid)
            )
            row_count = cur.fetchone()["cnt"]

        return {
            "table": table,
            "row_count": row_count,
            "columns": columns,
            "foreign_keys": fks,
            "indexes": indexes,
        }

    def preview(self, table: str, limit: int = 20):
        self._check_table(table)
        with self._cursor() as cur:
            qid = pgsql.Identifier(table)
            cur.execute(
                pgsql.SQL("SELECT * FROM {} LIMIT %s").format(qid),
                (limit,),
            )
            cols = [d[0] for d in cur.description]
            rows = [dict(r) for r in cur]
        return {"table": table, "columns": cols, "rows": rows, "count": len(rows)}

    def er_diagram(self):
        tables = [t for t in self._tables() if t["type"] == "table"]
        lines = ["erDiagram"]

        for t in tables:
            desc = self.describe_table(t["name"])
            fk_cols = {fk["from"] for fk in desc["foreign_keys"]}

            safe_name = t["name"].replace(" ", "_")
            lines.append(f"    {safe_name} {{")
            for col in desc["columns"]:
                ct = col["type"].replace(" ", "_")
                markers = ""
                if col["primary_key"]:
                    markers += " PK"
                if col["name"] in fk_cols:
                    markers += " FK"
                lines.append(f"        {ct} {col['name']}{markers}")
            lines.append("    }")

            for fk in desc["foreign_keys"]:
                to_safe = fk["to_table"].replace(" ", "_")
                lines.append(
                    f'    {to_safe} ||--o{{ {safe_name} : "{fk["from"]}"'
                )

        return "\n".join(lines)

    def query(self, sql: str):
        _validate_sql(sql)
        with self._cursor() as cur:
            cur.execute(sql)
            if cur.description is None:
                return {"columns": [], "rows": [], "count": 0}
            cols = [d[0] for d in cur.description]
            rows = [dict(r) for r in cur]
        return {"columns": cols, "rows": rows, "count": len(rows)}

    def close(self):
        self.conn.close()


def build_parser():
    p = argparse.ArgumentParser(
        description="SQLite / PostgreSQL 只读数据库探索工具"
    )
    p.add_argument(
        "--db-type",
        choices=["sqlite", "postgres"],
        default="sqlite",
        help="数据库类型（默认 sqlite）",
    )
    p.add_argument(
        "--db-path",
        default=None,
        help="SQLite 数据库文件路径",
    )
    p.add_argument(
        "--dsn",
        default=None,
        help="PostgreSQL 连接串，如 'host=localhost dbname=mydb user=reader'",
    )

    sub = p.add_subparsers(dest="command", help="子命令")

    sub.add_parser("list-tables", help="列出所有表和视图")

    desc_p = sub.add_parser("describe", help="查看表结构")
    desc_p.add_argument("table", help="表名")

    prev_p = sub.add_parser("preview", help="预览表数据")
    prev_p.add_argument("table", help="表名")
    prev_p.add_argument(
        "--limit", "-n", type=int, default=20, help="显示行数（默认 20）"
    )

    sub.add_parser("er-diagram", help="生成 Mermaid ER 图")

    q_p = sub.add_parser("query", help="执行只读 SQL 查询")
    q_p.add_argument("sql", help="SQL 语句（仅 SELECT / WITH / EXPLAIN）")

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.db_type == "sqlite":
        if not args.db_path:
            print("错误：SQLite 模式需要 --db-path 参数", file=sys.stderr)
            sys.exit(1)
        explorer = SQLiteExplorer(args.db_path)
    else:
        if not args.dsn:
            print("错误：PostgreSQL 模式需要 --dsn 参数", file=sys.stderr)
            sys.exit(1)
        explorer = PostgreSQLExplorer(args.dsn)

    try:
        if args.command == "list-tables":
            result = explorer.list_tables()
        elif args.command == "describe":
            result = explorer.describe_table(args.table)
        elif args.command == "preview":
            result = explorer.preview(args.table, limit=args.limit)
        elif args.command == "er-diagram":
            mermaid = explorer.er_diagram()
            print(mermaid)
            return
        elif args.command == "query":
            result = explorer.query(args.sql)
        else:
            parser.print_help()
            sys.exit(1)

        print(json.dumps(result, ensure_ascii=False, indent=2, default=_json_default))
    except ValueError as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(1)
    finally:
        explorer.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate OpenAPI 3.0 spec from source code route definitions.

Supported frameworks:
  Python  — Flask, FastAPI, Django REST Framework
  JS/TS   — Express.js
  Go      — Gin, Echo
"""

import ast
import json
import os
import re
import sys
import argparse
from pathlib import Path

PYTHON_TYPE_MAP = {
    "int": {"type": "integer"},
    "float": {"type": "number", "format": "float"},
    "str": {"type": "string"},
    "bool": {"type": "boolean"},
    "bytes": {"type": "string", "format": "binary"},
    "date": {"type": "string", "format": "date"},
    "datetime": {"type": "string", "format": "date-time"},
    "UUID": {"type": "string", "format": "uuid"},
    "uuid": {"type": "string", "format": "uuid"},
}

HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options"}

FLASK_DECORATORS = {"route", "get", "post", "put", "delete", "patch", "head", "options"}
FASTAPI_DECORATORS = {"get", "post", "put", "delete", "patch", "head", "options", "api_route"}

SKIP_DIRS = {
    "node_modules", "__pycache__", "venv", ".venv", "env", ".env",
    ".git", ".hg", "dist", "build", "vendor", ".tox", ".mypy_cache",
}


# ── Helpers ────────────────────────────────────────────────────────────────


def convert_path_params(path, framework):
    """Convert framework path-param syntax to OpenAPI {param} format."""
    params = []

    if framework == "flask":
        def _replace(m):
            type_str, name = m.group(1), m.group(2)
            ptype = {"int": "integer", "float": "number", "string": "string",
                     "path": "string"}.get(type_str, "string") if type_str else "string"
            params.append({"name": name, "type": ptype})
            return "{" + name + "}"
        path = re.sub(r"<(?:(\w+):)?(\w+)>", _replace, path)

    elif framework in ("express", "gin", "echo"):
        def _replace(m):
            name = m.group(1)
            params.append({"name": name, "type": "string"})
            return "{" + name + "}"
        path = re.sub(r":(\w+)", _replace, path)

    elif framework == "fastapi":
        for m in re.finditer(r"\{(\w+)\}", path):
            params.append({"name": m.group(1), "type": "string"})

    return path, params


def extract_docstring(node):
    """Extract docstring from a Python function AST node."""
    if (node.body
            and isinstance(node.body[0], ast.Expr)
            and isinstance(node.body[0].value, ast.Constant)
            and isinstance(node.body[0].value.value, str)):
        return node.body[0].value.value
    return ""


def annotation_to_str(node):
    """Convert an AST annotation node to its string representation."""
    if node is None:
        return None
    if isinstance(node, ast.Constant):
        return str(node.value)
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = annotation_to_str(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    if isinstance(node, ast.Subscript):
        base = annotation_to_str(node.value)
        sl = annotation_to_str(node.slice)
        return f"{base}[{sl}]" if base and sl else base
    if isinstance(node, ast.Tuple):
        parts = [annotation_to_str(e) for e in node.elts]
        return ", ".join(p for p in parts if p)
    return None


def python_type_to_schema(type_str):
    """Map a Python type-annotation string to an OpenAPI schema dict."""
    if type_str in PYTHON_TYPE_MAP:
        return dict(PYTHON_TYPE_MAP[type_str])

    m = re.match(r"(?:List|list)\[(\w+)]", type_str)
    if m:
        return {"type": "array", "items": python_type_to_schema(m.group(1))}

    m = re.match(r"Optional\[(\w+)]", type_str)
    if m:
        schema = python_type_to_schema(m.group(1))
        schema["nullable"] = True
        return schema

    if type_str.startswith(("Dict[", "dict[")):
        return {"type": "object"}

    if type_str and type_str[0].isupper():
        return {"$ref": f"#/components/schemas/{type_str}"}

    return {"type": "string"}


def _should_skip(path):
    """Return True if *path* is inside a directory we never want to scan."""
    return any(part in SKIP_DIRS for part in path.parts)


# ── Python Extractor (Flask / FastAPI / Django) ───────────────────────────


class PythonExtractor:
    """Extract API routes from Python source files via AST."""

    def extract(self, filepath, framework=None):
        try:
            source = Path(filepath).read_text(encoding="utf-8")
            tree = ast.parse(source, filename=filepath)
        except (SyntaxError, UnicodeDecodeError, OSError):
            return []

        fw = framework or self._detect(tree)
        if fw is None:
            return []

        tag = Path(filepath).stem
        routes = []
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for deco in node.decorator_list:
                parsed = self._parse_decorator(deco, node, fw, tag)
                if parsed:
                    routes.extend(parsed)
        return routes

    # ── private ──

    @staticmethod
    def _detect(tree):
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    low = alias.name.lower()
                    if "fastapi" in low:
                        return "fastapi"
                    if "flask" in low:
                        return "flask"
                    if "django" in low:
                        return "django"
            elif isinstance(node, ast.ImportFrom) and node.module:
                mod = node.module.lower()
                if "fastapi" in mod:
                    return "fastapi"
                if "flask" in mod:
                    return "flask"
                if "rest_framework" in mod or "django" in mod:
                    return "django"
        return None

    def _parse_decorator(self, deco, func, fw, tag):
        if not isinstance(deco, ast.Call):
            return None
        attr = None
        if isinstance(deco.func, ast.Attribute):
            attr = deco.func.attr
        elif isinstance(deco.func, ast.Name):
            attr = deco.func.id
        if attr is None:
            return None

        if fw in ("flask", "fastapi"):
            return self._parse_flask_fastapi(deco, func, attr, fw, tag)
        if fw == "django":
            return self._parse_django(deco, func, attr, tag)
        return None

    def _parse_flask_fastapi(self, deco, func, attr, fw, tag):
        allowed = FLASK_DECORATORS if fw == "flask" else FASTAPI_DECORATORS
        if attr not in allowed:
            return None
        if not deco.args:
            return None

        path_node = deco.args[0]
        if not isinstance(path_node, ast.Constant) or not isinstance(path_node.value, str):
            return None
        path = path_node.value

        methods = []
        if attr in ("route", "api_route"):
            for kw in deco.keywords:
                if kw.arg == "methods" and isinstance(kw.value, (ast.List, ast.Tuple)):
                    for elt in kw.value.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            methods.append(elt.value.lower())
            if not methods:
                methods = ["get"]
        else:
            methods = [attr.lower()]

        openapi_path, path_params = convert_path_params(path, fw)

        # Enrich path param types from function annotations
        arg_types = {}
        for arg in func.args.args:
            if arg.annotation:
                ts = annotation_to_str(arg.annotation)
                if ts:
                    arg_types[arg.arg] = ts
        for pp in path_params:
            ts = arg_types.get(pp["name"])
            if ts and ts in PYTHON_TYPE_MAP:
                pp["type"] = PYTHON_TYPE_MAP[ts].get("type", pp["type"])

        docstring = extract_docstring(func)
        summary = docstring.split("\n")[0].strip() if docstring else ""
        description = docstring.strip() if docstring else ""

        query_params, body_schema = self._func_params(func, fw, path_params)

        response_schema = None
        status_code = None
        for kw in deco.keywords:
            if kw.arg == "response_model":
                ts = annotation_to_str(kw.value)
                if ts:
                    response_schema = python_type_to_schema(ts)
            elif kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                status_code = kw.value.value

        routes = []
        for method in methods:
            if method not in HTTP_METHODS:
                continue
            route = {
                "method": method,
                "path": openapi_path,
                "summary": summary,
                "description": description,
                "operation_id": func.name,
                "tags": [tag],
                "parameters": [],
                "responses": {},
            }
            for pp in path_params:
                route["parameters"].append({
                    "name": pp["name"], "in": "path",
                    "required": True,
                    "schema": {"type": pp["type"]},
                })
            for qp in query_params:
                entry = {
                    "name": qp["name"], "in": "query",
                    "required": qp.get("required", False),
                    "schema": qp.get("schema", {"type": "string"}),
                }
                if qp.get("description"):
                    entry["description"] = qp["description"]
                route["parameters"].append(entry)

            if body_schema and method in ("post", "put", "patch"):
                route["request_body"] = {
                    "required": True,
                    "content": {"application/json": {"schema": body_schema}},
                }

            sc = str(status_code or (201 if method == "post" else 200))
            if response_schema:
                route["responses"][sc] = {
                    "description": "Successful response",
                    "content": {"application/json": {"schema": response_schema}},
                }
            else:
                route["responses"][sc] = {"description": "Successful response"}
            routes.append(route)
        return routes

    @staticmethod
    def _parse_django(deco, func, attr, tag):
        if attr != "api_view":
            return None
        methods = []
        if deco.args and isinstance(deco.args[0], (ast.List, ast.Tuple)):
            for elt in deco.args[0].elts:
                if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                    methods.append(elt.value.lower())
        if not methods:
            methods = ["get"]

        docstring = extract_docstring(func)
        summary = docstring.split("\n")[0].strip() if docstring else ""
        routes = []
        for method in methods:
            routes.append({
                "method": method,
                "path": "/" + func.name.replace("_", "-"),
                "summary": summary,
                "description": docstring.strip() if docstring else "",
                "operation_id": func.name,
                "tags": [tag],
                "parameters": [],
                "responses": {"200": {"description": "Successful response"}},
            })
        return routes

    @staticmethod
    def _func_params(func, fw, path_params):
        """Extract query params and body schema from function signature."""
        query_params = []
        body_schema = None
        path_names = {p["name"] for p in path_params}
        skip = {"self", "cls", "request", "req", "res", "db", "session", "background_tasks"}

        args = func.args
        num_defaults = len(args.defaults)
        num_args = len(args.args)

        for idx, arg in enumerate(args.args):
            name = arg.arg
            if name in skip or name in path_names:
                continue

            type_str = annotation_to_str(arg.annotation) if arg.annotation else None

            if fw == "fastapi" and type_str:
                schema = python_type_to_schema(type_str)
                if "$ref" in schema or schema.get("type") == "object":
                    body_schema = schema
                    continue

            has_default = idx >= (num_args - num_defaults)
            schema = python_type_to_schema(type_str) if type_str else {"type": "string"}
            query_params.append({
                "name": name,
                "schema": schema,
                "required": not has_default,
            })

        return query_params, body_schema


# ── JavaScript / TypeScript Extractor (Express) ──────────────────────────


class JSExtractor:
    """Extract API routes from JS/TS files (Express.js)."""

    _ROUTE_RE = re.compile(
        r"""(\w+)\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*['"]([^'"]+)['"]""",
        re.IGNORECASE,
    )
    _JSDOC_RE = re.compile(r"/\*\*([\s\S]*?)\*/\s*$")

    def extract(self, filepath):
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            return []

        tag = Path(filepath).stem
        routes = []

        for m in self._ROUTE_RE.finditer(content):
            method = m.group(2).lower()
            path = m.group(3)

            jsdoc_match = self._JSDOC_RE.search(content[:m.start()])
            summary = self._jsdoc_summary(jsdoc_match.group(1)) if jsdoc_match else ""

            openapi_path, path_params = convert_path_params(path, "express")
            op_id = method + "_" + re.sub(r"[{}]", "", openapi_path).strip("/").replace("/", "_")

            route = {
                "method": method,
                "path": openapi_path,
                "summary": summary,
                "description": "",
                "operation_id": op_id,
                "tags": [tag],
                "parameters": [
                    {"name": p["name"], "in": "path", "required": True,
                     "schema": {"type": p["type"]}}
                    for p in path_params
                ],
                "responses": {"200": {"description": "Successful response"}},
            }

            if method in ("post", "put", "patch"):
                route["request_body"] = {
                    "required": True,
                    "content": {"application/json": {"schema": {"type": "object"}}},
                }

            routes.append(route)
        return routes

    @staticmethod
    def _jsdoc_summary(text):
        for line in text.strip().split("\n"):
            line = line.strip().lstrip("* ").strip()
            if line and not line.startswith("@"):
                return line
        return ""


# ── Go Extractor (Gin / Echo) ────────────────────────────────────────────


class GoExtractor:
    """Extract API routes from Go files (Gin, Echo)."""

    _ROUTE_RE = re.compile(
        r"""(?://\s*(.*?)\n\s*)?"""
        r"""(\w+)\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|Any)\s*\(\s*"([^"]+)"\s*""",
        re.VERBOSE,
    )
    _GROUP_RE = re.compile(
        r"""(\w+)\s*:?=\s*\w+\.Group\s*\(\s*"([^"]+)"\s*\)""",
    )

    def extract(self, filepath):
        try:
            content = Path(filepath).read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            return []

        tag = Path(filepath).stem
        groups = {}
        for m in self._GROUP_RE.finditer(content):
            groups[m.group(1)] = m.group(2).rstrip("/")

        routes = []
        for m in self._ROUTE_RE.finditer(content):
            comment = (m.group(1) or "").strip()
            var = m.group(2)
            raw_method = m.group(3).lower()
            path = m.group(4)

            prefix = groups.get(var, "")
            full_path = prefix + path

            methods = (["get", "post", "put", "delete", "patch"]
                       if raw_method == "any" else [raw_method])

            openapi_path, path_params = convert_path_params(full_path, "gin")
            for method in methods:
                op_id = method + "_" + re.sub(r"[{}:]", "", full_path).strip("/").replace("/", "_")
                route = {
                    "method": method,
                    "path": openapi_path,
                    "summary": comment,
                    "description": "",
                    "operation_id": op_id,
                    "tags": [tag],
                    "parameters": [
                        {"name": p["name"], "in": "path", "required": True,
                         "schema": {"type": p["type"]}}
                        for p in path_params
                    ],
                    "responses": {"200": {"description": "Successful response"}},
                }
                routes.append(route)
        return routes


# ── OpenAPI Spec Builder ──────────────────────────────────────────────────


def build_openapi_spec(routes, title="API Documentation", version="1.0.0",
                       description="", servers=None):
    spec = {
        "openapi": "3.0.3",
        "info": {"title": title, "version": version},
        "paths": {},
    }
    if description:
        spec["info"]["description"] = description
    if servers:
        spec["servers"] = [{"url": s} for s in servers]

    all_tags = set()
    ref_schemas = {}

    for route in routes:
        path = route["path"]
        method = route["method"]
        if path not in spec["paths"]:
            spec["paths"][path] = {}

        op = {}
        if route.get("summary"):
            op["summary"] = route["summary"]
        if route.get("description") and route["description"] != route.get("summary"):
            op["description"] = route["description"]
        if route.get("operation_id"):
            op["operationId"] = route["operation_id"]
        if route.get("tags"):
            op["tags"] = route["tags"]
            all_tags.update(route["tags"])
        if route.get("parameters"):
            op["parameters"] = route["parameters"]
        if route.get("request_body"):
            op["requestBody"] = route["request_body"]
        op["responses"] = route.get("responses", {"200": {"description": "Successful response"}})

        _collect_refs(op, ref_schemas)
        spec["paths"][path][method] = op

    if all_tags:
        spec["tags"] = [{"name": t} for t in sorted(all_tags)]
    if ref_schemas:
        spec.setdefault("components", {})["schemas"] = {
            name: {"type": "object", "description": f"{name} model"}
            for name in sorted(ref_schemas)
        }
    return spec


def _collect_refs(obj, out):
    if isinstance(obj, dict):
        ref = obj.get("$ref")
        if ref and ref.startswith("#/components/schemas/"):
            out[ref.split("/")[-1]] = True
        for v in obj.values():
            _collect_refs(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_refs(item, out)


# ── Framework Detection ───────────────────────────────────────────────────


def detect_framework(source_dir):
    source_dir = Path(source_dir)

    for py in source_dir.rglob("*.py"):
        if _should_skip(py):
            continue
        try:
            head = py.read_text(encoding="utf-8", errors="ignore")[:4096]
        except OSError:
            continue
        if re.search(r"from\s+fastapi\s+import|import\s+fastapi", head):
            return "fastapi"
        if re.search(r"from\s+flask\s+import|import\s+flask", head):
            return "flask"
        if re.search(r"from\s+(?:rest_framework|django)", head):
            return "django"

    for ext in ("*.js", "*.ts", "*.mjs"):
        for f in source_dir.rglob(ext):
            if _should_skip(f):
                continue
            try:
                head = f.read_text(encoding="utf-8", errors="ignore")[:4096]
            except OSError:
                continue
            if re.search(r"""require\s*\(\s*['"]express['"]\)|from\s+['"]express['"]""", head):
                return "express"

    for f in source_dir.rglob("*.go"):
        if _should_skip(f):
            continue
        try:
            head = f.read_text(encoding="utf-8", errors="ignore")[:4096]
        except OSError:
            continue
        if '"github.com/gin-gonic/gin"' in head:
            return "gin"
        if '"github.com/labstack/echo' in head:
            return "echo"

    return None


# ── Scan & Extract ────────────────────────────────────────────────────────


def scan_and_extract(source_dir, framework=None):
    source_dir = Path(source_dir)
    if not source_dir.is_dir():
        print(f"Error: '{source_dir}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    detected = framework or detect_framework(source_dir)
    if detected:
        print(f"Detected framework: {detected}", file=sys.stderr)

    py_ext = PythonExtractor()
    js_ext = JSExtractor()
    go_ext = GoExtractor()
    routes = []

    for py in sorted(source_dir.rglob("*.py")):
        if _should_skip(py):
            continue
        fw = detected if detected in ("flask", "fastapi", "django") else None
        routes.extend(py_ext.extract(str(py), framework=fw))

    for ext in ("*.js", "*.ts", "*.mjs"):
        for f in sorted(source_dir.rglob(ext)):
            if _should_skip(f):
                continue
            routes.extend(js_ext.extract(str(f)))

    for f in sorted(source_dir.rglob("*.go")):
        if _should_skip(f):
            continue
        routes.extend(go_ext.extract(str(f)))

    return routes, detected


# ── YAML Serializer (stdlib-only) ─────────────────────────────────────────


def to_yaml(obj, indent=0):
    """Minimal YAML serializer sufficient for OpenAPI specs."""
    sp = "  " * indent

    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        if not obj:
            return '""'
        if any(c in obj for c in ':#{}[]|>&*!%@`"\'\n') or obj.strip() != obj:
            return json.dumps(obj, ensure_ascii=False)
        return obj

    if isinstance(obj, list):
        if not obj:
            return "[]"
        lines = []
        for item in obj:
            if isinstance(item, dict):
                first = True
                for k, v in item.items():
                    vs = to_yaml(v, indent + 2)
                    if isinstance(v, (dict, list)) and v:
                        lines.append(f"{sp}{'- ' if first else '  '}{k}:")
                        lines.append(vs)
                    else:
                        lines.append(f"{sp}{'- ' if first else '  '}{k}: {vs}")
                    first = False
            else:
                lines.append(f"{sp}- {to_yaml(item, indent + 1)}")
        return "\n".join(lines)

    if isinstance(obj, dict):
        if not obj:
            return "{}"
        lines = []
        for k, v in obj.items():
            vs = to_yaml(v, indent + 1)
            if isinstance(v, (dict, list)) and v:
                lines.append(f"{sp}{k}:")
                lines.append(vs)
            else:
                lines.append(f"{sp}{k}: {vs}")
        return "\n".join(lines)

    return str(obj)


# ── CLI ───────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Generate OpenAPI 3.0 spec from source code route definitions.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  %(prog)s ./src
  %(prog)s ./src --format yaml --output api-spec.yaml
  %(prog)s ./app --framework flask --title "My API" --version 2.0.0
  %(prog)s ./routes --server http://localhost:3000
        """,
    )
    parser.add_argument("source_dir",
                        help="Source directory to scan for route definitions")
    parser.add_argument("-f", "--format", choices=["json", "yaml"],
                        default="json", help="Output format (default: json)")
    parser.add_argument("-o", "--output",
                        help="Output file path (default: stdout)")
    parser.add_argument("--framework",
                        choices=["flask", "fastapi", "django", "express", "gin", "echo"],
                        help="Force framework detection (auto-detected by default)")
    parser.add_argument("--title", default="API Documentation",
                        help="API title (default: API Documentation)")
    parser.add_argument("--version", default="1.0.0",
                        help="API version (default: 1.0.0)")
    parser.add_argument("--description", default="",
                        help="API description")
    parser.add_argument("--server", action="append", dest="servers",
                        help="Server URL (repeatable)")

    args = parser.parse_args()

    routes, _ = scan_and_extract(args.source_dir, framework=args.framework)

    if not routes:
        print("Warning: no routes found. Verify the source directory contains "
              "supported framework code.", file=sys.stderr)

    spec = build_openapi_spec(
        routes,
        title=args.title,
        version=args.version,
        description=args.description,
        servers=args.servers,
    )

    if args.format == "yaml":
        output_text = to_yaml(spec)
    else:
        output_text = json.dumps(spec, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output_text + "\n", encoding="utf-8")
        print(f"OpenAPI spec written to {args.output}", file=sys.stderr)
    else:
        print(output_text)

    n_routes = len(routes)
    n_paths = len(spec["paths"])
    print(f"Found {n_routes} endpoint(s) across {n_paths} path(s).", file=sys.stderr)


if __name__ == "__main__":
    main()

---
name: route-to-openapi
description: "Generates RESTful API documentation (OpenAPI 3.0 / Swagger spec) by scanning route definitions in code for Flask, FastAPI, Express, Gin, and other frameworks. Trigger when users ask about API documentation, OpenAPI, Swagger, endpoint docs, generating docs from code, or extracting endpoints."
license: MIT
---

# route-to-openapi

Automatically scan route/endpoint definitions in source code and generate RESTful API documentation conforming to the [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3) specification.

Supports major web frameworks with automatic framework detection. Extracts HTTP methods, paths, parameters, request bodies, response models, and doc comments, then outputs a standard OpenAPI spec file ready to import into Swagger UI or Redoc.

## Quick Start

```bash
# Scan source directory, output OpenAPI spec in JSON format
python scripts/generate_api_doc.py ./src

# Specify output format and file
python scripts/generate_api_doc.py ./src --format yaml --output api-spec.yaml

# Specify framework and API metadata
python scripts/generate_api_doc.py ./app --framework flask --title "My API" --version 2.0.0

# Add server URLs
python scripts/generate_api_doc.py ./routes --server http://localhost:3000 --server https://api.example.com
```

## Supported Frameworks

| Language | Framework | Parsing Method |
|---|---|---|
| Python | Flask | AST parsing (decorators + type annotations + docstrings) |
| Python | FastAPI | AST parsing (decorators + Pydantic models + type annotations) |
| Python | Django REST Framework | AST parsing (`@api_view` decorators) |
| JavaScript/TypeScript | Express.js | Regex matching (`app.get()` / `router.get()` + JSDoc) |
| Go | Gin | Regex matching (`r.GET()` / `group.GET()` + comments) |
| Go | Echo | Regex matching (`e.GET()` + comments) |

## Extraction Capabilities

The script automatically extracts the following information:

- **HTTP Methods**: GET / POST / PUT / DELETE / PATCH, etc.
- **Route Paths**: Automatically converts each framework's path parameter format to the OpenAPI `{param}` format
- **Path Parameters**: Extracted from route patterns (with type inference)
- **Query Parameters**: Extracted from function signatures (Python frameworks)
- **Request Bodies**: Inferred from type annotations and Pydantic models (FastAPI)
- **Response Models**: Extracted from the `response_model` parameter (FastAPI)
- **Endpoint Descriptions**: Extracted from docstrings / JSDoc / inline comments
- **Tag Grouping**: Automatically grouped by source file module name

## Path Parameter Format Conversion

| Framework | Source Format | Converted Result |
|---|---|---|
| Flask | `<int:user_id>` | `{user_id}` (type: integer) |
| FastAPI | `{user_id}` | `{user_id}` (unchanged) |
| Express | `:user_id` | `{user_id}` |
| Gin/Echo | `:user_id` | `{user_id}` |

## Parameters

| Parameter | Description | Default |
|---|---|---|
| `source_dir` | Source directory to scan (required) | - |
| `-f, --format` | Output format: `json` or `yaml` | `json` |
| `-o, --output` | Output file path | stdout |
| `--framework` | Force a specific framework (skip auto-detection) | Auto-detect |
| `--title` | API documentation title | `API Documentation` |
| `--version` | API version number | `1.0.0` |
| `--description` | API description text | Empty |
| `--server` | Server URL (can be specified multiple times) | None |

## Output Example

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "List all users",
        "operationId": "list_users",
        "tags": ["users"],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": { "description": "Successful response" }
        }
      }
    },
    "/users/{user_id}": {
      "get": {
        "summary": "Get user by ID",
        "operationId": "get_user",
        "tags": ["users"],
        "parameters": [
          {
            "name": "user_id",
            "in": "path",
            "required": true,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": { "description": "Successful response" }
        }
      }
    }
  }
}
```

## Prerequisites

- Python 3.8+
- No additional dependencies required — uses only the Python standard library
- The scanned project must use one of the supported web frameworks listed above

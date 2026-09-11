---
name: api-doc-gen
description: "从 Flask、FastAPI、Express 或 Gin 等 Web 框架的源代码中自动扫描路由定义，生成符合 OpenAPI 3.0 / Swagger 规范的标准化 API 文档文件。当用户需要生成 API 文档、提到 OpenAPI、Swagger、接口文档、路由扫描或从代码自动提取接口信息时触发。"
license: MIT
---

# api-doc-generator

从源代码中的路由/端点定义自动扫描并生成符合 [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3) 规范的 RESTful API 文档。

支持主流 Web 框架，自动检测框架类型，提取 HTTP 方法、路径、参数、请求体、响应模型和文档注释，输出可直接导入 Swagger UI / Redoc 的标准 OpenAPI 规范文件。

## Quick Start

```bash
# 扫描源码目录，输出 JSON 格式 OpenAPI spec
python scripts/generate_api_doc.py ./src

# 指定输出格式和文件
python scripts/generate_api_doc.py ./src --format yaml --output api-spec.yaml

# 指定框架和 API 元信息
python scripts/generate_api_doc.py ./app --framework flask --title "My API" --version 2.0.0

# 添加服务器地址
python scripts/generate_api_doc.py ./routes --server http://localhost:3000 --server https://api.example.com
```

## 支持的框架

| 语言 | 框架 | 解析方式 |
|---|---|---|
| Python | Flask | AST 解析（装饰器 + 类型注解 + docstring） |
| Python | FastAPI | AST 解析（装饰器 + Pydantic 模型 + 类型注解） |
| Python | Django REST Framework | AST 解析（`@api_view` 装饰器） |
| JavaScript/TypeScript | Express.js | 正则匹配（`app.get()` / `router.get()` + JSDoc） |
| Go | Gin | 正则匹配（`r.GET()` / `group.GET()` + 注释） |
| Go | Echo | 正则匹配（`e.GET()` + 注释） |

## 提取能力

脚本会自动提取以下信息：

- **HTTP 方法**：GET / POST / PUT / DELETE / PATCH 等
- **路由路径**：自动转换各框架路径参数格式为 OpenAPI `{param}` 格式
- **路径参数**：从路由模式中提取（含类型推断）
- **查询参数**：从函数签名中提取（Python 框架）
- **请求体**：从类型注解和 Pydantic 模型中推断（FastAPI）
- **响应模型**：从 `response_model` 参数中提取（FastAPI）
- **接口描述**：从 docstring / JSDoc / 行注释中提取
- **标签分组**：按源文件模块名自动分组

## 路径参数格式转换

| 框架 | 源格式 | 转换结果 |
|---|---|---|
| Flask | `<int:user_id>` | `{user_id}` (type: integer) |
| FastAPI | `{user_id}` | `{user_id}` (保持不变) |
| Express | `:user_id` | `{user_id}` |
| Gin/Echo | `:user_id` | `{user_id}` |

## 参数说明

| 参数 | 说明 | 默认值 |
|---|---|---|
| `source_dir` | 要扫描的源码目录（必填） | - |
| `-f, --format` | 输出格式：`json` 或 `yaml` | `json` |
| `-o, --output` | 输出文件路径 | stdout |
| `--framework` | 强制指定框架（不自动检测） | 自动检测 |
| `--title` | API 文档标题 | `API Documentation` |
| `--version` | API 版本号 | `1.0.0` |
| `--description` | API 描述文字 | 空 |
| `--server` | 服务器地址（可多次指定） | 无 |

## 输出示例

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

## 前置条件

- Python 3.8+
- 无需安装额外依赖，仅使用 Python 标准库
- 被扫描的项目需使用上述支持的 Web 框架

---
name: code-to-chart
description: "解析代码仓库的 import/依赖关系，自动生成架构图、流程图和组织架构图，输出 Mermaid 文本或 SVG 图片。支持 Python、JavaScript、TypeScript、Go 和 Java 项目。当用户需要可视化代码结构、分析模块依赖、生成架构文档，或提及“代码架构图”、“依赖关系图”、“流程图”、“组织架构图”、“Mermaid 图”等关键词时触发。"
license: MIT
type: tool
tags: ["visualization", "architecture", "mermaid", "ast", "diagram"]
---

# Diagram Maker

将代码仓库的 import/依赖关系通过 AST 解析提取出来，自动生成三种图表：

1. **架构图（Architecture Diagram）** — 模块/目录级别的依赖关系
2. **流程图（Flowchart）** — 文件级别的 import 调用链路
3. **组织架构图（Org Chart）** — 目录/文件的层级结构

支持语言：Python、JavaScript、TypeScript、Go、Java

输出格式：Mermaid 文本（`.mmd`）或 SVG 图片（需系统安装 `mmdc`）

## 使用方式

### 基础用法：分析整个项目

```bash
python3 scripts/analyze_codebase.py /path/to/project
```

输出三张 Mermaid 图到 stdout，同时写入当前目录下的 `.mmd` 文件。

### 指定图表类型

```bash
# 仅生成架构图
python3 scripts/analyze_codebase.py /path/to/project --type architecture

# 仅生成流程图
python3 scripts/analyze_codebase.py /path/to/project --type flowchart

# 仅生成组织架构图
python3 scripts/analyze_codebase.py /path/to/project --type org
```

### 指定输出目录和格式

```bash
# 输出到指定目录
python3 scripts/analyze_codebase.py /path/to/project --output /tmp/diagrams

# 输出 SVG（需要 mmdc）
python3 scripts/analyze_codebase.py /path/to/project --format svg

# 同时输出 Mermaid 和 SVG
python3 scripts/analyze_codebase.py /path/to/project --format both
```

### 输出 JSON 分析结果

```bash
python3 scripts/analyze_codebase.py /path/to/project --json
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `directory` | 要分析的代码目录（必填） |
| `--type, -t` | 图表类型：`architecture`、`flowchart`、`org`、`all`（默认 `all`） |
| `--output, -o` | 输出目录（默认当前目录） |
| `--format, -f` | 输出格式：`mermaid`、`svg`、`both`（默认 `mermaid`） |
| `--max-files` | 最大扫描文件数（默认 500） |
| `--max-depth` | 组织架构图最大深度（默认 4） |
| `--json` | 以 JSON 格式输出分析结果 |

## 工作原理

1. **扫描阶段**：递归遍历目录，跳过 `node_modules`、`.git`、`__pycache__` 等
2. **解析阶段**：
   - Python 文件使用 `ast` 模块解析 `import` 和 `from ... import` 语句
   - JS/TS 文件使用正则匹配 `import`、`require`、`export from`
   - Go 文件使用正则匹配 `import` 语句
   - Java 文件使用正则匹配 `import` 语句
3. **解析内部依赖**：将 import 路径映射到项目内的实际文件
4. **生成图表**：将依赖关系转为 Mermaid 图表语法
5. **渲染（可选）**：调用 `mmdc`（Mermaid CLI）将 `.mmd` 渲染为 SVG

## 适用场景

- 快速了解陌生项目的模块结构
- 代码审查时可视化依赖关系
- 编写技术文档中的架构图
- 发现循环依赖或过度耦合
- 项目重构前的结构分析

## 依赖

- Python 3.7+（标准库，无需额外安装）
- SVG 输出需要 `@mermaid-js/mermaid-cli`（可选）

## 注意事项

- 仅分析静态 import 关系，不追踪动态导入
- 大型项目建议使用 `--max-files` 限制扫描范围
- Mermaid 图在节点过多时可能渲染困难，建议配合 `--type` 分开查看

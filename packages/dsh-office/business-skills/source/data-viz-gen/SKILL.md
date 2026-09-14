---
name: data-viz-gen
description: "从 JSON 数据生成自包含的 HTML/SVG 信息图，支持 KPI 统计卡片、分组柱状图对比、流程图和混合仪表盘四种类型，提供 8 套配色方案和 24 个内置图标，输出完全自包含的 HTML 文件，无需外部依赖。当用户需要数据可视化、信息图、图表、仪表盘，或提及生成图表、制作 dashboard、展示统计数据等请求时触发。"
license: MIT
type: tool
tags: ["infographic", "visualization", "svg", "html", "chart", "dashboard"]
---

# Infographic Builder

从 JSON 数据生成自包含的 HTML/SVG 信息图，支持四种类型：

1. **统计卡片（stats）** — KPI 大数字 + 趋势箭头 + 图标
2. **数据对比（comparison）** — 分组柱状图，支持多系列
3. **流程图（flow）** — 步骤流程，带编号、图标和箭头连接
4. **仪表盘（dashboard）** — 混合布局：统计卡片 + 柱状图 + 环形图 + 流程

输出为 **完全自包含** 的 HTML 文件（CSS/SVG 全部内联，无外部依赖），可直接在浏览器打开。

## 使用方式

### 基础用法

```bash
python3 scripts/build_infographic.py config.json
```

也支持从 stdin 读取：

```bash
cat config.json | python3 scripts/build_infographic.py
```

脚本输出 JSON 状态到 stdout，生成的 HTML 写入 `output` 字段指定的路径。

### JSON 配置格式

通用字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 信息图标题 |
| `subtitle` | string | 否 | 副标题 |
| `type` | string | 是 | `stats` / `comparison` / `flow` / `dashboard` |
| `palette` | string | 否 | 配色方案（默认 `auto`） |
| `data` | object/array | 是 | 数据内容（格式取决于 type） |
| `output` | string | 否 | 输出文件路径（默认 `infographic.html`） |
| `footer` | string | 否 | 页脚文字 |

### 配色方案

可选值：`auto`（根据数据自动选择）、`ocean`、`sunset`、`forest`、`berry`、`vibrant`、`corporate`、`pastel`、`earth`

### 各类型 data 格式

#### 1. stats — 统计卡片

```json
{
  "type": "stats",
  "data": [
    {
      "label": "总收入",
      "value": "¥1.2M",
      "icon": "money",
      "trend": "+12.5%",
      "trend_dir": "up"
    },
    {
      "label": "用户数",
      "value": "45,230",
      "icon": "users",
      "trend": "+8.2%",
      "trend_dir": "up"
    }
  ]
}
```

**icon** 可选值：`users`、`user`、`money`、`percent`、`globe`、`clock`、`check`、`star`、`target`、`zap`、`chart-bar`、`chart-pie`、`database`、`rocket`、`shield`、`heart`、`light`、`search`、`mail`、`settings`、`flag`、`trending-up`、`trending-down`

**trend_dir**：`up`（绿色上升箭头）或 `down`（红色下降箭头）

#### 2. comparison — 数据对比柱状图

```json
{
  "type": "comparison",
  "data": {
    "chart_title": "季度营收对比",
    "categories": ["Q1", "Q2", "Q3", "Q4"],
    "series": [
      {"name": "2024", "values": [320, 410, 380, 520]},
      {"name": "2025", "values": [380, 490, 450, 610]}
    ]
  }
}
```

#### 3. flow — 流程图

```json
{
  "type": "flow",
  "data": [
    {"step": 1, "title": "需求分析", "description": "收集用户需求", "icon": "search"},
    {"step": 2, "title": "方案设计", "description": "制定技术方案", "icon": "light"},
    {"step": 3, "title": "开发实现", "description": "编码与测试", "icon": "settings"},
    {"step": 4, "title": "上线发布", "description": "部署到生产环境", "icon": "rocket"}
  ]
}
```

#### 4. dashboard — 混合仪表盘

```json
{
  "type": "dashboard",
  "data": {
    "stats": [
      {"label": "DAU", "value": "12.3K", "icon": "users", "trend": "+5%", "trend_dir": "up"},
      {"label": "转化率", "value": "3.8%", "icon": "target", "trend": "-0.2%", "trend_dir": "down"}
    ],
    "chart": {
      "chart_title": "月度趋势",
      "categories": ["1月", "2月", "3月", "4月"],
      "series": [{"name": "DAU", "values": [10200, 11500, 11800, 12300]}]
    },
    "breakdown": [
      {"label": "iOS", "value": 45},
      {"label": "Android", "value": 38},
      {"label": "Web", "value": 17}
    ],
    "flow": [
      {"step": 1, "title": "注册", "description": ""},
      {"step": 2, "title": "激活", "description": ""},
      {"step": 3, "title": "留存", "description": ""}
    ]
  }
}
```

## 输出格式

脚本在 stdout 输出 JSON 结果：

```json
{
  "status": "success",
  "output": "/absolute/path/to/infographic.html",
  "type": "stats",
  "title": "My Infographic",
  "palette": "auto",
  "size_bytes": 8432
}
```

错误时：

```json
{
  "status": "error",
  "errors": ["Missing required field: data"]
}
```

## 设计特点

- **零外部依赖**：纯 Python 标准库，无需 pip install
- **自包含输出**：HTML 内联所有 CSS 和 SVG，无需网络
- **响应式布局**：支持桌面和移动端浏览
- **专业配色**：8 套预设配色方案 + 自动选择
- **24+ 内置图标**：常用 SVG 图标，无需字体文件
- **中文友好**：字体栈包含思源黑体、苹方、微软雅黑

## 适用场景

- 数据报告中的可视化模块
- 产品数据仪表盘
- 业务流程说明
- 季度/月度数据对比
- 团队 KPI 展示

## 依赖

- Python 3.7+（仅使用标准库）

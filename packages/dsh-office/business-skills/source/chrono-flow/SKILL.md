---
name: chrono-flow
description: "根据JSON数据生成精美的交互式时间线HTML页面，支持垂直、水平、双侧三种布局，可自定义主题色、展开详情，并适配移动端。适合展示项目里程碑、产品版本记录、公司发展历程或个人简历。当用户提及制作时间线、历程图、历史记录可视化，或需要将一系列事件、日期与描述数据转换为网页时触发。"
license: MIT
type: tool
tags: ["timeline", "html", "visualization", "interactive", "responsive"]
---

# Timeline Designer

根据 JSON 配置数据生成精美的交互式时间线 HTML 页面，支持三种布局模式：

1. **垂直布局（vertical）** — 经典纵向时间线，事件卡片交替分布在轴线两侧
2. **水平布局（horizontal）** — 横向滚动时间线，适合展示较少事件
3. **双侧布局（dual-side）** — 根据 `side` 字段将事件分配到左右两侧，适合对比展示

所有布局均支持：
- 点击展开/收起事件详情
- 移动端自适应（响应式设计）
- 自定义主题色、图标、分类标签
- 纯静态 HTML，零依赖，可直接用浏览器打开

## 使用方式

### 基础用法：从 JSON 配置生成

```bash
python3 scripts/generate_timeline.py --config timeline_data.json --output timeline.html
```

### 从标准输入读取 JSON

```bash
cat timeline_data.json | python3 scripts/generate_timeline.py --stdin --output timeline.html
```

### 指定布局模式（覆盖配置文件中的设置）

```bash
python3 scripts/generate_timeline.py --config data.json --layout horizontal --output timeline.html
```

### JSON 配置格式

```json
{
  "title": "项目里程碑",
  "layout": "vertical",
  "theme": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#7c3aed",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "lineColor": "#d1d5db",
    "fontFamily": "system-ui, -apple-system, sans-serif"
  },
  "events": [
    {
      "date": "2024-01-15",
      "title": "项目启动",
      "summary": "完成立项审批，组建核心团队",
      "details": "详细说明文字，点击卡片后展开显示...",
      "icon": "🚀",
      "category": "里程碑",
      "color": "#10b981",
      "side": "left"
    }
  ]
}
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--config, -c` | JSON 配置文件路径（与 `--stdin` 二选一） |
| `--stdin` | 从标准输入读取 JSON |
| `--output, -o` | 输出 HTML 文件路径（默认输出到 stdout） |
| `--layout, -l` | 覆盖布局模式：`vertical`、`horizontal`、`dual-side` |
| `--title, -t` | 覆盖时间线标题 |

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `date` | ✅ | 时间标签，格式不限（如 `2024-01`、`Q1 2024`、`第一阶段`） |
| `title` | ✅ | 事件标题 |
| `summary` | ❌ | 简短描述，始终显示在卡片上 |
| `details` | ❌ | 详细内容，点击后展开显示 |
| `icon` | ❌ | emoji 或单字符图标（默认 `●`） |
| `category` | ❌ | 分类标签，显示在卡片上 |
| `color` | ❌ | 事件节点颜色（覆盖主题色） |
| `side` | ❌ | 仅 dual-side 布局有效：`left` 或 `right` |

## 适用场景

- 项目里程碑展示
- 产品发布历史
- 公司发展历程
- 个人简历时间线
- 教学课程大纲
- 任何需要按时间顺序展示信息的场景

## 依赖

- Python 3.6+（仅使用标准库，无需额外安装）

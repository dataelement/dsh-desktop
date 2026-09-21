---
name: gantt-chart-builder
description: "根据任务列表和依赖关系生成交互式HTML甘特图，支持关键路径分析（CPM），可视化项目时间线、依赖关系和可延迟的浮动时间。当用户提到甘特图、项目时间线、关键路径、任务排期、项目进度图、依赖关系可视化、工期计算或直接说“帮我排一下项目时间”、“生成一个项目进度图”、“分析一下哪些任务是关键路径”时触发。"
license: MIT
---

# project-timeline -- 交互式甘特图与关键路径分析

根据任务列表及其依赖关系，自动执行关键路径分析（CPM），生成可交互的 HTML 甘特图。支持缩放、关键路径筛选、悬停详情、依赖关系箭头可视化等功能。

## Quick Start

最简用法——直接传入 JSON：

```bash
python3 scripts/gantt_generator.py --json '{
  "project": "新产品上线",
  "tasks": [
    {"id": "T1", "name": "需求分析", "duration": 5, "dependencies": []},
    {"id": "T2", "name": "UI 设计", "duration": 4, "dependencies": ["T1"]},
    {"id": "T3", "name": "后端开发", "duration": 8, "dependencies": ["T1"]},
    {"id": "T4", "name": "前端开发", "duration": 6, "dependencies": ["T2"]},
    {"id": "T5", "name": "联调测试", "duration": 3, "dependencies": ["T3", "T4"]},
    {"id": "T6", "name": "上线部署", "duration": 2, "dependencies": ["T5"]}
  ]
}' --output gantt.html
```

从文件读取并指定开始日期：

```bash
python3 scripts/gantt_generator.py --file tasks.json --start-date 2026-05-01 --output gantt.html
```

## 方法论：关键路径法（CPM）

### 核心概念

| 术语 | 英文 | 含义 |
|------|------|------|
| 最早开始 | ES (Earliest Start) | 任务最早可以开始的时间 |
| 最早完成 | EF (Earliest Finish) | 任务最早可以完成的时间（ES + 工期） |
| 最晚开始 | LS (Latest Start) | 不影响项目总工期的最晚开始时间 |
| 最晚完成 | LF (Latest Finish) | 不影响项目总工期的最晚完成时间 |
| 总浮动 | Total Float | LS - ES，可延迟天数 |
| 关键路径 | Critical Path | 浮动时间为 0 的任务序列，决定项目最短工期 |

### 计算步骤

1. **拓扑排序**：按依赖关系对任务排序，同时检测循环依赖
2. **前推法（Forward Pass）**：从起始任务开始，计算每个任务的 ES 和 EF
   - `ES = max(所有前置任务的 EF)`
   - `EF = ES + 工期`
3. **后推法（Backward Pass）**：从最终任务反推，计算 LS 和 LF
   - `LF = min(所有后续任务的 LS)`
   - `LS = LF - 工期`
4. **识别关键路径**：浮动时间（LS - ES）为 0 的任务构成关键路径

## 输入格式

JSON 对象，包含以下字段：

```json
{
  "project": "项目名称",
  "start_date": "2026-05-01",
  "tasks": [
    {
      "id": "T1",
      "name": "任务名称",
      "duration": 5,
      "dependencies": ["T0"]
    }
  ]
}
```

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| project | 否 | string | 项目标题，默认"项目甘特图" |
| start_date | 否 | string | YYYY-MM-DD 格式，可被 CLI `--start-date` 覆盖 |
| tasks | 是 | array | 任务列表 |
| tasks[].id | 是 | string | 任务唯一标识 |
| tasks[].name | 是 | string | 任务名称 |
| tasks[].duration | 是 | number | 工期（天），必须 > 0 |
| tasks[].dependencies | 否 | array | 前置任务 ID 列表，默认 [] |

## 输出功能

生成的 HTML 文件是完全自包含的（无外部依赖），包含以下交互功能：

- **甘特图可视化**：任务条形图，横轴为时间，纵轴为任务
- **关键路径高亮**：红色标记关键任务，蓝色标记非关键任务
- **依赖关系箭头**：SVG 绘制的依赖连线，关键依赖用红色加粗
- **浮动时间显示**：橙色半透明区域展示任务可延迟空间
- **悬停详情**：鼠标悬停显示完整的 CPM 分析数据
- **任务高亮**：点击任务可高亮其直接依赖和后续任务
- **缩放控制**：滑块调整时间轴精度
- **关键路径筛选**：一键切换仅显示关键路径任务
- **今日标线**：绿色竖线标记当前日期
- **JSON 导出**：导出带 CPM 标注的完整数据

## 脚本参数

```
python3 scripts/gantt_generator.py [参数]

必填参数（二选一）：
  --json TEXT          JSON 格式任务数据字符串
  --file PATH          JSON 文件路径

可选参数：
  --start-date DATE    项目开始日期 (YYYY-MM-DD)，默认今天
  --output, -o PATH    输出 HTML 路径，默认输出到 stdout
  --title TEXT         覆盖项目标题
```

## 完整示例

### 场景：软件开发项目排期

```json
{
  "project": "CRM系统 v2.0 开发",
  "start_date": "2026-05-05",
  "tasks": [
    {"id": "A", "name": "需求调研", "duration": 5, "dependencies": []},
    {"id": "B", "name": "架构设计", "duration": 3, "dependencies": ["A"]},
    {"id": "C", "name": "UI/UX 设计", "duration": 4, "dependencies": ["A"]},
    {"id": "D", "name": "数据库设计", "duration": 2, "dependencies": ["B"]},
    {"id": "E", "name": "后端 API 开发", "duration": 10, "dependencies": ["D"]},
    {"id": "F", "name": "前端页面开发", "duration": 8, "dependencies": ["C", "D"]},
    {"id": "G", "name": "单元测试", "duration": 3, "dependencies": ["E"]},
    {"id": "H", "name": "集成测试", "duration": 4, "dependencies": ["F", "G"]},
    {"id": "I", "name": "用户验收", "duration": 3, "dependencies": ["H"]},
    {"id": "J", "name": "部署上线", "duration": 2, "dependencies": ["I"]}
  ]
}
```

分析结果：
- 总工期：32 天
- 关键路径：A → B → D → E → G → H → I → J
- UI/UX 设计(C)有浮动时间，可适当延后而不影响总工期

## 注意事项

- 输入中不能存在循环依赖（A 依赖 B，B 又依赖 A），脚本会检测并报错
- 工期单位为"天"，不区分工作日和节假日
- 所有任务 ID 必须唯一
- 生成的 HTML 无需网络连接即可打开使用

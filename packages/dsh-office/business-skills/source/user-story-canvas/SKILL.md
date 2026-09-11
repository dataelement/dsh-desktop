---
name: user-story-canvas
description: "将产品需求可视化为交互式HTML用户故事地图，按Epic → Feature → Story三层结构组织，支持MoSCoW优先级色标和版本发布划线分组。当用户提到用户故事地图、story mapping、需求地图、epic feature story、backlog可视化、MoSCoW优先级、release planning、版本规划地图、产品路线图可视化，或直接说“帮我画一张故事地图”、“把需求按版本排列出来”时触发。"
license: MIT
---

# User Story Mapper — 用户故事地图 HTML 生成器

将产品需求按 **Epic → Feature → Story** 三层结构可视化为交互式 HTML 页面，支持 MoSCoW 优先级色标 + Release 版本划线。

---

## Quick Start

用户只需提供产品需求信息，Agent 负责：

1. 引导用户梳理 Epic / Feature / Story 层级
2. 确认 MoSCoW 优先级和 Release 归属
3. 构建 JSON 数据并调用脚本生成 HTML
4. 输出可直接浏览器打开的自包含 HTML 文件

用户只需说：
> "帮我画一个故事地图，我有 3 个 Epic，包含用户注册、商品浏览、下单支付"

Agent 会引导用户逐步完成整个故事地图构建。

---

## 一、核心概念

### 三层结构

| 层级 | 含义 | 示例 |
|------|------|------|
| **Epic** | 大的价值主题 / 用户活动 | 用户注册与登录 |
| **Feature** | Epic 下的功能模块 | 手机号注册、邮箱注册、第三方登录 |
| **Story** | 最小可交付的用户故事 | 作为用户，我可以用手机号+验证码注册 |

### MoSCoW 优先级

| 级别 | 含义 | 色标 |
|------|------|------|
| **Must** | 必须有，缺了产品不可用 | 🔴 红色 |
| **Should** | 应该有，显著提升价值 | 🟠 橙色 |
| **Could** | 可以有，锦上添花 | 🔵 蓝色 |
| **Wont** | 本次不做，记录备忘 | ⚪ 灰色 |

### Release 划线

水平分割线将故事卡片按版本归组：
- Release 1（MVP）线以上 = 第一个版本必须交付的
- Release 2 线以上 = 第二个版本计划交付的
- 以此类推

---

## 二、工作流程

### Step 1：收集需求信息

向用户了解以下内容：

| 信息项 | 必填 | 说明 |
|--------|------|------|
| 项目名称 | ✅ | 显示在地图标题 |
| Epic 列表 | ✅ | 2-8 个 Epic |
| 每个 Epic 的 Feature | ✅ | 每个 Epic 下 1-6 个 Feature |
| 每个 Feature 的 Story | ✅ | 每个 Feature 下 1-10 个 Story |
| 每个 Story 的优先级 | ✅ | must / should / could / wont |
| 每个 Story 的 Release | ✅ | 归属哪个版本 |
| Release 列表 | ✅ | 版本名称和描述 |
| Story Points（可选） | ❌ | 估算工作量 |
| Story 描述（可选） | ❌ | 补充说明 |

### Step 2：构建 JSON 数据

按以下格式组织数据：

```json
{
  "project": "电商平台 MVP",
  "releases": [
    {"name": "Release 1", "description": "MVP 核心功能"},
    {"name": "Release 2", "description": "体验优化"},
    {"name": "Release 3", "description": "增长功能"}
  ],
  "epics": [
    {
      "name": "用户系统",
      "features": [
        {
          "name": "注册登录",
          "stories": [
            {
              "name": "手机号注册",
              "priority": "must",
              "release": "Release 1",
              "points": 3,
              "description": "用户可以通过手机号+验证码完成注册"
            },
            {
              "name": "微信登录",
              "priority": "should",
              "release": "Release 2",
              "points": 5
            }
          ]
        }
      ]
    }
  ]
}
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `project` | string | ✅ | 项目名称 |
| `releases` | array | ✅ | 版本列表（按顺序排列） |
| `releases[].name` | string | ✅ | 版本名，需与 Story 中的 release 字段匹配 |
| `releases[].description` | string | ❌ | 版本描述 |
| `epics` | array | ✅ | Epic 列表 |
| `epics[].name` | string | ✅ | Epic 名称 |
| `epics[].features` | array | ✅ | Feature 列表 |
| `epics[].features[].name` | string | ✅ | Feature 名称 |
| `epics[].features[].stories` | array | ✅ | Story 列表 |
| `stories[].name` | string | ✅ | Story 名称 |
| `stories[].priority` | string | ✅ | must / should / could / wont |
| `stories[].release` | string | ✅ | 归属版本名 |
| `stories[].points` | number | ❌ | Story Points |
| `stories[].description` | string | ❌ | 补充描述 |

### Step 3：调用脚本生成 HTML

```bash
# 从 JSON 文件生成
python3 scripts/generate_story_map.py --input data.json --output story_map.html

# 从 stdin 读取 JSON
echo '{"project":"demo",...}' | python3 scripts/generate_story_map.py --output story_map.html
```

#### 命令参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--input` | ❌ | 输入 JSON 文件路径（不提供则从 stdin 读取） |
| `--output` | ✅ | 输出 HTML 文件路径 |

### Step 4：交付 HTML

脚本会生成一个**自包含的 HTML 文件**（无外部依赖），特性包括：

- 📊 Epic → Feature → Story 三层卡片布局
- 🎨 MoSCoW 优先级色标
- 📏 Release 版本划线分组
- 📱 响应式设计，支持水平滚动
- 🖨️ 打印友好（自动适配 A3 横版）
- 💡 鼠标悬停显示 Story 详情
- 📈 统计面板（各优先级/版本的 Story 数量和 Points 汇总）

---

## 三、引导话术参考

### 开场

> 我来帮你构建用户故事地图。请先告诉我：
> 1. 项目名称是什么？
> 2. 主要有哪些大的功能模块（Epic）？
> 3. 计划分几个版本发布？

### 逐步引导

> 好的，我们来梳理「{Epic名}」这个 Epic：
> - 它包含哪些具体的功能（Feature）？
> - 每个功能下有哪些用户故事（Story）？

### 确认优先级

> 以下是「{Feature名}」下的故事列表，请确认每个的优先级：
> | Story | 建议优先级 | 你的确认 |
> |-------|-----------|---------|
> | ... | Must | |

### 确认版本归属

> 请确认每个 Story 归属哪个 Release 版本：
> - Release 1（MVP）：核心必备功能
> - Release 2：体验优化
> - Release 3：增长功能

---

## 四、注意事项

1. **数据校验**：脚本会自动检查 Story 引用的 Release 名是否存在于 releases 列表中
2. **优先级校验**：priority 只接受 must / should / could / wont 四个值
3. **空数据处理**：如果某个 Feature 下没有 Story，该列会显示空白占位
4. **中英文兼容**：项目名、Epic 名等支持中英文混合
5. **大地图提示**：如果 Story 总数超过 50 个，建议拆分为多张子地图

---
name: flashcard-studio
description: "从学习材料（文本、Markdown、笔记）中提取核心知识点，生成符合间隔重复记忆原理的正面问题+反面答案闪卡，输出可直接导入Anki的CSV文件。当用户提到闪卡、Anki、记忆卡片、知识点提取、复习卡片、间隔重复，或需要将学习内容转换成问答对进行复习时触发。"
license: MIT
---

# flashcard-generator

从学习材料中自动提取知识点，生成「正面问题 + 反面答案」格式的闪卡，输出可直接导入 [Anki](https://apps.ankiweb.net/) 的 CSV 文件。

支持两种工作模式：
- **auto 模式**：基于规则从 Markdown/纯文本中提取定义、Q&A、列表等结构化知识点
- **json 模式**：接收预构造的 JSON 闪卡数据，格式化为 Anki CSV

## Quick Start

```bash
# 从 Markdown 笔记自动提取闪卡
python scripts/generate_flashcards.py --input notes.md --output flashcards.csv

# 从 JSON 数据生成 Anki CSV（适合 agent 调用）
python scripts/generate_flashcards.py --mode json --input cards.json --output flashcards.csv

# 通过 stdin/stdout 使用
cat notes.md | python scripts/generate_flashcards.py > flashcards.csv
```

## Agent 工作流

当用户提供学习材料要求生成闪卡时，推荐流程：

1. **读取材料**：读取用户提供的学习材料文件
2. **智能提取**：分析材料内容，提取核心知识点，生成高质量的问答对。遵循以下原则：
   - 每张卡片聚焦一个知识点（最小信息原则）
   - 正面用精确的问题形式，避免模糊提问
   - 反面给出简洁但完整的答案
   - 覆盖核心概念、定义、公式、因果关系、对比等
3. **生成 CSV**：将提取的问答对写为 JSON，调用脚本转为 Anki CSV
4. **交付文件**：告知用户输出路径和导入方法

### Agent 调用示例

将提取的知识点构造为 JSON 数组，通过 `--mode json` 转为 CSV：

```bash
cat <<'EOF' > /tmp/cards.json
[
  {"front": "什么是光合作用？", "back": "植物利用光能将CO₂和H₂O转化为有机物并释放O₂的过程", "tags": "biology"},
  {"front": "光合作用的化学方程式是什么？", "back": "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", "tags": "biology"}
]
EOF
python scripts/generate_flashcards.py --mode json --input /tmp/cards.json --output flashcards.csv
```

## 参数说明

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--input, -i` | 输入文件路径 | stdin |
| `--output, -o` | 输出 CSV 文件路径 | stdout |
| `--mode, -m` | 提取模式：`auto`（规则提取）或 `json`（结构化输入） | auto |
| `--no-tags` | 不输出 tags 列 | 包含 tags |
| `--separator, -s` | CSV 分隔符：`\t`、`;`、`,` | Tab |

## 输出格式

生成的 CSV 遵循 Anki 导入规范：

```
#separator:Tab
#html:true
#columns:Front	Back	Tags
什么是光合作用？	植物利用光能将CO₂和H₂O转化为有机物并释放O₂的过程	biology
```

### 导入 Anki 的步骤

1. 打开 Anki → 文件 → 导入
2. 选择生成的 CSV 文件
3. Anki 会自动识别分隔符和列映射
4. 确认后点击「导入」

## Auto 模式支持的知识结构

| 结构类型 | 示例 | 生成的闪卡 |
|---|---|---|
| 定义（Term: Definition） | `光合作用：植物利用光能...` | Q: 什么是光合作用？ A: 植物利用光能... |
| Q&A 对 | `Q: 什么是DNA？ A: 脱氧核糖核酸` | 直接提取为闪卡 |
| 标题+列表 | `## 细胞器 - 线粒体 - 核糖体` | Q: 细胞器的关键要点有哪些？ A: 列表 |
| 标题+段落 | `## 牛顿第一定律 一切物体...` | Q: 请解释：牛顿第一定律 A: 段落内容 |

## 前置条件

- Python 3.6+
- 无需安装额外依赖（仅使用标准库）

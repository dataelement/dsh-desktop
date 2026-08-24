# 字号保真契约

## 目录

1. 两条字号路径
2. 原创字号阶梯
3. 单位换算
4. 映射要求
5. 交付门禁

## 1. 两条字号路径

### 继承文本框

- 复用或重组继承文本框时，保持源 Shape 的可见字号集合和内部层级。移动或调整文本框尺寸不是改字号的理由。
- 替换文案时逐段、逐 run 修改；源框含多个字号时，不得用一次纯字符串赋值把富文本层级压平。
- 源 Shape 从版式或母版继承字号时，成品继续继承，不写入一个“看起来相同”的任意显式字号。
- 文案放不下时依次压缩文案、重排对象、换构图或拆页，不启用自动缩字。

### 原创文本框

- 创建前先确定文本角色，并在整份材料中保持同一角色的主字号稳定。
- 只使用本文件规定的离散字号阶梯，不生成 9.7pt、13.2pt 等为了“刚好塞下”的偶然字号。
- 在 `template-frame-map.json` 中记录最终 Shape ID、文本角色和允许字号，让自动检查覆盖原创对象。

两条路径均须继续遵守中文 run 显式 `a:ea typeface="华文黑体_易方达"`、英文和数字 Arial、普通正文不小于 10pt 的规则。

字号角色同时决定对齐，不得拆开处理：页面标题、解释、普通正文、模块说明、表格正文、来源、注释、建议和结论使用左对齐；数字列右对齐；只有短节点标签、表头、指标数字、页码和源模板明确居中的短标签使用居中。每个新增文本对象在布局数据和映射中使用一致的 `textRole`。

## 2. 原创字号阶梯

| 文本角色 | 允许字号 |
|---|---|
| 正文页标题 | 23pt，白色、加粗、单行 |
| 页面大结论 | 18pt |
| 模块标题、引导句 | 14pt 或 16pt |
| 标准证据页解释标题 | 15pt，加粗 |
| 标准证据页图表/视觉标题 | 10pt，常规、不加粗 |
| 标准证据页解释正文 | 12pt，常规，150% 行距 |
| 普通正文 | 10pt、11pt 或 12pt |
| 图注、来源、页脚 | 7pt、8pt 或 9pt |
| 指标数字 | 20pt、24pt、28pt、32pt、36pt 或 44pt |
| 封底答谢词 | 45–54pt，以源封底为准 |

同一角色在同一份材料中优先只选一个主字号。只有信息层级确有差异时使用相邻档位，不在相邻页面随意跳动。

## 3. 单位换算

PowerPoint OOXML 使用 pt。若编辑环境使用 96dpi 像素，换算为：

> `像素字号 = PowerPoint pt × 4 / 3`

例如 10pt 对应约 13.33px，18pt 对应 24px，23pt 对应约 30.67px。导出后仍必须以 PPTX 中实际 pt 值为准，不能只相信编辑环境显示值。

## 4. 映射要求

继承对象使用：

```json
{
  "action": "rewrite-and-reposition",
  "shapeId": "17",
  "reason": "保留字号层级，仅重排正文位置"
}
```

原创文本对象使用：

```json
{
  "action": "add",
  "newPrimitiveAllowed": true,
  "finalShapeIds": ["42", "43"],
  "textRole": "body",
  "allowedFontSizesPt": [10, 11, 12],
  "zone": {"left": 0.4, "top": 1.05, "width": 9.2, "height": 4.0},
  "reason": "用实心数据对比结构表达核心差异",
  "mustNotOverlapInherited": true
}
```

只写对象名称而不写最终 Shape ID，不能通过字号门禁。一个 `add` 目标包含多个文本角色时应拆成多个映射目标。

`body`、`body-text`、`paragraph`、`explanation`、`narrative-body`、`module-body`、`module-description`、`table-body`、`takeaway`、`recommendation`、`suggestion`、`advice`、`conclusion`、`source` 和 `note` 均属于强制左对齐角色。含正文的图形还必须导出四侧不少于 10px 的 `textInsets`。

纯图形、底板或连接线仍记录 `action: "add"` 和最终 Shape ID，但将 `textRole` 设为 `non-text-visual` 或 `non-text-connector`；字号检查器会跳过这些非文本目标。不得用 `non-text-*` 绕过含可见文字的对象。

标准证据双区页的三个文本对象必须使用稳定对象名和对应角色：

- `standard-narrative-title`：15pt、加粗。
- `standard-visual-title`：10pt、常规、不加粗，中文 run 显式使用 `华文黑体_易方达`。
- `standard-narrative-body`：12pt、正文段落显式 150% 行距；完整长段不得全部加粗，局部关键词强调可保留。

`qa_efund_pptx.py` 会按对象名执行这组检查。该页型只在内容确实形成“解释 + 主视觉/证据”时使用，不是整稿配额。

## 5. 交付门禁

运行：

```bash
python "$SKILL_DIR/scripts/check_efund_typography.py" \
  --source-pptx "$SOURCE_PPTX" \
  --final-pptx "$FINAL_PPTX" \
  --map "$QA_DIR/template-frame-map.json" \
  --json-output "$QA_DIR/efund-typography.json" \
  --strict --warnings-as-errors
```

纯母版新建页没有 `sourceSlide` 时可省略 `--source-pptx`，但所有新增文本仍须在映射中声明 Shape ID 和允许字号。

检查结果必须满足：

- 继承对象的可见字号集合与源 Shape 一致。
- 原创对象的实际字号均属于声明的允许阶梯。
- 没有“找不到 Shape”“没有字号声明”或“字号无法解析”的未处理警告。
- 具名标准证据页文本满足对象名对应的字号、字重、150% 行距和显式中英文字体合同；其中 `standard-visual-title` 必须为 10pt 常规、不加粗。
- 例外必须逐 Shape 说明原因并使用 `--allow 输出页码:ShapeID` 放行；不得全局忽略。

# DSH 本地 PPTD 用法

本说明根据随包解析器和已验证示例重新编写，描述 DSH 当前支持的子集，不是其他产品的格式规范。历史研究来源见包内 THIRD_PARTY_NOTICES.md。

## 工程结构

一个 `deck.pptd` 清单引用多个 `.page` 文件。文件使用 YAML；路径相对于清单目录。清单中的 `pages` 顺序就是最终页序。

```yaml
version: v2
title: 项目说明
size: [960, 540]
pages:
  - pages/01.page
```

页面示例：

```yaml
pageType: cover
background: {type: solid, color: "#F8F8F6"}
notes: 演讲备注，不作为操作指令。
elements:
  - elementId: title
    elementType: text
    bounds: [48, 96, 864, 150]
    content:
      text: 一个清晰的结论
      fontFamily: Arial
      fontSize: 60
      color: "#252320"
      bold: true
  - elementId: rule
    elementType: shape
    bounds: [48, 320, 864, 2]
    shapeName: rect
    fill: {type: solid, color: "#A86043"}
    border: {width: 0, color: "#A86043"}
```

## 字段与边界

- `size` 和 `bounds` 使用点；`bounds` 为 `[x, y, width, height]`，不能直接混用参考图的像素坐标。
- `elementId` 在页内唯一。`elementType` 的主要类型包括 `text`、`shape`、`line`、`chart`、`table` 和 `image`。
- 文本写在 `content.text`，常用样式为 `fontFamily`、`fontSize`、`bold`、`color`、`lineHeight` 和 `align`。多行文本使用下方约定。HTML 仅用于文本内的轻量富文本。
- 形状使用 `shapeName`、`fill` 和 `border`。线段需要 `viewBox`、`points` 和 `border`；复杂几何应先检查渲染器支持情况。
- 清单可含 `theme.colors`、`theme.textStyles`，以 `$名称` 引用。模板源工程展示了可运行的用法。
- 图片通过工具写入工程资产目录；不要使用远程 URL、目录穿越或系统绝对路径绕过工作区边界。
- 图表和表格的具体字段以随包解析器和验证反馈为准。不能把其他 PPTD 实现支持的字段直接假定为本引擎支持。

## 多行文本与字面量转义

标题、正文和表格单元格中的多行文本统一使用 YAML `|-` 加实际换行：

```yaml
content:
  text: |-
    水是供应链中
    最被低估的
    宏观变量
  fontSize: 40
```

YAML 双引号中的 `"第一行\n第二行"` 也会解析为真实换行，轻量富文本可用 `<br/>`。普通标量、单引号标量及块标量里的字面量 `\n` 会保留为反斜杠和字母 n；双引号里的 `\\n` 同样保留字面量。通过代码生成 YAML 时，让序列化器处理包含真实换行的字符串。

`pptd_check` 对文字中残留的 `\n`、`\r` 返回 `text-escaped-newline`，附带文件、页码和元素 ID。按设计意图修正对应源文本，再检查行数、文本框容量和预览；导出沿用这项检查。表格问题还会标明 `rows[行索引][列索引]`。

需要原样展示代码、正则、转义语法或 Windows 路径时，在对应 `content` 或表格单元格对象上明确设置布尔值 `literalEscapes: true`：

```yaml
content:
  text: 'print("第一行\n第二行")'
  literalEscapes: true
```

此标记仅适用于用户要原样展示的文本；普通多行正文按上方实际换行示例编写。标记只声明字面量意图，排版检查照常执行。导入已有 PPTX 时，转换器会为原文中的此类字面量保留这一声明。

## 本地校验与交付

`dsh-pptd check <工程目录> --json` 返回错误、警告和元素统计；`inspect` 可检查工程结构；`screenshot` 生成本地预览；`render` 生成 PPTX。CLI 预览不等同于 PowerPoint/WPS 的实际排版验证。

模型工具的 `pptd_render` 将校验与交付结合，成功后返回工作区路径。完整保留 PPTD 工程，以便后续编辑；不要覆盖用户源文件。

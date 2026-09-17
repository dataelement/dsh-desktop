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
- 文本写在 `content.text`，常用样式为 `fontFamily`、`fontSize`、`bold`、`color`、`lineHeight` 和 `align`。可以使用换行；不要把 HTML 页面当作完整幻灯片输入。
- 形状使用 `shapeName`、`fill` 和 `border`。线段需要 `viewBox`、`points` 和 `border`；复杂几何应先检查渲染器支持情况。
- 清单可含 `theme.colors`、`theme.textStyles`，以 `$名称` 引用。模板源工程展示了可运行的用法。
- 图片通过工具写入工程资产目录；不要使用远程 URL、目录穿越或系统绝对路径绕过工作区边界。
- 图表和表格的具体字段以随包解析器和验证反馈为准。不能把其他 PPTD 实现支持的字段直接假定为本引擎支持。

## 本地校验与交付

`dsh-pptd check <工程目录> --json` 返回错误、警告和元素统计；`inspect` 可检查工程结构；`screenshot` 生成本地预览；`render` 生成 PPTX。CLI 预览不等同于 PowerPoint/WPS 的实际排版验证。

模型工具的 `pptd_render` 将校验与交付结合，成功后返回工作区路径。完整保留 PPTD 工程，以便后续编辑；不要覆盖用户源文件。

# Word 和 Excel 工程格式

Office 工程使用 UTF-8 JSON，路径以 `.office.json` 结尾。只读检查返回全部错误与 JSON 路径。修改源工程后重新校验，导出使用新的 DOCX/XLSX 文件名。

## Word

```json
{
  "version": 1,
  "kind": "word",
  "title": "项目周报",
  "blocks": [
    {"type": "heading", "level": 1, "text": "项目周报"},
    {"type": "paragraph", "text": "本周完成首轮验证，下一步安排用户试用。"},
    {"type": "heading", "level": 2, "text": "本周进展"},
    {"type": "list", "items": ["完成文档结构校验", "整理试用反馈"]},
    {"type": "table", "header": true, "rows": [["事项", "状态"], ["首轮验证", "完成"]]}
  ]
}
```

支持 `heading`（level 1–3）、`paragraph`、`list`、`table`、`pageBreak`。表格各行列数一致，单元格填写字符串。每个工程最多 1000 个内容块，每张表最多 500 行、12 列。默认 A4、原生标题层级与列表编号，表头跨页重复。

## Excel

```json
{
  "version": 1,
  "kind": "excel",
  "title": "采购汇总 示例数据",
  "sheets": [
    {"name": "采购", "columnWidths": [24, 16, 16, 18], "freezeRows": 1, "filter": true,
     "rows": [["品类", "数量", "单价 元", "金额 元"], ["样品", 3, 120, {"formula": "=B2*C2", "format": "number"}]]}
  ]
}
```

单元格接受字符串、有限数值、布尔值、null 或 `{formula, format?}`。以 `=` 开头的普通字符串仍为文字；公式通过 `formula` 字段显式声明。`format` 支持 `number`、`percent`、`currency`。金额单位写在列名中。日期当前以清楚的 ISO 日期文字存储；金额和比例的输入单元格可保留原始数值。

支持最多 32 个工作表、每表 10000 行、256 列，工程总计 50000 个单元格。表名唯一。公式保留原文，导出设置打开时重算；工具返回 `recalculation: NOT_RUN` 与缺少缓存数量。完成 Excel/WPS 重算并核对结果后才说明计算通过。

## 工具顺序

1. 读取材料：`office_inspect` 返回 DOCX 内容块、XLSX 单元格与公式。超过 `max_items` 时用 `nextOffset` 继续读取，并核对各页 SHA-256 一致。`contentTruncated` 表示单项文字或表格也超过了返回上限，需明确指出已读取范围。
2. 新建工程：`office_write_project(project_path, content, expected_revision: null)`。
3. 修改工程：`office_read_project` 取得完整 JSON 与 SHA-256；调整内容后写入，传入该 SHA-256。
4. `office_check` 校验，按 `issues[].path` 修复。错误返回 `needs_revision`，保留现有工程与产物。
5. `office_export(project_path, expected_revision, output_file)` 导出，传入检查后的 SHA-256 和新的文件名。它会重新校验并读取实际导出字节。
6. 对真实 DOCX/XLSX 执行版面和目标应用验收；汇报工具实际返回的路径及验证状态。

`office_inspect` 读取原文件的结构。对外部文档重建工程时，图片、图表、页眉页脚、批注、修订、合并单元格和高级样式需要专门的保真编辑能力；当前格式只表达本页列出的元素。需要保留这些内容的任务先说明具体缺口，保留原文件。检查发现的外部链接、嵌入对象只作为风险信息返回。

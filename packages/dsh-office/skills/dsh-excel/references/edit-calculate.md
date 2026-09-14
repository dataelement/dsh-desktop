# Excel 局部修改与重算

先用 `office_inspect(file_path, offset?, max_items?)` 查看文件和所需范围，保留返回的 `sha256`。分页读取使用同一未修改文件。

局部修改调用：

```json
{
  "file_path": "采购.xlsx",
  "expected_revision": "读取的 SHA-256",
  "output_file": "采购调整.xlsx",
  "operations": [
    {"sheet":"采购", "cell":"B2", "value":4},
    {"sheet":"采购", "cell":"D2", "value":{"formula":"=B2*C2"}}
  ]
}
```

`office_excel_edit` 直接处理原文件中已存在的单元格，保留单元格样式与其他部件，清空全表公式缓存。它适合改输入值、文字和普通公式。创建新范围或重构表格使用新建路线，并先盘点原文件对象的保留要求。数组/共享公式和合并区域需要完整范围的编辑能力。

实际重算调用 `office_recalculate(file_path, expected_revision, output_file, checks?)`。`checks` 格式为 `{sheet, cell, expected, tolerance?}`，预期值从原始材料独立核对。工具清空旧缓存并强制计算，核对工作表身份、原始输入、公式和结果，将新缓存写回原文件副本。原始格式、关系、命名区域、图表和条件格式继续保留；图表缓存的独立警告需要查看预览。

只有返回 `status="recalculated"` 和 `calculation="PASS"` 才表明实际执行成功。检查失败、公式错误、缺少缓存或引擎不可用会阻止发布结果；此前文件保持可用。`independentChecks="NOT_RUN"` 表示未提供独立数值检查。

重算后交付工具返回的新文件及对应哈希。再次读取文件只会看到存储缓存；保留本次重算工具返回的执行证据。后续任何输入或公式修改都需要再次重算。

使用 `office_preview` 生成 PDF，逐页检查图表、打印范围和数字。特别核对普通 `#` 开头文字、以 `=` 开头的字符串、跨表公式、空字符串结果和布尔结果。原生 Excel/WPS 保存重开单独验收。

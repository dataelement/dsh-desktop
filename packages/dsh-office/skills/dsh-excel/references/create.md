# 创建 Excel 工作簿

`office_build(language="python", source, inputs, output_file)` 使用已安装的 Python 和固定版本 `openpyxl==3.1.5`。脚本得到 `office["inputs"]`、`office["output"]`、`office["directory"]`。先用 `office_source` 读取输入哈希，再以 `{file_path, expected_revision}` 声明。目录中只有输入副本和临时产物，网络关闭。Python 标准库可用于读取 CSV/JSON 等材料；openpyxl 用于工作簿、公式、格式、图表和条件格式。

可运行的示例，实际任务用真实数据替换：

```python
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.workbook.properties import CalcProperties

wb = Workbook()
ws = wb.active
ws.title = '采购'
for row in [['品类', '数量', '单价', '金额'], ['材料 A', 3, 120, '=B2*C2'], ['材料 B', 5, 80, '=B3*C3'], ['合计', None, None, '=SUM(D2:D3)']]:
    ws.append(row)
for cell in ws[1]:
    cell.font = Font(bold=True, color='FFFFFF')
    cell.fill = PatternFill('solid', fgColor='234E70')
for column, width in [('A', 24), ('B', 14), ('C', 16), ('D', 18)]:
    ws.column_dimensions[column].width = width
for row in ws.iter_rows(min_row=2, max_row=4, min_col=3, max_col=4):
    for cell in row:
        cell.number_format = '#,##0.00'
ws.freeze_panes = 'B2'
ws.auto_filter.ref = 'A1:D3'
ws.conditional_formatting.add('D2:D3', ColorScaleRule(start_type='min', start_color='EDF3F7', end_type='max', end_color='5688A8'))
chart = BarChart()
chart.title = '采购金额'
chart.y_axis.scaling.min = 0
chart.add_data(Reference(ws, min_col=4, min_row=1, max_row=3), titles_from_data=True)
chart.set_categories(Reference(ws, min_col=1, min_row=2, max_row=3))
ws.add_chart(chart, 'F2')
ws.print_options.horizontalCentered = True
ws.print_area = 'A1:N17'
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.orientation = 'landscape'
ws.page_setup.paperSize = ws.PAPERSIZE_A4
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 1
wb.calculation = CalcProperties(calcMode='auto', fullCalcOnLoad=True)
wb.save(office['output'])
```

派生值保留公式。普通以 `=` 开头的文字写入后设置对应 `cell.data_type='s'`。原始数据与假设说明单位、日期和来源。按目标 Excel 版本选择函数。图表使用实际原生数据引用，并核对分类范围和数值范围。

生成后使用 `office_recalculate`，以上例子的独立检查可以是 `[{"sheet":"采购","cell":"D4","expected":760}]`。随后预览并检查页面。`openpyxl` 保存只生成文件，计算结果由后续引擎提供。

已有复杂文件局部编辑按 `excel-edit-calculate` 路线处理。官方库说明：[图表](https://openpyxl.readthedocs.io/en/stable/charts/introduction.html)、[读取已有工作簿及保留限制](https://openpyxl.readthedocs.io/en/stable/tutorial.html)。

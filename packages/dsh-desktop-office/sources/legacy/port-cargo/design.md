# 青岚港货物流向与作业效率

## 版式与执行

365 天、2,190 条模拟装卸记录；吞吐波动、进出港结构、航线与作业效率。5 张工作表。

调用 office_template 准备原生工作副本和参考输入。使用官方 office-docx 或 office-xlsx Skill 与安装级 Python 修改文稿、数据和图表；用官方 LibreOffice Kit 重算 Excel 并渲染最终文件，逐页核对结果，再用 present 交付。

基础流程 office-xlsx，业务方法 dataset-health-audit、data-viz-gen。港口名称与数据均为模拟。inputs/port.json 包含 365 天、2,190 条装卸记录，一条记录表示一次进港卸货或出港装货作业。货物吨数与箱量 TEU 分别统计，装卸总量按作业计算。所有原始记录保留，日度与作业明细预览前 39 行。8 张原生图表引用计算单元格，汇总与效率由公式推导。checks.json 从原始 JSON 独立计算。更换时间范围时同步调整脚本日期、公式边界、图表轴范围和检查值。

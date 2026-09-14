# 青岚港货物流向与作业效率

## 版式与执行

365 天、2,190 条模拟装卸记录；吞吐波动、进出港结构、航线与作业效率。5 张工作表。

使用 DSH 自有基础 Skill 和 office_template 返回的 authoring 执行 office_build。保持输入顺序与修订哈希。生成后调用 office_recalculate（Excel）与 office_preview，核对所有展示页。当前案例通过 DSH 工具直接生成；模型自主规划的结果需另行验收。

基础流程 dsh-excel，业务方法 dataset-health-audit、data-viz-gen。港口名称与数据均为模拟。inputs/port.json 包含 365 天、2,190 条装卸记录，一条记录表示一次进港卸货或出港装货作业。货物吨数与箱量 TEU 分别统计，装卸总量按作业计算。所有原始记录保留，日度与作业明细预览前 39 行。8 张原生图表引用计算单元格，汇总与效率由公式推导。checks.json 从原始 JSON 独立计算。更换时间范围时同步调整脚本日期、公式边界、图表轴范围和检查值。

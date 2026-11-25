# Hero options 原生插槽迁移

适用版本：Harness 0.2.2-rc.1。

Office/PPT 模式按钮由私有 `conversation.hero.modeActions` 迁入上游原生 `conversation.hero.options`。原生插槽为 session scope，只在已有 Session 时渲染；创建 Session 前不显示模式按钮，不修改上游门控。

conversation 补丁移除私有插槽的运行时、类型、渲染出口及 hero 布局覆盖样式；保留独立的 dock、workbench frame、品牌和附件接缝。这部分私有插槽兼容补丁已满足移除条件，不再维护。

回归：`ppt-integration` 验证原生插槽只渲染一次、session scope 和私有出口清除；`workbench-office-actions` 验证 Office/PPT 贡献项 ID 不冲突、工作台切换不影响其他动作；`office-ppt-mode-switch`、`ppt-unbound-mode`、`office-templates-ui` 覆盖模式与模板交互。

实际 Desktop 安装及界面验收与构建分别记录，源码测试通过不代表已安装应用已更新。

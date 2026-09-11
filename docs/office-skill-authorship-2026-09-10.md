# DSH Office Skill 来源与执行范围

## 自有基础流程

`dsh-word` 与 `dsh-excel` 按本项目的用户需求和 `office_*` 工具合同编写，沿用项目 MIT 许可。基础流程覆盖任务分析、业务 Skill 组合、文档/工作簿设计、创建、局部修改、重算、检查与预览。运行库使用 docx、openpyxl 和 LibreOffice，各依赖保留各自的许可与分发说明。

## 内置业务资源

用户提供的 185 个业务 Skill 原包及单独提供的公文写作 Skill 按原文保留，共 186 个业务 Skill。资源出处、文件哈希和原始声明记录在 [业务目录](../packages/dsh-office/business-skills/catalog.json) 与 [NOTICE](../packages/dsh-office/business-skills/NOTICE.md)。业务资源适用原始条款；DSH 的运行工具映射和能力说明在独立代码中维护。

用户提供的 Kimi docx.skill / xlsx.skill 用于此前效果对比；本功能的基础入口是 DSH 自有的两个 Skill。名称迁移兼容仅用于清理旧会话中的基础流程上下文。

## 案例和验证

六个展示案例的来源、制作方式和复现范围见 [案例说明](../packages/dsh-office/templates/README.md)。模式选择会加载对应基础 Skill，业务 Skill 由当前任务意图决定。选择展示卡片会打开预览。

源码、自动验证、运行时制品以及原生应用验收分别记录在 [STATUS](STATUS.md)。此文记录资源来源与实际实施范围；第三方资源的原始声明保留在包中。

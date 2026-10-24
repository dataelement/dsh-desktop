# 会议纪要案例重新筛选

2026-10-12。当前 Word 外显目录为公文通知、咖啡市场调研、小米汽车研究三份案例。会议纪要、总结、日报和方案已撤下。业务方法继续保留，新的会议成品先在评审阶段验证。

## 选择标准

优先选择中文项目评审会或业务周例会。成品需要有具体议题、关键讨论、最终决策、责任人、期限和待确认事项；原始会议记录与成品配对，用于核对事实和结论变化。首屏呈现会议主题与主要结果，后续页清晰组织议题和行动项。原生 Word 保持段落与表格可编辑，分页随内容自然形成。

案例评审分开记录：源材料与内容质量、原生文件与版式、模型再生成结果。用用户真实材料在 DSH 验证后再决定外显案例。

## 候选一 飞书官方智能纪要演示

[官方文章及效果预览入口](https://www.feishu.cn/content/article/7577317993749269689)包含日常业务会议的效果说明，并提供[完整妙记演示](https://digitalsolution.feishu.cn/minutes/obcnnwwo59v68fh2q3nfc6i1)。官方展示的方向包括主题总结、关键结论、待办和原文定位。

用户已明确授权只读这一条演示的总结、待办和原始转写，并保存到本地临时目录，仅用于案例评估。2026-10-12 用户完成两项读取 scope 的授权后，该条读取成功：总结、3 条待办、5 个章节和 5943 字符的完整转写已在本地取得。原始材料保存在忽略的本地评审目录，产品外显目录继续保持三个已认可案例。

逐项对照结果：

- 转写包含明确的业务目标、产品演讲时长、部门分工、交付依赖及相对期限，适合作为日常项目会议底稿。
- 原摘要覆盖主要议题，但遗漏两项“今天下班前”的交付和“明天下午”的详细方案对齐。返回的 3 条待办把多名人员与多项工作合并，缺少逐项责任和期限。
- 发布会真实产品演示属于讨论建议；另有 LM 宣传物料的抽象、交互式 Demo 方向。两种用途需要分别表达。
- 产品手册的 H5 / PDF 形式、具体交付排期与效果数字继续待确认，保持原文建议与确定安排的区别。

已依据完整转写制作[两页可编辑 Word 评审稿](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-meeting-case-review-20261012/发布会筹备对齐_案例评审稿.docx)：第一页为会议结果、分工与待确认事项，第二页为 10 项行动记录、责任分工及时间依赖。使用本地确定性生成器制作，完成 DOCX 原生结构检查和两页逐页渲染检查；材料与产物只用于本地案例评估。用户对成品质量的评审、DSH 真实模型再生成、原生 Office 编辑保存重开仍为 `NOT_RUN`。

### DSH 内置 Skill 实际评估

用户反馈上述两页稿内容简单、版式普通，并要求使用 DSH 内置 Skill。用户另行明确授权本条演示转写和制作任务发送到开发版已配置的阿里云百炼模型，仅用于本次案例评估。

使用官方 Harness `0.2.0-rc.2` headless，在独立评估目录运行同一会话；实际加载 r11 安装包的 `meeting-recap`、官方 `office-docx` 和安装级依赖工具，模型为开发版已配置的 `deepseek-v4-pro-0813`。安装资源来自 r11 的 `V0.12.0@1fe2cd4b`，本轮只读观察到远程版本分支已推进至 `ab419d21`；评估沿用 r11 安装资源，产品代码保持当前交付版本。生成时使用安装级 Python 和安装包 Electron / Kit `0.1.3`；凭据通过宿主服务解析，生成进程采用工作区写入、网络隔离及拒绝升权策略。

首次实际输出出现相对日期换算依据不足、部分来源归属错误，以及等宽窄列、孤立标题和空白尾页。通过同一 DSH 会话反馈内容与逐页版式问题后完成[三页内置 Skill 评审稿](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-meeting-case-review-20261012/dsh-builtin/发布会筹备对齐_内置Skill定稿.docx)，保留五个议题与十五项行动记录，使用原生标题样式、10.2 / 3.1 / 3.7cm 行动表及相对期限。Word 文件及其修订由 DSH 模型执行，Codex 提供复核反馈和独立检查。

实际模型 / Skill 加载、原生 DOCX 结构、行动项来源与期限核对、官方 Kit 导出和三个页面的逐页视觉检查 PASS；最终字体诊断为空。所选 DSH 模型的图片输入返回不可用，逐页视觉检查由 Codex 完成。[评估证据](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-meeting-case-review-20261012/dsh-builtin/delivery-evidence.json)保存执行日志关联、资源与文件哈希、原生列宽及验收边界。用户对最终成品质量的认可待取得；实际 Desktop UI、原生 Office 编辑保存重开为 `NOT_RUN`。本轮验证的是经过复核的内置流程成品，首轮默认输出的质量问题仍需作为后续 Skill 改进依据。

## 候选二 NHSBT 公开纪要与行动表

[官方会议材料目录](https://www.nhsbt.nhs.uk/who-we-are/transparency/board-meetings-and-papers/board-papers-july-2025/)同时提供[2025年5月20日公开董事会纪要草稿](https://nhsbtdbe.blob.core.windows.net/umbraco-assets-corp/36882/agenda-item-13-draft-minutes-of-board-meeting-in-public-20-may-2025v3final.pdf)与[配套行动表](https://nhsbtdbe.blob.core.windows.net/umbraco-assets-corp/36883/agenda-item-14-board-in-public-action-log-for-july-2025-meeting-updated-on-3-june-2025.pdf)。纪要为14页，行动表为1页；纪要文件标注为待董事会确认的草稿。

已读取正文并视觉检查纪要第2页和行动表。正文按议题编号组织讨论与决定；行动表把任务关联到纪要议题，并列出责任人、期限、进度和完成依据。这些结构可作为内容核对参考。

版面偏正式和密集，行动表为横向多列；适合作为治理会议结构样本。日常项目会议的 Word 成品仍需重新组织首屏、正文层级和行动表列宽。当前只列为参考候选，原始逐字稿配对、中文 Word 重建及模型再生成验证均待完成。

## 当前结论

用户于 2026-10-12 确认三页 DSH 内置 Skill 成品“看着还行，就用这个吧”。此稿作为新的 `meeting-minutes` 原生模板输入接入 Word 入口，配合内置会议 Skill 与官方 Office Skill；原始转写及模型日志保留在本地评估目录。Word 展示公文通知、会议纪要、咖啡市场调研和小米汽车研究四个案例，Excel 保留原有三个案例。NHSBT 继续作为决策与行动项关联方式的参考材料。

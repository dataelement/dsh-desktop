---
name: pro-email-composer
description: "商务邮件写作助手，为催办、跟进、拒绝、感谢、道歉、通知、请求、介绍、投诉等常见场景生成得体邮件，并根据收件人身份（如上级、平级、下属、客户、供应商或陌生人）自动校准语气与措辞，支持中英文双语输出。当用户需要撰写邮件、寻找邮件模板，或提及任何具体邮件场景如催办邮件、跟进邮件、拒绝信、感谢信、道歉函、通知、请求函、介绍信、投诉函，以及对应的英文关键词如 business email, follow-up email, reminder email, thank-you email, apology email, complaint email 等时触发。"
license: MIT
---

# Biz Email Writer — 商务邮件写作知识库

帮助用户撰写专业、得体的商务邮件。覆盖常见场景（催办/跟进/拒绝/感谢/道歉/通知/请求/介绍/投诉），按收件人身份自动调整语气，中英双语输出。

## Quick Start

用户只需说明：
1. **场景**：催办 / 跟进 / 拒绝 / 感谢 / 道歉 / 通知 / 请求 / 介绍 / 投诉
2. **收件人身份**：上级 / 平级同事 / 下属 / 客户 / 供应商 / 外部陌生人
3. **语言**：中文 / 英文 / 中英双语
4. **关键信息**：具体事项、时间节点、背景

示例：
> "帮我写一封催办邮件，收件人是供应商的项目经理，催他们下周三前交付第二批样品，语气礼貌但坚定，英文。"

---

## 一、语气校准矩阵（Tone Calibration Matrix）

根据收件人身份和邮件场景，从 5 级语气中选取合适等级：

| 语气等级 | 标签 | 中文特征 | 英文特征 |
|---------|------|---------|---------|
| L1 | 恭敬 Deferential | 敬语多、请示语气、"请您百忙中…" | "I would be most grateful if…", "At your convenience…" |
| L2 | 礼貌 Polite | 标准商务礼貌、"麻烦您…"、"感谢您…" | "Could you please…", "Thank you for…" |
| L3 | 平等 Collegial | 简洁直接、"我们可以…"、"建议…" | "Let's…", "I suggest we…", "Happy to…" |
| L4 | 指导 Directive | 明确期望、"请在…之前完成" | "Please ensure…", "I need you to…" |
| L5 | 严肃 Firm | 正式警告语气、"务必"、"若未能…将…" | "This is to formally notify…", "Failure to… will result in…" |

### 场景 × 收件人 → 语气等级速查表

| 场景 \ 收件人 | 上级 | 平级同事 | 下属 | 客户 | 供应商 | 外部陌生人 |
|-------------|------|---------|------|------|--------|----------|
| 催办 Reminder | L1-L2 | L2-L3 | L3-L4 | L2 | L2-L3 | L2 |
| 跟进 Follow-up | L1-L2 | L3 | L3 | L2 | L2-L3 | L2 |
| 拒绝 Decline | L2 | L3 | L3 | L2 | L2-L3 | L2 |
| 感谢 Thank-you | L1-L2 | L2-L3 | L2-L3 | L2 | L2 | L2 |
| 道歉 Apology | L1 | L2 | L2-L3 | L1-L2 | L2 | L2 |
| 通知 Notice | L1-L2 | L3 | L3-L4 | L2 | L2-L3 | L2 |
| 请求 Request | L1 | L2-L3 | L3-L4 | L2 | L2-L3 | L2 |
| 介绍 Introduction | L2 | L3 | L3 | L2 | L2 | L2 |
| 投诉 Complaint | — | L3 | — | — | L3-L4 | L3-L4 |

> 注：向上级投诉不常见；向下属投诉应改用绩效面谈而非邮件。

---

## 二、邮件结构框架（Email Architecture）

每封商务邮件由 5 个区块组成，每个区块都有明确的功能：

```
┌─────────────────────────────────┐
│  Subject Line（主题行）          │ ← 一句话概括目的+关键信息
├─────────────────────────────────┤
│  Opening（开头）                 │ ← 称呼 + 破冰/上下文衔接
├─────────────────────────────────┤
│  Body（正文）                    │ ← 核心诉求，1-3 段，最重要的放最前
├─────────────────────────────────┤
│  Call to Action（行动号召）       │ ← 明确的下一步 + 截止时间
├─────────────────────────────────┤
│  Closing（结尾）                 │ ← 致谢/期望 + 签名
└─────────────────────────────────┘
```

### 2.1 主题行公式（Subject Line Formulas）

| 场景 | 中文公式 | 英文公式 | 示例 |
|------|---------|---------|------|
| 催办 | 【提醒】{事项} — 请于{日期}前回复 | Reminder: {Topic} — Response Needed by {Date} | Reminder: Q3 Report — Response Needed by Oct 15 |
| 跟进 | 跟进：{事项}的进展 | Following Up: {Topic} | Following Up: Partnership Proposal Discussion |
| 拒绝 | 关于{事项}的回复 | Re: {Topic} — Update | Re: Vendor Proposal — Update |
| 感谢 | 感谢您在{事项}中的支持 | Thank You for {Specific Action} | Thank You for Your Support at the Summit |
| 道歉 | 关于{事项}的说明与致歉 | Regarding {Issue} — Our Apologies | Regarding the Shipping Delay — Our Apologies |
| 通知 | 【通知】{事项}，请知悉 | Notice: {Topic Change/Update} | Notice: Office Relocation Effective Nov 1 |
| 请求 | 请求协助：{事项} | Request: {Specific Need} | Request: Access to Q4 Marketing Data |
| 介绍 | 介绍：{人名} — {身份/合作背景} | Introduction: {Name} — {Context} | Introduction: Sarah Chen — Potential Design Partner |
| 投诉 | 关于{事项}的正式反馈 | Formal Feedback: {Issue} | Formal Feedback: Recurring Delivery Delays |

---

## 三、场景模板库（Scenario Templates）

### 3.1 催办邮件 / Reminder Email

**适用场景**：对方未按期回复、交付物延迟、会议未确认。

**写作要点**：
- 开头回顾上次沟通的时间和内容（提供上下文，避免指责感）
- 说明催办原因（为什么现在需要，而不是"你迟到了"）
- 给出明确的新截止时间
- 提供替代方案或提出帮助（降低对方压力）

**中文模板**（收件人：供应商，语气 L2-L3）：

```
主题：【提醒】第二批样品交付 — 请于4月18日前确认

王经理，您好：

上次沟通中，我们约定第二批样品于4月15日交付。目前尚未收到发货通知，
想跟您确认一下当前的进展情况。

由于我方产品测试排期已确定（4月22日启动），样品需在4月18日（周五）
前到达。如交付时间有变动，还请尽早告知，以便我们协调后续安排。

如有任何困难需要我方配合的，请随时沟通。

期待您的回复，谢谢！

[签名]
```

**英文模板**（收件人：供应商，语气 L2-L3）：

```
Subject: Reminder: Second Sample Batch — Confirmation Needed by April 18

Dear Mr. Wang,

I'm writing to follow up on our agreement for the second batch of samples,
originally scheduled for delivery by April 15. We have not yet received
a shipping notification and would appreciate an update on the current status.

As our product testing is set to begin on April 22, we need the samples
to arrive by Friday, April 18. Should there be any changes to the timeline,
please let us know at your earliest convenience so we can adjust accordingly.

If there's anything we can do on our end to facilitate the delivery,
please don't hesitate to reach out.

Looking forward to your reply.

Best regards,
[Signature]
```

---

### 3.2 跟进邮件 / Follow-up Email

**适用场景**：会议后跟进、提案发出后等待回复、项目阶段性沟通。

**写作要点**：
- 引用上次互动的具体时间和内容
- 简要重申关键共识或待定事项
- 提出下一步建议或问题
- 不施加压力，保持积极

**中文模板**（收件人：客户，语气 L2）：

```
主题：跟进：上周合作方案讨论

张总，您好：

感谢您上周三（4月9日）会议中抽出时间讨论合作方案。

根据会上讨论，我们已针对您提出的定制化需求调整了方案，主要变更包括：
1. 交付周期从8周缩短至6周
2. 新增第二阶段的用户测试环节
3. 报价已更新（详见附件）

如方案内容无异议，我们可以安排在本周内签署合同并启动项目。
若您还有其他疑问或调整需求，欢迎随时交流。

祝商祺！

[签名]
```

**英文模板**（收件人：客户，语气 L2）：

```
Subject: Following Up: Collaboration Proposal Discussion

Dear Mr. Zhang,

Thank you for taking the time to discuss the collaboration proposal
during our meeting last Wednesday (April 9).

Based on our conversation, we've revised the proposal to address your
customization requirements. Key changes include:
1. Delivery timeline shortened from 8 weeks to 6 weeks
2. Addition of a user testing phase in Stage 2
3. Updated pricing (see attachment)

If everything looks good, we'd be happy to arrange contract signing
and project kickoff this week. Please feel free to reach out if you
have any further questions or adjustments.

Best regards,
[Signature]
```

---

### 3.3 拒绝邮件 / Decline Email

**适用场景**：拒绝提案/报价、婉拒会议邀请、回绝合作请求。

**写作要点**：
- 先表达感谢（对方的时间、提案、邀请）
- 清晰说明拒绝决定（不要含糊不清让对方抱有希望）
- 给出简要理由（不需要过度解释）
- 保留关系（提出未来合作可能或替代方案）

**中文模板**（收件人：供应商，语气 L2-L3）：

```
主题：关于贵方报价方案的回复

李经理，您好：

感谢您提供的详细报价方案，我们已认真评估。

经内部讨论，本次我们决定选择其他供应商的方案，主要原因是交付周期
与我方项目排期的匹配度。这并非对贵方产品质量的否定。

后续若有适合的合作机会，我们会优先联系贵方。
再次感谢您的时间和专业支持。

此致

[签名]
```

**英文模板**（收件人：供应商，语气 L2-L3）：

```
Subject: Re: Quotation Proposal — Update

Dear Mr. Li,

Thank you for providing the detailed quotation. We've carefully
reviewed your proposal.

After internal discussion, we've decided to move forward with
another vendor for this project, primarily due to delivery timeline
alignment. This is in no way a reflection on the quality of your
products or services.

We value the relationship and will certainly keep you in mind
for future opportunities. Thank you again for your time and
professionalism.

Kind regards,
[Signature]
```

---

### 3.4 感谢邮件 / Thank-you Email

**适用场景**：项目完成致谢、活动后感谢、获得帮助后致谢。

**写作要点**：
- 具体说明感谢的事项（避免泛泛的"谢谢"）
- 指出对方的贡献产生了什么积极影响
- 如适用，提及未来持续合作的意愿

**中文模板**（收件人：上级，语气 L1-L2）：

```
主题：感谢您在Q1项目评审中的指导

刘总，您好：

Q1项目评审已顺利结束，特此感谢您在评审过程中给予的指导，
尤其是关于用户留存指标的分析思路，帮助团队重新梳理了优化方向。

基于您的建议，我们已调整了Q2的重点任务。后续有阶段性进展时，
会及时向您汇报。

再次感谢您的支持！

[签名]
```

**英文模板**（收件人：外部合作伙伴，语气 L2）：

```
Subject: Thank You for Your Support at the Annual Summit

Dear Dr. Miller,

I wanted to express my sincere gratitude for your keynote presentation
at our Annual Summit last Friday. Your insights on sustainable supply
chain practices resonated deeply with our attendees.

The post-event survey showed a 95% satisfaction rate for your session,
and several team leads have already begun exploring the frameworks
you introduced.

We'd love to explore opportunities for continued collaboration.
Please let me know if you'd be open to a follow-up conversation.

With appreciation,
[Signature]
```

---

### 3.5 道歉邮件 / Apology Email

**适用场景**：交付延迟、质量问题、沟通失误、服务中断。

**写作要点**：
- 开头直接承认问题（不绕弯子）
- 简明说明原因（不推卸责任，不过度解释）
- 提出具体补救措施和时间表
- 承诺改进（要具体，不要空洞承诺）

**中文模板**（收件人：客户，语气 L1-L2）：

```
主题：关于4月10日发货延迟的说明与致歉

陈总，您好：

就4月10日贵方订单（#20260410-A）的发货延迟，我代表团队
向您致以诚挚的歉意。

延迟原因为我方仓储系统升级期间出现数据迁移异常，导致出库
流程中断约18小时。目前系统已恢复正常，您的订单已于4月12日
发出，预计4月15日送达。

为表歉意，本次订单我们将承担全部加急运费，同时为您的下一笔
订单提供5%的折扣。

我们已针对本次事故完善了系统升级的应急预案，确保类似情况
不再发生。如有任何其他问题，请随时与我联系。

诚挚致歉

[签名]
```

**英文模板**（收件人：客户，语气 L1-L2）：

```
Subject: Regarding the April 10 Shipping Delay — Our Apologies

Dear Mr. Chen,

I sincerely apologize for the delay in shipping your order
(#20260410-A) originally scheduled for April 10.

The delay was caused by a data migration issue during a warehouse
system upgrade, which disrupted our fulfillment process for
approximately 18 hours. The system has been fully restored, and
your order was shipped on April 12 with an estimated delivery
date of April 15.

As a gesture of goodwill, we are covering all expedited shipping
costs for this order and offering a 5% discount on your next purchase.

We have since implemented an improved contingency plan for system
upgrades to prevent recurrence. Please don't hesitate to contact me
if you have any further concerns.

Sincerely,
[Signature]
```

---

### 3.6 通知邮件 / Notice Email

**适用场景**：政策变更、人事任命、办公地点变更、系统维护。

**写作要点**：
- 主题行标注【通知】便于收件人识别优先级
- 开头一句话概括变更内容
- 正文说明生效时间、影响范围、需要收件人做什么
- 提供联系方式以便咨询

**中文模板**（收件人：全体同事，语气 L3）：

```
主题：【通知】报销系统升级 — 4月20日起启用新流程

各位同事：

财务部将于4月20日起启用新版报销系统。主要变更如下：

■ 变更内容：
  - 报销申请统一通过新系统提交（旧系统4月19日24:00关闭）
  - 审批流程由3级简化为2级
  - 新增电子发票自动识别功能

■ 需要您做的：
  - 4月19日前完成旧系统中所有未提交的报销单
  - 登录新系统完成账号激活（操作指南见附件）

如有疑问，请联系财务部 张明（分机 8012）或发邮件至
finance@company.com。

感谢配合！

财务部
[日期]
```

---

### 3.7 请求邮件 / Request Email

**适用场景**：请求数据/资源、请求审批、请求会议、请求支援。

**写作要点**：
- 开头说明请求的背景（为什么需要）
- 明确请求内容（具体、可执行）
- 说明时间要求和优先级
- 表达感谢，降低对方的负担感

**中文模板**（收件人：上级，语气 L1）：

```
主题：请求协助：Q2市场预算审批

王总，您好：

Q2市场推广计划已完成初稿（详见附件），需要您审批预算部分后
方可推进执行。

主要预算项包括：
- 线上广告投放：¥150,000
- KOL合作：¥80,000
- 线下活动：¥60,000
- 合计：¥290,000（较Q1增长12%，主要增量来自KOL合作）

如您方便，希望能在4月18日前得到反馈，以便团队按计划于4月21日
启动投放。

如需进一步说明或面对面汇报，请告知您方便的时间。

感谢您的时间！

[签名]
```

---

## 四、高频短语库（Phrase Bank）

### 4.1 开场白 / Opening Lines

| 用途 | 中文 | 英文 |
|------|------|------|
| 首次联系 | 冒昧打扰，我是[公司][姓名]，负责… | I'm reaching out from [Company] regarding… |
| 回复邮件 | 感谢您的来信 / 收到您的邮件，回复如下 | Thank you for your email / Further to your email… |
| 会议跟进 | 感谢[日期]会议中的交流 | Thank you for the productive discussion on [date] |
| 经人介绍 | 经[姓名]介绍，了解到贵方在…方面的需求 | [Name] suggested I reach out to you regarding… |
| 久未联系 | 好久没联系，希望一切顺利 | I hope this message finds you well. It's been a while since… |

### 4.2 催办/提醒 / Nudge Phrases

| 紧急度 | 中文 | 英文 |
|--------|------|------|
| 温和 | 想跟您确认一下进展 | Just checking in on the status of… |
| 标准 | 麻烦您在[日期]前反馈 | Could you please provide an update by [date]? |
| 较急 | 由于[原因]，此事较为紧急 | This has become time-sensitive due to [reason] |
| 加急 | 务必在[日期]前完成，否则将影响… | We need this by [date] to avoid impacting… |

### 4.3 拒绝/婉拒 / Decline Phrases

| 策略 | 中文 | 英文 |
|------|------|------|
| 委婉拒绝 | 经慎重考虑，我们暂时无法… | After careful consideration, we're unable to… at this time |
| 给出理由 | 主要原因是… | The primary reason is… |
| 留有余地 | 未来如有合适机会，我们会… | We'd welcome the opportunity to revisit this in the future |
| 推荐替代 | 建议您也可以联系… | You might also want to consider reaching out to… |

### 4.4 结束语 / Closing Lines

| 场景 | 中文 | 英文 |
|------|------|------|
| 等待回复 | 期待您的回复 | Looking forward to your reply |
| 提供帮助 | 如有疑问，请随时联系 | Please don't hesitate to reach out if you have any questions |
| 表达期待 | 期待合作 / 期待后续进展 | Looking forward to working together |
| 正式 | 此致敬礼 / 顺祝商祺 | Sincerely / Best regards / Kind regards |
| 半正式 | 祝好 / 谢谢 | Thanks / Best / Cheers (同事间) |

### 4.5 签名称谓 / Sign-off（按正式程度排序）

| 正式度 | 英文 | 适用场景 |
|--------|------|---------|
| ★★★★★ | Respectfully yours | 政府/法律/极正式场合 |
| ★★★★ | Sincerely | 首次联系/正式商务 |
| ★★★ | Best regards / Kind regards | 标准商务（最常用） |
| ★★ | Best / Thanks | 熟悉的商务往来 |
| ★ | Cheers / Talk soon | 关系密切的同事 |

---

## 五、中英文化差异要点（Cultural Notes）

### 5.1 中文商务邮件特点
- **称呼讲究职位**："张总"、"李经理"、"王博士"，避免直呼其名
- **开头常有寒暄**："百忙之中打扰"、"近来可好"
- **间接表达偏好**：拒绝时倾向于"目前条件尚不成熟"而非直说"不行"
- **结尾注重礼节**："顺祝商祺"、"此致敬礼"不可省略（正式场合）
- **落款含头衔**：姓名 + 职位 + 部门 + 公司是标配

### 5.2 英文商务邮件特点
- **称呼简洁**：Dear Mr./Ms. + 姓氏；熟悉后可用 Dear + 名字
- **直奔主题**：第一段就说明邮件目的，无需过多铺垫
- **语气积极**：即使拒绝也倾向于正面表达（"We appreciate…" → "Unfortunately…" → "We'd love to…"）
- **行动导向**：每封邮件明确 next step 和 deadline
- **签名简洁**：Best regards + 名字即可，不需要过多头衔

### 5.3 常见错误对照

| 错误 | 问题 | 修正 |
|------|------|------|
| "Dear friend" | 过于亲密/不专业 | Dear Mr./Ms. [Last Name] |
| "Please kindly…" | 语义重复（please=kindly） | Please… 或 Kindly… 择一 |
| "As per my last email" | 带有被动攻击语气 | As mentioned in my previous email / To follow up on… |
| "Hope this email finds you well" 过度使用 | 已成陈词滥调 | 根据场景选择更具体的开场 |
| 中文邮件用"你"称呼客户/上级 | 不够尊重 | 使用"您" |
| 中文邮件缺少落款 | 不专业 | 必须有：姓名、职位、联系方式 |
| 全篇大写 (ALL CAPS) | 等同于"吼叫" | 正常大小写 |

---

## 六、邮件写作检查清单（Pre-send Checklist）

发送前逐项检查：

- [ ] **收件人**：To/Cc/Bcc 是否正确？是否误加了不相关的人？
- [ ] **主题行**：是否清晰概括了邮件核心？对方看到主题能否判断优先级？
- [ ] **称呼**：姓名和职位是否正确？拼写无误？
- [ ] **语气**：与收件人身份匹配吗？有无过于随意或过于生硬之处？
- [ ] **正文**：核心诉求是否在前 3 行就出现？段落是否简短（每段≤5行）？
- [ ] **行动项**：有无明确的 next step？截止时间是否清晰？
- [ ] **附件**：提到的附件是否已添加？
- [ ] **签名**：信息完整且最新？
- [ ] **语法/拼写**：有无错别字、语法错误？
- [ ] **敏感内容**：是否有不适合以邮件形式传达的内容（如负面绩效反馈）？

---

## 七、升级与降级策略（Escalation Ladder）

当催办无效时，按以下阶梯升级语气：

```
第 1 次：温和提醒（发送后 3-5 个工作日）
  → "想跟您确认一下…的进展"
  
第 2 次：明确催办（再过 3 个工作日）
  → "由于[原因]，此事较为紧急，麻烦在[日期]前回复"
  
第 3 次：升级通知（再过 2 个工作日）
  → "如未能在[日期]前收到回复，我将需要升级至[上级/管理层]处理"
  
第 4 次：正式函件（最终手段）
  → 转为正式书面函件，抄送双方管理层
```

英文对应：
```
1st: Gentle nudge — "Just checking in on…"
2nd: Clear reminder — "This is time-sensitive. Could you respond by [date]?"
3rd: Escalation notice — "Without a response by [date], I'll need to escalate to [manager]"
4th: Formal letter — CC both management teams
```

---

## 八、特殊场景处理

### 8.1 抄送（CC）策略
- **抄送上级**：催办第 2 次仍无回复时，或涉及跨部门协调
- **抄送团队**：信息同步类邮件，或需要团队成员配合的事项
- **密送（BCC）**：仅用于群发通知保护隐私，不可用于"暗中告状"

### 8.2 转发注意事项
- 转发前检查邮件链中是否有不适合让新收件人看到的内容
- 添加转发说明："转发以下邮件供您参考，背景是…"

### 8.3 紧急邮件
- 主题行添加【紧急】或 [URGENT]
- 开头第一句说明紧急原因和需要的响应时间
- 仅在真正紧急时使用，避免"狼来了"效应

---

## 九、Agent 行为指南

当用户要求写商务邮件时，按以下流程执行：

1. **确认关键信息**：场景、收件人身份、语言、核心内容、截止时间
2. **查表确定语气等级**：根据"场景 × 收件人"矩阵选择语气
3. **套用结构框架**：主题行 → 开头 → 正文 → 行动号召 → 结尾
4. **选择合适短语**：从短语库中选取与语气等级匹配的用语
5. **文化适配**：根据语言选择应用中文或英文文化规范
6. **输出并说明**：输出完整邮件，并简要标注语气等级和关键选择理由

**输出格式要求**：
- 中文邮件使用中文标点
- 英文邮件每段之间空一行
- 占位符用方括号标注，如 [公司名称]、[具体日期]
- 如用户未指定信息，用占位符并提醒用户补充

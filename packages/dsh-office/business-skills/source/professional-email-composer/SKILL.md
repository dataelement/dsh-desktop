---
name: professional-email-composer
description: "Write professional business emails for reminders, follow-ups, declines, thank-yous, apologies, and more, with tone automatically adjusted for the recipient's role and bilingual Chinese-English support. Trigger when users ask to draft an email, need a template, or mention specific email types like a reminder, follow-up, rejection, or complaint."
license: MIT
---

# Professional Email Composer — Business Email Writing Knowledge Base

Helps users craft professional, appropriate business emails. Covers common scenarios (reminders / follow-ups / declines / thank-yous / apologies / notices / requests / introductions / complaints), automatically adjusts tone based on recipient role, and outputs in both Chinese and English.

## Quick Start

Users only need to specify:
1. **Scenario**: Reminder / Follow-up / Decline / Thank-you / Apology / Notice / Request / Introduction / Complaint
2. **Recipient Role**: Supervisor / Peer colleague / Subordinate / Client / Vendor / External stranger
3. **Language**: Chinese / English / Bilingual
4. **Key Details**: Specific matter, deadlines, background context

Example:
> "Write a reminder email to a vendor's project manager, urging them to deliver the second batch of samples by next Wednesday. Tone should be polite but firm, in English."

---

## 1. Tone Calibration Matrix

Select the appropriate tone level from 5 grades based on recipient role and email scenario:

| Tone Level | Label | Chinese Characteristics | English Characteristics |
|-----------|-------|------------------------|----------------------|
| L1 | Deferential | Heavy use of honorifics, requesting tone, "请您百忙中…" | "I would be most grateful if…", "At your convenience…" |
| L2 | Polite | Standard business courtesy, "麻烦您…", "感谢您…" | "Could you please…", "Thank you for…" |
| L3 | Collegial | Concise and direct, "我们可以…", "建议…" | "Let's…", "I suggest we…", "Happy to…" |
| L4 | Directive | Clear expectations, "请在…之前完成" | "Please ensure…", "I need you to…" |
| L5 | Firm | Formal warning tone, "务必", "若未能…将…" | "This is to formally notify…", "Failure to… will result in…" |

### Scenario × Recipient → Tone Level Quick Reference

| Scenario \ Recipient | Supervisor | Peer | Subordinate | Client | Vendor | External Stranger |
|---------------------|-----------|------|------------|--------|--------|------------------|
| Reminder | L1-L2 | L2-L3 | L3-L4 | L2 | L2-L3 | L2 |
| Follow-up | L1-L2 | L3 | L3 | L2 | L2-L3 | L2 |
| Decline | L2 | L3 | L3 | L2 | L2-L3 | L2 |
| Thank-you | L1-L2 | L2-L3 | L2-L3 | L2 | L2 | L2 |
| Apology | L1 | L2 | L2-L3 | L1-L2 | L2 | L2 |
| Notice | L1-L2 | L3 | L3-L4 | L2 | L2-L3 | L2 |
| Request | L1 | L2-L3 | L3-L4 | L2 | L2-L3 | L2 |
| Introduction | L2 | L3 | L3 | L2 | L2 | L2 |
| Complaint | — | L3 | — | — | L3-L4 | L3-L4 |

> Note: Complaints to supervisors are uncommon; complaints to subordinates should be handled via performance reviews rather than email.

---

## 2. Email Architecture

Every business email consists of 5 sections, each with a clear function:

```
┌─────────────────────────────────┐
│  Subject Line                    │ ← Summarize purpose + key info in one line
├─────────────────────────────────┤
│  Opening                         │ ← Greeting + icebreaker/context bridge
├─────────────────────────────────┤
│  Body                            │ ← Core message, 1-3 paragraphs, most important first
├─────────────────────────────────┤
│  Call to Action                  │ ← Clear next step + deadline
├─────────────────────────────────┤
│  Closing                         │ ← Thanks/expectation + signature
└─────────────────────────────────┘
```

### 2.1 Subject Line Formulas

| Scenario | Chinese Formula | English Formula | Example |
|----------|----------------|-----------------|---------|
| Reminder | 【提醒】{Topic} — 请于{Date}前回复 | Reminder: {Topic} — Response Needed by {Date} | Reminder: Q3 Report — Response Needed by Oct 15 |
| Follow-up | 跟进：{Topic}的进展 | Following Up: {Topic} | Following Up: Partnership Proposal Discussion |
| Decline | 关于{Topic}的回复 | Re: {Topic} — Update | Re: Vendor Proposal — Update |
| Thank-you | 感谢您在{Topic}中的支持 | Thank You for {Specific Action} | Thank You for Your Support at the Summit |
| Apology | 关于{Issue}的说明与致歉 | Regarding {Issue} — Our Apologies | Regarding the Shipping Delay — Our Apologies |
| Notice | 【通知】{Topic}，请知悉 | Notice: {Topic Change/Update} | Notice: Office Relocation Effective Nov 1 |
| Request | 请求协助：{Topic} | Request: {Specific Need} | Request: Access to Q4 Marketing Data |
| Introduction | 介绍：{Name} — {Context} | Introduction: {Name} — {Context} | Introduction: Sarah Chen — Potential Design Partner |
| Complaint | 关于{Issue}的正式反馈 | Formal Feedback: {Issue} | Formal Feedback: Recurring Delivery Delays |

---

## 3. Scenario Template Library

### 3.1 Reminder Email

**Use When**: Recipient hasn't replied on time, deliverables are delayed, or a meeting hasn't been confirmed.

**Writing Tips**:
- Open by recalling the last communication (provide context, avoid sounding accusatory)
- State the reason for the reminder (why it's needed now, not "you're late")
- Set a clear new deadline
- Offer alternatives or assistance (reduce pressure on the recipient)

**Chinese Template** (Recipient: Vendor, Tone L2-L3):

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

**English Template** (Recipient: Vendor, Tone L2-L3):

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

### 3.2 Follow-up Email

**Use When**: Post-meeting follow-up, waiting for a response after submitting a proposal, milestone project communications.

**Writing Tips**:
- Reference the specific time and content of the last interaction
- Briefly restate key agreements or pending items
- Suggest next steps or raise questions
- Avoid pressure, maintain a positive tone

**Chinese Template** (Recipient: Client, Tone L2):

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

**English Template** (Recipient: Client, Tone L2):

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

### 3.3 Decline Email

**Use When**: Declining a proposal/quote, politely refusing a meeting invitation, turning down a collaboration request.

**Writing Tips**:
- Lead with gratitude (for their time, proposal, or invitation)
- Clearly state the decision to decline (don't be vague and leave false hope)
- Provide a brief reason (no need to over-explain)
- Preserve the relationship (suggest future opportunities or alternatives)

**Chinese Template** (Recipient: Vendor, Tone L2-L3):

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

**English Template** (Recipient: Vendor, Tone L2-L3):

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

### 3.4 Thank-you Email

**Use When**: Expressing gratitude after a project, post-event appreciation, thanking someone for help received.

**Writing Tips**:
- Be specific about what you're thankful for (avoid generic "thanks")
- Highlight the positive impact of their contribution
- If appropriate, mention willingness for continued collaboration

**Chinese Template** (Recipient: Supervisor, Tone L1-L2):

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

**English Template** (Recipient: External partner, Tone L2):

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

### 3.5 Apology Email

**Use When**: Delivery delays, quality issues, miscommunications, service disruptions.

**Writing Tips**:
- Acknowledge the issue directly upfront (don't beat around the bush)
- Explain the cause concisely (don't shift blame or over-explain)
- Propose specific remediation steps and timeline
- Commit to improvement (be concrete, avoid empty promises)

**Chinese Template** (Recipient: Client, Tone L1-L2):

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

**English Template** (Recipient: Client, Tone L1-L2):

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

### 3.6 Notice Email

**Use When**: Policy changes, personnel appointments, office relocations, system maintenance.

**Writing Tips**:
- Tag the subject line with [Notice] for easy priority identification
- Summarize the change in one opening sentence
- Include effective date, scope of impact, and what the recipient needs to do
- Provide contact information for inquiries

**Chinese Template** (Recipient: All colleagues, Tone L3):

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

### 3.7 Request Email

**Use When**: Requesting data/resources, approval, meetings, or support.

**Writing Tips**:
- Open with background context (why you need this)
- Be clear about what you're requesting (specific and actionable)
- State the timeline and priority
- Express gratitude and reduce the perceived burden

**Chinese Template** (Recipient: Supervisor, Tone L1):

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

## 4. Phrase Bank

### 4.1 Opening Lines

| Purpose | Chinese | English |
|---------|---------|---------|
| First contact | 冒昧打扰，我是[公司][姓名]，负责… | I'm reaching out from [Company] regarding… |
| Replying | 感谢您的来信 / 收到您的邮件，回复如下 | Thank you for your email / Further to your email… |
| Post-meeting | 感谢[日期]会议中的交流 | Thank you for the productive discussion on [date] |
| Referred by someone | 经[姓名]介绍，了解到贵方在…方面的需求 | [Name] suggested I reach out to you regarding… |
| Reconnecting | 好久没联系，希望一切顺利 | I hope this message finds you well. It's been a while since… |

### 4.2 Nudge Phrases

| Urgency | Chinese | English |
|---------|---------|---------|
| Gentle | 想跟您确认一下进展 | Just checking in on the status of… |
| Standard | 麻烦您在[日期]前反馈 | Could you please provide an update by [date]? |
| Pressing | 由于[原因]，此事较为紧急 | This has become time-sensitive due to [reason] |
| Urgent | 务必在[日期]前完成，否则将影响… | We need this by [date] to avoid impacting… |

### 4.3 Decline Phrases

| Strategy | Chinese | English |
|----------|---------|---------|
| Soft decline | 经慎重考虑，我们暂时无法… | After careful consideration, we're unable to… at this time |
| Giving a reason | 主要原因是… | The primary reason is… |
| Leaving the door open | 未来如有合适机会，我们会… | We'd welcome the opportunity to revisit this in the future |
| Suggesting alternatives | 建议您也可以联系… | You might also want to consider reaching out to… |

### 4.4 Closing Lines

| Context | Chinese | English |
|---------|---------|---------|
| Awaiting reply | 期待您的回复 | Looking forward to your reply |
| Offering help | 如有疑问，请随时联系 | Please don't hesitate to reach out if you have any questions |
| Expressing anticipation | 期待合作 / 期待后续进展 | Looking forward to working together |
| Formal | 此致敬礼 / 顺祝商祺 | Sincerely / Best regards / Kind regards |
| Semi-formal | 祝好 / 谢谢 | Thanks / Best / Cheers (among colleagues) |

### 4.5 Sign-off (Ordered by Formality)

| Formality | English | Appropriate Context |
|-----------|---------|-------------------|
| ★★★★★ | Respectfully yours | Government / legal / highly formal occasions |
| ★★★★ | Sincerely | First contact / formal business |
| ★★★ | Best regards / Kind regards | Standard business (most common) |
| ★★ | Best / Thanks | Familiar business relationships |
| ★ | Cheers / Talk soon | Close colleagues |

---

## 5. Chinese-English Cultural Differences

### 5.1 Chinese Business Email Conventions
- **Titles matter in greetings**: "张总", "李经理", "王博士" — avoid using first names directly
- **Openings often include pleasantries**: "百忙之中打扰", "近来可好"
- **Preference for indirect expression**: When declining, lean toward "条件尚不成熟" rather than a blunt "no"
- **Closings emphasize etiquette**: "顺祝商祺", "此致敬礼" should not be omitted in formal contexts
- **Signatures include full title**: Name + Position + Department + Company is standard

### 5.2 English Business Email Conventions
- **Concise greetings**: Dear Mr./Ms. + Last Name; switch to Dear + First Name once familiar
- **Get to the point**: State the email's purpose in the first paragraph — no lengthy preamble needed
- **Positive framing**: Even declines lean positive ("We appreciate…" → "Unfortunately…" → "We'd love to…")
- **Action-oriented**: Every email should include a clear next step and deadline
- **Simple signatures**: Best regards + Name is sufficient — no need for extensive titles

### 5.3 Common Mistakes

| Mistake | Problem | Correction |
|---------|---------|-----------|
| "Dear friend" | Too casual / unprofessional | Dear Mr./Ms. [Last Name] |
| "Please kindly…" | Semantically redundant (please = kindly) | Use either Please… or Kindly…, not both |
| "As per my last email" | Carries passive-aggressive tone | As mentioned in my previous email / To follow up on… |
| Overusing "Hope this email finds you well" | Has become a cliché | Choose a more context-specific opening |
| Using "你" instead of "您" for clients/supervisors in Chinese | Insufficiently respectful | Use "您" |
| Missing signature block in Chinese emails | Looks unprofessional | Must include: Name, title, contact info |
| ALL CAPS throughout | Equivalent to shouting | Use standard capitalization |

---

## 6. Pre-send Checklist

Review before sending:

- [ ] **Recipients**: Are To/Cc/Bcc correct? Are any irrelevant people included?
- [ ] **Subject line**: Does it clearly summarize the email's purpose? Can the recipient judge priority from it?
- [ ] **Greeting**: Is the name and title correct? Spelling verified?
- [ ] **Tone**: Does it match the recipient's role? Any parts too casual or too stiff?
- [ ] **Body**: Does the core message appear within the first 3 lines? Are paragraphs short (≤5 lines each)?
- [ ] **Action item**: Is there a clear next step? Is the deadline explicit?
- [ ] **Attachments**: Are mentioned attachments actually attached?
- [ ] **Signature**: Is the information complete and up to date?
- [ ] **Grammar/Spelling**: Any typos or grammatical errors?
- [ ] **Sensitive content**: Is there anything that shouldn't be communicated via email (e.g., negative performance feedback)?

---

## 7. Escalation Ladder

When reminders go unanswered, escalate tone in stages:

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

English equivalents:
```
1st: Gentle nudge — "Just checking in on…"
2nd: Clear reminder — "This is time-sensitive. Could you respond by [date]?"
3rd: Escalation notice — "Without a response by [date], I'll need to escalate to [manager]"
4th: Formal letter — CC both management teams
```

---

## 8. Special Situations

### 8.1 CC Strategy
- **CC your supervisor**: After the 2nd unanswered reminder, or for cross-department coordination
- **CC the team**: For information-sharing emails or items requiring team collaboration
- **BCC**: Only for mass announcements to protect privacy — never for "secret reporting"

### 8.2 Forwarding Guidelines
- Before forwarding, check the email thread for content unsuitable for the new recipient
- Add a forwarding note: "Forwarding the below for your reference. Background: …"

### 8.3 Urgent Emails
- Add [URGENT] or 【紧急】to the subject line
- State the reason for urgency and required response time in the very first sentence
- Use sparingly to avoid the "boy who cried wolf" effect

---

## 9. Agent Behavior Guide

When a user requests a business email, follow this workflow:

1. **Confirm key details**: Scenario, recipient role, language, core content, deadline
2. **Determine tone level**: Use the Scenario × Recipient matrix to select the appropriate tone
3. **Apply the structural framework**: Subject line → Opening → Body → Call to Action → Closing
4. **Select appropriate phrases**: Choose expressions from the phrase bank that match the tone level
5. **Cultural adaptation**: Apply Chinese or English cultural norms based on the selected language
6. **Output and explain**: Deliver the complete email with a brief note on the tone level chosen and key rationale

**Output format requirements**:
- Chinese emails use Chinese punctuation
- English emails have a blank line between paragraphs
- Placeholders are marked with brackets, e.g., [Company Name], [Specific Date]
- If the user hasn't provided certain details, use placeholders and remind them to fill in

---
name: research-paper-refiner
description: "学术论文英文润色助手，按学术写作标准逐段审查语法、用词、语态与逻辑衔接，输出修改建议与润色后的文本。当用户请求论文润色、语法检查、或提交英文论文片段寻求改进，例如说“帮我润色这段英文”、“这段论文语法有没有问题”、“改成学术英语”，或提及paper polishing、academic writing、manuscript editing、SCI润色等关键词时触发。"
license: MIT
---

# Academic Paper Polisher — 学术论文英文润色知识库

帮助用户按照国际学术期刊标准，对英文论文进行逐段审查与润色。涵盖语法纠正、学术用词优化、语态规范、逻辑衔接强化、句式多样化等维度，输出修改建议与润色后文本。

## Quick Start

用户只需提供：
1. **待润色文本**：一段或多段英文论文内容
2. **论文类型**（可选）：期刊论文 / 会议论文 / 学位论文 / 综述
3. **目标期刊/领域**（可选）：如 Nature, IEEE, AAAI, 医学, 计算机等
4. **润色侧重**（可选）：全面润色 / 仅语法 / 仅用词 / 仅逻辑衔接

示例：
> "帮我润色这段 Introduction，目标期刊是 NeurIPS，希望语言更地道、逻辑更连贯。"

---

## 一、审查维度总览（Review Dimensions）

润色工作按以下 5 个维度逐项检查，每个维度独立评分并给出修改建议：

| 维度 | 英文标签 | 审查重点 |
|------|---------|---------|
| 语法 | Grammar | 主谓一致、时态、冠词、介词、从句结构、标点 |
| 用词 | Word Choice | 学术正式度、精确性、搭配、避免口语化 |
| 语态 | Voice & Tense | 主动/被动语态选择、时态一致性 |
| 逻辑衔接 | Coherence & Cohesion | 段内/段间过渡、论证链、信号词使用 |
| 句式 | Sentence Structure | 句式多样性、长短句搭配、并列与从属平衡 |

---

## 二、语法审查规则（Grammar Rules）

### 2.1 高频语法错误清单

| 错误类型 | 错误示例 | 修正 | 说明 |
|---------|---------|------|------|
| 主谓不一致 | The results of the experiment **shows**... | The results of the experiment **show**... | 主语是 results（复数） |
| 冠词缺失/误用 | We propose **method** to solve... | We propose **a method** to solve... | 可数名词单数需加冠词 |
| 悬垂修饰语 | **Using the proposed method,** the accuracy was improved. | **Using the proposed method, we** improved the accuracy. | 分词短语的逻辑主语须与主句主语一致 |
| Run-on sentence | The model performs well **,** it achieves 95% accuracy. | The model performs well**;** it achieves 95% accuracy. / The model performs well**. It** achieves 95% accuracy. | 逗号不能连接两个独立分句 |
| 不完整比较 | Our method is **more efficient**. | Our method is **more efficient than the baseline**. | 比较级需明确比较对象 |
| 平行结构破坏 | The system can **detect, classify,** and **is able to segment**... | The system can **detect, classify, and segment**... | 并列成分须保持相同语法形式 |
| that/which 混淆 | The model **which** we proposed... | The model **that** we proposed... | 限制性定语从句用 that |
| 数词与名词 | These **phenomenon** indicate... | These **phenomena** indicate... | 注意不规则复数 |

### 2.2 标点规范

| 规则 | 正确用法 | 常见错误 |
|------|---------|---------|
| 连续逗号（Oxford comma） | A, B**,** and C | A, B and C（学术写作推荐用 Oxford comma） |
| 破折号 | We used three models — A, B, and C — for comparison. | 前后加空格的 em dash，或无空格的 em dash（取决于期刊风格） |
| 冒号后大写 | 独立句子时大写：**The** result is clear: **The** model outperforms... | 非独立片段时小写 |
| 引号与句号 | 美式：period **inside** quotes. 英式：period **outside** quotes. | 根据目标期刊地区选择 |
| 缩写句号 | e.g., i.e., et al., etc. | 注意逗号：e.g.**,** / i.e.**,** |

### 2.3 时态规范（按论文章节）

| 章节 | 推荐时态 | 示例 |
|------|---------|------|
| Abstract | 过去时（描述做了什么）+ 现在时（描述结论） | "We **proposed** a method... The results **show** that..." |
| Introduction | 现在时（描述现状/共识）+ 过去时（描述前人工作） | "Deep learning **has become**... Smith et al. **demonstrated** that..." |
| Methods | 过去时（描述实验过程） | "We **trained** the model on... The data **were** preprocessed..." |
| Results | 过去时（描述实验结果） | "The model **achieved** 95% accuracy. Table 2 **shows**..." |
| Discussion | 现在时（解释意义）+ 过去时（引用结果） | "This result **suggests** that... Our findings **indicated** that..." |
| Conclusion | 过去时（总结工作）+ 现在时（陈述贡献/意义） | "We **proposed** and **evaluated**... This work **contributes** to..." |

---

## 三、用词优化规则（Word Choice）

### 3.1 口语化 → 学术化替换表

| 口语化用词 | 学术化替换 | 语境说明 |
|-----------|-----------|---------|
| a lot of | numerous / a substantial number of / considerable | 根据修饰对象选择 |
| get | obtain / acquire / achieve / attain | 根据搭配选择 |
| show | demonstrate / illustrate / indicate / reveal | demonstrate 强调证明；indicate 强调暗示 |
| big / huge | substantial / significant / considerable | |
| thing | factor / aspect / element / component | |
| good | effective / favorable / advantageous / robust | |
| bad | adverse / detrimental / suboptimal / inferior | |
| use | employ / utilize / leverage / adopt | utilize 比 use 更正式；leverage 强调优势利用 |
| about | approximately / roughly / circa | 数值描述用 approximately |
| try | attempt / endeavor | |
| look at | examine / investigate / analyze / explore | |
| find out | determine / ascertain / identify / discover | |
| go up / go down | increase / decrease / rise / decline | |
| point out | highlight / emphasize / underscore | |
| deal with | address / tackle / handle / mitigate | |
| make sure | ensure / verify / confirm | |
| kind of / sort of | somewhat / to some extent / partially | |
| start / begin | initiate / commence / undertake | |
| end / finish | conclude / terminate / complete | |
| help | facilitate / enable / assist / contribute to | |
| need | require / necessitate | |
| can | is capable of / is able to / has the potential to | 避免过度替换，can 在学术写作中可接受 |

### 3.2 模糊表达 → 精确表达

| 模糊表达 | 精确替代 | 说明 |
|---------|---------|------|
| very good results | statistically significant improvement / a 12% increase in accuracy | 用具体数据替代模糊形容 |
| some researchers | Several studies (Chen et al., 2023; Li et al., 2024) | 用具体引用替代模糊指代 |
| recently | In the past five years / Since 2020 | 给出时间范围 |
| a few | three / a small number of (n=3) | 明确数量 |
| it is known that | Prior work has established that (citation) | 加引用支撑 |
| this is important | This is critical for / This has significant implications for | 说明为什么重要 |

### 3.3 冗余表达精简

| 冗余表达 | 精简版本 |
|---------|---------|
| in order to | to |
| due to the fact that | because / since |
| at the present time | currently / now |
| it is worth noting that | Notably, / Note that |
| it should be pointed out that | （直接陈述内容） |
| a total of 50 samples | 50 samples |
| the vast majority of | most |
| in the event that | if |
| has the ability to | can |
| on a daily basis | daily |
| in close proximity to | near |
| take into consideration | consider |
| is in agreement with | agrees with |
| serves the function of | functions as |

---

## 四、语态规范（Voice & Tense）

### 4.1 主动 vs. 被动语态选择

| 场景 | 推荐语态 | 示例 |
|------|---------|------|
| 描述作者的操作 | 主动（We） | **We** trained the model using... |
| 描述通用方法/已知事实 | 被动 | The data **were** collected from... |
| 强调动作对象 | 被动 | The samples **were analyzed** using mass spectrometry. |
| 描述结果 | 主动优先 | **Our method achieves** 95% accuracy. |
| 描述实验设备/材料 | 被动 | The solution **was heated** to 100°C. |

### 4.2 常见语态问题

| 问题 | 错误示例 | 修正 |
|------|---------|------|
| 过度被动 | It was found by us that the results were improved by the method. | We found that our method improved the results. |
| 人称不一致 | The author proposes... We then evaluate... | 统一使用 We 或 The authors |
| 无意义被动 | It can be seen that accuracy increases. | Accuracy increases. / The results show that accuracy increases. |

### 4.3 学术人称规范

| 人称 | 使用场景 | 注意事项 |
|------|---------|---------|
| We | 描述本文作者的工作（最常用） | 即使单作者，许多期刊也接受 "We" |
| The authors | 更正式的替代 | 部分期刊偏好此用法 |
| I | 单作者学位论文 | 部分期刊不接受 |
| One | 泛指/假设性陈述 | 较老式，现代学术写作较少用 |

---

## 五、逻辑衔接规则（Coherence & Cohesion）

### 5.1 段内衔接信号词

| 逻辑关系 | 信号词/短语 | 用法示例 |
|---------|-----------|---------|
| 补充 | Furthermore, Moreover, Additionally, In addition | Furthermore, our method generalizes well to unseen data. |
| 对比 | However, In contrast, Conversely, On the other hand, Nevertheless | However, this approach suffers from high computational cost. |
| 因果 | Therefore, Consequently, As a result, Hence, Thus | Therefore, we adopt a two-stage training strategy. |
| 举例 | For example, For instance, Specifically, In particular | Specifically, we focus on the image classification task. |
| 强调 | Indeed, Notably, Importantly, It is worth noting that | Notably, the improvement is consistent across all datasets. |
| 让步 | Although, Despite, Notwithstanding, While, Even though | Although the model is simple, it achieves competitive results. |
| 总结 | In summary, To summarize, Overall, In conclusion | Overall, the proposed method outperforms existing baselines. |
| 转折 | Yet, Still, Nonetheless, That said | That said, there are several limitations to our approach. |
| 顺序 | First, Second, Finally, Subsequently, Then | First, we preprocess the data. Subsequently, we train the model. |
| 条件 | If, Provided that, Given that, Assuming that | Given that the dataset is imbalanced, we apply oversampling. |

### 5.2 段间过渡模式

| 过渡模式 | 说明 | 示例首句 |
|---------|------|---------|
| 钩子句（Hook） | 上段末尾引出下段话题 | "This raises the question of how to efficiently scale the model." |
| 回顾句（Recap） | 下段开头回顾上段结论 | "Having established the effectiveness of our approach, we now turn to..." |
| 对比桥（Contrast Bridge） | 指出上段方法的不足，引出本段 | "While these methods achieve reasonable accuracy, they fail to address..." |
| 问题桥（Question Bridge） | 以问题形式过渡 | "How can we overcome this limitation? In this section, we propose..." |
| 主题句（Topic Sentence） | 每段首句概括本段核心论点 | "The key advantage of our method is its ability to..." |

### 5.3 常见逻辑衔接问题

| 问题 | 说明 | 修正策略 |
|------|------|---------|
| 跳跃式论证 | 从 A 直接跳到 C，缺少 B 的过渡 | 补充中间推理步骤或加过渡句 |
| 信号词滥用 | 每句都以 However / Moreover 开头 | 减少信号词，用句式变化体现逻辑 |
| 信号词误用 | 用 Furthermore 表转折 | 转折用 However；补充用 Furthermore |
| 段落过长 | 一段超过 8-10 句 | 按论点拆分为 2-3 段 |
| 段落过短 | 一段仅 1-2 句 | 合并至相关段落或扩展论述 |
| 指代不清 | "This shows..." — this 指代什么？ | "This result shows..." / "This finding indicates..." |

---

## 六、句式优化规则（Sentence Structure）

### 6.1 句式多样化策略

| 策略 | 原句 | 优化后 |
|------|------|--------|
| 分词短语开头 | We use attention mechanism, and we improve accuracy. | **Leveraging** the attention mechanism, we improve accuracy. |
| 倒装强调 | The improvement is particularly notable in low-resource settings. | **Particularly notable** is the improvement in low-resource settings. |
| 插入语 | The model, which was proposed by Smith, achieves... | The model, **proposed by Smith (2023),** achieves... |
| 名词化 | We improved the model, and this led to... | **The improvement of the model** led to... |
| 平行结构 | The method is fast. It is also accurate. It is scalable too. | The method is **fast, accurate, and scalable**. |
| 状语前置 | Accuracy improved significantly when we added data augmentation. | **With data augmentation,** accuracy improved significantly. |

### 6.2 避免的句式问题

| 问题 | 示例 | 修正 |
|------|------|------|
| 过长句子（>40 词） | We trained the model on the dataset which was collected from ... and preprocessed using ... and then evaluated on ... | 拆分为 2-3 个短句 |
| 连续短句 | The accuracy is high. The model is fast. It uses less memory. | 合并：The model achieves high accuracy with fast inference and low memory consumption. |
| There is/are 开头 | There are many studies that focus on... | Many studies focus on... |
| It is...that 强调句过多 | It is the attention mechanism that improves... | The attention mechanism improves... |
| 名词堆砌 | deep learning image classification model performance | the performance of a deep learning model for image classification |

---

## 七、按章节润色指南（Section-Specific Guide）

### 7.1 Abstract

- **长度**：150-300 词（遵循目标期刊要求）
- **结构**：背景（1-2句） → 问题/动机（1句） → 方法（2-3句） → 结果（1-2句） → 结论/意义（1句）
- **时态**：过去时描述工作，现在时描述结论
- **禁忌**：不引用参考文献、不使用缩写（首次出现需全称）、不包含图表编号

### 7.2 Introduction

- **结构**（经典"漏斗型"）：大背景 → 具体问题 → 现有方法及不足 → 本文方法/贡献 → 论文结构概述
- **关键**：每段须有明确的主题句；引用前人工作时客观评述，不贬低
- **常用句式**：
  - "In recent years, ... has attracted increasing attention."
  - "Despite significant progress, ... remains a challenge."
  - "To address this issue, we propose..."
  - "The main contributions of this paper are as follows:"

### 7.3 Related Work

- **策略**：按主题分组（非按时间排列），每组内按时间顺序
- **关键**：指出每项工作与本文的关系；避免纯罗列，要有评述
- **过渡**：每组之间用过渡句连接
- **常用句式**：
  - "A closely related line of work focuses on..."
  - "In contrast to these approaches, our method..."
  - "Building upon the work of X, we extend..."

### 7.4 Methods

- **原则**：可复现性 — 读者应能根据描述复现实验
- **结构**：问题形式化 → 整体框架 → 各模块详述 → 训练/优化细节
- **关键**：数学符号首次出现时须定义；步骤按执行顺序描述

### 7.5 Results / Experiments

- **结构**：实验设置 → 主实验结果 → 消融实验 → 分析/讨论
- **关键**：先用文字描述趋势，再引用表格/图；避免重复图表中已有的数字
- **常用句式**：
  - "As shown in Table X, our method outperforms..."
  - "We observe a consistent improvement of X% across..."
  - "The ablation study reveals that..."

### 7.6 Discussion

- **内容**：解释结果的意义 → 与前人工作的对比 → 局限性 → 未来方向
- **关键**：不回避局限性；讨论应超越结果本身，探讨更广泛的意义

### 7.7 Conclusion

- **长度**：通常 1 段，150-250 词
- **结构**：总结方法 → 核心发现 → 意义/贡献 → 未来工作
- **禁忌**：不引入新信息/新数据；不简单重复 Abstract

---

## 八、润色输出格式（Output Format）

对用户提供的每一段文本，按以下格式输出：

```
### 原文（Original）
[用户提供的原始文本]

### 审查结果（Review）

| 维度 | 评级 | 主要问题 |
|------|------|---------|
| 语法 | ✓ 良好 / △ 需改进 / ✗ 问题较多 | 简述问题 |
| 用词 | ✓ / △ / ✗ | 简述问题 |
| 语态 | ✓ / △ / ✗ | 简述问题 |
| 逻辑衔接 | ✓ / △ / ✗ | 简述问题 |
| 句式 | ✓ / △ / ✗ | 简述问题 |

### 逐句修改（Detailed Changes）
1. **原句**: "..."
   **修改**: "..."
   **原因**: [具体说明修改理由，引用上述规则]

2. ...

### 润色后文本（Polished Version）
[完整的润色后段落]
```

---

## 九、学科特殊用语提示（Domain-Specific Notes）

不同学科有各自的写作惯例，润色时应尊重领域特点：

| 领域 | 特点 | 注意事项 |
|------|------|---------|
| 计算机科学 | 常用主动语态 "We" | 接受较口语化的表达（如 "we run"）；算法描述需精确 |
| 医学/生物 | 被动语态为主 | "Patients were randomized..."；术语需符合 MeSH 标准 |
| 物理 | 简洁、公式驱动 | 数学推导表述要严谨；"one can show that..." 常见 |
| 社会科学 | 较多限定语 | "may", "might", "suggests"；避免过于绝对的表述 |
| 工程 | 结果导向 | 强调性能指标和实验验证 |

---

## 十、Agent 行为指南

当用户提交文本要求润色时，按以下流程执行：

1. **确认信息**：论文类型、目标期刊/会议（如有）、润色侧重
2. **识别章节**：判断文本属于论文的哪个章节，应用对应章节规范
3. **五维审查**：按语法 → 用词 → 语态 → 逻辑衔接 → 句式逐项检查
4. **逐句标注**：对每处修改给出原因，引用具体规则
5. **输出润色版本**：给出完整的润色后文本
6. **总结建议**：概括主要问题类型和改进方向

**核心原则**：
- 保留作者的原意和论证逻辑，不改变技术内容
- 修改应最小化 — 能改一个词不改整句，能改整句不改整段
- 对不确定是否为错误的地方，以建议形式提出而非直接修改
- 术语以作者使用的为准，除非明显误用
- 对用户标注"请保留"的内容不做修改

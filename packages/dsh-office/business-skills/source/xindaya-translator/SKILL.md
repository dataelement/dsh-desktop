---
name: xindaya-translator
description: "提供专业的中英双向翻译，遵循信达雅原则，并包含回译验证和质量检查清单。覆盖学术论文、商务文书、技术文档和法律合同四大领域，提供专业术语对照与句式转换模板。当用户提出翻译请求，例如“翻译”、“translate”、“中翻英”、“英翻中”，或提及具体场景如“学术翻译”、“论文翻译”、“商务翻译”、“合同翻译”、“技术翻译”、“法律翻译”，或使用“帮我翻译这段话”、“translate this paragraph”等短语时触发。"
license: MIT
---

# Pro Translator — 中英专业翻译知识库（信达雅原则）

基于严复「信达雅」翻译理论的中英双向专业翻译知识库，覆盖学术、商务、技术、法律四大领域，提供术语对照、句式转换模板和质量检查清单。

## Quick Start

**用户输入示例：**
- "帮我把这段摘要翻成英文，学术风格"
- "Translate this contract clause into Chinese"
- "这段技术文档翻成中文，保持术语准确"

**Agent 处理流程：**
1. 识别源语言和目标语言
2. 识别文本所属领域（学术/商务/技术/法律）
3. 按信达雅三层标准逐步翻译
4. 输出译文并附关键术语对照表

---

## 一、信达雅翻译框架

### 1.1 三层标准定义

| 层级 | 原文 | 含义 | 翻译中的体现 |
|------|------|------|-------------|
| **信**（Faithfulness） | 忠实原文 | 准确传达原文的事实、数据、逻辑和语气 | 术语一致、数字无误、否定/肯定无反转、因果关系保留 |
| **达**（Expressiveness） | 通顺流畅 | 译文符合目标语言的表达习惯，读者无阅读障碍 | 语序调整、主被动转换、长句拆分、衔接词补充 |
| **雅**（Elegance） | 文采得体 | 译文风格与原文语域匹配，用词精准得体 | 学术用正式书面语、商务用职业化措辞、法律用规范法律用语 |

### 1.2 翻译决策优先级

```
信 > 达 > 雅
```

当三者冲突时：
- **准确性（信）永远第一**：宁可译文略显生硬，也不能歪曲原意
- **流畅性（达）其次**：在准确基础上调整语序和表达
- **文采（雅）最后**：在前两者满足后提升文风

### 1.3 通用翻译流程

```
Step 1: 通读全文 → 理解主旨和语境
Step 2: 识别领域 → 确定术语表和风格要求
Step 3: 逐句直译 → 确保「信」
Step 4: 调整语序 → 实现「达」
Step 5: 润色文风 → 追求「雅」
Step 6: 回译检查 → 将译文回译验证是否失真
```

---

## 二、学术翻译规范

### 2.1 核心术语对照表

| 中文 | English | 使用场景 |
|------|---------|---------|
| 显著性 | statistical significance | 统计检验 |
| 自变量 / 因变量 | independent variable / dependent variable | 实验设计 |
| 假设检验 | hypothesis testing | 研究方法 |
| 文献综述 | literature review | 论文结构 |
| 研究局限性 | limitations | 讨论章节 |
| 实证研究 | empirical study | 研究类型 |
| 定性分析 / 定量分析 | qualitative analysis / quantitative analysis | 方法论 |
| 同行评审 | peer review | 发表流程 |
| 交叉验证 | cross-validation | 机器学习/统计 |
| 置信区间 | confidence interval | 统计推断 |
| 元分析 | meta-analysis | 综合研究 |
| 随机对照试验 | randomized controlled trial (RCT) | 医学/社科 |
| 相关性 vs 因果性 | correlation vs causation | 研究结论 |
| 可复现性 | reproducibility | 研究质量 |

### 2.2 学术句式转换模板

**中→英常用句式：**

| 中文表达 | 英文学术表达 |
|---------|------------|
| 本文旨在探讨… | This paper aims to investigate… / This study seeks to examine… |
| 研究结果表明… | The results indicate that… / Findings suggest that… |
| 与前人研究一致 | Consistent with prior research… / In line with previous findings… |
| 值得注意的是 | It is noteworthy that… / Notably, … |
| 存在一定局限性 | Several limitations should be acknowledged… |
| 未来研究可以… | Future research could explore… / Further investigation is warranted… |
| 综上所述 | In summary, … / To conclude, … |
| 如表 X 所示 | As shown in Table X / As illustrated in Table X |

**英→中常用句式：**

| English Expression | 中文学术表达 |
|-------------------|------------|
| It has been well established that… | 已有大量研究证实… |
| The present study contributes to… | 本研究对…做出了贡献 |
| These findings have implications for… | 上述发现对…具有启示意义 |
| A growing body of literature suggests… | 越来越多的文献表明… |
| Controlling for confounding variables… | 在控制混杂变量后… |

### 2.3 学术翻译注意事项

- **时态**：方法和结果部分用过去时（was, were, found），普遍结论用现在时（suggests, indicates）
- **人称**：优先用被动语态或 "this study"，避免 "I/we"（除非目标期刊允许）
- **缩写**：首次出现写全称并附缩写，如 "artificial intelligence (AI)"
- **引用格式**：保留原文引用格式（APA/MLA/Chicago），不做转换

---

## 三、商务翻译规范

### 3.1 核心术语对照表

| 中文 | English | 使用场景 |
|------|---------|---------|
| 季度环比增长 | quarter-over-quarter (QoQ) growth | 财报 |
| 同比增长 | year-over-year (YoY) growth | 财报 |
| 毛利率 / 净利率 | gross margin / net margin | 财务指标 |
| 供应链 | supply chain | 运营 |
| 尽职调查 | due diligence | 投融资 |
| 股东权益 | shareholders' equity | 财务报表 |
| 现金流 | cash flow | 财务分析 |
| 市盈率 | price-to-earnings ratio (P/E) | 估值 |
| 利益相关方 | stakeholders | 公司治理 |
| 战略合作伙伴关系 | strategic partnership | 商务合作 |
| 核心竞争力 | core competency | 战略分析 |
| 品牌溢价 | brand premium | 市场营销 |
| 商业模式画布 | Business Model Canvas | 创业/战略 |
| 投资回报率 | return on investment (ROI) | 投资分析 |

### 3.2 商务句式转换模板

**中→英：**

| 中文表达 | 英文商务表达 |
|---------|------------|
| 我方愿与贵方建立长期合作关系 | We look forward to establishing a long-term partnership with your organization. |
| 经双方友好协商 | Following amicable negotiations between both parties, … |
| 请予以确认 | We kindly request your confirmation. / Please confirm at your earliest convenience. |
| 随函附上… | Please find enclosed… / Attached herewith is… |
| 就此事宜，我方立场如下 | With regard to this matter, our position is as follows: |

**英→中：**

| English Expression | 中文商务表达 |
|-------------------|------------|
| We regret to inform you that… | 我方遗憾地通知贵方… |
| Please do not hesitate to contact us. | 如有任何疑问，请随时与我方联系。 |
| We would appreciate your prompt response. | 烦请贵方尽快回复，不胜感激。 |
| Subject to the terms and conditions herein… | 依据本协议条款… |

### 3.3 商务翻译注意事项

- **语气**：保持礼貌正式，中文商务信函比英文更含蓄委婉
- **数字与货币**：保留原始币种符号，必要时注明汇率或等值
- **公司名称**：使用官方英文名，不自行翻译
- **职位名称**：参考公司官方英文职称

---

## 四、技术翻译规范

### 4.1 核心术语对照表

| 中文 | English | 领域 |
|------|---------|------|
| 应用程序接口 | API (Application Programming Interface) | 软件开发 |
| 容器化 | containerization | DevOps |
| 微服务架构 | microservices architecture | 系统架构 |
| 负载均衡 | load balancing | 网络/运维 |
| 持续集成/持续部署 | CI/CD (Continuous Integration/Continuous Deployment) | DevOps |
| 版本控制 | version control | 开发流程 |
| 延迟 / 吞吐量 | latency / throughput | 性能指标 |
| 端到端加密 | end-to-end encryption (E2EE) | 安全 |
| 大语言模型 | large language model (LLM) | AI |
| 向量数据库 | vector database | AI/数据 |
| 检索增强生成 | Retrieval-Augmented Generation (RAG) | AI |
| 提示工程 | prompt engineering | AI |
| 幂等性 | idempotency | 系统设计 |
| 序列化 / 反序列化 | serialization / deserialization | 数据处理 |

### 4.2 技术翻译规则

- **代码标识符不翻译**：函数名、变量名、类名保持原文，如 `getUserInfo()` 不译为「获取用户信息()」
- **命令行不翻译**：`docker run`、`git commit` 等命令保持原样
- **缩写优先**：技术文档中首次出现用全称+缩写，后续直接用缩写
- **中文技术文档**：技术名词可保留英文并用括号注释，如「使用负载均衡（Load Balancing）策略」
- **英文技术文档**：中文概念可用拼音或英文释义，避免直接插入中文字符

### 4.3 技术文档结构对照

| 中文文档常见结构 | 英文文档常见结构 |
|---------------|---------------|
| 概述 | Overview |
| 快速开始 | Quick Start / Getting Started |
| 安装指南 | Installation Guide |
| 配置说明 | Configuration |
| 使用示例 | Usage / Examples |
| 常见问题 | FAQ / Troubleshooting |
| 更新日志 | Changelog / Release Notes |
| 参考文档 | API Reference / Reference |

---

## 五、法律翻译规范

### 5.1 核心术语对照表

| 中文 | English | 使用场景 |
|------|---------|---------|
| 甲方 / 乙方 | Party A / Party B | 合同主体 |
| 不可抗力 | force majeure | 免责条款 |
| 违约责任 | liability for breach of contract | 违约条款 |
| 知识产权 | intellectual property (IP) | 权利条款 |
| 保密义务 | confidentiality obligation | 保密协议 |
| 争议解决 | dispute resolution | 仲裁/诉讼 |
| 适用法律 | governing law | 法律适用 |
| 仲裁条款 | arbitration clause | 争议解决 |
| 连带责任 | joint and several liability | 责任承担 |
| 善意第三人 | bona fide third party | 合同效力 |
| 管辖权 | jurisdiction | 法院管辖 |
| 损害赔偿 | damages | 违约救济 |
| 不可撤销的 | irrevocable | 授权/承诺 |
| 生效日期 | effective date | 合同时效 |
| 竞业限制 | non-compete clause | 劳动合同 |

### 5.2 法律句式转换模板

**中→英：**

| 中文表达 | 英文法律表达 |
|---------|------------|
| 本合同自双方签字之日起生效 | This Agreement shall come into effect upon execution by both parties. |
| 任何一方不得擅自转让本合同项下的权利义务 | Neither party shall assign any rights or obligations under this Agreement without prior written consent. |
| 本合同一式两份，双方各执一份 | This Agreement is executed in duplicate, with each party retaining one copy. |
| 如有未尽事宜，双方另行协商 | Any matters not covered herein shall be resolved through mutual consultation. |

**英→中：**

| English Expression | 中文法律表达 |
|-------------------|------------|
| Notwithstanding anything to the contrary herein… | 尽管本协议有任何相反规定… |
| To the fullest extent permitted by law… | 在法律允许的最大范围内… |
| The parties hereby agree as follows: | 双方特此约定如下： |
| IN WITNESS WHEREOF… | 以昭信守，双方于下述日期签署本协议。 |

### 5.3 法律翻译注意事项

- **精确性最高**：法律翻译「信」的要求远高于其他领域，每个限定词都有法律意义
- **shall vs will**：合同中 "shall" 表示义务，"will" 表示意愿，不可混用
- **定义条款**：大写术语需前后一致，首次出现时附定义
- **数字表达**：金额同时用数字和文字表示，如 "USD 10,000 (ten thousand US dollars)"
- **不加译注**：法律文本不宜增加译者注释，如有歧义应提请法务确认

---

## 六、翻译质量检查清单

### 6.1 通用检查项

| 检查维度 | 检查要点 | 严重程度 |
|---------|---------|---------|
| 完整性 | 是否有遗漏未译的句子或段落 | 高 |
| 准确性 | 数字、日期、专有名词是否准确 | 高 |
| 术语一致性 | 同一术语全文翻译是否一致 | 高 |
| 逻辑关系 | 因果、转折、并列关系是否保留 | 高 |
| 语法正确 | 译文是否存在语法错误 | 中 |
| 流畅度 | 是否有翻译腔，读起来是否自然 | 中 |
| 格式一致 | 标点、编号、缩进是否与原文风格匹配 | 低 |

### 6.2 回译验证法

将译文回译为源语言，对比原文检查是否存在语义偏移：

```
原文（中）：该实验在控制变量条件下进行
译文（英）：The experiment was conducted under controlled conditions.
回译（中）：该实验在受控条件下进行
对比：✅ 语义一致，表达方式略有不同但含义准确
```

---

## 七、Agent 行为指南

### 7.1 翻译输出格式

对于每次翻译任务，Agent 应按以下格式输出：

```
【领域识别】学术 / 商务 / 技术 / 法律 / 通用
【源语言】中文 / English
【目标语言】English / 中文

---

【译文】
（正式译文内容）

---

【关键术语对照】
| 原文 | 译文 | 备注 |
|------|------|------|
| … | … | … |
```

### 7.2 处理原则

1. **先问后译**：如果原文领域不明确，先询问用户
2. **术语确认**：遇到一词多义的专业术语，向用户确认语境
3. **保留不确定项**：对无法确定的翻译，提供 2-3 个候选译法并说明各自适用场景
4. **标注译者说明**：对文化差异较大的内容（如成语、典故），可在译文后附简要说明
5. **拒绝机翻风格**：避免逐词直译，确保译文符合目标语言的自然表达

### 7.3 常见翻译陷阱

| 陷阱类型 | 示例 | 正确处理 |
|---------|------|---------|
| 假朋友（false friends） | "actually" ≠ 实际上（更接近「其实」「事实上」） | 根据语境选择准确含义 |
| 中式英语 | "give you some color to see see" | 使用地道英文表达 |
| 过度意译 | 将成语完全用英文解释而丢失原文韵味 | 保留原文风格，必要时加注 |
| 数字陷阱 | "十亿" = 1 billion（非 10 billion） | 中英数字单位对照确认 |
| 被动/主动混淆 | 中文多主动，英文多被动 | 根据目标语言习惯调整语态 |
| 否定转移 | "I don't think he is right" ≠ 我不认为他是对的 | 译为「我认为他不对」 |
| 冠词缺失（中→英） | 中文无冠词系统，译者常遗漏 a/the | 英译时逐句检查名词前是否需要冠词 |
| respectively 位置 | 中文「分别」位置灵活，英文 respectively 必须在句末 | "A 和 B 分别是 X 和 Y" → "A and B are X and Y, respectively." |
| 万/亿换算 | 万=10,000 亿=100,000,000，不能直译为 million/billion | 1.5 万=15,000; 3 亿=300 million; 10 亿=1 billion |

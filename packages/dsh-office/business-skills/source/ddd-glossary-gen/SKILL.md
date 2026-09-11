---
name: ddd-glossary-gen
description: "从当前对话中提取和规范领域术语，生成DDD风格统一语言术语表，识别歧义并给出规范用语建议，保存为UBIQUITOUS_LANGUAGE.md文件。当用户需要定义领域术语、构建术语表、统一词汇规范、创建统一语言，或在讨论中提及“领域模型”、“DDD”或“统一语言”等关键词时触发。"
---

# 统一语言术语表

从当前对话中提取并规范化领域术语，形成一致的术语表，保存为本地文件。

## 流程

1. **扫描对话内容**，识别与领域相关的名词、动词和概念
2. **发现问题**：
   - 同一个词被用于不同概念（歧义）
   - 不同的词指代同一个概念（同义词冗余）
   - 含义模糊或过度泛化的术语
3. **提出规范术语表**，给出明确的术语选择建议
4. **写入工作目录下的 `UBIQUITOUS_LANGUAGE.md`**，格式如下
5. **在对话中输出摘要**

## 输出格式

生成一个 `UBIQUITOUS_LANGUAGE.md` 文件，结构如下：

```md
# Ubiquitous Language

## Order lifecycle

| Term        | Definition                                              | Aliases to avoid      |
| ----------- | ------------------------------------------------------- | --------------------- |
| **Order**   | A customer's request to purchase one or more items      | Purchase, transaction |
| **Invoice** | A request for payment sent to a customer after delivery | Bill, payment request |

## People

| Term         | Definition                                  | Aliases to avoid       |
| ------------ | ------------------------------------------- | ---------------------- |
| **Customer** | A person or organization that places orders | Client, buyer, account |
| **User**     | An authentication identity in the system    | Login, account         |

## Relationships

- An **Invoice** belongs to exactly one **Customer**
- An **Order** produces one or more **Invoices**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed. A single **Order** can produce multiple **Invoices** if items ship in separate **Shipments**."
> **Dev:** "So if a **Shipment** is cancelled before dispatch, no **Invoice** exists for it?"
> **Domain expert:** "Exactly. The **Invoice** lifecycle is tied to the **Fulfillment**, not the **Order**."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — these are distinct concepts: a **Customer** places orders, while a **User** is an authentication identity that may or may not represent a **Customer**.
```

## 规则

- **要有主见。** 当同一概念存在多个词汇时，选定一个最佳术语，其余列为"应避免的别名"。
- **明确标记冲突。** 如果某个术语在对话中被模糊使用，在"已标记的歧义"部分指出，并给出明确建议。
- **只收录领域专家关心的术语。** 跳过模块名或类名，除非它们在领域语言中有实际意义。
- **定义要精炼。** 最多一句话。定义它**是什么**，而不是它做什么。
- **展示关系。** 使用加粗的术语名称，在明显的地方标注基数关系。
- **只收录领域术语。** 跳过通用编程概念（数组、函数、接口等），除非它们在领域中有特殊含义。
- **将术语分组到多个表格中**，当自然的类别出现时（例如按子域、生命周期或角色分组）。每个分组有自己的标题和表格。如果所有术语属于同一个内聚的领域，用一个表格就够了——不要强行分组。
- **编写示例对话。** 一段简短的对话（3-5 轮交流），由开发者和领域专家进行，展示这些术语如何在自然交流中配合使用。对话应澄清相关概念之间的边界，并展示术语的精确用法。

<example>

## 示例对话

> **开发者：** "怎么在不用 Docker 的情况下测试 **sync 服务**？"

> **领域专家：** "用 **文件系统层** 替代 **Docker 层**。它实现了同样的 **沙箱服务** 接口，只是用本地目录作为 **沙箱**。"

> **开发者：** "那 **sync-in** 还是会创建 **bundle** 然后解包吗？"

> **领域专家：** "没错。**sync 服务** 不知道它在跟哪个层通信。它调用 `exec` 和 `copyIn`——**文件系统层** 只是把这些当作本地 shell 命令来执行。"

</example>

## 重新运行

在同一对话中再次调用时：

1. 读取已有的 `UBIQUITOUS_LANGUAGE.md`
2. 将后续讨论中出现的新术语纳入
3. 如果理解发生变化，更新定义
4. 重新标记新发现的歧义
5. 重写示例对话，融入新术语

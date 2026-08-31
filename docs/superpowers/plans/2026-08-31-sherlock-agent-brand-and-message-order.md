# Sherlock Agent 品牌与消息顺序修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让模型面向用户只以 Sherlock Agent 自我识别，并保证运行中追加的用户输入按真实提交时序稳定显示在后续回答之前。

**Architecture:** 品牌修复落在系统提示词的三个真实注入源，避免依赖输出后处理。顺序修复由 Host 为临时队列行保留插入事件序号，经连接协议和客户端镜像传到对话组件；对话组件以该序号把执行组拆分在待处理输入两侧，待输入转为持久节点后继续使用既有 `steering` 分段逻辑。

**Tech Stack:** Electron、Cordis、React、Vitest、patch-package、TypeScript

**Spec:** 用户在 2026-08-31 提供的 Sherlock 截图与本次请求

## Global Constraints

- 用户可见身份必须为 `Sherlock Agent`，回答不得把产品或自身称为 `DeepSeek Harness`。
- 保留 `@deepseek-ai/*`、`DSH_*` 等必要兼容性技术标识，不做无关的大规模重命名。
- 用户输入必须先于其后产生的回答显示；运行中追加输入也要遵守真实日志时序。
- 只运行本次改动直接影响的聚焦测试，不运行全功能测试。
- 修改通过聚焦验证后创建一个中文本地 Git 提交，不混入已有未跟踪产物。

---

### Task 1: 固化 Sherlock Agent 模型身份

**Files:**
- Create: `test/sherlock-agent-branding.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-system-prompt/lib/index.js`
- Modify: `node_modules/@deepseek-ai/dsh-app-boot/lib/index.js`
- Modify: `node_modules/@deepseek-ai/dsh-web-app/lib/index.js`
- Create: `patches/@deepseek-ai+dsh-system-prompt+0.1.0-rc.7.patch`
- Create: `patches/@deepseek-ai+dsh-app-boot+0.1.0-rc.7.patch`
- Create: `patches/@deepseek-ai+dsh-web-app+0.1.0-rc.7.patch`

**Interfaces:**
- Consumes: `SystemPrompt.assemble()`, `renderPrompt()`, `addHarnessSourceSection()`, Web App `apply()`。
- Produces: 三个真实模型提示词入口统一使用 `Sherlock Agent`，不再注入旧品牌。

- [x] **Step 1: 写失败测试**

  新测试实例化真实 `SystemPrompt`，调用真实 App Boot/Web App 注入路径，断言合成后的模型可见文本包含 `Sherlock Agent` 且不含 `DeepSeek Harness`。

- [x] **Step 2: 运行测试并确认按预期失败**

  Run: `npm test -- --run test/sherlock-agent-branding.test.ts`

  Expected: FAIL，失败值来自当前三个旧品牌提示词。

- [x] **Step 3: 写最小实现**

  将固定身份改为 `You are Sherlock Agent.`；将实现路径和 Web 界面上下文中的产品称谓改为 `Sherlock Agent`/`Sherlock`，保留运行时技术约束。

- [x] **Step 4: 固化依赖补丁并复跑测试**

  Run: `npx patch-package @deepseek-ai/dsh-system-prompt @deepseek-ai/dsh-app-boot @deepseek-ai/dsh-web-app`

  Run: `npm test -- --run test/sherlock-agent-branding.test.ts`

  Expected: PASS。

### Task 2: 按日志时序合并待处理输入与回答

**Files:**
- Modify: `test/subagent-report-queue.test.ts`
- Modify: `test/compact-execution-status.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js`
- Modify: `node_modules/@deepseek-ai/dsh-host-apiproxy/lib/types/api/events.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-host-apiproxy/lib/types/api/events.schema.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-connection/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-runtime/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-runtime/lib/types/client/sessions/conversation.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: corresponding `patches/@deepseek-ai+...+0.1.0-rc.7.patch` files

**Interfaces:**
- Consumes: `agent/inbox/spliced` 的 `event.seq`、`session/queue` 帧、`SessionQueueMirror`、`compactConversationFlow()`。
- Produces: 队列行的可选 `anchorSeq`；`mergePendingSteeringFlow(flow, pending, nodeStore)` 返回含 `pending-steering` 行和必要执行分段的稳定渲染流。

- [x] **Step 1: 写失败测试**

  `subagent-report-queue.test.ts` 断言客户端队列镜像保留 Host 提供的 `anchorSeq`；`compact-execution-status.test.ts` 构造序号为 40 的前置回答、60 的追加输入和 80 的后续回答，断言渲染顺序为回答前段、用户输入、回答后段，且只有后段保持 running。

- [x] **Step 2: 运行测试并确认按预期失败**

  Run: `npm test -- --run test/subagent-report-queue.test.ts test/compact-execution-status.test.ts`

  Expected: FAIL，客户端丢失 `anchorSeq` 且对话包尚未导出合并函数。

- [x] **Step 3: Host 与连接层传递插入序号**

  Host 在每个会话内记录插入队列消息的事件序号，并随 `session/queue` 行发送可选 `anchorSeq`；协议 schema 接受该字段，客户端镜像原样保留。重连时未知旧队列序号保持可选并回退到末尾，不伪造顺序。

- [x] **Step 4: 对话流按序号拆分执行段**

  新增纯函数按节点 `anchorSeq` 合并待处理输入；若输入落在一个执行组的节点之间，则拆为前后两段，前段 settled、后段继承 running，React 使用合并后的单一流渲染。

- [x] **Step 5: 固化依赖补丁并复跑聚焦测试**

  Run: `npx patch-package @deepseek-ai/dsh-host-apiproxy @deepseek-ai/dsh-client-connection @deepseek-ai/dsh-client-runtime @deepseek-ai/dsh-client-ui-conversation`

  Run: `npm test -- --run test/subagent-report-queue.test.ts test/compact-execution-status.test.ts`

  Expected: PASS。

### Task 3: 聚焦验证、真实客户端复验与提交

**Files:**
- Modify: only files listed above and this plan

**Interfaces:**
- Consumes: 项目本地测试 runbook `docs/sherlock-local-test-runbook.md`。
- Produces: 保持打开的 `Sherlock Dev.app` 和一个仅含本次修复的中文本地提交。

- [x] **Step 1: 运行聚焦回归与类型检查**

  Run: `npm test -- --run test/sherlock-agent-branding.test.ts test/subagent-report-queue.test.ts test/compact-execution-status.test.ts test/brand-migration.test.ts`

  Run: `npm run typecheck`

  Run: `git diff --check`

- [x] **Step 2: 按 runbook 构建并启动本地测试版**

  Run: `./script/build_and_run.sh --verify`

  Expected: 明确跳过公证/上传/版本递增，构建签名验证通过并启动 `Sherlock Dev.app`。

- [x] **Step 3: 验证真实主界面**

  在真实 Dev 应用新建/打开会话，检查页面身份、无错误覆盖层、控制台健康；发送 `你好，你是谁？`，确认回答不出现旧品牌；运行中追加一条输入，确认其后产生的回答显示在该输入下方。保存应用截图到仓库外。

- [x] **Step 4: 创建本地提交**

  Stage only: 本计划列出的源码测试与补丁文件。

  Commit: `git commit -m "修复 Sherlock Agent 品牌与消息顺序"`

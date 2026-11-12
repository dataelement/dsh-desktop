# 模型准备与输入提交前校验（Harness 0.2.2-rc.1）

这两处接缝是通用的可等待业务准入边界，不包含企业身份、知识库或工具目录规则。Desktop/Web 共用同一实现。补丁归属三个独立 package：dsh-system-prompt、dsh-agent-loop、dsh-client-ui-conversation。

## 模型准备

0.2.2-rc.1 的原始 AgentLoop 顺序为 tools.resolve → systemPrompt.assemble → agent/pre-step。官方 agent/pre-step 是针对已准备好的输入的决策 waterfall；其语义保持不变。工具 register 的 when 条件只能选择已存在的注册，不能在快照后补入新增工具。因此这两个 API 都不能承担“异步刷新后立即进入本次工具快照”。

新增 SystemPrompt.prepare(context): Promise<PreparedPrompt>：按 context.scope 派发可等待的 system-prompt/prepare，开始和结束检查 signal。失败直接拒绝，不读取任何 provider，不调用模型。

AgentLoop 每一步构造独立的 assemblyContext，先 await prepare，再调用 tools.resolve，最后把 toolSet 加入同一上下文并调用 assemble(context, prepared)。prepare 返回的 opaque handle 只供同一次 assembly 使用：绑定原始 context 对象及原有字段引用，消费后立即删除。不能跨 Agent、scope、signal 或下一步复用。没有按 Agent 或 toolSet 缓存准备结果。

assemble 原本即返回 Promise，原有单参数调用保持有效：未传 handle 时自行 await prepare，再读取变量、section、context 和工具 provider。refreshContext 仅刷新既有运行时事实，不新增准备副作用。已检查发布包的全部 systemPrompt.assemble 调用者，唯一生产调用在 AgentLoop；其新顺序由实际 AgentLoop 请求测试覆盖。

## 原生输入准入

官方 reference codec 只负责普通消息引用展开；command claim.submit 已是命令执行入口。messageSubmitted 是同步分析通知。这三处均不能统一拦截普通消息、仅附件消息与已认领命令。

新增 SessionInputDeps.beforeSubmit(references, signal, command?)。真实 InputHub 绑定该回调到创建输入控制器时的固定 Session binding，通过 actx.serial 等待 conversation/input-before-submit。校验前后检查取消和绑定身份，禁止过期的校验结果转交另一会话。事件类型由客户端 index.d.ts 声明；这不是 Remote，包没有需要为该本地回调修改的 typert wire schema。

普通消息继续使用原生引用序列化和 defaultSink 的 accept 参数。sinkSerialized 从提交 attempt 复制并冻结引用，校验完成才调用原有 defaultSink。beginSubmit 从同一 attempt 复制引用，校验完成才序列化命令附件和调用 claim.submit。拒绝通过原生失败结算保留编辑文档、引用和附件；取消或控制器销毁不会调用 sink/命令。无监听器时回调完成后保持原有发送行为。

## 验证与移除条件

- test/system-prompt-prepare.test.mjs 使用实际 Cordis、SystemPrompt、Tools、NativeToolExecutor、AgentRegistry/AgentLoop 和合成模型 transport，检查首次请求新增工具、下一次重新准备、失败不调用模型、单次 handle、scope/dispose。
- test/conversation-submit-admission.test.mjs 执行完整已安装客户端 factory，实例化真实 InputHub、SessionInputShell、Lexical editor 和 SubmitMachine；仅外部 observable store、Session 服务和 transport 用 fixture。覆盖文本/斜杠/仅附件、拒绝保留文档、绑定变化、命令冻结引用和取消。
- 三个 patch 按 package 原子维护。conversation 的现有 UI patch 内容完整保留，新增内容仅为输入准入与公开类型。

当官方提供同等 prepare-before-tools.resolve 和 Session 输入 admission API 后，迁移调用方并删除对应补丁；不能仅因事件或函数同名即认定语义等价。当前测试不代表已安装 Desktop 应用或生产 Web artifact 已重建。

# 临时会话实现与维护说明

## 用户行为

- 点击侧边栏顶部“新会话”或“临时会话”分区的加号时，客户端创建专属目录、注册工作区和 Session，然后进入临时会话。
- 临时会话直接复用工作区的原生 Composer：文本、附件、权限、模型、思考强度、命令菜单等功能和 UI 保持一致。
- 每个临时会话使用独立目录，不复用共享的临时目录。
- 已创建的临时会话统一显示在侧边栏底部“临时会话”分区；普通工作区及其加号行为保持不变。
- 临时会话是持久的，不会自动删除，避免误删 Agent 生成的文件。用户可以按普通会话方式归档或删除会话记录。

## 目录位置

目录位于操作系统用户主目录下：

```text
<用户主目录>/DSH Desktop/Temporary Chats/chat-<UTC 时间>-<随机后缀>/
```

例如 Windows 默认位置类似：

```text
C:\Users\Administrator\DSH Desktop\Temporary Chats\chat-20260915T010203Z-ab12cd34\
```

目录名称包含时间和随机后缀，可避免快速连续新建会话时发生冲突。

## 实现边界

- Electron Main 在 `temporary-chat:create-workspace` IPC 中创建目录，并校验请求来自主窗口。
- Preload 只暴露 `createTemporaryChatWorkspace()` 窄接口，不向网页开放 Node.js 文件系统能力。
- `dsh-client-ui-sidebar` 将全局“新会话”切换为临时会话入口。
- `dsh-client-ui-conversation` 继续使用上游标准会话输入框，仅将临时工作区名称显示为“临时会话”。
- `dsh-client-ui-workspace` 创建并注册临时工作区，并按目录路径将其会话聚合到专属分区。

完整 Composer 的附件、模型、权限与命令等能力都依赖真实 Session，当前 Harness 不支持“无 Session 的完整草稿 Composer”。因此目录必须在进入临时会话时创建，无法继续推迟到首次发送；这样才能保证临时会话与工作区功能完全一致。当前工作区列表也没有足够的公开扩展槽，因此后三项通过 `patch-package` 维护。

## 上游升级检查

升级 Harness 后需要重点复核：

1. `UiWorkspaceService` 的 `connectWorkspace`、`openSession` 和 `startSession` 接口是否变化。
2. `ConversationRoot` 的工作区标题推导及标准 Composer 插槽是否变化。
3. `WorkspaceBrowser` 的分组推导、SessionTree 渲染及 Sidebar 的全局新会话回调是否变化。
4. 重新生成并应用三个补丁：`dsh-client-ui-workspace`、`dsh-client-ui-conversation`、`dsh-client-ui-sidebar`。
5. 执行 `npm ci`、`npm test`、`npm run typecheck`、`npm run build`，并手工确认“点击新会话后创建目录、显示标准 Composer 和临时会话分区”的完整链路。

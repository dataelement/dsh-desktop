# 从 `0.9.0-rc1` 产品分支升级到上游 `v0.10.0`

本次以 `dataelement/dsh-desktop` 的**发布标签** `v0.10.0`（提交 `c12911a9b510add7fb2d7467e85cc9ababbdfca6`）为基线，不跟随可能继续前进的同名开发分支。原产品分支升级前为 `e716a94b87d223f9401b7ae1de419b74f7be92f7`；本地保留 `codex/backup-pre-v0.10.0` 备份引用。仅向自己的 `origin` 推送产品分支，**不得向 `upstream` 推送**。

## 产品差异的处理

- 合并上游 0.10.0 的 Harness `0.1.7-rc.2`、桌面运行时、插件修复和构建流程；依赖锁文件跟随上游，同时保留 `dsh-desktop-vinabot` 本地依赖，将其 Harness peer range 更新到 `0.1.7-rc.2`。
- 将临时会话的创建、独立侧栏分组和标准会话界面补丁移植到新版本的 Workspace、Sidebar、Conversation UI 包；临时目录仍由主进程在用户目录创建。补丁通过 `patch-package` 生成，不依赖手工修改的 `node_modules`。
- 保留 VinaRouter 默认 `high` 推理强度、现有模型协议和图片支持策略。
- 保留 Windows 标题栏顶部 6px 拖拽带及控件免拖拽区域，以避免窗口顶部按钮被覆盖；保留侧栏品牌区和会话标题空白区可拖动。
- 按现有产品要求，PPT 软件包仍可安装、构建，但 `dsh-ppt-composer` **不挂载到默认 Profile**。上游 PPT 新增能力不等于本产品自动启用 PPT。

## 开发与验证

```powershell
git fetch upstream --prune --tags
git show --no-patch v0.10.0
npm ci
npm run typecheck
npm test
npm run build
```

`npm test` 的 `pretest` 会先构建本地 PPT 运行时。直接运行 PPT 集成测试前，尤其是重新执行 `npm ci` 之后，应先执行 `npm run ppt:build`。升级时 `npm ci` 的 postinstall 必须成功重放所有 `patches/` 补丁。

本次 Windows 环境中，类型检查和客户端构建通过。临时会话、VinaRouter、标题栏、Profile 一致性等定向测试通过。全量测试第一次为 1266 项通过、11 项跳过；其中产品 PPT 挂载断言已按“不挂载”策略更新，存储防抖用例单独复跑通过。上游 `test/ppt-personal-templates.test.mjs` 的超大 PPTX 预览测试在 Windows 上仍复现 `EPERM`（重命名 `.preview.*.stage` 到 `preview`）；PPT 当前未启用，但后续要启用时必须先排查这一项，不应将全量测试标记为通过。

Windows 真机仍需回归：顶部空白区拖动；右上角所有按钮及 Tab 关闭按钮点击；临时会话新建和历史打开；VinaRouter 登录、选模型、图片上传、`high` 推理级别下发送消息。开发环境测试不替代上述人工操作。

升级后建议以 `product/v0.10.0` 继续开发，保留 `origin/product/0.9.0-rc1` 供回退，不要强制推送或改写旧远程分支。下次同步上游时先检查标签与新产品分支的差异，再普通合并并重新运行补丁、类型检查和测试。

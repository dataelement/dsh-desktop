# Harness 0.1.5-rc.1 真机验证清单

配套 [harness-0.1.5-rc.1-upgrade.md](./harness-0.1.5-rc.1-upgrade.md)。
自动化已覆盖的（vitest 751/751、tsc、build、`verify-harness-auth.mjs`）不再重复；
这里只列**必须真机点一遍**的功能点。

**先做 §6 冷启动**，再按 §1 → §5 的顺序走。

## 0. 两套环境，覆盖面不同

| 环境 | 命令 | 能验什么 | 不能验什么 |
| --- | --- | --- | --- |
| 开发运行 | `npm run dev` | 绝大多数 UI 与主机能力 | **loader / client-modules / hmr-fallback 三个补丁在这里是死代码** |
| 打包构建 | `npm run package:dev:mac:arm64`（或 `:x64` / `package:dev:win`） | 全部，含打包态模块解析 | — |

原因：未打包的 Electron 拿得到 Node 内部 ESM loader，签名打包后拿不到。
`cordis-plugin-loader`、`dsh-client-modules`、`dsh-desktop-hmr-fallback` 三者只在打包态生效，
**必须在 §4 用打包产物验证，dev 跑通不算数**。（注意：这三者与 §6 的
`Harness stopped unexpectedly (exit code 0)` 无关，那是启动入口契约问题，已修复。）

排查位置（macOS，dev 构建的产品名是 `DSH Desktop Dev`）：

- 日志：`~/Library/Logs/<产品名>/harness.log`
- Profile：`~/Library/Application Support/<产品名>/harness/profiles/web/`

---

## 1. P0 — 本次从零重写，必须逐条验

### 1.1 永久删除会话（`dsh-session-persistence` / `-jsonl` / `dsh-workspace` / `dsh-api-session-controller` / `dsh-client-ui-workspace`）

这条链整条是按 0.1.5 的新 handle 所有权 API 重写的，且**会真实删文件**，优先级最高。

- [ ] 侧栏会话行**右键**能弹出菜单（右键菜单本身也是补丁加的）
- [ ] 菜单里有「删除会话」，红色/danger 样式，带垃圾桶图标
- [ ] 点击后确认弹窗文案完整：「将永久删除“{名称}”的会话记录与执行轨迹。**工作区文件会保留。此操作无法撤销。**」
- [ ] 确认后按钮进入「正在删除会话…」，会话从侧栏消失
- [ ] **磁盘核对**：`$DSH_HOME/sessions/` 下对应的 `.jsonl` 文件确实没了，**同项目目录下其他会话的日志文件还在**
- [ ] 删除**当前正在打开**的会话：界面正确回落（不停在空白/报错页）
- [ ] 删除一个**正在跑任务**的会话：要么被拒绝并给出提示，要么先停止再删除，**不能留下半删状态**
- [ ] 删除后重启 App：该会话不复现，其余会话、工作区分组、归档状态都正常
- [ ] 删除一个**已归档**的会话：归档列表里也一并消失

失败长相：删除后文件还在 / 删错文件 / 删除后重启会话又回来了 / 报
`cannot delete session ... while ...`。

### 1.2 内置 PPT 插件（`packages/ppt-runtime`，surfaceOp 改名）

0.1.5 会对旧结构直接抛 `invalid replace surfaceOp`。触发点是**关闭 PPT 模式时清理历史自动指令**。

- [ ] 空会话上能看到 PPT 模式按钮（hero 区域），点开后能进入 PPT 模式
- [ ] **开启 PPT → 发一轮 → 关闭 PPT → 再开启**，全程不报错
- [ ] 关闭 PPT 后，之前注入的自动指令消失，用户自己写的内容保留
- [ ] 带 PPT 会话**重启 App 后恢复**，模式状态正确，不报 `invalid replace surfaceOp`
- [ ] 完整生成一次 PPTX 并能打开

失败长相：`harness.log` 里出现 `session event "user/message" carries an invalid replace surfaceOp`。

> 注：PPT bundle 是在既有 tarball 上定点改后 `npm pack` 重打的，没跑完整
> `npm run ppt:build`。若这里发现产物异常，先跑一次完整重建再复测。

---

## 2. P1 — 实现方式变了（CSS 从「整段替换」改成「追加」），重点看视觉

这几个补丁以前是把整段 CSS 和 class map 换成本机重建的副本，现在改成保留上游样式、
只追加 Desktop 自己的规则。**功能大概率没问题，但样式错位是这次最可能的回归**。
建议浅色/深色主题各看一遍。

### 2.1 Agent 预设（`dsh-client-ui-agent-preset`，改动最大：+516→+470，且新增 `dshPreset_` 前缀）

- [ ] 预设选择器弹层宽度正常（`min-width:360px`），不塌不溢出
- [ ] 顶部搜索框样式正常，聚焦有高亮边框；输入能过滤，无结果显示「没有匹配的模式」
- [ ] 分组标题、选中项高亮、最近使用区域显示正常
- [ ] 底部「浏览 Awesome Presets…」入口在，点击打开外部浏览器
- [ ] 设置 → 预设页：右上角操作区（导入/导出按钮）**横向排布、右对齐**，不换行不重叠
- [ ] 导出一个自定义预设 → 得到 `.dshpreset` 文件
- [ ] 导入该文件 → 弹出「确认预设包」对话框，能看到：包内容列表、**安全警告**（"自定义预设可以使用与 Agent 相同权限的工具和命令…"）、标识符输入框
- [ ] 标识符冲突时提示重命名，改名后能导入成功
- [ ] 导入一个由旧版本导出的包 → 显示版本不匹配警告
- [ ] 导入过程中按钮显示「正在导入…」

### 2.2 会话列表未读 / 在 Finder 中打开（`dsh-client-ui-workspace`，+326→+207）

- [ ] 会话右键 →「标为未读」→ 出现**未读圆点**，标题变粗
- [ ] 再右键 →「标为已读」→ 圆点消失，标题恢复
- [ ] 未读圆点在「平铺列表」和「按工作区分组」两种视图下都不挤压标题
- [ ] 菜单里未读图标是**空心圆环**（不是实心点）
- [ ] **工作区**行右键 →「在 Finder 中打开」→ 正确打开对应目录（Windows 上是资源管理器）
- [ ] 会话重命名输入框样式正常，回车生效、Esc 取消

### 2.3 其他追加型 CSS

- [ ] 侧栏（`dsh-client-ui-sidebar` + `dsh-client-ui-layout`）：macOS 上展开态顶部留白让开红绿灯，不被交通灯压住
- [ ] 侧栏**折叠**后是宽约 80px 的竖条（Windows 上 56px），图标居中不贴边
- [ ] 侧栏品牌区（logo + 文字）间距正常，不粘连
- [ ] PPT 模式下输入框左侧的 accessory 区域（`conversation.input.accessory`）与输入区并排，不挤压光标位置
- [ ] 空会话 hero 区的模式按钮簇（`conversation.hero.modeActions`）与旁边预设控件对齐、高度一致、悬停/选中态正常

---

## 3. P1 — 功能补丁（本次原样或小改迁移，做回归确认）

### 3.1 模型选择与设置（`dsh-client-ui-model-selection` / `dsh-client-ui-settings-models`）

- [ ] 输入框上方模型选择器：打开后**搜索框自动聚焦**
- [ ] 输入关键词能同时按**模型名和服务商名**过滤，分组保留
- [ ] 无结果显示「没有找到匹配的模型。」
- [ ] Esc 从二级面板返回一级并清空搜索词；再次打开搜索词是空的
- [ ] 上下方向键在列表里循环移动焦点（第一次按↑跳到最后一项）
- [ ] 设置 → 模型：服务商搜索框能过滤可添加的服务商列表
- [ ] 服务商按优先级排序（常用的在前），同级按名称排
- [ ] 模型目录有「搜索模型」框，无结果显示「没有找到匹配的模型。」
- [ ] 单个模型的「模型设置」里有**推理等级**输入（逗号分隔，占位符 `例如：low, medium, high`），保存后该模型在会话中能选到这些等级
- [ ] 清空推理等级 → 该模型不再显示等级选择
- [ ] 单个模型有**「支持图片输入」**开关，打开后能给该模型发图片
- [ ] 首次接入引导对话框分类正确：模型厂商 / 推理服务平台 / 模型聚合平台，「接入并继续」可用

### 3.2 供应商错误码（`dsh-llm-deepseek` / `dsh-llm-pi-ai` / `dsh-client-ui-chat` / `dsh-client-ui-trajectory`）

这组是把 401/403 分开、并让额度问题优先于状态码。

- [ ] 填**错误的 API Key** → 会话内提示「API 密钥无效」（401 → AUTH，行为不变）
- [ ] 用一个**有效但无该模型权限/地区受限**的 Key → 提示「模型服务商拒绝了本次请求，请检查账号权限、地区限制或模型开通情况。」（403 → FORBIDDEN，**本次新增**）
- [ ] 额度耗尽/余额不足 → 提示「账户额度或余额不足…」（QUOTA 优先于状态码）
- [ ] 上述三种提示在**轨迹详情面板**里也是同样文案（不是原始英文报错）

> 403 和 QUOTA 不好造：可以临时把 Key 换成另一个账号下未开通该模型的 Key，
> 或用一个已欠费的账号。造不出来就记为「未验证」，别当成通过。

### 3.3 目录选择器（`dsh-client-ui-directory-picker-native`）

- [ ] 添加工作区 → 弹出的是**系统原生目录选择框**，不是网页内的路径输入
- [ ] 取消选择不报错，选中后工作区正确加入
- [ ] 空会话 hero 区的「选择工作区」入口走的是同一个原生框
- [ ] **Windows 重点**：目录选择不再报 `worker exited`（历史问题）

### 3.4 助手输出里的本地路径可点击（`dsh-client-ui-deliverables`）

- [ ] 让模型在回答里提到 `src/main/index.ts`、`./scripts/build.mjs`、`/etc/hosts` 这类路径 → **可点击并打开**
- [ ] 提到 `package.json`、`vitest.config.ts` 这类纯文件名 → 可点击
- [ ] 提到 `@scope/pkg`（作用域包名）、`someone@example.com`（邮箱）→ **不可点击**
- [ ] 本轮**没有任何工具产出文件**时，上述路径**仍然可点击**（本次修的正是这个分支）
- [ ] 带行号后缀的 `src/a.ts:42`、`src/a.ts#L42` 也能点开

---

## 4. P0 — 只能在打包产物上验（dev 跑通不算）

用 `npm run package:dev:mac:arm64` / `package:dev:win` 出包后安装运行。

### 4.1 打包态模块解析（`cordis-plugin-loader` / `dsh-client-modules`）

- [ ] 打包 App 冷启动能进主界面，`harness.log` 里没有 `--expose-internals is required for HMR service`
- [ ] 通过插件市场安装**任意一个社区插件** → 重启 App → **插件正常加载并出现在界面上**
- [ ] `harness.log` 里没有 `Cannot find package '<插件名>'` / `ERR_MODULE_NOT_FOUND`
- [ ] 该插件如果带客户端半边（UI），前端也能正常渲染，没有 plugin-recovery 界面

失败长相：装完插件重启后插件不见了，或直接进入插件恢复页 —— 说明这两个补丁没生效。

### 4.2 desktop 插件闭包镜像（`@deepseek-ai/dsh` manifest 补丁）

- [ ] `~/Library/Application Support/<产品名>/harness/profiles/web/node_modules/` 下能看到全部 5 个：
      `dsh-ppt-composer`、`dsh-desktop-client-ui`、`dsh-desktop-hmr-fallback`、
      `dsh-desktop-market-installer`、`dsh-desktop-preset-transfer`
- [ ] 界面上对应能力都在：PPT 模式按钮、Desktop 品牌 logo、插件市场入口、预设导入导出

### 4.3 安全模式（`dsh-desktop-hmr-fallback`）

- [ ] 从应用菜单进入安全模式 → 能正常启动到主界面
- [ ] 安全模式下第三方插件被屏蔽，但 Desktop 品牌和基础功能在
- [ ] 退出安全模式后恢复正常 profile

---

## 5. 跨版本兼容（升级路径）

- [ ] 用**旧版本（0.1.2-rc.1 基线）App 产生的 `$DSH_HOME`** 直接启动新版本：
      历史会话能打开、能继续对话、工作区分组和归档状态都在
- [ ] 旧版本导出的 `.dshpreset` 能被新版本导入
- [ ] 旧的模型配置（服务商 + Key）无需重填
- [ ] 旧的 PPT 会话能打开（重点看 §1.2 的 surfaceOp 报错）

---

## 6. 冷启动本身（最先做这一步）

0.1.5 把 CLI 改成 `if (import.meta.main)` 门禁 + `runCli` 导出，我们的
`build/harness-node-entry.mjs` 是导入它的，一度导致**加载后静默 exit 0**，界面只报
`Harness stopped unexpectedly (exit code 0 (0x00000000))`。已修复，但这是本次最容易复发的点。

- [ ] 冷启动能进主界面；`harness.log` 里能看到 `[harness-node] invoking DSH runCli()`
      紧接着 `dsh web: http://127.0.0.1:<port>/?token=…`
- [ ] 日志里**不应**出现「`DSH entry loaded` 之后直接 exited (exit code 0)」
- [ ] **一次冷启动只应有一条 `[desktop] starting`**。若出现
      `starting → Harness entry failed → plugin recovery → 安全模式 → 再 starting`
      的连环，说明有插件加载失败，每轮空转约 30 秒（这就是"启动超级慢"的样子）
- [ ] 日志里没有 `cannot get property "..." without inject` /
      `failed to apply loader entry ...`
- [ ] 安全模式同样能起来（`profile desktop-safe-mode` 那次也要有 `dsh web:` 行）
- [ ] 冷启动到界面可用的时间应在 **10 秒以内**（干净 DSH_HOME 实测 4–6 秒）

## 7. 第三方插件兼容（真机独有，与本次改动无关但会挡住验证）

真机日志已经暴露两个既有插件在 0.1.5 下的问题，验证前先确认它们不会挡路：

- [ ] `dsh-usage-stats`：报 `StorageError: invalid unit name 'usage-stats-aliases'`
      （0.1.5 的 `dsh-storage-json` 收紧了 unit 名校验）
- [ ] `dsh-better-sidebar`：peer 校验失败导致 generation 迁移被冻结
      （`@lexical/clipboard: typescript resolves outside the generation closure`）
- [ ] `dsh-plugin-width-slider`：`cannot get property "webServer" without inject`
      —— 与内置 PPT 插件同一个 0.1.5 破坏性改动，但这个插件不是我们的代码，
      需要作者跟进或先禁用

建议先用一个**干净的 `$DSH_HOME`** 跑完 §1–§5，再单独回来处理这两个插件的兼容，
否则容易把插件问题误判成补丁问题。

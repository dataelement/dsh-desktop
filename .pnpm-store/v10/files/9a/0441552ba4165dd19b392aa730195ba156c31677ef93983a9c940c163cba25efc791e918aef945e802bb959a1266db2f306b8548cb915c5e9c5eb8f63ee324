<p align="center">
  <img src="assets/logo.svg" width="96" alt="dsh-market logo">
</p>

# dsh-market

[English](README.md) | 中文

[![npm](https://img.shields.io/npm/v/dshmarket)](https://www.npmjs.com/package/dshmarket)
[![stars](https://img.shields.io/github/stars/dsh-market/dsh-market?style=flat)](https://github.com/dsh-market/dsh-market)

装在 DeepSeek Harness 里的插件市场。打开设置 → **插件市场** → 逛一逛，点一下，装好。

![dsh-market](assets/demo-zh.png)

主题一键换：装完即生效，点一下切换，不用重启。

## 安装

```sh
dsh plugin --profile web add dshmarket
```

重启 `dsh web`，打开 **设置 → 插件市场**。

**需要 dsh web 0.1.0-rc.6 或更新版本。** 宿主太旧时市场会自我禁用，并在浏览器
控制台说明原因，而不是拿缺失的原语去渲染——如果设置里根本没出现「插件市场」这
一项，通常就是这个原因。桌面端要留意：它可能内置了比 `npm` 装到的更旧的 dsh（#139）。

## 你会得到

- **逛与搜**——完整社区目录（2300+ 插件，每天在涨），分类筛选、star 数、最热/最新排序，中英描述跟随界面语言
- **按宿主发现**——卡片展示插件通过 `engines.dsh` 或同版本线 `@deepseek-ai/dsh-*` peer 声明的 DSH 要求；可选筛选只隐藏与当前宿主明确不匹配的插件。未声明、格式异常、暂时取不到清单及仅 GitHub 发布的条目仍保持可见，不猜成不兼容
- **截图展示**——App Store 式截图，多图自动轮播，点开还能看大图；作者在 registry 里策展的截图列表卡片就直接显示（零额外请求），没有策展的插件则在打开安装弹窗时自动从 README 抽取；图片仅从 GitHub 图床加载
- **评论**——每张卡片都能就地打开该插件的讨论。它和插件在 [dshmarket.com](https://dshmarket.com) 与[目录站](https://awesome-dsh-plugin.com)上的页面共用同一条讨论，一个插件只有一处对话，而不是三处。底层是 GitHub Discussions（经由 giscus）：打开即加载，只有发表评论才需要 GitHub 账号；说明里也直说打开会连接 giscus.app 与 GitHub。本地 dsh web 继续内嵌评论供阅读，登录和发表则通过专用 GitHub 入口在新标签页打开当前插件的精确讨论，不让跨站回跳携带或依赖宿主会话
- **收藏**——在「发现」或「主题」页点书签即可收藏插件/主题；「收藏」Tab 集中展示，支持搜索、排序与安装。书签写入 profile 的市场状态（`state.json`）；已下架条目可一键清除
- **主题**——独立主题页：装完立即生效，点一下切换（主题互斥、选择跨重启保留），卸载即恢复
- **一键安装**——确认来源，实时进度；多数插件刷新页面即可用，无需重启
- **备份与恢复**——把 profile 的插件清单与配置导出为可读 JSON，换机导入，存到 WebDAV 并每日自动备份，或通过私有 GitHub Gist 跨机器同步；恢复采用**合并**方式（备份之后新装的插件会保留），写入前校验、失败自动回滚
- **更新**——逐插件检测（npm 版本或锁定 commit 对比 HEAD），一键更新或全部更新；市场自己也走同一通道升级
- **GitHub 多线路容错**——中国大陆下载区域会为 Git ref、README 与头像分别维护 fallback 顺序，记住上次可用线路，只在传输、HTTP 状态或响应内容校验失败后换线，并拒绝公共反代伪装成 HTTP 200 的 HTML 错误页。内置线路全部失效时，可到**设置 → 插件 → 插件配置 → GitHub 加速**填写一个持久化的自定义 HTTPS 前缀；运维设置的 `DSHM_GITHUB_PROXY` 始终优先
- **公共更新接口**——插件自己的设置页可调用带版本号、能力探测和回滚状态的[更新 API v1](UPDATE-API-V1.md)（beta），无需复制包管理逻辑，也不依赖市场 UI 的私有响应字段
- **卸载**——两步确认防误触；本次会话装的插件即点即卸
- **热禁用 / 启用**——开关会往 profile 的 `cordis.patch.yml`（官方补丁层，机制移植自 [dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub)）写入 `- id: …` + `disabled: true|false`：DSH 的 HMR 约 1 秒内重新组合，无需重启，loader 每次启动都会重新应用这个选择；手工改过的补丁行会显示成徽标，宿主基础设施插件禁止开关，补丁文件格式不对时绝不会被写得更糟
- **按需重启**——无法热加载的变更会在待重启提示旁显示一键重启；操作仅接受本机同源请求
- **零术语**——缺组件（pnpm）时市场自己发现、一键自动装好，全程不见命令行
- **导出日志**——一键生成脱敏纯文本日志方便反馈（home 路径与密钥形状已打码；任何数据都不会被上传）。市场版本号就在标题旁边，截图反馈时自带版本信息
- **设置卡片**——dsh 0.1.0-rc.7 起，市场在 **设置 → 插件 → 插件配置** 里管理**它自己**，和其它插件并排：看当前版本、选择**更新通道**（稳定版，或 Beta 抢先试用还在验证中的版本——只影响市场自己，不影响你装的其它插件；打开开发者模式后还会多出「开发版」通道，直接取开发分支上的构建）、更新、或者移除市场。移除时可勾选一并清理——包括市场写进补丁层的停用行，被它关掉的插件会恢复运行，而不是保持停用却再没有界面能打开它们
- **诊断**——插件加载顺序与冲突一页看全：bundle 栈（官方/社区徽标）、重复的 loader 条目、依赖版本不一致、核心包多版本共存、覆盖项与非法配置条目。术语说人话，问题块高亮，全部可折叠
- **加载顺序**——拖拽调整社区 bundle 的顺序，或直接采用按插件自身 before/after 规则推导出的建议顺序。写入前先跑一次静态组合校验，通过才落盘；应用之前面板会告诉你这个顺序会改变什么（多少处覆盖、多少无效或重复条目）
- **AI 修复**——一键把诊断结果生成的修复 prompt（错误/警告/顺序冲突 + 保守的改动范围约束）复制到剪贴板，你粘进新对话，自己决定发不发。提示词会先让 Agent 判断自己是不是就是这个 profile 所在的 harness——若是，则严禁改动运行中组合、升级/重启 harness 或核心包、重装依赖，而是让它生成一份幂等的 `apply` 修改脚本和一份 `rollback` 回滚脚本，由你在外部终端执行并把输出拷回给它

## 速度

安装依次优先使用经仓库验证的 npm 包、作者提供的 GitHub Release 预构建 tarball，最后才回退到整仓 GitHub 源码下载。预构建安装通常只需数秒且无需执行本地构建脚本；仅提供源码的插件仍取决于你到 GitHub 的网络。

## 安全

- 只允许安装 [awesome-dsh-plugin](https://awesome-dsh-plugin.com) 精选列表内的来源,其它一律拒绝
- 构建脚本默认禁止执行（pnpm ≥10）,放行与否由你按包显式决定
- 终端/命令行类插件装进网页版前会被明确提醒
- 安装接口只接受同源 POST;市场不会向任何地方上报数据
- 备份可能包含 profile 配置里的密钥——导出与上传前 UI 会明确提醒;WebDAV 同步仅限 https、拒绝内网地址,且密码永不落盘浏览器
- 带鉴权的 Gist 请求始终直连 `api.github.com`，Bearer token 不会交给公共 GitHub 加速服务；GitHub 源码归档也保持 canonical codeload URL，以保留 pnpm 的完整性校验边界
- 重启接口还要求客户端直接来自环回地址（拒绝代理转发请求），并使用原入口、参数、环境和工作目录重新启动 DSH
- 一键重启会启动脱离终端的替代进程。**当本进程就是 systemd 服务的主进程时，按钮会自动隐藏**——否则市场重启会连带杀掉 cgroup 里的接管进程，服务起不来，待重启提示会说明原因。判定要求「systemd 标记」和「本进程是该 unit 的主进程」同时成立：`INVOCATION_ID` 会被 unit 的所有后代继承（包括普通终端），只看它会误伤一大批本来能正常重启的机器。pm2 和 launchd 不做检测，这类部署需要下面的显式配置。两种做法：在**设置 → 插件 → 插件配置**里关掉「允许重启」，或者写进 profile 补丁——注意必须嵌在 `config:` 下面，因为 loader 只把这个子对象传给插件，写在顶层会静默失效（#227，感谢 @Fantasymax）：

  ```yaml
  - id: dsh-market
    name: dshmarket
    config:
      allowRestart: false   # 不要和 `name:` 并排写在顶层
  ```

  生效后 `GET /dsh-market/status` 会返回 `"restart": false`。
- 从终端启动时，替代进程脱离原终端，关闭原终端后仍会继续运行
- 收录 ≠ 背书:插件是第三方代码,请只安装你信任的来源

## 提交你的插件

**这个仓库是市场应用本身，不是插件目录。** 市场里的插件列表来自精选列表 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)——想让你的插件上架，请去**那边**提 PR（在列表里加一条即可，站点和本市场会自动收录，通常一天内生效）。请不要往本仓库提插件条目。

## 路线图与反馈

- **Bug** 提 [issue](https://github.com/dsh-market/dsh-market/issues)，附上市场页面的「导出日志」能让排查快十倍
- **功能建议**放 [Roadmap](https://github.com/orgs/dsh-market/projects/1)。issues 只留「坏掉的东西」，所以提成 issue 的建议会被移到那边并关闭；讨论仍留在你写的地方
- 路线图上的每一项都欢迎社区 PR——动手前在对应条目里说一声，免得两个人重复造

## 数据源

每次打开都实时请求 [awesome-dsh-plugin.com/plugins.json](https://awesome-dsh-plugin.com/plugins.json)——精选条目、npm 映射、star 数由 CI 每日刷新，不使用过期缓存兜底；连不上时会给出具体原因和耗时，并提供「重试」按钮。

刻意不做本地快照兜底：目录每天都在增长，过期的答案不是「差一点」而是「错的」——今早刚发布的插件会显示成「不存在」。

**如果你的网络访问不了这个域名**，可以改指到镜像：在 dsh 运行的环境里设置 `DSHM_REGISTRY_URL`，指向任何提供相同 `plugins.json` 结构的地址：

```sh
DSHM_REGISTRY_URL=https://your-mirror.example/plugins.json dsh web
```

## 友情链接

### DSH Desktop（dataelement）

[dsh-desktop](https://github.com/dataelement/dsh-desktop)——DeepSeek Harness 桌面客户端：无需自装 Node.js 即可运行和管理本地 Harness，并默认预置本插件市场。[dshdesktop.com](https://dshdesktop.com)

### DeepSeek Harness Desktop（hairyf）

[deepseek-harness-desktop](https://github.com/hairyf/deepseek-harness-desktop)——基于 **Tauri**（Rust + Web）构建的 DeepSeek Harness 原生桌面客户端：一键本地安装并启动，无需自装 Node.js；首次启动可选择安装本插件市场作为推荐插件。

### DeepSeek Harness Desktop（anywhere-labs）

[deepseek-harness-desktop](https://github.com/anywhere-labs/deepseek-harness-desktop)——基于 Electron 的 DeepSeek Harness 桌面客户端，理念是「万物皆插件，桌面本身也是插件」：支持 profile 切换、内置 Node 与 pnpm，安装前会先给 profile 拍快照以便回滚。[dshdesktop.cn](https://dshdesktop.cn)

### DSH App

[dsh-app](https://github.com/RyensX/dsh-app)——基于 Tauri 2（而非 Electron）的 DeepSeek Harness 桌面客户端，因此安装包小得多，界面走系统 webview。AGPL-3.0。

### Local DSH

[local-dsh](https://github.com/liangchen-harold/local-dsh)——可以把模型跑在本机的 DeepSeek Harness 桌面客户端：发行包内置 llama.cpp 与 Node、pnpm、DSH，下载一个 GGUF 模型就能对话，不必接外部 API。基于 Tauri 构建；目前支持 Apple 芯片的 Mac。[localdsh.com](https://localdsh.com)

### DSH Get

[DSH Get](https://www.dshget.com/)——DeepSeek Harness 插件的网页检索目录：分类筛选、中英描述、安装命令与插件详情页；其规范化的目录快照公开在 [bobby-sheng/dshget-data](https://github.com/bobby-sheng/dshget-data)。

### modlens

[modlens](https://github.com/liustack/modlens)——全网第一个 DeepSeek Harness 视觉插件，为 DeepSeek、GLM 等纯文本模型外挂视觉能力，粘贴图片即得结构化 JSON 证据（OCR、版面、语义）。本市场内即可直接安装：

```sh
dsh plugin --profile web add @liustack/modlens
```

## 许可

MIT · [dshmarket.com](https://dshmarket.com)

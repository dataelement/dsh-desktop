# dsh-image-generation

DSH/Cordis 公共生图插件，提供 `image_generate` 工具、`generate-image` Skill 和「设置 → 插件 → 插件配置 → 生图工具」卡片。PPT、Word 和普通对话共用同一份配置与图片资产。

## 使用

DSH Desktop 默认装载本插件。在生图工具卡片选择 Seedream 或 OpenAI，填写该平台的 API Key 并保存。生图模型支持预设选择或自定义输入，API 地址可在高级设置中修改。

生图模型使用下拉选择。OpenAI 的「获取模型」用当前填写或已保存的 Key 发起一次 `GET /models`，筛选 Images API 支持的 GPT Image 模型；获取过程只更新候选列表，配置在点击保存时生效。查询来源保留在接口中，界面显示候选模型、空列表和查询错误。字节的管理接口使用独立签名凭据，因此 API Key 模式提供内置选项和自定义模型/接入点 ID。

Seedream 预设按 [火山方舟模型列表](https://docs.volcengine.com/docs/82379/1330310) 的图片生成能力核对（2026-09-10）：

| 模型 | 模型 ID |
| --- | --- |
| Seedream 5.0 Pro | `doubao-seedream-5-0-pro-260628` |
| Seedream 5.0 | `doubao-seedream-5-0-260128` |
| Seedream 5.0 Lite | `doubao-seedream-5-0-lite-260128` |
| Seedream 4.5 | `doubao-seedream-4-5-251128` |
| Seedream 4.0 | `doubao-seedream-4-0-250828` |

官方目录明确同时支持 5.0 和 5.0 Lite 两个 ID。预设表示插件支持的型号，实际可用性取决于账户开通情况；自定义入口用于填写其他模型或接入点 ID。

API 地址同时接受基础地址和控制台提供的完整 `/images/generations` 地址。保存时统一为基础地址，实际请求只添加一次接口路径。

| 服务商 | 默认模型 | 默认 API 地址 |
| --- | --- | --- |
| 字节 / 火山方舟 | `doubao-seedream-4-5-251128` | `https://ark.cn-beijing.volces.com/api/v3` |
| OpenAI | `gpt-image-1.5` | `https://api.openai.com/v1` |

保存自动发起一次非生图校验请求，界面显示校验中、保存成功或具体错误。失败保留输入及之前的有效配置。Key 更换后立即生效；两个服务商分别保存配置和 Key。更换 API 地址的域名时需要重新填写 Key。

- OpenAI：`GET /models/{model}`，检查凭据和模型元数据访问。Key 需要允许读取该模型信息。
- 字节：`POST /images/generations`，请求体仅含 `model`，省略必填 `prompt`。只将明确的 prompt 缺参错误识别为连接校验成功，其他错误正常报错。该请求进入参数检查，不提交生图任务。采用此方式是因为 Ark 官方运行时 SDK 没有可依赖的模型列表接口。

校验结果与实际生图成功分别记录。生图权限、余额、内容审核和输出效果在真正调用时确认。本插件没有生成测试图按钮。

提示词示例：「为这份 PPT 生成一张留出左侧标题空间的科技插画，风格沿用当前模板。」Agent 加载 Skill 后调用 `image_generate`，按当前 Host 权限策略直接执行，将图片保存到工作区 `.workbuddy/generated-images/<sha256>.png`。工具返回路径、尺寸、字节数、哈希、服务商和模型。图片可保留透明通道，标题、表格和简单图表继续使用 Office 原生对象。

本期支持文生图，每次生成一张图片。OpenAI 的 16:9 / 4:3 请求使用 1536×1024 画布，竖图使用 1024×1536；文档按实际返回尺寸等比放置或裁剪。字节按目标比例选择支持的画布。编辑图、参考图、批量生图和本地模型留待后续版本。

字节请求采用 Seedream 4.5 / 5.0 Pro 共用的单图字段，由服务端默认单图模式执行。自定义接入点 ID 也使用这一契约。组图控制属于独立能力，5.0 Pro 的单图请求省略 `sequential_image_generation` 及其 options。模型能力和画布范围参考 [BytePlus 官方 Seedream 能力表](https://docs.byteplus.com/api/docs/ModelArk/1824121)。

生图失败时，工具和 Host 日志保留 HTTP 状态、服务商错误码、参数名及请求编号。错误响应最多读取 64 KB，仅提取受限格式的诊断字段；服务商原始错误文本可能回显 Key 或提示词，因此留在 Host 处理。模型根据具体原因反馈，参数错误交由插件修正。

对话直接展示生成图片，点击缩略图可放大，Esc 或点击背景关闭。已有成功生图记录也能预览。预览接口通过 Host 鉴权，按会话中成功的工具结果授权读取对应 PNG，并校验目录、文件类型、体积和 SHA-256；访问留有审计日志。图片以文本资产信息返回给聊天模型，界面预览与模型视觉能力分别处理。

## 独立分发

该目录是可公开分发的 MIT npm 包，包含 Host、Client、Skill 和 `dsh.bundle.patch`。本 PR 提供源码与 tarball；npm registry 发布为单独操作。

在仓库根目录打包：

```sh
npm pack ./packages/dsh-image-generation --pack-destination /absolute/output/directory
```

在具有匹配 Harness 服务的独立 DSH 安装中，可通过 `dsh plugin --profile web add /absolute/path/dsh-image-generation-0.1.0.tgz` 安装。要求 Harness `0.1.2-rc.1` 对应的 settings、credentials、connection、tools、skills、systemPrompt、sandboxPolicy、sandbox、subprocess 和 sessionController 服务。Desktop 已默认装载时直接配置即可。

## 凭据与执行边界

配置通过经过 Host 鉴权和 Origin 检查的 `/api/image-generation.settings`、`/api/image-generation.save` 路由读写。API 响应使用 `no-store`，读取接口仅返回 Key 是否已配置。

服务商、模型、地址和 Key 在 `ctx.credentials` 的 `dsh-image-generation/configuration` 私有记录中一次提交。凭据服务的跨进程锁和修订检查防止并发保存覆盖；失败保存保持整个旧记录。使用同一记录使一次工具调用读到一致的配置。通用 settings 仅注册卡片命名空间。Agent 参数、图片、日志和工作区均不携带 Key。

生图通过标准工具执行和审计流程，使用已保存配置直接调用；部署级工具策略继续生效。请求前及落盘前读取当前会话的 sandboxPolicy，要求工作区写权限；输出目录和目标文件拒绝符号链接。实际写入由 `ctx.sandbox` 包装的 `ctx.subprocess` 子进程执行，使用工作区写权限；仅通过 stdin 接收图片字节，清除继承环境，Key 留在 Host。PNG 使用临时文件、原子创建和内容哈希校验，避免并发生图产生半个文件。HTTP 禁止重定向，只接受 HTTPS 地址（本机回环开发服务允许 HTTP），约束超时、响应大小和解码像素；不下载厂商返回的任意远程 URL。系统沙箱的跨平台执行能力以部署环境为准，本期本地验收环境为 macOS arm64。

macOS Desktop 的 Host 运行在 Electron utility process 中；写图子进程显式设置 `ELECTRON_RUN_AS_NODE=1`，使同一可执行文件执行 Node 脚本。该启动常量与 Windows 的 SystemRoot 按需保留，凭据和 NODE_OPTIONS 继续清除。回归同时覆盖普通 Node 和真实 Electron utility process。

## 验证

```sh
npx vitest run test/image-generation.test.mjs test/desktop-plugin-closure.test.ts
node scripts/verify-image-generation.mjs
node scripts/verify-image-electron.mjs
npm run typecheck
npm test
```

测试使用本机模拟服务和真实 Harness 凭据存储、工具执行管线，覆盖两个厂商、单请求保存、成功/失败、修订冲突、凭据隔离、PNG 落盘、取消、体积限制和目录越界。Host smoke 启动隔离实例，验证默认装载、Client 入口、鉴权、Origin 及保存结果。真实付费模型与 Office 文档视觉验收在 `docs/STATUS.md` 单独记录。

接口参考：[OpenAI Images API](https://developers.openai.com/api/reference/resources/images/methods/generate)、[OpenAI 模型列表](https://developers.openai.com/api/reference/resources/models/methods/list)、[火山方舟生图 API](https://www.volcengine.com/docs/82379/1541523)、[火山方舟官方运行时 SDK](https://github.com/volcengine/volcengine-python-sdk/tree/master/volcenginesdkarkruntime/resources/images)、[火山管理接口及签名鉴权](https://github.com/volcengine/volcengine-python-sdk/blob/master/volcenginesdkark/api/ark_api.py)。

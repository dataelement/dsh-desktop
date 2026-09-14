# DSH Desktop 接入 VinaRouter

本文记录 `product/0.9.0-rc1` 分支内置 VinaRouter（`https://router.vinabot.ai`）的实现、用户操作和维护注意事项。

## 目标

用户不需要理解 OpenAI 兼容配置，也不需要手动复制 API 密钥。首次启动或打开「设置 → VinaRouter」后，只需：

1. 输入 VinaRouter 用户名和密码；
2. 账号启用两步验证时输入 TOTP 或备用码；
3. 从可用模型列表中勾选一个或多个模型，或者手动填写模型 ID；
4. 保存并开始使用。

DSH Desktop 会自动查找或创建本机专用 API Token、读取模型列表、写入模型提供方配置并选择默认模型。

## 用户操作

### 首次接入

1. 启动 DSH Desktop。
2. 在「连接 VinaRouter」窗口输入中转站用户名和密码。
3. 如出现「两步验证」，输入身份验证器验证码或备用码。
4. 搜索并勾选一个或多个模型，再指定其中一个作为默认模型。列表为空或目标模型尚未公开时，点击「手动填写模型」。
5. 每个模型的 API 协议会自动选择，也可以单独调整：
   - 普通模型优先使用 Responses API；
   - 模型名称或 ID 包含 `claude` 时优先使用 Anthropic API；
   - 不支持上述协议的模型回退到 Chat Completions。
6. 点击「保存并开始使用」。

完成后，指定的默认模型会成为 DSH 默认模型，所有已勾选模型都会进入 DSH 模型选择器。

### 重新配置

1. 打开「设置 → VinaRouter」。
2. 点击「重新登录并配置」。
3. 重新登录并选择模型。

重新配置会更新 `vinabot` 提供方和 `VINABOT_API_KEY` 凭据，不会把密码或面板登录令牌写入磁盘。

### 临时手动配置

自动登录不可用时，仍可通过「设置 → 模型 → 添加自定义提供方」验证中转站：

```text
Provider ID: vinabot
显示名称: VinaRouter
API 地址: https://router.vinabot.ai/v1
API 协议: openai-completions
API 密钥: sk-<API Token>
模型: 点击“获取可用模型”，或手动添加模型 ID
```

## 接口流程

Host 插件按照中转站文档调用下列接口：

```text
GET  /api/status
POST /api/user/login
POST /api/user/login/2fa           # 仅启用 2FA 时
GET  /api/token/search
POST /api/token/                   # 没有本机令牌时
POST /api/token/:id/key
GET  /v1/models
POST /api/user/auth/logout
```

令牌名称为：

```text
dsh-desktop-<DSH 匿名设备标识前 8 位>
```

匿名设备标识是 DSH Home 内随机生成的 UUID，不根据用户名、主机名、IP 或硬件信息生成。

`POST /api/token/:id/key` 返回的原始密钥不带 `sk-`。插件会在保存前补齐前缀，并避免重复添加。

## DSH 配置结果

模型配置写入 `llm-pi-ai` 命名空间。由于 DSH 的一个提供方路由只能使用一种协议，插件会按协议自动拆分路由，等价结构如下：

```yaml
llm-pi-ai:
  providers:
    vinabot:
      displayName: VinaRouter · Responses
      apiKeyEnv: VINABOT_API_KEY
      api: openai-responses
      baseURL: https://router.vinabot.ai/v1
      models:
        - id: gpt-5.6-sol
          input:
            - text
            - image
          reasoningEfforts:
            low: low
            medium: medium
            high: high
            xhigh: xhigh
            max: max
    vinabot-anthropic:
      displayName: VinaRouter · Anthropic
      apiKeyEnv: VINABOT_API_KEY
      api: anthropic-messages
      baseURL: https://router.vinabot.ai/v1
      models:
        - id: claude-sonnet-example
          reasoningEfforts:
            low: low
            high: high
            max: max
    vinabot-chat:
      displayName: VinaRouter · Chat Completions
      apiKeyEnv: VINABOT_API_KEY
      api: openai-completions
      baseURL: https://router.vinabot.ai/v1
      models:
        - id: third-party-chat-model
          reasoningEfforts:
            low: low
            high: high
            max: max
```

API 密钥不在 YAML 中；它通过 `ctx.credentials` 写入 DSH 凭据存储。默认模型通过 `ctx.agentDefaultModel.saveSelection()` 保存。

## 模型和协议策略

`GET /v1/models` 返回的 `supported_endpoint_types` 用来判断模型能否作为 DSH 文本 Agent：

| VinaRouter EndpointType | DSH 协议 | 处理方式 |
| --- | --- | --- |
| `openai-response` | `openai-responses` | 支持，普通模型优先使用 |
| `anthropic` | `anthropic-messages` | 支持，Claude 模型优先使用 |
| `openai` | `openai-responses` + `openai-completions` | 非 Claude 文本模型会乐观提供 Responses，并保留 Chat 作为回退 |
| 图片、视频、Embedding、Rerank 等 | 不适用 | 不显示在该接入向导中 |

向导还会按模型系列和版本过滤列表，只显示 GPT 5.6 及以上、Claude 5 及以上、DeepSeek 4.1 及以上、GLM 5.3 及以上，以及 Kimi K3 及以上模型。过滤后的模型默认声明 `text` 和 `image` 输入能力；基础模型 `glm-5.3` 是唯一例外，只声明 `text`，而 `glm-5.3-flash` 支持 `text` 和 `image`。

一个 DSH 提供方配置只有一个路由级 API 协议。向导会把已选模型按协议写入 `vinabot`、`vinabot-anthropic` 和 `vinabot-chat` 三个受管路由；没有模型的路由会被删除。三个路由共用同一个 `VINABOT_API_KEY` 凭据。

手动填写的普通模型默认使用 `openai-responses`；名称包含 `claude` 时默认使用 `anthropic-messages`。也可以在界面明确切换协议。

Responses 路由中的模型会声明 `low`、`medium`、`high`、`xhigh`、`max` 五档推理等级；Anthropic 路由中的模型会声明 `low`、`high`、`max` 三档；VinaRouter 的 Chat Completions 路由中所有模型也会声明 `low`、`high`、`max`，并通过通用 `reasoning_effort` 字段传递思考强度。保存后，在聊天输入框的模型菜单中打开「推理等级」即可为当前会话切换。

由于部分第三方模型只在运行时暴露协议能力，向导对非 Claude、OpenAI 风格文本模型采用乐观 Responses 策略。如果某个模型实际不接受 `/v1/responses`，请在重新配置页面把该模型切换为 Chat Completions。

## 安全边界

- 用户名和密码只存在于本次请求和组件状态中；成功提交后立即清空密码。
- 面板 `access_token`、2FA `flow_token` 和模型 API Token 只保存在 Host 内存流程中，不返回给浏览器。
- 浏览器只收到流程 ID、用户显示名称和已脱敏的模型信息。
- API Token 只通过 DSH `credentials` 服务落盘。
- 所有本地接入路由挂在 DSH 的认证连接上，并返回 `Cache-Control: no-store`。
- 完成、取消、失败或插件退出时，插件尽力调用 `/api/user/auth/logout` 撤销临时面板会话。
- 上游响应体和密钥不会写入日志。
- 登录流程十分钟过期，Host 同时最多保留 16 个流程。

当前接入不保存 Refresh Cookie，也不自动刷新面板会话。面板登录只用于完成一次配置，模型调用长期使用专用 API Token。

## Turnstile

每次登录前插件会读取 `/api/status`。当 `turnstile_check=true` 时，纯 API 登录不能安全绕过验证，向导会停止并提示用户通过网站登录和手动配置。

如需在启用 Turnstile 后继续保持全自动体验，应在 VinaRouter 后端新增桌面授权/设备码流程，而不是把 Turnstile 私钥或绕过逻辑放进客户端。

## 代码位置

- Host 集成：`packages/dsh-desktop-vinabot/index.js`
- 客户端向导和设置页：`packages/dsh-desktop-vinabot/client.js`
- 组合入口：`build/dsh-desktop.patch.yml`
- 自动化测试：`test/vinabot-integration.test.ts`

## 验证命令

Windows PowerShell 中优先使用 `npm.cmd`，避免本机执行策略拦截 `npm.ps1`：

```powershell
npm.cmd test -- --testTimeout=15000
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

修改插件后应重启开发客户端；热更新不会重新加载 Host 插件。

### 2026-09-10 验证记录

- VinaRouter 定向测试：7 项通过；
- 完整测试：756 项通过、2 项跳过；
- TypeScript 类型检查和生产构建通过；
- 使用全新临时 `DSH_HOME` 启动真实 Harness 成功；
- 完成浏览器认证后，`GET /api/dsh-desktop/vinabot/status` 返回 HTTP 200；
- 首次配置弹窗实际渲染出用户名、密码、网站入口、稍后配置和登录按钮。

真实账号验收时还需确认：

1. 普通登录能够创建或复用 `dsh-desktop-*` Token；
2. 2FA 登录能够进入模型选择；
3. API 密钥不出现在浏览器响应、日志和 `settings.yaml`；
4. Chat Completions 模型可以进行流式回复和工具调用；
5. Responses-only 模型会自动保存为 `openai-responses`；
6. Responses 模型的聊天模型菜单能切换 Low、Medium、High、Xhigh、Max，Anthropic 和 Chat Completions 模型能切换 Low、High、Max；
7. 再次启动客户端后无需重新登录即可调用已保存模型。

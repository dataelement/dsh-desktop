# DSH Desktop × BiSheng 本地联调

本地 Mock 默认实现 `client-api.md` 的 0.5.0 客户端合同，自动化测试也会模拟 0.4.0 旧服务端，用于验证 DSH 侧的 PKCE 登录、双 Token 轮换、模型列表、SSE 调用、缓存 Token 明细、逐模型用量与退出。它不代表 BiSheng/Gateway 后端已经部署，也不计入真实联调验收。

## 启动

```bash
npm run mock:enterprise
```

Mock 仅监听 `127.0.0.1:17860`。使用 DSH Desktop Dev 包，在「设置 → 企业账号」填写：

```text
http://127.0.0.1:17860
```

正式包只接受 HTTPS。Dev 包可通过开发开关连接 `127.0.0.1` HTTP；内网明文 IP 需要用户在登录前明确确认。主机名 HTTP 和公网 HTTP 一律拒绝。

## 测试账号

| 身份 | 账号 | 密码 | 模型 |
| --- | --- | --- | --- |
| 员工 | `alice@demo.bisheng.local` | `WorkBuddy123!` | DeepSeek V3、GPT-4.1、Claude Sonnet 4.5、Kimi K2 |
| 管理员 | `admin@demo.bisheng.local` | `Admin123!` | 员工模型 + 毕昇 Mock Reasoner |

## 验证步骤

1. 在无外层卡片的企业账号页面直接输入 Mock BASE，点击黑色文字样式的「在浏览器中登录」。
2. 使用测试账号登录并允许授权；回调页显示登录成功后，DSH Desktop 应自动回到前台。
   - 自动回调持续未完成时，账号页会在 8 秒后直接显示一次性登录码输入框和“完成登录”按钮。
   - 正常自动回调不会显示手动输入区域。
3. 账号页顶部以绿色状态点和 BiSheng 展示名标识当前身份；模型列表采用默认模型设置页的描边卡片，右侧展示各模型的已用量/额度。中文用量以“万”为单位，最多保留两位小数并省略末尾零；零用量显示 `0`，大于零且不足 100 Token 显示 `<0.01万`。将鼠标移到模型行时，右侧原位切换为百分比。
   - 企业接口返回 `capabilities.vision: true` 时，模型名称后显示眼睛图标和“视觉”；标识直接读取企业配置。
   - 刷新模型后，标识与最新返回值同步；用量暂不可用时展示对应状态。
4. 在模型选择器中依次选择 DeepSeek、GPT、Claude 或 Kimi Mock 模型并发送消息；回复包含当前模型名称和“Mock 联调成功”。
5. 点击「可用模型」右侧的刷新图标，刚调用的模型用量与百分比应增加。
6. 点击「退出登录」，企业 provider 立即移除，本地加密凭证清空，Mock 会话被撤销。

## 旧版接续核验

- 主进程从 Electron `app.getVersion()` 读取应用版本，在授权请求中发送可选 `client_version`，设备名固定为 `DSH Desktop`。Mock 保存授权事务及会话的 `clientVersion`；真实 Gateway 需要支持该字段。不增加未知字段降级重试。
- 登录成功并同步模型后唤回桌面窗口；唤醒失败只记日志，不撤销已完成的登录，刷新会话不重复唤醒。
- Harness 启动前清理旧预览版写入的企业 provider 和账号快照，保留其他设置及用户自行配置的 provider。
- `enterprise-credentials.v1` 不迁移到 v2，使用旧预览版的用户需要重新登录。

## 证据边界

- 本地自动化与 Mock：可验证 DSH 客户端合同和错误处理。
- 真实 BiSheng/Gateway：仍需逐项执行 `client-api.md` 的 C01–C18，并核对 Nginx 路由、真实模型适配、SSE 超时与服务端日志。

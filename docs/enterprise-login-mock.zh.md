# DSH Desktop × BiSheng 本地联调

本地 Mock 默认实现 `client-api.md` 的 0.5.0 客户端合同，自动化测试也会模拟 0.4.0 旧服务端，用于验证 DSH 侧的 PKCE 登录、双 Token 轮换、模型列表、SSE 调用、缓存 Token 明细、逐模型用量与退出。它不代表 BiSheng/Gateway 后端已经部署，也不计入真实联调验收。

## 启动

```bash
npm run mock:enterprise
```

Mock 仅监听 `127.0.0.1:17860`。使用 DSH Desktop Dev 包，在「设置 → 账号与企业」填写：

```text
http://127.0.0.1:17860
```

正式包只接受 HTTPS。Dev 包通过专用开发开关接受 `127.0.0.1` HTTP，不能连接其他明文地址。

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
3. 账号页顶部以绿色状态点和 BiSheng 展示名标识当前身份；模型列表默认展示四个模型各自的已用量/总量，将鼠标移到模型行时，右侧原位切换为百分比。不展示租户、平台地址、会话到期时间或跨模型总量。
4. 在模型选择器中依次选择 DeepSeek、GPT、Claude 或 Kimi Mock 模型并发送消息；回复包含当前模型名称和“Mock 联调成功”。
5. 点击「可用模型」右侧的刷新图标，刚调用的模型用量与百分比应增加。
6. 点击「退出登录」，企业 provider 立即移除，本地加密凭证清空，Mock 会话被撤销。

## 证据边界

- 本地自动化与 Mock：可验证 DSH 客户端合同和错误处理。
- 真实 BiSheng/Gateway：仍需逐项执行 `client-api.md` 的 C01–C18，并核对 Nginx 路由、真实模型适配、SSE 超时与服务端日志。

# Harness 0.1.2-rc.1 本地打包产物（临时）

> **这是临时目录，upstream 发布到 npm 后应整个删除。**
> 见 [`docs/harness-0.1.2-rc.1-upgrade.md`](../../docs/harness-0.1.2-rc.1-upgrade.md)。

上游 [`dsh-v0.1.2-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1)
（commit `a66e4702047846cdaa10c66c9d3df3951f5ea70d`）只有 GitHub tag，尚未发布到 npm
registry。这里放的是从该 tag 本地构建打包出的 tarball，使桌面端可继续固定其经过验证的
上游输入，并保留 `patch-package` 适配层。

- `npm-dsh/` —— dsh 家族 242 个包
- `npm-vendor/` —— vendor 家族 9 个包（cordis / cosmokit / schemastery）
- 各自的 `publish-order.txt` 是上游 pack 步骤记录的发布顺序

## 复现方式

```bash
git clone --depth 1 --branch dsh-v0.1.2-rc.1 \
  https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
corepack enable                      # packageManager 指定 pnpm@11.7.0
corepack pnpm install --frozen-lockfile
corepack pnpm run build:official     # release:pack 要求 official 客户端构建记录
corepack pnpm exec tsx scripts/release/pack.ts --family vendor --out dist/npm-vendor --concurrency 8
corepack pnpm exec tsx scripts/release/pack.ts --family dsh    --out dist/npm-dsh    --concurrency 8
```

构建环境：Node v24.15.0、pnpm 11.7.0（corepack）、macOS arm64。
`build:official` 记录 220 个 client artifact / 4 个 public value。

## 相对 alpha.4 的包与运行时闭包

两组 tarball 的包名集合均未变化：dsh 仍为 242 个、vendor 仍为 9 个，
`@deepseek-ai/dsh` 的直接运行时依赖闭包也没有增删。因此 Desktop 继续只引用已有的生产
闭包，不把 Inspector、Web Preview 或其他可选 Bundle 直接提升为桌面依赖。

rc.1 的 release note 汇总了 0.1.1-rc.2 以来的会话流、token/耗时、连接重试、子 Agent、
图片/轨迹及 Node 24 启动/HMR 等改进；其中大部分已在 Desktop 当前的 alpha.4 基线上存在。
本次 alpha.4 之后的源码差异集中在会话投影缓存和 JSON 存储的跨版本读取、备份和损坏记录
跳过恢复；Desktop 的 18 个 dsh 补丁覆盖面未被这些源码改动触及，仍须通过 clean install 实测。

## 使用方式

Desktop 的 `package.json` 只引用 `@deepseek-ai/dsh` 实际运行闭包、运行时代码引用的前端
公共包，以及四个 `dsh-desktop-*` 插件。新增 tarball 前必须确认它被默认 Profile、运行时
import 或必需 peer 引用；可选 Bundle 应由插件安装流程按需安装。

## 删除

上游发布到 npm 后：

```bash
git rm -r packages/harness-0.1.2-rc.1
```

注意 git 历史是永久的，删除只是从工作树移除，克隆体积不会回收。

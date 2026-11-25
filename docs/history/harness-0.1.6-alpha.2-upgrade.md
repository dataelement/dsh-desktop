# Harness 0.1.6-alpha.2 升级记录

DSH Desktop 已从最新 `main` 基线迁移到 `@deepseek-ai/dsh@0.1.6-alpha.2`。仓库内所有可发布的 `@deepseek-ai/dsh-*` 依赖使用精确版本，避免 alpha 期间被范围解析到未经验证的构建。

## 主要变化

- 接入 0.1.6 的 Profile resolution generation、`@deepseek-ai/dsh-plugin-manager`、`@deepseek-ai/dsh-hmr`、`@deepseek-ai/dsh-mcp-resources` 和 PTC runtime 依赖闭包。
- 移除 0.1.6-alpha.2 已不再发布的旧 worker/runtime 包，并加入 `@deepseek-ai/dsh-workflow-ptc`。
- 将 22 个 `patch-package` 补丁迁移到 `0.1.6-alpha.2`，保留 Desktop 的启动失败溯源、Safe Mode、会话删除、未读标记、模型设置、PPT slot 和原生目录选择器接缝。
- 适配 Typert codec 的惰性 `create()` API，以及 Profile 初始化不再携带 `patchReload` 的新签名。
- 保留上游新的 HostResolvedRootInclude/Profile resolution 行为，不再恢复已被上游替代的旧解析实现。
- Electron 固定为 `43.0.0`；alpha.2 使用的 `node-addon-require-builtin@0.1.6` 尚不支持 Electron `43.4.0` 的 Node/V8 runtime fingerprint。
- Plugin Manager 的安装/删除通过可选的 `profileBundlePackageBackend` 接缝转入 Desktop generation：安装在 staging 校验并 peer 验证后发布 immutable generation，失败/非 bundle 时回滚 `desired.json` 与 Profile projection；删除只撤销 desired/projection，旧 generation 留待冷启动回收。普通 Harness Profile 仍使用上游 pnpm 路径。

## 可重放与验证

升级后的补丁必须能由全新依赖树重放：

```bash
npm ci
npm test
npm run typecheck
npm run build
git diff --check
```

PPT 分发包仍使用仓库已有、由其权威构建流程生成的 tarball；本次升级没有直接重打第三方/分发归档。

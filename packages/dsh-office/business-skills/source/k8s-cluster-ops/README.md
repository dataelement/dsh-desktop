# kubectl 技能

一个兼容 Agent Skills 规范的 kubectl 命令行操作技能包，用于 Kubernetes 集群管理。

## 包含内容

- **SKILL.md** — 主要技能说明（AgentSkills 格式）
- **references/REFERENCE.md** — 完整命令参考
- **scripts/** — 常见工作流的辅助脚本
  - `kubectl-pod-debug.sh` — 全面的 Pod 调试
  - `kubectl-deploy-update.sh` — 安全的 Deployment 镜像更新与监控
  - `kubectl-node-drain.sh` — 安全的节点维护（带确认）
  - `kubectl-cluster-info.sh` — 集群健康检查

## 安装

### 通过 ClawdHub
```bash
clawdhub install kubectl-skill
```

### 手动安装
将 `kubectl-skill` 目录复制到以下位置之一：

- **工作区技能**（按项目）：`<workspace>/skills/`
- **本地技能**（用户级）：`~/.clawdbot/skills/`
- **额外技能目录**：通过 `~/.clawdbot/clawdbot.json` 配置

## 系统要求

- **kubectl** v1.20+ 已安装并在 PATH 中
- **kubeconfig** 文件已配置集群访问
- 已建立与 Kubernetes 集群的连接

## 快速开始

### 验证安装
```bash
kubectl version --client
kubectl cluster-info
```

### 基本命令
```bash
# List pods
kubectl get pods -A

# View logs
kubectl logs POD_NAME

# Execute in pod
kubectl exec -it POD_NAME -- /bin/bash

# Apply configuration
kubectl apply -f deployment.yaml

# Scale deployment
kubectl scale deployment/APP --replicas=3
```

## 辅助脚本

先为脚本添加可执行权限：
```bash
chmod +x scripts/*.sh
```

### 调试 Pod
```bash
./scripts/kubectl-pod-debug.sh POD_NAME [NAMESPACE]
```

### 更新 Deployment 镜像
```bash
./scripts/kubectl-deploy-update.sh DEPLOYMENT CONTAINER IMAGE [NAMESPACE]
```

### 腾空节点进行维护
```bash
./scripts/kubectl-node-drain.sh NODE_NAME
```

### 检查集群健康状况
```bash
./scripts/kubectl-cluster-info.sh
```

## 目录结构

```
kubectl-skill/
├── SKILL.md                    # 主要技能说明
├── LICENSE                     # MIT 许可证
├── README.md                   # 本文件
├── references/
│   └── REFERENCE.md           # 完整命令参考
├── scripts/
│   ├── kubectl-pod-debug.sh
│   ├── kubectl-deploy-update.sh
│   ├── kubectl-node-drain.sh
│   └── kubectl-cluster-info.sh
└── assets/                    # （可选）用于后续扩展
```

## 核心功能

✅ 查询和检查 Kubernetes 资源
✅ 部署和更新应用
✅ 调试 Pod 和容器
✅ 管理集群配置
✅ 监控资源使用和健康状况
✅ 在运行中的容器内执行命令
✅ 查看日志和事件
✅ 端口转发用于本地测试
✅ 节点维护操作
✅ 试运行模式确保操作安全

## 环境变量

- `KUBECONFIG` — kubeconfig 文件路径（可包含多个路径，用 `:` 分隔）
- `KUBECTLDIR` — kubectl 插件目录（可选）

## 文档

- **主要说明**：参见 `SKILL.md` 了解概述和常用命令
- **完整参考**：参见 `references/REFERENCE.md` 了解所有命令
- **官方文档**：https://kubernetes.io/docs/reference/kubectl/
- **AgentSkills 规范**：https://agentskills.io/

## 兼容性

- **kubectl 版本**：v1.20+
- **Kubernetes 版本**：v1.20+
- **平台**：macOS、Linux、Windows（WSL）
- **Agent 框架**：任何支持 AgentSkills 格式的框架

## 贡献

此技能是 Clawdbot 项目的一部分。贡献方式：

1. 在本地测试更改
2. 更新文档
3. 确保脚本可执行且已测试
4. 提交包含清晰描述的 Pull Request

## 许可证

MIT 许可证 — 详见 LICENSE 文件

## 支持

- **GitHub Issues**：报告 Bug 和提交功能需求
- **官方文档**：https://kubernetes.io/docs/reference/kubectl/
- **ClawdHub**：https://clawdhub.com/

---

**版本**：1.0.0
**最后更新**：2026 年 1 月 24 日
**维护者**：Clawdbot 贡献者

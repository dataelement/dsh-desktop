---
name: k8s-cluster-ops
description: "通过 kubectl 命令行工具管理 Kubernetes 集群，执行查询资源状态、部署应用、查看日志、调试容器、切换上下文和监控集群健康等操作。适用于日常运维、发布和故障排查。当用户询问集群状态、Pod/Deployment信息、查看日志、执行容器命令、切换集群或上下文，或使用 kubectl get/describe/logs/exec/apply 等相关命令短语时触发。"
license: MIT
metadata:
  author: Dennis de Vaal <d.devaal@gmail.com>
  version: "1.0.0"
  keywords: "kubernetes,k8s,container,docker,deployment,pods,cluster"
compatibility: 需要 kubectl 二进制文件（v1.20+）以及已配置好的 kubeconfig 连接到 Kubernetes 集群。支持 macOS、Linux 和 Windows（WSL）。
---

<!-- Localized from: kubectl -->

# kubectl 技能

使用 `kubectl` 命令行工具执行 Kubernetes 集群管理操作。

## 概述

此技能可以帮助 Agent 完成以下操作：
- **查询资源** — 列出和获取 Pod、Deployment、Service、Node 等资源的详细信息
- **部署与更新** — 创建、应用、补丁和更新 Kubernetes 资源
- **调试与排障** — 查看日志、在容器中执行命令、检查事件
- **管理配置** — 更新 kubeconfig、切换上下文、管理命名空间
- **监控健康** — 检查资源使用情况、滚动更新状态、事件和 Pod 状态
- **执行运维操作** — 扩缩 Deployment、腾空节点、管理污点和标签

## 前置条件

1. **kubectl 二进制文件**已安装并在 PATH 中可用（v1.20+）
2. **kubeconfig** 文件已配置集群凭证（默认路径：`~/.kube/config`）
3. **已建立**与 Kubernetes 集群的网络连接

## 快速配置

### 安装 kubectl

**macOS：**
```bash
brew install kubernetes-cli
```

**Linux：**
```bash
apt-get install -y kubectl  # Ubuntu/Debian
yum install -y kubectl      # RHEL/CentOS
```

**验证安装：**
```bash
kubectl version --client
kubectl cluster-info  # Test connection
```

## 常用命令

### 查询资源
```bash
kubectl get pods                    # List all pods in current namespace
kubectl get pods -A                 # All namespaces
kubectl get pods -o wide            # More columns
kubectl get nodes                   # List nodes
kubectl describe pod POD_NAME        # Detailed info with events
```

### 查看日志
```bash
kubectl logs POD_NAME                # Get logs
kubectl logs -f POD_NAME             # Follow logs (tail -f)
kubectl logs POD_NAME -c CONTAINER   # Specific container
kubectl logs POD_NAME --previous     # Previous container logs
```

### 在容器中执行命令
```bash
kubectl exec -it POD_NAME -- /bin/bash   # Interactive shell
kubectl exec POD_NAME -- COMMAND         # Run single command
```

### 部署应用
```bash
kubectl apply -f deployment.yaml         # Apply config
kubectl create -f deployment.yaml        # Create resource
kubectl apply -f deployment.yaml --dry-run=client  # Test
```

### 更新应用
```bash
kubectl set image deployment/APP IMAGE=IMAGE:TAG  # Update image
kubectl scale deployment/APP --replicas=3          # Scale pods
kubectl rollout status deployment/APP              # Check status
kubectl rollout undo deployment/APP                # Rollback
```

### 管理配置
```bash
kubectl config view                  # Show kubeconfig
kubectl config get-contexts          # List contexts
kubectl config use-context CONTEXT   # Switch context
```

## 常见操作场景

### 调试 Pod
```bash
# 1. Identify the issue
kubectl describe pod POD_NAME

# 2. Check logs
kubectl logs POD_NAME
kubectl logs POD_NAME --previous

# 3. Execute debug commands
kubectl exec -it POD_NAME -- /bin/bash

# 4. Check events
kubectl get events --sort-by='.lastTimestamp'
```

### 发布新版本
```bash
# 1. Update image
kubectl set image deployment/MY_APP my-app=my-app:v2

# 2. Monitor rollout
kubectl rollout status deployment/MY_APP -w

# 3. Verify
kubectl get pods -l app=my-app

# 4. Rollback if needed
kubectl rollout undo deployment/MY_APP
```

### 节点维护准备
```bash
# 1. Drain node (evicts all pods)
kubectl drain NODE_NAME --ignore-daemonsets

# 2. Do maintenance
# ...

# 3. Bring back online
kubectl uncordon NODE_NAME
```

## 输出格式

`--output`（`-o`）参数支持多种输出格式：

- `table` — 默认表格格式
- `wide` — 扩展表格，包含更多列
- `json` — JSON 格式（可配合 `jq` 使用）
- `yaml` — YAML 格式
- `jsonpath` — JSONPath 表达式
- `custom-columns` — 自定义输出列
- `name` — 仅显示资源名称

**示例：**
```bash
kubectl get pods -o json | jq '.items[0].metadata.name'
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase
```

## 全局参数（适用于所有命令）

```bash
-n, --namespace=<ns>           # Operate in specific namespace
-A, --all-namespaces           # Operate across all namespaces
--context=<context>            # Use specific kubeconfig context
-o, --output=<format>          # Output format (json, yaml, table, etc.)
--dry-run=<mode>               # Dry-run mode (none, client, server)
-l, --selector=<labels>        # Filter by labels
--field-selector=<selector>    # Filter by fields
-v, --v=<int>                  # Verbosity level (0-9)
```

## 试运行模式

- `--dry-run=client` — 快速的客户端验证（安全测试命令）
- `--dry-run=server` — 服务端验证（结果更准确）
- `--dry-run=none` — 真正执行（默认行为）

**建议始终先用 `--dry-run=client` 测试：**
```bash
kubectl apply -f manifest.yaml --dry-run=client
```

## 进阶内容

如需详细的参考资料、逐条命令文档、故障排查指南和高级工作流，请参阅：
- [references/REFERENCE.md](references/REFERENCE.md) — 完整的 kubectl 命令参考
- [scripts/](scripts/) — 常见任务的辅助脚本

## 实用技巧

1. **使用标签选择器进行批量操作：**
   ```bash
   kubectl delete pods -l app=myapp
   kubectl get pods -l env=prod,tier=backend
   ```

2. **实时监视资源变化：**
   ```bash
   kubectl get pods -w  # Watch for changes
   ```

3. **使用 `-A` 参数查看所有命名空间：**
   ```bash
   kubectl get pods -A  # See pods everywhere
   ```

4. **导出配置以便日后对比：**
   ```bash
   kubectl get deployment my-app -o yaml > deployment-backup.yaml
   ```

5. **删除前先做试运行确认：**
   ```bash
   kubectl delete pod POD_NAME --dry-run=client
   ```

## 获取帮助

```bash
kubectl help                      # General help
kubectl COMMAND --help            # Command help
kubectl explain pods              # Resource documentation
kubectl explain pods.spec         # Field documentation
```

## 环境变量

- `KUBECONFIG` — kubeconfig 文件路径（可包含多个路径，用 `:` 分隔）
- `KUBECTL_CONTEXT` — 覆盖默认上下文

## 参考资源

- [kubectl 官方文档](https://kubernetes.io/docs/reference/kubectl/)
- [kubectl 速查表](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes API 参考](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [Agent Skills 规范](https://agentskills.io/)

---

**版本：** 1.0.0  
**许可证：** MIT  
**兼容：** kubectl v1.20+、Kubernetes v1.20+

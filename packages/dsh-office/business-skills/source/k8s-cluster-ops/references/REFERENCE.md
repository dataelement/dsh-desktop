# kubectl 命令参考

kubectl 操作的逐条命令完整参考。

## 资源查询

### 列出资源
```bash
kubectl get pods                          # List pods
kubectl get pods -n NAMESPACE              # In specific namespace
kubectl get pods -A                        # All namespaces
kubectl get nodes                          # List nodes
kubectl get deployments                    # List deployments
kubectl get services                       # List services
kubectl get configmaps                     # List config maps
kubectl get secrets                        # List secrets
kubectl get persistentvolumes              # List PVs
kubectl get persistentvolumeclaims         # List PVCs
kubectl get ingress                        # List ingress
kubectl get statefulsets                   # List stateful sets
kubectl get daemonsets                     # List daemon sets
kubectl get jobs                           # List jobs
kubectl get cronjobs                       # List cron jobs
```

### 输出选项
```bash
kubectl get pods                           # Table (default)
kubectl get pods -o wide                   # Extended table
kubectl get pods -o json                   # JSON
kubectl get pods -o yaml                   # YAML
kubectl get pods -o jsonpath='{...}'       # JSONPath
kubectl get pods -o custom-columns=...     # Custom columns
kubectl get pods -o name                   # Names only
```

### 过滤与排序
```bash
kubectl get pods -n default                # Specific namespace
kubectl get pods -A                        # All namespaces
kubectl get pods -l app=myapp              # Label selector
kubectl get pods --field-selector=status.phase=Running  # Field selector
kubectl get pods --sort-by=.metadata.creationTimestamp  # Sort by field
kubectl get pods --limit=10                # Limit results
kubectl get pods --chunk-size=500          # Pagination
```

## 资源详情

### 描述资源
```bash
kubectl describe pod POD_NAME               # Pod details
kubectl describe node NODE_NAME             # Node details
kubectl describe deployment APP_NAME        # Deployment details
kubectl describe service SERVICE_NAME       # Service details
kubectl describe pvc PVC_NAME               # PVC details
kubectl describe configmap CONFIG_NAME      # ConfigMap details
```

### 解释资源
```bash
kubectl explain pods                        # Pod documentation
kubectl explain pods.spec                   # Pod spec documentation
kubectl explain pods.spec.containers        # Container documentation
kubectl explain deployments.spec.template   # Nested documentation
```

### 获取资源 YAML
```bash
kubectl get pod POD_NAME -o yaml            # Single pod
kubectl get pods -o yaml                    # All pods in namespace
kubectl get deployment DEPLOY_NAME -o yaml  # Deployment
```

## 日志

### 查看日志
```bash
kubectl logs POD_NAME                       # Get logs
kubectl logs POD_NAME -c CONTAINER          # Specific container
kubectl logs POD_NAME --previous            # Previous container
kubectl logs POD_NAME --all-containers=true # All containers
kubectl logs POD_NAME --timestamps=true     # With timestamps
```

### 流式日志
```bash
kubectl logs -f POD_NAME                    # Follow logs
kubectl logs -f POD_NAME -c CONTAINER       # Follow specific container
kubectl logs -f -l app=myapp                # Follow pods with label
```

### 日志过滤
```bash
kubectl logs POD_NAME --tail=100            # Last 100 lines
kubectl logs POD_NAME --since=1h            # Since 1 hour ago
kubectl logs POD_NAME --since-time=2024-01-24T10:00:00Z  # Since time
kubectl logs POD_NAME --until=30m           # Until 30 min ago
kubectl logs POD_NAME --limit-bytes=1000    # Limit bytes
```

## 执行与连接

### 执行命令
```bash
kubectl exec POD_NAME -- COMMAND            # Run command
kubectl exec -it POD_NAME -- /bin/bash      # Interactive shell
kubectl exec POD_NAME -c CONTAINER -- CMD   # In specific container
kubectl exec POD_NAME -- env                # List environment
kubectl exec POD_NAME -- whoami              # Get user
```

### 连接到容器
```bash
kubectl attach POD_NAME                     # Attach to container
kubectl attach -it POD_NAME                 # Interactive attach
```

### 复制文件
```bash
kubectl cp POD_NAME:/path/file ./local-file           # Pod to local
kubectl cp ./local-file POD_NAME:/path/file           # Local to pod
kubectl cp POD_NAME:/path/dir ./local-dir -R         # Directory (recursive)
```

## 创建资源

### 从文件创建
```bash
kubectl create -f deployment.yaml           # Create from file
kubectl create -f - < pod.yaml              # Create from stdin
kubectl create -f ./config/                 # Create from directory
kubectl create -f deployment.yaml --dry-run=client  # Dry-run
```

### 内联创建
```bash
kubectl create namespace my-ns              # Create namespace
kubectl create secret generic my-secret --from-literal=key=value  # Secret
kubectl create configmap my-config --from-file=config.txt         # ConfigMap
kubectl create serviceaccount my-sa         # Service account
```

### 验证
```bash
kubectl create -f deployment.yaml --validate=strict   # Strict
kubectl create -f deployment.yaml --validate=warn     # Warn
kubectl create -f deployment.yaml --validate=ignore   # Ignore
```

## 应用资源（声明式）

### 应用配置
```bash
kubectl apply -f deployment.yaml            # Apply single file
kubectl apply -f ./config/                  # Apply directory
kubectl apply -k ./kustomize/               # Apply with kustomize
kubectl apply -f deployment.yaml --dry-run=client  # Dry-run
```

### 带选项应用
```bash
kubectl apply -f deployment.yaml --record   # Record command
kubectl apply -f deployment.yaml --overwrite # Overwrite changes
kubectl apply -f deployment.yaml --prune    # Prune resources
kubectl apply -f deployment.yaml --force-conflicts --server-side  # Server-side
```

## 更新资源

### 补丁资源
```bash
kubectl patch pod POD --patch '{"spec":{"activeDeadlineSeconds":300}}'
kubectl patch deployment DEPLOY --type json -p '[{"op":"replace","path":"/spec/replicas","value":3}]'
kubectl patch pod POD --type='json' -p='[{"op":"replace","path":"/spec/restartPolicy","value":"Always"}]'
```

### 在编辑器中编辑
```bash
kubectl edit pod POD_NAME                   # Edit pod
kubectl edit deployment DEPLOY              # Edit deployment
kubectl edit -f deployment.yaml             # Edit from file
```

### 设置/更新字段
```bash
kubectl set image deployment/APP app=app:v2 IMAGE   # Update image
kubectl set env deployment/APP KEY=value           # Set environment
kubectl set resources deployment/APP --limits=cpu=200m,memory=512Mi  # Set limits
kubectl set serviceaccount deployment/APP my-sa    # Set service account
```

### 扩缩
```bash
kubectl scale deployment/APP --replicas=3          # Scale deployment
kubectl scale statefulset/APP --replicas=5         # Scale stateful set
kubectl scale rc/APP --replicas=2                  # Scale replica set
kubectl autoscale deployment/APP --min=1 --max=10  # Auto scale
```

## 滚动更新管理

### 滚动更新状态
```bash
kubectl rollout status deployment/APP               # Check status
kubectl rollout status deployment/APP -w            # Watch status
kubectl rollout status statefulset/APP              # StatefulSet status
```

### 滚动更新历史
```bash
kubectl rollout history deployment/APP              # Show history
kubectl rollout history deployment/APP --revision=2 # Specific revision
```

### 滚动更新操作
```bash
kubectl rollout undo deployment/APP                 # Undo last rollout
kubectl rollout undo deployment/APP --to-revision=2 # Undo to revision
kubectl rollout pause deployment/APP                # Pause rollout
kubectl rollout resume deployment/APP               # Resume rollout
kubectl rollout restart deployment/APP              # Restart (rolling)
```

## 删除资源

### 删除资源
```bash
kubectl delete pod POD_NAME                         # Delete pod
kubectl delete pods POD1 POD2 POD3                  # Multiple pods
kubectl delete deployment DEPLOY_NAME               # Delete deployment
kubectl delete -f deployment.yaml                   # Delete from file
kubectl delete pods --all                           # All pods
kubectl delete pods --all -n NAMESPACE              # All in namespace
```

### 带选项删除
```bash
kubectl delete pod POD --grace-period=30           # Grace period
kubectl delete pod POD --force --grace-period=0    # Force delete
kubectl delete pod POD --dry-run=client             # Dry-run
kubectl delete pods -l app=myapp                   # By selector
kubectl delete pods --field-selector=status.phase=Failed  # By field
```

## 标签与注解

### 标签
```bash
kubectl label pods POD app=myapp                    # Add label
kubectl label pods POD app=myapp --overwrite        # Overwrite
kubectl label pods POD app-                         # Remove label
kubectl label pods -l old=value new=value          # Label by selector
kubectl label pods --all app=myapp                 # Label all
kubectl label pods POD env=prod tier=backend       # Multiple labels
```

### 注解
```bash
kubectl annotate pods POD description='My pod'     # Add annotation
kubectl annotate pods POD description='Updated' --overwrite  # Update
kubectl annotate pods POD description-             # Remove
kubectl annotate pods -l app=myapp owner='team-a' # By selector
```

### 查看标签/注解
```bash
kubectl get pods --show-labels                     # Show labels
kubectl get pods -L app,env                        # Show specific labels
kubectl get pods -o json | jq '.items[].metadata.labels'  # JSON path
```

## 节点管理

### 节点信息
```bash
kubectl get nodes                                   # List nodes
kubectl describe node NODE_NAME                    # Node details
kubectl get nodes -o wide                          # Node IPs
kubectl get node NODE_NAME -o yaml                 # Node YAML
```

### 节点容量
```bash
kubectl describe nodes | grep "Allocated resources" -A 10  # Capacity
kubectl get nodes -o json | jq '.items[].status.capacity'  # JSON
kubectl top nodes                                  # CPU/Memory usage
```

### 隔离/腾空
```bash
kubectl cordon NODE_NAME                           # Prevent new pods
kubectl uncordon NODE_NAME                         # Allow new pods
kubectl drain NODE_NAME                            # Evict all pods
kubectl drain NODE_NAME --ignore-daemonsets        # Ignore daemonsets
kubectl drain NODE_NAME --dry-run=client           # Dry-run drain
```

### 污点
```bash
kubectl taint nodes NODE_NAME key=value:NoSchedule                    # Add taint
kubectl taint nodes NODE_NAME key=value:PreferNoSchedule              # Prefer taint
kubectl taint nodes NODE_NAME key:NoSchedule-                         # Remove taint
kubectl taint nodes NODE_NAME key=newvalue:NoSchedule --overwrite     # Update taint
kubectl taint nodes NODE_NAME --list                                  # List taints
```

## 资源监控

### 资源使用情况
```bash
kubectl top nodes                                   # Node CPU/memory
kubectl top pods                                    # Pod CPU/memory
kubectl top pods -A                                 # All namespaces
kubectl top pod POD_NAME --containers              # Per-container
kubectl top pods --sort-by=memory                  # Sort by memory
```

### 事件
```bash
kubectl get events                                  # Cluster events
kubectl get events -n NAMESPACE                    # Namespace events
kubectl get events -A --sort-by='.lastTimestamp'   # All events sorted
kubectl events POD_NAME                            # Pod events
kubectl describe pod POD                           # Events included
```

## 集群信息

### 集群详情
```bash
kubectl cluster-info                               # Cluster info
kubectl cluster-info dump                          # Dump cluster info
kubectl api-versions                               # API versions
kubectl api-resources                              # Available resources
```

### 版本信息
```bash
kubectl version                                    # Client and server
kubectl version --client                           # Client only
kubectl version -o json                            # JSON output
```

## 配置管理

### kubeconfig 命令
```bash
kubectl config view                                # Show kubeconfig
kubectl config view --flatten                      # Flatten (merge)
kubectl config view --minify                       # Minimal
```

### 上下文
```bash
kubectl config current-context                     # Current context
kubectl config get-contexts                        # List contexts
kubectl config use-context CONTEXT                 # Switch context
kubectl config set-context CONTEXT --cluster=CLUSTER --user=USER  # Create context
kubectl config delete-context CONTEXT              # Delete context
kubectl config rename-context OLD NEW              # Rename context
```

### 集群
```bash
kubectl config get-clusters                        # List clusters
kubectl config set-cluster CLUSTER --server=URL    # Create/update
kubectl config delete-cluster CLUSTER              # Delete
```

### 用户/凭证
```bash
kubectl config get-users                           # List users
kubectl config set-credentials USER --token=TOKEN  # Create user
kubectl config delete-user USER                    # Delete user
```

## 授权

### 检查权限
```bash
kubectl auth can-i create pods                     # Can I create pods?
kubectl auth can-i get pods --as=USER              # Can user create?
kubectl auth can-i delete deployments -n NAMESPACE # In namespace?
kubectl auth can-i '*' pods                        # All actions?
```

### 当前用户
```bash
kubectl auth whoami                                # Current user
kubectl auth whoami -o json                        # JSON output
```

## 调试与排障

### Pod 调试
```bash
kubectl describe pod POD_NAME                      # Details + events
kubectl logs POD_NAME                              # Logs
kubectl logs POD_NAME --previous                   # Previous logs
kubectl exec -it POD_NAME -- /bin/bash             # Shell access
```

### 端口转发
```bash
kubectl port-forward POD_NAME 8080:8080            # Pod port
kubectl port-forward svc/SERVICE_NAME 8080:8080    # Service port
kubectl port-forward pod/POD --address 0.0.0.0 8080:8080  # All IPs
```

### 代理访问
```bash
kubectl proxy                                      # Start proxy
kubectl proxy --port=8001                          # Custom port
# Access: http://localhost:8001/api/v1/namespaces/default/pods
```

### 调试容器
```bash
kubectl debug POD_NAME -it                         # Debug pod
kubectl debug node/NODE_NAME -it                   # Debug node
kubectl debug POD_NAME -it --image=alpine          # Custom image
```

### 差异对比
```bash
kubectl diff -f deployment.yaml                    # Show changes
kubectl apply -f deployment.yaml --dry-run=client -o yaml  # Dry-run YAML
```

## 进阶模式

### 试运行工作流
```bash
# 1. Client-side validation
kubectl apply -f manifest.yaml --dry-run=client

# 2. Server-side validation
kubectl apply -f manifest.yaml --dry-run=server

# 3. Actual apply
kubectl apply -f manifest.yaml
```

### 导出与导入
```bash
# Export
kubectl get pod POD_NAME -o yaml > pod-export.yaml

# Modify and import
kubectl apply -f pod-export.yaml
```

### 批量操作
```bash
# Delete all failed pods
kubectl delete pods --field-selector=status.phase=Failed

# Label all pods
kubectl label pods --all app=myapp

# Scale all deployments with label
kubectl scale deployment -l tier=backend --replicas=3
```

### 监视资源
```bash
kubectl get pods -w                                 # Watch all pods
kubectl rollout status deployment/APP -w            # Watch rollout
kubectl get pvc -w                                 # Watch PVCs
```

## 快速参考：常见任务

| 任务 | 命令 |
|------|---------|
| 列出 Pod | `kubectl get pods -A` |
| 描述 Pod | `kubectl describe pod POD` |
| 查看日志 | `kubectl logs POD` |
| 跟踪日志 | `kubectl logs -f POD` |
| 进入 Pod Shell | `kubectl exec -it POD -- /bin/bash` |
| 执行命令 | `kubectl exec POD -- CMD` |
| 应用清单 | `kubectl apply -f manifest.yaml` |
| 更新镜像 | `kubectl set image deployment/APP app=app:TAG` |
| 扩缩 | `kubectl scale deployment/APP --replicas=N` |
| 检查状态 | `kubectl rollout status deployment/APP` |
| 回滚 | `kubectl rollout undo deployment/APP` |
| 删除 Pod | `kubectl delete pod POD` |
| 隔离节点 | `kubectl cordon NODE` |
| 腾空节点 | `kubectl drain NODE --ignore-daemonsets` |
| 检查权限 | `kubectl auth can-i create pods` |
| 查看配置 | `kubectl config view` |
| 切换上下文 | `kubectl config use-context CONTEXT` |
| 端口转发 | `kubectl port-forward pod/POD 8080:8080` |
| 测试应用 | `kubectl apply -f manifest.yaml --dry-run=client` |
| 查看资源用量 | `kubectl top pods` |

## 实用技巧

- **真正操作前始终先用 `--dry-run=client` 验证**
- **使用 `-A` 参数查看所有命名空间**
- **使用 `-w` 参数实时监视变化**
- **使用标签选择器进行批量操作**
- **使用 `--record` 记录滚动更新的命令历史**
- **查看事件：`kubectl get events --sort-by='.lastTimestamp'`**
- **使用 `kubectl explain RESOURCE` 查看资源文档**
- **配合 `jq` 处理 JSON 输出：`kubectl get pods -o json | jq '.items[0].metadata.name'`**

---
name: kubectl
description: "Execute kubectl commands to manage Kubernetes clusters — query pods and deployments, deploy applications, debug containers with logs and exec, update configurations, and monitor cluster health. Use when working with Kubernetes, asking for pod status, container logs, deployment updates, cluster diagnostics, or any kubectl operation."
license: MIT
metadata:
  author: Dennis de Vaal <d.devaal@gmail.com>
  version: "1.0.0"
  keywords: "kubernetes,k8s,container,docker,deployment,pods,cluster"
compatibility: Requires kubectl binary (v1.20+) and active kubeconfig connection to a Kubernetes cluster. Works on macOS, Linux, and Windows (WSL).
---

# kubectl Skill

Execute Kubernetes cluster management operations using the `kubectl` command-line tool.

## Overview

This skill enables agents to:
- **Query Resources** — List and get details about pods, deployments, services, nodes, etc.
- **Deploy & Update** — Create, apply, patch, and update Kubernetes resources
- **Debug & Troubleshoot** — View logs, execute commands in containers, inspect events
- **Manage Configuration** — Update kubeconfig, switch contexts, manage namespaces
- **Monitor Health** — Check resource usage, rollout status, events, and pod conditions
- **Perform Operations** — Scale deployments, drain nodes, manage taints and labels

## Prerequisites

1. **kubectl binary** installed and accessible on PATH (v1.20+)
2. **kubeconfig** file configured with cluster credentials (default: `~/.kube/config`)
3. **Active connection** to a Kubernetes cluster

## Quick Setup

### Install kubectl

**macOS:**
```bash
brew install kubernetes-cli
```

**Linux:**
```bash
apt-get install -y kubectl  # Ubuntu/Debian
yum install -y kubectl      # RHEL/CentOS
```

**Verify:**
```bash
kubectl version --client
kubectl cluster-info  # Test connection
```

## Essential Commands

### Query Resources
```bash
kubectl get pods                    # List all pods in current namespace
kubectl get pods -A                 # All namespaces
kubectl get pods -o wide            # More columns
kubectl get nodes                   # List nodes
kubectl describe pod POD_NAME        # Detailed info with events
```

### View Logs
```bash
kubectl logs POD_NAME                # Get logs
kubectl logs -f POD_NAME             # Follow logs (tail -f)
kubectl logs POD_NAME -c CONTAINER   # Specific container
kubectl logs POD_NAME --previous     # Previous container logs
```

### Execute Commands
```bash
kubectl exec -it POD_NAME -- /bin/bash   # Interactive shell
kubectl exec POD_NAME -- COMMAND         # Run single command
```

### Deploy Applications
```bash
kubectl apply -f deployment.yaml         # Apply config
kubectl create -f deployment.yaml        # Create resource
kubectl apply -f deployment.yaml --dry-run=client  # Test
```

### Update Applications
```bash
kubectl set image deployment/APP IMAGE=IMAGE:TAG  # Update image
kubectl scale deployment/APP --replicas=3          # Scale pods
kubectl rollout status deployment/APP              # Check status
kubectl rollout undo deployment/APP                # Rollback
```

### Manage Configuration
```bash
kubectl config view                  # Show kubeconfig
kubectl config get-contexts          # List contexts
kubectl config use-context CONTEXT   # Switch context
```

## Common Patterns

### Debugging a Pod
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

### Deploying a New Version
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

### Preparing Node for Maintenance
```bash
# 1. Drain node (evicts all pods)
kubectl drain NODE_NAME --ignore-daemonsets

# 2. Do maintenance
# ...

# 3. Bring back online
kubectl uncordon NODE_NAME
```

## Output Formats

The `--output` (`-o`) flag supports multiple formats:

- `table` — Default tabular format
- `wide` — Extended table with additional columns
- `json` — JSON format (useful with `jq`)
- `yaml` — YAML format
- `jsonpath` — JSONPath expressions
- `custom-columns` — Define custom output columns
- `name` — Only resource names

**Examples:**
```bash
kubectl get pods -o json | jq '.items[0].metadata.name'
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase
```

## Global Flags (Available to All Commands)

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

## Dry-Run Modes

- `--dry-run=client` — Fast client-side validation (test commands safely)
- `--dry-run=server` — Server-side validation (more accurate)
- `--dry-run=none` — Execute for real (default)

**Always test with `--dry-run=client` first:**
```bash
kubectl apply -f manifest.yaml --dry-run=client
```

## Advanced Topics

For detailed reference material, command-by-command documentation, troubleshooting guides, and advanced workflows, see:
- [references/REFERENCE.md](references/REFERENCE.md) — Complete kubectl command reference
- [scripts/](scripts/) — Helper scripts for common tasks

## Helpful Tips

1. **Use label selectors for bulk operations:**
   ```bash
   kubectl delete pods -l app=myapp
   kubectl get pods -l env=prod,tier=backend
   ```

2. **Watch resources in real-time:**
   ```bash
   kubectl get pods -w  # Watch for changes
   ```

3. **Use `-A` flag for all namespaces:**
   ```bash
   kubectl get pods -A  # See pods everywhere
   ```

4. **Save outputs for later comparison:**
   ```bash
   kubectl get deployment my-app -o yaml > deployment-backup.yaml
   ```

5. **Check before you delete:**
   ```bash
   kubectl delete pod POD_NAME --dry-run=client
   ```

## Getting Help

```bash
kubectl help                      # General help
kubectl COMMAND --help            # Command help
kubectl explain pods              # Resource documentation
kubectl explain pods.spec         # Field documentation
```

## Environment Variables

- `KUBECONFIG` — Path to kubeconfig file (can include multiple paths separated by `:`)
- `KUBECTL_CONTEXT` — Override default context

## Resources

- [Official kubectl Docs](https://kubernetes.io/docs/reference/kubectl/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/)
- [Agent Skills Specification](https://agentskills.io/)

---

**Version:** 1.0.0  
**License:** MIT  
**Compatible with:** kubectl v1.20+, Kubernetes v1.20+

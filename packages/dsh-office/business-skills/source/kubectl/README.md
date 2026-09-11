# kubectl Skill

An Agent Skills-compatible skill package for kubectl command-line operations on Kubernetes clusters.

## What's Included

- **SKILL.md** — Main skill instructions (AgentSkills format)
- **references/REFERENCE.md** — Complete command reference
- **scripts/** — Helper scripts for common workflows
  - `kubectl-pod-debug.sh` — Comprehensive pod debugging
  - `kubectl-deploy-update.sh` — Safe deployment image updates with monitoring
  - `kubectl-node-drain.sh` — Safe node maintenance with confirmation
  - `kubectl-cluster-info.sh` — Cluster health check

## Installation

### Via ClawdHub
```bash
clawdhub install kubectl-skill
```

### Manual Installation
Copy the `kubectl-skill` directory to one of these locations:

- **Workspace skills** (per-project): `<workspace>/skills/`
- **Local skills** (user-wide): `~/.clawdbot/skills/`
- **Extra skills folder**: Configured via `~/.clawdbot/clawdbot.json`

## Requirements

- **kubectl** v1.20+ installed and on PATH
- **kubeconfig** file configured with cluster access
- Active connection to a Kubernetes cluster

## Quick Start

### Verify Installation
```bash
kubectl version --client
kubectl cluster-info
```

### Basic Commands
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

## Helper Scripts

Make scripts executable first:
```bash
chmod +x scripts/*.sh
```

### Debug a Pod
```bash
./scripts/kubectl-pod-debug.sh POD_NAME [NAMESPACE]
```

### Update Deployment Image
```bash
./scripts/kubectl-deploy-update.sh DEPLOYMENT CONTAINER IMAGE [NAMESPACE]
```

### Drain Node for Maintenance
```bash
./scripts/kubectl-node-drain.sh NODE_NAME
```

### Check Cluster Health
```bash
./scripts/kubectl-cluster-info.sh
```

## Structure

```
kubectl-skill/
├── SKILL.md                    # Main skill instructions
├── LICENSE                     # MIT License
├── README.md                   # This file
├── references/
│   └── REFERENCE.md           # Complete command reference
├── scripts/
│   ├── kubectl-pod-debug.sh
│   ├── kubectl-deploy-update.sh
│   ├── kubectl-node-drain.sh
│   └── kubectl-cluster-info.sh
└── assets/                    # (Optional) For future additions
```

## Key Features

✅ Query and inspect Kubernetes resources  
✅ Deploy and update applications  
✅ Debug pods and containers  
✅ Manage cluster configuration  
✅ Monitor resource usage and health  
✅ Execute commands in running containers  
✅ View logs and events  
✅ Port forwarding for local testing  
✅ Node maintenance operations  
✅ Dry-run support for safe operations  

## Environment Variables

- `KUBECONFIG` — Path to kubeconfig file (can include multiple paths separated by `:`)
- `KUBECTLDIR` — Directory for kubectl plugins (optional)

## Documentation

- **Main instructions**: See `SKILL.md` for overview and common commands
- **Complete reference**: See `references/REFERENCE.md` for all commands
- **Official docs**: https://kubernetes.io/docs/reference/kubectl/
- **AgentSkills spec**: https://agentskills.io/

## Compatibility

- **kubectl versions**: v1.20+
- **Kubernetes versions**: v1.20+
- **Platforms**: macOS, Linux, Windows (WSL)
- **Agent frameworks**: Any that supports AgentSkills format

## Contributing

This skill is part of the Clawdbot project. To contribute:

1. Test changes locally
2. Update documentation
3. Ensure scripts are executable and tested
4. Submit pull request with clear description

## License

MIT License — See LICENSE file for details

## Support

- **GitHub Issues**: Report bugs and request features
- **Official Docs**: https://kubernetes.io/docs/reference/kubectl/
- **ClawdHub**: https://clawdhub.com/

---

**Version**: 1.0.0  
**Last Updated**: January 24, 2026  
**Maintainer**: Clawdbot Contributors

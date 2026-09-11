#!/bin/bash
# kubectl-node-drain.sh
# Helper script to safely drain a node for maintenance

set -e

NODE_NAME="${1:?Node name required}"

echo "=== Draining Node: $NODE_NAME ==="
echo ""

echo "--- Current Node Status ---"
kubectl get node "$NODE_NAME" -o wide
echo ""

echo "--- Pods on Node ---"
kubectl get pods --all-namespaces --field-selector spec.nodeName="$NODE_NAME" -o wide
echo ""

echo "--- Dry-run: Check what will be drained ---"
kubectl drain "$NODE_NAME" --dry-run=client --ignore-daemonsets
echo ""

read -p "Continue with drain? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "--- Draining node (evicting pods) ---"
    kubectl drain "$NODE_NAME" --ignore-daemonsets --grace-period=30
    echo "✓ Node drained successfully"
    echo ""
    
    echo "--- Node Status ---"
    kubectl get node "$NODE_NAME" -o wide
    echo ""
    
    echo "=== Maintenance Ready ==="
    echo "After maintenance, uncordon with:"
    echo "kubectl uncordon $NODE_NAME"
else
    echo "Aborted"
    exit 1
fi

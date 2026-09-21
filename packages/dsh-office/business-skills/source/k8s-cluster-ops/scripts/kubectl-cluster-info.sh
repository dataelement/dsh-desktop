#!/bin/bash
# kubectl-cluster-info.sh
# Helper script to gather cluster health information

set -e

echo "=== Kubernetes Cluster Information ==="
echo ""

echo "--- Cluster Info ---"
kubectl cluster-info
echo ""

echo "--- Kubernetes Version ---"
kubectl version
echo ""

echo "--- Node Status ---"
kubectl get nodes -o wide
echo ""

echo "--- Node Capacity ---"
echo "CPU & Memory available:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEMORY:.status.allocatable.memory
echo ""

echo "--- Node Resource Usage ---"
kubectl top nodes
echo ""

echo "--- Pod Status Summary ---"
kubectl get pods --all-namespaces --field-selector=status.phase!=Running --field-selector=status.phase!=Succeeded
echo ""

echo "--- Namespace Count ---"
echo "Total namespaces: $(kubectl get namespaces --no-headers | wc -l)"
echo ""

echo "--- API Resources Available ---"
kubectl api-resources | head -20
echo "(showing first 20, use 'kubectl api-resources' for full list)"
echo ""

echo "--- Cluster Events (Recent) ---"
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -10
echo ""

echo "=== Cluster Health Check Complete ==="

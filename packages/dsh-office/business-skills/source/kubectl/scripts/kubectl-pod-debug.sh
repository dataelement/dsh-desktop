#!/bin/bash
# kubectl-pod-debug.sh
# Helper script to debug a pod with common diagnostic commands

set -e

POD_NAME="${1:?Pod name required}"
NAMESPACE="${2:-default}"

echo "=== Debugging Pod: $POD_NAME (Namespace: $NAMESPACE) ==="
echo ""

echo "--- Pod Description ---"
kubectl describe pod "$POD_NAME" -n "$NAMESPACE"
echo ""

echo "--- Pod Status ---"
kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o wide
echo ""

echo "--- Pod Events ---"
kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$POD_NAME" --sort-by='.lastTimestamp'
echo ""

echo "--- Container Logs ---"
kubectl logs "$POD_NAME" -n "$NAMESPACE" --all-containers=true --timestamps=true
echo ""

echo "--- Previous Container Logs (if exists) ---"
kubectl logs "$POD_NAME" -n "$NAMESPACE" --previous --all-containers=true 2>/dev/null || echo "No previous container logs"
echo ""

echo "--- Pod Resource Requests/Limits ---"
kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].resources}' | python3 -m json.tool 2>/dev/null || \
  kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].resources}'
echo ""

echo "--- Pod Node Assignment ---"
kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.nodeName}'
echo ""

echo "--- Debug Tip: Use shell access ---"
echo "kubectl exec -it $POD_NAME -n $NAMESPACE -- /bin/bash"

#!/bin/bash
# kubectl-deploy-update.sh
# Helper script to update a deployment image and monitor rollout

set -e

DEPLOYMENT_NAME="${1:?Deployment name required}"
CONTAINER_NAME="${2:?Container name required}"
IMAGE="${3:?Image required (format: image:tag)}"
NAMESPACE="${4:-default}"

echo "=== Updating Deployment: $DEPLOYMENT_NAME ==="
echo "Container: $CONTAINER_NAME"
echo "Image: $IMAGE"
echo "Namespace: $NAMESPACE"
echo ""

echo "--- Current Deployment Status ---"
kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o wide
echo ""

echo "--- Updating image ---"
kubectl set image "deployment/$DEPLOYMENT_NAME" "$CONTAINER_NAME=$IMAGE" -n "$NAMESPACE"
echo "✓ Image update command sent"
echo ""

echo "--- Monitoring rollout (this may take a while) ---"
kubectl rollout status "deployment/$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=5m
echo "✓ Rollout completed successfully"
echo ""

echo "--- New Pod Status ---"
kubectl get pods -l "app=$DEPLOYMENT_NAME" -n "$NAMESPACE" -o wide
echo ""

echo "--- Rollout History ---"
kubectl rollout history "deployment/$DEPLOYMENT_NAME" -n "$NAMESPACE" | head -5
echo ""

echo "=== Update Complete ==="
echo "To rollback: kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE"
echo "To check logs: kubectl logs -f deployment/$DEPLOYMENT_NAME -n $NAMESPACE"

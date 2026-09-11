# kubectl Command Reference

Complete command-by-command reference for kubectl operations.

## Resource Queries

### List Resources
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

### Output Options
```bash
kubectl get pods                           # Table (default)
kubectl get pods -o wide                   # Extended table
kubectl get pods -o json                   # JSON
kubectl get pods -o yaml                   # YAML
kubectl get pods -o jsonpath='{...}'       # JSONPath
kubectl get pods -o custom-columns=...     # Custom columns
kubectl get pods -o name                   # Names only
```

### Filtering & Sorting
```bash
kubectl get pods -n default                # Specific namespace
kubectl get pods -A                        # All namespaces
kubectl get pods -l app=myapp              # Label selector
kubectl get pods --field-selector=status.phase=Running  # Field selector
kubectl get pods --sort-by=.metadata.creationTimestamp  # Sort by field
kubectl get pods --limit=10                # Limit results
kubectl get pods --chunk-size=500          # Pagination
```

## Resource Details

### Describe Resources
```bash
kubectl describe pod POD_NAME               # Pod details
kubectl describe node NODE_NAME             # Node details
kubectl describe deployment APP_NAME        # Deployment details
kubectl describe service SERVICE_NAME       # Service details
kubectl describe pvc PVC_NAME               # PVC details
kubectl describe configmap CONFIG_NAME      # ConfigMap details
```

### Explain Resources
```bash
kubectl explain pods                        # Pod documentation
kubectl explain pods.spec                   # Pod spec documentation
kubectl explain pods.spec.containers        # Container documentation
kubectl explain deployments.spec.template   # Nested documentation
```

### Get Resource as YAML
```bash
kubectl get pod POD_NAME -o yaml            # Single pod
kubectl get pods -o yaml                    # All pods in namespace
kubectl get deployment DEPLOY_NAME -o yaml  # Deployment
```

## Logs

### View Logs
```bash
kubectl logs POD_NAME                       # Get logs
kubectl logs POD_NAME -c CONTAINER          # Specific container
kubectl logs POD_NAME --previous            # Previous container
kubectl logs POD_NAME --all-containers=true # All containers
kubectl logs POD_NAME --timestamps=true     # With timestamps
```

### Stream Logs
```bash
kubectl logs -f POD_NAME                    # Follow logs
kubectl logs -f POD_NAME -c CONTAINER       # Follow specific container
kubectl logs -f -l app=myapp                # Follow pods with label
```

### Log Filtering
```bash
kubectl logs POD_NAME --tail=100            # Last 100 lines
kubectl logs POD_NAME --since=1h            # Since 1 hour ago
kubectl logs POD_NAME --since-time=2024-01-24T10:00:00Z  # Since time
kubectl logs POD_NAME --until=30m           # Until 30 min ago
kubectl logs POD_NAME --limit-bytes=1000    # Limit bytes
```

## Execute & Attach

### Execute Commands
```bash
kubectl exec POD_NAME -- COMMAND            # Run command
kubectl exec -it POD_NAME -- /bin/bash      # Interactive shell
kubectl exec POD_NAME -c CONTAINER -- CMD   # In specific container
kubectl exec POD_NAME -- env                # List environment
kubectl exec POD_NAME -- whoami              # Get user
```

### Attach to Container
```bash
kubectl attach POD_NAME                     # Attach to container
kubectl attach -it POD_NAME                 # Interactive attach
```

### Copy Files
```bash
kubectl cp POD_NAME:/path/file ./local-file           # Pod to local
kubectl cp ./local-file POD_NAME:/path/file           # Local to pod
kubectl cp POD_NAME:/path/dir ./local-dir -R         # Directory (recursive)
```

## Creating Resources

### Create from File
```bash
kubectl create -f deployment.yaml           # Create from file
kubectl create -f - < pod.yaml              # Create from stdin
kubectl create -f ./config/                 # Create from directory
kubectl create -f deployment.yaml --dry-run=client  # Dry-run
```

### Create Inline
```bash
kubectl create namespace my-ns              # Create namespace
kubectl create secret generic my-secret --from-literal=key=value  # Secret
kubectl create configmap my-config --from-file=config.txt         # ConfigMap
kubectl create serviceaccount my-sa         # Service account
```

### Validation
```bash
kubectl create -f deployment.yaml --validate=strict   # Strict
kubectl create -f deployment.yaml --validate=warn     # Warn
kubectl create -f deployment.yaml --validate=ignore   # Ignore
```

## Applying Resources (Declarative)

### Apply Configuration
```bash
kubectl apply -f deployment.yaml            # Apply single file
kubectl apply -f ./config/                  # Apply directory
kubectl apply -k ./kustomize/               # Apply with kustomize
kubectl apply -f deployment.yaml --dry-run=client  # Dry-run
```

### Apply with Options
```bash
kubectl apply -f deployment.yaml --record   # Record command
kubectl apply -f deployment.yaml --overwrite # Overwrite changes
kubectl apply -f deployment.yaml --prune    # Prune resources
kubectl apply -f deployment.yaml --force-conflicts --server-side  # Server-side
```

## Updating Resources

### Patch Resources
```bash
kubectl patch pod POD --patch '{"spec":{"activeDeadlineSeconds":300}}'
kubectl patch deployment DEPLOY --type json -p '[{"op":"replace","path":"/spec/replicas","value":3}]'
kubectl patch pod POD --type='json' -p='[{"op":"replace","path":"/spec/restartPolicy","value":"Always"}]'
```

### Edit in Editor
```bash
kubectl edit pod POD_NAME                   # Edit pod
kubectl edit deployment DEPLOY              # Edit deployment
kubectl edit -f deployment.yaml             # Edit from file
```

### Set/Update Fields
```bash
kubectl set image deployment/APP app=app:v2 IMAGE   # Update image
kubectl set env deployment/APP KEY=value           # Set environment
kubectl set resources deployment/APP --limits=cpu=200m,memory=512Mi  # Set limits
kubectl set serviceaccount deployment/APP my-sa    # Set service account
```

### Scale
```bash
kubectl scale deployment/APP --replicas=3          # Scale deployment
kubectl scale statefulset/APP --replicas=5         # Scale stateful set
kubectl scale rc/APP --replicas=2                  # Scale replica set
kubectl autoscale deployment/APP --min=1 --max=10  # Auto scale
```

## Rollout Management

### Rollout Status
```bash
kubectl rollout status deployment/APP               # Check status
kubectl rollout status deployment/APP -w            # Watch status
kubectl rollout status statefulset/APP              # StatefulSet status
```

### Rollout History
```bash
kubectl rollout history deployment/APP              # Show history
kubectl rollout history deployment/APP --revision=2 # Specific revision
```

### Rollout Operations
```bash
kubectl rollout undo deployment/APP                 # Undo last rollout
kubectl rollout undo deployment/APP --to-revision=2 # Undo to revision
kubectl rollout pause deployment/APP                # Pause rollout
kubectl rollout resume deployment/APP               # Resume rollout
kubectl rollout restart deployment/APP              # Restart (rolling)
```

## Deleting Resources

### Delete Resources
```bash
kubectl delete pod POD_NAME                         # Delete pod
kubectl delete pods POD1 POD2 POD3                  # Multiple pods
kubectl delete deployment DEPLOY_NAME               # Delete deployment
kubectl delete -f deployment.yaml                   # Delete from file
kubectl delete pods --all                           # All pods
kubectl delete pods --all -n NAMESPACE              # All in namespace
```

### Delete with Options
```bash
kubectl delete pod POD --grace-period=30           # Grace period
kubectl delete pod POD --force --grace-period=0    # Force delete
kubectl delete pod POD --dry-run=client             # Dry-run
kubectl delete pods -l app=myapp                   # By selector
kubectl delete pods --field-selector=status.phase=Failed  # By field
```

## Labels & Annotations

### Labels
```bash
kubectl label pods POD app=myapp                    # Add label
kubectl label pods POD app=myapp --overwrite        # Overwrite
kubectl label pods POD app-                         # Remove label
kubectl label pods -l old=value new=value          # Label by selector
kubectl label pods --all app=myapp                 # Label all
kubectl label pods POD env=prod tier=backend       # Multiple labels
```

### Annotations
```bash
kubectl annotate pods POD description='My pod'     # Add annotation
kubectl annotate pods POD description='Updated' --overwrite  # Update
kubectl annotate pods POD description-             # Remove
kubectl annotate pods -l app=myapp owner='team-a' # By selector
```

### View Labels/Annotations
```bash
kubectl get pods --show-labels                     # Show labels
kubectl get pods -L app,env                        # Show specific labels
kubectl get pods -o json | jq '.items[].metadata.labels'  # JSON path
```

## Node Management

### Node Information
```bash
kubectl get nodes                                   # List nodes
kubectl describe node NODE_NAME                    # Node details
kubectl get nodes -o wide                          # Node IPs
kubectl get node NODE_NAME -o yaml                 # Node YAML
```

### Node Capacity
```bash
kubectl describe nodes | grep "Allocated resources" -A 10  # Capacity
kubectl get nodes -o json | jq '.items[].status.capacity'  # JSON
kubectl top nodes                                  # CPU/Memory usage
```

### Cordon/Drain
```bash
kubectl cordon NODE_NAME                           # Prevent new pods
kubectl uncordon NODE_NAME                         # Allow new pods
kubectl drain NODE_NAME                            # Evict all pods
kubectl drain NODE_NAME --ignore-daemonsets        # Ignore daemonsets
kubectl drain NODE_NAME --dry-run=client           # Dry-run drain
```

### Taints
```bash
kubectl taint nodes NODE_NAME key=value:NoSchedule                    # Add taint
kubectl taint nodes NODE_NAME key=value:PreferNoSchedule              # Prefer taint
kubectl taint nodes NODE_NAME key:NoSchedule-                         # Remove taint
kubectl taint nodes NODE_NAME key=newvalue:NoSchedule --overwrite     # Update taint
kubectl taint nodes NODE_NAME --list                                  # List taints
```

## Resource Monitoring

### Resource Usage
```bash
kubectl top nodes                                   # Node CPU/memory
kubectl top pods                                    # Pod CPU/memory
kubectl top pods -A                                 # All namespaces
kubectl top pod POD_NAME --containers              # Per-container
kubectl top pods --sort-by=memory                  # Sort by memory
```

### Events
```bash
kubectl get events                                  # Cluster events
kubectl get events -n NAMESPACE                    # Namespace events
kubectl get events -A --sort-by='.lastTimestamp'   # All events sorted
kubectl events POD_NAME                            # Pod events
kubectl describe pod POD                           # Events included
```

## Cluster Information

### Cluster Details
```bash
kubectl cluster-info                               # Cluster info
kubectl cluster-info dump                          # Dump cluster info
kubectl api-versions                               # API versions
kubectl api-resources                              # Available resources
```

### Version Information
```bash
kubectl version                                    # Client and server
kubectl version --client                           # Client only
kubectl version -o json                            # JSON output
```

## Configuration Management

### kubeconfig Commands
```bash
kubectl config view                                # Show kubeconfig
kubectl config view --flatten                      # Flatten (merge)
kubectl config view --minify                       # Minimal
```

### Contexts
```bash
kubectl config current-context                     # Current context
kubectl config get-contexts                        # List contexts
kubectl config use-context CONTEXT                 # Switch context
kubectl config set-context CONTEXT --cluster=CLUSTER --user=USER  # Create context
kubectl config delete-context CONTEXT              # Delete context
kubectl config rename-context OLD NEW              # Rename context
```

### Clusters
```bash
kubectl config get-clusters                        # List clusters
kubectl config set-cluster CLUSTER --server=URL    # Create/update
kubectl config delete-cluster CLUSTER              # Delete
```

### Users/Credentials
```bash
kubectl config get-users                           # List users
kubectl config set-credentials USER --token=TOKEN  # Create user
kubectl config delete-user USER                    # Delete user
```

## Authorization

### Check Permissions
```bash
kubectl auth can-i create pods                     # Can I create pods?
kubectl auth can-i get pods --as=USER              # Can user create?
kubectl auth can-i delete deployments -n NAMESPACE # In namespace?
kubectl auth can-i '*' pods                        # All actions?
```

### Whoami
```bash
kubectl auth whoami                                # Current user
kubectl auth whoami -o json                        # JSON output
```

## Debugging & Troubleshooting

### Pod Debugging
```bash
kubectl describe pod POD_NAME                      # Details + events
kubectl logs POD_NAME                              # Logs
kubectl logs POD_NAME --previous                   # Previous logs
kubectl exec -it POD_NAME -- /bin/bash             # Shell access
```

### Port Forward
```bash
kubectl port-forward POD_NAME 8080:8080            # Pod port
kubectl port-forward svc/SERVICE_NAME 8080:8080    # Service port
kubectl port-forward pod/POD --address 0.0.0.0 8080:8080  # All IPs
```

### Proxy Access
```bash
kubectl proxy                                      # Start proxy
kubectl proxy --port=8001                          # Custom port
# Access: http://localhost:8001/api/v1/namespaces/default/pods
```

### Debug Container
```bash
kubectl debug POD_NAME -it                         # Debug pod
kubectl debug node/NODE_NAME -it                   # Debug node
kubectl debug POD_NAME -it --image=alpine          # Custom image
```

### Diff
```bash
kubectl diff -f deployment.yaml                    # Show changes
kubectl apply -f deployment.yaml --dry-run=client -o yaml  # Dry-run YAML
```

## Advanced Patterns

### Dry-Run Workflow
```bash
# 1. Client-side validation
kubectl apply -f manifest.yaml --dry-run=client

# 2. Server-side validation
kubectl apply -f manifest.yaml --dry-run=server

# 3. Actual apply
kubectl apply -f manifest.yaml
```

### Export & Import
```bash
# Export
kubectl get pod POD_NAME -o yaml > pod-export.yaml

# Modify and import
kubectl apply -f pod-export.yaml
```

### Bulk Operations
```bash
# Delete all failed pods
kubectl delete pods --field-selector=status.phase=Failed

# Label all pods
kubectl label pods --all app=myapp

# Scale all deployments with label
kubectl scale deployment -l tier=backend --replicas=3
```

### Watch Resources
```bash
kubectl get pods -w                                 # Watch all pods
kubectl rollout status deployment/APP -w            # Watch rollout
kubectl get pvc -w                                 # Watch PVCs
```

## Quick Reference: Common Tasks

| Task | Command |
|------|---------|
| List pods | `kubectl get pods -A` |
| Describe pod | `kubectl describe pod POD` |
| View logs | `kubectl logs POD` |
| Follow logs | `kubectl logs -f POD` |
| Shell in pod | `kubectl exec -it POD -- /bin/bash` |
| Run command | `kubectl exec POD -- CMD` |
| Apply manifest | `kubectl apply -f manifest.yaml` |
| Update image | `kubectl set image deployment/APP app=app:TAG` |
| Scale | `kubectl scale deployment/APP --replicas=N` |
| Check status | `kubectl rollout status deployment/APP` |
| Rollback | `kubectl rollout undo deployment/APP` |
| Delete pod | `kubectl delete pod POD` |
| Cordon node | `kubectl cordon NODE` |
| Drain node | `kubectl drain NODE --ignore-daemonsets` |
| Check permissions | `kubectl auth can-i create pods` |
| View config | `kubectl config view` |
| Switch context | `kubectl config use-context CONTEXT` |
| Port forward | `kubectl port-forward pod/POD 8080:8080` |
| Test apply | `kubectl apply -f manifest.yaml --dry-run=client` |
| Check resource usage | `kubectl top pods` |

## Tips

- **Always use `--dry-run=client` before real operations**
- **Use `-A` flag to see across all namespaces**
- **Use `-w` flag to watch for real-time changes**
- **Use label selectors for bulk operations**
- **Use `--record` to track command history in rollouts**
- **Check events: `kubectl get events --sort-by='.lastTimestamp'`**
- **Use `kubectl explain RESOURCE` for documentation**
- **Combine with `jq` for JSON processing: `kubectl get pods -o json | jq '.items[0].metadata.name'`**

/**
 * Process-local dynamic Plugin registry and its opaque identity mints.
 * @module @deepseek-ai/dsh-cordis-host-runner/registry
 */
/** Registry, identity mints, and pending approval index. */
export class DynamicCordisRegistry {
    plugins = new Map();
    pendingRequests = new Map();
    nextPlugin = 1;
    nextPackage = 1;
    nextRun = 1;
    nextApproval = 1;
    /**
     * Mint a semantic plugin ID without reusing a prior suffix.
     * @param prefix - validated lowercase semantic prefix proposed by the model.
     * @returns a process-unique Plugin ID.
     */
    mintPluginId(prefix) {
        let id;
        do
            id = `${prefix}-${this.nextPlugin++}`;
        while (this.plugins.has(id));
        return id;
    }
    /**
     * Mint an immutable package ID.
     * @returns a process-unique Package ID.
     */
    mintPackageId() {
        return `pkg-${this.nextPackage++}`;
    }
    /**
     * Mint an activation ID.
     * @returns a process-unique Plugin Run ID.
     */
    mintPluginRunId() {
        return `run-${this.nextRun++}`;
    }
    /**
     * Mint an approval ID.
     * @returns a process-unique approval request ID.
     */
    mintApprovalRequestId() {
        return `approval-${this.nextApproval++}`;
    }
    /**
     * Add one stable plugin.
     * @param plugin - Plugin record to retain under its stable ID.
     */
    add(plugin) {
        this.plugins.set(plugin.pluginId, plugin);
    }
    /**
     * Read one plugin.
     * @param id - stable Plugin ID.
     * @returns the Plugin record, or `undefined` when absent.
     */
    get(id) {
        return this.plugins.get(id);
    }
    /**
     * Delete one plugin and all package versions.
     * @param id - stable Plugin ID to remove.
     * @returns whether a Plugin record was removed.
     */
    delete(id) {
        return this.plugins.delete(id);
    }
    /**
     * Read all plugins in creation order.
     * @returns a snapshot of every Plugin record.
     */
    all() {
        return [...this.plugins.values()];
    }
    /**
     * Read one session's plugins in creation order.
     * @param sessionId - owning session to filter by.
     * @returns a snapshot of matching Plugin records.
     */
    ofSession(sessionId) {
        return this.all().filter(plugin => plugin.sessionId === sessionId);
    }
    /**
     * Publish one pending approval.
     * @param id - approval request ID.
     * @param pending - resolver and Plugin metadata retained until settlement.
     */
    armRequest(id, pending) {
        this.pendingRequests.set(id, pending);
    }
    /**
     * Read one pending approval without claiming it.
     * @param id - approval request ID.
     * @returns the pending request, or `undefined` when absent.
     */
    peekRequest(id) {
        return this.pendingRequests.get(id);
    }
    /**
     * Claim one pending approval; first answer wins.
     * @param id - approval request ID.
     * @returns the claimed request, or `undefined` when already settled.
     */
    claimRequest(id) {
        const pending = this.pendingRequests.get(id);
        if (pending !== undefined)
            this.pendingRequests.delete(id);
        return pending;
    }
    /**
     * Cancel one pending approval.
     * @param id - approval request ID to remove.
     */
    disarmRequest(id) {
        this.pendingRequests.delete(id);
    }
    /**
     * Find a pending approval for one Plugin.
     * @param pluginId - stable Plugin ID.
     * @returns its approval request ID, or `undefined` when none is pending.
     */
    pendingRequestFor(pluginId) {
        for (const [requestId, request] of this.pendingRequests) {
            if (request.pluginId === pluginId)
                return requestId;
        }
        return undefined;
    }
}
//# sourceMappingURL=registry.js.map
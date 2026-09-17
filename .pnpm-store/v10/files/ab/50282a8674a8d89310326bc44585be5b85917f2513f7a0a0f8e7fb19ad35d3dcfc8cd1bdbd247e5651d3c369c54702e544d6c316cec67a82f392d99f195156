const identityToolName = (name) => name;
/** Split current tools into prefix and transcript-loaded definitions. */
export function splitDeferredTools(context, enabled, normalizeName = identityToolName) {
    const uniqueTools = new Map();
    for (const tool of context.tools ?? [])
        uniqueTools.set(normalizeName(tool.name), tool);
    if (!enabled)
        return { immediate: [...uniqueTools.values()], deferred: new Map() };
    const deferredNames = new Set();
    const usedNames = new Set();
    for (const message of context.messages) {
        if (message.role === "assistant") {
            for (const block of message.content) {
                if (block.type === "toolCall")
                    usedNames.add(normalizeName(block.name));
            }
        }
        else if (message.role === "toolResult") {
            for (const name of message.addedToolNames ?? []) {
                const normalizedName = normalizeName(name);
                if (!usedNames.has(normalizedName))
                    deferredNames.add(normalizedName);
            }
        }
    }
    const immediate = [];
    const deferred = new Map();
    for (const [name, tool] of uniqueTools) {
        if (deferredNames.has(name))
            deferred.set(name, tool);
        else
            immediate.push(tool);
    }
    return { immediate, deferred };
}
//# sourceMappingURL=deferred-tools.js.map
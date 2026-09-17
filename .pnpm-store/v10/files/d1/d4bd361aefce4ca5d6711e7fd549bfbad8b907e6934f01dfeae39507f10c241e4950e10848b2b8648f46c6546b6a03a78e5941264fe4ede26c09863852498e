function loadNodeOs() {
    if (typeof process === "undefined" || !(process.versions?.node || process.versions?.bun)) {
        return null;
    }
    return process.getBuiltinModule?.("node:os") ?? null;
}
// Keep runtime OS loading browser-safe. A top-level runtime import of node:os breaks browser/Vite builds.
const nodeOs = loadNodeOs();
export function getPiUserAgent() {
    return nodeOs ? `pi (${nodeOs.platform()} ${nodeOs.release()}; ${nodeOs.arch()})` : "pi (browser)";
}
//# sourceMappingURL=pi-user-agent.js.map
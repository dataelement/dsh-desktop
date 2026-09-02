/**
 * Theme lifecycle: classifying installed packages as themes (by the
 * registry's theme category), live-toggling bundle-layer entries through
 * the loader, and keeping exactly one theme active with the choice
 * persisted across restarts.
 */
import { loadRegistry, pluginCategories } from "./registry.js";
import { hotMount, hotUnmount, listHotMounts, writeDisabled } from "./hot.js";
import { logEvent } from "./log.js";
import { profileDir, readInstalled } from "./profile.js";
import { repoOf } from "./sources.js";
/**
 * Create the theme manager. `disabledThemes` is the live, shared set of
 * themes the user switched off — the caller owns reading it at boot and
 * replaying it; the manager mutates and persists it on switches.
 */
export function createThemeManager(host, profile, disabledThemes, explicitDir) {
    const activeProfileDir = profileDir(profile, explicitDir);
    /** Installed package names classified as themes by the registry's theme category. */
    async function installedThemeNames() {
        const names = new Set();
        try {
            const registry = await loadRegistry();
            const themeEntries = registry.plugins.filter(p => pluginCategories(p).includes('theme'));
            const themeNames = new Set(themeEntries.map(p => p.name));
            const themeRepos = new Set(themeEntries.map(p => repoOf(p.url)).filter((r) => r !== null).map(r => r.toLowerCase()));
            for (const [name, spec] of Object.entries(readInstalled(profile, activeProfileDir))) {
                if (themeNames.has(name)) {
                    names.add(name);
                    continue;
                }
                const match = /github:([^#\s]+)/.exec(String(spec).toLowerCase());
                if (match !== null && themeRepos.has(match[1]))
                    names.add(name);
            }
        }
        catch { /* registry unavailable — nothing classifies as a theme */ }
        return names;
    }
    /**
     * Live-toggle a bundle-layer plugin through its loader entry. Bundle trees
     * are in-memory (write is a no-op), so this never touches any file — the
     * market persists the choice itself and replays it at boot.
     * @returns true when a matching live entry was found and updated.
     */
    async function setEntryDisabled(name, disabledFlag) {
        let found = false;
        for (const entry of host.loader.entries()) {
            if (entry.options.name !== name)
                continue;
            // A disable can land while the entry's init is still in flight: the
            // options flip but the finishing init brings the fiber up anyway, and a
            // plain re-update no-ops on the empty diff. Force the update and verify
            // the live state, retrying until reality matches the flag.
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await entry.update({ disabled: disabledFlag ? true : null }, false, true);
                    found = true;
                }
                catch (error) {
                    logEvent('warn', 'toggle', `${name}: entry update failed — ${error instanceof Error ? error.message : String(error)}`);
                    break;
                }
                const live = entry.fiber !== undefined;
                if (live !== disabledFlag)
                    break;
                await new Promise(resolvePromise => setTimeout(resolvePromise, 200));
            }
            logEvent('info', 'toggle', `${name} -> ${disabledFlag ? 'off' : 'on'}: fiber=${String(entry.fiber !== undefined)}`);
        }
        if (!found)
            logEvent('info', 'toggle', `${name}: no loader entry matched`);
        return found;
    }
    /**
     * Make `name` the one active theme: deactivate every other installed theme
     * (market hot mounts unmount; bundle-layer entries live-disable) and bring
     * it up. The choice persists in state.json and is replayed at boot.
     */
    async function activateTheme(name) {
        const themes = await installedThemeNames();
        for (const other of themes) {
            if (other === name)
                continue;
            if (listHotMounts().includes(other)) {
                await hotUnmount(other);
                disabledThemes.add(other);
            }
            else if (await setEntryDisabled(other, true)) {
                disabledThemes.add(other);
            }
        }
        disabledThemes.delete(name);
        writeDisabled(activeProfileDir, disabledThemes);
        if (listHotMounts().includes(name))
            return true;
        if (await setEntryDisabled(name, false))
            return true;
        return (await hotMount(host, activeProfileDir, name)).ok;
    }
    return { installedThemeNames, setEntryDisabled, activateTheme };
}

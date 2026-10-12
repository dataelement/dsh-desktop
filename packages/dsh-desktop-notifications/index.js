/**
 * Host half for the DSH Desktop notification preferences.
 *
 * The rows and the notification policy live in the browser half; this entry
 * only has to exist so the profile patch can mount the package and hand its
 * `dsh.client` entry to the client module graph.
 */
export function apply() {}

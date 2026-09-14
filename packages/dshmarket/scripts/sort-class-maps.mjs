/**
 * Deterministic ordering for the CSS module class map inside the built
 * client bundle.
 *
 * tsdown emits that map in an unstable key order: two consecutive builds of
 * identical source differed by ~265 lines. `prepare` runs the build on a
 * plain `npm install`, so every contributor's working tree acquired the diff
 * without them touching anything, and three open PRs carried it — a
 * guaranteed conflict on a generated file.
 *
 * Key order has no effect on behaviour, and sorting preserves the line COUNT,
 * so the sourcemap's line numbers stay valid — the same property the banner
 * fold in normalize-client-banner.mjs depends on.
 */

/**
 * One `"key": "value"` line, with the trailing comma optional because the
 * last entry of an object literal has none. Excluding it would leave
 * whichever key randomly landed last pinned in place while everything else
 * sorted around it, which is still a per-build diff.
 */
const CLASS_LINE = /^(\s*)"([A-Za-z0-9_$]+)": "([^"]+)",?$/

/**
 * Sort every CSS-module class map in `code`, leaving all other object
 * literals untouched.
 *
 * A run qualifies only when every value is exactly `<prefix><key>` under one
 * shared prefix and one shared indent. That is the CSS module's own shape;
 * the bundle's locale tables are `"key": "翻译"`, so a looser "sort any
 * object literal" rule would reorder those too — a far larger diff, and one
 * that would fight anyone reading the bundle against the source.
 * @param {string} code the built bundle
 * @returns {{ code: string, sorted: number }} rewritten bundle and key count
 */
export function sortClassMaps(code) {
  const lines = code.split('\n')
  let sorted = 0
  for (let start = 0; start < lines.length; start++) {
    const first = CLASS_LINE.exec(lines[start] ?? '')
    if (first === null || !first[3].endsWith(first[2]) || first[3] === first[2]) continue
    const prefix = first[3].slice(0, first[3].length - first[2].length)
    let end = start
    while (end + 1 < lines.length) {
      const next = CLASS_LINE.exec(lines[end + 1] ?? '')
      if (next === null || next[1] !== first[1] || next[3] !== prefix + next[2]) break
      end++
    }
    // A single line is already in a deterministic order by definition.
    if (end > start) {
      const entries = lines.slice(start, end + 1).map(line => CLASS_LINE.exec(line))
      // Which positions carry a comma is a property of the POSITION, not of
      // the entry that happened to sit there, so it is re-applied after the
      // sort rather than carried along with the key.
      const commas = lines.slice(start, end + 1).map(line => line.endsWith(','))
      entries.sort((a, b) => (a?.[2] ?? '').localeCompare(b?.[2] ?? '', 'en'))
      const run = entries.map((entry, index) =>
        `${entry?.[1] ?? ''}"${entry?.[2] ?? ''}": "${entry?.[3] ?? ''}"${commas[index] === true ? ',' : ''}`)
      lines.splice(start, run.length, ...run)
      sorted += run.length
    }
    start = end
  }
  return { code: sorted > 0 ? lines.join('\n') : code, sorted }
}

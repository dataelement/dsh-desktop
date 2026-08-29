import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const PATCHED_INDEX = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-llm-pi-ai',
  'lib',
  'index.js'
)

describe('llm-pi-ai per-provider failure isolation (#239)', () => {
  it('keeps the namespace registerable when one provider profile is unserviceable', async () => {
    // dataelement/dsh-desktop#239: a single pi-ai provider with a profile the
    // installed catalog cannot describe (missing `api` for an unknown model)
    // used to make `assertServiceable` throw, which made
    // `dsh-settings.register()` throw, which made the whole `llm-pi-ai`
    // namespace disappear from the settings mirror. The Models page then
    // rendered zero provider rows and disabled both "Add" buttons, with no
    // banner — the user thought every custom provider was gone.
    //
    // The fix isolates per-provider failures: a bad profile is dropped from
    // the live registry, the rest of the namespace still registers, and a
    // warning names the dropped route. This test reads the patched source
    // and asserts both the tolerant resolver and the reporter wiring.
    const patched = await readFile(PATCHED_INDEX, 'utf8')

    // The module exposes a setter for the per-provider failure reporter, so
    // `apply()` can install one without re-shaping the public function
    // signatures of `assertServiceable` and `resolveProfiles`.
    expect(patched).toMatch(/let\s+invalidProviderReporter\s*=\s*null/)
    expect(patched).toMatch(/function\s+setInvalidProviderReporter\s*\(/)
    expect(patched).toContain('invalidProviderReporter = reporter')

    // The for-loop body in `resolveProfiles` is wrapped in a try/catch, so
    // a throw from `rejectRemovedFields` / `resolveRouteModels` / `buildProvider`
    // for one provider does not abort the iteration.
    const resolveProfilesMatch = patched.match(
      /function\s+resolveProfiles\s*\([^)]*\)\s*\{[\s\S]*?\n\t\}\n\}/
    )
    expect(resolveProfilesMatch).toBeDefined()
    const resolveProfilesBody = resolveProfilesMatch![0]
    expect(resolveProfilesBody).toContain('try {')
    expect(resolveProfilesBody).toContain('} catch (error) {')
    expect(resolveProfilesBody).toMatch(/invalidProviderReporter\(provider,/)
    // The top-level "providers is now a dict" guard still throws — that
    // structural error has no per-provider scope, so it must keep its
    // loud-fail semantics.
    expect(resolveProfilesBody).toContain(
      '"llm-pi-ai: providers is now a dict keyed by provider route'
    )
    // The legacy / structural guards inside the loop are still present.
    expect(resolveProfilesBody).toContain('"llm-pi-ai: provider names must be non-empty"')
  })

  it('wires the failure reporter from apply() so warnings reach the user', async () => {
    // Without this wiring, the per-provider catch would have a null reporter
    // and silently drop bad routes. The patch installs a `ctx.logger.warn`
    // callback that names the dropped route and the cause.
    const patched = await readFile(PATCHED_INDEX, 'utf8')

    const applyMatch = patched.match(/function\s+apply\s*\([^)]*\)\s*\{[\s\S]*?\n\}\n\/\/#endregion/)
    expect(applyMatch).toBeDefined()
    const applyBody = applyMatch![0]
    expect(applyBody).toContain('setInvalidProviderReporter(')
    expect(applyBody).toContain('ctx.logger.warn(')
    expect(applyBody).toMatch(/dropping provider "\$\{provider\}" /)
  })

  it('keeps the per-provider failure message informative for the original #239 trigger', async () => {
    // The trigger in #239 is the catalog lookup throwing
    //   llm-pi-ai: provider "opencode-go" model "qwen3.8-flash" needs an api;
    //   the installed catalog does not describe it, so set the route's api
    //   to the wire protocol its endpoint speaks
    // We want the catch to forward that error message verbatim (not
    // truncate or wrap it in a generic "invalid profile" string), so the
    // user can see exactly which model and which field to fix.
    const patched = await readFile(PATCHED_INDEX, 'utf8')
    const resolveProfilesMatch = patched.match(
      /function\s+resolveProfiles\s*\([^)]*\)\s*\{[\s\S]*?\n\t\}\n\}/
    )
    expect(resolveProfilesMatch).toBeDefined()
    const resolveProfilesBody = resolveProfilesMatch![0]
    // Forwards `error.message` straight through; does not introduce a
    // generic wrapper that would lose the model id.
    expect(resolveProfilesBody).toContain('error instanceof Error ? error : new Error(String(error))')
  })

  it('preserves the prior classifyPiAiError patch (FORBIDDEN vs AUTH split)', async () => {
    // The same patch file used to split 401 vs 403 so quota-exceeded and
    // rate-limit messages no longer hijack the AUTH bucket. We re-validate
    // the file still carries that change so a future rewrite does not
    // silently regress the error classification.
    const patch = await readFile(patchPath('@deepseek-ai/dsh-llm-pi-ai'), 'utf8')

    expect(patch).toContain('\\b401\\b')
    expect(patch).toContain('\\b403\\b')
    expect(patch).toContain('return "FORBIDDEN"')
    expect(patch).toContain('isQuotaExceededError(message)')
  })
})

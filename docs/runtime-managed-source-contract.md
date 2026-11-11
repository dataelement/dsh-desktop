# Root runtime composition and managed bundle sources

These compatibility extensions target Harness 0.2.2-rc.1. Public mountRootInclude, recomposeProfile, reconcileProfilePatches and composeEntries already own ordinary Profile composition and runtime resolution. They do not expose temporary owner-bound overlays or non-package source routing. The extensions reuse their Loader tree and patch preparation rather than installing another composer.

## Transient root layers

The profileRuntimeLayers service is available before boot calls host prepare. Obtain an owner capability with ctx.profileRuntimeLayers.for(ownerContext). Its set(id, patches, requiredIds) copies declarative patches, serializes root updates and checks required activation. A failed update restores the previous runtime layer and keeps original activation failures in the cause chain. A capability cannot modify a layer belonging to another owner or root.

Persistent Profile/HMR recomposition replaces only the base layers; active transient layers remain appended. Removing a transient layer restores base rows and preserves unrelated transient/user layers. Owner disposal removes its layers. Removal from a disposer currently awaited by a root transaction queues restoration without awaiting that transaction. The actual root Include lifetime expires capabilities, so Loader shutdown does not restart its children. Preparation failure disposes the partial context and retains its original cause.

Transient clients must stop their fibers without committing a user disable to Include. Before withdrawing an injected authorization service, mark all strictly owned rows disabled, then revoke/stop them and remove their composition layer. Otherwise Loader interprets an unsolicited fiber stop as a persistent user action. The source owns account identity, generation authorization and failure recovery; the SDK does not grant credentials or infer ownership from display names.

## Managed sources

PluginManager.managedBundleSourceContract === 1 advertises context-scoped profileManagedBundleSource routing. A real provider implements accepts(target), listBundles() and change(request). Custom namespace targets route before ordinary npm operations. Registry names and built-in file/link/npm/git/http installation schemes cannot be claimed by a managed source.

Manager rechecks the same scoped provider before and after each operation. Provider removal invalidates stale results and publishes inventory changes. Sources must retain account/scope/generation checks and should honor AbortSignal. Manager cancellation and disposal track managed work until settlement. Failed managed targets never fall back to pnpm. Managed results retain their actual application outcome even when ordinary Profile HMR is unavailable.

Inventory forces managedSource: true, official: false and updatable: false. Managed rows do not gain a generic package source/install target. Optional classification survives host, remote and embedded API client codecs; it identifies source ownership and grants no ordinary third-party installation permission. Verified-install guards, protected management bundles and backend identity/integrity checks remain in force.

## Verification and removal

Generic tests use actual Context, Loader, Include and PluginManager: overlay/base updates, rollback/cause identity, owner removal during composition, root shutdown, preparation cleanup, managed inventory/routing, source loss during mutation, disposal cancellation and codecs. Existing verified-install regressions remain mandatory. Downstream tests additionally exercise physical package closure, root ESM/client discovery, per-instance authorization and failed-update rollback. macOS tests do not establish native Windows acceptance.

Version-scoped atomic patches cover app-boot, plugin-manager and the embedded inventory codec in api-remotes. Remove these extensions when the official SDK supplies equivalent owned runtime layers and managed-source routing; migrate consumers and verify temporary layers are neither duplicated nor persisted.

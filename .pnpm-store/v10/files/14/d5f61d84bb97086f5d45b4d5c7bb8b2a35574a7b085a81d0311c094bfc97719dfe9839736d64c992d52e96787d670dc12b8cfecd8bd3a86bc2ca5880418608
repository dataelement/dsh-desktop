/**
 * Browser half: fill the frame's right column with the panel, put the expand
 * button in the conversation header, and own the seats a tab type registers
 * into.
 *
 * Two seats share one session-scoped store, which the slot runtime allows
 * because both are session-scoped (a handle may not span scopes). The panel seat
 * in the frame draws the surface normally or fullscreen, retaining the track
 * on wide viewports; the header's corner seat draws the way back in
 * while the panel is hidden. The store is the layout's only source of truth; the docking
 * kit's pure planners compute every change and the store records them, one
 * history entry per intent.
 *
 * The frame is a base package and never injects this one. What it needs —
 * whether the panel is shown and whether it wants a track — arrives through its
 * own `ctx.layout` action face, reported by the seat that knows both facts.
 *
 * Tab types register in two stages: the type itself into `ctx.sidebarRightTabs`,
 * its body into the keyed `sidebar.right.pane.tab` seat under the same kind. The
 * guide registers through those stages unmodified, exactly as a type shipped
 * from another package does — `ui-sidebar-documentpreview` is the live proof.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SidebarRightController } from './service.ts';
import { SidebarRightTabRegistry } from './tab-registry.ts';
export type { RightbarSeatProps, SidebarRightInjected, SidebarRightPresentation } from './shell/SidebarRight.tsx';
export type { GuideBodyProps, GuideInjected } from './tabs/guide/GuideBody.tsx';
export type { ExpandButtonProps } from './shell/ExpandButton.tsx';
export type { SidebarRightState, SurfaceState } from './stores.ts';
export type { ISidebarRight, SidebarRightBinding, SidebarRightOpenResourceOptions, SidebarRightOpenTabOptions, SidebarRightPlacement, SurfaceActions, } from './service.ts';
export type { SidebarRightGuideBox, SidebarRightGuideEntry, SidebarRightTabClaim, SidebarRightTabDefinition, SidebarRightTabPriority, } from './tab-registry.ts';
export type { SidebarRightTabInfo, SidebarRightTabInjected, UseSidebarRightTabInfo, SidebarRightTabActions, SidebarRightTabMenuOwnerProps, SidebarRightTabNavigation, SidebarRightTabPlacement, } from './contract/slots.ts';
export type { SidebarRightNavigationParams, SidebarRightResourceParams, SidebarRightResourceParamsMap, SidebarRightTabParams, SidebarRightTabParamsFor, SidebarRightTabParamsMap, } from './contract/params.ts';
export type { FloatRect, PaneId, TabId, TabRecord } from '@deepseek-ai/dsh-client-ui-dockkit';
export type { PinResource, SidebarRightNavigator, TabOccurrence } from './tab-domain.ts';
export type { SidebarRightKey } from './locales.ts';
export type { OpenContentIntent } from './stores.ts';
/** Required browser services: the slot registry, the frame's panel actions, copy, and the resource model. */
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Right-Sidebar navigation and presentation face. */
        sidebarRight: SidebarRightController;
        /** Right-Sidebar tab-type registry (stage one of a tab type's registration). */
        sidebarRightTabs: SidebarRightTabRegistry;
    }
}
/**
 * Client plugin body: provide the registry and the navigation face, register the
 * panel seat and the rail seat over one store with their extension children, and
 * register the guide type through the same public two-stage path any other type
 * uses.
 * @param ctx - client root context carrying the slot registry, the frame's face, and copy.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map
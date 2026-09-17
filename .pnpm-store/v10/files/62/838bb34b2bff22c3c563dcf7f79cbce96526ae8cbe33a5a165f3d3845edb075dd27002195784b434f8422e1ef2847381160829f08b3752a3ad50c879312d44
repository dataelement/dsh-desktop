import type { Context } from '@deepseek-ai/cordis';
import { SlotRegistry } from './registry.ts';
export { SlotRegistry } from './registry.ts';
export type { RootOwnerProps } from './registry.ts';
export type { ChainRenderOpts, HostObservable, RenderOpts, SnapshotSelectorHook, SlotRenderer, ScopedStandardSourceBinding, SlotRendererHost, SlotScopeAdapter, StandardSourceBinding, StoreInstanceLike, } from '@deepseek-ai/dsh-client-ui-slots';
/** Mount operation exposed to the framework-free boot kernel. */
export interface UiRendererService {
    /**
     * Mount the assembled application into the supplied element.
     * @param container - Application mount point.
     * @returns Disposer that unmounts the React root.
     */
    mount: (container: HTMLElement) => () => void;
}
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * A slot declaration or registration set changed.
         * @mode emit
         * @param key - mutated SlotMap key.
         */
        'slots/changed'(key: string): void;
    }
    interface Context {
        /** Renderer-owned UI composition registry. */
        slots: SlotRegistry;
        /** Mount face provided after the UI renderer activates. */
        uiRenderer: UiRendererService;
    }
}
/** Services required before application assembly. */
export declare const inject: string[];
/**
 * Install the slot renderer and provide the application mount face.
 * @param ctx - Plugin context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map
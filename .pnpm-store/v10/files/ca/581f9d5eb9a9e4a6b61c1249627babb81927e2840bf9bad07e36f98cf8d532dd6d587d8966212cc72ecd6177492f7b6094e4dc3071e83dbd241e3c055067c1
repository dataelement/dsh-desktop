/**
 * Official-DeepSeek first-run step. Readiness comes from the same
 * provider/settings/credential join as the Models page: any provider the user
 * can already talk to ends the step, and only a user with none is offered the
 * official DeepSeek route. The step reuses that page's credential editor in
 * the onboarding plugin's shared modal, so the key is entered once.
 */
import type { ReactNode } from 'react';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ModelsSettingsState, ModelsSettingsStore } from './store.ts';
import type { ModelsOperations } from './operations.ts';
import type { SettingsSchemaOperations } from './schema-operations.ts';
import type { en } from './locales.ts';
/** Registration-side dependencies of {@link DeepSeekOnboardingDialog}. */
export interface DeepSeekOnboardingInjected {
    hooks: {
        /** Shared Models-page join state, bound by the slot renderer. */
        models: SnapshotStore<ModelsSettingsState>;
    };
    /** Shared Models-page join controller. */
    controller: ModelsSettingsStore;
    /** The Host operations the reused Models credential editor writes through. */
    operations: ModelsOperations;
    /** Settings schema and immutable path callbacks. */
    schema: SettingsSchemaOperations;
    /** Feature copy. */
    t: (key: keyof typeof en) => string;
}
/** Slot owner props plus the feature's injected dependencies. */
export type DeepSeekOnboardingDialogProps = PropsRuntime<'settings.onboarding'> & InjectFace<DeepSeekOnboardingInjected>;
/**
 * Prompt a first-run user for the official DeepSeek credential while no
 * provider can serve requests and that credential is writable.
 * @param props - settings-shell owner state and Models feature dependencies.
 * @returns the onboarding modal or null when onboarding needs no intervention.
 */
export declare function DeepSeekOnboardingDialog(props: DeepSeekOnboardingDialogProps): ReactNode;
//# sourceMappingURL=DeepSeekOnboardingDialog.d.ts.map
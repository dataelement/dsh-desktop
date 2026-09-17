import type { SettingsSchemaService } from '@deepseek-ai/dsh-client-ui-settings/client';
/** Plain schema callbacks exposed to Models stores and presentation components. */
export type SettingsSchemaOperations = Pick<SettingsSchemaService, 'rehydrate' | 'validate' | 'nodeAtPath' | 'getPath' | 'hasPath' | 'setPath' | 'deletePath'>;
/**
 * Hide the Cordis service identity behind bound schema callbacks.
 * @param service - settings-owned schema service available in the apply context.
 * @returns callbacks that cannot expose the service context to React components.
 */
export declare function createSettingsSchemaOperations(service: SettingsSchemaService): SettingsSchemaOperations;
//# sourceMappingURL=schema-operations.d.ts.map
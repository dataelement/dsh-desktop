/** Opaque webhook identities shared by adapters, rules, and Session provenance. */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** Identifies one programmatic webhook rule. */
export type WebhookRuleId = Branded<'WebhookRuleId'>;
/** Identifies one configured webhook adapter instance. */
export type WebhookSourceId = Branded<'WebhookSourceId'>;
/** Identifies one provider delivery. The runtime assigns no deduplication semantics. */
export type WebhookDeliveryId = Branded<'WebhookDeliveryId'>;
/**
 * Brand a webhook rule id.
 * @param value - non-empty rule identifier validated at registration.
 * @returns the same string with its compile-time brand.
 */
export declare function WebhookRuleId(value: string): WebhookRuleId;
/**
 * Brand a configured webhook source id.
 * @param value - non-empty adapter instance identifier validated by its adapter.
 * @returns the same string with its compile-time brand.
 */
export declare function WebhookSourceId(value: string): WebhookSourceId;
/**
 * Brand a provider delivery id.
 * @param value - non-empty provider identity validated by its adapter.
 * @returns the same string with its compile-time brand.
 */
export declare function WebhookDeliveryId(value: string): WebhookDeliveryId;
//# sourceMappingURL=brand.d.ts.map
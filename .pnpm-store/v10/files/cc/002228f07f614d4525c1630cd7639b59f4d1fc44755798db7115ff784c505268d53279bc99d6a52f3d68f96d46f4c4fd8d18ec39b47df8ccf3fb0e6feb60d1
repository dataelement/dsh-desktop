/**
 * Browser-side judgement of a typed API key.
 * @module @deepseek-ai/dsh-client-ui-settings-models/apiKey
 */
/**
 * Copy key naming why a typed key cannot be saved. A wrapped paste reports the
 * same format failure as an illegal character: the reader's next move is the
 * same either way — look at the key and paste it again — so naming the two
 * causes apart would spend the field's one line on a distinction that changes
 * nothing about what to do.
 */
export type ApiKeyFailureKey = 'keyBlank' | 'keyIllegalCharacters';
/**
 * Judge the key input's current value.
 *
 * An empty field is not a failure: every card opens with it empty even when a
 * key is already stored, where it means keep that one. A field holding only
 * whitespace is a failure rather than an empty field, so typed input is never
 * silently discarded.
 * @param draft - the key input's current value, untrimmed.
 * @returns the copy key for a field-level failure, or `undefined` to allow submit.
 */
export declare function apiKeyFailure(draft: string): ApiKeyFailureKey | undefined;
//# sourceMappingURL=apiKey.d.ts.map
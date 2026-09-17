/** Native V3 system-head validation with a private view for frozen non-system relationships. */
import type { SessionFormatArtifact, SessionFormatEvent, SessionFormatHeader } from '@deepseek-ai/dsh-session-format';
/**
 * Validate v3 logical metadata with the released-v2 fields.
 * @param header - decoded v3 Session header.
 */
export declare function assertReleasedV3Header(header: SessionFormatHeader): void;
/**
 * Validate system ownership, protected-head operations, ordinary relationships, and inherited cut.
 * The private relationship view never escapes; the returned artifact and its messages are unchanged.
 * @param artifact - detached v3 artifact.
 * @param knownEventTypes - event types understood by the installed Session package.
 * @returns the same validated artifact.
 */
export declare function restoreReleasedV3Artifact(artifact: SessionFormatArtifact, knownEventTypes: ReadonlySet<string>): SessionFormatArtifact;
/**
 * Refuse required predecessor PTC tags without interpreting native extension payloads.
 * @param event - event envelope whose type and ignorable admission markers are available.
 */
export declare function assertV3EventAdmission(event: SessionFormatEvent): void;
//# sourceMappingURL=validation.d.ts.map
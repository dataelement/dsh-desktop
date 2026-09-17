import type * as types from "./types.gen.js";
/**
 * The operation requiring permission.
 */
export type RequestPermissionSubject = types.RequestPermissionSubject;
/**
 * Validated type guards for `RequestPermissionSubject`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const RequestPermissionSubject: {
    /** Narrow to the `tool_call` variant, validating its payload. */
    readonly isToolCall: (value: types.RequestPermissionSubject) => value is types.ToolCallPermissionSubject & {
        type: "tool_call";
    };
    /** Narrow to the `command` variant, validating its payload. */
    readonly isCommand: (value: types.RequestPermissionSubject) => value is types.CommandPermissionSubject & {
        type: "command";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.RequestPermissionSubject) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Content produced by a tool call.
 *
 * Tool calls can produce different types of content including standard
 * content blocks (text, images), file diffs, or display-only terminals.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/v2/draft/tool-calls#content)
 */
export type ToolCallContent = types.ToolCallContent;
/**
 * Validated type guards for `ToolCallContent`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const ToolCallContent: {
    /** Narrow to the `content` variant, validating its payload. */
    readonly isContent: (value: types.ToolCallContent) => value is types.Content & {
        type: "content";
    };
    /** Narrow to the `diff` variant, validating its payload. */
    readonly isDiff: (value: types.ToolCallContent) => value is types.Diff & {
        type: "diff";
    };
    /** Narrow to the `terminal` variant, validating its payload. */
    readonly isTerminal: (value: types.ToolCallContent) => value is types.Terminal & {
        type: "terminal";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.ToolCallContent) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Content blocks represent displayable information in the Agent Client Protocol.
 *
 * They provide a structured way to handle various types of user-facing content—whether
 * it's text from language models, images for analysis, or embedded resources for context.
 *
 * Content blocks appear in:
 * - User prompts sent via `session/prompt`
 * - Language model output reported through `session/update` notifications as
 *   message updates or streamed chunks
 * - Progress updates and results from tool calls
 *
 * This structure is compatible with the Model Context Protocol (MCP), enabling
 * agents to seamlessly forward content from MCP tool outputs without transformation.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/v2/draft/content)
 */
export type ContentBlock = types.ContentBlock;
/**
 * Validated type guards for `ContentBlock`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const ContentBlock: {
    /** Narrow to the `text` variant, validating its payload. */
    readonly isText: (value: types.ContentBlock) => value is types.TextContent & {
        type: "text";
    };
    /** Narrow to the `image` variant, validating its payload. */
    readonly isImage: (value: types.ContentBlock) => value is types.ImageContent & {
        type: "image";
    };
    /** Narrow to the `audio` variant, validating its payload. */
    readonly isAudio: (value: types.ContentBlock) => value is types.AudioContent & {
        type: "audio";
    };
    /** Narrow to the `resource_link` variant, validating its payload. */
    readonly isResourceLink: (value: types.ContentBlock) => value is types.ResourceLink & {
        type: "resource_link";
    };
    /** Narrow to the `resource` variant, validating its payload. */
    readonly isResource: (value: types.ContentBlock) => value is types.EmbeddedResource & {
        type: "resource";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.ContentBlock) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * One file-level change described by a [`Diff`].
 *
 * Structured change metadata lets clients identify affected files and
 * operations without parsing the text patch.
 */
export type DiffChange = types.DiffChange;
/**
 * Validated type guards for `DiffChange`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const DiffChange: {
    /** Narrow to the `add` variant, validating its payload. */
    readonly isAdd: (value: types.DiffChange) => value is (types.DiffPathChange & {
        operation: "add";
    }) & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
    /** Narrow to the `delete` variant, validating its payload. */
    readonly isDelete: (value: types.DiffChange) => value is (types.DiffPathChange & {
        operation: "delete";
    }) & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
    /** Narrow to the `modify` variant, validating its payload. */
    readonly isModify: (value: types.DiffChange) => value is (types.DiffPathChange & {
        operation: "modify";
    }) & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
    /** Narrow to the `move` variant, validating its payload. */
    readonly isMove: (value: types.DiffChange) => value is (types.DiffPathPairChange & {
        operation: "move";
    }) & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
    /** Narrow to the `copy` variant, validating its payload. */
    readonly isCopy: (value: types.DiffChange) => value is (types.DiffPathPairChange & {
        operation: "copy";
    }) & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
    /**
     * Narrow to a custom or future variant: the `operation` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.DiffChange) => value is {
        operation: string;
        [key: string]: unknown;
    } & Pick<types.DiffChange, "fileType" | "mimeType" | "_meta">;
};
/**
 * Request from the agent to elicit structured user input.
 *
 * The agent sends this to the client to request information from the user,
 * either via a form or by directing them to a URL.
 * Elicitations are tied to a session (optionally a tool call) or a request.
 */
export type CreateElicitationRequest = types.CreateElicitationRequest;
/**
 * Validated type guards for `CreateElicitationRequest`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const CreateElicitationRequest: {
    /** Narrow to the `form` variant, validating its payload. */
    readonly isForm: (value: types.CreateElicitationRequest) => value is (types.ElicitationFormMode & {
        mode: "form";
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
    /** Narrow to the `url` variant, validating its payload. */
    readonly isUrl: (value: types.CreateElicitationRequest) => value is (types.ElicitationUrlMode & {
        mode: "url";
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
    /**
     * Narrow to a custom or future variant: the `mode` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.CreateElicitationRequest) => value is ((types.ElicitationSessionScope | types.ElicitationRequestScope) & {
        mode: string;
        [key: string]: unknown;
    }) & Pick<types.CreateElicitationRequest, "message" | "_meta">;
};
/**
 * Property schema for elicitation form fields.
 *
 * Each variant corresponds to a JSON Schema `"type"` value.
 * Single-select enums use the `String` variant with `enum` or `oneOf` set.
 * Multi-select enums use the `Array` variant.
 */
export type ElicitationPropertySchema = types.ElicitationPropertySchema;
/**
 * Validated type guards for `ElicitationPropertySchema`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const ElicitationPropertySchema: {
    /** Narrow to the `string` variant, validating its payload. */
    readonly isString: (value: types.ElicitationPropertySchema) => value is types.StringPropertySchema & {
        type: "string";
    };
    /** Narrow to the `number` variant, validating its payload. */
    readonly isNumber: (value: types.ElicitationPropertySchema) => value is types.NumberPropertySchema & {
        type: "number";
    };
    /** Narrow to the `integer` variant, validating its payload. */
    readonly isInteger: (value: types.ElicitationPropertySchema) => value is types.IntegerPropertySchema & {
        type: "integer";
    };
    /** Narrow to the `boolean` variant, validating its payload. */
    readonly isBoolean: (value: types.ElicitationPropertySchema) => value is types.BooleanPropertySchema & {
        type: "boolean";
    };
    /** Narrow to the `array` variant, validating its payload. */
    readonly isArray: (value: types.ElicitationPropertySchema) => value is types.MultiSelectPropertySchema & {
        type: "array";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.ElicitationPropertySchema) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Items for a multi-select (array) property schema.
 */
export type MultiSelectItems = types.MultiSelectItems;
/**
 * Validated type guards for `MultiSelectItems`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const MultiSelectItems: {
    /** Narrow to the `string` variant, validating its payload. */
    readonly isString: (value: types.MultiSelectItems) => value is types.StringMultiSelectItems & {
        type: "string";
    };
    /** Narrow to the `titled` variant, validating its payload. */
    readonly isTitled: (value: types.MultiSelectItems) => value is types.TitledMultiSelectItems;
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.MultiSelectItems) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Describes an available authentication method.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 */
export type AuthMethod = types.AuthMethod;
/**
 * Validated type guards for `AuthMethod`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const AuthMethod: {
    /** Narrow to the `terminal` variant, validating its payload. */
    readonly isTerminal: (value: types.AuthMethod) => value is types.AuthMethodTerminal & {
        type: "terminal";
    };
    /** Narrow to the `agent` variant, validating its payload. */
    readonly isAgent: (value: types.AuthMethod) => value is types.AuthMethodAgent & {
        type: "agent";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.AuthMethod) => value is {
        type: string;
        [key: string]: unknown;
    } & {
        methodId: types.AuthMethodId;
        name: string;
    };
};
/**
 * A session configuration option selector and its current state.
 */
export type SessionConfigOption = types.SessionConfigOption;
/**
 * Validated type guards for `SessionConfigOption`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const SessionConfigOption: {
    /** Narrow to the `select` variant, validating its payload. */
    readonly isSelect: (value: types.SessionConfigOption) => value is (types.SessionConfigSelect & {
        type: "select";
    }) & Pick<types.SessionConfigOption, "configId" | "name" | "description" | "category" | "_meta">;
    /** Narrow to the `boolean` variant, validating its payload. */
    readonly isBoolean: (value: types.SessionConfigOption) => value is (types.SessionConfigBoolean & {
        type: "boolean";
    }) & Pick<types.SessionConfigOption, "configId" | "name" | "description" | "category" | "_meta">;
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.SessionConfigOption) => value is {
        type: string;
        [key: string]: unknown;
    } & Pick<types.SessionConfigOption, "configId" | "name" | "description" | "category" | "_meta">;
};
/**
 * A suggestion returned by the agent.
 */
export type NesSuggestion = types.NesSuggestion;
/**
 * Validated type guards for `NesSuggestion`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const NesSuggestion: {
    /** Narrow to the `edit` variant, validating its payload. */
    readonly isEdit: (value: types.NesSuggestion) => value is types.NesEditSuggestion & {
        kind: "edit";
    };
    /** Narrow to the `jump` variant, validating its payload. */
    readonly isJump: (value: types.NesSuggestion) => value is types.NesJumpSuggestion & {
        kind: "jump";
    };
    /** Narrow to the `rename` variant, validating its payload. */
    readonly isRename: (value: types.NesSuggestion) => value is types.NesRenameSuggestion & {
        kind: "rename";
    };
    /** Narrow to the `searchAndReplace` variant, validating its payload. */
    readonly isSearchAndReplace: (value: types.NesSuggestion) => value is types.NesSearchAndReplaceSuggestion & {
        kind: "searchAndReplace";
    };
    /**
     * Narrow to a custom or future variant: the `kind` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.NesSuggestion) => value is {
        kind: string;
        [key: string]: unknown;
    } & {
        suggestionId: types.NesSuggestionId;
    };
};
/**
 * Different types of updates that can be sent while a session exists.
 *
 * These updates report messages, progress, and other session activity.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/v2/draft/prompt-lifecycle#3-agent-reports-output)
 */
export type SessionUpdate = types.SessionUpdate;
/**
 * Validated type guards for `SessionUpdate`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const SessionUpdate: {
    /** Narrow to the `user_message_chunk` variant, validating its payload. */
    readonly isUserMessageChunk: (value: types.SessionUpdate) => value is types.ContentChunk & {
        sessionUpdate: "user_message_chunk";
    };
    /** Narrow to the `user_message` variant, validating its payload. */
    readonly isUserMessage: (value: types.SessionUpdate) => value is types.UserMessage & {
        sessionUpdate: "user_message";
    };
    /** Narrow to the `agent_message_chunk` variant, validating its payload. */
    readonly isAgentMessageChunk: (value: types.SessionUpdate) => value is types.ContentChunk & {
        sessionUpdate: "agent_message_chunk";
    };
    /** Narrow to the `agent_message` variant, validating its payload. */
    readonly isAgentMessage: (value: types.SessionUpdate) => value is types.AgentMessage & {
        sessionUpdate: "agent_message";
    };
    /** Narrow to the `agent_thought_chunk` variant, validating its payload. */
    readonly isAgentThoughtChunk: (value: types.SessionUpdate) => value is types.ContentChunk & {
        sessionUpdate: "agent_thought_chunk";
    };
    /** Narrow to the `agent_thought` variant, validating its payload. */
    readonly isAgentThought: (value: types.SessionUpdate) => value is types.AgentThought & {
        sessionUpdate: "agent_thought";
    };
    /** Narrow to the `state_update` variant, validating its payload. */
    readonly isStateUpdate: (value: types.SessionUpdate) => value is types.StateUpdate & {
        sessionUpdate: "state_update";
    };
    /** Narrow to the `tool_call_content_chunk` variant, validating its payload. */
    readonly isToolCallContentChunk: (value: types.SessionUpdate) => value is types.ToolCallContentChunk & {
        sessionUpdate: "tool_call_content_chunk";
    };
    /** Narrow to the `tool_call_update` variant, validating its payload. */
    readonly isToolCallUpdate: (value: types.SessionUpdate) => value is types.ToolCallUpdate & {
        sessionUpdate: "tool_call_update";
    };
    /** Narrow to the `terminal_update` variant, validating its payload. */
    readonly isTerminalUpdate: (value: types.SessionUpdate) => value is types.TerminalUpdate & {
        sessionUpdate: "terminal_update";
    };
    /** Narrow to the `terminal_output_chunk` variant, validating its payload. */
    readonly isTerminalOutputChunk: (value: types.SessionUpdate) => value is types.TerminalOutputChunk & {
        sessionUpdate: "terminal_output_chunk";
    };
    /** Narrow to the `plan_update` variant, validating its payload. */
    readonly isPlanUpdate: (value: types.SessionUpdate) => value is types.PlanUpdate & {
        sessionUpdate: "plan_update";
    };
    /** Narrow to the `plan_removed` variant, validating its payload. */
    readonly isPlanRemoved: (value: types.SessionUpdate) => value is types.PlanRemoved & {
        sessionUpdate: "plan_removed";
    };
    /** Narrow to the `available_commands_update` variant, validating its payload. */
    readonly isAvailableCommandsUpdate: (value: types.SessionUpdate) => value is types.AvailableCommandsUpdate & {
        sessionUpdate: "available_commands_update";
    };
    /** Narrow to the `config_option_update` variant, validating its payload. */
    readonly isConfigOptionUpdate: (value: types.SessionUpdate) => value is types.ConfigOptionUpdate & {
        sessionUpdate: "config_option_update";
    };
    /** Narrow to the `session_info_update` variant, validating its payload. */
    readonly isSessionInfoUpdate: (value: types.SessionUpdate) => value is types.SessionInfoUpdate & {
        sessionUpdate: "session_info_update";
    };
    /** Narrow to the `usage_update` variant, validating its payload. */
    readonly isUsageUpdate: (value: types.SessionUpdate) => value is types.UsageUpdate & {
        sessionUpdate: "usage_update";
    };
    /** Narrow to the `compaction_update` variant, validating its payload. */
    readonly isCompactionUpdate: (value: types.SessionUpdate) => value is types.CompactionUpdate & {
        sessionUpdate: "compaction_update";
    };
    /** Narrow to the `compaction_summary_chunk` variant, validating its payload. */
    readonly isCompactionSummaryChunk: (value: types.SessionUpdate) => value is types.CompactionSummaryChunk & {
        sessionUpdate: "compaction_summary_chunk";
    };
    /**
     * Narrow to a custom or future variant: the `sessionUpdate` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.SessionUpdate) => value is {
        sessionUpdate: string;
        [key: string]: unknown;
    };
};
/**
 * The state of the agent's foreground work has changed.
 *
 * Background activity can continue and emit other `session/update` notifications
 * while `idle`. Those notifications do not change this state.
 */
export type StateUpdate = types.StateUpdate;
/**
 * Validated type guards for `StateUpdate`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const StateUpdate: {
    /** Narrow to the `running` variant, validating its payload. */
    readonly isRunning: (value: types.StateUpdate) => value is types.RunningStateUpdate & {
        state: "running";
    };
    /** Narrow to the `idle` variant, validating its payload. */
    readonly isIdle: (value: types.StateUpdate) => value is types.IdleStateUpdate & {
        state: "idle";
    };
    /** Narrow to the `requires_action` variant, validating its payload. */
    readonly isRequiresAction: (value: types.StateUpdate) => value is types.RequiresActionStateUpdate & {
        state: "requires_action";
    };
    /**
     * Narrow to a custom or future variant: the `state` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.StateUpdate) => value is {
        state: string;
        [key: string]: unknown;
    };
};
/**
 * Updated content for a plan.
 */
export type PlanUpdateContent = types.PlanUpdateContent;
/**
 * Validated type guards for `PlanUpdateContent`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const PlanUpdateContent: {
    /** Narrow to the `items` variant, validating its payload. */
    readonly isItems: (value: types.PlanUpdateContent) => value is types.PlanItems & {
        type: "items";
    };
    /** Narrow to the `file` variant, validating its payload. */
    readonly isFile: (value: types.PlanUpdateContent) => value is types.PlanFile & {
        type: "file";
    };
    /** Narrow to the `markdown` variant, validating its payload. */
    readonly isMarkdown: (value: types.PlanUpdateContent) => value is types.PlanMarkdown & {
        type: "markdown";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.PlanUpdateContent) => value is {
        type: string;
        [key: string]: unknown;
    } & {
        planId: types.PlanId;
    };
};
/**
 * The input specification for a command.
 */
export type AvailableCommandInput = types.AvailableCommandInput;
/**
 * Validated type guards for `AvailableCommandInput`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const AvailableCommandInput: {
    /** Narrow to the `text` variant, validating its payload. */
    readonly isText: (value: types.AvailableCommandInput) => value is types.TextCommandInput & {
        type: "text";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.AvailableCommandInput) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Configuration for connecting to an MCP (Model Context Protocol) server.
 *
 * MCP servers provide tools and context that the agent can use when
 * processing prompts.
 *
 * See protocol docs: [MCP Servers](https://agentclientprotocol.com/protocol/v2/draft/session-setup#mcp-servers)
 */
export type McpServer = types.McpServer;
/**
 * Validated type guards for `McpServer`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const McpServer: {
    /** Narrow to the `http` variant, validating its payload. */
    readonly isHttp: (value: types.McpServer) => value is types.McpServerHttp & {
        type: "http";
    };
    /** Narrow to the `acp` variant, validating its payload. */
    readonly isAcp: (value: types.McpServer) => value is types.McpServerAcp & {
        type: "acp";
    };
    /** Narrow to the `stdio` variant, validating its payload. */
    readonly isStdio: (value: types.McpServer) => value is types.McpServerStdio & {
        type: "stdio";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.McpServer) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Inclusive cursor describing where replayed session history should begin.
 *
 * Replay includes the position identified by the cursor.
 */
export type ReplayFrom = types.ReplayFrom;
/**
 * Validated type guards for `ReplayFrom`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const ReplayFrom: {
    /** Narrow to the `start` variant, validating its payload. */
    readonly isStart: (value: types.ReplayFrom) => value is types.ReplayFromStart & {
        type: "start";
    };
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.ReplayFrom) => value is {
        type: string;
        [key: string]: unknown;
    };
};
/**
 * Request parameters for setting a session configuration option.
 */
export type SetSessionConfigOptionRequest = types.SetSessionConfigOptionRequest;
/**
 * Validated type guards for `SetSessionConfigOptionRequest`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const SetSessionConfigOptionRequest: {
    /** Narrow to the `id` variant, validating its payload. */
    readonly isId: (value: types.SetSessionConfigOptionRequest) => value is ({
        type: "id";
    } & {
        value: types.SessionConfigValueId;
    }) & Pick<types.SetSessionConfigOptionRequest, "sessionId" | "configId" | "_meta">;
    /** Narrow to the `boolean` variant, validating its payload. */
    readonly isBoolean: (value: types.SetSessionConfigOptionRequest) => value is ({
        type: "boolean";
    } & {
        value: boolean;
    }) & Pick<types.SetSessionConfigOptionRequest, "sessionId" | "configId" | "_meta">;
    /**
     * Narrow to a custom or future variant: the `type` tag matches no known variant, with a valid payload.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.SetSessionConfigOptionRequest) => value is ({
        type: string;
        [key: string]: unknown;
    } & {
        value: unknown;
    }) & Pick<types.SetSessionConfigOptionRequest, "sessionId" | "configId" | "_meta">;
};
/**
 * The outcome of a permission request.
 */
export type RequestPermissionOutcome = types.RequestPermissionOutcome;
/**
 * Validated type guards for `RequestPermissionOutcome`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const RequestPermissionOutcome: {
    /** Narrow to the `cancelled` variant, validating its payload. */
    readonly isCancelled: (value: types.RequestPermissionOutcome) => value is {
        outcome: "cancelled";
    };
    /** Narrow to the `selected` variant, validating its payload. */
    readonly isSelected: (value: types.RequestPermissionOutcome) => value is types.SelectedPermissionOutcome & {
        outcome: "selected";
    };
    /**
     * Narrow to a custom or future variant: the `outcome` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.RequestPermissionOutcome) => value is {
        outcome: string;
        [key: string]: unknown;
    };
};
/**
 * Response from the client to an elicitation request.
 */
export type CreateElicitationResponse = types.CreateElicitationResponse;
/**
 * Validated type guards for `CreateElicitationResponse`'s known variants.
 *
 * Each guard validates the variant's payload, not just its discriminant
 * tag: a malformed known variant (right tag, wrong payload) matches no
 * guard — mirroring wire validation, which rejects such values instead
 * of classifying them as custom.
 *
 * Guards check the value as given: fields that wire deserialization
 * salvages to a default (e.g. a malformed `_meta`) are only normalized
 * by parsing, and for ambiguous raw shapes (a known tag combined with
 * another variant's payload) guards are conservative where wire parsing
 * may still accept the value — narrow wire-parsed values when exact
 * parity matters.
 */
export declare const CreateElicitationResponse: {
    /** Narrow to the `accept` variant, validating its payload. */
    readonly isAccept: (value: types.CreateElicitationResponse) => value is (types.ElicitationAcceptAction & {
        action: "accept";
    }) & Pick<types.CreateElicitationResponse, "_meta">;
    /** Narrow to the `decline` variant, validating its payload. */
    readonly isDecline: (value: types.CreateElicitationResponse) => value is {
        action: "decline";
    } & Pick<types.CreateElicitationResponse, "_meta">;
    /** Narrow to the `cancel` variant, validating its payload. */
    readonly isCancel: (value: types.CreateElicitationResponse) => value is {
        action: "cancel";
    } & Pick<types.CreateElicitationResponse, "_meta">;
    /**
     * Narrow to a custom or future variant: the `action` tag matches no known variant.
     *
     * TypeScript keeps the known variants in the narrowed union (they are
     * structural subtypes of the catch-all), so read vendor payload keys
     * via a widening cast: `(value as Record<string, unknown>).someKey`.
     */
    readonly isCustom: (value: types.CreateElicitationResponse) => value is {
        action: string;
        [key: string]: unknown;
    } & Pick<types.CreateElicitationResponse, "_meta">;
};

/**
 * A JSON-RPC request object.
 */
export type AgentRequest = {
    /**
     * The request id used to correlate the matching response.
     */
    id: RequestId;
    /**
     * The method name to invoke.
     */
    method: string;
    /**
     * Method-specific request parameters.
     */
    params?: WriteTextFileRequest | ReadTextFileRequest | RequestPermissionRequest | CreateTerminalRequest | TerminalOutputRequest | ReleaseTerminalRequest | WaitForTerminalExitRequest | KillTerminalRequest | CreateElicitationRequest | ConnectMcpRequest | MessageMcpRequest | DisconnectMcpRequest | ExtRequest | null;
};
/**
 * JSON RPC Request Id
 *
 * An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification. The value SHOULD normally not be Null \[1\] and Numbers SHOULD NOT contain fractional parts \[2\]
 *
 * The Server MUST reply with the same value in the Response object if included. This member is used to correlate the context between the two objects.
 *
 * \[1\] The use of Null as a value for the id member in a Request object is discouraged, because this specification uses a value of Null for Responses with an unknown id. Also, because JSON-RPC 1.0 uses an id value of Null for Notifications this could cause confusion in handling.
 *
 * \[2\] Fractional parts may be problematic, since many decimal fractions cannot be represented exactly as binary fractions.
 */
export type RequestId = null | number | string;
/**
 * Request to write content to a text file.
 *
 * Only available if the client supports the `fs.writeTextFile` capability.
 */
export type WriteTextFileRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * Absolute path to the file to write.
     */
    path: string;
    /**
     * The text content to write to the file.
     */
    content: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A unique identifier for a conversation session between a client and agent.
 *
 * Sessions maintain their own context, conversation history, and state,
 * allowing multiple independent interactions with the same agent.
 *
 * See protocol docs: [Session ID](https://agentclientprotocol.com/protocol/session-setup#session-id)
 */
export type SessionId = string;
/**
 * Request to read content from a text file.
 *
 * Only available if the client supports the `fs.readTextFile` capability.
 */
export type ReadTextFileRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * Absolute path to the file to read.
     */
    path: string;
    /**
     * Line number to start reading from (1-based).
     */
    line?: number | null;
    /**
     * Maximum number of lines to read.
     */
    limit?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request for user permission to execute a tool call.
 *
 * Sent when the agent needs authorization before performing a sensitive operation.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
 */
export type RequestPermissionRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * Details about the tool call requiring permission.
     */
    toolCall: ToolCallUpdate;
    /**
     * Available permission options for the user to choose from.
     */
    options: Array<PermissionOption>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An update to an existing tool call.
 *
 * Used to report progress and results as tools execute. All fields except
 * the tool call ID are optional - only changed fields need to be included.
 *
 * See protocol docs: [Updating](https://agentclientprotocol.com/protocol/tool-calls#updating)
 */
export type ToolCallUpdate = {
    /**
     * The ID of the tool call being updated.
     */
    toolCallId: ToolCallId;
    /**
     * Update the tool kind.
     */
    kind?: ToolKind | null;
    /**
     * Update the execution status.
     */
    status?: ToolCallStatus | null;
    /**
     * Update the human-readable title.
     */
    title?: string | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Update the programmatic name of the tool being invoked.
     *
     * This field is optional. Omitting it or sending `null` both mean that
     * the existing name is left unchanged.
     *
     * @experimental
     */
    name?: string | null;
    /**
     * Replace the content collection.
     */
    content?: Array<ToolCallContent> | null;
    /**
     * Replace the locations collection.
     */
    locations?: Array<ToolCallLocation> | null;
    /**
     * Update the raw input.
     */
    rawInput?: unknown;
    /**
     * Update the raw output.
     */
    rawOutput?: unknown;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Unique identifier for a tool call within a session.
 */
export type ToolCallId = string;
/**
 * Categories of tools that can be invoked.
 *
 * Tool kinds help clients choose appropriate icons and optimize how they
 * display tool execution progress.
 *
 * See protocol docs: [Creating](https://agentclientprotocol.com/protocol/tool-calls#creating)
 */
export type ToolKind = "read" | "edit" | "delete" | "move" | "search" | "execute" | "think" | "fetch" | "switch_mode" | "other";
/**
 * Execution status of a tool call.
 *
 * Tool calls progress through different statuses during their lifecycle.
 *
 * See protocol docs: [Status](https://agentclientprotocol.com/protocol/tool-calls#status)
 */
export type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";
/**
 * Content produced by a tool call.
 *
 * Tool calls can produce different types of content including
 * standard content blocks (text, images) or file diffs.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export type ToolCallContent = (Content & {
    type: "content";
}) | (Diff & {
    type: "diff";
}) | (Terminal & {
    type: "terminal";
});
/**
 * Content blocks represent displayable information in the Agent Client Protocol.
 *
 * They provide a structured way to handle various types of user-facing content—whether
 * it's text from language models, images for analysis, or embedded resources for context.
 *
 * Content blocks appear in:
 * - User prompts sent via `session/prompt`
 * - Language model output streamed through `session/update` notifications
 * - Progress updates and results from tool calls
 *
 * This structure is compatible with the Model Context Protocol (MCP), enabling
 * agents to seamlessly forward content from MCP tool outputs without transformation.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/content)
 */
export type ContentBlock = (TextContent & {
    type: "text";
}) | (ImageContent & {
    type: "image";
}) | (AudioContent & {
    type: "audio";
}) | (ResourceLink & {
    type: "resource_link";
}) | (EmbeddedResource & {
    type: "resource";
});
/**
 * Optional annotations for the client. The client can use annotations to inform how objects are used or displayed
 */
export type Annotations = {
    /**
     * Intended recipients for this content, such as the user or assistant.
     */
    audience?: Array<Role> | null;
    /**
     * Timestamp indicating when the underlying resource was last modified.
     */
    lastModified?: string | null;
    /**
     * Relative importance of this content when clients choose what to surface.
     */
    priority?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The sender or recipient of messages and data in a conversation.
 */
export type Role = "assistant" | "user";
/**
 * Text provided to or from an LLM.
 */
export type TextContent = {
    /**
     * Optional annotations that help clients decide how to display or route this content.
     */
    annotations?: Annotations | null;
    /**
     * Text payload carried by this content block.
     */
    text: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An image provided to or from an LLM.
 */
export type ImageContent = {
    /**
     * Optional annotations that help clients decide how to display or route this content.
     */
    annotations?: Annotations | null;
    /**
     * Base64-encoded media payload.
     */
    data: string;
    /**
     * MIME type describing the encoded media payload.
     */
    mimeType: string;
    /**
     * URI associated with this resource or media payload.
     */
    uri?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Audio provided to or from an LLM.
 */
export type AudioContent = {
    /**
     * Optional annotations that help clients decide how to display or route this content.
     */
    annotations?: Annotations | null;
    /**
     * Base64-encoded media payload.
     */
    data: string;
    /**
     * MIME type describing the encoded media payload.
     */
    mimeType: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 */
export type ResourceLink = {
    /**
     * Optional annotations that help clients decide how to display or route this content.
     */
    annotations?: Annotations | null;
    /**
     * Optional human-readable details shown with this protocol object.
     */
    description?: string | null;
    /**
     * MIME type describing the encoded media payload.
     */
    mimeType?: string | null;
    /**
     * Human-readable name shown for this protocol object.
     */
    name: string;
    /**
     * Optional size of the linked resource in bytes, if known.
     */
    size?: number | null;
    /**
     * Optional display title for end-user UI.
     */
    title?: string | null;
    /**
     * URI associated with this resource or media payload.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Resource content that can be embedded in a message.
 */
export type EmbeddedResourceResource = TextResourceContents | BlobResourceContents;
/**
 * Text-based resource contents.
 */
export type TextResourceContents = {
    /**
     * MIME type describing the encoded media payload.
     */
    mimeType?: string | null;
    /**
     * Text payload carried by this content block.
     */
    text: string;
    /**
     * URI associated with this resource or media payload.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Binary resource contents.
 */
export type BlobResourceContents = {
    /**
     * Base64-encoded bytes for a binary resource payload.
     */
    blob: string;
    /**
     * MIME type describing the encoded media payload.
     */
    mimeType?: string | null;
    /**
     * URI associated with this resource or media payload.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export type EmbeddedResource = {
    /**
     * Optional annotations that help clients decide how to display or route this content.
     */
    annotations?: Annotations | null;
    /**
     * Embedded resource payload, either text or binary data.
     */
    resource: EmbeddedResourceResource;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Standard content block (text, images, resources).
 */
export type Content = {
    /**
     * The actual content block.
     */
    content: ContentBlock;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A diff representing file modifications.
 *
 * Shows changes to files in a format suitable for display in the client UI.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export type Diff = {
    /**
     * The absolute file path being modified.
     */
    path: string;
    /**
     * The original content (None for new files).
     */
    oldText?: string | null;
    /**
     * The new content after modification.
     */
    newText: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Typed identifier used for terminal values on the wire.
 */
export type TerminalId = string;
/**
 * Embed a terminal created with `terminal/create` by its id.
 *
 * The terminal must be added before calling `terminal/release`.
 *
 * See protocol docs: [Terminal](https://agentclientprotocol.com/protocol/terminals)
 */
export type Terminal = {
    /**
     * Identifier of the terminal instance to embed in the content stream.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A file location being accessed or modified by a tool.
 *
 * Enables clients to implement "follow-along" features that track
 * which files the agent is working with in real-time.
 *
 * See protocol docs: [Following the Agent](https://agentclientprotocol.com/protocol/tool-calls#following-the-agent)
 */
export type ToolCallLocation = {
    /**
     * The absolute file path being accessed or modified.
     */
    path: string;
    /**
     * Optional line number within the file.
     */
    line?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An option presented to the user when requesting permission.
 */
export type PermissionOption = {
    /**
     * Unique identifier for this permission option.
     */
    optionId: PermissionOptionId;
    /**
     * Human-readable label to display to the user.
     */
    name: string;
    /**
     * Hint about the nature of this permission option.
     */
    kind: PermissionOptionKind;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Unique identifier for a permission option.
 */
export type PermissionOptionId = string;
/**
 * The type of permission option being presented to the user.
 *
 * Helps clients choose appropriate icons and UI treatment.
 */
export type PermissionOptionKind = "allow_once" | "allow_always" | "reject_once" | "reject_always";
/**
 * Request to create a new terminal and execute a command.
 */
export type CreateTerminalRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The command to execute.
     */
    command: string;
    /**
     * Array of command arguments.
     */
    args?: Array<string>;
    /**
     * Environment variables for the command.
     */
    env?: Array<EnvVariable>;
    /**
     * Working directory for the command. Must be an absolute path.
     */
    cwd?: string | null;
    /**
     * Maximum number of output bytes to retain.
     *
     * When the limit is exceeded, the Client truncates from the beginning of the output
     * to stay within the limit.
     *
     * The Client MUST ensure truncation happens at a character boundary to maintain valid
     * string output, even if this means the retained output is slightly less than the
     * specified limit.
     */
    outputByteLimit?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An environment variable to set when launching an MCP server.
 */
export type EnvVariable = {
    /**
     * The name of the environment variable.
     */
    name: string;
    /**
     * The value to set for the environment variable.
     */
    value: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request to get the current output and status of a terminal.
 */
export type TerminalOutputRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The ID of the terminal to get output from.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request to release a terminal and free its resources.
 */
export type ReleaseTerminalRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The ID of the terminal to release.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request to wait for a terminal command to exit.
 */
export type WaitForTerminalExitRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The ID of the terminal to wait for.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request to kill a terminal without releasing it.
 */
export type KillTerminalRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The ID of the terminal to kill.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request from the agent to elicit structured user input.
 *
 * The agent sends this to the client to request information from the user,
 * either via a form or by directing them to a URL.
 * Elicitations are tied to a session (optionally a tool call) or a request.
 */
export type CreateElicitationRequest = ((ElicitationFormMode & {
    mode: "form";
}) | (ElicitationUrlMode & {
    mode: "url";
}) | ((ElicitationSessionScope | ElicitationRequestScope) & {
    /**
     * Custom or future elicitation mode.
     *
     * Values beginning with `_` are reserved for implementation-specific
     * extensions. Unknown values that do not begin with `_` are reserved for
     * future ACP variants.
     */
    mode: string;
    [key: string]: unknown;
})) & {
    /**
     * A human-readable message describing what input is needed.
     */
    message: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Session-scoped elicitation, optionally tied to a specific tool call.
 *
 * When `tool_call_id` is set, the elicitation is tied to a specific tool call.
 * This is useful when an agent receives an elicitation from an MCP server
 * during a tool call and needs to redirect it to the user.
 */
export type ElicitationSessionScope = {
    /**
     * The session this elicitation is tied to.
     */
    sessionId: SessionId;
    /**
     * Optional tool call within the session.
     *
     * Optional. Omitted and `null` are equivalent and mean the elicitation is scoped to the
     * session without a specific tool call.
     */
    toolCallId?: ToolCallId | null;
};
/**
 * Request-scoped elicitation, tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export type ElicitationRequestScope = {
    /**
     * The request this elicitation is tied to.
     */
    requestId: RequestId;
};
/**
 * Type-safe elicitation schema for requesting structured user input.
 *
 * This represents a JSON Schema object with primitive-typed properties,
 * as required by the elicitation specification.
 */
export type ElicitationSchema = {
    /**
     * Type discriminator. Always `"object"`.
     */
    type?: ElicitationSchemaType;
    /**
     * Optional title for the schema.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Property definitions (must be primitive types).
     */
    properties?: {
        [key: string]: ElicitationPropertySchema;
    };
    /**
     * List of required property names.
     *
     * Optional. Omitted and `null` are equivalent and mean no property names are required.
     */
    required?: Array<string> | null;
    /**
     * Optional description of what this schema represents.
     *
     * Optional. Omitted and `null` are equivalent and mean no schema description is provided.
     */
    description?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Object schema type.
 */
export type ElicitationSchemaType = "object";
/**
 * Property schema for elicitation form fields.
 *
 * Each variant corresponds to a JSON Schema `"type"` value.
 * Single-select enums use the `String` variant with `enum` or `oneOf` set.
 * Multi-select enums use the `Array` variant.
 */
export type ElicitationPropertySchema = (StringPropertySchema & {
    type: "string";
}) | (NumberPropertySchema & {
    type: "number";
}) | (IntegerPropertySchema & {
    type: "integer";
}) | (BooleanPropertySchema & {
    type: "boolean";
}) | (MultiSelectPropertySchema & {
    type: "array";
}) | {
    /**
     * Custom or future elicitation property schema type.
     *
     * Values beginning with `_` are reserved for implementation-specific
     * extensions. Unknown values that do not begin with `_` are reserved for
     * future ACP variants.
     */
    type: string;
    [key: string]: unknown;
};
/**
 * String format types for string properties in elicitation schemas.
 */
export type StringFormat = "email" | "uri" | "date" | "date-time";
/**
 * A titled enum option with a const value, human-readable title, and optional description.
 */
export type EnumOption = {
    /**
     * The constant value for this option.
     */
    const: string;
    /**
     * Human-readable title for this option.
     */
    title: string;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Schema for string properties in an elicitation form.
 *
 * When `enum` or `oneOf` is set, this represents a single-select enum
 * with `"type": "string"`.
 */
export type StringPropertySchema = {
    /**
     * Optional title for the property.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * Minimum string length.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no minimum length constraint.
     */
    minLength?: number | null;
    /**
     * Maximum string length.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no maximum length constraint.
     */
    maxLength?: number | null;
    /**
     * Pattern the string must match.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no pattern constraint.
     */
    pattern?: string | null;
    /**
     * String format.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no format constraint.
     */
    format?: StringFormat | null;
    /**
     * Default value.
     *
     * Optional. Omitted and `null` are equivalent and mean no default value is provided.
     */
    default?: string | null;
    /**
     * Enum values for untitled single-select enums.
     * Optional. Omitted and `null` are equivalent and mean no untitled single-select choices are
     * declared by `enum`.
     */
    enum?: Array<string> | null;
    /**
     * Titled enum options for titled single-select enums.
     * Optional. Omitted and `null` are equivalent and mean no titled single-select choices are
     * declared by `oneOf`.
     */
    oneOf?: Array<EnumOption> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Schema for number (floating-point) properties in an elicitation form.
 */
export type NumberPropertySchema = {
    /**
     * Optional title for the property.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * Minimum value (inclusive).
     *
     * Optional. Omitted and `null` are equivalent and mean there is no inclusive lower bound.
     */
    minimum?: number | null;
    /**
     * Maximum value (inclusive).
     *
     * Optional. Omitted and `null` are equivalent and mean there is no inclusive upper bound.
     */
    maximum?: number | null;
    /**
     * Default value.
     *
     * Optional. Omitted and `null` are equivalent and mean no default value is provided.
     */
    default?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Schema for integer properties in an elicitation form.
 */
export type IntegerPropertySchema = {
    /**
     * Optional title for the property.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * Minimum value (inclusive).
     *
     * Optional. Omitted and `null` are equivalent and mean there is no inclusive lower bound.
     */
    minimum?: number | null;
    /**
     * Maximum value (inclusive).
     *
     * Optional. Omitted and `null` are equivalent and mean there is no inclusive upper bound.
     */
    maximum?: number | null;
    /**
     * Default value.
     *
     * Optional. Omitted and `null` are equivalent and mean no default value is provided.
     */
    default?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Schema for boolean properties in an elicitation form.
 */
export type BooleanPropertySchema = {
    /**
     * Optional title for the property.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * Default value.
     *
     * Optional. Omitted and `null` are equivalent and mean no default value is provided.
     */
    default?: boolean | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Items for a multi-select (array) property schema.
 */
export type MultiSelectItems = (StringMultiSelectItems & {
    type: "string";
}) | {
    /**
     * Custom or future multi-select item type.
     *
     * Values beginning with `_` are reserved for implementation-specific
     * extensions. Unknown values that do not begin with `_` are reserved for
     * future ACP variants.
     */
    type: string;
    [key: string]: unknown;
} | TitledMultiSelectItems;
/**
 * String item schema for multi-select enum properties.
 */
export type StringMultiSelectItems = {
    /**
     * Allowed enum values.
     */
    enum: Array<string>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Items definition for titled multi-select enum properties.
 */
export type TitledMultiSelectItems = {
    /**
     * Titled enum options.
     */
    anyOf: Array<EnumOption>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Schema for multi-select (array) properties in an elicitation form.
 */
export type MultiSelectPropertySchema = {
    /**
     * Optional title for the property.
     *
     * Optional. Omitted and `null` are equivalent and mean no title is provided.
     */
    title?: string | null;
    /**
     * Human-readable description.
     *
     * Optional. Omitted and `null` are equivalent and mean no description is provided.
     */
    description?: string | null;
    /**
     * Minimum number of items to select.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no minimum selection count.
     */
    minItems?: number | null;
    /**
     * Maximum number of items to select.
     *
     * Optional. Omitted and `null` are equivalent and mean there is no maximum selection count.
     */
    maxItems?: number | null;
    /**
     * The items definition describing allowed values.
     */
    items: MultiSelectItems;
    /**
     * Default selected values.
     *
     * Optional. Omitted and `null` are equivalent and mean no default selections are provided.
     */
    default?: Array<string> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Form-based elicitation mode where the client renders a form from the provided schema.
 */
export type ElicitationFormMode = (ElicitationSessionScope | ElicitationRequestScope) & {
    /**
     * A JSON Schema describing the form fields to present to the user.
     */
    requestedSchema: ElicitationSchema;
};
/**
 * Unique identifier for an elicitation.
 */
export type ElicitationId = string;
/**
 * URL-based elicitation mode where the client directs the user to a URL.
 */
export type ElicitationUrlMode = (ElicitationSessionScope | ElicitationRequestScope) & {
    /**
     * The unique identifier for this elicitation.
     */
    elicitationId: ElicitationId;
    /**
     * The URL to direct the user to.
     */
    url: string;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/connect`.
 *
 * @experimental
 */
export type ConnectMcpRequest = {
    /**
     * The ACP MCP server ID that was provided by the component declaring the MCP server.
     */
    serverId: McpServerAcpId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for an MCP server using the ACP transport.
 *
 * The value is opaque and generated by the ACP component providing the MCP server. It is
 * used by `mcp/connect` to route connection requests back to the component that declared the
 * server.
 *
 * @experimental
 */
export type McpServerAcpId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/message`.
 *
 * @experimental
 */
export type MessageMcpRequest = {
    /**
     * The MCP-over-ACP connection this message is sent on.
     */
    connectionId: McpConnectionId;
    /**
     * The inner MCP method name.
     */
    method: string;
    /**
     * Optional inner MCP params.
     *
     * If omitted or set to `null`, the inner MCP message has no params.
     */
    params?: {
        [key: string]: unknown;
    } | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A unique identifier for an active MCP-over-ACP connection.
 *
 * @experimental
 */
export type McpConnectionId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/disconnect`.
 *
 * @experimental
 */
export type DisconnectMcpRequest = {
    /**
     * The MCP-over-ACP connection to close.
     */
    connectionId: McpConnectionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Allows for sending an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export type ExtRequest = unknown;
/**
 * A JSON-RPC response object.
 */
export type AgentResponse = {
    /**
     * The id of the request this response answers.
     */
    id: RequestId;
    /**
     * Method-specific response data.
     */
    result: InitializeResponse | AuthenticateResponse | ListProvidersResponse | SetProviderResponse | DisableProviderResponse | LogoutResponse | NewSessionResponse | LoadSessionResponse | ListSessionsResponse | DeleteSessionResponse | ForkSessionResponse | ResumeSessionResponse | CloseSessionResponse | SetSessionModeResponse | SetSessionConfigOptionResponse | PromptResponse | StartNesResponse | SuggestNesResponse | CloseNesResponse | ExtResponse | MessageMcpResponse;
} | {
    /**
     * The id of the request this response answers.
     */
    id: RequestId;
    /**
     * Method-specific error data.
     */
    error: Error;
};
/**
 * Response to the `initialize` method.
 *
 * Contains the negotiated protocol version and agent capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export type InitializeResponse = {
    /**
     * The protocol version the client specified if supported by the agent,
     * or the latest protocol version supported by the agent.
     *
     * The client should disconnect, if it doesn't support this version.
     */
    protocolVersion: ProtocolVersion;
    /**
     * Capabilities supported by the agent.
     */
    agentCapabilities?: AgentCapabilities;
    /**
     * Authentication methods supported by the agent.
     */
    authMethods?: Array<AuthMethod>;
    /**
     * Information about the Agent name and version sent to the Client.
     *
     * Note: in future versions of the protocol, this will be required.
     */
    agentInfo?: Implementation | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Protocol version identifier.
 *
 * This version is only bumped for breaking changes.
 * Non-breaking changes should be introduced via capabilities.
 */
export type ProtocolVersion = number;
/**
 * Capabilities supported by the agent.
 *
 * Advertised during initialization to inform the client about
 * available features and content types.
 *
 * See protocol docs: [Agent Capabilities](https://agentclientprotocol.com/protocol/initialization#agent-capabilities)
 */
export type AgentCapabilities = {
    /**
     * Whether the agent supports `session/load`.
     */
    loadSession?: boolean;
    /**
     * Prompt capabilities supported by the agent.
     */
    promptCapabilities?: PromptCapabilities;
    /**
     * MCP capabilities supported by the agent.
     */
    mcpCapabilities?: McpCapabilities;
    /**
     * Session lifecycle and prompt capabilities advertised by the agent.
     */
    sessionCapabilities?: SessionCapabilities;
    /**
     * Authentication-related capabilities supported by the agent.
     */
    auth?: AgentAuthCapabilities;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Provider configuration capabilities supported by the agent.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports provider configuration methods.
     *
     * @experimental
     */
    providers?: ProvidersCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * NES (Next Edit Suggestions) capabilities supported by the agent.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support
     * for NES methods.
     *
     * @experimental
     */
    nes?: NesCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * The position encoding selected by the agent from the client's supported encodings.
     *
     * @experimental
     */
    positionEncoding?: PositionEncodingKind | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Prompt capabilities supported by the agent in `session/prompt` requests.
 *
 * Baseline agent functionality requires support for [`ContentBlock::Text`]
 * and [`ContentBlock::ResourceLink`] in prompt requests.
 *
 * Other variants must be explicitly opted in to.
 * Capabilities for different types of content in prompt requests.
 *
 * Indicates which content types beyond the baseline (text and resource links)
 * the agent can process.
 *
 * See protocol docs: [Prompt Capabilities](https://agentclientprotocol.com/protocol/initialization#prompt-capabilities)
 */
export type PromptCapabilities = {
    /**
     * Agent supports [`ContentBlock::Image`].
     */
    image?: boolean;
    /**
     * Agent supports [`ContentBlock::Audio`].
     */
    audio?: boolean;
    /**
     * Agent supports embedded context in `session/prompt` requests.
     *
     * When enabled, the Client is allowed to include [`ContentBlock::Resource`]
     * in prompt requests for pieces of context that are referenced in the message.
     */
    embeddedContext?: boolean;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * MCP capabilities supported by the agent
 */
export type McpCapabilities = {
    /**
     * Agent supports [`McpServer::Http`].
     */
    http?: boolean;
    /**
     * Agent supports [`McpServer::Sse`].
     */
    sse?: boolean;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Agent supports [`McpServer::Acp`].
     *
     * @experimental
     */
    acp?: boolean;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Session capabilities supported by the agent.
 *
 * As a baseline, all Agents **MUST** support `session/new`, `session/prompt`, `session/cancel`, and `session/update`.
 *
 * Optionally, they **MAY** support other session methods and notifications by specifying additional capabilities.
 *
 * Note: `session/load` is still handled by the top-level `load_session` capability. This will be unified in future versions of the protocol.
 *
 * See protocol docs: [Session Capabilities](https://agentclientprotocol.com/protocol/initialization#session-capabilities)
 */
export type SessionCapabilities = {
    /**
     * Whether the agent supports `session/list`.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports listing sessions.
     */
    list?: SessionListCapabilities | null;
    /**
     * Whether the agent supports `session/delete`.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports deleting sessions from `session/list`.
     */
    delete?: SessionDeleteCapabilities | null;
    /**
     * Whether the agent supports `additionalDirectories` on supported session lifecycle requests.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports `additionalDirectories` on
     * supported session lifecycle requests.
     *
     * Agents that also support `session/list` may return
     * `SessionInfo.additionalDirectories` to report the complete ordered
     * additional-root list associated with a listed session.
     */
    additionalDirectories?: SessionAdditionalDirectoriesCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Whether the agent supports `session/fork`.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports forking sessions.
     *
     * @experimental
     */
    fork?: SessionForkCapabilities | null;
    /**
     * Whether the agent supports `session/resume`.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports resuming sessions.
     */
    resume?: SessionResumeCapabilities | null;
    /**
     * Whether the agent supports `session/close`.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports closing sessions.
     */
    close?: SessionCloseCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for the `session/list` method.
 *
 * Supplying `{}` means the agent supports listing sessions.
 */
export type SessionListCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for the `session/delete` method.
 *
 * Supplying `{}` means the agent supports deleting sessions from `session/list`.
 */
export type SessionDeleteCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for additional session directories support.
 *
 * Supplying `{}` means the agent supports the `additionalDirectories` field on
 * supported session lifecycle requests. Agents that also support
 * `session/list` may return `SessionInfo.additionalDirectories` to report the
 * complete ordered additional-root list associated with a listed session.
 */
export type SessionAdditionalDirectoriesCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Capabilities for the `session/fork` method.
 *
 * Supplying `{}` means the agent supports forking sessions.
 *
 * @experimental
 */
export type SessionForkCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for the `session/resume` method.
 *
 * Supplying `{}` means the agent supports resuming sessions.
 */
export type SessionResumeCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for the `session/close` method.
 *
 * Supplying `{}` means the agent supports closing sessions.
 */
export type SessionCloseCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Authentication-related capabilities supported by the agent.
 */
export type AgentAuthCapabilities = {
    /**
     * Whether the agent supports the logout method.
     *
     * Optional. Omitted or `null` both mean the agent does not advertise support.
     * Supplying `{}` means the agent supports the logout method.
     */
    logout?: LogoutCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Logout capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports the logout method.
 */
export type LogoutCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Provider configuration capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports provider configuration methods.
 *
 * @experimental
 */
export type ProvidersCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * NES capabilities advertised by the agent during initialization.
 */
export type NesCapabilities = {
    /**
     * Events the agent wants to receive.
     */
    events?: NesEventCapabilities | null;
    /**
     * Context the agent wants attached to each suggestion request.
     */
    context?: NesContextCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Event capabilities the agent can consume.
 */
export type NesEventCapabilities = {
    /**
     * Document event capabilities.
     */
    document?: NesDocumentEventCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Document event capabilities the agent wants to receive.
 */
export type NesDocumentEventCapabilities = {
    /**
     * Whether the agent wants `document/didOpen` events.
     */
    didOpen?: NesDocumentDidOpenCapabilities | null;
    /**
     * Whether the agent wants `document/didChange` events, and the sync kind.
     */
    didChange?: NesDocumentDidChangeCapabilities | null;
    /**
     * Whether the agent wants `document/didClose` events.
     */
    didClose?: NesDocumentDidCloseCapabilities | null;
    /**
     * Whether the agent wants `document/didSave` events.
     */
    didSave?: NesDocumentDidSaveCapabilities | null;
    /**
     * Whether the agent wants `document/didFocus` events.
     */
    didFocus?: NesDocumentDidFocusCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for `document/didOpen` capability support.
 */
export type NesDocumentDidOpenCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for `document/didChange` events.
 */
export type NesDocumentDidChangeCapabilities = {
    /**
     * The sync kind the agent wants: `"full"` or `"incremental"`.
     */
    syncKind: TextDocumentSyncKind;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * How the agent wants document changes delivered.
 */
export type TextDocumentSyncKind = "full" | "incremental";
/**
 * Marker for `document/didClose` capability support.
 */
export type NesDocumentDidCloseCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for `document/didSave` capability support.
 */
export type NesDocumentDidSaveCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for `document/didFocus` capability support.
 */
export type NesDocumentDidFocusCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Context capabilities the agent wants attached to each suggestion request.
 */
export type NesContextCapabilities = {
    /**
     * Whether the agent wants recent files context.
     */
    recentFiles?: NesRecentFilesCapabilities | null;
    /**
     * Whether the agent wants related snippets context.
     */
    relatedSnippets?: NesRelatedSnippetsCapabilities | null;
    /**
     * Whether the agent wants edit history context.
     */
    editHistory?: NesEditHistoryCapabilities | null;
    /**
     * Whether the agent wants user actions context.
     */
    userActions?: NesUserActionsCapabilities | null;
    /**
     * Whether the agent wants open files context.
     */
    openFiles?: NesOpenFilesCapabilities | null;
    /**
     * Whether the agent wants diagnostics context.
     */
    diagnostics?: NesDiagnosticsCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for recent files context.
 */
export type NesRecentFilesCapabilities = {
    /**
     * Maximum number of recent files the agent can use.
     */
    maxCount?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for related snippets context.
 */
export type NesRelatedSnippetsCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for edit history context.
 */
export type NesEditHistoryCapabilities = {
    /**
     * Maximum number of edit history entries the agent can use.
     */
    maxCount?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for user actions context.
 */
export type NesUserActionsCapabilities = {
    /**
     * Maximum number of user actions the agent can use.
     */
    maxCount?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for open files context.
 */
export type NesOpenFilesCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for diagnostics context.
 */
export type NesDiagnosticsCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The encoding used for character offsets in positions.
 *
 * Follows the same conventions as LSP 3.17. The default is UTF-16.
 */
export type PositionEncodingKind = "utf-16" | "utf-32" | "utf-8";
/**
 * Describes an available authentication method.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the method is treated as `agent`.
 */
export type AuthMethod = (AuthMethodTerminal & {
    type: "terminal";
}) | AuthMethodAgent;
/**
 * Typed identifier used for auth method values on the wire.
 */
export type AuthMethodId = string;
/**
 * Terminal-based authentication method.
 *
 * The client runs the configured agent program as a separate interactive
 * process for the user to authenticate via a TUI. Agents MUST advertise this
 * method only when the client enabled its terminal authentication capability.
 * A zero exit status signals success; any other termination signals failure.
 * The client MUST NOT pass this method to `authenticate`.
 */
export type AuthMethodTerminal = {
    /**
     * Unique identifier for this authentication method.
     */
    id: AuthMethodId;
    /**
     * Human-readable name of the authentication method.
     */
    name: string;
    /**
     * Optional description providing more details about this authentication method.
     */
    description?: string | null;
    /**
     * Additional arguments to append to the configured agent invocation for terminal auth.
     */
    args?: Array<string>;
    /**
     * Additional environment variables to set on the configured agent invocation for terminal auth.
     * These values override same-named variables in the base launch configuration.
     */
    env?: {
        [key: string]: string;
    };
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Agent handles authentication itself through `authenticate`.
 *
 * This is the default authentication method type.
 */
export type AuthMethodAgent = {
    /**
     * Unique identifier for this authentication method.
     */
    id: AuthMethodId;
    /**
     * Human-readable name of the authentication method.
     */
    name: string;
    /**
     * Optional description providing more details about this authentication method.
     */
    description?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Metadata about the implementation of the client or agent.
 * Describes the name and version of an ACP implementation, with an optional
 * title for UI representation.
 */
export type Implementation = {
    /**
     * Intended for programmatic or logical use, but can be used as a display
     * name fallback if title isn’t present.
     */
    name: string;
    /**
     * Intended for UI and end-user contexts — optimized to be human-readable
     * and easily understood.
     *
     * If not provided, the name should be used for display.
     */
    title?: string | null;
    /**
     * Version of the implementation. Can be displayed to the user or used
     * for debugging or metrics purposes. (e.g. "1.0.0").
     */
    version: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to the `authenticate` method.
 */
export type AuthenticateResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/list`.
 *
 * @experimental
 */
export type ListProvidersResponse = {
    /**
     * Configurable providers with current routing info suitable for UI display.
     */
    providers: Array<ProviderInfo>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Information about a configurable LLM provider.
 *
 * @experimental
 */
export type ProviderInfo = {
    /**
     * Provider identifier, for example "main" or "openai".
     */
    providerId: ProviderId;
    /**
     * Supported protocol types for this provider.
     */
    supported: Array<LlmProtocol>;
    /**
     * Whether this provider is mandatory and cannot be disabled via `providers/disable`.
     * If true, clients must not call `providers/disable` for this provider ID.
     */
    required: boolean;
    /**
     * Current effective non-secret routing config.
     * Null or omitted means provider is disabled.
     */
    current?: ProviderCurrentConfig | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a configurable LLM provider.
 *
 * @experimental
 */
export type ProviderId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Well-known API protocol identifiers for LLM providers.
 *
 * Agents and clients MUST handle unknown protocol identifiers gracefully.
 *
 * Protocol names beginning with `_` are free for custom use, like other ACP extension methods.
 * Protocol names that do not begin with `_` are reserved for the ACP spec.
 *
 * @experimental
 */
export type LlmProtocol = "anthropic" | "openai" | "azure" | "vertex" | "bedrock" | string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Current effective non-secret routing configuration for a provider.
 *
 * @experimental
 */
export type ProviderCurrentConfig = {
    /**
     * Protocol currently used by this provider.
     */
    apiType: LlmProtocol;
    /**
     * Base URL currently used by this provider.
     */
    baseUrl: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/set`.
 *
 * @experimental
 */
export type SetProviderResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/disable`.
 *
 * @experimental
 */
export type DisableProviderResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to the `logout` method.
 */
export type LogoutResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export type NewSessionResponse = {
    /**
     * Unique identifier for the created session.
     *
     * Used in all subsequent requests for this conversation.
     */
    sessionId: SessionId;
    /**
     * Initial mode state if supported by the Agent
     *
     * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
     */
    modes?: SessionModeState | null;
    /**
     * Initial session configuration options if supported by the Agent.
     */
    configOptions?: Array<SessionConfigOption> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The set of modes and the one currently active.
 */
export type SessionModeState = {
    /**
     * The current mode the Agent is in.
     */
    currentModeId: SessionModeId;
    /**
     * The set of modes that the Agent can operate in
     */
    availableModes: Array<SessionMode>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Unique identifier for a Session Mode.
 */
export type SessionModeId = string;
/**
 * A mode the agent can operate in.
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export type SessionMode = {
    /**
     * Stable identifier used to refer to this protocol object in later messages.
     */
    id: SessionModeId;
    /**
     * Human-readable name shown for this protocol object.
     */
    name: string;
    /**
     * Optional human-readable details shown with this protocol object.
     */
    description?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A session configuration option selector and its current state.
 */
export type SessionConfigOption = ((SessionConfigSelect & {
    type: "select";
}) | (SessionConfigBoolean & {
    type: "boolean";
})) & {
    /**
     * Unique identifier for the configuration option.
     */
    id: SessionConfigId;
    /**
     * Human-readable label for the option.
     */
    name: string;
    /**
     * Optional description for the Client to display to the user.
     */
    description?: string | null;
    /**
     * Optional semantic category for this option (UX only).
     */
    category?: SessionConfigOptionCategory | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Unique identifier for a session configuration option.
 */
export type SessionConfigId = string;
/**
 * Semantic category for a session configuration option.
 *
 * This is intended to help Clients distinguish broadly common selectors (e.g. model selector vs
 * session mode selector vs thought/reasoning level) for UX purposes (keyboard shortcuts, icons,
 * placement). It MUST NOT be required for correctness. Clients MUST handle missing or unknown
 * categories gracefully.
 *
 * Category names beginning with `_` are free for custom use, like other ACP extension methods.
 * Category names that do not begin with `_` are reserved for the ACP spec.
 */
export type SessionConfigOptionCategory = "mode" | "model" | "model_config" | "thought_level" | string;
/**
 * Unique identifier for a session configuration option value.
 */
export type SessionConfigValueId = string;
/**
 * Possible values for a session configuration option.
 */
export type SessionConfigSelectOptions = Array<SessionConfigSelectOption> | Array<SessionConfigSelectGroup>;
/**
 * A possible value for a session configuration option.
 */
export type SessionConfigSelectOption = {
    /**
     * Unique identifier for this option value.
     */
    value: SessionConfigValueId;
    /**
     * Human-readable label for this option value.
     */
    name: string;
    /**
     * Optional description for this option value.
     */
    description?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A group of possible values for a session configuration option.
 */
export type SessionConfigSelectGroup = {
    /**
     * Unique identifier for this group.
     */
    group: SessionConfigGroupId;
    /**
     * Human-readable label for this group.
     */
    name: string;
    /**
     * The set of option values in this group.
     */
    options: Array<SessionConfigSelectOption>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Unique identifier for a session configuration option value group.
 */
export type SessionConfigGroupId = string;
/**
 * A single-value selector (dropdown) session configuration option payload.
 */
export type SessionConfigSelect = {
    /**
     * The currently selected value.
     */
    currentValue: SessionConfigValueId;
    /**
     * The set of selectable options.
     */
    options: SessionConfigSelectOptions;
};
/**
 * A boolean on/off toggle session configuration option payload.
 */
export type SessionConfigBoolean = {
    /**
     * The current value of the boolean option.
     */
    currentValue: boolean;
};
/**
 * Response from loading an existing session.
 */
export type LoadSessionResponse = {
    /**
     * Initial mode state if supported by the Agent
     *
     * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
     */
    modes?: SessionModeState | null;
    /**
     * Initial session configuration options if supported by the Agent.
     */
    configOptions?: Array<SessionConfigOption> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from listing sessions.
 */
export type ListSessionsResponse = {
    /**
     * Array of session information objects
     */
    sessions: Array<SessionInfo>;
    /**
     * Opaque cursor token. If present, pass this in the next request's cursor parameter
     * to fetch the next page. If absent, there are no more results.
     */
    nextCursor?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Information about a session returned by session/list
 */
export type SessionInfo = {
    /**
     * Unique identifier for the session
     */
    sessionId: SessionId;
    /**
     * The working directory for this session. Must be an absolute path.
     */
    cwd: string;
    /**
     * Additional workspace roots reported for this session. Each path must be absolute.
     *
     * When present, this is the complete ordered additional-root list reported
     * by the Agent. Omitted and empty values are equivalent: the response
     * reports no additional roots.
     */
    additionalDirectories?: Array<string>;
    /**
     * Human-readable title for the session
     */
    title?: string | null;
    /**
     * ISO 8601 timestamp of last activity
     */
    updatedAt?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from deleting a session.
 */
export type DeleteSessionResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response from forking an existing session.
 *
 * @experimental
 */
export type ForkSessionResponse = {
    /**
     * Unique identifier for the newly created forked session.
     */
    sessionId: SessionId;
    /**
     * Initial mode state if supported by the Agent
     *
     * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
     */
    modes?: SessionModeState | null;
    /**
     * Initial session configuration options if supported by the Agent.
     */
    configOptions?: Array<SessionConfigOption> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from resuming an existing session.
 */
export type ResumeSessionResponse = {
    /**
     * Initial mode state if supported by the Agent
     *
     * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
     */
    modes?: SessionModeState | null;
    /**
     * Initial session configuration options if supported by the Agent.
     */
    configOptions?: Array<SessionConfigOption> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from closing a session.
 */
export type CloseSessionResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to `session/set_mode` method.
 */
export type SetSessionModeResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to `session/set_config_option` method.
 */
export type SetSessionConfigOptionResponse = {
    /**
     * The full set of configuration options and their current values.
     */
    configOptions: Array<SessionConfigOption>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from processing a user prompt.
 *
 * See protocol docs: [Check for Completion](https://agentclientprotocol.com/protocol/prompt-turn#4-check-for-completion)
 */
export type PromptResponse = {
    /**
     * Indicates why the agent stopped processing the turn.
     */
    stopReason: StopReason;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Token usage for this turn (optional).
     *
     * @experimental
     */
    usage?: Usage | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Reasons why an agent stops processing a prompt turn.
 *
 * See protocol docs: [Stop Reasons](https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons)
 */
export type StopReason = "end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled";
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Token usage information for a prompt turn.
 *
 * @experimental
 */
export type Usage = {
    /**
     * Sum of all token types across session.
     */
    totalTokens: number;
    /**
     * Total input tokens across all turns.
     */
    inputTokens: number;
    /**
     * Total output tokens across all turns.
     */
    outputTokens: number;
    /**
     * Total thought/reasoning tokens
     */
    thoughtTokens?: number | null;
    /**
     * Total cache read tokens.
     */
    cachedReadTokens?: number | null;
    /**
     * Total cache write tokens.
     */
    cachedWriteTokens?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to `nes/start`.
 */
export type StartNesResponse = {
    /**
     * The session ID for the newly started NES session.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to `nes/suggest`.
 */
export type SuggestNesResponse = {
    /**
     * The list of suggestions.
     */
    suggestions: Array<NesSuggestion>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A suggestion returned by the agent.
 */
export type NesSuggestion = (NesEditSuggestion & {
    kind: "edit";
}) | (NesJumpSuggestion & {
    kind: "jump";
}) | (NesRenameSuggestion & {
    kind: "rename";
}) | (NesSearchAndReplaceSuggestion & {
    kind: "searchAndReplace";
});
/**
 * Unique identifier for a next edit suggestion.
 */
export type NesSuggestionId = string;
/**
 * A text edit within a suggestion.
 */
export type NesTextEdit = {
    /**
     * The range to replace.
     */
    range: Range;
    /**
     * The replacement text.
     */
    newText: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A range in a text document, expressed as start and end positions.
 */
export type Range = {
    /**
     * The start position (inclusive).
     */
    start: Position;
    /**
     * The end position (exclusive).
     */
    end: Position;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A zero-based position in a text document.
 *
 * The meaning of `character` depends on the negotiated position encoding.
 */
export type Position = {
    /**
     * Zero-based line number.
     */
    line: number;
    /**
     * Zero-based character offset (encoding-dependent).
     */
    character: number;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A text edit suggestion.
 */
export type NesEditSuggestion = {
    /**
     * Unique identifier for accept/reject tracking.
     */
    id: NesSuggestionId;
    /**
     * The URI of the file to edit.
     */
    uri: string;
    /**
     * The text edits to apply.
     */
    edits: Array<NesTextEdit>;
    /**
     * Optional suggested cursor position after applying edits.
     */
    cursorPosition?: Position | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A jump-to-location suggestion.
 */
export type NesJumpSuggestion = {
    /**
     * Unique identifier for accept/reject tracking.
     */
    id: NesSuggestionId;
    /**
     * The file to navigate to.
     */
    uri: string;
    /**
     * The target position within the file.
     */
    position: Position;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A rename symbol suggestion.
 */
export type NesRenameSuggestion = {
    /**
     * Unique identifier for accept/reject tracking.
     */
    id: NesSuggestionId;
    /**
     * The file URI containing the symbol.
     */
    uri: string;
    /**
     * The position of the symbol to rename.
     */
    position: Position;
    /**
     * The new name for the symbol.
     */
    newName: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A search-and-replace suggestion.
 */
export type NesSearchAndReplaceSuggestion = {
    /**
     * Unique identifier for accept/reject tracking.
     */
    id: NesSuggestionId;
    /**
     * The file URI to search within.
     */
    uri: string;
    /**
     * The text or pattern to find.
     */
    search: string;
    /**
     * The replacement text.
     */
    replace: string;
    /**
     * Whether `search` is a regular expression. Defaults to `false`.
     */
    isRegex?: boolean | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from closing an NES session.
 */
export type CloseNesResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Allows for sending an arbitrary response to an [`ExtRequest`] that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export type ExtResponse = unknown;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/message`.
 *
 * This is the inner MCP response result payload. Any JSON value is valid.
 *
 * @experimental
 */
export type MessageMcpResponse = unknown;
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
export type Error = {
    /**
     * A number indicating the error type that occurred.
     * This must be an integer as defined in the JSON-RPC specification.
     */
    code: ErrorCode;
    /**
     * A string providing a short description of the error.
     * The message should be limited to a concise single sentence.
     */
    message: string;
    /**
     * Optional primitive or structured value that contains additional information about the error.
     * This may include debugging information or context-specific details.
     */
    data?: unknown;
};
/**
 * Predefined error codes for common JSON-RPC and ACP-specific errors.
 *
 * These codes follow the JSON-RPC 2.0 specification for standard errors
 * and use the reserved range (-32000 to -32099) for protocol-specific errors.
 */
export type ErrorCode = -32700 | -32600 | -32601 | -32602 | -32603 | -32800 | -32000 | -32002 | number;
/**
 * A JSON-RPC notification object.
 */
export type AgentNotification = {
    /**
     * The notification method name.
     */
    method: string;
    /**
     * Method-specific notification parameters.
     */
    params?: SessionNotification | CompleteElicitationNotification | MessageMcpNotification | ExtNotification | null;
};
/**
 * Notification containing a session update from the agent.
 *
 * Used to stream real-time progress and results during prompt processing.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export type SessionNotification = {
    /**
     * The ID of the session this update pertains to.
     */
    sessionId: SessionId;
    /**
     * The actual update content.
     */
    update: SessionUpdate;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Different types of updates that can be sent during session processing.
 *
 * These updates provide real-time feedback about the agent's progress.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export type SessionUpdate = (ContentChunk & {
    sessionUpdate: "user_message_chunk";
}) | (ContentChunk & {
    sessionUpdate: "agent_message_chunk";
}) | (ContentChunk & {
    sessionUpdate: "agent_thought_chunk";
}) | (ToolCall & {
    sessionUpdate: "tool_call";
}) | (ToolCallUpdate & {
    sessionUpdate: "tool_call_update";
}) | (Plan & {
    sessionUpdate: "plan";
}) | (PlanUpdate & {
    sessionUpdate: "plan_update";
}) | (PlanRemoved & {
    sessionUpdate: "plan_removed";
}) | (AvailableCommandsUpdate & {
    sessionUpdate: "available_commands_update";
}) | (CurrentModeUpdate & {
    sessionUpdate: "current_mode_update";
}) | (ConfigOptionUpdate & {
    sessionUpdate: "config_option_update";
}) | (SessionInfoUpdate & {
    sessionUpdate: "session_info_update";
}) | (UsageUpdate & {
    sessionUpdate: "usage_update";
}) | (CompactionUpdate & {
    sessionUpdate: "compaction_update";
}) | (CompactionSummaryChunk & {
    sessionUpdate: "compaction_summary_chunk";
});
/**
 * Unique identifier for a message within a session.
 */
export type MessageId = string;
/**
 * A streamed item of content
 */
export type ContentChunk = {
    /**
     * A single item of content
     */
    content: ContentBlock;
    /**
     * A unique identifier for the message this chunk belongs to.
     *
     * All chunks belonging to the same message share the same `messageId`.
     * A change in `messageId` indicates a new message has started.
     */
    messageId?: MessageId | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Represents a tool call that the language model has requested.
 *
 * Tool calls are actions that the agent executes on behalf of the language model,
 * such as reading files, executing code, or fetching data from external sources.
 *
 * See protocol docs: [Tool Calls](https://agentclientprotocol.com/protocol/tool-calls)
 */
export type ToolCall = {
    /**
     * Unique identifier for this tool call within the session.
     */
    toolCallId: ToolCallId;
    /**
     * Human-readable title describing what the tool is doing.
     */
    title: string;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Programmatic name of the tool being invoked.
     *
     * This field is optional. Omitting it or sending `null` both mean that no
     * tool name is available.
     *
     * @experimental
     */
    name?: string | null;
    /**
     * The category of tool being invoked.
     * Helps clients choose appropriate icons and UI treatment.
     */
    kind?: ToolKind;
    /**
     * Current execution status of the tool call.
     */
    status?: ToolCallStatus;
    /**
     * Content produced by the tool call.
     */
    content?: Array<ToolCallContent>;
    /**
     * File locations affected by this tool call.
     * Enables "follow-along" features in clients.
     */
    locations?: Array<ToolCallLocation>;
    /**
     * Raw input parameters sent to the tool.
     */
    rawInput?: unknown;
    /**
     * Raw output returned by the tool.
     */
    rawOutput?: unknown;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A single entry in the execution plan.
 *
 * Represents a task or goal that the assistant intends to accomplish
 * as part of fulfilling the user's request.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export type PlanEntry = {
    /**
     * Human-readable description of what this task aims to accomplish.
     */
    content: string;
    /**
     * The relative importance of this task.
     * Used to indicate which tasks are most critical to the overall goal.
     */
    priority: PlanEntryPriority;
    /**
     * Current execution status of this task.
     */
    status: PlanEntryStatus;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Priority levels for plan entries.
 *
 * Used to indicate the relative importance or urgency of different
 * tasks in the execution plan.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export type PlanEntryPriority = "high" | "medium" | "low";
/**
 * Status of a plan entry in the execution flow.
 *
 * Tracks the lifecycle of each task from planning through completion.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export type PlanEntryStatus = "pending" | "in_progress" | "completed";
/**
 * An execution plan for accomplishing complex tasks.
 *
 * Plans consist of multiple entries representing individual tasks or goals.
 * Agents report plans to clients to provide visibility into their execution strategy.
 * Plans can evolve during execution as the agent discovers new requirements or completes tasks.
 *
 * See protocol docs: [Agent Plan](https://agentclientprotocol.com/protocol/agent-plan)
 */
export type Plan = {
    /**
     * The list of tasks to be accomplished.
     *
     * When updating a plan, the agent must send a complete list of all entries
     * with their current status. The client replaces the entire plan with each update.
     */
    entries: Array<PlanEntry>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Updated content for a plan.
 *
 * @experimental
 */
export type PlanUpdateContent = (PlanItems & {
    type: "items";
}) | (PlanFile & {
    type: "file";
}) | (PlanMarkdown & {
    type: "markdown";
});
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a plan within a session.
 *
 * @experimental
 */
export type PlanId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented as structured entries.
 *
 * @experimental
 */
export type PlanItems = {
    /**
     * The plan ID to update.
     */
    planId: PlanId;
    /**
     * The list of tasks to be accomplished.
     *
     * When updating an item-based plan, the agent must send a complete list of all entries
     * with their current status. The client replaces that plan with each update.
     */
    entries: Array<PlanEntry>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented by a file URI.
 *
 * @experimental
 */
export type PlanFile = {
    /**
     * The plan ID to update.
     */
    planId: PlanId;
    /**
     * The URI of the file containing the plan.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented as raw markdown content.
 *
 * @experimental
 */
export type PlanMarkdown = {
    /**
     * The plan ID to update.
     */
    planId: PlanId;
    /**
     * Markdown content for the plan.
     */
    content: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A content update for a plan identified by ID.
 *
 * @experimental
 */
export type PlanUpdate = {
    /**
     * The updated plan content.
     */
    plan: PlanUpdateContent;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Removal notice for a plan identified by ID.
 *
 * @experimental
 */
export type PlanRemoved = {
    /**
     * The plan ID to remove.
     */
    planId: PlanId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Information about a command.
 */
export type AvailableCommand = {
    /**
     * Command name (e.g., `create_plan`, `research_codebase`).
     */
    name: string;
    /**
     * Human-readable description of what the command does.
     */
    description: string;
    /**
     * Input for the command if required
     */
    input?: AvailableCommandInput | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * unstructured
 *
 * All text that was typed after the command name is provided as input.
 */
export type AvailableCommandInput = UnstructuredCommandInput;
/**
 * All text that was typed after the command name is provided as input.
 */
export type UnstructuredCommandInput = {
    /**
     * A hint to display when the input hasn't been provided yet
     */
    hint: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Available commands are ready or have changed
 */
export type AvailableCommandsUpdate = {
    /**
     * Commands the agent can execute
     */
    availableCommands: Array<AvailableCommand>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The current mode of the session has changed
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export type CurrentModeUpdate = {
    /**
     * The ID of the current mode
     */
    currentModeId: SessionModeId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Session configuration options have been updated.
 */
export type ConfigOptionUpdate = {
    /**
     * The full set of configuration options and their current values.
     */
    configOptions: Array<SessionConfigOption>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Update to session metadata. All fields are optional to support partial updates.
 *
 * Agents send this notification to update session information like title or custom metadata.
 * This allows clients to display dynamic session names and track session state changes.
 */
export type SessionInfoUpdate = {
    /**
     * Human-readable title for the session. Set to null to clear.
     */
    title?: string | null;
    /**
     * ISO 8601 timestamp of last activity. Set to null to clear.
     */
    updatedAt?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Cost information for a session.
 */
export type Cost = {
    /**
     * Total cumulative cost for session.
     */
    amount: number;
    /**
     * ISO 4217 currency code (e.g., "USD", "EUR").
     */
    currency: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Context window and cost update for a session.
 */
export type UsageUpdate = {
    /**
     * Tokens currently in context.
     */
    used: number;
    /**
     * Total context window size in tokens.
     */
    size: number;
    /**
     * Cumulative session cost (optional).
     */
    cost?: Cost | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a context compaction within a session.
 *
 * @experimental
 */
export type CompactionId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Lifecycle state of a context compaction.
 *
 * @experimental
 */
export type CompactionStatus = "in_progress" | "completed" | "failed" | "cancelled" | string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A context compaction upsert. The first update fixes the compaction's
 * timeline position. Later updates with the same ID patch that entity in place.
 * Agents MUST only send this update when the Client advertised
 * [`ClientSessionCapabilities::compaction`].
 *
 * `summary`, `error`, and `_meta` have patch semantics: omission leaves the
 * stored value unchanged, `null` clears it, and a concrete value replaces it.
 * `summary: []` also clears the retained summary. A non-empty summary is only
 * valid with `completed`; `error` is only valid with `failed`.
 *
 * @experimental
 */
export type CompactionUpdate = {
    /**
     * The Agent-owned ID of this compaction, unique within the session.
     */
    compactionId: CompactionId;
    /**
     * Current lifecycle status.
     */
    status: CompactionStatus;
    /**
     * Complete replacement user-displayable summary retained by the compaction.
     */
    summary?: Array<ContentBlock> | null;
    /**
     * Human-readable description of why the compaction failed.
     */
    error?: string | null;
    /**
     * Extensible metadata patch for this compaction.
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A content block appended to the retained summary of an in-progress
 * compaction. Agents send chunks only after an `in_progress` update and before
 * the terminal update for the same ID. Agents MUST only send this update when
 * the Client advertised [`ClientSessionCapabilities::compaction`].
 *
 * @experimental
 */
export type CompactionSummaryChunk = {
    /**
     * ID of the compaction whose summary receives this content.
     */
    compactionId: CompactionId;
    /**
     * One content block to append.
     */
    content: ContentBlock;
    /**
     * Metadata scoped to this chunk. Omission and `null` both mean absent.
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent by the agent when a URL-based elicitation is complete.
 */
export type CompleteElicitationNotification = {
    /**
     * The ID of the elicitation that completed.
     */
    elicitationId: ElicitationId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Notification parameters for `mcp/message`.
 *
 * This is used when the wrapped MCP message is a notification and the outer JSON-RPC
 * envelope has no `id`.
 *
 * @experimental
 */
export type MessageMcpNotification = {
    /**
     * The MCP-over-ACP connection this message is sent on.
     */
    connectionId: McpConnectionId;
    /**
     * The inner MCP method name.
     */
    method: string;
    /**
     * Optional inner MCP params.
     *
     * If omitted or set to `null`, the inner MCP message has no params.
     */
    params?: {
        [key: string]: unknown;
    } | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export type ExtNotification = unknown;
/**
 * A JSON-RPC request object.
 */
export type ClientRequest = {
    /**
     * The request id used to correlate the matching response.
     */
    id: RequestId;
    /**
     * The method name to invoke.
     */
    method: string;
    /**
     * Method-specific request parameters.
     */
    params?: InitializeRequest | AuthenticateRequest | ListProvidersRequest | SetProviderRequest | DisableProviderRequest | LogoutRequest | NewSessionRequest | LoadSessionRequest | ListSessionsRequest | DeleteSessionRequest | ForkSessionRequest | ResumeSessionRequest | CloseSessionRequest | SetSessionModeRequest | SetSessionConfigOptionRequest | PromptRequest | StartNesRequest | SuggestNesRequest | CloseNesRequest | MessageMcpRequest | ExtRequest | null;
};
/**
 * Request parameters for the initialize method.
 *
 * Sent by the client to establish connection and negotiate capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export type InitializeRequest = {
    /**
     * The latest protocol version supported by the client.
     */
    protocolVersion: ProtocolVersion;
    /**
     * Capabilities supported by the client.
     */
    clientCapabilities?: ClientCapabilities;
    /**
     * Information about the Client name and version sent to the Agent.
     *
     * Note: in future versions of the protocol, this will be required.
     */
    clientInfo?: Implementation | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent about
 * available features and methods.
 *
 * See protocol docs: [Client Capabilities](https://agentclientprotocol.com/protocol/initialization#client-capabilities)
 */
export type ClientCapabilities = {
    /**
     * File system capabilities supported by the client.
     * Determines which file operations the agent can request.
     */
    fs?: FileSystemCapabilities;
    /**
     * Whether the Client support all `terminal*` methods.
     */
    terminal?: boolean;
    /**
     * Session-related capabilities supported by the client.
     *
     * Optional. Omitted or `null` both mean the client does not advertise any
     * session-related extensions.
     */
    session?: ClientSessionCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Whether the client supports `plan_update` and `plan_removed` session updates.
     *
     * Optional. Omitted or `null` both mean the client does not advertise support.
     * Supplying `{}` means the client can receive both update types.
     *
     * @experimental
     */
    plan?: PlanCapabilities | null;
    /**
     * Authentication capabilities supported by the client.
     * Determines which authentication method types the agent may include
     * in its `InitializeResponse`.
     */
    auth?: AuthCapabilities;
    /**
     * Elicitation capabilities supported by the client.
     * Determines which elicitation modes the agent may use.
     *
     * Optional. Omitted or `null` both mean the client does not advertise
     * elicitation support.
     */
    elicitation?: ElicitationCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * NES (Next Edit Suggestions) capabilities supported by the client.
     *
     * Optional. Omitted or `null` both mean the client does not advertise any
     * NES suggestion-kind extensions.
     *
     * @experimental
     */
    nes?: ClientNesCapabilities | null;
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * The position encodings supported by the client, in order of preference.
     *
     * @experimental
     */
    positionEncodings?: Array<PositionEncodingKind>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * File system capabilities that a client may support.
 *
 * See protocol docs: [FileSystem](https://agentclientprotocol.com/protocol/initialization#filesystem)
 */
export type FileSystemCapabilities = {
    /**
     * Whether the Client supports `fs/read_text_file` requests.
     */
    readTextFile?: boolean;
    /**
     * Whether the Client supports `fs/write_text_file` requests.
     */
    writeTextFile?: boolean;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Session-related capabilities supported by the client.
 */
export type ClientSessionCapabilities = {
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Support for ID-addressed context compaction updates. Omitted or `null`
     * means unsupported; `{}` advertises the complete compaction contract.
     *
     * @experimental
     */
    compaction?: CompactionCapabilities | null;
    /**
     * Config option capabilities supported by the client.
     *
     * Omitted or `null` both mean the client does not advertise support for any
     * config option extensions.
     */
    configOptions?: SessionConfigOptionsCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Client support for ID-addressed context compaction updates.
 *
 * @experimental
 */
export type CompactionCapabilities = {
    [key: string]: unknown;
};
/**
 * Session configuration option capabilities supported by the client.
 */
export type SessionConfigOptionsCapabilities = {
    /**
     * Whether the client supports boolean session configuration options.
     *
     * Optional. Omitted or `null` both mean the client does not advertise support.
     * Supplying `{}` means agents may include `type: "boolean"` entries in
     * `configOptions`, and the client may send `session/set_config_option`
     * requests with `type: "boolean"` and a boolean `value`.
     */
    boolean?: BooleanConfigOptionCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Capabilities for boolean session configuration options.
 *
 * Supplying `{}` means the client supports boolean session configuration options.
 */
export type BooleanConfigOptionCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Capabilities for receiving `plan_update` and `plan_removed` session updates.
 *
 * @experimental
 */
export type PlanCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Authentication capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent which authentication
 * method types the client can handle. This governs opt-in types that require
 * additional client-side support.
 */
export type AuthCapabilities = {
    /**
     * Whether the client supports `terminal` authentication methods.
     *
     * The client should set this to `true` only when it can reproduce the
     * configured agent invocation in an interactive terminal. When `true`, the
     * agent may include `terminal` entries in its authentication methods.
     */
    terminal?: boolean;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Elicitation capabilities supported by the client.
 */
export type ElicitationCapabilities = {
    /**
     * Whether the client supports form-based elicitation.
     *
     * Optional. Omitted and `null` are equivalent and mean form support is not advertised.
     * Supplying `{}` explicitly advertises form support.
     */
    form?: ElicitationFormCapabilities | null;
    /**
     * Whether the client supports URL-based elicitation.
     *
     * Optional. Omitted or `null` both mean the client does not advertise support.
     * Supplying `{}` means the client supports URL-based elicitation.
     */
    url?: ElicitationUrlCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Form-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports form-based elicitation.
 */
export type ElicitationFormCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * URL-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports URL-based elicitation.
 */
export type ElicitationUrlCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * NES capabilities advertised by the client during initialization.
 */
export type ClientNesCapabilities = {
    /**
     * Whether the client supports the `jump` suggestion kind.
     */
    jump?: NesJumpCapabilities | null;
    /**
     * Whether the client supports the `rename` suggestion kind.
     */
    rename?: NesRenameCapabilities | null;
    /**
     * Whether the client supports the `searchAndReplace` suggestion kind.
     */
    searchAndReplace?: NesSearchAndReplaceCapabilities | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for jump suggestion support.
 */
export type NesJumpCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for rename suggestion support.
 */
export type NesRenameCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Marker for search and replace suggestion support.
 */
export type NesSearchAndReplaceCapabilities = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for the authenticate method.
 *
 * Specifies which authentication method to use.
 */
export type AuthenticateRequest = {
    /**
     * The ID of the authentication method to use.
     * Must be one of the methods advertised in the initialize response.
     */
    methodId: AuthMethodId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/list`.
 *
 * @experimental
 */
export type ListProvidersRequest = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/set`.
 *
 * Replaces the full configuration for one provider ID.
 *
 * @experimental
 */
export type SetProviderRequest = {
    /**
     * Provider ID to configure.
     */
    providerId: ProviderId;
    /**
     * Protocol type for this provider.
     */
    apiType: LlmProtocol;
    /**
     * Base URL for requests sent through this provider.
     */
    baseUrl: string;
    /**
     * Full headers map for this provider.
     * May include authorization, routing, or other integration-specific headers.
     */
    headers?: {
        [key: string]: string;
    };
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/disable`.
 *
 * @experimental
 */
export type DisableProviderRequest = {
    /**
     * Provider ID to disable.
     */
    providerId: ProviderId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for the logout method.
 *
 * Terminates the current authenticated session.
 */
export type LogoutRequest = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export type NewSessionRequest = {
    /**
     * The working directory for this session. Must be an absolute path.
     */
    cwd: string;
    /**
     * Additional workspace roots for this session. Each path must be absolute.
     *
     * These expand the session's filesystem scope without changing `cwd`, which
     * remains the base for relative paths. When omitted or empty, no
     * additional roots are activated for the new session.
     */
    additionalDirectories?: Array<string>;
    /**
     * List of MCP (Model Context Protocol) servers the agent should connect to.
     */
    mcpServers: Array<McpServer>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Configuration for connecting to an MCP (Model Context Protocol) server.
 *
 * MCP servers provide tools and context that the agent can use when
 * processing prompts.
 *
 * See protocol docs: [MCP Servers](https://agentclientprotocol.com/protocol/session-setup#mcp-servers)
 */
export type McpServer = (McpServerHttp & {
    type: "http";
}) | (McpServerSse & {
    type: "sse";
}) | (McpServerAcp & {
    type: "acp";
}) | McpServerStdio;
/**
 * An HTTP header to set when making requests to the MCP server.
 */
export type HttpHeader = {
    /**
     * The name of the HTTP header.
     */
    name: string;
    /**
     * The value to set for the HTTP header.
     */
    value: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * HTTP transport configuration for MCP.
 */
export type McpServerHttp = {
    /**
     * Human-readable name identifying this MCP server.
     */
    name: string;
    /**
     * URL to the MCP server.
     */
    url: string;
    /**
     * HTTP headers to set when making requests to the MCP server.
     */
    headers: Array<HttpHeader>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * SSE transport configuration for MCP.
 */
export type McpServerSse = {
    /**
     * Human-readable name identifying this MCP server.
     */
    name: string;
    /**
     * URL to the MCP server.
     */
    url: string;
    /**
     * HTTP headers to set when making requests to the MCP server.
     */
    headers: Array<HttpHeader>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * ACP transport configuration for MCP.
 *
 * The MCP server is provided by an ACP component and communicates over the ACP channel
 * using `mcp/connect`, `mcp/message`, and `mcp/disconnect`.
 *
 * @experimental
 */
export type McpServerAcp = {
    /**
     * Human-readable name identifying this MCP server.
     */
    name: string;
    /**
     * Unique identifier for this MCP server, generated by the component providing it.
     *
     * Providers MUST NOT reuse an ID for multiple ACP-transport MCP servers that are visible
     * on the same ACP connection.
     */
    serverId: McpServerAcpId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Stdio transport configuration for MCP.
 */
export type McpServerStdio = {
    /**
     * Human-readable name identifying this MCP server.
     */
    name: string;
    /**
     * Absolute path to the MCP server executable.
     */
    command: string;
    /**
     * Command-line arguments to pass to the MCP server.
     */
    args: Array<string>;
    /**
     * Environment variables to set when launching the MCP server.
     */
    env: Array<EnvVariable>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for loading an existing session.
 *
 * Only available if the Agent supports the `loadSession` capability.
 *
 * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
 */
export type LoadSessionRequest = {
    /**
     * List of MCP servers to connect to for this session.
     */
    mcpServers: Array<McpServer>;
    /**
     * The working directory for this session. Must be an absolute path.
     */
    cwd: string;
    /**
     * Additional workspace roots to activate for this session. Each path must be absolute.
     *
     * When omitted or empty, no additional roots are activated. When non-empty,
     * this is the complete resulting additional-root list for the loaded
     * session. It may differ from any previously used or reported list as long as
     * the request `cwd` matches the session's `cwd`.
     */
    additionalDirectories?: Array<string>;
    /**
     * The ID of the session to load.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for listing existing sessions.
 *
 * Only available if the Agent supports the `sessionCapabilities.list` capability.
 */
export type ListSessionsRequest = {
    /**
     * Filter sessions by working directory. Must be an absolute path.
     */
    cwd?: string | null;
    /**
     * Opaque cursor token from a previous response's nextCursor field for cursor-based pagination
     */
    cursor?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for deleting an existing session from `session/list`.
 *
 * Only available if the Agent supports the `sessionCapabilities.delete` capability.
 */
export type DeleteSessionRequest = {
    /**
     * The ID of the session to delete.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for forking an existing session.
 *
 * Creates a new session based on the context of an existing one, allowing
 * operations like generating summaries without affecting the original session's history.
 *
 * Only available if the Agent supports the `session.fork` capability.
 *
 * @experimental
 */
export type ForkSessionRequest = {
    /**
     * The ID of the session to fork.
     */
    sessionId: SessionId;
    /**
     * The working directory for this session. Must be an absolute path.
     */
    cwd: string;
    /**
     * Additional workspace roots to activate for this session. Each path must be absolute.
     *
     * When omitted or empty, no additional roots are activated. When non-empty,
     * this is the complete resulting additional-root list for the forked
     * session.
     */
    additionalDirectories?: Array<string>;
    /**
     * List of MCP servers to connect to for this session.
     */
    mcpServers?: Array<McpServer>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for resuming an existing session.
 *
 * Resumes an existing session without returning previous messages (unlike `session/load`).
 * This is useful for agents that can resume sessions but don't implement full session loading.
 *
 * Only available if the Agent supports the `sessionCapabilities.resume` capability.
 */
export type ResumeSessionRequest = {
    /**
     * The ID of the session to resume.
     */
    sessionId: SessionId;
    /**
     * The working directory for this session. Must be an absolute path.
     */
    cwd: string;
    /**
     * Additional workspace roots to activate for this session. Each path must be absolute.
     *
     * When omitted or empty, no additional roots are activated. When non-empty,
     * this is the complete resulting additional-root list for the resumed
     * session. It may differ from any previously used or reported list as long as
     * the request `cwd` matches the session's `cwd`.
     */
    additionalDirectories?: Array<string>;
    /**
     * List of MCP servers to connect to for this session.
     */
    mcpServers?: Array<McpServer>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for closing an active session.
 *
 * If supported, the agent **must** cancel any ongoing work related to the session
 * (treat it as if `session/cancel` was called) and then free up any resources
 * associated with the session.
 *
 * Only available if the Agent supports the `sessionCapabilities.close` capability.
 */
export type CloseSessionRequest = {
    /**
     * The ID of the session to close.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for setting a session mode.
 */
export type SetSessionModeRequest = {
    /**
     * The ID of the session to set the mode for.
     */
    sessionId: SessionId;
    /**
     * The ID of the mode to set.
     */
    modeId: SessionModeId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for setting a session configuration option.
 */
export type SetSessionConfigOptionRequest = ({
    /**
     * The boolean value.
     */
    value: boolean;
    type: "boolean";
} | {
    /**
     * The value ID.
     */
    value: SessionConfigValueId;
}) & {
    /**
     * The ID of the session to set the configuration option for.
     */
    sessionId: SessionId;
    /**
     * The ID of the configuration option to set.
     */
    configId: SessionConfigId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request parameters for sending a user prompt to the agent.
 *
 * Contains the user's message and any additional context.
 *
 * See protocol docs: [User Message](https://agentclientprotocol.com/protocol/prompt-turn#1-user-message)
 */
export type PromptRequest = {
    /**
     * The ID of the session to send this user message to
     */
    sessionId: SessionId;
    /**
     * The blocks of content that compose the user's message.
     *
     * As a baseline, the Agent MUST support [`ContentBlock::Text`] and [`ContentBlock::ResourceLink`],
     * while other variants are optionally enabled via [`PromptCapabilities`].
     *
     * The Client MUST adapt its interface according to [`PromptCapabilities`].
     *
     * The client MAY include referenced pieces of context as either
     * [`ContentBlock::Resource`] or [`ContentBlock::ResourceLink`].
     *
     * When available, [`ContentBlock::Resource`] is preferred
     * as it avoids extra round-trips and allows the message to include
     * pieces of context from sources the agent may not have access to.
     */
    prompt: Array<ContentBlock>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request to start an NES session.
 */
export type StartNesRequest = {
    /**
     * The root URI of the workspace.
     */
    workspaceUri?: string | null;
    /**
     * The workspace folders.
     */
    workspaceFolders?: Array<WorkspaceFolder> | null;
    /**
     * Repository metadata, if the workspace is a git repository.
     */
    repository?: NesRepository | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A workspace folder.
 */
export type WorkspaceFolder = {
    /**
     * The URI of the folder.
     */
    uri: string;
    /**
     * The display name of the folder.
     */
    name: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Repository metadata for an NES session.
 */
export type NesRepository = {
    /**
     * The repository name.
     */
    name: string;
    /**
     * The repository owner.
     */
    owner: string;
    /**
     * The remote URL of the repository.
     */
    remoteUrl: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Request for a code suggestion.
 */
export type SuggestNesRequest = {
    /**
     * The session ID for this request.
     */
    sessionId: SessionId;
    /**
     * The URI of the document to suggest for.
     */
    uri: string;
    /**
     * The version number of the document.
     */
    version: number;
    /**
     * The current cursor position.
     */
    position: Position;
    /**
     * The current text selection range, if any.
     */
    selection?: Range | null;
    /**
     * What triggered this suggestion request.
     */
    triggerKind: NesTriggerKind;
    /**
     * Context for the suggestion, included based on agent capabilities.
     */
    context?: NesSuggestContext | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * What triggered the suggestion request.
 */
export type NesTriggerKind = "automatic" | "diagnostic" | "manual";
/**
 * Context attached to a suggestion request.
 */
export type NesSuggestContext = {
    /**
     * Recently accessed files.
     */
    recentFiles?: Array<NesRecentFile> | null;
    /**
     * Related code snippets.
     */
    relatedSnippets?: Array<NesRelatedSnippet> | null;
    /**
     * Recent edit history.
     */
    editHistory?: Array<NesEditHistoryEntry> | null;
    /**
     * Recent user actions (typing, navigation, etc.).
     */
    userActions?: Array<NesUserAction> | null;
    /**
     * Currently open files in the editor.
     */
    openFiles?: Array<NesOpenFile> | null;
    /**
     * Current diagnostics (errors, warnings).
     */
    diagnostics?: Array<NesDiagnostic> | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A recently accessed file.
 */
export type NesRecentFile = {
    /**
     * The URI of the file.
     */
    uri: string;
    /**
     * The language identifier.
     */
    languageId: string;
    /**
     * The full text content of the file.
     */
    text: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A related code snippet from a file.
 */
export type NesRelatedSnippet = {
    /**
     * The URI of the file containing the snippets.
     */
    uri: string;
    /**
     * The code excerpts.
     */
    excerpts: Array<NesExcerpt>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A code excerpt from a file.
 */
export type NesExcerpt = {
    /**
     * The start line of the excerpt (zero-based).
     */
    startLine: number;
    /**
     * The end line of the excerpt (zero-based).
     */
    endLine: number;
    /**
     * The text content of the excerpt.
     */
    text: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An entry in the edit history.
 */
export type NesEditHistoryEntry = {
    /**
     * The URI of the edited file.
     */
    uri: string;
    /**
     * A diff representing the edit.
     */
    diff: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A user action (typing, cursor movement, etc.).
 */
export type NesUserAction = {
    /**
     * The kind of action (e.g., "insertChar", "cursorMovement").
     */
    action: string;
    /**
     * The URI of the file where the action occurred.
     */
    uri: string;
    /**
     * The position where the action occurred.
     */
    position: Position;
    /**
     * Timestamp in milliseconds since epoch.
     */
    timestampMs: number;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * An open file in the editor.
 */
export type NesOpenFile = {
    /**
     * The URI of the file.
     */
    uri: string;
    /**
     * The language identifier.
     */
    languageId: string;
    /**
     * The visible range in the editor, if any.
     */
    visibleRange?: Range | null;
    /**
     * Timestamp in milliseconds since epoch of when the file was last focused.
     */
    lastFocusedMs?: number | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A diagnostic (error, warning, etc.).
 */
export type NesDiagnostic = {
    /**
     * The URI of the file containing the diagnostic.
     */
    uri: string;
    /**
     * The range of the diagnostic.
     */
    range: Range;
    /**
     * The severity of the diagnostic.
     */
    severity: NesDiagnosticSeverity;
    /**
     * The diagnostic message.
     */
    message: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Severity of a diagnostic.
 */
export type NesDiagnosticSeverity = "error" | "warning" | "information" | "hint";
/**
 * Request to close an NES session.
 *
 * The agent **must** cancel any ongoing work related to the NES session
 * and then free up any resources associated with the session.
 */
export type CloseNesRequest = {
    /**
     * The ID of the NES session to close.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A JSON-RPC response object.
 */
export type ClientResponse = {
    /**
     * The id of the request this response answers.
     */
    id: RequestId;
    /**
     * Method-specific response data.
     */
    result: WriteTextFileResponse | ReadTextFileResponse | RequestPermissionResponse | CreateTerminalResponse | TerminalOutputResponse | ReleaseTerminalResponse | WaitForTerminalExitResponse | KillTerminalResponse | CreateElicitationResponse | ConnectMcpResponse | DisconnectMcpResponse | MessageMcpResponse | ExtResponse;
} | {
    /**
     * The id of the request this response answers.
     */
    id: RequestId;
    /**
     * Method-specific error data.
     */
    error: Error;
};
/**
 * Response to `fs/write_text_file`
 */
export type WriteTextFileResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response containing the contents of a text file.
 */
export type ReadTextFileResponse = {
    /**
     * Content payload returned by this response.
     */
    content: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to a permission request.
 */
export type RequestPermissionResponse = {
    /**
     * The user's decision on the permission request.
     */
    outcome: RequestPermissionOutcome;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The outcome of a permission request.
 */
export type RequestPermissionOutcome = {
    outcome: "cancelled";
} | (SelectedPermissionOutcome & {
    outcome: "selected";
});
/**
 * The user selected one of the provided options.
 */
export type SelectedPermissionOutcome = {
    /**
     * The ID of the option the user selected.
     */
    optionId: PermissionOptionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response containing the ID of the created terminal.
 */
export type CreateTerminalResponse = {
    /**
     * The unique identifier for the created terminal.
     */
    terminalId: TerminalId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response containing the terminal output and exit status.
 */
export type TerminalOutputResponse = {
    /**
     * The terminal output captured so far.
     */
    output: string;
    /**
     * Whether the output was truncated due to byte limits.
     */
    truncated: boolean;
    /**
     * Exit status if the command has completed.
     */
    exitStatus?: TerminalExitStatus | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Exit status of a terminal command.
 */
export type TerminalExitStatus = {
    /**
     * The process exit code (may be null if terminated by signal).
     */
    exitCode?: number | null;
    /**
     * The signal that terminated the process (may be null if exited normally).
     */
    signal?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to terminal/release method
 */
export type ReleaseTerminalResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response containing the exit status of a terminal command.
 */
export type WaitForTerminalExitResponse = {
    /**
     * The process exit code (may be null if terminated by signal).
     */
    exitCode?: number | null;
    /**
     * The signal that terminated the process (may be null if exited normally).
     */
    signal?: string | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response to `terminal/kill` method
 */
export type KillTerminalResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Response from the client to an elicitation request.
 */
export type CreateElicitationResponse = ((ElicitationAcceptAction & {
    action: "accept";
}) | {
    action: "decline";
} | {
    action: "cancel";
} | {
    /**
     * Custom or future elicitation action.
     *
     * Values beginning with `_` are reserved for implementation-specific
     * extensions. Unknown values that do not begin with `_` are reserved for
     * future ACP variants.
     */
    action: string;
    [key: string]: unknown;
}) & {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * Optional. Omitted and `null` are equivalent and mean no metadata.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Allowed wire representations for [`ElicitationContentValue`].
 */
export type ElicitationContentValue = string | number | number | boolean | Array<string>;
/**
 * The user accepted the elicitation and provided content.
 */
export type ElicitationAcceptAction = {
    /**
     * The user-provided content, if any, as an object matching the requested schema.
     */
    content?: {
        [key: string]: ElicitationContentValue;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/connect`.
 *
 * @experimental
 */
export type ConnectMcpResponse = {
    /**
     * The unique identifier for this MCP-over-ACP connection.
     */
    connectionId: McpConnectionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/disconnect`.
 *
 * @experimental
 */
export type DisconnectMcpResponse = {
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A JSON-RPC notification object.
 */
export type ClientNotification = {
    /**
     * The notification method name.
     */
    method: string;
    /**
     * Method-specific notification parameters.
     */
    params?: CancelNotification | DidOpenDocumentNotification | DidChangeDocumentNotification | DidCloseDocumentNotification | DidSaveDocumentNotification | DidFocusDocumentNotification | AcceptNesNotification | RejectNesNotification | MessageMcpNotification | ExtNotification | null;
};
/**
 * Notification to cancel ongoing operations for a session.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
 */
export type CancelNotification = {
    /**
     * The ID of the session to cancel operations for.
     */
    sessionId: SessionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a file is opened in the editor.
 */
export type DidOpenDocumentNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The URI of the opened document.
     */
    uri: string;
    /**
     * The language identifier of the document (e.g., "rust", "python").
     */
    languageId: string;
    /**
     * The version number of the document.
     */
    version: number;
    /**
     * The full text content of the document.
     */
    text: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a file is edited.
 */
export type DidChangeDocumentNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The URI of the changed document.
     */
    uri: string;
    /**
     * The new version number of the document.
     */
    version: number;
    /**
     * The content changes.
     */
    contentChanges: Array<TextDocumentContentChangeEvent>;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * A content change event for a document.
 *
 * When `range` is `None`, `text` is the full content of the document.
 * When `range` is `Some`, `text` replaces the given range.
 */
export type TextDocumentContentChangeEvent = {
    /**
     * The range of the document that changed. If `None`, the entire content is replaced.
     */
    range?: Range | null;
    /**
     * The new text for the range, or the full document content if `range` is `None`.
     */
    text: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a file is closed.
 */
export type DidCloseDocumentNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The URI of the closed document.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a file is saved.
 */
export type DidSaveDocumentNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The URI of the saved document.
     */
    uri: string;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a file becomes the active editor tab.
 */
export type DidFocusDocumentNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The URI of the focused document.
     */
    uri: string;
    /**
     * The version number of the document.
     */
    version: number;
    /**
     * The current cursor position.
     */
    position: Position;
    /**
     * The portion of the file currently visible in the editor viewport.
     */
    visibleRange: Range;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a suggestion is accepted.
 */
export type AcceptNesNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The ID of the accepted suggestion.
     */
    id: NesSuggestionId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * Notification sent when a suggestion is rejected.
 */
export type RejectNesNotification = {
    /**
     * The session ID for this notification.
     */
    sessionId: SessionId;
    /**
     * The ID of the rejected suggestion.
     */
    id: NesSuggestionId;
    /**
     * The reason for rejection.
     */
    reason?: NesRejectReason | null;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};
/**
 * The reason a suggestion was rejected.
 */
export type NesRejectReason = "rejected" | "ignored" | "replaced" | "cancelled";
/**
 * Notification to cancel an ongoing request.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/cancellation)
 */
export type CancelRequestNotification = {
    /**
     * The ID of the request to cancel.
     */
    requestId: RequestId;
    /**
     * The _meta property is reserved by ACP to allow clients and agents to attach additional
     * metadata to their interactions. Implementations MUST NOT make assumptions about values at
     * these keys.
     *
     * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
     */
    _meta?: {
        [key: string]: unknown;
    } | null;
};

import * as z from "zod/v4";
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
export declare const zRequestId: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
/**
 * A unique identifier for a conversation session between a client and agent.
 *
 * Sessions maintain their own context, conversation history, and state,
 * allowing multiple independent interactions with the same agent.
 *
 * See protocol docs: [Session ID](https://agentclientprotocol.com/protocol/session-setup#session-id)
 */
export declare const zSessionId: z.ZodString;
/**
 * Request to write content to a text file.
 *
 * Only available if the client supports the `fs.writeTextFile` capability.
 */
export declare const zWriteTextFileRequest: z.ZodObject<{
    sessionId: z.ZodString;
    path: z.ZodString;
    content: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to read content from a text file.
 *
 * Only available if the client supports the `fs.readTextFile` capability.
 */
export declare const zReadTextFileRequest: z.ZodObject<{
    sessionId: z.ZodString;
    path: z.ZodString;
    line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    limit: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a tool call within a session.
 */
export declare const zToolCallId: z.ZodString;
/**
 * Categories of tools that can be invoked.
 *
 * Tool kinds help clients choose appropriate icons and optimize how they
 * display tool execution progress.
 *
 * See protocol docs: [Creating](https://agentclientprotocol.com/protocol/tool-calls#creating)
 */
export declare const zToolKind: z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>;
/**
 * Execution status of a tool call.
 *
 * Tool calls progress through different statuses during their lifecycle.
 *
 * See protocol docs: [Status](https://agentclientprotocol.com/protocol/tool-calls#status)
 */
export declare const zToolCallStatus: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>;
/**
 * The sender or recipient of messages and data in a conversation.
 */
export declare const zRole: z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>;
/**
 * Optional annotations for the client. The client can use annotations to inform how objects are used or displayed
 */
export declare const zAnnotations: z.ZodObject<{
    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Text provided to or from an LLM.
 */
export declare const zTextContent: z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An image provided to or from an LLM.
 */
export declare const zImageContent: z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    data: z.ZodString;
    mimeType: z.ZodString;
    uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Audio provided to or from an LLM.
 */
export declare const zAudioContent: z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    data: z.ZodString;
    mimeType: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 */
export declare const zResourceLink: z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodString;
    size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Text-based resource contents.
 */
export declare const zTextResourceContents: z.ZodObject<{
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    text: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Binary resource contents.
 */
export declare const zBlobResourceContents: z.ZodObject<{
    blob: z.ZodString;
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Resource content that can be embedded in a message.
 */
export declare const zEmbeddedResourceResource: z.ZodUnion<readonly [z.ZodObject<{
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    text: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    blob: z.ZodString;
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>]>;
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export declare const zEmbeddedResource: z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    resource: z.ZodUnion<readonly [z.ZodObject<{
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        text: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        blob: z.ZodString;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zContentBlock: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"text">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    data: z.ZodString;
    mimeType: z.ZodString;
    uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"image">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    data: z.ZodString;
    mimeType: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"audio">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodString;
    size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"resource_link">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    resource: z.ZodUnion<readonly [z.ZodObject<{
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        text: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        blob: z.ZodString;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"resource">;
}, z.core.$strip>>]>;
/**
 * Standard content block (text, images, resources).
 */
export declare const zContent: z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A diff representing file modifications.
 *
 * Shows changes to files in a format suitable for display in the client UI.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export declare const zDiff: z.ZodObject<{
    path: z.ZodString;
    oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    newText: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Typed identifier used for terminal values on the wire.
 */
export declare const zTerminalId: z.ZodString;
/**
 * Embed a terminal created with `terminal/create` by its id.
 *
 * The terminal must be added before calling `terminal/release`.
 *
 * See protocol docs: [Terminal](https://agentclientprotocol.com/protocol/terminals)
 */
export declare const zTerminal: z.ZodObject<{
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Content produced by a tool call.
 *
 * Tool calls can produce different types of content including
 * standard content blocks (text, images) or file diffs.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export declare const zToolCallContent: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"content">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    path: z.ZodString;
    oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    newText: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"diff">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"terminal">;
}, z.core.$strip>>]>;
/**
 * A file location being accessed or modified by a tool.
 *
 * Enables clients to implement "follow-along" features that track
 * which files the agent is working with in real-time.
 *
 * See protocol docs: [Following the Agent](https://agentclientprotocol.com/protocol/tool-calls#following-the-agent)
 */
export declare const zToolCallLocation: z.ZodObject<{
    path: z.ZodString;
    line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An update to an existing tool call.
 *
 * Used to report progress and results as tools execute. All fields except
 * the tool call ID are optional - only changed fields need to be included.
 *
 * See protocol docs: [Updating](https://agentclientprotocol.com/protocol/tool-calls#updating)
 */
export declare const zToolCallUpdate: z.ZodObject<{
    toolCallId: z.ZodString;
    kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
    status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"content">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        path: z.ZodString;
        oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"diff">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"terminal">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[], (({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[]>>>>>;
    locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
        path: z.ZodString;
        line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>, z.ZodTransform<{
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>>>>;
    rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a permission option.
 */
export declare const zPermissionOptionId: z.ZodString;
/**
 * The type of permission option being presented to the user.
 *
 * Helps clients choose appropriate icons and UI treatment.
 */
export declare const zPermissionOptionKind: z.ZodUnion<readonly [z.ZodLiteral<"allow_once">, z.ZodLiteral<"allow_always">, z.ZodLiteral<"reject_once">, z.ZodLiteral<"reject_always">]>;
/**
 * An option presented to the user when requesting permission.
 */
export declare const zPermissionOption: z.ZodObject<{
    optionId: z.ZodString;
    name: z.ZodString;
    kind: z.ZodUnion<readonly [z.ZodLiteral<"allow_once">, z.ZodLiteral<"allow_always">, z.ZodLiteral<"reject_once">, z.ZodLiteral<"reject_always">]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request for user permission to execute a tool call.
 *
 * Sent when the agent needs authorization before performing a sensitive operation.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
 */
export declare const zRequestPermissionRequest: z.ZodObject<{
    sessionId: z.ZodString;
    toolCall: z.ZodObject<{
        toolCallId: z.ZodString;
        kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
        status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"content">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            path: z.ZodString;
            oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            newText: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"diff">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            terminalId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"terminal">;
        }, z.core.$strip>>]>>>, z.ZodTransform<(({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[], (({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[]>>>>>;
        locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
            path: z.ZodString;
            line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>, z.ZodTransform<{
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>>>>;
        rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    options: z.ZodArray<z.ZodObject<{
        optionId: z.ZodString;
        name: z.ZodString;
        kind: z.ZodUnion<readonly [z.ZodLiteral<"allow_once">, z.ZodLiteral<"allow_always">, z.ZodLiteral<"reject_once">, z.ZodLiteral<"reject_always">]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An environment variable to set when launching an MCP server.
 */
export declare const zEnvVariable: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to create a new terminal and execute a command.
 */
export declare const zCreateTerminalRequest: z.ZodObject<{
    sessionId: z.ZodString;
    command: z.ZodString;
    args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    env: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>, z.ZodTransform<{
        name: string;
        value: string;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        name: string;
        value: string;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>>>;
    cwd: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    outputByteLimit: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to get the current output and status of a terminal.
 */
export declare const zTerminalOutputRequest: z.ZodObject<{
    sessionId: z.ZodString;
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to release a terminal and free its resources.
 */
export declare const zReleaseTerminalRequest: z.ZodObject<{
    sessionId: z.ZodString;
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to wait for a terminal command to exit.
 */
export declare const zWaitForTerminalExitRequest: z.ZodObject<{
    sessionId: z.ZodString;
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to kill a terminal without releasing it.
 */
export declare const zKillTerminalRequest: z.ZodObject<{
    sessionId: z.ZodString;
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Session-scoped elicitation, optionally tied to a specific tool call.
 *
 * When `tool_call_id` is set, the elicitation is tied to a specific tool call.
 * This is useful when an agent receives an elicitation from an MCP server
 * during a tool call and needs to redirect it to the user.
 */
export declare const zElicitationSessionScope: z.ZodObject<{
    sessionId: z.ZodString;
    toolCallId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
/**
 * Request-scoped elicitation, tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export declare const zElicitationRequestScope: z.ZodObject<{
    requestId: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strip>;
/**
 * Object schema type.
 */
export declare const zElicitationSchemaType: z.ZodLiteral<"object">;
/**
 * String format types for string properties in elicitation schemas.
 */
export declare const zStringFormat: z.ZodUnion<readonly [z.ZodLiteral<"email">, z.ZodLiteral<"uri">, z.ZodLiteral<"date">, z.ZodLiteral<"date-time">]>;
/**
 * A titled enum option with a const value, human-readable title, and optional description.
 */
export declare const zEnumOption: z.ZodObject<{
    const: z.ZodString;
    title: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Schema for string properties in an elicitation form.
 *
 * When `enum` or `oneOf` is set, this represents a single-select enum
 * with `"type": "string"`.
 */
export declare const zStringPropertySchema: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    minLength: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    maxLength: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    pattern: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    format: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"email">, z.ZodLiteral<"uri">, z.ZodLiteral<"date">, z.ZodLiteral<"date-time">]>>>;
    default: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    enum: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    oneOf: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        const: z.ZodString;
        title: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Schema for number (floating-point) properties in an elicitation form.
 */
export declare const zNumberPropertySchema: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    minimum: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maximum: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    default: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Schema for integer properties in an elicitation form.
 */
export declare const zIntegerPropertySchema: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    minimum: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maximum: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    default: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Schema for boolean properties in an elicitation form.
 */
export declare const zBooleanPropertySchema: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    default: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * String item schema for multi-select enum properties.
 */
export declare const zStringMultiSelectItems: z.ZodObject<{
    enum: z.ZodArray<z.ZodString>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Items definition for titled multi-select enum properties.
 */
export declare const zTitledMultiSelectItems: z.ZodObject<{
    anyOf: z.ZodArray<z.ZodObject<{
        const: z.ZodString;
        title: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Items for a multi-select (array) property schema.
 *
 * Custom variants (unknown `type` values) keep their extra
 * properties exactly as received; unlike known variants, those keys
 * bypass lenient-field salvage and arrive unvalidated.
 */
export declare const zMultiSelectItems: z.ZodType<{
    anyOf: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[];
    _meta?: Record<string, unknown> | null | undefined;
} | ({
    enum: string[];
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | {
    type: string;
}, {
    anyOf: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[];
    _meta?: Record<string, unknown> | null | undefined;
} | ({
    enum: string[];
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | {
    type: string;
}, z.core.$ZodTypeInternals<{
    anyOf: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[];
    _meta?: Record<string, unknown> | null | undefined;
} | ({
    enum: string[];
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | {
    type: string;
}, {
    anyOf: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[];
    _meta?: Record<string, unknown> | null | undefined;
} | ({
    enum: string[];
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | {
    type: string;
}>>;
/**
 * Schema for multi-select (array) properties in an elicitation form.
 */
export declare const zMultiSelectPropertySchema: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    minItems: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxItems: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    items: z.ZodType<{
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    }, {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    }, z.core.$ZodTypeInternals<{
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    }, {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    }>>;
    default: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Property schema for elicitation form fields.
 *
 * Each variant corresponds to a JSON Schema `"type"` value.
 * Single-select enums use the `String` variant with `enum` or `oneOf` set.
 * Multi-select enums use the `Array` variant.
 *
 * Custom variants (unknown `type` values) keep their extra
 * properties exactly as received; unlike known variants, those keys
 * bypass lenient-field salvage and arrive unvalidated.
 */
export declare const zElicitationPropertySchema: z.ZodType<({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minLength?: number | null | undefined;
    maxLength?: number | null | undefined;
    pattern?: string | null | undefined;
    format?: "date" | "email" | "uri" | "date-time" | null | undefined;
    default?: string | null | undefined;
    enum?: string[] | null | undefined;
    oneOf?: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "number";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "integer";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    default?: boolean | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "boolean";
}) | ({
    items: {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    };
    title?: string | null | undefined;
    description?: string | null | undefined;
    minItems?: number | null | undefined;
    maxItems?: number | null | undefined;
    default?: string[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "array";
}) | {
    type: string;
}, ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minLength?: number | null | undefined;
    maxLength?: number | null | undefined;
    pattern?: string | null | undefined;
    format?: "date" | "email" | "uri" | "date-time" | null | undefined;
    default?: string | null | undefined;
    enum?: string[] | null | undefined;
    oneOf?: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "number";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "integer";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    default?: boolean | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "boolean";
}) | ({
    items: {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    };
    title?: string | null | undefined;
    description?: string | null | undefined;
    minItems?: number | null | undefined;
    maxItems?: number | null | undefined;
    default?: string[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "array";
}) | {
    type: string;
}, z.core.$ZodTypeInternals<({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minLength?: number | null | undefined;
    maxLength?: number | null | undefined;
    pattern?: string | null | undefined;
    format?: "date" | "email" | "uri" | "date-time" | null | undefined;
    default?: string | null | undefined;
    enum?: string[] | null | undefined;
    oneOf?: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "number";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "integer";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    default?: boolean | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "boolean";
}) | ({
    items: {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    };
    title?: string | null | undefined;
    description?: string | null | undefined;
    minItems?: number | null | undefined;
    maxItems?: number | null | undefined;
    default?: string[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "array";
}) | {
    type: string;
}, ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minLength?: number | null | undefined;
    maxLength?: number | null | undefined;
    pattern?: string | null | undefined;
    format?: "date" | "email" | "uri" | "date-time" | null | undefined;
    default?: string | null | undefined;
    enum?: string[] | null | undefined;
    oneOf?: {
        const: string;
        title: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "string";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "number";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    minimum?: number | null | undefined;
    maximum?: number | null | undefined;
    default?: number | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "integer";
}) | ({
    title?: string | null | undefined;
    description?: string | null | undefined;
    default?: boolean | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "boolean";
}) | ({
    items: {
        anyOf: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        enum: string[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | {
        type: string;
    };
    title?: string | null | undefined;
    description?: string | null | undefined;
    minItems?: number | null | undefined;
    maxItems?: number | null | undefined;
    default?: string[] | null | undefined;
    _meta?: Record<string, unknown> | null | undefined;
} & {
    type: "array";
}) | {
    type: string;
}>>;
/**
 * Type-safe elicitation schema for requesting structured user input.
 *
 * This represents a JSON Schema object with primitive-typed properties,
 * as required by the elicitation specification.
 */
export declare const zElicitationSchema: z.ZodObject<{
    type: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodLiteral<"object">>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    properties: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minLength?: number | null | undefined;
        maxLength?: number | null | undefined;
        pattern?: string | null | undefined;
        format?: "date" | "email" | "uri" | "date-time" | null | undefined;
        default?: string | null | undefined;
        enum?: string[] | null | undefined;
        oneOf?: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "number";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "integer";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        default?: boolean | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "boolean";
    }) | ({
        items: {
            anyOf: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            enum: string[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | {
            type: string;
        };
        title?: string | null | undefined;
        description?: string | null | undefined;
        minItems?: number | null | undefined;
        maxItems?: number | null | undefined;
        default?: string[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "array";
    }) | {
        type: string;
    }, ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minLength?: number | null | undefined;
        maxLength?: number | null | undefined;
        pattern?: string | null | undefined;
        format?: "date" | "email" | "uri" | "date-time" | null | undefined;
        default?: string | null | undefined;
        enum?: string[] | null | undefined;
        oneOf?: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "number";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "integer";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        default?: boolean | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "boolean";
    }) | ({
        items: {
            anyOf: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            enum: string[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | {
            type: string;
        };
        title?: string | null | undefined;
        description?: string | null | undefined;
        minItems?: number | null | undefined;
        maxItems?: number | null | undefined;
        default?: string[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "array";
    }) | {
        type: string;
    }, z.core.$ZodTypeInternals<({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minLength?: number | null | undefined;
        maxLength?: number | null | undefined;
        pattern?: string | null | undefined;
        format?: "date" | "email" | "uri" | "date-time" | null | undefined;
        default?: string | null | undefined;
        enum?: string[] | null | undefined;
        oneOf?: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "number";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "integer";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        default?: boolean | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "boolean";
    }) | ({
        items: {
            anyOf: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            enum: string[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | {
            type: string;
        };
        title?: string | null | undefined;
        description?: string | null | undefined;
        minItems?: number | null | undefined;
        maxItems?: number | null | undefined;
        default?: string[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "array";
    }) | {
        type: string;
    }, ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minLength?: number | null | undefined;
        maxLength?: number | null | undefined;
        pattern?: string | null | undefined;
        format?: "date" | "email" | "uri" | "date-time" | null | undefined;
        default?: string | null | undefined;
        enum?: string[] | null | undefined;
        oneOf?: {
            const: string;
            title: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "string";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "number";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        minimum?: number | null | undefined;
        maximum?: number | null | undefined;
        default?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "integer";
    }) | ({
        title?: string | null | undefined;
        description?: string | null | undefined;
        default?: boolean | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "boolean";
    }) | ({
        items: {
            anyOf: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            enum: string[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | {
            type: string;
        };
        title?: string | null | undefined;
        description?: string | null | undefined;
        minItems?: number | null | undefined;
        maxItems?: number | null | undefined;
        default?: string[] | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "array";
    }) | {
        type: string;
    }>>>>>;
    required: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Form-based elicitation mode where the client renders a form from the provided schema.
 */
export declare const zElicitationFormMode: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    sessionId: z.ZodString;
    toolCallId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>, z.ZodObject<{
    requestId: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strip>]>, z.ZodObject<{
    requestedSchema: z.ZodObject<{
        type: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodLiteral<"object">>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        properties: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }, z.core.$ZodTypeInternals<({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }>>>>>;
        required: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
}, z.core.$strip>>;
/**
 * Unique identifier for an elicitation.
 */
export declare const zElicitationId: z.ZodString;
/**
 * URL-based elicitation mode where the client directs the user to a URL.
 */
export declare const zElicitationUrlMode: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    sessionId: z.ZodString;
    toolCallId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>, z.ZodObject<{
    requestId: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
}, z.core.$strip>]>, z.ZodObject<{
    elicitationId: z.ZodString;
    url: z.ZodURL;
}, z.core.$strip>>;
/**
 * Request from the agent to elicit structured user input.
 *
 * The agent sends this to the client to request information from the user,
 * either via a form or by directing them to a URL.
 * Elicitations are tied to a session (optionally a tool call) or a request.
 *
 * Custom variants (unknown `mode` values) keep their extra
 * properties exactly as received; unlike known variants, those keys
 * bypass lenient-field salvage and arrive unvalidated.
 */
export declare const zCreateElicitationRequest: z.ZodType<(((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    requestedSchema: {
        type: "object";
        properties: Record<string, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }>;
        title?: string | null | undefined;
        required?: string[] | null | undefined;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    };
}) & {
    mode: "form";
}) | ((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    elicitationId: string;
    url: string;
}) & {
    mode: "url";
}) | (({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    mode: string;
})) & {
    message: string;
    _meta?: Record<string, unknown> | null | undefined;
}, (((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    requestedSchema: {
        type?: "object" | undefined;
        title?: string | null | undefined;
        properties?: Record<string, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }> | undefined;
        required?: string[] | null | undefined;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    };
}) & {
    mode: "form";
}) | ((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    elicitationId: string;
    url: string;
}) & {
    mode: "url";
}) | (({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    mode: string;
})) & {
    message: string;
    _meta?: Record<string, unknown> | null | undefined;
}, z.core.$ZodTypeInternals<(((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    requestedSchema: {
        type: "object";
        properties: Record<string, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }>;
        title?: string | null | undefined;
        required?: string[] | null | undefined;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    };
}) & {
    mode: "form";
}) | ((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    elicitationId: string;
    url: string;
}) & {
    mode: "url";
}) | (({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    mode: string;
})) & {
    message: string;
    _meta?: Record<string, unknown> | null | undefined;
}, (((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    requestedSchema: {
        type?: "object" | undefined;
        title?: string | null | undefined;
        properties?: Record<string, ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minLength?: number | null | undefined;
            maxLength?: number | null | undefined;
            pattern?: string | null | undefined;
            format?: "date" | "email" | "uri" | "date-time" | null | undefined;
            default?: string | null | undefined;
            enum?: string[] | null | undefined;
            oneOf?: {
                const: string;
                title: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "string";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "number";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            minimum?: number | null | undefined;
            maximum?: number | null | undefined;
            default?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "integer";
        }) | ({
            title?: string | null | undefined;
            description?: string | null | undefined;
            default?: boolean | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "boolean";
        }) | ({
            items: {
                anyOf: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            } | ({
                enum: string[];
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | {
                type: string;
            };
            title?: string | null | undefined;
            description?: string | null | undefined;
            minItems?: number | null | undefined;
            maxItems?: number | null | undefined;
            default?: string[] | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "array";
        }) | {
            type: string;
        }> | undefined;
        required?: string[] | null | undefined;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    };
}) & {
    mode: "form";
}) | ((({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    elicitationId: string;
    url: string;
}) & {
    mode: "url";
}) | (({
    sessionId: string;
    toolCallId?: string | null | undefined;
} | {
    requestId: string | number | null;
}) & {
    mode: string;
})) & {
    message: string;
    _meta?: Record<string, unknown> | null | undefined;
}>>;
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
export declare const zMcpServerAcpId: z.ZodString;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/connect`.
 *
 * @experimental
 */
export declare const zConnectMcpRequest: z.ZodObject<{
    serverId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A unique identifier for an active MCP-over-ACP connection.
 *
 * @experimental
 */
export declare const zMcpConnectionId: z.ZodString;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/message`.
 *
 * @experimental
 */
export declare const zMessageMcpRequest: z.ZodObject<{
    connectionId: z.ZodString;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/disconnect`.
 *
 * @experimental
 */
export declare const zDisconnectMcpRequest: z.ZodObject<{
    connectionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Allows for sending an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export declare const zExtRequest: z.ZodUnknown;
/**
 * A JSON-RPC request object.
 */
export declare const zAgentRequest: z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
        sessionId: z.ZodString;
        path: z.ZodString;
        content: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        path: z.ZodString;
        line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        limit: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        toolCall: z.ZodObject<{
            toolCallId: z.ZodString;
            kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
            status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    text: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"text">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"image">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"audio">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    name: z.ZodString;
                    size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource_link">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    resource: z.ZodUnion<readonly [z.ZodObject<{
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        text: z.ZodString;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>, z.ZodObject<{
                        blob: z.ZodString;
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>]>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource">;
                }, z.core.$strip>>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"content">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                path: z.ZodString;
                oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                newText: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"diff">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                terminalId: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"terminal">;
            }, z.core.$strip>>]>>>, z.ZodTransform<(({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[], (({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[]>>>>>;
            locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
                path: z.ZodString;
                line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>, z.ZodTransform<{
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>>>>;
            rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        options: z.ZodArray<z.ZodObject<{
            optionId: z.ZodString;
            name: z.ZodString;
            kind: z.ZodUnion<readonly [z.ZodLiteral<"allow_once">, z.ZodLiteral<"allow_always">, z.ZodLiteral<"reject_once">, z.ZodLiteral<"reject_always">]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        command: z.ZodString;
        args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        env: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>, z.ZodTransform<{
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>>>;
        cwd: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        outputByteLimit: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodType<(((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        requestedSchema: {
            type: "object";
            properties: Record<string, ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minLength?: number | null | undefined;
                maxLength?: number | null | undefined;
                pattern?: string | null | undefined;
                format?: "date" | "email" | "uri" | "date-time" | null | undefined;
                default?: string | null | undefined;
                enum?: string[] | null | undefined;
                oneOf?: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "number";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "integer";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                default?: boolean | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "boolean";
            }) | ({
                items: {
                    anyOf: {
                        const: string;
                        title: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                } | ({
                    enum: string[];
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "string";
                }) | {
                    type: string;
                };
                title?: string | null | undefined;
                description?: string | null | undefined;
                minItems?: number | null | undefined;
                maxItems?: number | null | undefined;
                default?: string[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "array";
            }) | {
                type: string;
            }>;
            title?: string | null | undefined;
            required?: string[] | null | undefined;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
    }) & {
        mode: "form";
    }) | ((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        elicitationId: string;
        url: string;
    }) & {
        mode: "url";
    }) | (({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        mode: string;
    })) & {
        message: string;
        _meta?: Record<string, unknown> | null | undefined;
    }, (((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        requestedSchema: {
            type?: "object" | undefined;
            title?: string | null | undefined;
            properties?: Record<string, ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minLength?: number | null | undefined;
                maxLength?: number | null | undefined;
                pattern?: string | null | undefined;
                format?: "date" | "email" | "uri" | "date-time" | null | undefined;
                default?: string | null | undefined;
                enum?: string[] | null | undefined;
                oneOf?: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "number";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "integer";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                default?: boolean | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "boolean";
            }) | ({
                items: {
                    anyOf: {
                        const: string;
                        title: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                } | ({
                    enum: string[];
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "string";
                }) | {
                    type: string;
                };
                title?: string | null | undefined;
                description?: string | null | undefined;
                minItems?: number | null | undefined;
                maxItems?: number | null | undefined;
                default?: string[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "array";
            }) | {
                type: string;
            }> | undefined;
            required?: string[] | null | undefined;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
    }) & {
        mode: "form";
    }) | ((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        elicitationId: string;
        url: string;
    }) & {
        mode: "url";
    }) | (({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        mode: string;
    })) & {
        message: string;
        _meta?: Record<string, unknown> | null | undefined;
    }, z.core.$ZodTypeInternals<(((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        requestedSchema: {
            type: "object";
            properties: Record<string, ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minLength?: number | null | undefined;
                maxLength?: number | null | undefined;
                pattern?: string | null | undefined;
                format?: "date" | "email" | "uri" | "date-time" | null | undefined;
                default?: string | null | undefined;
                enum?: string[] | null | undefined;
                oneOf?: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "number";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "integer";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                default?: boolean | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "boolean";
            }) | ({
                items: {
                    anyOf: {
                        const: string;
                        title: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                } | ({
                    enum: string[];
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "string";
                }) | {
                    type: string;
                };
                title?: string | null | undefined;
                description?: string | null | undefined;
                minItems?: number | null | undefined;
                maxItems?: number | null | undefined;
                default?: string[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "array";
            }) | {
                type: string;
            }>;
            title?: string | null | undefined;
            required?: string[] | null | undefined;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
    }) & {
        mode: "form";
    }) | ((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        elicitationId: string;
        url: string;
    }) & {
        mode: "url";
    }) | (({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        mode: string;
    })) & {
        message: string;
        _meta?: Record<string, unknown> | null | undefined;
    }, (((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        requestedSchema: {
            type?: "object" | undefined;
            title?: string | null | undefined;
            properties?: Record<string, ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minLength?: number | null | undefined;
                maxLength?: number | null | undefined;
                pattern?: string | null | undefined;
                format?: "date" | "email" | "uri" | "date-time" | null | undefined;
                default?: string | null | undefined;
                enum?: string[] | null | undefined;
                oneOf?: {
                    const: string;
                    title: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "string";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "number";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                minimum?: number | null | undefined;
                maximum?: number | null | undefined;
                default?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "integer";
            }) | ({
                title?: string | null | undefined;
                description?: string | null | undefined;
                default?: boolean | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "boolean";
            }) | ({
                items: {
                    anyOf: {
                        const: string;
                        title: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                } | ({
                    enum: string[];
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "string";
                }) | {
                    type: string;
                };
                title?: string | null | undefined;
                description?: string | null | undefined;
                minItems?: number | null | undefined;
                maxItems?: number | null | undefined;
                default?: string[] | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "array";
            }) | {
                type: string;
            }> | undefined;
            required?: string[] | null | undefined;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
    }) & {
        mode: "form";
    }) | ((({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        elicitationId: string;
        url: string;
    }) & {
        mode: "url";
    }) | (({
        sessionId: string;
        toolCallId?: string | null | undefined;
    } | {
        requestId: string | number | null;
    }) & {
        mode: string;
    })) & {
        message: string;
        _meta?: Record<string, unknown> | null | undefined;
    }>>, z.ZodObject<{
        serverId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connectionId: z.ZodString;
        method: z.ZodString;
        params: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connectionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown]>>>;
}, z.core.$strip>;
/**
 * Protocol version identifier.
 *
 * This version is only bumped for breaking changes.
 * Non-breaking changes should be introduced via capabilities.
 */
export declare const zProtocolVersion: z.ZodInt;
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
export declare const zPromptCapabilities: z.ZodObject<{
    image: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    audio: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    embeddedContext: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * MCP capabilities supported by the agent
 */
export declare const zMcpCapabilities: z.ZodObject<{
    http: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    sse: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    acp: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for the `session/list` method.
 *
 * Supplying `{}` means the agent supports listing sessions.
 */
export declare const zSessionListCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for the `session/delete` method.
 *
 * Supplying `{}` means the agent supports deleting sessions from `session/list`.
 */
export declare const zSessionDeleteCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for additional session directories support.
 *
 * Supplying `{}` means the agent supports the `additionalDirectories` field on
 * supported session lifecycle requests. Agents that also support
 * `session/list` may return `SessionInfo.additionalDirectories` to report the
 * complete ordered additional-root list associated with a listed session.
 */
export declare const zSessionAdditionalDirectoriesCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zSessionForkCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for the `session/resume` method.
 *
 * Supplying `{}` means the agent supports resuming sessions.
 */
export declare const zSessionResumeCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for the `session/close` method.
 *
 * Supplying `{}` means the agent supports closing sessions.
 */
export declare const zSessionCloseCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zSessionCapabilities: z.ZodObject<{
    list: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    delete: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    fork: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    resume: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    close: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Logout capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports the logout method.
 */
export declare const zLogoutCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Authentication-related capabilities supported by the agent.
 */
export declare const zAgentAuthCapabilities: z.ZodObject<{
    logout: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zProvidersCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for `document/didOpen` capability support.
 */
export declare const zNesDocumentDidOpenCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * How the agent wants document changes delivered.
 */
export declare const zTextDocumentSyncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
/**
 * Capabilities for `document/didChange` events.
 */
export declare const zNesDocumentDidChangeCapabilities: z.ZodObject<{
    syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for `document/didClose` capability support.
 */
export declare const zNesDocumentDidCloseCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for `document/didSave` capability support.
 */
export declare const zNesDocumentDidSaveCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for `document/didFocus` capability support.
 */
export declare const zNesDocumentDidFocusCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Document event capabilities the agent wants to receive.
 */
export declare const zNesDocumentEventCapabilities: z.ZodObject<{
    didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Event capabilities the agent can consume.
 */
export declare const zNesEventCapabilities: z.ZodObject<{
    document: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for recent files context.
 */
export declare const zNesRecentFilesCapabilities: z.ZodObject<{
    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for related snippets context.
 */
export declare const zNesRelatedSnippetsCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for edit history context.
 */
export declare const zNesEditHistoryCapabilities: z.ZodObject<{
    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for user actions context.
 */
export declare const zNesUserActionsCapabilities: z.ZodObject<{
    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for open files context.
 */
export declare const zNesOpenFilesCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities for diagnostics context.
 */
export declare const zNesDiagnosticsCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Context capabilities the agent wants attached to each suggestion request.
 */
export declare const zNesContextCapabilities: z.ZodObject<{
    recentFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    relatedSnippets: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    editHistory: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    userActions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    openFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    diagnostics: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * NES capabilities advertised by the agent during initialization.
 */
export declare const zNesCapabilities: z.ZodObject<{
    events: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        document: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    context: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        recentFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        relatedSnippets: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        editHistory: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        userActions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        openFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        diagnostics: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The encoding used for character offsets in positions.
 *
 * Follows the same conventions as LSP 3.17. The default is UTF-16.
 */
export declare const zPositionEncodingKind: z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>;
/**
 * Capabilities supported by the agent.
 *
 * Advertised during initialization to inform the client about
 * available features and content types.
 *
 * See protocol docs: [Agent Capabilities](https://agentclientprotocol.com/protocol/initialization#agent-capabilities)
 */
export declare const zAgentCapabilities: z.ZodObject<{
    loadSession: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    promptCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        image: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        audio: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        embeddedContext: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    mcpCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        http: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        sse: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        acp: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    sessionCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        list: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        delete: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        fork: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resume: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        close: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        logout: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    providers: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        events: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            document: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        context: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            recentFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            relatedSnippets: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            editHistory: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            userActions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            openFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            diagnostics: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    positionEncoding: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Typed identifier used for auth method values on the wire.
 */
export declare const zAuthMethodId: z.ZodString;
/**
 * Terminal-based authentication method.
 *
 * The client runs the configured agent program as a separate interactive
 * process for the user to authenticate via a TUI. Agents MUST advertise this
 * method only when the client enabled its terminal authentication capability.
 * A zero exit status signals success; any other termination signals failure.
 * The client MUST NOT pass this method to `authenticate`.
 */
export declare const zAuthMethodTerminal: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    env: z.ZodCatch<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Agent handles authentication itself through `authenticate`.
 *
 * This is the default authentication method type.
 */
export declare const zAuthMethodAgent: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Describes an available authentication method.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the method is treated as `agent`.
 */
export declare const zAuthMethod: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    env: z.ZodCatch<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"terminal">;
}, z.core.$strip>>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>]>;
/**
 * Metadata about the implementation of the client or agent.
 * Describes the name and version of an ACP implementation, with an optional
 * title for UI representation.
 */
export declare const zImplementation: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    version: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to the `initialize` method.
 *
 * Contains the negotiated protocol version and agent capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export declare const zInitializeResponse: z.ZodObject<{
    protocolVersion: z.ZodInt;
    agentCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        loadSession: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        promptCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            image: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            audio: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            embeddedContext: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        mcpCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            http: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            sse: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            acp: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        sessionCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            list: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            delete: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            fork: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resume: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            close: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            logout: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        providers: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            events: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                document: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            context: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                recentFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                relatedSnippets: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                editHistory: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                userActions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                openFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                diagnostics: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        positionEncoding: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    authMethods: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        env: z.ZodCatch<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"terminal">;
    }, z.core.$strip>>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>]>>>, z.ZodTransform<({
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        id: string;
        name: string;
        description?: string | null | undefined;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[], ({
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        id: string;
        name: string;
        description?: string | null | undefined;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[]>>>>>;
    agentInfo: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        version: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to the `authenticate` method.
 */
export declare const zAuthenticateResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a configurable LLM provider.
 *
 * @experimental
 */
export declare const zProviderId: z.ZodString;
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
export declare const zLlmProtocol: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Current effective non-secret routing configuration for a provider.
 *
 * @experimental
 */
export declare const zProviderCurrentConfig: z.ZodObject<{
    apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
    baseUrl: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Information about a configurable LLM provider.
 *
 * @experimental
 */
export declare const zProviderInfo: z.ZodObject<{
    providerId: z.ZodString;
    supported: z.ZodType<string[], string[], z.core.$ZodTypeInternals<string[], string[]>>;
    required: z.ZodBoolean;
    current: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
        baseUrl: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/list`.
 *
 * @experimental
 */
export declare const zListProvidersResponse: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
        providerId: z.ZodString;
        supported: z.ZodType<string[], string[], z.core.$ZodTypeInternals<string[], string[]>>;
        required: z.ZodBoolean;
        current: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
            baseUrl: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/set`.
 *
 * @experimental
 */
export declare const zSetProviderResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/disable`.
 *
 * @experimental
 */
export declare const zDisableProviderResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to the `logout` method.
 */
export declare const zLogoutResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a Session Mode.
 */
export declare const zSessionModeId: z.ZodString;
/**
 * A mode the agent can operate in.
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export declare const zSessionMode: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The set of modes and the one currently active.
 */
export declare const zSessionModeState: z.ZodObject<{
    currentModeId: z.ZodString;
    availableModes: z.ZodType<{
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        id: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a session configuration option.
 */
export declare const zSessionConfigId: z.ZodString;
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
export declare const zSessionConfigOptionCategory: z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>;
/**
 * Unique identifier for a session configuration option value.
 */
export declare const zSessionConfigValueId: z.ZodString;
/**
 * A possible value for a session configuration option.
 */
export declare const zSessionConfigSelectOption: z.ZodObject<{
    value: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a session configuration option value group.
 */
export declare const zSessionConfigGroupId: z.ZodString;
/**
 * A group of possible values for a session configuration option.
 */
export declare const zSessionConfigSelectGroup: z.ZodObject<{
    group: z.ZodString;
    name: z.ZodString;
    options: z.ZodType<{
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Possible values for a session configuration option.
 */
export declare const zSessionConfigSelectOptions: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
    value: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>>, z.ZodArray<z.ZodObject<{
    group: z.ZodString;
    name: z.ZodString;
    options: z.ZodType<{
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        value: string;
        name: string;
        description?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>>]>;
/**
 * A single-value selector (dropdown) session configuration option payload.
 */
export declare const zSessionConfigSelect: z.ZodObject<{
    currentValue: z.ZodString;
    options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        name: z.ZodString;
        options: z.ZodType<{
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>]>;
}, z.core.$strip>;
/**
 * A boolean on/off toggle session configuration option payload.
 */
export declare const zSessionConfigBoolean: z.ZodObject<{
    currentValue: z.ZodBoolean;
}, z.core.$strip>;
/**
 * A session configuration option selector and its current state.
 */
export declare const zSessionConfigOption: z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    currentValue: z.ZodString;
    options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        name: z.ZodString;
        options: z.ZodType<{
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>]>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"select">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    currentValue: z.ZodBoolean;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"boolean">;
}, z.core.$strip>>]>, z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>>;
/**
 * Response from creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export declare const zNewSessionResponse: z.ZodObject<{
    sessionId: z.ZodString;
    modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        currentModeId: z.ZodString;
        availableModes: z.ZodType<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodString;
        options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
            group: z.ZodString;
            name: z.ZodString;
            options: z.ZodType<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"select">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodBoolean;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"boolean">;
    }, z.core.$strip>>]>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>, z.ZodTransform<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from loading an existing session.
 */
export declare const zLoadSessionResponse: z.ZodObject<{
    modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        currentModeId: z.ZodString;
        availableModes: z.ZodType<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodString;
        options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
            group: z.ZodString;
            name: z.ZodString;
            options: z.ZodType<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"select">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodBoolean;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"boolean">;
    }, z.core.$strip>>]>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>, z.ZodTransform<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Information about a session returned by session/list
 */
export declare const zSessionInfo: z.ZodObject<{
    sessionId: z.ZodString;
    cwd: z.ZodString;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    updatedAt: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from listing sessions.
 */
export declare const zListSessionsResponse: z.ZodObject<{
    sessions: z.ZodType<{
        sessionId: string;
        cwd: string;
        additionalDirectories?: string[] | undefined;
        title?: string | null | undefined;
        updatedAt?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        sessionId: string;
        cwd: string;
        additionalDirectories?: string[] | undefined;
        title?: string | null | undefined;
        updatedAt?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        sessionId: string;
        cwd: string;
        additionalDirectories?: string[] | undefined;
        title?: string | null | undefined;
        updatedAt?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        sessionId: string;
        cwd: string;
        additionalDirectories?: string[] | undefined;
        title?: string | null | undefined;
        updatedAt?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    nextCursor: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from deleting a session.
 */
export declare const zDeleteSessionResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response from forking an existing session.
 *
 * @experimental
 */
export declare const zForkSessionResponse: z.ZodObject<{
    sessionId: z.ZodString;
    modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        currentModeId: z.ZodString;
        availableModes: z.ZodType<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodString;
        options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
            group: z.ZodString;
            name: z.ZodString;
            options: z.ZodType<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"select">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodBoolean;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"boolean">;
    }, z.core.$strip>>]>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>, z.ZodTransform<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from resuming an existing session.
 */
export declare const zResumeSessionResponse: z.ZodObject<{
    modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        currentModeId: z.ZodString;
        availableModes: z.ZodType<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodString;
        options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
            group: z.ZodString;
            name: z.ZodString;
            options: z.ZodType<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>]>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"select">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        currentValue: z.ZodBoolean;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"boolean">;
    }, z.core.$strip>>]>, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>, z.ZodTransform<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from closing a session.
 */
export declare const zCloseSessionResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to `session/set_mode` method.
 */
export declare const zSetSessionModeResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to `session/set_config_option` method.
 */
export declare const zSetSessionConfigOptionResponse: z.ZodObject<{
    configOptions: z.ZodType<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], z.core.$ZodTypeInternals<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Reasons why an agent stops processing a prompt turn.
 *
 * See protocol docs: [Stop Reasons](https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons)
 */
export declare const zStopReason: z.ZodUnion<readonly [z.ZodLiteral<"end_turn">, z.ZodLiteral<"max_tokens">, z.ZodLiteral<"max_turn_requests">, z.ZodLiteral<"refusal">, z.ZodLiteral<"cancelled">]>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Token usage information for a prompt turn.
 *
 * @experimental
 */
export declare const zUsage: z.ZodObject<{
    totalTokens: z.ZodNumber;
    inputTokens: z.ZodNumber;
    outputTokens: z.ZodNumber;
    thoughtTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    cachedReadTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    cachedWriteTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from processing a user prompt.
 *
 * See protocol docs: [Check for Completion](https://agentclientprotocol.com/protocol/prompt-turn#4-check-for-completion)
 */
export declare const zPromptResponse: z.ZodObject<{
    stopReason: z.ZodUnion<readonly [z.ZodLiteral<"end_turn">, z.ZodLiteral<"max_tokens">, z.ZodLiteral<"max_turn_requests">, z.ZodLiteral<"refusal">, z.ZodLiteral<"cancelled">]>;
    usage: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        totalTokens: z.ZodNumber;
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        thoughtTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        cachedReadTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        cachedWriteTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to `nes/start`.
 */
export declare const zStartNesResponse: z.ZodObject<{
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Unique identifier for a next edit suggestion.
 */
export declare const zNesSuggestionId: z.ZodString;
/**
 * A zero-based position in a text document.
 *
 * The meaning of `character` depends on the negotiated position encoding.
 */
export declare const zPosition: z.ZodObject<{
    line: z.ZodInt;
    character: z.ZodInt;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A range in a text document, expressed as start and end positions.
 */
export declare const zRange: z.ZodObject<{
    start: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    end: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A text edit within a suggestion.
 */
export declare const zNesTextEdit: z.ZodObject<{
    range: z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    newText: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A text edit suggestion.
 */
export declare const zNesEditSuggestion: z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    edits: z.ZodArray<z.ZodObject<{
        range: z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    cursorPosition: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A jump-to-location suggestion.
 */
export declare const zNesJumpSuggestion: z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A rename symbol suggestion.
 */
export declare const zNesRenameSuggestion: z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    newName: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A search-and-replace suggestion.
 */
export declare const zNesSearchAndReplaceSuggestion: z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    search: z.ZodString;
    replace: z.ZodString;
    isRegex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A suggestion returned by the agent.
 */
export declare const zNesSuggestion: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    edits: z.ZodArray<z.ZodObject<{
        range: z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    cursorPosition: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"edit">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"jump">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    newName: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"rename">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    uri: z.ZodString;
    search: z.ZodString;
    replace: z.ZodString;
    isRegex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"searchAndReplace">;
}, z.core.$strip>>]>;
/**
 * Response to `nes/suggest`.
 */
export declare const zSuggestNesResponse: z.ZodObject<{
    suggestions: z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        id: z.ZodString;
        uri: z.ZodString;
        edits: z.ZodArray<z.ZodObject<{
            range: z.ZodObject<{
                start: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                end: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            newText: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        cursorPosition: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"edit">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        id: z.ZodString;
        uri: z.ZodString;
        position: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"jump">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        id: z.ZodString;
        uri: z.ZodString;
        position: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        newName: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"rename">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        id: z.ZodString;
        uri: z.ZodString;
        search: z.ZodString;
        replace: z.ZodString;
        isRegex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"searchAndReplace">;
    }, z.core.$strip>>]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response from closing an NES session.
 */
export declare const zCloseNesResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Allows for sending an arbitrary response to an [`ExtRequest`] that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export declare const zExtResponse: z.ZodUnknown;
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
export declare const zMessageMcpResponse: z.ZodUnknown;
/**
 * Predefined error codes for common JSON-RPC and ACP-specific errors.
 *
 * These codes follow the JSON-RPC 2.0 specification for standard errors
 * and use the reserved range (-32000 to -32099) for protocol-specific errors.
 */
export declare const zErrorCode: z.ZodUnion<readonly [z.ZodLiteral<-32700>, z.ZodLiteral<-32600>, z.ZodLiteral<-32601>, z.ZodLiteral<-32602>, z.ZodLiteral<-32603>, z.ZodLiteral<-32800>, z.ZodLiteral<-32000>, z.ZodLiteral<-32002>, z.ZodInt]>;
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
export declare const zError: z.ZodObject<{
    code: z.ZodUnion<readonly [z.ZodLiteral<-32700>, z.ZodLiteral<-32600>, z.ZodLiteral<-32601>, z.ZodLiteral<-32602>, z.ZodLiteral<-32603>, z.ZodLiteral<-32800>, z.ZodLiteral<-32000>, z.ZodLiteral<-32002>, z.ZodInt]>;
    message: z.ZodString;
    data: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
}, z.core.$strip>;
/**
 * A JSON-RPC response object.
 */
export declare const zAgentResponse: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    result: z.ZodUnion<readonly [z.ZodObject<{
        protocolVersion: z.ZodInt;
        agentCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            loadSession: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            promptCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                image: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                audio: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                embeddedContext: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            mcpCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                http: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                sse: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                acp: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            sessionCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                list: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                delete: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                fork: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resume: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                close: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                logout: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            providers: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                events: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    document: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        didOpen: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                        }, z.core.$strip>>>>;
                        didChange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                            syncKind: z.ZodUnion<readonly [z.ZodLiteral<"full">, z.ZodLiteral<"incremental">]>;
                            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                        }, z.core.$strip>>>>;
                        didClose: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                        }, z.core.$strip>>>>;
                        didSave: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                        }, z.core.$strip>>>>;
                        didFocus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                        }, z.core.$strip>>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                context: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    recentFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    relatedSnippets: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    editHistory: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    userActions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        maxCount: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    openFiles: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    diagnostics: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            positionEncoding: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        authMethods: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            args: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
            env: z.ZodCatch<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"terminal">;
        }, z.core.$strip>>, z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>>>, z.ZodTransform<({
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            id: string;
            name: string;
            description?: string | null | undefined;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[], ({
            id: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            id: string;
            name: string;
            description?: string | null | undefined;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[]>>>>>;
        agentInfo: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            version: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        providers: z.ZodArray<z.ZodObject<{
            providerId: z.ZodString;
            supported: z.ZodType<string[], string[], z.core.$ZodTypeInternals<string[], string[]>>;
            required: z.ZodBoolean;
            current: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
                baseUrl: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            currentModeId: z.ZodString;
            availableModes: z.ZodType<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodString;
            options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                name: z.ZodString;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
                group: z.ZodString;
                name: z.ZodString;
                options: z.ZodType<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], z.core.$ZodTypeInternals<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[]>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>]>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"select">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodBoolean;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"boolean">;
        }, z.core.$strip>>]>, z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>, z.ZodTransform<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            currentModeId: z.ZodString;
            availableModes: z.ZodType<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodString;
            options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                name: z.ZodString;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
                group: z.ZodString;
                name: z.ZodString;
                options: z.ZodType<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], z.core.$ZodTypeInternals<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[]>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>]>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"select">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodBoolean;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"boolean">;
        }, z.core.$strip>>]>, z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>, z.ZodTransform<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessions: z.ZodType<{
            sessionId: string;
            cwd: string;
            additionalDirectories?: string[] | undefined;
            title?: string | null | undefined;
            updatedAt?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            sessionId: string;
            cwd: string;
            additionalDirectories?: string[] | undefined;
            title?: string | null | undefined;
            updatedAt?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            sessionId: string;
            cwd: string;
            additionalDirectories?: string[] | undefined;
            title?: string | null | undefined;
            updatedAt?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            sessionId: string;
            cwd: string;
            additionalDirectories?: string[] | undefined;
            title?: string | null | undefined;
            updatedAt?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        nextCursor: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            currentModeId: z.ZodString;
            availableModes: z.ZodType<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodString;
            options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                name: z.ZodString;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
                group: z.ZodString;
                name: z.ZodString;
                options: z.ZodType<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], z.core.$ZodTypeInternals<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[]>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>]>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"select">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodBoolean;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"boolean">;
        }, z.core.$strip>>]>, z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>, z.ZodTransform<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        modes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            currentModeId: z.ZodString;
            availableModes: z.ZodType<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                id: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodIntersection<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodString;
            options: z.ZodUnion<readonly [z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                name: z.ZodString;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>, z.ZodArray<z.ZodObject<{
                group: z.ZodString;
                name: z.ZodString;
                options: z.ZodType<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], z.core.$ZodTypeInternals<{
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[]>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>]>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"select">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            currentValue: z.ZodBoolean;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"boolean">;
        }, z.core.$strip>>]>, z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            category: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"mode">, z.ZodLiteral<"model">, z.ZodLiteral<"model_config">, z.ZodLiteral<"thought_level">, z.ZodString]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>, z.ZodTransform<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        configOptions: z.ZodType<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], z.core.$ZodTypeInternals<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        stopReason: z.ZodUnion<readonly [z.ZodLiteral<"end_turn">, z.ZodLiteral<"max_tokens">, z.ZodLiteral<"max_turn_requests">, z.ZodLiteral<"refusal">, z.ZodLiteral<"cancelled">]>;
        usage: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            totalTokens: z.ZodNumber;
            inputTokens: z.ZodNumber;
            outputTokens: z.ZodNumber;
            thoughtTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            cachedReadTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            cachedWriteTokens: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        suggestions: z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            id: z.ZodString;
            uri: z.ZodString;
            edits: z.ZodArray<z.ZodObject<{
                range: z.ZodObject<{
                    start: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    end: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                newText: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            cursorPosition: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"edit">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            id: z.ZodString;
            uri: z.ZodString;
            position: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"jump">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            id: z.ZodString;
            uri: z.ZodString;
            position: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            newName: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"rename">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            id: z.ZodString;
            uri: z.ZodString;
            search: z.ZodString;
            replace: z.ZodString;
            isRegex: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"searchAndReplace">;
        }, z.core.$strip>>]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown, z.ZodUnknown]>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    error: z.ZodObject<{
        code: z.ZodUnion<readonly [z.ZodLiteral<-32700>, z.ZodLiteral<-32600>, z.ZodLiteral<-32601>, z.ZodLiteral<-32602>, z.ZodLiteral<-32603>, z.ZodLiteral<-32800>, z.ZodLiteral<-32000>, z.ZodLiteral<-32002>, z.ZodInt]>;
        message: z.ZodString;
        data: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>]>;
/**
 * Unique identifier for a message within a session.
 */
export declare const zMessageId: z.ZodString;
/**
 * A streamed item of content
 */
export declare const zContentChunk: z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Represents a tool call that the language model has requested.
 *
 * Tool calls are actions that the agent executes on behalf of the language model,
 * such as reading files, executing code, or fetching data from external sources.
 *
 * See protocol docs: [Tool Calls](https://agentclientprotocol.com/protocol/tool-calls)
 */
export declare const zToolCall: z.ZodObject<{
    toolCallId: z.ZodString;
    title: z.ZodString;
    name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    kind: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>;
    status: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>;
    content: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"content">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        path: z.ZodString;
        oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"diff">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"terminal">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[], (({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[]>>>>;
    locations: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
        path: z.ZodString;
        line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>, z.ZodTransform<{
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>>>;
    rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Priority levels for plan entries.
 *
 * Used to indicate the relative importance or urgency of different
 * tasks in the execution plan.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export declare const zPlanEntryPriority: z.ZodUnion<readonly [z.ZodLiteral<"high">, z.ZodLiteral<"medium">, z.ZodLiteral<"low">]>;
/**
 * Status of a plan entry in the execution flow.
 *
 * Tracks the lifecycle of each task from planning through completion.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export declare const zPlanEntryStatus: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">]>;
/**
 * A single entry in the execution plan.
 *
 * Represents a task or goal that the assistant intends to accomplish
 * as part of fulfilling the user's request.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export declare const zPlanEntry: z.ZodObject<{
    content: z.ZodString;
    priority: z.ZodUnion<readonly [z.ZodLiteral<"high">, z.ZodLiteral<"medium">, z.ZodLiteral<"low">]>;
    status: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An execution plan for accomplishing complex tasks.
 *
 * Plans consist of multiple entries representing individual tasks or goals.
 * Agents report plans to clients to provide visibility into their execution strategy.
 * Plans can evolve during execution as the agent discovers new requirements or completes tasks.
 *
 * See protocol docs: [Agent Plan](https://agentclientprotocol.com/protocol/agent-plan)
 */
export declare const zPlan: z.ZodObject<{
    entries: z.ZodType<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a plan within a session.
 *
 * @experimental
 */
export declare const zPlanId: z.ZodString;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented as structured entries.
 *
 * @experimental
 */
export declare const zPlanItems: z.ZodObject<{
    planId: z.ZodString;
    entries: z.ZodType<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented by a file URI.
 *
 * @experimental
 */
export declare const zPlanFile: z.ZodObject<{
    planId: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented as raw markdown content.
 *
 * @experimental
 */
export declare const zPlanMarkdown: z.ZodObject<{
    planId: z.ZodString;
    content: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Updated content for a plan.
 *
 * @experimental
 */
export declare const zPlanUpdateContent: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    planId: z.ZodString;
    entries: z.ZodType<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"items">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    planId: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"file">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    planId: z.ZodString;
    content: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"markdown">;
}, z.core.$strip>>]>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A content update for a plan identified by ID.
 *
 * @experimental
 */
export declare const zPlanUpdate: z.ZodObject<{
    plan: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        entries: z.ZodType<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"items">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        content: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"markdown">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Removal notice for a plan identified by ID.
 *
 * @experimental
 */
export declare const zPlanRemoved: z.ZodObject<{
    planId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * All text that was typed after the command name is provided as input.
 */
export declare const zUnstructuredCommandInput: z.ZodObject<{
    hint: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * unstructured
 *
 * All text that was typed after the command name is provided as input.
 */
export declare const zAvailableCommandInput: z.ZodObject<{
    hint: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Information about a command.
 */
export declare const zAvailableCommand: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    input: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        hint: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Available commands are ready or have changed
 */
export declare const zAvailableCommandsUpdate: z.ZodObject<{
    availableCommands: z.ZodType<{
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The current mode of the session has changed
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export declare const zCurrentModeUpdate: z.ZodObject<{
    currentModeId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Session configuration options have been updated.
 */
export declare const zConfigOptionUpdate: z.ZodObject<{
    configOptions: z.ZodType<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], z.core.$ZodTypeInternals<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Update to session metadata. All fields are optional to support partial updates.
 *
 * Agents send this notification to update session information like title or custom metadata.
 * This allows clients to display dynamic session names and track session state changes.
 */
export declare const zSessionInfoUpdate: z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    updatedAt: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Cost information for a session.
 */
export declare const zCost: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Context window and cost update for a session.
 */
export declare const zUsageUpdate: z.ZodObject<{
    used: z.ZodNumber;
    size: z.ZodNumber;
    cost: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a context compaction within a session.
 *
 * @experimental
 */
export declare const zCompactionId: z.ZodString;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Lifecycle state of a context compaction.
 *
 * @experimental
 */
export declare const zCompactionStatus: z.ZodUnion<readonly [z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">, z.ZodLiteral<"cancelled">, z.ZodString]>;
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
export declare const zCompactionUpdate: z.ZodObject<{
    compactionId: z.ZodString;
    status: z.ZodUnion<readonly [z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">, z.ZodLiteral<"cancelled">, z.ZodString]>;
    summary: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        text: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "text";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        uri?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "image";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "audio";
    }) | ({
        name: string;
        uri: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        description?: string | null | undefined;
        mimeType?: string | null | undefined;
        size?: number | null | undefined;
        title?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource_link";
    }) | ({
        resource: {
            text: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | {
            blob: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource";
    }))[], (({
        text: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "text";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        uri?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "image";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "audio";
    }) | ({
        name: string;
        uri: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        description?: string | null | undefined;
        mimeType?: string | null | undefined;
        size?: number | null | undefined;
        title?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource_link";
    }) | ({
        resource: {
            text: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | {
            blob: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource";
    }))[]>>>>>;
    error: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zCompactionSummaryChunk: z.ZodObject<{
    compactionId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Different types of updates that can be sent during session processing.
 *
 * These updates provide real-time feedback about the agent's progress.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export declare const zSessionUpdate: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"user_message_chunk">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"agent_message_chunk">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"agent_thought_chunk">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    toolCallId: z.ZodString;
    title: z.ZodString;
    name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    kind: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>;
    status: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>;
    content: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"content">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        path: z.ZodString;
        oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"diff">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"terminal">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[], (({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[]>>>>;
    locations: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
        path: z.ZodString;
        line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>, z.ZodTransform<{
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>>>;
    rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"tool_call">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    toolCallId: z.ZodString;
    kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
    status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"content">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        path: z.ZodString;
        oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        newText: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"diff">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"terminal">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[], (({
        content: ({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        });
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "content";
    }) | ({
        path: string;
        newText: string;
        oldText?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "diff";
    }) | ({
        terminalId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "terminal";
    }))[]>>>>>;
    locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
        path: z.ZodString;
        line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>, z.ZodTransform<{
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        path: string;
        line?: number | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>>>>;
    rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"tool_call_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    entries: z.ZodType<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        content: string;
        priority: "high" | "medium" | "low";
        status: "pending" | "in_progress" | "completed";
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"plan">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    plan: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        entries: z.ZodType<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"items">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"file">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        content: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"markdown">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"plan_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    planId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"plan_removed">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    availableCommands: z.ZodType<{
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        name: string;
        description: string;
        input?: {
            hint: string;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"available_commands_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    currentModeId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"current_mode_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    configOptions: z.ZodType<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], z.core.$ZodTypeInternals<((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[], ((({
        currentValue: string;
        options: {
            value: string;
            name: string;
            description?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[] | {
            group: string;
            name: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        }[];
    } & {
        type: "select";
    }) | ({
        currentValue: boolean;
    } & {
        type: "boolean";
    })) & {
        id: string;
        name: string;
        description?: string | null | undefined;
        category?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    })[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"config_option_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    updatedAt: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"session_info_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    used: z.ZodNumber;
    size: z.ZodNumber;
    cost: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"usage_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    compactionId: z.ZodString;
    status: z.ZodUnion<readonly [z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">, z.ZodLiteral<"cancelled">, z.ZodString]>;
    summary: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>>>, z.ZodTransform<(({
        text: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "text";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        uri?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "image";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "audio";
    }) | ({
        name: string;
        uri: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        description?: string | null | undefined;
        mimeType?: string | null | undefined;
        size?: number | null | undefined;
        title?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource_link";
    }) | ({
        resource: {
            text: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | {
            blob: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource";
    }))[], (({
        text: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "text";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        uri?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "image";
    }) | ({
        data: string;
        mimeType: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "audio";
    }) | ({
        name: string;
        uri: string;
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        description?: string | null | undefined;
        mimeType?: string | null | undefined;
        size?: number | null | undefined;
        title?: string | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource_link";
    }) | ({
        resource: {
            text: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | {
            blob: string;
            uri: string;
            mimeType?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        };
        annotations?: {
            audience?: ("assistant" | "user")[] | null | undefined;
            lastModified?: string | null | undefined;
            priority?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "resource";
    }))[]>>>>>;
    error: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"compaction_update">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    compactionId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    sessionUpdate: z.ZodLiteral<"compaction_summary_chunk">;
}, z.core.$strip>>]>;
/**
 * Notification containing a session update from the agent.
 *
 * Used to stream real-time progress and results during prompt processing.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export declare const zSessionNotification: z.ZodObject<{
    sessionId: z.ZodString;
    update: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"user_message_chunk">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"agent_message_chunk">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"agent_thought_chunk">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        toolCallId: z.ZodString;
        title: z.ZodString;
        name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        kind: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>;
        status: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>;
        content: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"content">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            path: z.ZodString;
            oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            newText: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"diff">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            terminalId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"terminal">;
        }, z.core.$strip>>]>>>, z.ZodTransform<(({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[], (({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[]>>>>;
        locations: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
            path: z.ZodString;
            line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>, z.ZodTransform<{
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>>>;
        rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"tool_call">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        toolCallId: z.ZodString;
        kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
        status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"content">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            path: z.ZodString;
            oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            newText: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"diff">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            terminalId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"terminal">;
        }, z.core.$strip>>]>>>, z.ZodTransform<(({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[], (({
            content: ({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            });
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "content";
        }) | ({
            path: string;
            newText: string;
            oldText?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "diff";
        }) | ({
            terminalId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "terminal";
        }))[]>>>>>;
        locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
            path: z.ZodString;
            line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>, z.ZodTransform<{
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            path: string;
            line?: number | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>>>>;
        rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"tool_call_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        entries: z.ZodType<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            content: string;
            priority: "high" | "medium" | "low";
            status: "pending" | "in_progress" | "completed";
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"plan">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        plan: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            planId: z.ZodString;
            entries: z.ZodType<{
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"items">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            planId: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"file">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            planId: z.ZodString;
            content: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"markdown">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"plan_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        planId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"plan_removed">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        availableCommands: z.ZodType<{
            name: string;
            description: string;
            input?: {
                hint: string;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            name: string;
            description: string;
            input?: {
                hint: string;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            name: string;
            description: string;
            input?: {
                hint: string;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            name: string;
            description: string;
            input?: {
                hint: string;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"available_commands_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        currentModeId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"current_mode_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        configOptions: z.ZodType<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], z.core.$ZodTypeInternals<((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[], ((({
            currentValue: string;
            options: {
                value: string;
                name: string;
                description?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[] | {
                group: string;
                name: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
                _meta?: Record<string, unknown> | null | undefined;
            }[];
        } & {
            type: "select";
        }) | ({
            currentValue: boolean;
        } & {
            type: "boolean";
        })) & {
            id: string;
            name: string;
            description?: string | null | undefined;
            category?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        })[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"config_option_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        updatedAt: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"session_info_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        used: z.ZodNumber;
        size: z.ZodNumber;
        cost: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"usage_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        compactionId: z.ZodString;
        status: z.ZodUnion<readonly [z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">, z.ZodLiteral<"cancelled">, z.ZodString]>;
        summary: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>>>, z.ZodTransform<(({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        }))[], (({
            text: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "text";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            uri?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "image";
        }) | ({
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "audio";
        }) | ({
            name: string;
            uri: string;
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            description?: string | null | undefined;
            mimeType?: string | null | undefined;
            size?: number | null | undefined;
            title?: string | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource_link";
        }) | ({
            resource: {
                text: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | {
                blob: string;
                uri: string;
                mimeType?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            };
            annotations?: {
                audience?: ("assistant" | "user")[] | null | undefined;
                lastModified?: string | null | undefined;
                priority?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "resource";
        }))[]>>>>>;
        error: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"compaction_update">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        compactionId: z.ZodString;
        content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionUpdate: z.ZodLiteral<"compaction_summary_chunk">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent by the agent when a URL-based elicitation is complete.
 */
export declare const zCompleteElicitationNotification: z.ZodObject<{
    elicitationId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zMessageMcpNotification: z.ZodObject<{
    connectionId: z.ZodString;
    method: z.ZodString;
    params: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export declare const zExtNotification: z.ZodUnknown;
/**
 * A JSON-RPC notification object.
 */
export declare const zAgentNotification: z.ZodObject<{
    method: z.ZodString;
    params: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
        sessionId: z.ZodString;
        update: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"user_message_chunk">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"agent_message_chunk">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            messageId: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"agent_thought_chunk">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            toolCallId: z.ZodString;
            title: z.ZodString;
            name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            kind: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>;
            status: z.ZodCatch<z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>;
            content: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    text: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"text">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"image">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"audio">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    name: z.ZodString;
                    size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource_link">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    resource: z.ZodUnion<readonly [z.ZodObject<{
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        text: z.ZodString;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>, z.ZodObject<{
                        blob: z.ZodString;
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>]>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource">;
                }, z.core.$strip>>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"content">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                path: z.ZodString;
                oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                newText: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"diff">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                terminalId: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"terminal">;
            }, z.core.$strip>>]>>>, z.ZodTransform<(({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[], (({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[]>>>>;
            locations: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
                path: z.ZodString;
                line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>, z.ZodTransform<{
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>>>;
            rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"tool_call">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            toolCallId: z.ZodString;
            kind: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"read">, z.ZodLiteral<"edit">, z.ZodLiteral<"delete">, z.ZodLiteral<"move">, z.ZodLiteral<"search">, z.ZodLiteral<"execute">, z.ZodLiteral<"think">, z.ZodLiteral<"fetch">, z.ZodLiteral<"switch_mode">, z.ZodLiteral<"other">]>>>>;
            status: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            content: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    text: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"text">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"image">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    data: z.ZodString;
                    mimeType: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"audio">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    name: z.ZodString;
                    size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource_link">;
                }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                    annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                        lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    resource: z.ZodUnion<readonly [z.ZodObject<{
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        text: z.ZodString;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>, z.ZodObject<{
                        blob: z.ZodString;
                        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                        uri: z.ZodString;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>]>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"resource">;
                }, z.core.$strip>>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"content">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                path: z.ZodString;
                oldText: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                newText: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"diff">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                terminalId: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"terminal">;
            }, z.core.$strip>>]>>>, z.ZodTransform<(({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[], (({
                content: ({
                    text: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "text";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    uri?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "image";
                }) | ({
                    data: string;
                    mimeType: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "audio";
                }) | ({
                    name: string;
                    uri: string;
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    description?: string | null | undefined;
                    mimeType?: string | null | undefined;
                    size?: number | null | undefined;
                    title?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource_link";
                }) | ({
                    resource: {
                        text: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | {
                        blob: string;
                        uri: string;
                        mimeType?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    };
                    annotations?: {
                        audience?: ("assistant" | "user")[] | null | undefined;
                        lastModified?: string | null | undefined;
                        priority?: number | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    } | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } & {
                    type: "resource";
                });
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "content";
            }) | ({
                path: string;
                newText: string;
                oldText?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "diff";
            }) | ({
                terminalId: string;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "terminal";
            }))[]>>>>>;
            locations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodObject<{
                path: z.ZodString;
                line: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>, z.ZodTransform<{
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                path: string;
                line?: number | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>>>>;
            rawInput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            rawOutput: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"tool_call_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            entries: z.ZodType<{
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                content: string;
                priority: "high" | "medium" | "low";
                status: "pending" | "in_progress" | "completed";
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"plan">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            plan: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                planId: z.ZodString;
                entries: z.ZodType<{
                    content: string;
                    priority: "high" | "medium" | "low";
                    status: "pending" | "in_progress" | "completed";
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    content: string;
                    priority: "high" | "medium" | "low";
                    status: "pending" | "in_progress" | "completed";
                    _meta?: Record<string, unknown> | null | undefined;
                }[], z.core.$ZodTypeInternals<{
                    content: string;
                    priority: "high" | "medium" | "low";
                    status: "pending" | "in_progress" | "completed";
                    _meta?: Record<string, unknown> | null | undefined;
                }[], {
                    content: string;
                    priority: "high" | "medium" | "low";
                    status: "pending" | "in_progress" | "completed";
                    _meta?: Record<string, unknown> | null | undefined;
                }[]>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"items">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                planId: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"file">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                planId: z.ZodString;
                content: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"markdown">;
            }, z.core.$strip>>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"plan_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            planId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"plan_removed">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            availableCommands: z.ZodType<{
                name: string;
                description: string;
                input?: {
                    hint: string;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                name: string;
                description: string;
                input?: {
                    hint: string;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], z.core.$ZodTypeInternals<{
                name: string;
                description: string;
                input?: {
                    hint: string;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[], {
                name: string;
                description: string;
                input?: {
                    hint: string;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            }[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"available_commands_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            currentModeId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"current_mode_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            configOptions: z.ZodType<((({
                currentValue: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | {
                    group: string;
                    name: string;
                    options: {
                        value: string;
                        name: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
            } & {
                type: "select";
            }) | ({
                currentValue: boolean;
            } & {
                type: "boolean";
            })) & {
                id: string;
                name: string;
                description?: string | null | undefined;
                category?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            })[], ((({
                currentValue: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | {
                    group: string;
                    name: string;
                    options: {
                        value: string;
                        name: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
            } & {
                type: "select";
            }) | ({
                currentValue: boolean;
            } & {
                type: "boolean";
            })) & {
                id: string;
                name: string;
                description?: string | null | undefined;
                category?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            })[], z.core.$ZodTypeInternals<((({
                currentValue: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | {
                    group: string;
                    name: string;
                    options: {
                        value: string;
                        name: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
            } & {
                type: "select";
            }) | ({
                currentValue: boolean;
            } & {
                type: "boolean";
            })) & {
                id: string;
                name: string;
                description?: string | null | undefined;
                category?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            })[], ((({
                currentValue: string;
                options: {
                    value: string;
                    name: string;
                    description?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                }[] | {
                    group: string;
                    name: string;
                    options: {
                        value: string;
                        name: string;
                        description?: string | null | undefined;
                        _meta?: Record<string, unknown> | null | undefined;
                    }[];
                    _meta?: Record<string, unknown> | null | undefined;
                }[];
            } & {
                type: "select";
            }) | ({
                currentValue: boolean;
            } & {
                type: "boolean";
            })) & {
                id: string;
                name: string;
                description?: string | null | undefined;
                category?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            })[]>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"config_option_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            updatedAt: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"session_info_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            used: z.ZodNumber;
            size: z.ZodNumber;
            cost: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                amount: z.ZodNumber;
                currency: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"usage_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            compactionId: z.ZodString;
            status: z.ZodUnion<readonly [z.ZodLiteral<"in_progress">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">, z.ZodLiteral<"cancelled">, z.ZodString]>;
            summary: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>>>, z.ZodTransform<(({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            }))[], (({
                text: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "text";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                uri?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "image";
            }) | ({
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "audio";
            }) | ({
                name: string;
                uri: string;
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                description?: string | null | undefined;
                mimeType?: string | null | undefined;
                size?: number | null | undefined;
                title?: string | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource_link";
            }) | ({
                resource: {
                    text: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | {
                    blob: string;
                    uri: string;
                    mimeType?: string | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                annotations?: {
                    audience?: ("assistant" | "user")[] | null | undefined;
                    lastModified?: string | null | undefined;
                    priority?: number | null | undefined;
                    _meta?: Record<string, unknown> | null | undefined;
                } | null | undefined;
                _meta?: Record<string, unknown> | null | undefined;
            } & {
                type: "resource";
            }))[]>>>>>;
            error: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"compaction_update">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            compactionId: z.ZodString;
            content: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"text">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"image">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                data: z.ZodString;
                mimeType: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"audio">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                name: z.ZodString;
                size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource_link">;
            }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
                annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                    lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                resource: z.ZodUnion<readonly [z.ZodObject<{
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    text: z.ZodString;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>, z.ZodObject<{
                    blob: z.ZodString;
                    mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                    uri: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>]>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"resource">;
            }, z.core.$strip>>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            sessionUpdate: z.ZodLiteral<"compaction_summary_chunk">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        elicitationId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connectionId: z.ZodString;
        method: z.ZodString;
        params: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown]>>>;
}, z.core.$strip>;
/**
 * File system capabilities that a client may support.
 *
 * See protocol docs: [FileSystem](https://agentclientprotocol.com/protocol/initialization#filesystem)
 */
export declare const zFileSystemCapabilities: z.ZodObject<{
    readTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    writeTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Client support for ID-addressed context compaction updates.
 *
 * @experimental
 */
export declare const zCompactionCapabilities: z.ZodRecord<z.ZodString, z.ZodUnknown>;
/**
 * Capabilities for boolean session configuration options.
 *
 * Supplying `{}` means the client supports boolean session configuration options.
 */
export declare const zBooleanConfigOptionCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Session configuration option capabilities supported by the client.
 */
export declare const zSessionConfigOptionsCapabilities: z.ZodObject<{
    boolean: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Session-related capabilities supported by the client.
 */
export declare const zClientSessionCapabilities: z.ZodObject<{
    compaction: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        boolean: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Capabilities for receiving `plan_update` and `plan_removed` session updates.
 *
 * @experimental
 */
export declare const zPlanCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Authentication capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent which authentication
 * method types the client can handle. This governs opt-in types that require
 * additional client-side support.
 */
export declare const zAuthCapabilities: z.ZodObject<{
    terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Form-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports form-based elicitation.
 */
export declare const zElicitationFormCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * URL-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports URL-based elicitation.
 */
export declare const zElicitationUrlCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Elicitation capabilities supported by the client.
 */
export declare const zElicitationCapabilities: z.ZodObject<{
    form: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    url: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for jump suggestion support.
 */
export declare const zNesJumpCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for rename suggestion support.
 */
export declare const zNesRenameCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Marker for search and replace suggestion support.
 */
export declare const zNesSearchAndReplaceCapabilities: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * NES capabilities advertised by the client during initialization.
 */
export declare const zClientNesCapabilities: z.ZodObject<{
    jump: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    rename: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    searchAndReplace: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent about
 * available features and methods.
 *
 * See protocol docs: [Client Capabilities](https://agentclientprotocol.com/protocol/initialization#client-capabilities)
 */
export declare const zClientCapabilities: z.ZodObject<{
    fs: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        readTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        writeTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
    session: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        compaction: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            boolean: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    plan: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    elicitation: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        form: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        url: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        jump: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        rename: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        searchAndReplace: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    positionEncodings: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>, z.ZodTransform<("utf-16" | "utf-32" | "utf-8")[], ("utf-16" | "utf-32" | "utf-8")[]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for the initialize method.
 *
 * Sent by the client to establish connection and negotiate capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export declare const zInitializeRequest: z.ZodObject<{
    protocolVersion: z.ZodInt;
    clientCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
        fs: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            readTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            writeTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
        session: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            compaction: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                boolean: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        plan: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        elicitation: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            form: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            url: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            jump: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            rename: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            searchAndReplace: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        positionEncodings: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>, z.ZodTransform<("utf-16" | "utf-32" | "utf-8")[], ("utf-16" | "utf-32" | "utf-8")[]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    clientInfo: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        version: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for the authenticate method.
 *
 * Specifies which authentication method to use.
 */
export declare const zAuthenticateRequest: z.ZodObject<{
    methodId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/list`.
 *
 * @experimental
 */
export declare const zListProvidersRequest: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zSetProviderRequest: z.ZodObject<{
    providerId: z.ZodString;
    apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
    baseUrl: z.ZodString;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/disable`.
 *
 * @experimental
 */
export declare const zDisableProviderRequest: z.ZodObject<{
    providerId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for the logout method.
 *
 * Terminates the current authenticated session.
 */
export declare const zLogoutRequest: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An HTTP header to set when making requests to the MCP server.
 */
export declare const zHttpHeader: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * HTTP transport configuration for MCP.
 */
export declare const zMcpServerHttp: z.ZodObject<{
    name: z.ZodString;
    url: z.ZodString;
    headers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * SSE transport configuration for MCP.
 */
export declare const zMcpServerSse: z.ZodObject<{
    name: z.ZodString;
    url: z.ZodString;
    headers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zMcpServerAcp: z.ZodObject<{
    name: z.ZodString;
    serverId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Stdio transport configuration for MCP.
 */
export declare const zMcpServerStdio: z.ZodObject<{
    name: z.ZodString;
    command: z.ZodString;
    args: z.ZodArray<z.ZodString>;
    env: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Configuration for connecting to an MCP (Model Context Protocol) server.
 *
 * MCP servers provide tools and context that the agent can use when
 * processing prompts.
 *
 * See protocol docs: [MCP Servers](https://agentclientprotocol.com/protocol/session-setup#mcp-servers)
 */
export declare const zMcpServer: z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
    name: z.ZodString;
    url: z.ZodString;
    headers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"http">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    name: z.ZodString;
    url: z.ZodString;
    headers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"sse">;
}, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
    name: z.ZodString;
    serverId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"acp">;
}, z.core.$strip>>, z.ZodObject<{
    name: z.ZodString;
    command: z.ZodString;
    args: z.ZodArray<z.ZodString>;
    env: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>]>;
/**
 * Request parameters for creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export declare const zNewSessionRequest: z.ZodObject<{
    cwd: z.ZodString;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    mcpServers: z.ZodType<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], z.core.$ZodTypeInternals<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for loading an existing session.
 *
 * Only available if the Agent supports the `loadSession` capability.
 *
 * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
 */
export declare const zLoadSessionRequest: z.ZodObject<{
    mcpServers: z.ZodType<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], z.core.$ZodTypeInternals<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[]>>;
    cwd: z.ZodString;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for listing existing sessions.
 *
 * Only available if the Agent supports the `sessionCapabilities.list` capability.
 */
export declare const zListSessionsRequest: z.ZodObject<{
    cwd: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for deleting an existing session from `session/list`.
 *
 * Only available if the Agent supports the `sessionCapabilities.delete` capability.
 */
export declare const zDeleteSessionRequest: z.ZodObject<{
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
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
export declare const zForkSessionRequest: z.ZodObject<{
    sessionId: z.ZodString;
    cwd: z.ZodString;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    mcpServers: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        headers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"http">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        headers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"sse">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        serverId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"acp">;
    }, z.core.$strip>>, z.ZodObject<{
        name: z.ZodString;
        command: z.ZodString;
        args: z.ZodArray<z.ZodString>;
        env: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>]>>>, z.ZodTransform<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for resuming an existing session.
 *
 * Resumes an existing session without returning previous messages (unlike `session/load`).
 * This is useful for agents that can resume sessions but don't implement full session loading.
 *
 * Only available if the Agent supports the `sessionCapabilities.resume` capability.
 */
export declare const zResumeSessionRequest: z.ZodObject<{
    sessionId: z.ZodString;
    cwd: z.ZodString;
    additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
    mcpServers: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        headers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"http">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        headers: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"sse">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        name: z.ZodString;
        serverId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"acp">;
    }, z.core.$strip>>, z.ZodObject<{
        name: z.ZodString;
        command: z.ZodString;
        args: z.ZodArray<z.ZodString>;
        env: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>]>>>, z.ZodTransform<({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[], ({
        name: string;
        command: string;
        args: string[];
        env: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "http";
    }) | ({
        name: string;
        url: string;
        headers: {
            name: string;
            value: string;
            _meta?: Record<string, unknown> | null | undefined;
        }[];
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "sse";
    }) | ({
        name: string;
        serverId: string;
        _meta?: Record<string, unknown> | null | undefined;
    } & {
        type: "acp";
    }))[]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for closing an active session.
 *
 * If supported, the agent **must** cancel any ongoing work related to the session
 * (treat it as if `session/cancel` was called) and then free up any resources
 * associated with the session.
 *
 * Only available if the Agent supports the `sessionCapabilities.close` capability.
 */
export declare const zCloseSessionRequest: z.ZodObject<{
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for setting a session mode.
 */
export declare const zSetSessionModeRequest: z.ZodObject<{
    sessionId: z.ZodString;
    modeId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request parameters for setting a session configuration option.
 */
export declare const zSetSessionConfigOptionRequest: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    value: z.ZodBoolean;
    type: z.ZodLiteral<"boolean">;
}, z.core.$strip>, z.ZodObject<{
    value: z.ZodString;
}, z.core.$strip>]>, z.ZodObject<{
    sessionId: z.ZodString;
    configId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>>;
/**
 * Request parameters for sending a user prompt to the agent.
 *
 * Contains the user's message and any additional context.
 *
 * See protocol docs: [User Message](https://agentclientprotocol.com/protocol/prompt-turn#1-user-message)
 */
export declare const zPromptRequest: z.ZodObject<{
    sessionId: z.ZodString;
    prompt: z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"image">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        data: z.ZodString;
        mimeType: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"audio">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        name: z.ZodString;
        size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource_link">;
    }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
        annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
            lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        resource: z.ZodUnion<readonly [z.ZodObject<{
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            text: z.ZodString;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            blob: z.ZodString;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"resource">;
    }, z.core.$strip>>]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A workspace folder.
 */
export declare const zWorkspaceFolder: z.ZodObject<{
    uri: z.ZodString;
    name: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Repository metadata for an NES session.
 */
export declare const zNesRepository: z.ZodObject<{
    name: z.ZodString;
    owner: z.ZodString;
    remoteUrl: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to start an NES session.
 */
export declare const zStartNesRequest: z.ZodObject<{
    workspaceUri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    workspaceFolders: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        name: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    repository: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        owner: z.ZodString;
        remoteUrl: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * What triggered the suggestion request.
 */
export declare const zNesTriggerKind: z.ZodUnion<readonly [z.ZodLiteral<"automatic">, z.ZodLiteral<"diagnostic">, z.ZodLiteral<"manual">]>;
/**
 * A recently accessed file.
 */
export declare const zNesRecentFile: z.ZodObject<{
    uri: z.ZodString;
    languageId: z.ZodString;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A code excerpt from a file.
 */
export declare const zNesExcerpt: z.ZodObject<{
    startLine: z.ZodInt;
    endLine: z.ZodInt;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A related code snippet from a file.
 */
export declare const zNesRelatedSnippet: z.ZodObject<{
    uri: z.ZodString;
    excerpts: z.ZodArray<z.ZodObject<{
        startLine: z.ZodInt;
        endLine: z.ZodInt;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An entry in the edit history.
 */
export declare const zNesEditHistoryEntry: z.ZodObject<{
    uri: z.ZodString;
    diff: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A user action (typing, cursor movement, etc.).
 */
export declare const zNesUserAction: z.ZodObject<{
    action: z.ZodString;
    uri: z.ZodString;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    timestampMs: z.ZodNumber;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * An open file in the editor.
 */
export declare const zNesOpenFile: z.ZodObject<{
    uri: z.ZodString;
    languageId: z.ZodString;
    visibleRange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    lastFocusedMs: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Severity of a diagnostic.
 */
export declare const zNesDiagnosticSeverity: z.ZodUnion<readonly [z.ZodLiteral<"error">, z.ZodLiteral<"warning">, z.ZodLiteral<"information">, z.ZodLiteral<"hint">]>;
/**
 * A diagnostic (error, warning, etc.).
 */
export declare const zNesDiagnostic: z.ZodObject<{
    uri: z.ZodString;
    range: z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    severity: z.ZodUnion<readonly [z.ZodLiteral<"error">, z.ZodLiteral<"warning">, z.ZodLiteral<"information">, z.ZodLiteral<"hint">]>;
    message: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Context attached to a suggestion request.
 */
export declare const zNesSuggestContext: z.ZodObject<{
    recentFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        languageId: z.ZodString;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    relatedSnippets: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        excerpts: z.ZodArray<z.ZodObject<{
            startLine: z.ZodInt;
            endLine: z.ZodInt;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    editHistory: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        diff: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    userActions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        uri: z.ZodString;
        position: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        timestampMs: z.ZodNumber;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    openFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        languageId: z.ZodString;
        visibleRange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        lastFocusedMs: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    diagnostics: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        uri: z.ZodString;
        range: z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        severity: z.ZodUnion<readonly [z.ZodLiteral<"error">, z.ZodLiteral<"warning">, z.ZodLiteral<"information">, z.ZodLiteral<"hint">]>;
        message: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request for a code suggestion.
 */
export declare const zSuggestNesRequest: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    version: z.ZodNumber;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    selection: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>;
    triggerKind: z.ZodUnion<readonly [z.ZodLiteral<"automatic">, z.ZodLiteral<"diagnostic">, z.ZodLiteral<"manual">]>;
    context: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        recentFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            languageId: z.ZodString;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        relatedSnippets: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            excerpts: z.ZodArray<z.ZodObject<{
                startLine: z.ZodInt;
                endLine: z.ZodInt;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        editHistory: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            diff: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        userActions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            action: z.ZodString;
            uri: z.ZodString;
            position: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            timestampMs: z.ZodNumber;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        openFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            languageId: z.ZodString;
            visibleRange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                start: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                end: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            lastFocusedMs: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        diagnostics: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            range: z.ZodObject<{
                start: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                end: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            severity: z.ZodUnion<readonly [z.ZodLiteral<"error">, z.ZodLiteral<"warning">, z.ZodLiteral<"information">, z.ZodLiteral<"hint">]>;
            message: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Request to close an NES session.
 *
 * The agent **must** cancel any ongoing work related to the NES session
 * and then free up any resources associated with the session.
 */
export declare const zCloseNesRequest: z.ZodObject<{
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A JSON-RPC request object.
 */
export declare const zClientRequest: z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
        protocolVersion: z.ZodInt;
        clientCapabilities: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            fs: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                readTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                writeTextFile: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
            session: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                compaction: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                configOptions: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    boolean: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>>>>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            plan: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            auth: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodObject<{
                terminal: z.ZodCatch<z.ZodDefault<z.ZodOptional<z.ZodBoolean>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            elicitation: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                form: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                url: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            nes: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                jump: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                rename: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                searchAndReplace: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            positionEncodings: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"utf-16">, z.ZodLiteral<"utf-32">, z.ZodLiteral<"utf-8">]>>>, z.ZodTransform<("utf-16" | "utf-32" | "utf-8")[], ("utf-16" | "utf-32" | "utf-8")[]>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        clientInfo: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            version: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        methodId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        providerId: z.ZodString;
        apiType: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"openai">, z.ZodLiteral<"azure">, z.ZodLiteral<"vertex">, z.ZodLiteral<"bedrock">, z.ZodString]>;
        baseUrl: z.ZodString;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        providerId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        cwd: z.ZodString;
        additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        mcpServers: z.ZodType<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], z.core.$ZodTypeInternals<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        mcpServers: z.ZodType<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], z.core.$ZodTypeInternals<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[]>>;
        cwd: z.ZodString;
        additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        cwd: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        cwd: z.ZodString;
        additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        mcpServers: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            headers: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"http">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            headers: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"sse">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            serverId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"acp">;
        }, z.core.$strip>>, z.ZodObject<{
            name: z.ZodString;
            command: z.ZodString;
            args: z.ZodArray<z.ZodString>;
            env: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>>>, z.ZodTransform<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        cwd: z.ZodString;
        additionalDirectories: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodString>>, z.ZodTransform<string[], string[]>>>>;
        mcpServers: z.ZodCatch<z.ZodOptional<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            headers: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"http">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            url: z.ZodString;
            headers: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"sse">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            name: z.ZodString;
            serverId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"acp">;
        }, z.core.$strip>>, z.ZodObject<{
            name: z.ZodString;
            command: z.ZodString;
            args: z.ZodArray<z.ZodString>;
            env: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>]>>>, z.ZodTransform<({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[], ({
            name: string;
            command: string;
            args: string[];
            env: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "http";
        }) | ({
            name: string;
            url: string;
            headers: {
                name: string;
                value: string;
                _meta?: Record<string, unknown> | null | undefined;
            }[];
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "sse";
        }) | ({
            name: string;
            serverId: string;
            _meta?: Record<string, unknown> | null | undefined;
        } & {
            type: "acp";
        }))[]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        modeId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
        value: z.ZodBoolean;
        type: z.ZodLiteral<"boolean">;
    }, z.core.$strip>, z.ZodObject<{
        value: z.ZodString;
    }, z.core.$strip>]>, z.ZodObject<{
        sessionId: z.ZodString;
        configId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>, z.ZodObject<{
        sessionId: z.ZodString;
        prompt: z.ZodArray<z.ZodUnion<readonly [z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            text: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"text">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            uri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            data: z.ZodString;
            mimeType: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"audio">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            description: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            name: z.ZodString;
            size: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
            title: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            uri: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource_link">;
        }, z.core.$strip>>, z.ZodIntersection<z.ZodObject<{
            annotations: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                audience: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodPipe<z.ZodArray<z.ZodCatch<z.ZodUnion<readonly [z.ZodLiteral<"assistant">, z.ZodLiteral<"user">]>>>, z.ZodTransform<("assistant" | "user")[], ("assistant" | "user")[]>>>>>;
                lastModified: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                priority: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            resource: z.ZodUnion<readonly [z.ZodObject<{
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                text: z.ZodString;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>, z.ZodObject<{
                blob: z.ZodString;
                mimeType: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
                uri: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>]>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"resource">;
        }, z.core.$strip>>]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        workspaceUri: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        workspaceFolders: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
            uri: z.ZodString;
            name: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        repository: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            owner: z.ZodString;
            remoteUrl: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        version: z.ZodNumber;
        position: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        selection: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>;
        triggerKind: z.ZodUnion<readonly [z.ZodLiteral<"automatic">, z.ZodLiteral<"diagnostic">, z.ZodLiteral<"manual">]>;
        context: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            recentFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                languageId: z.ZodString;
                text: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            relatedSnippets: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                excerpts: z.ZodArray<z.ZodObject<{
                    startLine: z.ZodInt;
                    endLine: z.ZodInt;
                    text: z.ZodString;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            editHistory: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                diff: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            userActions: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                action: z.ZodString;
                uri: z.ZodString;
                position: z.ZodObject<{
                    line: z.ZodInt;
                    character: z.ZodInt;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                timestampMs: z.ZodNumber;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            openFiles: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                languageId: z.ZodString;
                visibleRange: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    start: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    end: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>>>>;
                lastFocusedMs: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            diagnostics: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
                uri: z.ZodString;
                range: z.ZodObject<{
                    start: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    end: z.ZodObject<{
                        line: z.ZodInt;
                        character: z.ZodInt;
                        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                    }, z.core.$strip>;
                    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
                }, z.core.$strip>;
                severity: z.ZodUnion<readonly [z.ZodLiteral<"error">, z.ZodLiteral<"warning">, z.ZodLiteral<"information">, z.ZodLiteral<"hint">]>;
                message: z.ZodString;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connectionId: z.ZodString;
        method: z.ZodString;
        params: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown]>>>;
}, z.core.$strip>;
/**
 * Response to `fs/write_text_file`
 */
export declare const zWriteTextFileResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response containing the contents of a text file.
 */
export declare const zReadTextFileResponse: z.ZodObject<{
    content: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The user selected one of the provided options.
 */
export declare const zSelectedPermissionOutcome: z.ZodObject<{
    optionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The outcome of a permission request.
 */
export declare const zRequestPermissionOutcome: z.ZodUnion<readonly [z.ZodObject<{
    outcome: z.ZodLiteral<"cancelled">;
}, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
    optionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>, z.ZodObject<{
    outcome: z.ZodLiteral<"selected">;
}, z.core.$strip>>]>;
/**
 * Response to a permission request.
 */
export declare const zRequestPermissionResponse: z.ZodObject<{
    outcome: z.ZodUnion<readonly [z.ZodObject<{
        outcome: z.ZodLiteral<"cancelled">;
    }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
        optionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        outcome: z.ZodLiteral<"selected">;
    }, z.core.$strip>>]>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response containing the ID of the created terminal.
 */
export declare const zCreateTerminalResponse: z.ZodObject<{
    terminalId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Exit status of a terminal command.
 */
export declare const zTerminalExitStatus: z.ZodObject<{
    exitCode: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    signal: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response containing the terminal output and exit status.
 */
export declare const zTerminalOutputResponse: z.ZodObject<{
    output: z.ZodString;
    truncated: z.ZodBoolean;
    exitStatus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
        exitCode: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        signal: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to terminal/release method
 */
export declare const zReleaseTerminalResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response containing the exit status of a terminal command.
 */
export declare const zWaitForTerminalExitResponse: z.ZodObject<{
    exitCode: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
    signal: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Response to `terminal/kill` method
 */
export declare const zKillTerminalResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Allowed wire representations for [`ElicitationContentValue`].
 */
export declare const zElicitationContentValue: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString>]>;
/**
 * The user accepted the elicitation and provided content.
 */
export declare const zElicitationAcceptAction: z.ZodObject<{
    content: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString>]>>>>;
}, z.core.$strip>;
/**
 * Response from the client to an elicitation request.
 *
 * Custom variants (unknown `action` values) keep their extra
 * properties exactly as received; unlike known variants, those keys
 * bypass lenient-field salvage and arrive unvalidated.
 */
export declare const zCreateElicitationResponse: z.ZodType<(({
    content?: Record<string, string | number | boolean | string[]> | null | undefined;
} & {
    action: "accept";
}) | {
    action: "decline";
} | {
    action: "cancel";
} | {
    action: string;
}) & {
    _meta?: Record<string, unknown> | null | undefined;
}, (({
    content?: Record<string, string | number | boolean | string[]> | null | undefined;
} & {
    action: "accept";
}) | {
    action: "decline";
} | {
    action: "cancel";
} | {
    action: string;
}) & {
    _meta?: Record<string, unknown> | null | undefined;
}, z.core.$ZodTypeInternals<(({
    content?: Record<string, string | number | boolean | string[]> | null | undefined;
} & {
    action: "accept";
}) | {
    action: "decline";
} | {
    action: "cancel";
} | {
    action: string;
}) & {
    _meta?: Record<string, unknown> | null | undefined;
}, (({
    content?: Record<string, string | number | boolean | string[]> | null | undefined;
} & {
    action: "accept";
}) | {
    action: "decline";
} | {
    action: "cancel";
} | {
    action: string;
}) & {
    _meta?: Record<string, unknown> | null | undefined;
}>>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/connect`.
 *
 * @experimental
 */
export declare const zConnectMcpResponse: z.ZodObject<{
    connectionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/disconnect`.
 *
 * @experimental
 */
export declare const zDisconnectMcpResponse: z.ZodObject<{
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A JSON-RPC response object.
 */
export declare const zClientResponse: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    result: z.ZodUnion<readonly [z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        content: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        outcome: z.ZodUnion<readonly [z.ZodObject<{
            outcome: z.ZodLiteral<"cancelled">;
        }, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
            optionId: z.ZodString;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>, z.ZodObject<{
            outcome: z.ZodLiteral<"selected">;
        }, z.core.$strip>>]>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        terminalId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        output: z.ZodString;
        truncated: z.ZodBoolean;
        exitStatus: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodObject<{
            exitCode: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
            signal: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        exitCode: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodInt>>>;
        signal: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodType<(({
        content?: Record<string, string | number | boolean | string[]> | null | undefined;
    } & {
        action: "accept";
    }) | {
        action: "decline";
    } | {
        action: "cancel";
    } | {
        action: string;
    }) & {
        _meta?: Record<string, unknown> | null | undefined;
    }, (({
        content?: Record<string, string | number | boolean | string[]> | null | undefined;
    } & {
        action: "accept";
    }) | {
        action: "decline";
    } | {
        action: "cancel";
    } | {
        action: string;
    }) & {
        _meta?: Record<string, unknown> | null | undefined;
    }, z.core.$ZodTypeInternals<(({
        content?: Record<string, string | number | boolean | string[]> | null | undefined;
    } & {
        action: "accept";
    }) | {
        action: "decline";
    } | {
        action: "cancel";
    } | {
        action: string;
    }) & {
        _meta?: Record<string, unknown> | null | undefined;
    }, (({
        content?: Record<string, string | number | boolean | string[]> | null | undefined;
    } & {
        action: "accept";
    }) | {
        action: "decline";
    } | {
        action: "cancel";
    } | {
        action: string;
    }) & {
        _meta?: Record<string, unknown> | null | undefined;
    }>>, z.ZodObject<{
        connectionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown, z.ZodUnknown]>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    error: z.ZodObject<{
        code: z.ZodUnion<readonly [z.ZodLiteral<-32700>, z.ZodLiteral<-32600>, z.ZodLiteral<-32601>, z.ZodLiteral<-32602>, z.ZodLiteral<-32603>, z.ZodLiteral<-32800>, z.ZodLiteral<-32000>, z.ZodLiteral<-32002>, z.ZodInt]>;
        message: z.ZodString;
        data: z.ZodCatch<z.ZodOptional<z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>]>;
/**
 * Notification to cancel ongoing operations for a session.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
 */
export declare const zCancelNotification: z.ZodObject<{
    sessionId: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a file is opened in the editor.
 */
export declare const zDidOpenDocumentNotification: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    languageId: z.ZodString;
    version: z.ZodNumber;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A content change event for a document.
 *
 * When `range` is `None`, `text` is the full content of the document.
 * When `range` is `Some`, `text` replaces the given range.
 */
export declare const zTextDocumentContentChangeEvent: z.ZodObject<{
    range: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>>>;
    text: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a file is edited.
 */
export declare const zDidChangeDocumentNotification: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    version: z.ZodNumber;
    contentChanges: z.ZodType<{
        text: string;
        range?: {
            start: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            end: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        text: string;
        range?: {
            start: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            end: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], z.core.$ZodTypeInternals<{
        text: string;
        range?: {
            start: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            end: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[], {
        text: string;
        range?: {
            start: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            end: {
                line: number;
                character: number;
                _meta?: Record<string, unknown> | null | undefined;
            };
            _meta?: Record<string, unknown> | null | undefined;
        } | null | undefined;
        _meta?: Record<string, unknown> | null | undefined;
    }[]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a file is closed.
 */
export declare const zDidCloseDocumentNotification: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a file is saved.
 */
export declare const zDidSaveDocumentNotification: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a file becomes the active editor tab.
 */
export declare const zDidFocusDocumentNotification: z.ZodObject<{
    sessionId: z.ZodString;
    uri: z.ZodString;
    version: z.ZodNumber;
    position: z.ZodObject<{
        line: z.ZodInt;
        character: z.ZodInt;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    visibleRange: z.ZodObject<{
        start: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        end: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * Notification sent when a suggestion is accepted.
 */
export declare const zAcceptNesNotification: z.ZodObject<{
    sessionId: z.ZodString;
    id: z.ZodString;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * The reason a suggestion was rejected.
 */
export declare const zNesRejectReason: z.ZodUnion<readonly [z.ZodLiteral<"rejected">, z.ZodLiteral<"ignored">, z.ZodLiteral<"replaced">, z.ZodLiteral<"cancelled">]>;
/**
 * Notification sent when a suggestion is rejected.
 */
export declare const zRejectNesNotification: z.ZodObject<{
    sessionId: z.ZodString;
    id: z.ZodString;
    reason: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"rejected">, z.ZodLiteral<"ignored">, z.ZodLiteral<"replaced">, z.ZodLiteral<"cancelled">]>>>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;
/**
 * A JSON-RPC notification object.
 */
export declare const zClientNotification: z.ZodObject<{
    method: z.ZodString;
    params: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{
        sessionId: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        languageId: z.ZodString;
        version: z.ZodNumber;
        text: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        version: z.ZodNumber;
        contentChanges: z.ZodType<{
            text: string;
            range?: {
                start: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                end: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            text: string;
            range?: {
                start: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                end: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], z.core.$ZodTypeInternals<{
            text: string;
            range?: {
                start: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                end: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[], {
            text: string;
            range?: {
                start: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                end: {
                    line: number;
                    character: number;
                    _meta?: Record<string, unknown> | null | undefined;
                };
                _meta?: Record<string, unknown> | null | undefined;
            } | null | undefined;
            _meta?: Record<string, unknown> | null | undefined;
        }[]>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        uri: z.ZodString;
        version: z.ZodNumber;
        position: z.ZodObject<{
            line: z.ZodInt;
            character: z.ZodInt;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        visibleRange: z.ZodObject<{
            start: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            end: z.ZodObject<{
                line: z.ZodInt;
                character: z.ZodInt;
                _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
            }, z.core.$strip>;
            _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        }, z.core.$strip>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        id: z.ZodString;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        sessionId: z.ZodString;
        id: z.ZodString;
        reason: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodLiteral<"rejected">, z.ZodLiteral<"ignored">, z.ZodLiteral<"replaced">, z.ZodLiteral<"cancelled">]>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodObject<{
        connectionId: z.ZodString;
        method: z.ZodString;
        params: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
        _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
    }, z.core.$strip>, z.ZodUnknown]>>>;
}, z.core.$strip>;
/**
 * Notification to cancel an ongoing request.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/cancellation)
 */
export declare const zCancelRequestNotification: z.ZodObject<{
    requestId: z.ZodNullable<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>;
    _meta: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, z.core.$strip>;

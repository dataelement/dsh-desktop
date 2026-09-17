/** Extract and join text from message content. */
export function contentText(content, separator = "\n") {
    if (typeof content === "string")
        return content;
    return content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(separator);
}
//# sourceMappingURL=text.js.map
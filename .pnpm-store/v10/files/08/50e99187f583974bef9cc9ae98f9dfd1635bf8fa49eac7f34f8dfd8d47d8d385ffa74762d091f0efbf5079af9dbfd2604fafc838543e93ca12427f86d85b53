type ModeWriter = (doc: Doc, modes: {
    execution: "sync" | "async";
}) => void;
export declare class Doc {
    args: string[];
    /** Bindings the compiled function closes over, by name. */
    closed: Record<string, unknown>;
    content: string[];
    indent: number;
    constructor(args?: string[], closed?: Record<string, unknown>);
    indented(fn: (doc: Doc) => void): void;
    write(fn: ModeWriter): void;
    write(line: string): void;
    compile(): any;
}
export {};

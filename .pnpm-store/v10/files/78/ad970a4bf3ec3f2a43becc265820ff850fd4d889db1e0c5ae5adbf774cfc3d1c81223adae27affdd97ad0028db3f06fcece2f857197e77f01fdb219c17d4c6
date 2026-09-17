import { Nullish } from "builder-util-runtime";
type Handler = (...args: any[]) => Promise<void> | void;
export type HandlerType = "system" | "user";
type Handle = {
    handler: Handler;
    type: HandlerType;
};
export type EventMap = {
    [key: string]: Handler;
};
interface TypedEventEmitter<Events extends EventMap> {
    on<E extends keyof Events>(event: E, listener: Events[E] | Nullish, type: HandlerType): this;
    off<E extends keyof Events>(event: E, listener: Events[E] | Nullish): this;
    emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): Promise<{
        emittedSystem: boolean;
        emittedUser: boolean;
    }>;
    filterListeners<E extends keyof Events>(event: E, type: HandlerType): Handle[];
    clear(): void;
}
export declare class AsyncEventEmitter<T extends EventMap> implements TypedEventEmitter<T> {
    private readonly listeners;
    private readonly cancellationToken;
    on<E extends keyof T>(event: E, listener: T[E] | Nullish, type?: HandlerType): this;
    off<E extends keyof T>(event: E, listener: T[E] | Nullish): this;
    emit<E extends keyof T>(event: E, ...args: Parameters<T[E]>): Promise<{
        emittedSystem: boolean;
        emittedUser: boolean;
    }>;
    filterListeners<E extends keyof T>(event: E, type: HandlerType | undefined): Handle[];
    clear(): void;
}
export {};

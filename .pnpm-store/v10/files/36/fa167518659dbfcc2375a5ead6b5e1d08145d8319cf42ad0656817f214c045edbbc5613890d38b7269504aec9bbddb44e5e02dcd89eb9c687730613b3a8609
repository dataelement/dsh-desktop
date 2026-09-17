import { Context } from '@deepseek-ai/cordis';
import type { Dict } from '@deepseek-ai/cosmokit';
import { Entry } from './entry.ts';
declare module './entry.ts' {
    interface EntryOptions {
        intercept?: Dict | null;
        isolate?: Dict<true | string> | null;
    }
    interface Entry {
        realm: LocalRealm;
    }
}
/** Symbol realm used to isolate service implementations by entry or label. */
export declare abstract class Realm {
    protected store: Dict<symbol>;
    abstract get suffix(): string;
    access(key: string, create?: boolean): symbol;
    delete(key: string): void;
    get size(): number;
}
/** Entry-local isolation realm. */
export declare class LocalRealm extends Realm {
    private entry;
    constructor(entry: Entry);
    get suffix(): string;
}
/** Named isolation realm shared by entries that use the same label. */
export declare class GlobalRealm extends Realm {
    label: string;
    constructor(label: string);
    get suffix(): string;
}
/** Install loader hooks that apply `intercept` and `isolate` entry options. */
export default function isolate(ctx: Context): void;
//# sourceMappingURL=isolate.d.ts.map
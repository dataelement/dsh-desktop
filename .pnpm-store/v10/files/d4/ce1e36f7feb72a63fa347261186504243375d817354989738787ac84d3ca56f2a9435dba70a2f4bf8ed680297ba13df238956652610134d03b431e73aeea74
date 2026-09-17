import { BlockMap } from "builder-util-runtime/out/blockMapApi";
import { Logger } from "../types";
export declare enum OperationKind {
    COPY = 0,
    DOWNLOAD = 1
}
export interface Operation {
    kind: OperationKind;
    start: number;
    end: number;
}
export declare function computeOperations(oldBlockMap: BlockMap, newBlockMap: BlockMap, logger: Logger): Array<Operation>;

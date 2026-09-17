import { IncomingMessage } from "http";
import { Writable } from "stream";
import { DifferentialDownloader } from "./DifferentialDownloader";
import { Operation } from "./downloadPlanBuilder";
export declare function executeTasksUsingMultipleRangeRequests(differentialDownloader: DifferentialDownloader, tasks: Array<Operation>, out: Writable, oldFileFd: number, reject: (error: Error) => void): (taskOffset: number) => void;
export declare function checkIsRangesSupported(response: IncomingMessage, reject: (error: Error) => void): boolean;

import { AppUpdater } from "./AppUpdater";
import { UpdateInfo } from "builder-util-runtime";
export { BaseUpdater } from "./BaseUpdater";
export { AppUpdater, NoOpLogger } from "./AppUpdater";
export { Provider } from "./providers/Provider";
export { AppImageUpdater } from "./AppImageUpdater";
export { DebUpdater } from "./DebUpdater";
export { PacmanUpdater } from "./PacmanUpdater";
export { RpmUpdater } from "./RpmUpdater";
export { MacUpdater } from "./MacUpdater";
export { NsisUpdater } from "./NsisUpdater";
export * from "./types";
export declare const autoUpdater: AppUpdater;
/**
 * return null if verify signature succeed
 * return error message if verify signature failed
 */
export type VerifyUpdateCodeSignature = (publisherName: string[], path: string) => Promise<string | null>;
export type VerifyUpdateSupport = (updateInfo: UpdateInfo) => boolean | Promise<boolean>;

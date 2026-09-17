import { Arch } from "builder-util";
import { PublishConfiguration, UpdateInfo } from "builder-util-runtime";
import { Packager } from "../packager";
import { ArtifactCreated } from "../packagerApi";
import { PlatformPackager } from "../platformPackager";
export interface UpdateInfoFileTask {
    readonly file: string;
    readonly info: UpdateInfo;
    readonly publishConfiguration: PublishConfiguration;
    readonly packager: PlatformPackager<any>;
    readonly arch?: Arch | null;
}
export declare function createUpdateInfoTasks(event: ArtifactCreated, _publishConfigs: Array<PublishConfiguration>): Promise<Array<UpdateInfoFileTask>>;
export declare function writeUpdateInfoFiles(updateInfoFileTasks: Array<UpdateInfoFileTask>, packager: Packager): Promise<void>;

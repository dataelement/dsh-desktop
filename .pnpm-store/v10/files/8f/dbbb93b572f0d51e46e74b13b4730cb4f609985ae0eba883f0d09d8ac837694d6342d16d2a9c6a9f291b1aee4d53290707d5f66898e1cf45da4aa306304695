#! /usr/bin/env node
import { PublishOptions, UploadTask } from "app-builder-lib";
import { Publish } from "app-builder-lib/out/core";
import { PublishPolicy } from "electron-publish";
export declare function publish(args: {
    files: string[];
    version: string | undefined;
    configurationFilePath: string | undefined;
    policy: PublishPolicy;
}): Promise<UploadTask[] | null>;
export declare function publishArtifactsWithOptions(uploadOptions: {
    file: string;
    arch: string | null;
}[], buildVersion?: string, configurationFilePath?: string, publishConfiguration?: Publish, publishOptions?: PublishOptions): Promise<UploadTask[] | null>;

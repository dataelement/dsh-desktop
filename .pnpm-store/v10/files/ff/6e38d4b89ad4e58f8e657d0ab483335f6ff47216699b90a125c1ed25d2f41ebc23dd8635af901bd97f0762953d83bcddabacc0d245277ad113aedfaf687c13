import { AppAdapter } from "./AppAdapter";
export declare class ElectronAppAdapter implements AppAdapter {
    private readonly app;
    constructor(app?: any);
    whenReady(): Promise<void>;
    get version(): string;
    get name(): string;
    get isPackaged(): boolean;
    get appUpdateConfigPath(): string;
    get userDataPath(): string;
    get baseCachePath(): string;
    quit(): void;
    relaunch(): void;
    onQuit(handler: (exitCode: number) => void): void;
}

export interface ExternalCliInstall {
    mac?: string;
    linux?: string;
    windows?: string;
    default?: string;
}
export interface ExternalCliConfig {
    name: string;
    binary: string;
    description?: string;
    homepage?: string;
    tags?: string[];
    install?: ExternalCliInstall;
}
export declare function loadExternalClis(): ExternalCliConfig[];
export declare function isBinaryInstalled(binary: string): boolean;
export declare function getInstallCmd(installConfig?: ExternalCliInstall): string | null;
export declare function installExternalCli(cli: ExternalCliConfig): boolean;
export declare function executeExternalCli(name: string, args: string[], preloaded?: ExternalCliConfig[]): void;
export interface RegisterOptions {
    binary?: string;
    install?: string;
    description?: string;
}
export declare function registerExternalCli(name: string, opts?: RegisterOptions): void;

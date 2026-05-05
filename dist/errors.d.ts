/**
 * Unified error types for opencli.
 *
 * All errors thrown by the framework should extend CliError so that
 * the top-level handler in main.ts can render consistent, helpful output.
 */
export declare class CliError extends Error {
    /** Machine-readable error code (e.g. 'BROWSER_CONNECT', 'ADAPTER_LOAD') */
    readonly code: string;
    /** Human-readable hint on how to fix the problem */
    readonly hint?: string;
    constructor(code: string, message: string, hint?: string);
}
export declare class BrowserConnectError extends CliError {
    constructor(message: string, hint?: string);
}
export declare class AdapterLoadError extends CliError {
    constructor(message: string, hint?: string);
}
export declare class CommandExecutionError extends CliError {
    constructor(message: string, hint?: string);
}
export declare class ConfigError extends CliError {
    constructor(message: string, hint?: string);
}

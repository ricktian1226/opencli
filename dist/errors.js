/**
 * Unified error types for opencli.
 *
 * All errors thrown by the framework should extend CliError so that
 * the top-level handler in main.ts can render consistent, helpful output.
 */
export class CliError extends Error {
    /** Machine-readable error code (e.g. 'BROWSER_CONNECT', 'ADAPTER_LOAD') */
    code;
    /** Human-readable hint on how to fix the problem */
    hint;
    constructor(code, message, hint) {
        super(message);
        this.name = 'CliError';
        this.code = code;
        this.hint = hint;
    }
}
export class BrowserConnectError extends CliError {
    constructor(message, hint) {
        super('BROWSER_CONNECT', message, hint);
        this.name = 'BrowserConnectError';
    }
}
export class AdapterLoadError extends CliError {
    constructor(message, hint) {
        super('ADAPTER_LOAD', message, hint);
        this.name = 'AdapterLoadError';
    }
}
export class CommandExecutionError extends CliError {
    constructor(message, hint) {
        super('COMMAND_EXEC', message, hint);
        this.name = 'CommandExecutionError';
    }
}
export class ConfigError extends CliError {
    constructor(message, hint) {
        super('CONFIG', message, hint);
        this.name = 'ConfigError';
    }
}

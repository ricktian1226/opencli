import type { IPage } from './types.js';
/**
 * Returns the appropriate browser factory based on environment config.
 * Uses CDPBridge when OPENCLI_CDP_ENDPOINT is set, otherwise BrowserBridge.
 */
export declare function getBrowserFactory(): new () => IBrowserFactory;
export declare const DEFAULT_BROWSER_CONNECT_TIMEOUT: number;
export declare const DEFAULT_BROWSER_COMMAND_TIMEOUT: number;
export declare const DEFAULT_BROWSER_EXPLORE_TIMEOUT: number;
export declare const DEFAULT_BROWSER_SMOKE_TIMEOUT: number;
/**
 * Timeout with seconds unit. Used for high-level command timeouts.
 */
export declare function runWithTimeout<T>(promise: Promise<T>, opts: {
    timeout: number;
    label?: string;
}): Promise<T>;
/**
 * Timeout with milliseconds unit. Used for low-level internal timeouts.
 */
export declare function withTimeoutMs<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T>;
/** Interface for browser factory (BrowserBridge or test mocks) */
export interface IBrowserFactory {
    connect(opts?: {
        timeout?: number;
        workspace?: string;
    }): Promise<IPage>;
    close(): Promise<void>;
}
export declare function browserSession<T>(BrowserFactory: new () => IBrowserFactory, fn: (page: IPage) => Promise<T>, opts?: {
    workspace?: string;
}): Promise<T>;

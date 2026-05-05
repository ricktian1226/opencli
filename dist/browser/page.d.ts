/**
 * Page abstraction — implements IPage by sending commands to the daemon.
 *
 * All browser operations are ultimately 'exec' (JS evaluation via CDP)
 * plus a few native Chrome Extension APIs (tabs, cookies, navigate).
 *
 * IMPORTANT: After goto(), we remember the tabId returned by the navigate
 * action and pass it to all subsequent commands. This avoids the issue
 * where resolveTabId() in the extension picks a chrome:// or
 * chrome-extension:// tab that can't be debugged.
 */
import type { IPage } from '../types.js';
/**
 * Page — implements IPage by talking to the daemon via HTTP.
 */
export declare class Page implements IPage {
    private readonly workspace;
    constructor(workspace?: string);
    /** Active tab ID, set after navigate and used in all subsequent commands */
    private _tabId;
    /** Helper: spread tabId into command params if we have one */
    private _tabOpt;
    private _workspaceOpt;
    goto(url: string, options?: {
        waitUntil?: 'load' | 'none';
        settleMs?: number;
    }): Promise<void>;
    /** Close the automation window in the extension */
    closeWindow(): Promise<void>;
    evaluate(js: string): Promise<any>;
    getCookies(opts?: {
        domain?: string;
        url?: string;
    }): Promise<any[]>;
    snapshot(opts?: {
        interactive?: boolean;
        compact?: boolean;
        maxDepth?: number;
        raw?: boolean;
    }): Promise<any>;
    click(ref: string): Promise<void>;
    typeText(ref: string, text: string): Promise<void>;
    pressKey(key: string): Promise<void>;
    wait(options: number | {
        text?: string;
        time?: number;
        timeout?: number;
    }): Promise<void>;
    tabs(): Promise<any>;
    closeTab(index?: number): Promise<void>;
    newTab(): Promise<void>;
    selectTab(index: number): Promise<void>;
    networkRequests(includeStatic?: boolean): Promise<any>;
    /**
     * Console messages are not available in lightweight daemon mode.
     * Would require CDP Runtime.consoleAPICalled event listener.
     * @returns Always returns empty array.
     */
    consoleMessages(_level?: string): Promise<any>;
    /**
     * Capture a screenshot via CDP Page.captureScreenshot.
     * @param options.format - 'png' (default) or 'jpeg'
     * @param options.quality - JPEG quality 0-100
     * @param options.fullPage - capture full scrollable page
     * @param options.path - save to file path (returns base64 if omitted)
     */
    screenshot(options?: {
        format?: 'png' | 'jpeg';
        quality?: number;
        fullPage?: boolean;
        path?: string;
    }): Promise<string>;
    scroll(direction?: string, amount?: number): Promise<void>;
    autoScroll(options?: {
        times?: number;
        delayMs?: number;
    }): Promise<void>;
    installInterceptor(pattern: string): Promise<void>;
    getInterceptedRequests(): Promise<any[]>;
}

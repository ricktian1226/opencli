/**
 * Browser session manager — auto-spawns daemon and provides IPage.
 */
import type { IPage } from '../types.js';
export type BrowserBridgeState = 'idle' | 'connecting' | 'connected' | 'closing' | 'closed';
/**
 * Browser factory: manages daemon lifecycle and provides IPage instances.
 */
export declare class BrowserBridge {
    private _state;
    private _page;
    private _daemonProc;
    get state(): BrowserBridgeState;
    connect(opts?: {
        timeout?: number;
        workspace?: string;
    }): Promise<IPage>;
    close(): Promise<void>;
    private _ensureDaemon;
}
/** @deprecated Use BrowserBridge instead */
export declare const PlaywrightMCP: typeof BrowserBridge;

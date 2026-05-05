/**
 * CDP client — implements IPage by connecting directly to a Chrome/Electron CDP WebSocket.
 *
 * Fixes applied:
 * - send() now has a 30s timeout guard (P0 #4)
 * - goto() waits for Page.loadEventFired instead of hardcoded 1s sleep (P1 #3)
 * - Implemented scroll, autoScroll, screenshot, networkRequests (P1 #2)
 * - Shared DOM helper methods extracted to reduce duplication with Page (P1 #5)
 */
import type { IPage } from '../types.js';
export interface CDPTarget {
    type?: string;
    url?: string;
    title?: string;
    webSocketDebuggerUrl?: string;
}
export declare class CDPBridge {
    private _ws;
    private _idCounter;
    private _pending;
    private _eventListeners;
    connect(opts?: {
        timeout?: number;
        workspace?: string;
    }): Promise<IPage>;
    close(): Promise<void>;
    /** Send a CDP command with timeout guard (P0 fix #4) */
    send(method: string, params?: any, timeoutMs?: number): Promise<any>;
    /** Listen for a CDP event */
    on(event: string, handler: (params: any) => void): void;
    /** Remove a CDP event listener */
    off(event: string, handler: (params: any) => void): void;
    /** Wait for a CDP event to fire (one-shot) */
    waitForEvent(event: string, timeoutMs?: number): Promise<any>;
}
declare function selectCDPTarget(targets: CDPTarget[]): CDPTarget | undefined;
declare function scoreCDPTarget(target: CDPTarget, preferredPattern?: RegExp): number;
export declare const __test__: {
    selectCDPTarget: typeof selectCDPTarget;
    scoreCDPTarget: typeof scoreCDPTarget;
};
export {};

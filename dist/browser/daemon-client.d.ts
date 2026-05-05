/**
 * HTTP client for communicating with the opencli daemon.
 *
 * Provides a typed send() function that posts a Command and returns a Result.
 */
export interface DaemonCommand {
    id: string;
    action: 'exec' | 'navigate' | 'tabs' | 'cookies' | 'screenshot' | 'close-window' | 'sessions';
    tabId?: number;
    code?: string;
    workspace?: string;
    url?: string;
    op?: string;
    index?: number;
    domain?: string;
    format?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
}
export interface DaemonResult {
    id: string;
    ok: boolean;
    data?: unknown;
    error?: string;
}
/**
 * Check if daemon is running.
 */
export declare function isDaemonRunning(): Promise<boolean>;
/**
 * Check if daemon is running AND the extension is connected.
 */
export declare function isExtensionConnected(): Promise<boolean>;
/**
 * Send a command to the daemon and wait for a result.
 * Retries up to 3 times with 500ms delay for transient failures.
 */
export declare function sendCommand(action: DaemonCommand['action'], params?: Omit<DaemonCommand, 'id' | 'action'>): Promise<unknown>;
export declare function listSessions(): Promise<any[]>;

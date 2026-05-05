/**
 * Browser connection error helpers.
 *
 * Simplified — no more token/extension/CDP classification.
 * The daemon architecture has a single failure mode: daemon not reachable or extension not connected.
 */
export type ConnectFailureKind = 'daemon-not-running' | 'extension-not-connected' | 'command-failed' | 'unknown';
export declare function formatBrowserConnectError(kind: ConnectFailureKind, detail?: string): Error;

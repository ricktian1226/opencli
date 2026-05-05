/**
 * Daemon discovery — simplified from MCP server path discovery.
 *
 * Only needs to check if the daemon is running. No more file system
 * scanning for @playwright/mcp locations.
 */
import { isDaemonRunning } from './daemon-client.js';
export { isDaemonRunning };
/**
 * Check daemon status and return connection info.
 */
export declare function checkDaemonStatus(): Promise<{
    running: boolean;
    extensionConnected: boolean;
}>;

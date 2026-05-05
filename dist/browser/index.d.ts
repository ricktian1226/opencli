/**
 * Browser module — public API re-exports.
 *
 * This barrel replaces the former monolithic browser.ts.
 * External code should import from './browser/index.js' (or './browser.js' via Node resolution).
 */
export { Page } from './page.js';
export { BrowserBridge, BrowserBridge as PlaywrightMCP } from './mcp.js';
export { CDPBridge } from './cdp.js';
export { isDaemonRunning } from './daemon-client.js';
import { extractTabEntries, diffTabIndexes, appendLimited } from './tabs.js';
import { withTimeoutMs } from '../runtime.js';
export declare const __test__: {
    extractTabEntries: typeof extractTabEntries;
    diffTabIndexes: typeof diffTabIndexes;
    appendLimited: typeof appendLimited;
    withTimeoutMs: typeof withTimeoutMs;
    selectCDPTarget: (targets: import("./cdp.js").CDPTarget[]) => import("./cdp.js").CDPTarget | undefined;
    scoreCDPTarget: (target: import("./cdp.js").CDPTarget, preferredPattern?: RegExp) => number;
};

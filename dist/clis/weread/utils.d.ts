/**
 * WeRead shared helpers: fetch wrappers and formatting.
 *
 * Two API domains:
 * - WEB_API (weread.qq.com/web/*): public, Node.js fetch
 * - API (i.weread.qq.com/*): private, browser page.evaluate with cookies
 */
import type { IPage } from '../../types.js';
/**
 * Fetch a public WeRead web endpoint (Node.js direct fetch).
 * Used by search and ranking commands (browser: false).
 */
export declare function fetchWebApi(path: string, params?: Record<string, string>): Promise<any>;
/**
 * Fetch a private WeRead API endpoint via browser page.evaluate.
 * Automatically carries cookies for authenticated requests.
 */
export declare function fetchWithPage(page: IPage, path: string, params?: Record<string, string>): Promise<any>;
/** Format a Unix timestamp (seconds) to YYYY-MM-DD in UTC+8. Returns '-' for invalid input. */
export declare function formatDate(ts: number | undefined | null): string;

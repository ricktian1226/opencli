/**
 * Shared DOM operation JS generators.
 *
 * Used by both Page (daemon mode) and CDPPage (direct CDP mode)
 * to eliminate code duplication for click, type, press, wait, scroll, etc.
 */
/** Generate JS to click an element by ref */
export declare function clickJs(ref: string): string;
/** Generate JS to type text into an element by ref */
export declare function typeTextJs(ref: string, text: string): string;
/** Generate JS to press a keyboard key */
export declare function pressKeyJs(key: string): string;
/** Generate JS to wait for text to appear in the page */
export declare function waitForTextJs(text: string, timeoutMs: number): string;
/** Generate JS for scroll */
export declare function scrollJs(direction: string, amount: number): string;
/** Generate JS for auto-scroll with lazy-load detection */
export declare function autoScrollJs(times: number, delayMs: number): string;
/** Generate JS to read performance resource entries as network requests */
export declare function networkRequestsJs(includeStatic: boolean): string;

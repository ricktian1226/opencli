/**
 * Wikipedia adapter utilities.
 *
 * Uses the public MediaWiki REST API and Action API — no key required.
 * REST API: https://en.wikipedia.org/api/rest_v1/
 * Action API: https://en.wikipedia.org/w/api.php
 */
export declare function wikiFetch(lang: string, path: string): Promise<unknown>;

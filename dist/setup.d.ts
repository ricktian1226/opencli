/**
 * setup.ts — Interactive browser setup for opencli
 *
 * Simplified for daemon-based architecture. No more token management.
 * Just verifies daemon + extension connectivity.
 */
export declare function runSetup(opts?: {
    cliVersion?: string;
    token?: string;
}): Promise<void>;

/**
 * Shared Apple Podcasts utilities.
 *
 * Uses the public iTunes Search API — no API key required.
 * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
export declare function itunesFetch(path: string): Promise<any>;
/** Format milliseconds to mm:ss. Returns '-' for missing input. */
export declare function formatDuration(ms: number): string;
/** Format ISO date string to YYYY-MM-DD. Returns '-' for missing input. */
export declare function formatDate(iso: string): string;

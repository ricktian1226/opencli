/**
 * Shared YouTube utilities — URL parsing, video ID extraction, etc.
 */
/**
 * Extract a YouTube video ID from a URL or bare video ID string.
 * Supports: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/
 */
export declare function parseVideoId(input: string): string;

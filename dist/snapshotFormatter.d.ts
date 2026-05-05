/**
 * Aria snapshot formatter: parses Playwright MCP snapshot text into clean format.
 *
 * Multi-pass pipeline:
 * 1. Parse & filter: strip annotations, metadata, noise roles, ads, decorators
 * 2. Deduplicate: generic/text child matching parent label
 * 3. Deduplicate: heading + link with identical labels
 * 4. Deduplicate: nested identical links
 * 5. Prune: empty containers (iterative bottom-up)
 * 6. Collapse: single-child containers
 */
export interface FormatOptions {
    interactive?: boolean;
    compact?: boolean;
    maxDepth?: number;
    maxTextLength?: number;
}
export declare function formatSnapshot(raw: string, opts?: FormatOptions): string;

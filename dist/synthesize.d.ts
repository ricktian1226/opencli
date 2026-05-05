/**
 * Synthesize candidate CLIs from explore artifacts.
 * Generates evaluate-based YAML pipelines (matching hand-written adapter patterns).
 */
export declare function synthesizeFromExplore(target: string, opts?: {
    outDir?: string;
    top?: number;
}): Record<string, any>;
export declare function renderSynthesizeSummary(result: Record<string, any>): string;
export declare function resolveExploreDir(target: string): string;
export declare function loadExploreBundle(exploreDir: string): Record<string, any>;
/** Backward-compatible export for scaffold.ts */
export declare function buildCandidate(site: string, targetUrl: string, cap: any, endpoint: any): any;

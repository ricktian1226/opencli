/**
 * Deep Explore: intelligent API discovery with response analysis.
 *
 * Navigates to the target URL, auto-scrolls to trigger lazy loading,
 * captures network traffic, analyzes JSON responses, and automatically
 * infers CLI capabilities from discovered API endpoints.
 */
export declare function detectSiteName(url: string): string;
export declare function slugify(value: string): string;
export interface DiscoveredStore {
    type: 'pinia' | 'vuex';
    id: string;
    actions: string[];
    stateKeys: string[];
}
export declare function exploreUrl(url: string, opts: {
    BrowserFactory: new () => any;
    site?: string;
    goal?: string;
    authenticated?: boolean;
    outDir?: string;
    waitSeconds?: number;
    query?: string;
    clickLabels?: string[];
    auto?: boolean;
    workspace?: string;
}): Promise<Record<string, any>>;
export declare function renderExploreSummary(result: Record<string, any>): string;

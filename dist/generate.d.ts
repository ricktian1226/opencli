/**
 * Generate: one-shot CLI creation from URL.
 *
 * Orchestrates the full pipeline:
 *   explore (Deep Explore) → synthesize (YAML generation) → register → verify
 *
 * Includes Strategy Cascade: if the initial strategy fails,
 * automatically downgrades and retries.
 */
export declare function generateCliFromUrl(opts: any): Promise<any>;
export declare function renderGenerateSummary(r: any): string;

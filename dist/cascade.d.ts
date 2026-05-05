/**
 * Strategy Cascade: automatic strategy downgrade chain.
 *
 * Probes an API endpoint starting from the simplest strategy (PUBLIC)
 * and automatically downgrades through the strategy tiers until one works:
 *
 *   PUBLIC → COOKIE → HEADER → INTERCEPT → UI
 *
 * This eliminates the need for manual strategy selection — the system
 * automatically finds the minimum-privilege strategy that works.
 */
import { Strategy } from './registry.js';
import type { IPage } from './types.js';
interface ProbeResult {
    strategy: Strategy;
    success: boolean;
    statusCode?: number;
    hasData?: boolean;
    error?: string;
    responsePreview?: string;
}
interface CascadeResult {
    bestStrategy: Strategy;
    probes: ProbeResult[];
    confidence: number;
}
/**
 * Probe an endpoint with a specific strategy.
 * Returns whether the probe succeeded and basic response info.
 */
export declare function probeEndpoint(page: IPage, url: string, strategy: Strategy, _opts?: {
    timeout?: number;
}): Promise<ProbeResult>;
/**
 * Run the cascade: try each strategy in order until one works.
 * Returns the simplest working strategy.
 */
export declare function cascadeProbe(page: IPage, url: string, opts?: {
    maxStrategy?: Strategy;
    timeout?: number;
}): Promise<CascadeResult>;
/**
 * Render cascade results for display.
 */
export declare function renderCascadeResult(result: CascadeResult): string;
export {};

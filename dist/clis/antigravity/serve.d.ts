/**
 * antigravity serve — Anthropic-compatible `/v1/messages` proxy server.
 *
 * Starts an HTTP server that accepts Anthropic Messages API requests,
 * forwards them to a running Antigravity app via CDP, polls for the response,
 * and returns it in Anthropic format.
 *
 * Usage:
 *   OPENCLI_CDP_ENDPOINT=http://127.0.0.1:9224 opencli antigravity serve --port 8082
 *   ANTHROPIC_BASE_URL=http://localhost:8082 claude
 */
export declare function startServe(opts?: {
    port?: number;
}): Promise<void>;

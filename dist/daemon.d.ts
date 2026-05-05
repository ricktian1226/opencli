/**
 * opencli micro-daemon — HTTP + WebSocket bridge between CLI and Chrome Extension.
 *
 * Architecture:
 *   CLI → HTTP POST /command → daemon → WebSocket → Extension
 *   Extension → WebSocket result → daemon → HTTP response → CLI
 *
 * Lifecycle:
 *   - Auto-spawned by opencli on first browser command
 *   - Auto-exits after 5 minutes of idle
 *   - Listens on localhost:19825
 */
export {};

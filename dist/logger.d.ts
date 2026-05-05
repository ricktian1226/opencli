/**
 * Unified logging for opencli.
 *
 * All framework output (warnings, debug info, errors) should go through
 * this module so that verbosity levels are respected consistently.
 */
export declare const log: {
    /** Informational message (always shown) */
    info(msg: string): void;
    /** Warning (always shown) */
    warn(msg: string): void;
    /** Error (always shown) */
    error(msg: string): void;
    /** Verbose output (only when OPENCLI_VERBOSE is set or -v flag) */
    verbose(msg: string): void;
    /** Debug output (only when DEBUG includes 'opencli') */
    debug(msg: string): void;
    /** Step-style debug (for pipeline steps, etc.) */
    step(stepNum: number, total: number, op: string, preview?: string): void;
    /** Step result summary */
    stepResult(summary: string): void;
};

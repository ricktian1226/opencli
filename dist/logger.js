/**
 * Unified logging for opencli.
 *
 * All framework output (warnings, debug info, errors) should go through
 * this module so that verbosity levels are respected consistently.
 */
import chalk from 'chalk';
function isVerbose() {
    return !!process.env.OPENCLI_VERBOSE;
}
function isDebug() {
    return !!process.env.DEBUG?.includes('opencli');
}
export const log = {
    /** Informational message (always shown) */
    info(msg) {
        process.stderr.write(`${chalk.blue('ℹ')}  ${msg}\n`);
    },
    /** Warning (always shown) */
    warn(msg) {
        process.stderr.write(`${chalk.yellow('⚠')}  ${msg}\n`);
    },
    /** Error (always shown) */
    error(msg) {
        process.stderr.write(`${chalk.red('✖')}  ${msg}\n`);
    },
    /** Verbose output (only when OPENCLI_VERBOSE is set or -v flag) */
    verbose(msg) {
        if (isVerbose()) {
            process.stderr.write(`${chalk.dim('[verbose]')} ${msg}\n`);
        }
    },
    /** Debug output (only when DEBUG includes 'opencli') */
    debug(msg) {
        if (isDebug()) {
            process.stderr.write(`${chalk.dim('[debug]')} ${msg}\n`);
        }
    },
    /** Step-style debug (for pipeline steps, etc.) */
    step(stepNum, total, op, preview = '') {
        process.stderr.write(`  ${chalk.dim(`[${stepNum}/${total}]`)} ${chalk.bold.cyan(op)}${preview}\n`);
    },
    /** Step result summary */
    stepResult(summary) {
        process.stderr.write(`       ${chalk.dim(`→ ${summary}`)}\n`);
    },
};

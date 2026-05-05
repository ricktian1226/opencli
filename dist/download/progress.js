/**
 * Download progress display: terminal progress bars, status updates.
 */
import chalk from 'chalk';
/**
 * Format bytes as human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
/**
 * Format milliseconds as human-readable duration.
 */
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60)
        return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}
/**
 * Create a simple progress bar for terminal display.
 */
export function createProgressBar(filename, index, total) {
    const prefix = chalk.dim(`[${index + 1}/${total}]`);
    const truncatedName = filename.length > 40 ? filename.slice(0, 37) + '...' : filename;
    return {
        update(current, totalBytes, label) {
            const percent = totalBytes > 0 ? Math.round((current / totalBytes) * 100) : 0;
            const bar = createBar(percent);
            const size = totalBytes > 0 ? formatBytes(totalBytes) : '';
            const extra = label ? ` ${label}` : '';
            process.stderr.write(`\r${prefix} ${truncatedName} ${bar} ${percent}% ${size}${extra}`);
        },
        complete(success, message) {
            const icon = success ? chalk.green('✓') : chalk.red('✗');
            const msg = message ? ` ${chalk.dim(message)}` : '';
            process.stderr.write(`\r${prefix} ${icon} ${truncatedName}${msg}\n`);
        },
        fail(error) {
            process.stderr.write(`\r${prefix} ${chalk.red('✗')} ${truncatedName} ${chalk.red(error)}\n`);
        },
    };
}
/**
 * Create a progress bar string.
 */
function createBar(percent, width = 20) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}
/**
 * Multi-file download progress tracker.
 */
export class DownloadProgressTracker {
    completed = 0;
    failed = 0;
    skipped = 0;
    total;
    startTime;
    verbose;
    constructor(total, verbose = true) {
        this.total = total;
        this.startTime = Date.now();
        this.verbose = verbose;
    }
    onFileStart(filename, index) {
        if (!this.verbose)
            return null;
        return createProgressBar(filename, index, this.total);
    }
    onFileComplete(success, skipped = false) {
        if (skipped) {
            this.skipped++;
        }
        else if (success) {
            this.completed++;
        }
        else {
            this.failed++;
        }
    }
    getSummary() {
        const elapsed = formatDuration(Date.now() - this.startTime);
        const parts = [];
        if (this.completed > 0) {
            parts.push(chalk.green(`${this.completed} downloaded`));
        }
        if (this.skipped > 0) {
            parts.push(chalk.yellow(`${this.skipped} skipped`));
        }
        if (this.failed > 0) {
            parts.push(chalk.red(`${this.failed} failed`));
        }
        return `${parts.join(', ')} in ${elapsed}`;
    }
    finish() {
        if (this.verbose) {
            process.stderr.write(`\n${chalk.bold('Download complete:')} ${this.getSummary()}\n`);
        }
    }
}

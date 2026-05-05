/**
 * Pipeline step: download — file download with concurrency and progress.
 *
 * Supports:
 * - Direct HTTP downloads (images, documents)
 * - yt-dlp integration for video platforms
 * - Browser cookie forwarding for authenticated downloads
 * - Filename templating and deduplication
 */
import type { IPage } from '../../types.js';
export interface DownloadResult {
    status: 'success' | 'skipped' | 'failed';
    path?: string;
    size?: number;
    error?: string;
    duration?: number;
}
/**
 * Download step handler for YAML pipelines.
 *
 * Usage in YAML:
 * ```yaml
 * pipeline:
 *   - download:
 *       url: ${{ item.imageUrl }}
 *       dir: ./downloads
 *       filename: ${{ item.title }}.jpg
 *       concurrency: 5
 *       skip_existing: true
 *       use_ytdlp: false
 *       type: auto
 * ```
 */
export declare function stepDownload(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;

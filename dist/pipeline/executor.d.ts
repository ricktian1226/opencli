/**
 * Pipeline executor: runs YAML pipeline steps sequentially.
 */
import type { IPage } from '../types.js';
export interface PipelineContext {
    args?: Record<string, any>;
    debug?: boolean;
}
export declare function executePipeline(page: IPage | null, pipeline: any[], ctx?: PipelineContext): Promise<any>;

/**
 * Pipeline template engine: ${{ ... }} expression rendering.
 */
export interface RenderContext {
    args?: Record<string, any>;
    data?: any;
    item?: any;
    index?: number;
}
export declare function render(template: any, ctx: RenderContext): any;
export declare function evalExpr(expr: string, ctx: RenderContext): any;
export declare function resolvePath(pathStr: string, ctx: RenderContext): any;
/**
 * Normalize JavaScript source for browser evaluate() calls.
 */
export declare function normalizeEvaluateSource(source: string): string;

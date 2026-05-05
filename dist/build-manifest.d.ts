#!/usr/bin/env node
/**
 * Build-time CLI manifest compiler.
 *
 * Scans all YAML/TS CLI definitions and pre-compiles them into a single
 * manifest.json for instant cold-start registration (no runtime YAML parsing).
 *
 * Usage: npx tsx src/build-manifest.ts
 * Output: dist/cli-manifest.json
 */
interface ManifestEntry {
    site: string;
    name: string;
    description: string;
    domain?: string;
    strategy: string;
    browser: boolean;
    args: Array<{
        name: string;
        type?: string;
        default?: any;
        required?: boolean;
        positional?: boolean;
        help?: string;
        choices?: string[];
    }>;
    columns?: string[];
    pipeline?: any[];
    timeout?: number;
    /** 'yaml' or 'ts' — determines how executeCommand loads the handler */
    type: 'yaml' | 'ts';
    /** Relative path from clis/ dir, e.g. 'bilibili/hot.yaml' or 'bilibili/search.js' */
    modulePath?: string;
}
export declare function parseTsArgsBlock(argsBlock: string): ManifestEntry['args'];
export declare function buildManifest(): ManifestEntry[];
export {};

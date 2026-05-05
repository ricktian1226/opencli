/**
 * CLI discovery: finds YAML/TS CLI definitions and registers them.
 *
 * Supports two modes:
 * 1. FAST PATH (manifest): If a pre-compiled cli-manifest.json exists,
 *    registers all YAML commands instantly without runtime YAML parsing.
 *    TS modules are loaded lazily only when their command is executed.
 * 2. FALLBACK (filesystem scan): Traditional runtime discovery for development.
 */
/** Plugins directory: ~/.opencli/plugins/ */
export declare const PLUGINS_DIR: string;
/**
 * Discover and register CLI commands.
 * Uses pre-compiled manifest when available for instant startup.
 */
export declare function discoverClis(...dirs: string[]): Promise<void>;
/**
 * Discover and register plugins from ~/.opencli/plugins/.
 * Each subdirectory is treated as a plugin (site = directory name).
 * Files inside are scanned flat (no nested site subdirs).
 */
export declare function discoverPlugins(): Promise<void>;

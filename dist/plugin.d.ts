/**
 * Plugin management: install, uninstall, and list plugins.
 *
 * Plugins live in ~/.opencli/plugins/<name>/.
 * Install source format: "github:user/repo"
 */
export interface PluginInfo {
    name: string;
    path: string;
    commands: string[];
    source?: string;
}
/**
 * Install a plugin from a source.
 * Currently supports "github:user/repo" format (git clone wrapper).
 */
export declare function installPlugin(source: string): string;
/**
 * Uninstall a plugin by name.
 */
export declare function uninstallPlugin(name: string): void;
/**
 * List all installed plugins.
 */
export declare function listPlugins(): PluginInfo[];
/** Parse a plugin source string into clone URL and name */
declare function parseSource(source: string): {
    cloneUrl: string;
    name: string;
} | null;
export { parseSource as _parseSource };

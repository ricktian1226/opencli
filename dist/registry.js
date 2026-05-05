/**
 * Core registry: Strategy enum, Arg/CliCommand interfaces, cli() registration.
 */
export var Strategy;
(function (Strategy) {
    Strategy["PUBLIC"] = "public";
    Strategy["COOKIE"] = "cookie";
    Strategy["HEADER"] = "header";
    Strategy["INTERCEPT"] = "intercept";
    Strategy["UI"] = "ui";
})(Strategy || (Strategy = {}));
// Use globalThis to ensure a single shared registry across all module instances.
// This is critical for TS plugins loaded via npm link / peerDependency — without
// this, the plugin's import creates a separate module instance with its own Map.
const REGISTRY_KEY = '__opencli_registry__';
const _registry = globalThis[REGISTRY_KEY] ??= new Map();
export function cli(opts) {
    const strategy = opts.strategy ?? (opts.browser === false ? Strategy.PUBLIC : Strategy.COOKIE);
    const browser = opts.browser ?? (strategy !== Strategy.PUBLIC);
    const cmd = {
        site: opts.site,
        name: opts.name,
        description: opts.description ?? '',
        domain: opts.domain,
        strategy,
        browser,
        args: opts.args ?? [],
        columns: opts.columns,
        func: opts.func,
        pipeline: opts.pipeline,
        timeoutSeconds: opts.timeoutSeconds,
        footerExtra: opts.footerExtra,
    };
    const key = fullName(cmd);
    _registry.set(key, cmd);
    return cmd;
}
export function getRegistry() {
    return _registry;
}
export function fullName(cmd) {
    return `${cmd.site}/${cmd.name}`;
}
export function strategyLabel(cmd) {
    return cmd.strategy ?? 'public';
}
export function registerCommand(cmd) {
    _registry.set(fullName(cmd), cmd);
}
// Re-export serialization helpers from their dedicated module
export { serializeArg, serializeCommand, formatArgSummary, formatRegistryHelpText } from './serialization.js';

/**
 * Core registry: Strategy enum, Arg/CliCommand interfaces, cli() registration.
 */
import type { IPage } from './types.js';
export declare enum Strategy {
    PUBLIC = "public",
    COOKIE = "cookie",
    HEADER = "header",
    INTERCEPT = "intercept",
    UI = "ui"
}
export interface Arg {
    name: string;
    type?: string;
    default?: unknown;
    required?: boolean;
    positional?: boolean;
    help?: string;
    choices?: string[];
}
export interface CliCommand {
    site: string;
    name: string;
    description: string;
    domain?: string;
    strategy?: Strategy;
    browser?: boolean;
    args: Arg[];
    columns?: string[];
    func?: (page: IPage, kwargs: Record<string, any>, debug?: boolean) => Promise<unknown>;
    pipeline?: Record<string, unknown>[];
    timeoutSeconds?: number;
    source?: string;
    footerExtra?: (kwargs: Record<string, any>) => string | undefined;
}
/** Internal extension for lazy-loaded TS modules (not exposed in public API) */
export interface InternalCliCommand extends CliCommand {
    _lazy?: boolean;
    _modulePath?: string;
}
export interface CliOptions extends Partial<Omit<CliCommand, 'args' | 'description'>> {
    site: string;
    name: string;
    description?: string;
    args?: Arg[];
}
export declare function cli(opts: CliOptions): CliCommand;
export declare function getRegistry(): Map<string, CliCommand>;
export declare function fullName(cmd: CliCommand): string;
export declare function strategyLabel(cmd: CliCommand): string;
export declare function registerCommand(cmd: CliCommand): void;
export { serializeArg, serializeCommand, formatArgSummary, formatRegistryHelpText } from './serialization.js';
export type { SerializedArg } from './serialization.js';

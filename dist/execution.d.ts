/**
 * Command execution: validates args, manages browser sessions, runs commands.
 *
 * This is the single entry point for executing any CLI command. It handles:
 * 1. Argument validation and coercion
 * 2. Browser session lifecycle (if needed)
 * 3. Domain pre-navigation for cookie/header strategies
 * 4. Timeout enforcement
 * 5. Lazy-loading of TS modules from manifest
 */
import { type CliCommand, type Arg } from './registry.js';
/**
 * Validates and coerces arguments based on the command's Arg definitions.
 */
export declare function coerceAndValidateArgs(cmdArgs: Arg[], kwargs: Record<string, any>): Record<string, any>;
/**
 * Execute a CLI command. Automatically manages browser sessions when needed.
 *
 * This is the unified entry point — callers don't need to care about
 * whether the command requires a browser or not.
 */
export declare function executeCommand(cmd: CliCommand, rawKwargs: Record<string, any>, debug?: boolean): Promise<any>;

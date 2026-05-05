/**
 * Dynamic registry for pipeline steps.
 * Allows core and third-party plugins to register custom YAML operations.
 */
import type { IPage } from '../types.js';
/**
 * Step handler: all pipeline steps conform to this generic interface.
 * TData is the type of the `data` state flowing into the step.
 * TResult is the expected return type.
 */
export type StepHandler<TData = any, TResult = any> = (page: IPage | null, params: any, data: TData, args: Record<string, any>) => Promise<TResult>;
/**
 * Get a registered step handler by name.
 */
export declare function getStep(name: string): StepHandler | undefined;
/**
 * Register a new custom step handler for the YAML pipeline.
 */
export declare function registerStep(name: string, handler: StepHandler): void;

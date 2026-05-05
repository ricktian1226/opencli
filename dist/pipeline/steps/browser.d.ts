/**
 * Pipeline step: navigate, click, type, wait, press, snapshot.
 * Browser interaction primitives.
 */
import type { IPage } from '../../types.js';
export declare function stepNavigate(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;
export declare function stepClick(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;
export declare function stepType(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;
export declare function stepWait(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;
export declare function stepPress(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;
export declare function stepSnapshot(page: IPage | null, params: any, _data: any, _args: Record<string, any>): Promise<any>;
export declare function stepEvaluate(page: IPage | null, params: any, data: any, args: Record<string, any>): Promise<any>;

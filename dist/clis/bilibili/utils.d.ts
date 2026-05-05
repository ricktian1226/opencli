/**
 * Bilibili shared helpers: WBI signing, authenticated fetch, nav data, UID resolution.
 */
import type { IPage } from '../../types.js';
export declare function stripHtml(s: string): string;
export declare function payloadData(payload: any): any;
export declare function wbiSign(page: IPage, params: Record<string, any>): Promise<Record<string, string>>;
export declare function apiGet(page: IPage, path: string, opts?: {
    params?: Record<string, any>;
    signed?: boolean;
}): Promise<any>;
export declare function fetchJson(page: IPage, url: string): Promise<any>;
export declare function getSelfUid(page: IPage): Promise<string>;
export declare function resolveUid(page: IPage, input: string): Promise<string>;

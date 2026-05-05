/**
 * Xiaohongshu Creator Note List — per-note metrics from the creator backend.
 *
 * In CDP mode we capture the real creator analytics API response so the list
 * includes stable note ids and detail-page URLs. If that capture is unavailable,
 * we fall back to the older interceptor and DOM parsing paths.
 *
 * Requires: logged into creator.xiaohongshu.com in Chrome.
 */
import type { IPage } from '../../types.js';
type CreatorNoteRow = {
    id: string;
    title: string;
    date: string;
    views: number;
    likes: number;
    collects: number;
    comments: number;
    url: string;
};
export type { CreatorNoteRow };
export declare function parseCreatorNotesText(bodyText: string): CreatorNoteRow[];
export declare function parseCreatorNoteIdsFromHtml(bodyHtml: string): string[];
export declare function fetchCreatorNotes(page: IPage, limit: number): Promise<CreatorNoteRow[]>;

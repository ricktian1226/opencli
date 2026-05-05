/**
 * Xiaohongshu Creator Notes Summary — batch summary for recent notes.
 *
 * Combines creator-notes and creator-note-detail into a single command that
 * returns one summary row per note, suitable for quick review or downstream JSON use.
 */
import { type CreatorNoteRow } from './creator-notes.js';
import { type CreatorNoteDetailRow } from './creator-note-detail.js';
type CreatorNoteSummaryRow = {
    rank: number;
    id: string;
    title: string;
    published_at: string;
    views: string;
    likes: string;
    collects: string;
    comments: string;
    shares: string;
    avg_view_time: string;
    rise_fans: string;
    top_source: string;
    top_source_pct: string;
    top_interest: string;
    top_interest_pct: string;
    url: string;
};
export declare function summarizeCreatorNote(note: CreatorNoteRow, rows: CreatorNoteDetailRow[], rank: number): CreatorNoteSummaryRow;
export {};

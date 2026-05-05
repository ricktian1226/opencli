export interface XhsUserPageSnapshot {
    noteGroups?: unknown;
    pageData?: unknown;
}
export interface XhsUserNoteRow {
    id: string;
    title: string;
    type: string;
    likes: string;
    url: string;
}
export declare function normalizeXhsUserId(input: string): string;
export declare function flattenXhsNoteGroups(noteGroups: unknown): any[];
export declare function buildXhsNoteUrl(userId: string, noteId: string, xsecToken?: string): string;
export declare function extractXhsUserNotes(snapshot: XhsUserPageSnapshot, fallbackUserId: string): XhsUserNoteRow[];

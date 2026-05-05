/**
 * Xiaohongshu Creator Note Detail — per-note analytics from the creator detail page.
 *
 * The current creator center no longer serves stable single-note metrics from the legacy
 * `/api/galaxy/creator/data/note_detail` endpoint. The real note detail page loads data
 * through the newer `datacenter/note/*` API family, so this command navigates to the
 * detail page and parses the rendered metrics that are backed by those APIs.
 *
 * Requires: logged into creator.xiaohongshu.com in Chrome.
 */
import type { IPage } from '../../types.js';
type CreatorNoteDetailRow = {
    section: string;
    metric: string;
    value: string;
    extra: string;
};
export type { CreatorNoteDetailRow };
type CreatorNoteDetailDomMetric = {
    label: string;
    value: string;
    extra: string;
};
type CreatorNoteDetailDomSection = {
    title: string;
    metrics: CreatorNoteDetailDomMetric[];
};
type CreatorNoteDetailDomData = {
    title: string;
    infoText: string;
    sections: CreatorNoteDetailDomSection[];
};
type AudienceSourceItem = {
    title?: string;
    value_with_double?: number;
    info?: {
        imp_count?: number;
        view_count?: number;
        interaction_count?: number;
    };
};
type AudiencePortraitItem = {
    title?: string;
    value?: number;
};
type NoteTrendPoint = {
    date?: number;
    count?: number;
    count_with_double?: number;
};
type NoteTrendBucket = {
    imp_list?: NoteTrendPoint[];
    view_list?: NoteTrendPoint[];
    view_time_list?: NoteTrendPoint[];
    like_list?: NoteTrendPoint[];
    comment_list?: NoteTrendPoint[];
    collect_list?: NoteTrendPoint[];
    share_list?: NoteTrendPoint[];
    rise_fans_list?: NoteTrendPoint[];
};
type NoteDetailApiPayload = {
    noteBase?: {
        hour?: NoteTrendBucket;
        day?: NoteTrendBucket;
    };
    audienceTrend?: {
        no_data?: boolean;
        no_data_tip_msg?: string;
    };
    audienceSource?: {
        source?: AudienceSourceItem[];
    };
    audienceSourceDetail?: {
        gender?: AudiencePortraitItem[];
        age?: AudiencePortraitItem[];
        city?: AudiencePortraitItem[];
        interest?: AudiencePortraitItem[];
    };
};
export declare function parseCreatorNoteDetailText(bodyText: string, noteId: string): CreatorNoteDetailRow[];
export declare function parseCreatorNoteDetailDomData(dom: CreatorNoteDetailDomData | null | undefined, noteId: string): CreatorNoteDetailRow[];
export declare function appendAudienceRows(rows: CreatorNoteDetailRow[], payload?: NoteDetailApiPayload): CreatorNoteDetailRow[];
export declare function appendTrendRows(rows: CreatorNoteDetailRow[], payload?: NoteDetailApiPayload): CreatorNoteDetailRow[];
export declare function fetchCreatorNoteDetailRows(page: IPage, noteId: string): Promise<CreatorNoteDetailRow[]>;

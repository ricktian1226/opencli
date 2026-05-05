/**
 * Transcript grouping: sentence merging, speaker detection, and chapter support.
 * Ported and simplified from Defuddle's YouTube extractor.
 *
 * Raw segments (2-3 second fragments) are grouped into readable paragraphs:
 * - Sentence boundaries: merge until sentence-ending punctuation (.!?)
 * - Speaker turns: detect ">>" markers from YouTube auto-captions
 * - Chapters: optional chapter headings inserted at appropriate timestamps
 */
export interface RawSegment {
    start: number;
    end: number;
    text: string;
}
export interface GroupedSegment {
    start: number;
    text: string;
    speakerChange: boolean;
    speaker?: number;
}
export interface Chapter {
    title: string;
    start: number;
}
/**
 * Group raw transcript segments into readable blocks.
 * If speaker markers (>>) are present, groups by speaker turn.
 * Otherwise, groups by sentence boundaries.
 */
export declare function groupTranscriptSegments(segments: {
    start: number;
    text: string;
}[]): GroupedSegment[];
/**
 * Format grouped segments + chapters into a final text output.
 */
export declare function formatGroupedTranscript(segments: GroupedSegment[], chapters?: Chapter[]): {
    rows: Array<{
        timestamp: string;
        speaker: string;
        text: string;
    }>;
    plainText: string;
};

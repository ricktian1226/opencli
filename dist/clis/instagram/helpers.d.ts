export declare function normalizeInstagramUsername(input: string): string;
export declare function parseInstagramPostRef(input: string): {
    shortcode: string;
    kind: 'p' | 'reel' | 'tv';
} | null;
export declare function parseCount(raw: string): number;
export declare function decodeHtmlEntities(input: string): string;
export interface InstagramPostSummary {
    shortcode: string;
    type: string;
    caption: string;
    url: string;
    thumbnail: string;
    taken_at?: string;
    likes?: number;
    comments?: number;
    is_video?: boolean;
    video_url?: string;
    image_urls?: string[];
    video_urls?: string[];
    media_count?: number;
}
export interface InstagramPostDetail {
    shortcode: string;
    type: string;
    author: string;
    caption: string;
    taken_at: string;
    likes?: number;
    comments?: number;
    url: string;
    image_urls: string[];
    video_urls: string[];
    media_count: number;
}
export declare function extractPostsFromFeed(feed: any): InstagramPostSummary[];
export declare function extractPostDetailFromMedia(media: any, fallbackUrl?: string): InstagramPostDetail | null;

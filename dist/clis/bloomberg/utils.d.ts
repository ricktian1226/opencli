export declare const BLOOMBERG_FEEDS: {
    readonly main: "https://feeds.bloomberg.com/news.rss";
    readonly markets: "https://feeds.bloomberg.com/markets/news.rss";
    readonly economics: "https://feeds.bloomberg.com/economics/news.rss";
    readonly industries: "https://feeds.bloomberg.com/industries/news.rss";
    readonly tech: "https://feeds.bloomberg.com/technology/news.rss";
    readonly politics: "https://feeds.bloomberg.com/politics/news.rss";
    readonly businessweek: "https://feeds.bloomberg.com/businessweek/news.rss";
    readonly opinions: "https://feeds.bloomberg.com/bview/news.rss";
};
export type BloombergFeedName = keyof typeof BLOOMBERG_FEEDS;
export interface BloombergFeedItem {
    title: string;
    summary: string;
    link: string;
    mediaLinks: string[];
}
export interface BloombergStory {
    headline?: string;
    summary?: string;
    url?: string;
    body?: any;
    lede?: any;
    ledeImageUrl?: string;
    socialImageUrl?: string;
    imageAttachments?: Record<string, any>;
    videoAttachments?: Record<string, any>;
}
export declare function fetchBloombergFeed(name: BloombergFeedName, limit?: number): Promise<BloombergFeedItem[]>;
export declare function parseBloombergRss(xml: string): BloombergFeedItem[];
export declare function normalizeBloombergLink(input: string): string;
export declare function validateBloombergLink(input: string): string;
export declare function renderStoryBody(body: any): string;
export declare function extractStoryMediaLinks(story: BloombergStory): string[];

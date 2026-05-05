/**
 * Shared Xiaoyuzhou utilities — page data extraction and formatting.
 *
 * Xiaoyuzhou (小宇宙) is a Next.js app that embeds full page data in
 * <script id="__NEXT_DATA__">. We fetch the HTML and extract that JSON
 * instead of using their authenticated API.
 */
/**
 * Fetch a Xiaoyuzhou page and extract __NEXT_DATA__.props.pageProps.
 * @param path - URL path, e.g. '/podcast/xxx' or '/episode/xxx'
 */
export declare function fetchPageProps(path: string): Promise<any>;
/** Format seconds to mm:ss (e.g. 3890 → "64:50"). Returns '-' for invalid input. */
export declare function formatDuration(seconds: number): string;
/** Format ISO date string to YYYY-MM-DD. Returns '-' for missing input. */
export declare function formatDate(iso: string): string;
